/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeTransaction, SimpleTradingViewSignal } from '@/lib/db';
import { HOPPER_CONFIGS, HOPPER_CONFIGS_BTC, HOPPER_CONFIGS_AI, HopperConfig } from '@/lib/hopperConfig';

/** Helper to normalize signal_group values */
function normalizeSignalGroup(input: any): 'default' | 'btc' | 'ai' {
  if (!input || typeof input !== 'string') return 'default';
  const value = input.trim().toLowerCase();
  if (value === 'btc') return 'btc';
  if (value === 'ai') return 'ai';
  return 'default';
}

/** Helper to get the correct table name for a signal group */
function getSignalTableName(signalGroup: 'default' | 'btc' | 'ai'): string {
  switch (signalGroup) {
    case 'btc':
      return 'tradingview_signals_btc';
    case 'ai':
      return 'tradingview_signals_ai';
    default:
      return 'tradingview_signals';
  }
}

/** Helper to acquire a lock for signal processing */
async function acquireLock(signalGroup: 'default' | 'btc' | 'ai', lockId: string): Promise<boolean> {
  try {
    // Try to acquire the lock
    await executeQuery(
      `INSERT INTO signal_processing_locks (signal_group, locked_by)
       VALUES ($1, $2)
       ON CONFLICT (signal_group) DO NOTHING;`,
      [signalGroup, lockId]
    );
    
    // Check if we got the lock
    const result = await executeQuery(
      `SELECT locked_by FROM signal_processing_locks WHERE signal_group = $1;`,
      [signalGroup]
    );
    
    return result[0]?.locked_by === lockId;
  } catch (error) {
    console.error(`Error acquiring lock for ${signalGroup}:`, error);
    return false;
  }
}

/** Helper to release a lock */
async function releaseLock(signalGroup: 'default' | 'btc' | 'ai', lockId: string): Promise<void> {
  try {
    await executeQuery(
      `DELETE FROM signal_processing_locks 
       WHERE signal_group = $1 AND locked_by = $2;`,
      [signalGroup, lockId]
    );
  } catch (error) {
    console.error(`Error releasing lock for ${signalGroup}:`, error);
  }
}

/** Asynchroon doorsturen naar de juiste /api/cryptohopper... route */
async function forwardToCryptoHopper(
  signalPayload: any,
  savedSignalId: number,
  baseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const signalGroup = normalizeSignalGroup(signalPayload.signal_group);
  const webhookCallId = Math.random().toString(36).substring(7);
  console.log(`[Webhook FW ${webhookCallId}] Forwarding for signal group: "${signalGroup}", TV Signal ID ${savedSignalId}.`);

  let targetHoppers: HopperConfig[];
  let targetApiUrl: string;

  switch (signalGroup) {
    case 'btc':
      targetHoppers = HOPPER_CONFIGS_BTC;
      targetApiUrl = `${baseUrl}/api/cryptohopper-btc`;
      break;
    case 'ai':
      targetHoppers = HOPPER_CONFIGS_AI;
      targetApiUrl = `${baseUrl}/api/cryptohopper-ai`;
      break;
    default:
      targetHoppers = HOPPER_CONFIGS;
      targetApiUrl = `${baseUrl}/api/cryptohopper`;
  }

  const cryptohopperAccessToken = process.env.CRYPTOHOPPER_ACCESS_TOKEN;
  if (!cryptohopperAccessToken) {
    const error = `[Webhook FW ${webhookCallId}] FATAL: CRYPTOHOPPER_ACCESS_TOKEN is niet ingesteld. TV Signal ID ${savedSignalId} wordt NIET doorgestuurd.`;
    console.error(error);
    return { success: false, error };
  }
  
  if (!targetHoppers || targetHoppers.length === 0) {
    const error = `[Webhook FW ${webhookCallId}] Kritiek - Geen target hopper IDs gedefinieerd voor signal group "${signalGroup}". TV Signal ID ${savedSignalId} wordt NIET doorgestuurd.`;
    console.error(error);
    return { success: false, error };
  }
  console.log(`[Webhook FW ${webhookCallId}] Hopper configs found for group "${signalGroup}": ${targetHoppers.length} entries.`);

  let subIdCounter = 1;
  const tasksForCryptohopper = targetHoppers.map((hopper: HopperConfig) => ({
    hopper_id: hopper.id,
    exchange_name: hopper.exchange,
    access_token: cryptohopperAccessToken,
    payload_to_ch_api: { ...signalPayload },
    task_sub_id: subIdCounter++,
  }));

  const bodyForCryptohopperRoute = {
    original_tradingview_signal_id: savedSignalId,
    tasks: tasksForCryptohopper,
    signal_group: signalGroup,
  };

  console.log(
    `[Webhook FW ${webhookCallId}] Forwarding ${tasksForCryptohopper.length} task(s) to ${targetApiUrl} for TV Signal ID ${savedSignalId}.`
  );

  try {
    const response = await fetch(targetApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyForCryptohopperRoute),
    });
    console.log(`[Webhook FW ${webhookCallId}] Response status from POST to ${targetApiUrl} (TV Signal ID ${savedSignalId}): ${response.status}`);
    
    if (!response.ok) {
      const responseBody = await response.text();
      const error = `[Webhook FW ${webhookCallId}] Error response from ${targetApiUrl} (TV Signal ID ${savedSignalId}, Status: ${response.status}): ${responseBody}`;
      console.error(error);
      return { success: false, error };
    }
    
    console.log(`[Webhook FW ${webhookCallId}] Successfully called ${targetApiUrl} for TV Signal ID ${savedSignalId}.`);
    return { success: true };
  } catch (e: any) {
    const error = `[Webhook FW ${webhookCallId}] NETWERKFOUT of andere exceptie bij aanroepen van ${targetApiUrl} voor TV Signal ID ${savedSignalId}: ${e.message}`;
    console.error(error, e.stack);
    return { success: false, error };
  }
}

