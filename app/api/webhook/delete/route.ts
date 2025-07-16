/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/webhook/delete/route.ts

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  console.log('[Webhook DELETE] Received request to TRUNCATE all raw signal tables.');
  try {
    // Gebruik TRUNCATE ... RESTART IDENTITY CASCADE om tabellen, gerelateerde data en ID-tellers te resetten.
    await executeQuery('TRUNCATE TABLE tradingview_signals RESTART IDENTITY CASCADE;', []);
    await executeQuery('TRUNCATE TABLE tradingview_signals_btc RESTART IDENTITY CASCADE;', []);
    await executeQuery('TRUNCATE TABLE tradingview_signals_ai RESTART IDENTITY CASCADE;', []);

    console.log('[Webhook DELETE] Successfully truncated all raw signal tables and reset ID counters.');
    return NextResponse.json({ success: true, message: 'All raw signals from all groups have been deleted and ID counters reset.' });

  } catch (e: any) {
    console.error('[Webhook DELETE] DB-fout bij het legen van signaaltabellen:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to truncate signal tables', details: e.message },
      { status: 500 },
    );
  }
} 