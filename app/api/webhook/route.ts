// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, SimpleTradingViewSignal } from '@/lib/db';

/** Absolute basis-URL bepalen (prod → NEXT_PUBLIC_SITE_URL, anders localhost) */
function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'http://localhost:3000'
  );
}

/** Asynchroon doorsturen naar /api/cryptohopper  */
async function forwardToCryptoHopper(
  signal: any,
  savedId: number,
): Promise<void> {
  const url = `${getBaseUrl()}/api/cryptohopper`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Voeg alleen een verwijzing naar het TradingView-record toe – verder alles 1-op-1 doorsturen
    body: JSON.stringify({ ...signal, original_signal_id: savedId }),
  }).catch((e) =>
    console.error('Webhook → forward: netwerk/parse-fout', e),
  );
}

// ---------------------------------------------------------------------------
// POST  – ontvangt TradingView-webhook
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  //----------------------------------------------------------------
  // 1. Body uitlezen & JSON parsen (géén schema-checks)
  //----------------------------------------------------------------
  let signal: any;
  try {
    const txt = await req.text();
    signal = txt ? JSON.parse(txt) : {};
  } catch (e) {
    console.error('Webhook: ongeldige JSON', e);
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload' },
      { status: 400 },
    );
  }

  //----------------------------------------------------------------
  // 2. Opslaan in tradingview_signals
  //----------------------------------------------------------------
  const insert = `
    INSERT INTO tradingview_signals (raw_data)
    VALUES ($1)
    RETURNING id, raw_data, received_at;
  `;

  let saved: SimpleTradingViewSignal;
  try {
    const rows = await executeQuery(insert, [JSON.stringify(signal)]);
    saved = rows[0];
  } catch (e: any) {
    console.error('Webhook: DB-fout', e);
    return NextResponse.json(
      { success: false, error: 'DB insert failed', details: e.message },
      { status: 500 },
    );
  }

  //----------------------------------------------------------------
  // 3. Asynchroon doorsturen naar CryptoHopper
  //----------------------------------------------------------------
  forwardToCryptoHopper(signal, saved.id);

  //----------------------------------------------------------------
  // 4. Antwoord aan TradingView
  //----------------------------------------------------------------
  return NextResponse.json({
    success: true,
    message: 'Signal stored & forward triggered',
    savedSignal: saved,
  });
}

// ---------------------------------------------------------------------------
// GET  – laatste 20 opgeslagen TradingView-signalen
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const rows = await executeQuery(
      `SELECT id, raw_data, received_at
       FROM tradingview_signals
       ORDER BY received_at DESC
       LIMIT 20;`,
    );
    return NextResponse.json({ success: true, signals: rows });
  } catch (e: any) {
    console.error('Webhook GET: DB-fout', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch signals', details: e.message },
      { status: 500 },
    );
  }
}
