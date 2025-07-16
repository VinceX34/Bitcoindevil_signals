/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/queue/delete/route.ts

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  console.log('[Queue DELETE] Received request to delete all queued signals for default group.');
  try {
    await executeQuery('DELETE FROM cryptohopper_queue;');
    return NextResponse.json({ success: true, message: 'All queued signals for the default group have been deleted.' });
  } catch (e: any) {
    console.error('[Queue DELETE] DB-fout bij het verwijderen van queued signals:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete queued signals', details: e.message },
      { status: 500 },
    );
  }
} 