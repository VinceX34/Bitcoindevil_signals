/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/forwarded-ai/delete/route.ts

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  console.log('[Forwarded AI DELETE] Received request to delete all forwarded signals for AI group.');
  try {
    await executeQuery('DELETE FROM forwardedsignals_ai;');
    return NextResponse.json({ success: true, message: 'All forwarded signals for the AI group have been deleted.' });
  } catch (e: any) {
    console.error('[Forwarded AI DELETE] DB-fout:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete forwarded signals for AI group', details: e.message },
      { status: 500 },
    );
  }
} 