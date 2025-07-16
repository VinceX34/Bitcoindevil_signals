/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/cron/queue-new-signals/route.ts
import { NextResponse } from 'next/server';
import { executeTransaction, SimpleTradingViewSignal } from '@/lib/db';
import { HOPPER_CONFIGS, HOPPER_CONFIGS_BTC, HOPPER_CONFIGS_AI, HopperConfig } from '@/lib/hopperConfig';

export const maxDuration = 55; // Vercel Hobby plan max duration is 60s

type SignalGroup = 'default' | 'btc' | 'ai';

interface PipelineConfig {
  group: SignalGroup;
  signalTable: string;
  queueTable: string;
  hopperConfigs: HopperConfig[];
}

// Configuration for all three pipelines
const PIPELINES: PipelineConfig[] = [
  { group: 'default', signalTable: 'tradingview_signals', queueTable: 'cryptohopper_queue', hopperConfigs: HOPPER_CONFIGS },
  { group: 'btc', signalTable: 'tradingview_signals_btc', queueTable: 'cryptohopper_queue_btc', hopperConfigs: HOPPER_CONFIGS_BTC },
  { group: 'ai', signalTable: 'tradingview_signals_ai', queueTable: 'cryptohopper_queue_ai', hopperConfigs: HOPPER_CONFIGS_AI },
];

/**
 * Processes new signals for a specific pipeline.
 */
async function processPipeline(pipeline: PipelineConfig, cryptohopperAccessToken: string, runId: string) {
  const { group, signalTable, queueTable, hopperConfigs } = pipeline;
  console.log(`[Cron-Queue ${runId}-${group}] Checking for new signals in ${signalTable}.`);

  if (!hopperConfigs || hopperConfigs.length === 0) {
    console.error(`[Cron-Queue ${runId}-${group}] Misconfiguration: No hopper configs found for group "${group}". Skipping pipeline.`);
    return 0;
  }
  
  // Using a transaction to ensure atomicity for each signal processing
  const signalsProcessed = await executeTransaction(async (tx) => {
    // Select new signals and lock them to prevent other cron runs from picking them up
    const newSignals = await tx(
      `SELECT id, raw_data FROM ${signalTable} WHERE status = 'new' ORDER BY received_at ASC LIMIT 10 FOR UPDATE SKIP LOCKED`
    ) as SimpleTradingViewSignal[];

    if (newSignals.length === 0) {
      return 0; // No new signals to process
    }

    console.log(`[Cron-Queue ${runId}-${group}] Found ${newSignals.length} new signal(s).`);

    for (const signal of newSignals) {
      const signalPayload = typeof signal.raw_data === 'string' ? JSON.parse(signal.raw_data) : signal.raw_data;
      
      let subIdCounter = 1;
      const tasksForQueue = hopperConfigs.map((hopper: HopperConfig) => ({
        original_tv_signal_id: signal.id,
        task_sub_id: subIdCounter++,
        hopper_id: hopper.id,
        exchange_name: hopper.exchange,
        access_token: cryptohopperAccessToken,
        payload_to_ch_api: { ...signalPayload },
      }));

      // Insert all tasks for this signal into the corresponding queue table
      for (const task of tasksForQueue) {
        await tx(
          `INSERT INTO ${queueTable} (payload, status, attempts) VALUES ($1, 'pending', 0)`,
          [JSON.stringify(task)]
        );
      }

      // Mark the original signal as 'queued'
      await tx(
        `UPDATE ${signalTable} SET status = 'queued' WHERE id = $1`,
        [signal.id]
      );
      console.log(`[Cron-Queue ${runId}-${group}] Queued ${tasksForQueue.length} tasks for TV Signal ID ${signal.id}.`);
    }

    return newSignals.length;
  }).catch(error => {
    console.error(`[Cron-Queue ${runId}-${group}] Transaction failed for pipeline ${group}:`, error);
    return 0; // Return 0 on transaction failure
  });

  return signalsProcessed;
}

/**
 * GET handler for the cron job.
 * Iterates through all pipelines and processes new signals.
 */
export async function GET() {
  const runId = Math.random().toString(36).substring(7);
  console.log(`[Cron-Queue ${runId}] Starting run.`);

  const cryptohopperAccessToken = process.env.CRYPTOHOPPER_ACCESS_TOKEN;
  if (!cryptohopperAccessToken) {
    console.error(`[Cron-Queue ${runId}] FATAL: CRYPTOHOPPER_ACCESS_TOKEN is not set. Aborting run.`);
    return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
  }

  let totalSignalsProcessed = 0;

  try {
    for (const pipeline of PIPELINES) {
      const count = await processPipeline(pipeline, cryptohopperAccessToken, runId);
      totalSignalsProcessed += count;
    }

    console.log(`[Cron-Queue ${runId}] Run finished. Total signals processed: ${totalSignalsProcessed}.`);
    return NextResponse.json({ success: true, message: `Run ${runId} completed. Processed ${totalSignalsProcessed} signals.` });

  } catch (error: any) {
    console.error(`[Cron-Queue ${runId}] Unhandled error during cron run:`, error);
    return NextResponse.json({ success: false, error: 'Cron job failed', details: error.message }, { status: 500 });
  }
} 