/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/forwarded-btc/delete/route.ts

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  console.log('[Forwarded BTC DELETE] Received request to delete all forwarded signals for BTC group.');
  try {
    await executeQuery('DELETE FROM forwardedsignals_btc;');
    return NextResponse.json({ success: true, message: 'All forwarded signals for the BTC group have been deleted.' });
  } catch (e: any) {
    console.error('[Forwarded BTC DELETE] DB-fout:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete forwarded signals for BTC group', details: e.message },
      { status: 500 },
    );
  }
} 