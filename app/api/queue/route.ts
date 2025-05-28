import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');
  let limit = 20; // Default limit

  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 500); // Max limit of 500 to prevent abuse
    }
  }

  try {
    const rows = await executeQuery(
      `SELECT id, payload, status, attempts, created_at, last_attempt_at, error_message
       FROM cryptohopper_queue
       ORDER BY created_at DESC
       LIMIT $1;`,
      [limit]
    );
    return NextResponse.json({ success: true, signals: rows, pagination: { limit } });
  } catch (e: any) {
    console.error('Queue GET: DB error', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch queued signals', details: e.message },
      { status: 500 },
    );
  }
} 