const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD&to=EUR';

export async function getUsdToEurRate(): Promise<number> {
  try {
    const res = await fetch(FRANKFURTER_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return 0.92;
    const data = await res.json();
    const rate = Number(data?.rates?.EUR);
    return Number.isFinite(rate) && rate > 0 ? rate : 0.92;
  } catch (e) {
    console.error('[fx] USD to EUR conversion failed:', e);
    return 0.92;
  }
}

export function toEur(amount: number, baseCurrency?: string | null, usdToEur = 0.92): number {
  const value = Number(amount) || 0;
  const currency = (baseCurrency || 'USD').toUpperCase();
  if (currency === 'EUR') return value;
  if (currency === 'USD' || currency === 'USDC' || currency === 'USDT') {
    return value * usdToEur;
  }
  return value * usdToEur;
}
