import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { ApiResponse } from '@/lib/types';

// GET – latest AI TradingView signals
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
      `SELECT id, raw_data, received_at
       FROM tradingview_signals_ai
       ORDER BY received_at DESC
       LIMIT $1;`,
       [limit]
    );
    return NextResponse.json({ success: true, signals: rows, pagination: { limit } });
  } catch (e: any) {
    console.error('Webhook-AI GET: DB-error', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI signals', details: e.message },
      { status: 500 },
    );
  }
}

// DELETE - ai raw signals
export async function DELETE(request: Request) {
  try {
    await executeQuery('TRUNCATE TABLE tradingview_signals_ai RESTART IDENTITY CASCADE;');
    return NextResponse.json<ApiResponse>({ success: true, message: 'All raw AI signals deleted and ID sequence restarted.' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in DELETE /api/webhook-ai:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete raw AI signal(s)', details: errorMessage },
      { status: 500 }
    );
  }
} 