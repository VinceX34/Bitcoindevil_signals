import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { HOPPER_CONFIGS } from '@/lib/hopperConfig'; // Assuming this contains your hopper IDs

// This function should ideally be protected if exposed publicly,
// but for a cron job, the Vercel environment can provide security (e.g. CRON_SECRET).
// For now, focusing on functionality.

// Helper function to delay execution (copied from /api/hoppers)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function calculateTotalPortfolioValueUSD(): Promise<number> {
  const accessToken = process.env.CRYPTOHOPPER_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[take-wealth-snapshot] CRYPTOHOPPER_ACCESS_TOKEN missing.');
    throw new Error('Server mis-configuration: Access token not set for snapshot.');
  }

  let totalValue = 0;

  for (const { id } of HOPPER_CONFIGS) {
    try {
      // Fetch basic hopper info to get its current total_cur
      // We\' don\'t need full asset details for this snapshot, just the hopper\'s reported total
      const res = await fetch(`https://api.cryptohopper.com/v1/hopper/${id}`,
        {
          headers: { 'access-token': accessToken },
          // Use a short revalidation or no-cache for cron job to get fresh data
          next: { revalidate: 10 } 
        }
      );

      if (res.ok) {
        const json = await res.json();
        const hopperData = json?.data?.hopper;
        if (hopperData && hopperData.total_cur) {
          totalValue += parseFloat(hopperData.total_cur) || 0;
        }
      } else {
        console.warn(`[take-wealth-snapshot] Failed to fetch hopper ${id} for snapshot - status ${res.status}`);
      }
      // Wait briefly between API calls to respect rate limits, even for snapshots
      await delay(2000); // 2-second delay, adjust if needed
    } catch (e) {
      console.error(`[take-wealth-snapshot] Error fetching hopper ${id} for snapshot:`, e);
    }
  }
  return totalValue;
}

export async function GET(request: Request) {
  // Optional: Add CRON_SECRET protection if this endpoint is exposed
  // const cronSecret = request.headers.get('Authorization')?.replace('Bearer ', '');
  // if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
  //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // }
  
  try {
    const totalValueUSD = await calculateTotalPortfolioValueUSD();
    
    if (totalValueUSD === 0 && HOPPER_CONFIGS.length > 0) {
        // Optional: Decide if a 0 value should be logged if hoppers exist, or if it indicates an error
        console.warn('[take-wealth-snapshot] Calculated total portfolio value is 0. This might be an error or all hoppers are empty.');
    }

    const insertQuery = `
      INSERT INTO wealth_snapshots (total_value_usd)
      VALUES ($1)
      RETURNING id, snapshot_at, total_value_usd;
    `;
    const result = await executeQuery(insertQuery, [totalValueUSD]);

    console.log('[take-wealth-snapshot] Wealth snapshot taken:', result[0]);
    return NextResponse.json({ success: true, snapshot: result[0] });

  } catch (error: any) {
    console.error('[take-wealth-snapshot] Error taking wealth snapshot:', error);
    return NextResponse.json({ success: false, error: 'Failed to take wealth snapshot', details: error.message }, { status: 500 });
  }
} 