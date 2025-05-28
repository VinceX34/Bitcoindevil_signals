import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, QueuedSignal } from '@/lib/db';
import { ApiResponse } from '@/lib/types';

// Define a more specific response type for this endpoint
interface QueueGetResponse extends ApiResponse {
  signals?: QueuedSignal[];
  pagination?: { limit: number };
}

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
    ) as QueuedSignal[];
    return NextResponse.json<QueueGetResponse>({ success: true, signals: rows, pagination: { limit } });
  } catch (e: unknown) {
    console.error('Queue GET: DB error', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json<QueueGetResponse>(
      { success: false, error: 'Failed to fetch queued signals', details: errorMessage },
      { status: 500 },
    );
  }
} 