/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/cryptohopper/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// Definieer de delay functie hier of importeer hem
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const DELAY_BETWEEN_REQUESTS_MS = 20000; // Staat op 20 seconden

// Interface voor een taak
interface CryptoHopperTask {
  hopper_id: string;
  access_token: string;
  payload_to_ch_api: any; // De body voor de Cryptohopper API call
}

// Interface voor de body die deze route verwacht
interface CryptoHopperRequestBody {
  original_tradingview_signal_id: number | null; // Kan null zijn als het niet via de webhook komt
  tasks: CryptoHopperTask[];
}

// ---------------------------------------------------------------------------
// POST  – ontvangt takenlijst en stuurt signalen met delay door
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let requestBody: CryptoHopperRequestBody;
  try {
    requestBody = await req.json();
    if (!requestBody.tasks || !Array.isArray(requestBody.tasks) || requestBody.tasks.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid request: tasks array is missing or empty.' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload for /api/cryptohopper' }, { status: 400 });
  }

  const { original_tradingview_signal_id, tasks } = requestBody;
  const results = []; // Om resultaten van elke taak op te slaan

  for (const task of tasks) {
    const { hopper_id, access_token, payload_to_ch_api } = task;
    const cryptoHopperApiUrl = `https://api.cryptohopper.com/v1/hopper/${hopper_id}/order`;

    let chResp: any = null;
    let status: 'SUCCESS' | 'FAILURE' = 'FAILURE'; // Default to FAILURE
    let err: string | null = null;

    try {
      console.log(`Processing task for hopper ${hopper_id}, payload:`, JSON.stringify(payload_to_ch_api));
      const r = await fetch(cryptoHopperApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access-token': access_token,
        },
        body: JSON.stringify(payload_to_ch_api),
      });
      chResp = await r.json().catch(() => ({ response_parse_error: "Failed to parse CH JSON response" }));
      status = r.ok ? 'SUCCESS' : 'FAILURE';
      if (!r.ok) {
        err = chResp?.error ?? chResp?.message ?? JSON.stringify(chResp);
        console.error(`CryptoHopper API Error for hopper ${hopper_id}: ${err}`, chResp);
      } else {
        console.log(`CryptoHopper API Success for hopper ${hopper_id}:`, chResp);
      }
    } catch (e: any) {
      err = e.message;
      chResp = { error_message: err }; // status remains 'FAILURE'
      console.error(`Network/fetch Error for hopper ${hopper_id}: ${err}`, e);
    }

    // Loggen in forwarded_signals
    try {
      await executeQuery(
        `
          INSERT INTO forwarded_signals
          (tradingview_signal_id, tradingview_payload,
           cryptohopper_payload, cryptohopper_response,
           status, error_message, hopper_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `,
        [
          original_tradingview_signal_id,
          JSON.stringify(task),
          JSON.stringify(payload_to_ch_api),
          JSON.stringify(chResp),
          status, // This will be 'SUCCESS' or 'FAILURE' from the API call
          err,
          hopper_id,
        ],
      );
      // If DB log is successful, add the result from the API call
      results.push({ hopper_id, status, error: err, cryptohopper_response: chResp });

    } catch (dbError: any) {
      console.error(`DB Error logging forwarded_signal for hopper ${hopper_id}: ${dbError.message}`, dbError);
      // If DB log fails, we still want to record this failure.
      // The 'status' here reflects the API call status, but we add a DB-specific error.
      results.push({
        hopper_id,
        status: 'FAILURE', // Mark as overall failure for this task due to DB log issue
        error: `DB Log Error: ${dbError.message}. API Status was: ${status}, API Error: ${err || 'None'}`,
        cryptohopper_response: chResp,
        db_log_status: 'DB_LOG_FAILURE' // Add a specific field for DB log status
      });
    }

    // ALTIJD DELAYEN NA ELKE TAAKVERWERKING
    console.log(`Processed task for ${hopper_id}. Applying delay of ${DELAY_BETWEEN_REQUESTS_MS}ms before any next action.`);
    await delay(DELAY_BETWEEN_REQUESTS_MS);
  }

  // Controleer of er fouten waren over alle taken
  // Een taak is succesvol als zijn status (van de API call) 'SUCCESS' is
  // EN er geen db_log_status van 'DB_LOG_FAILURE' is.
  // --- GECORRIGEERDE LOGICA ---
  const overallSuccess = results.every(r => r.status === 'SUCCESS' && r.db_log_status !== 'DB_LOG_FAILURE');

  if (!overallSuccess) {
    const failedTasksDetails = results.filter(r => r.status !== 'SUCCESS' || r.db_log_status === 'DB_LOG_FAILURE');
    console.error('One or more tasks failed or had DB logging issues:', failedTasksDetails);
    return NextResponse.json(
      {
        success: false,
        message: 'One or more tasks failed to forward to CryptoHopper or had DB logging issues.',
        results, // Stuur alle resultaten terug, inclusief succesvolle
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, message: 'All tasks processed successfully.', results });
}

// GET blijft hetzelfde
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