// ---------------------------------------------------------------------------
// POST  – ontvangt TradingView-webhook
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const webhookCallId = Math.random().toString(36).substring(7);
  console.log(`[Webhook RQ ${webhookCallId}] Received POST request.`);

  let rawRequestBodyText: string | null = null;
  let signalFromTradingView: any;

  try {
    rawRequestBodyText = await req.text();
    if (!rawRequestBodyText) {
      console.error(`[Webhook RQ ${webhookCallId}] Empty request body received.`);
      return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
    }
    signalFromTradingView = JSON.parse(rawRequestBodyText);
  } catch (error: any) {
    console.error(`[Webhook RQ ${webhookCallId}] Error parsing JSON payload:`, error.message);
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Validate required fields
  if (!signalFromTradingView.signal_group || !signalFromTradingView.order_type || !signalFromTradingView.market) {
    console.error(`[Webhook RQ ${webhookCallId}] Missing required fields in payload:`, signalFromTradingView);
    return NextResponse.json({ success: false, error: 'Missing required fields in payload' }, { status: 400 });
  }

  const signalGroup = normalizeSignalGroup(signalFromTradingView.signal_group);
  const tableName = getSignalTableName(signalGroup);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  let savedSignalRecord: any;

  // Try to acquire the lock
  const lockAcquired = await acquireLock(signalGroup, webhookCallId);
  if (!lockAcquired) {
    console.log(`[Webhook RQ ${webhookCallId}] Another request is processing a ${signalGroup} signal. This request will be queued.`);
    return NextResponse.json({
      success: true,
      message: 'Signal received but another signal is being processed. This signal will be processed next.',
      status: 'queued'
    });
  }

  try {
    // Use a transaction to ensure both saving and forwarding are atomic
    const result = await executeTransaction(async (executeQueryInTransaction) => {
      // Save the raw signal to the correct table
      const saveResult = await executeQueryInTransaction(
        `INSERT INTO ${tableName} (payload) VALUES ($1) RETURNING id;`,
        [JSON.stringify(signalFromTradingView)]
      );
      savedSignalRecord = saveResult[0];
      
      // Forward to CryptoHopper
      const forwardResult = await forwardToCryptoHopper(signalFromTradingView, savedSignalRecord.id, baseUrl);
      if (!forwardResult.success) {
        throw new Error(forwardResult.error);
      }
      
      return savedSignalRecord;
    });

    console.log(`[Webhook RQ ${webhookCallId}] Successfully processed ${signalGroup} signal with ID: ${result.id}`);
    return NextResponse.json({
      success: true,
      message: 'Signal stored & forwarding to Cryptohopper processing triggered',
      savedSignalId: result.id,
    });

  } catch (error: any) {
    console.error(`[Webhook RQ ${webhookCallId}] Error processing signal:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process signal',
      details: error.message
    }, { status: 500 });
  } finally {
    // Always release the lock
    await releaseLock(signalGroup, webhookCallId);
  }
}

// ---------------------------------------------------------------------------
// GET  – laatste 20 (of aangepaste limiet) opgeslagen TradingView-signalen
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');
  let limit = 20;

  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 500);
    }
  }

  try {
    const rows = await executeQuery(
      `SELECT id, raw_data, received_at
       FROM tradingview_signals
       ORDER BY received_at DESC
       LIMIT $1;`,
       [limit]
    );
    return NextResponse.json({ success: true, signals: rows, pagination: { limit } });
  } catch (e: any) {
    console.error('Webhook GET: DB-fout', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch signals', details: e.message },
      { status: 500 },
    );
  }
}

const PLACEHOLDER_HOPPERS = {
  default: [
    { id: '1403066', name: 'Loading...', exchange: 'Bitvavo', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1506523', name: 'Loading...', exchange: 'Bybit', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1455342', name: 'Loading...', exchange: 'Kucoin', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1790517', name: 'Loading...', exchange: 'Kraken', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1808770', name: 'Loading...', exchange: 'Crypto.com', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1817774', name: 'Loading...', exchange: 'Coinbase', total_cur: '0', error: true, assets: {}, image: null },
  ],
  btc: [
    { id: '1989465', name: 'Loading...', exchange: 'Coinbase - EUR', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1989473', name: 'Loading...', exchange: 'Coinbase - USDC', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1989528', name: 'Loading...', exchange: 'Bybit - USDC', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1989545', name: 'Loading...', exchange: 'Kucoin - USDC', total_cur: '0', error: true, assets: {}, image: null },
  ],
  ai: [
    { id: '1992610', name: 'Loading...', exchange: 'Bybit', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1992607', name: 'Loading...', exchange: 'Kucoin', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1992597', name: 'Loading...', exchange: 'Coinbase - EUR', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1992599', name: 'Loading...', exchange: 'Coinbase - USDC', total_cur: '0', error: true, assets: {}, image: null },
  ]
};

const totalValue = Object.values(PLACEHOLDER_HOPPERS).flat().reduce((sum, hopper) => {
  const value = Number(hopper.total_cur) || 0;
  return sum + value;
}, 0);