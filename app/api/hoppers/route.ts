import { NextResponse } from 'next/server';
import { HOPPER_CONFIGS, HOPPER_CONFIGS_BTC, HOPPER_CONFIGS_AI } from '@/lib/hopperConfig';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  const accessToken = process.env.CRYPTOHOPPER_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('CRYPTOHOPPER_ACCESS_TOKEN missing in environment.');
    return NextResponse.json(
      { success: false, error: 'Server mis-configuration. Access token not set.' },
      { status: 500 },
    );
  }

  // Combine all hopper configurations
  const allHoppersConfig = [...HOPPER_CONFIGS, ...HOPPER_CONFIGS_BTC, ...HOPPER_CONFIGS_AI];

  try {
    // Fetch hoppers sequentially with delay to respect rate limits
    const hoppers = [];
    for (const { id, exchange } of allHoppersConfig) {
      try {
        const res = await fetch(`https://api.cryptohopper.com/v1/hopper/${id}`, {
          headers: { 'access-token': accessToken },
          next: { revalidate: 60 }, // Revalidate every minute
        });

        if (!res.ok) {
          console.error(`Failed fetching hopper ${id} – status ${res.status}`);
          // Add placeholder data for failed hopper
          hoppers.push({
            id,
            exchange,
            name: `${exchange} Hopper`,
            total_cur: '0',
            image: null,
            error: true,
            assets: {},
            raw: null,
          });
          continue;
        }

        const json = await res.json();
        const hopper = json?.data?.hopper ?? {};

        // Fetch assets for this hopper (with a short delay first to respect rate limits)
        await delay(2000);
        let assets: Record<string, string> = {};
        try {
          const assetsRes = await fetch(`https://api.cryptohopper.com/v1/hopper/${id}/assets`, {
            headers: { 'access-token': accessToken },
            next: { revalidate: 60 },
          });
          if (assetsRes.ok) {
            const assetsJson = await assetsRes.json();
            assets = assetsJson?.data ?? {};
          } else {
            console.error(`Failed fetching assets for hopper ${id} – status ${assetsRes.status}`);
          }
        } catch (assetsErr) {
          console.error(`Error fetching assets for hopper ${id}:`, assetsErr);
        }

        hoppers.push({
          id,
          exchange,
          name: hopper.name,
          total_cur: hopper.total_cur,
          image: hopper.image,
          error: false,
          assets,
          raw: hopper,
        });

        // Wait 2 seconds between API calls to respect rate limits (already added before assets fetch).
        if (id !== allHoppersConfig[allHoppersConfig.length - 1].id) {
          await delay(2000);
        }
      } catch (e) {
        console.error(`Error fetching hopper ${id}:`, e);
        // Add placeholder data for failed hopper
        hoppers.push({
          id,
          exchange,
          name: `${exchange} Hopper`,
          total_cur: '0',
          image: null,
          error: true,
          assets: {},
          raw: null,
        });
      }
    }

    return NextResponse.json({ success: true, hoppers });
  } catch (e: any) {
    console.error('Error in hoppers API:', e);
    // Return placeholder data for all hoppers in case of general error
    const placeholderHoppers = allHoppersConfig.map(({ id, exchange }) => ({
      id,
      exchange,
      name: `${exchange} Hopper`,
      total_cur: '0',
      image: null,
      error: true,
      assets: {},
      raw: null,
    }));
    return NextResponse.json({ success: false, hoppers: placeholderHoppers, error: e.message });
  }
} 