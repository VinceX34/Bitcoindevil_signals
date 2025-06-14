import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  tradingview_signals,
  tradingview_signals_btc,
  tradingview_signals_ai,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

function getSignalTable(group: string | null) {
  switch (group) {
    case 'btc':
      return tradingview_signals_btc;
    case 'ai':
      return tradingview_signals_ai;
    default:
      return tradingview_signals;
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const group = searchParams.get('group');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  const table = getSignalTable(group);

  try {
    const signals = await db
      .select()
      .from(table)
      .orderBy(desc(table.created_at))
      .limit(limit);

    return NextResponse.json({ success: true, signals });
  } catch (error: any) {
    console.error(`Error fetching signals for group ${group}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch signals', details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const group = searchParams.get('group');
  const idParam = searchParams.get('id');

  const table = getSignalTable(group);

  try {
    if (idParam) {
      // Delete a single signal
      const id = parseInt(idParam, 10);
      await db.delete(table).where(eq(table.id, id));
      return NextResponse.json({
        success: true,
        message: `Signal with ID ${id} from group ${group} deleted.`,
      });
    } else {
      // Truncate all signals for the group
      await db.delete(table);
      return NextResponse.json({
        success: true,
        message: `All signals for group ${group} have been deleted.`,
      });
    }
  } catch (error: any) {
    console.error(`Error deleting signals for group ${group}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete signals', details: error.message },
      { status: 500 },
    );
  }
} 