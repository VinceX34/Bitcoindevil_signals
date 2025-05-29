/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/worker/process-ch-queue/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, executeTransaction, QueuedSignal, QueuedSignalPayload } from '@/lib/db';

// Constants
const TIME_BETWEEN_API_CALLS_MS = 20000; // 20 seconds between API calls
const MAX_TASKS_PER_WORKER_RUN = 30; // Process up to 30 tasks per run
const MAX_RETRY_ATTEMPTS = 3; // Maximum number of retry attempts

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

interface QueuePayload {
  original_tv_signal_id: number | null;
  hopper_id: string;
  access_token: string;
  payload_to_ch_api: any;
}

export async function GET() {
  console.log('Worker process-ch-queue invoked.');
  let tasksProcessedThisRun = 0;

  try {
    for (let i = 0; i < MAX_TASKS_PER_WORKER_RUN; i++) {
      const taskResult = await executeTransaction(async (executeQueryInTransaction) => {
        // 1. Get oldest pending or retryable failed task and lock it
        const pendingTasks = await executeQueryInTransaction(
          `SELECT * FROM cryptohopper_queue 
           WHERE (status = 'pending' OR (status = 'failed' AND attempts < $1))
           ORDER BY created_at ASC 
           LIMIT 1 
           FOR UPDATE SKIP LOCKED`,
          [MAX_RETRY_ATTEMPTS]
        ) as QueuedSignal[];

        const taskToProcess = pendingTasks[0];

        if (!taskToProcess) {
          return { processed: false, message: 'No suitable task found.' };
        }

        console.log(`[Worker] Processing task ID: ${taskToProcess.id}, Attempt: ${taskToProcess.attempts + 1}`);

        // 2. Mark as processing
        await executeQueryInTransaction(
          'UPDATE cryptohopper_queue SET status = $1, attempts = attempts + 1, last_attempt_at = NOW() WHERE id = $2',
          ['processing', taskToProcess.id]
        );
        
        return { processed: true, task: taskToProcess };
      });

      if (!taskResult.processed || !taskResult.task) {
        console.log(taskResult.message || '[Worker] No more tasks to process in this run.');
        break;
      }

      const currentTask = taskResult.task;
      tasksProcessedThisRun++;

      // 3. Process the task (API call to CryptoHopper)
      const { original_tv_signal_id, hopper_id, exchange_name, access_token, payload_to_ch_api } = currentTask.payload as QueuedSignalPayload;
      const cryptoHopperApiUrl = `https://api.cryptohopper.com/v1/hopper/${hopper_id}/order`;

      let chApiStatus: 'SUCCESS' | 'FAILURE' = 'FAILURE';
      let chApiError: string | null = null;
      let chApiResponse: any = null;

      try {
        console.log(`[Worker Task ${currentTask.id}] Calling CH API for ${hopper_id}.`);
        const r = await fetch(cryptoHopperApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access-token': access_token },
          body: JSON.stringify(payload_to_ch_api),
        });
        chApiResponse = await r.json().catch(() => ({ response_parse_error: "CH JSON parse error" }));
        chApiStatus = r.ok ? 'SUCCESS' : 'FAILURE';
        if (!r.ok) {
          chApiError = chApiResponse?.error ?? chApiResponse?.message ?? JSON.stringify(chApiResponse);
        }
      } catch (e: any) {
        chApiError = e.message;
        chApiResponse = { error_message: chApiError };
      }
      
      if(chApiStatus === 'SUCCESS'){
        console.log(`[Worker Task ${currentTask.id}] CH API Success for ${hopper_id}.`);
      } else {
        console.error(`[Worker Task ${currentTask.id}] CH API Error for ${hopper_id}: ${chApiError}`, chApiResponse);
      }

      // 4. Log result in forwarded_signals
      try {
        await executeQuery(
          `INSERT INTO forwarded_signals (tradingview_signal_id, tradingview_payload, cryptohopper_payload, cryptohopper_response, status, error_message, hopper_id, exchange_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [original_tv_signal_id, JSON.stringify(currentTask.payload), JSON.stringify(payload_to_ch_api), JSON.stringify(chApiResponse), chApiStatus, chApiError, hopper_id, exchange_name]
        );
      } catch (dbLogErr: any) {
        console.error(`[Worker Task ${currentTask.id}] Error logging to forwarded_signals: ${dbLogErr.message}.`);
      }

      // 5. Update task status in cryptohopper_queue
      const finalQueueTaskStatus = chApiStatus === 'SUCCESS' ? 'completed' : 'failed';
      await executeQuery(
        `UPDATE cryptohopper_queue
         SET status = $1, error_message = $2
         WHERE id = $3;`,
        [finalQueueTaskStatus, chApiError, currentTask.id]
      );

      console.log(`[Worker Task ${currentTask.id}] Processed. Final queue status: ${finalQueueTaskStatus}.`);

      // 6. Wait the required delay before processing the next task
      if (i < MAX_TASKS_PER_WORKER_RUN - 1) {
        console.log(`[Worker] Waiting ${TIME_BETWEEN_API_CALLS_MS}ms before next task processing.`);
        await delay(TIME_BETWEEN_API_CALLS_MS);
      }
    }

    return NextResponse.json({ success: true, message: `Worker run completed. Processed ${tasksProcessedThisRun} task(s).` });

  } catch (workerError: any) {
    console.error('[Worker] Unhandled error in worker:', workerError);
    return NextResponse.json({ success: false, error: 'Worker failed.', details: workerError.message }, { status: 500 });
  }
}