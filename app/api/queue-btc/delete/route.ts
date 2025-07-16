/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/queue-btc/delete/route.ts

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  console.log('[Queue BTC DELETE] Received request to delete all queued signals for BTC group.');
  try {
    await executeQuery('DELETE FROM cryptohopper_queue_btc;');
    return NextResponse.json({ success: true, message: 'All queued signals for the BTC group have been deleted.' });
  } catch (e: any) {
    console.error('[Queue BTC DELETE] DB-fout bij het verwijderen van queued signals:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete queued signals for BTC group', details: e.message },
      { status: 500 },
    );
  }
} 