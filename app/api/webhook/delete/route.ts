import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { ApiResponse } from '@/lib/types';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      // Delete a specific signal by ID
      await executeQuery('DELETE FROM tradingview_signals WHERE id = $1', [id]);
      return NextResponse.json<ApiResponse>({ success: true, message: `TradingView signal with ID ${id} deleted.` });
    } else {
      // No ID provided, delete all TradingView signals and reset ID sequence
      await executeQuery('TRUNCATE TABLE tradingview_signals RESTART IDENTITY CASCADE;');
      return NextResponse.json<ApiResponse>({ success: true, message: 'All TradingView signals deleted and ID sequence restarted.' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in DELETE /api/webhook/delete:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete TradingView signal(s)', details: errorMessage },
      { status: 500 }
    );
  }
} 