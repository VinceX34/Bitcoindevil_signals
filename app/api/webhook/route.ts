/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, SimpleTradingViewSignal } from '@/lib/db';
import { HOPPER_CONFIGS, HOPPER_CONFIGS_BTC, HOPPER_CONFIGS_AI, HopperConfig } from '@/lib/hopperConfig';

/** Helper to normalize signal_group values */
function normalizeSignalGroup(input: any): 'default' | 'btc' | 'ai' {
  if (!input || typeof input !== 'string') return 'default';
  const value = input.trim().toLowerCase();
  if (value === 'btc') return 'btc';
  if (value === 'ai') return 'ai';
  return 'default';
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
  console.log('[Webhook POST] Request received. Starting body processing.');
  try {
    rawTextPayload = await req.text();
    console.log('[Webhook POST] Raw payload received:', rawTextPayload);
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

  const signalGroup = normalizeSignalGroup(signalFromTradingView.signal_group);
  console.log(`[Webhook POST] Final determined signal_group: "${signalGroup}"`);
  
  //----------------------------------------------------------------
  // 2. Opslaan in de juiste tradingview_signals tabel
  //----------------------------------------------------------------
  let targetTable: string;
  switch(signalGroup) {
    case 'btc':
      targetTable = 'tradingview_signals_btc';
      break;
    case 'ai':
      targetTable = 'tradingview_signals_ai';
      break;
    default:
      targetTable = 'tradingview_signals';
  }

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
    console.log(`[Webhook POST] TradingView signal (ID: ${savedSignalRecord.id}) opgeslagen in tabel "${targetTable}".`);
  } catch (e: any) {
    console.error(`[Webhook POST] DB-fout bij opslaan TradingView signaal in tabel "${targetTable}"`, e);
    return NextResponse.json(
      { success: false, error: 'DB insert failed for TradingView signal', details: e.message },
      { status: 500 },
    );
  }

  //----------------------------------------------------------------
  // 3. Antwoord aan TradingView
  //----------------------------------------------------------------
  return NextResponse.json({
    success: true,
    message: 'Signal successfully received and stored.',
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
      `
      (SELECT id, raw_data, received_at, 'default' as signal_group FROM tradingview_signals)
      UNION ALL
      (SELECT id, raw_data, received_at, 'btc' as signal_group FROM tradingview_signals_btc)
      UNION ALL
      (SELECT id, raw_data, received_at, 'ai' as signal_group FROM tradingview_signals_ai)
      ORDER BY received_at DESC
      LIMIT $1;
      `,
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