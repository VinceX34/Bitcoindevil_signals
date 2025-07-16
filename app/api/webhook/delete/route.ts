/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/webhook/delete/route.ts

import { NextResponse } from 'next/server';
import { executeTransaction } from '@/lib/db';

export async function DELETE() {
  console.log('[Webhook DELETE] Received request to delete all raw signals.');
  try {
    // Gebruik een transactie om zeker te zijn dat alle tabellen tegelijk worden geleegd
    const result = await executeTransaction(async (tx) => {
      await tx('DELETE FROM tradingview_signals;');
      await tx('DELETE FROM tradingview_signals_btc;');
      await tx('DELETE FROM tradingview_signals_ai;');
      return { success: true };
    });

    if(result.success) {
        console.log('[Webhook DELETE] Successfully deleted all raw signals from all groups.');
        return NextResponse.json({ success: true, message: 'All raw signals from all groups have been deleted.' });
    }
    
    throw new Error('Transaction failed unexpectedly.');

  } catch (e: any) {
    console.error('[Webhook DELETE] DB-fout bij het verwijderen van signalen:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete signals', details: e.message },
      { status: 500 },
    );
  }
} 