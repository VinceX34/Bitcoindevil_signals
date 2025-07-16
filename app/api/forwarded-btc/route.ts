/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/forwarded-btc/route.ts

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
      `SELECT * FROM forwardedsignals_btc ORDER BY created_at DESC LIMIT $1;`,
       [limit]
    );
    return NextResponse.json({ success: true, signals: rows, pagination: { limit } });
  } catch (e: any) {
    console.error('[Forwarded BTC GET] DB-fout:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forwarded signals for BTC group', details: e.message },
      { status: 500 },
    );
  }
} 