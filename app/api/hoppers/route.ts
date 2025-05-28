import { NextResponse } from 'next/server';

// All hopper IDs + their friendly exchange name for display
const HOPPER_CONFIGS = [
  { id: '1403066', exchange: 'Bitvavo' },
  { id: '1506523', exchange: 'Bybit' },
  { id: '1455342', exchange: 'Kucoin' },
  { id: '1790517', exchange: 'Kraken' },
  { id: '1808770', exchange: 'Crypto.com' },
  { id: '1817774', exchange: 'Coinbase' },
];

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

  try {
    // Fetch hoppers sequentially with delay to respect rate limits
    const hoppers = [];
    for (const { id, exchange } of HOPPER_CONFIGS) {
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
            raw: null,
          });
          continue;
        }

        const json = await res.json();
        const hopper = json?.data?.hopper ?? {};

        hoppers.push({
          id,
          exchange,
          name: hopper.name,
          total_cur: hopper.total_cur,
          image: hopper.image,
          error: false,
          raw: hopper,
        });

        // Wait 2 seconds between API calls to respect rate limits
        if (id !== HOPPER_CONFIGS[HOPPER_CONFIGS.length - 1].id) {
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
          raw: null,
        });
      }
    }

    return NextResponse.json({ success: true, hoppers });
  } catch (e: any) {
    console.error('Error in hoppers API:', e);
    // Return placeholder data for all hoppers in case of general error
    const placeholderHoppers = HOPPER_CONFIGS.map(({ id, exchange }) => ({
      id,
      exchange,
      name: `${exchange} Hopper`,
      total_cur: '0',
      image: null,
      error: true,
      raw: null,
    }));
    return NextResponse.json({ success: false, hoppers: placeholderHoppers, error: e?.message });
  }
} 