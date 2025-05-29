import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, WealthSnapshot } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || 'last_30_days'; // Default to last 30 days

  let startDate: Date | null = null;
  const endDate = new Date(); // Today

  switch (period) {
    case 'last_7_days':
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'last_30_days':
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'last_90_days':
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'all_time':
      startDate = null; // No start date filter for all time
      break;
    default:
      // Fallback to last_30_days for unknown periods
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      break;
  }

  try {
    let queryText = `
      SELECT snapshot_at, total_value_usd 
      FROM wealth_snapshots 
    `;
    const queryParams: any[] = [];

    if (startDate) {
      queryText += ` WHERE snapshot_at >= $1 ORDER BY snapshot_at ASC;`;
      queryParams.push(startDate.toISOString());
    } else {
      queryText += ` ORDER BY snapshot_at ASC;`;
    }
    
    const historyData = await executeQuery(queryText, queryParams) as Omit<WealthSnapshot, 'id'>[];
    
    return NextResponse.json({ success: true, history: historyData, period });

  } catch (error: any) {
    console.error(`[wealth-history] Error fetching wealth history for period ${period}:`, error);
    return NextResponse.json({ success: false, error: 'Failed to fetch wealth history', details: error.message, period }, { status: 500 });
  }
} 