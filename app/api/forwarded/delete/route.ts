/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/forwarded/delete/route.ts

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  console.log('[Forwarded DELETE] Received request to delete all forwarded signals for default group.');
  try {
    await executeQuery('DELETE FROM forwarded_signals;', []);
    console.log('[Forwarded DELETE] Successfully deleted forwarded signals for default group.');
    return NextResponse.json({ success: true, message: 'All forwarded signals for the default group have been deleted.' });
  } catch (e: any) {
    console.error('[Forwarded DELETE] DB-fout:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete forwarded signals', details: e.message },
      { status: 500 },
    );
  }
} 