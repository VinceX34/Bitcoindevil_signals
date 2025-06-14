/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/worker/process-ch-queue-btc/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, executeTransaction, QueuedSignal, QueuedSignalPayload } from '@/lib/db';

const MAX_TASKS_PER_WORKER_RUN = 1;
const MAX_RETRY_ATTEMPTS = 3;
const RATE_LIMIT_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes backoff for rate limiting
export const maxDuration = 75;

/** Check if we can make an API call to CryptoHopper */
async function canMakeApiCall(): Promise<boolean> {
  const result = await executeQuery(
    `SELECT is_limited, limited_until FROM rate_limit_status ORDER BY id DESC LIMIT 1`
  );

  if (result.length === 0) return true;

  const { is_limited, limited_until } = result[0];
  if (!is_limited) return true;
  if (!limited_until) return true;

  return new Date(limited_until) < new Date();
}

/** Update rate limit status */
async function updateRateLimitStatus(isLimited: boolean, limitedUntil?: Date): Promise<void> {
  await executeQuery(
    `INSERT INTO rate_limit_status (is_limited, limited_until) VALUES ($1, $2)`,
    [isLimited, limitedUntil]
  );
}

export async function GET() {
  const workerRunId = `btc-${Math.random().toString(36).substring(7)}`;
  console.log(`[Worker BTC RUN ${workerRunId}] Starting run.`);
  let tasksProcessedThisRun = 0;

  try {
    // Check global rate limit status first
    if (!await canMakeApiCall()) {
      console.log(`[Worker BTC RUN ${workerRunId}] Global rate limit active, skipping this run.`);
      return NextResponse.json({ success: true, message: 'Rate limit active, skipping run.' });
    }

    for (let i = 0; i < MAX_TASKS_PER_WORKER_RUN; i++) {
      const taskResult = await executeTransaction(async (executeQueryInTransaction) => {
        const pendingTasks = await executeQueryInTransaction(
          `SELECT * FROM cryptohopper_queue_btc 
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
        if (!taskToProcess) return { processed: false };

        await executeQueryInTransaction(
          `UPDATE cryptohopper_queue_btc SET status = 'processing', attempts = attempts + 1, last_attempt_at = NOW() WHERE id = $1`,
          [taskToProcess.id]
        );
        return { processed: true, task: taskToProcess };
      });

      if (!taskResult.processed || !taskResult.task) {
        console.log(`[Worker BTC RUN ${workerRunId}] No more tasks to process.`);
        break;
      }

      const currentTask = taskResult.task;
      tasksProcessedThisRun++;
      const { original_tv_signal_id, hopper_id, exchange_name, access_token, payload_to_ch_api, task_sub_id } = currentTask.payload as QueuedSignalPayload;
      
      const cryptoHopperApiUrl = `https://api.cryptohopper.com/v1/hopper/${hopper_id}/order`;
      let chApiStatus: 'SUCCESS' | 'FAILURE' = 'FAILURE';
      let chApiError: string | null = null;
      let chApiResponse: any = null;
      let httpStatusCode: number | null = null;

      try {
        const r = await fetch(cryptoHopperApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access-token': access_token },
          body: JSON.stringify(payload_to_ch_api),
        });
        httpStatusCode = r.status;
        chApiResponse = await r.json().catch(() => ({}));
        if (r.ok) {
          chApiStatus = 'SUCCESS';
          await updateRateLimitStatus(false); // Reset rate limit on success
        } else {
          chApiStatus = 'FAILURE';
          if (r.status === 429) {
            chApiError = `Rate limit (429): ${chApiResponse?.message || 'Rate limit error response from CryptoHopper.'}`;
            // Set rate limit for 5 minutes
            const limitedUntil = new Date(Date.now() + RATE_LIMIT_BACKOFF_MS);
            await updateRateLimitStatus(true, limitedUntil);
          } else {
            chApiError = chApiResponse?.error ?? `HTTP status: ${r.status}`;
            await updateRateLimitStatus(false);
          }
        }
      } catch (e: any) {
        chApiError = e.message;
        chApiResponse = { fetch_error: e.message };
        await updateRateLimitStatus(false);
      }

      await executeQuery(
        `INSERT INTO forwardedsignals_btc (tradingview_signal_id, task_sub_id, http_status_code, tradingview_payload, cryptohopper_payload, cryptohopper_response, status, error_message, hopper_id, exchange_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [original_tv_signal_id, task_sub_id, httpStatusCode, JSON.stringify(currentTask.payload), JSON.stringify(payload_to_ch_api), JSON.stringify(chApiResponse), chApiStatus, chApiError, hopper_id, exchange_name]
      );

      const finalQueueTaskStatus = chApiStatus === 'SUCCESS' ? 'completed' : (httpStatusCode === 429 ? 'rate_limited' : 'failed');
      await executeQuery(
        `UPDATE cryptohopper_queue_btc SET status = $1, error_message = $2 WHERE id = $3;`,
        [finalQueueTaskStatus, chApiError, currentTask.id]
      );
      console.log(`[Worker BTC RUN ${workerRunId}] Processed task ${currentTask.id}. Final status: ${finalQueueTaskStatus}.`);
    }
    console.log(`[Worker BTC RUN ${workerRunId}] Loop finished. Processed ${tasksProcessedThisRun} task(s).`);
    return NextResponse.json({ success: true, message: `Worker BTC run ${workerRunId} completed.` });
  } catch (workerError: any) {
    console.error(`[Worker BTC RUN ${workerRunId}] Unhandled error:`, workerError);
    return NextResponse.json({ success: false, error: 'Worker BTC failed.', details: workerError.message }, { status: 500 });
  }
} 