import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  try {
    await executeQuery('DELETE FROM tradingview_signals;');
    return NextResponse.json({ success: true, message: 'All TradingView signals deleted successfully' });
  } catch (e: any) {
    console.error('Error deleting TradingView signals:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete signals', details: e.message },
      { status: 500 }
    );
  }
} 