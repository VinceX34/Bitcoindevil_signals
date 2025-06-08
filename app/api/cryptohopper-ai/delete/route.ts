import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { ApiResponse } from '@/lib/types';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      await executeQuery('DELETE FROM forwardedsignals_ai WHERE id = $1', [id]);
      return NextResponse.json<ApiResponse>({ success: true, message: `Forwarded AI signal with ID ${id} deleted.` });
    } else {
      await executeQuery('TRUNCATE TABLE forwardedsignals_ai RESTART IDENTITY CASCADE;');
      return NextResponse.json<ApiResponse>({ success: true, message: 'All forwarded AI signals deleted and ID sequence restarted.' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in DELETE /api/cryptohopper-ai/delete:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete forwarded AI signal(s)', details: errorMessage },
      { status: 500 }
    );
  }
} 