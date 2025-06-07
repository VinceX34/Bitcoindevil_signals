import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');
  let limit = 20;

  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 500);
    }
  }

  try {
    const rows = await executeQuery(
      `SELECT * FROM cryptohopper_queue_btc ORDER BY created_at DESC LIMIT $1;`,
       [limit]
    );
    return NextResponse.json({ success: true, signals: rows, pagination: { limit } });
  } catch(e: any) {
    console.error('Queue-BTC GET: DB-fout', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch queued BTC signals', details: e.message },
      { status: 500 },
    );
  }
}

// DELETE - btc queued signals
export async function DELETE(request: Request) {
    try {
      await executeQuery('TRUNCATE TABLE cryptohopper_queue_btc RESTART IDENTITY CASCADE;');
      return NextResponse.json({ success: true, message: 'All queued BTC signals deleted and ID sequence restarted.' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in DELETE /api/queue-btc:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete queued BTC signal(s)', details: errorMessage },
        { status: 500 }
      );
    }
  } 