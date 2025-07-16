/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/forwarded/route.ts

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  let limit = 50; // Default limit

  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 500);
    }
  }

  try {
    const rows = await executeQuery(
      `SELECT * FROM forwarded_signals ORDER BY created_at DESC LIMIT $1;`, // <-- HIER ZAT DE FOUT
       [limit]
    );
    return NextResponse.json({ success: true, signals: rows, pagination: { limit } });
  } catch (e: any) {
    console.error('[Forwarded GET] DB-fout:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forwarded signals', details: e.message },
      { status: 500 },
    );
  }
} 