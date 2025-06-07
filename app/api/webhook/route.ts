/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, SimpleTradingViewSignal } from '@/lib/db';
import { HOPPER_CONFIGS, HOPPER_CONFIGS_BTC, HopperConfig } from '@/lib/hopperConfig';

/** Asynchroon doorsturen naar de juiste /api/cryptohopper... route */
async function forwardToCryptoHopper(
  signalPayload: any,
  savedSignalId: number,
  baseUrl: string,
): Promise<void> {
  const signalGroup = signalPayload.signal_group || 'default';
  const webhookCallId = Math.random().toString(36).substring(7);
  console.log(`[Webhook FW ${webhookCallId}] Forwarding for signal group: "${signalGroup}", TV Signal ID ${savedSignalId}.`);

  const isBtcGroup = signalGroup === 'btc';
  const targetHoppers = isBtcGroup ? HOPPER_CONFIGS_BTC : HOPPER_CONFIGS;
  const targetApiUrl = isBtcGroup ? `${baseUrl}/api/cryptohopper-btc` : `${baseUrl}/api/cryptohopper`;

  const cryptohopperAccessToken = process.env.CRYPTOHOPPER_ACCESS_TOKEN;
  if (!cryptohopperAccessToken) {
    console.error(`[Webhook FW ${webhookCallId}] FATAL: CRYPTOHOPPER_ACCESS_TOKEN is niet ingesteld. TV Signal ID ${savedSignalId} wordt NIET doorgestuurd.`);
    return;
  }
  
  if (!targetHoppers || targetHoppers.length === 0) {
    console.error(`[Webhook FW ${webhookCallId}] Kritiek - Geen target hopper IDs gedefinieerd voor signal group "${signalGroup}". TV Signal ID ${savedSignalId} wordt NIET doorgestuurd.`);
    return;
  }
  console.log(`[Webhook FW ${webhookCallId}] Hopper configs found for group "${signalGroup}": ${targetHoppers.length} entries.`);

  let subIdCounter = 1;
  const tasksForCryptohopper = targetHoppers.map((hopper: HopperConfig) => ({
    hopper_id: hopper.id,
    exchange_name: hopper.exchange,
    access_token: cryptohopperAccessToken,
    payload_to_ch_api: { ...signalPayload },
    task_sub_id: subIdCounter++,
  }));

  const bodyForCryptohopperRoute = {
    original_tradingview_signal_id: savedSignalId,
    tasks: tasksForCryptohopper,
  };

  console.log(
    `[Webhook FW ${webhookCallId}] Forwarding ${tasksForCryptohopper.length} task(s) to ${targetApiUrl} for TV Signal ID ${savedSignalId}.`
  );

  try {
    const response = await fetch(targetApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyForCryptohopperRoute),
    });
    console.log(`[Webhook FW ${webhookCallId}] Response status from POST to ${targetApiUrl} (TV Signal ID ${savedSignalId}): ${response.status}`);
    if (!response.ok) {
      const responseBody = await response.text();
      console.error(`[Webhook FW ${webhookCallId}] Error response from ${targetApiUrl} (TV Signal ID ${savedSignalId}, Status: ${response.status}):`, responseBody);
    } else {
      console.log(`[Webhook FW ${webhookCallId}] Successfully called ${targetApiUrl} for TV Signal ID ${savedSignalId}.`);
    }
  } catch (e: any) {
    console.error(
      `[Webhook FW ${webhookCallId}] NETWERKFOUT of andere exceptie bij aanroepen van ${targetApiUrl} voor TV Signal ID ${savedSignalId}:`, 
      e.message, e.stack
    );
  }
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

  const signalGroup = signalFromTradingView.signal_group || 'default';
  const isBtcGroup = signalGroup === 'btc';

  //----------------------------------------------------------------
  // 2. Opslaan in de juiste tradingview_signals tabel
  //----------------------------------------------------------------
  const targetTable = isBtcGroup ? 'tradingview_signals_btc' : 'tradingview_signals';
  const insertQuery = `
    INSERT INTO ${targetTable} (raw_data)
    VALUES ($1)
    RETURNING id, raw_data, received_at;
  `;

  let savedSignalRecord: SimpleTradingViewSignal;
  try {
    const dataToStore = JSON.stringify(signalFromTradingView);
    const rows = await executeQuery(insertQuery, [dataToStore]);
    savedSignalRecord = rows[0];
    console.log(`TradingView signal (ID: ${savedSignalRecord.id}) opgeslagen in tabel "${targetTable}". Data: ${dataToStore}`);
  } catch (e: any) {
    console.error(`Webhook: DB-fout bij opslaan TradingView signaal in tabel "${targetTable}"`, e);
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