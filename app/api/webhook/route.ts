/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, SimpleTradingViewSignal } from '@/lib/db';
import { HOPPER_CONFIGS, HopperConfig } from '@/lib/hopperConfig';

/** Asynchroon doorsturen naar /api/cryptohopper  */
async function forwardToCryptoHopper(
  signalPayloadFromTradingView: any,
  savedSignalId: number,
  baseUrl: string,
): Promise<void> {
  const url = `${baseUrl}/api/cryptohopper`;

  // De Cryptohopper access token is altijd hetzelfde en wordt uit environment variables gehaald.
  const cryptohopperAccessToken = process.env.CRYPTOHOPPER_ACCESS_TOKEN;
  if (!cryptohopperAccessToken) {
    console.error(
      'FATAL: CRYPTOHOPPER_ACCESS_TOKEN is niet ingesteld in de environment variables. Kan signaal niet doorsturen.',
    );
    return;
  }

  // Gebruik nu de HOPPER_CONFIGS uit de gedeelde file
  if (!HOPPER_CONFIGS || HOPPER_CONFIGS.length === 0) {
    console.error(
      'Webhook → forwardToCryptoHopper: Kritiek - Geen target hopper IDs gedefinieerd in HOPPER_CONFIGS. Signaal wordt niet doorgestuurd.',
    );
    return;
  }

  // De payload naar /api/cryptohopper bevat nu ook de exchange naam en task_sub_id.
  let subIdCounter = 1;
  const tasksForCryptohopper = HOPPER_CONFIGS.map((hopper: HopperConfig) => ({
    hopper_id: hopper.id,
    exchange_name: hopper.exchange, // Voeg exchange naam toe
    access_token: cryptohopperAccessToken,
    payload_to_ch_api: { ...signalPayloadFromTradingView },
    task_sub_id: subIdCounter++, // Add task_sub_id
  }));

  // Het object dat naar /api/cryptohopper wordt gestuurd
  const bodyForCryptohopperRoute = {
    original_tradingview_signal_id: savedSignalId,
    tasks: tasksForCryptohopper,
  };

  console.log(
    `Forwarding ${tasksForCryptohopper.length} task(s) to ${url} for TV signal ID ${savedSignalId}. Target hoppers: ${HOPPER_CONFIGS.map(h => h.id).join(', ')}`,
  );

  // Verstuur de taken naar de /api/cryptohopper route
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyForCryptohopperRoute),
  }).catch((e) =>
    console.error(
      `Webhook → forwardToCryptoHopper: Netwerk- of parsefout bij het aanroepen van ${url}`,
      e,
    ),
  );
}

// ---------------------------------------------------------------------------
// POST  – ontvangt TradingView-webhook
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Determine the base URL from the request headers or environment
  const protocol = req.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = req.headers.get('host') || process.env.VERCEL_URL || 'localhost:3000'; // VERCEL_URL for Vercel, fallback to host, then localhost
  const baseUrl = `${protocol}://${host}`;

  //----------------------------------------------------------------
  // 1. Body uitlezen & JSON parsen
  //----------------------------------------------------------------
  let signalFromTradingView: any;
  let rawTextPayload = '';
  try {
    rawTextPayload = await req.text();
    if (rawTextPayload) {
      try {
        signalFromTradingView = JSON.parse(rawTextPayload);
      } catch (jsonError) {
        console.error(
          'Webhook: Kon payload niet als JSON parsen. TradingView stuurde waarschijnlijk geen valide JSON.',
          { error: jsonError, payload: rawTextPayload },
        );
        return NextResponse.json(
          { success: false, error: 'Invalid JSON payload from TradingView' },
          { status: 400 },
        );
      }
    } else {
      console.warn('Webhook: Lege payload ontvangen van TradingView.');
      signalFromTradingView = {}; // Handel lege payload af
    }
  } catch (e) {
    console.error('Webhook: Fout bij het lezen van de request body', e);
    return NextResponse.json(
      { success: false, error: 'Error reading request body' },
      { status: 400 },
    );
  }

  // Valideer of de verwachte velden aanwezig zijn (optioneel maar aanbevolen)
  if (!signalFromTradingView || typeof signalFromTradingView.order_type !== 'string' || typeof signalFromTradingView.coin !== 'string') {
    console.error('Webhook: Ontvangen signaal mist vereiste velden (order_type, coin).', { payload: signalFromTradingView });
    return NextResponse.json(
      { success: false, error: 'Signal payload missing required fields: order_type, coin' },
      { status: 400 },
    );
  }

  //----------------------------------------------------------------
  // 2. Opslaan in tradingview_signals
  //----------------------------------------------------------------
  const insertQuery = `
    INSERT INTO tradingview_signals (raw_data)
    VALUES ($1)
    RETURNING id, raw_data, received_at;
  `;

  let savedSignalRecord: SimpleTradingViewSignal;
  try {
    const dataToStore = JSON.stringify(signalFromTradingView);
    const rows = await executeQuery(insertQuery, [dataToStore]);
    savedSignalRecord = rows[0];
    console.log(`TradingView signal (ID: ${savedSignalRecord.id}) opgeslagen in database. Data: ${dataToStore}`);
  } catch (e: any) {
    console.error('Webhook: DB-fout bij opslaan TradingView signaal', e);
    return NextResponse.json(
      { success: false, error: 'DB insert failed for TradingView signal', details: e.message },
      { status: 500 },
    );
  }

  //----------------------------------------------------------------
  // 3. Asynchroon doorsturen naar CryptoHopper (via de /api/cryptohopper route)
  //----------------------------------------------------------------
  forwardToCryptoHopper(signalFromTradingView, savedSignalRecord.id, baseUrl);

  //----------------------------------------------------------------
  // 4. Antwoord aan TradingView
  //----------------------------------------------------------------
  return NextResponse.json({
    success: true,
    message: 'Signal stored & forwarding to Cryptohopper processing triggered',
    savedSignalId: savedSignalRecord.id,
  });
}

// ---------------------------------------------------------------------------
// GET  – laatste 20 (of aangepaste limiet) opgeslagen TradingView-signalen
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) { // req toegevoegd voor eventuele query params
  const searchParams = req.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');
  let limit = 20; // Default limit

  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 500); // Max limiet van 500 om misbruik te voorkomen
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