/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/cryptohopper-ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeTransaction } from '@/lib/db';
import { ApiResponse } from '@/lib/types';

interface CryptoHopperTaskDetails {
  hopper_id: string;
  exchange_name: string;
  access_token: string;
  payload_to_ch_api: any;
  task_sub_id: number;
}

interface CryptoHopperRequestBody {
  original_tradingview_signal_id: number | null;
  tasks: CryptoHopperTaskDetails[];
}

export async function POST(req: NextRequest) {
  const cryptohopperRouteCallId = `ai-${Math.random().toString(36).substring(7)}`;
  console.log(`[API /cryptohopper-ai RQ ${cryptohopperRouteCallId}] Received POST request.`);
  
  let rawRequestBodyText: string | null = null;
  let requestBody: CryptoHopperRequestBody;

  try {
    rawRequestBodyText = await req.text();
    if (!rawRequestBodyText) {
      console.error(`[API /cryptohopper-ai RQ ${cryptohopperRouteCallId}] Empty request body received.`);
      return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
    }
    requestBody = JSON.parse(rawRequestBodyText);

    if (!requestBody.tasks || !Array.isArray(requestBody.tasks) || requestBody.tasks.length === 0) {
      console.error(`[API /cryptohopper-ai RQ ${cryptohopperRouteCallId}] Invalid request: tasks array is missing or empty.`);
      return NextResponse.json({ success: false, error: 'Invalid request: tasks array is missing or empty.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[API /cryptohopper-ai RQ ${cryptohopperRouteCallId}] Error parsing JSON payload:`, error.message);
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { original_tradingview_signal_id, tasks } = requestBody;
  console.log(`[API /cryptohopper-ai RQ ${cryptohopperRouteCallId}] Processing ${tasks.length} task(s) for TV signal ID: ${original_tradingview_signal_id}. Payload:`, JSON.stringify(requestBody, null, 2));

  try {
    // Use a transaction to ensure all tasks are queued or none are
    const result = await executeTransaction(async (executeQueryInTransaction) => {
      let enqueuedCount = 0;
      
      for (const taskDetails of tasks) {
        const queuePayload = {
          original_tv_signal_id: original_tradingview_signal_id,
          ...taskDetails
        };

        await executeQueryInTransaction(
          `INSERT INTO cryptohopper_queue_ai (signal_id, signal_group, payload, status, created_at)
           VALUES ($1, $2, $3, 'pending', NOW());`,
          [original_tradingview_signal_id, 'ai', JSON.stringify(queuePayload)]
        );
        enqueuedCount++;
      }

      return { enqueuedCount };
    });

    console.log(`[API /cryptohopper-ai RQ ${cryptohopperRouteCallId}] ${result.enqueuedCount} AI task(s) enqueued for original TV signal ID: ${original_tradingview_signal_id || 'N/A'}`);
    return NextResponse.json({
      success: true,
      message: `${result.enqueuedCount} task(s) successfully enqueued for AI processing.`,
    });

  } catch (dbError: any) {
    console.error(`[API /cryptohopper-ai RQ ${cryptohopperRouteCallId}] Error enqueuing AI tasks to database:`, dbError);
    return NextResponse.json({ success: false, error: 'Failed to enqueue AI tasks.', details: dbError.message }, { status: 500 });
  }
}

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
      `SELECT * FROM forwardedsignals_ai ORDER BY created_at DESC LIMIT $1;`,
       [limit]
    );
    return NextResponse.json({ success: true, signals: rows, pagination: { limit } });
  } catch(e: any) {
    console.error('CryptoHopper-AI GET: DB-fout', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forwarded AI signals', details: e.message },
      { status: 500 },
    );
  }
} 