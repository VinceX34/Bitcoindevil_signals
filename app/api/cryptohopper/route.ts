/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/cryptohopper/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Pas aan naar je daadwerkelijke db import, gebruik de functie voor simpele inserts
import { executeQuery as executeQuery } from '@/lib/db'; // Of hoe je het ook noemt

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
  const cryptohopperRouteCallId = Math.random().toString(36).substring(7);
  console.log(`[API /cryptohopper RQ ${cryptohopperRouteCallId}] Received POST request.`);
  
  let rawRequestBodyText: string | null = null;
  let requestBody: CryptoHopperRequestBody;

  try {
    rawRequestBodyText = await req.text(); // Lees eerst als tekst voor logging
    console.log(`[API /cryptohopper RQ ${cryptohopperRouteCallId}] Raw request body:`, rawRequestBodyText);
    
    // Probeer te parsen nadat het als tekst is gelogd
    if (!rawRequestBodyText) {
      console.error(`[API /cryptohopper RQ ${cryptohopperRouteCallId}] Empty request body received.`);
      return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
    }

    requestBody = JSON.parse(rawRequestBodyText);
    console.log(`[API /cryptohopper RQ ${cryptohopperRouteCallId}] Parsed tasks for queuing:`, JSON.stringify(requestBody.tasks, null, 2));

    if (!requestBody.tasks || !Array.isArray(requestBody.tasks) || requestBody.tasks.length === 0) {
      console.error(`[API /cryptohopper RQ ${cryptohopperRouteCallId}] Invalid request: tasks array is missing, not an array, or empty after parsing. Parsed body:`, JSON.stringify(requestBody, null, 2));
      return NextResponse.json({ success: false, error: 'Invalid request: tasks array is missing or empty after parsing.' }, { status: 400 });
    }
  } catch (error: any) { // expliciet any type voor error object
    console.error(`[API /cryptohopper RQ ${cryptohopperRouteCallId}] Error parsing JSON payload for /api/cryptohopper:`, error.message, error.stack, "Raw body was:", rawRequestBodyText);
    return NextResponse.json({ success: false, error: 'Invalid JSON payload for /api/cryptohopper' }, { status: 400 });
  }

  const { original_tradingview_signal_id, tasks } = requestBody;
  let enqueuedCount = 0;

  try {
    for (const taskDetails of tasks) {
      const queuePayload = {
        original_tv_signal_id: original_tradingview_signal_id,
        ...taskDetails // Bevat hopper_id, exchange_name, access_token, payload_to_ch_api, task_sub_id
      };

      await executeQuery( // Gebruik hier je standaard query functie
        `INSERT INTO cryptohopper_queue (payload) VALUES ($1);`, // status default naar 'pending'
        [JSON.stringify(queuePayload)]
      );
      enqueuedCount++;
    }

    console.log(`${enqueuedCount} task(s) enqueued for original TV signal ID: ${original_tradingview_signal_id || 'N/A'}`);
    return NextResponse.json({
      success: true,
      message: `${enqueuedCount} task(s) successfully enqueued for processing.`,
    });

  } catch (dbError: any) {
    console.error('Error enqueuing tasks to database:', dbError);
    return NextResponse.json({ success: false, error: 'Failed to enqueue tasks.', details: dbError.message }, { status: 500 });
  }
}

// De GET request kan blijven om de *resultaten* uit `forwarded_signals` te tonen.
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');
  let limit = 20;

  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 500); // Max limiet
    }
  }
  try {
    const rows = await executeQuery( // Gebruik hier je standaard query functie
      `SELECT * FROM forwarded_signals
       ORDER BY created_at DESC
       LIMIT $1;`,
       [limit]
    );
    return NextResponse.json({ success: true, signals: rows, pagination: { limit } });
  } catch(e: any) {
    console.error('CryptoHopper GET: DB-fout', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forwarded signals', details: e.message },
      { status: 500 },
    );
  }
}