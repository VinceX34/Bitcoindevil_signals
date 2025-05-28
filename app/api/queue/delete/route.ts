import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function DELETE() {
  try {
    await executeQuery('DELETE FROM cryptohopper_queue;');
    return NextResponse.json({ success: true, message: 'All queued signals deleted successfully' });
  } catch (e: any) {
    console.error('Error deleting queued signals:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to delete signals', details: e.message },
      { status: 500 }
    );
  }
} 