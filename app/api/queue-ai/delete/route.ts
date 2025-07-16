/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/queue-ai/delete/route.ts

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  console.log('[Queue AI DELETE] Received request to delete all queued signals for AI group.');
  try {
    await executeQuery('DELETE FROM cryptohopper_queue_ai;');
    return NextResponse.json({ success: true, message: 'All queued signals for the AI group have been deleted.' });
  } catch (e: any) {
    console.error('[Queue AI DELETE] DB-fout bij het verwijderen van queued signals:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete queued signals for AI group', details: e.message },
      { status: 500 },
    );
  }
} 