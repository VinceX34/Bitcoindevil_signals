import { NextResponse } from 'next/server';

const T212_BASE = 'https://live.trading212.com/api/v0';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function trading212AuthHeaders(): HeadersInit | null {
  const apiKey = process.env.TRADING212_API_KEY;
  if (!apiKey) return null;

  const apiSecret = process.env.TRADING212_API_SECRET;
  if (apiSecret) {
    const encoded = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  // Legacy schema from Trading 212 docs: API key in the Authorization header
  return { Authorization: apiKey };
}

function authErrorMessage(status: number, hasSecret: boolean): string {
  if (status === 401) {
    return hasSecret
      ? 'Trading 212 rejected the API credentials. Check TRADING212_API_KEY and TRADING212_API_SECRET.'
      : 'Trading 212 rejected the API key (401). Official auth now needs an API Key and API Secret. Generate a new key pair in Settings → API (Beta) and add both env vars.';
  }
  if (status === 403) {
    return 'Trading 212 API key is missing the required account/portfolio permission.';
  }
  return `Trading 212 request failed with status ${status}.`;
}

async function fetchUsdRate(currency: string): Promise<number> {
  if (!currency || currency.toUpperCase() === 'USD') return 1;
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(currency.toUpperCase())}&to=USD`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return 1;
    const data = await res.json();
    const rate = Number(data?.rates?.USD);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  } catch (e) {
    console.error('[trading212] FX conversion failed:', e);
    return 1;
  }
}

function mapPosition(pos: any) {
  const ticker = pos?.instrument?.ticker || pos?.ticker || 'UNKNOWN';
  const name = pos?.instrument?.name || ticker;
  const quantity = Number(pos?.quantity) || 0;
  const currentPrice = Number(pos?.currentPrice) || 0;
  const walletValue = Number(pos?.walletImpact?.currentValue);
  const currentValue = Number.isFinite(walletValue)
    ? walletValue
    : currentPrice * quantity;

  return {
    ticker,
    name,
    quantity,
    currentValue,
  };
}

export async function GET() {
  const hasSecret = Boolean(process.env.TRADING212_API_SECRET);
  const headers = trading212AuthHeaders();

  if (!headers) {
    return NextResponse.json(
      {
        success: false,
        error: 'Server mis-configuration. TRADING212_API_KEY is not set.',
        currency: 'EUR',
        totalValue: 0,
        totalValueUsd: 0,
        cash: { availableToTrade: 0, inPies: 0, reservedForOrders: 0 },
        positions: [],
      },
      { status: 500 },
    );
  }

  try {
    const summaryRes = await fetch(`${T212_BASE}/equity/account/summary`, {
      headers,
      cache: 'no-store',
    });

    if (!summaryRes.ok) {
      const message = authErrorMessage(summaryRes.status, hasSecret);
      console.error(`[trading212] summary failed: ${summaryRes.status}`);
      return NextResponse.json(
        {
          success: false,
          error: message,
          currency: 'EUR',
          totalValue: 0,
          totalValueUsd: 0,
          cash: { availableToTrade: 0, inPies: 0, reservedForOrders: 0 },
          positions: [],
        },
        { status: summaryRes.status === 401 || summaryRes.status === 403 ? 200 : 502 },
      );
    }

    const summary = await summaryRes.json();

    await delay(1100);

    let positionsRaw: any[] = [];
    const positionsRes = await fetch(`${T212_BASE}/equity/positions`, {
      headers,
      cache: 'no-store',
    });

    if (positionsRes.ok) {
      const positionsJson = await positionsRes.json();
      positionsRaw = Array.isArray(positionsJson) ? positionsJson : [];
    } else {
      console.error(`[trading212] positions failed: ${positionsRes.status}`);
    }

    const cash = {
      availableToTrade: Number(summary?.cash?.availableToTrade) || 0,
      inPies: Number(summary?.cash?.inPies) || 0,
      reservedForOrders: Number(summary?.cash?.reservedForOrders) || 0,
    };
    // Match Trading 212 app Account Value: investments + main pot (+ reserved orders).
    // Do not add cash.inPies; that double-counts pie cash already reflected in investments.
    const investmentValue = Number(summary?.investments?.currentValue) || 0;
    const totalValue = investmentValue + cash.availableToTrade + cash.reservedForOrders;

    const currency = String(summary?.currency || 'EUR').toUpperCase();
    const usdRate = await fetchUsdRate(currency);
    const totalValueUsd = totalValue * usdRate;

    const positions = positionsRaw
      .map(mapPosition)
      .sort((a, b) => b.currentValue - a.currentValue);

    return NextResponse.json({
      success: true,
      currency,
      totalValue,
      totalValueUsd,
      cash,
      positions,
    });
  } catch (e: any) {
    console.error('[trading212] request failed:', e);
    return NextResponse.json(
      {
        success: false,
        error: e?.message || 'Unknown error fetching Trading 212 data.',
        currency: 'EUR',
        totalValue: 0,
        totalValueUsd: 0,
        cash: { availableToTrade: 0, inPies: 0, reservedForOrders: 0 },
        positions: [],
      },
      { status: 500 },
    );
  }
}
