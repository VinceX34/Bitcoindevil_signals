/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { executeQuery, executeTransaction, QueuedSignal, QueuedSignalPayload } from '@/lib/db';

export const maxDuration = 55; // Keep it under 60s for Vercel Hobby

// Configuration for the queues in priority order: Default -> BTC -> AI
const QUEUE_PRIORITIES = [
  {
    name: 'default',
    queueTable: 'cryptohopper_queue',
    forwardedTable: 'forwarded_signals',
  },
  {
    name: 'btc',
    queueTable: 'cryptohopper_queue_btc',
    forwardedTable: 'forwardedsignals_btc',
  },
  {
    name: 'ai',
    queueTable: 'cryptohopper_queue_ai',
    forwardedTable: 'forwardedsignals_ai',
  },
];

const MAX_RETRY_ATTEMPTS = 3;

export async function GET() {
  const workerRunId = `global-${Math.random().toString(36).substring(7)}`;
  console.log(`[Worker GLOBAL ${workerRunId}] Starting run.`);

  try {
    // We only process ONE task per run to strictly adhere to rate limits
    // Iterate through queues in priority order
    for (const queueConfig of QUEUE_PRIORITIES) {
      console.log(`[Worker GLOBAL ${workerRunId}] Checking queue: ${queueConfig.name} (${queueConfig.queueTable})`);

      // 1. Try to lock and fetch a task from this queue
      const taskResult = await executeTransaction(async (executeQueryInTransaction) => {
        const pendingTasks = await executeQueryInTransaction(
          `SELECT * FROM ${queueConfig.queueTable} 
           WHERE (
             status = 'pending'::TEXT OR 
             (status = 'failed'::TEXT AND attempts < $1) OR
             (status = 'rate_limited'::TEXT AND last_attempt_at < NOW() - INTERVAL '5 minutes' AND attempts < $1)
           )
           ORDER BY created_at ASC 
           LIMIT 1 
           FOR UPDATE SKIP LOCKED`,
          [MAX_RETRY_ATTEMPTS]
        ) as QueuedSignal[];

        const taskToProcess = pendingTasks[0];

        if (!taskToProcess) {
          return { processed: false, task: null };
        }

        // Mark as processing
        await executeQueryInTransaction(
          `UPDATE ${queueConfig.queueTable}
           SET status = 'processing',
               attempts = attempts + 1,
               last_attempt_at = NOW()
           WHERE id = $1`,
          [taskToProcess.id]
        );
        
        return { processed: true, task: taskToProcess };
      });

      // If we found a task in this queue, process it and then STOP (return)
      if (taskResult.processed && taskResult.task) {
        await processTask(taskResult.task, queueConfig, workerRunId);
        return NextResponse.json({ 
          success: true, 
          message: `Worker run ${workerRunId} completed. Processed 1 task from ${queueConfig.name}.` 
        });
      }
      
      // If no task found in this queue, loop continues to the next priority queue
    }

    console.log(`[Worker GLOBAL ${workerRunId}] No pending tasks found in any queue.`);
    return NextResponse.json({ success: true, message: `Worker run ${workerRunId} completed. No tasks found.` });

  } catch (workerError: any) {
    console.error(`[Worker GLOBAL ${workerRunId}] Unhandled error:`, workerError);
    return NextResponse.json({ success: false, error: 'Worker failed.', details: workerError.message }, { status: 500 });
  }
}

async function processTask(currentTask: QueuedSignal, queueConfig: { name: string, queueTable: string, forwardedTable: string }, workerRunId: string) {
  const { original_tv_signal_id, hopper_id, exchange_name, access_token, payload_to_ch_api, task_sub_id } = currentTask.payload as QueuedSignalPayload;

  console.log(`[Worker GLOBAL ${workerRunId}] Processing task ID: ${currentTask.id} from queue: ${queueConfig.name}`);
  console.log(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] PREPARING CALL. Hopper ID: ${hopper_id}, Exchange: ${exchange_name}`);
  
  const cryptoHopperApiUrl = `https://api.cryptohopper.com/v1/hopper/${hopper_id}/order`;

  let chApiStatus: 'SUCCESS' | 'FAILURE' = 'FAILURE';
  let chApiError: string | null = null;
  let chApiResponse: any = null;
  let httpStatusCode: number | null = null;

  try {
    console.log(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] ATTEMPTING FETCH to: ${cryptoHopperApiUrl}`);
    
    const r = await fetch(cryptoHopperApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access-token': access_token },
      body: JSON.stringify(payload_to_ch_api),
    });
    httpStatusCode = r.status;

    console.log(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] FETCH COMPLETED. HTTP Status: ${r.status}`);
    
    chApiResponse = await r.json().catch((jsonParseError) => {
      console.error(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] JSON PARSE ERROR: ${jsonParseError.message}`);
      return { 
        response_parse_error: "CH JSON parse error", 
        error_details: jsonParseError.message,
      };
    });

    if (r.ok) {
      chApiStatus = 'SUCCESS';
    } else {
      chApiStatus = 'FAILURE';
      if (r.status === 429) {
        chApiError = `Rate limit (429): ${chApiResponse?.message || 'Rate limit error response from CryptoHopper.'}`;
      } else {
        chApiError = chApiResponse?.error ?? chApiResponse?.message ?? `Non-2xx/429 HTTP status: ${r.status}`;
      }
      
      // Ensure we have an object for logging
      if (typeof chApiResponse !== 'object' || chApiResponse === null) {
         chApiResponse = { actual_response_body: chApiResponse };
       }
       if (!chApiResponse.error && !chApiResponse.message && chApiError) {
         chApiResponse.effective_error = chApiError;
       }
    }
  } catch (e: any) {
    console.error(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] FETCH ERROR: ${e.message}`);
    chApiStatus = 'FAILURE';
    chApiError = e.message;
    chApiResponse = { fetch_error: e.message };
  }
  
  if(chApiStatus === 'SUCCESS'){
    console.log(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] CH API CALL SUCCESS.`);
  } else {
    console.error(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] CH API CALL ERROR: ${chApiError}`);
  }

  // Log result in the appropriate forwarded table
  try {
    await executeQuery(
      `INSERT INTO ${queueConfig.forwardedTable} (tradingview_signal_id, task_sub_id, http_status_code, tradingview_payload, cryptohopper_payload, cryptohopper_response, status, error_message, hopper_id, exchange_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
      [original_tv_signal_id, task_sub_id, httpStatusCode, JSON.stringify(currentTask.payload), JSON.stringify(payload_to_ch_api), JSON.stringify(chApiResponse), chApiStatus, chApiError, hopper_id, exchange_name]
    );
  } catch (dbLogErr: any) {
    console.error(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] Error logging to ${queueConfig.forwardedTable}: ${dbLogErr.message}.`);
  }

  // Update task status in the appropriate queue table
  const finalQueueTaskStatus = chApiStatus === 'SUCCESS' ? 'completed' : (httpStatusCode === 429 ? 'rate_limited' : 'failed');
  
  // For rate_limited, we don't increase attempts (conceptually), but we already did in the 'processing' step.
  // The query logic handles the backoff based on last_attempt_at.
  // We just set the status and error message here.
  
  await executeQuery(
    `UPDATE ${queueConfig.queueTable}
     SET status = $1, error_message = $2 
     WHERE id = $3;`,
    [finalQueueTaskStatus, chApiError, currentTask.id]
  );

  console.log(`[Worker GLOBAL ${workerRunId} Task ${currentTask.id}] Processed. Final status: ${finalQueueTaskStatus}.`);
}
