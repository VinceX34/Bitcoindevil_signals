/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/worker/process-ch-queue/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, executeTransaction, QueuedSignal, QueuedSignalPayload } from '@/lib/db';

// Constants
const TIME_BETWEEN_API_CALLS_MS = 60000; // Increased to 60 seconds (1 minute)
const MAX_TASKS_PER_WORKER_RUN = 1; // Process 1 task per run
const MAX_RETRY_ATTEMPTS = 3; // Maximum number of retry attempts
const RATE_LIMIT_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes backoff for rate limiting

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const maxDuration = 75; // This function can run for a maximum of 75 seconds

export async function GET() {
  console.log('[Worker START] Worker process-ch-queue invoked.');
  let tasksProcessedThisRun = 0;
  const workerRunId = Math.random().toString(36).substring(7); // Unique ID for this worker run
  console.log(`[Worker RUN ${workerRunId}] Starting run.`);

  try {
    for (let i = 0; i < MAX_TASKS_PER_WORKER_RUN; i++) {
      console.log(`[Worker RUN ${workerRunId}] Loop iteration ${i}, tasksProcessedThisRun: ${tasksProcessedThisRun}`);
      const taskResult = await executeTransaction(async (executeQueryInTransaction) => {
        const pendingTasks = await executeQueryInTransaction(
          `SELECT * FROM cryptohopper_queue 
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
          return { processed: false, message: 'No suitable task found.' };
        }

        console.log(`[Worker RUN ${workerRunId} Task ${taskToProcess.id}] Processing task ID: ${taskToProcess.id}, Attempt: ${taskToProcess.attempts + 1}`);

        await executeQueryInTransaction(
          `UPDATE cryptohopper_queue
           SET status = 'processing',
               attempts = attempts + 1,
               last_attempt_at = NOW()
           WHERE id = $1`,
          [taskToProcess.id]
        );
        
        return { processed: true, task: taskToProcess };
      });

      if (!taskResult.processed || !taskResult.task) {
        console.log(taskResult.message || '[Worker RUN ' + workerRunId + ' Task ' + taskResult.task?.id + '] No more tasks to process in this run.');
        break;
      }

      const currentTask = taskResult.task;
      tasksProcessedThisRun++;

      const { original_tv_signal_id, hopper_id, exchange_name, access_token, payload_to_ch_api, task_sub_id } = currentTask.payload as QueuedSignalPayload;

      console.log(`[Worker RUN ${workerRunId} Task ${currentTask.id}] PREPARING CALL. Hopper ID: ${hopper_id}, Exchange: ${exchange_name}, TV Signal ID: ${original_tv_signal_id}.${task_sub_id}, AccessToken Length: ${access_token?.length}`);
      
      const cryptoHopperApiUrl = `https://api.cryptohopper.com/v1/hopper/${hopper_id}/order`;

      let chApiStatus: 'SUCCESS' | 'FAILURE' = 'FAILURE';
      let chApiError: string | null = null;
      let chApiResponse: any = null;
      let httpStatusCode: number | null = null; // Variable to store HTTP status code

      try {
        console.log(`[Worker RUN ${workerRunId} Task ${currentTask.id}] ATTEMPTING FETCH to: ${cryptoHopperApiUrl} for Hopper ID: ${hopper_id}. Payload: ${JSON.stringify(payload_to_ch_api)}`);
        
        const r = await fetch(cryptoHopperApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access-token': access_token },
          body: JSON.stringify(payload_to_ch_api),
        });
        httpStatusCode = r.status; // Capture HTTP status code here

        console.log(`[Worker RUN ${workerRunId} Task ${currentTask.id}] FETCH COMPLETED for Hopper ID: ${hopper_id}. HTTP Status: ${r.status}, OK: ${r.ok}`);
        
        chApiResponse = await r.json().catch((jsonParseError) => {
          console.error(`[Worker RUN ${workerRunId} Task ${currentTask.id}] JSON PARSE ERROR for Hopper ID: ${hopper_id}. Error: ${jsonParseError.message}`);
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
          if (typeof chApiResponse !== 'object' || chApiResponse === null) {
             chApiResponse = { actual_response_body: chApiResponse };
           }
           if (!chApiResponse.error && !chApiResponse.message && chApiError) {
             chApiResponse.effective_error = chApiError;
           }
        }
      } catch (e: any) {
        console.error(`[Worker RUN ${workerRunId} Task ${currentTask.id}] FETCH CATCH BLOCK ERROR for Hopper ID: ${hopper_id}. Error: ${e.message}`);
        chApiStatus = 'FAILURE';
        chApiError = e.message;
        chApiResponse = { fetch_error: e.message };
      }
      
      if(chApiStatus === 'SUCCESS'){
        console.log(`[Worker RUN ${workerRunId} Task ${currentTask.id}] CH API CALL SUCCESS for Hopper ID: ${hopper_id}. Response:`, JSON.stringify(chApiResponse, null, 2));
      } else {
        console.error(`[Worker RUN ${workerRunId} Task ${currentTask.id}] CH API CALL ERROR for Hopper ID: ${hopper_id}. Error: ${chApiError}. Full Response:`, JSON.stringify(chApiResponse, null, 2));
      }

      // 4. Log result in forwarded_signals
      try {
        await executeQuery(
          `INSERT INTO forwarded_signals (tradingview_signal_id, task_sub_id, http_status_code, tradingview_payload, cryptohopper_payload, cryptohopper_response, status, error_message, hopper_id, exchange_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
          [original_tv_signal_id, task_sub_id, httpStatusCode, JSON.stringify(currentTask.payload), JSON.stringify(payload_to_ch_api), JSON.stringify(chApiResponse), chApiStatus, chApiError, hopper_id, exchange_name]
        );
      } catch (dbLogErr: any) {
        console.error(`[Worker RUN ${workerRunId} Task ${currentTask.id}] Error logging to forwarded_signals: ${dbLogErr.message}.`);
      }

      // 5. Update task status in cryptohopper_queue
      const finalQueueTaskStatus = chApiStatus === 'SUCCESS' ? 'completed' : (httpStatusCode === 429 ? 'rate_limited' : 'failed');
      
      // Als het rate_limited is, verhoog attempts niet, anders wel (impliciet al gedaan bij 'processing' status update, maar hier expliciet voor 'failed')
      // De last_attempt_at wordt al gezet bij de 'processing' update.
      // Voor 'rate_limited' zorgt de SELECT query voor de backoff.
      if (finalQueueTaskStatus === 'rate_limited') {
        await executeQuery(
          `UPDATE cryptohopper_queue
           SET status = $1, error_message = $2, last_attempt_at = NOW() 
           WHERE id = $3;`, // attempts blijft gelijk
          [finalQueueTaskStatus, chApiError, currentTask.id]
        );
      } else { // completed or failed (non-429)
        await executeQuery(
          `UPDATE cryptohopper_queue
           SET status = $1, error_message = $2 
           WHERE id = $3;`, // attempts is al verhoogd bij 'processing'
          [finalQueueTaskStatus, chApiError, currentTask.id]
        );
      }

      console.log(`[Worker RUN ${workerRunId} Task ${currentTask.id}] Processed. Final queue status: ${finalQueueTaskStatus}.`);
    }
    console.log(`[Worker RUN ${workerRunId}] Loop finished. Processed ${tasksProcessedThisRun} task(s) in this run.`);
    return NextResponse.json({ success: true, message: `Worker run ${workerRunId} completed. Processed ${tasksProcessedThisRun} task(s).` });

  } catch (workerError: any) {
    console.error(`[Worker RUN ${workerRunId}] Unhandled error in worker:`, workerError);
    return NextResponse.json({ success: false, error: 'Worker failed.', details: workerError.message }, { status: 500 });
  }
}