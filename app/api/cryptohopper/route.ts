/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/cryptohopper/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

const CRYPTO_URL = 'https://api.cryptohopper.com/v1/hopper/1455342/order';
const HOPPER_ID  = '1455342';
const TOKEN      = process.env.CRYPTOHOPPER_ACCESS_TOKEN!;

// ---------------------------------------------------------------------------
// POST  – ontvangt payload van /api/webhook en stuurt 1-op-1 door
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const body = await req.json(); // Géén validatie, alles kan

  // ----------------- 1. Forward naar Cryptohopper -------------------------
  let chResp: any   = null;
  let status: 'SUCCESS' | 'FAILURE' = 'FAILURE';
  let err: string | null            = null;

  try {
    const r = await fetch(CRYPTO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': TOKEN,
      },
      body: JSON.stringify(body),           // <-- raw payload
    });
    chResp = await r.json().catch(() => ({}));
    status = r.ok ? 'SUCCESS' : 'FAILURE';
    if (!r.ok) err = chResp?.error ?? JSON.stringify(chResp);
  } catch (e: any) {
    err    = e.message;
    chResp = { error: err };
  }

  // ----------------- 2. Loggen in forwarded_signals -----------------------
  await executeQuery(
    `
      INSERT INTO forwarded_signals
      (tradingview_signal_id, tradingview_payload,
       cryptohopper_payload, cryptohopper_response,
       status, error_message, hopper_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7);
    `,
    [
      body.original_signal_id ?? null,
      JSON.stringify(body),
      JSON.stringify(body),  // zelfde payload doorgestuurd
      JSON.stringify(chResp),
      status,
      err,
      HOPPER_ID,
    ],
  );

  // ----------------- 3. HTTP-antwoord -----------------------
  if (status === 'FAILURE') {
    return NextResponse.json({ success: false, error: err }, { status: 502 });
  }
  return NextResponse.json({ success: true, response: chResp });
}

// ---------------------------------------------------------------------------
// GET  – laatste 20 doorgestuurde signalen
// ---------------------------------------------------------------------------
export async function GET() {
  const rows = await executeQuery(
    `SELECT * FROM forwarded_signals
     ORDER BY created_at DESC
     LIMIT 20;`,
  );
  return NextResponse.json({ success: true, signals: rows });
}
