export const HOPPER_CONFIGS = [
  { id: '1403066', exchange: 'Bitvavo - Smart dca' },
  { id: '1455342', exchange: 'Kucoin - Smart dca' },
  { id: '1808770', exchange: 'Crypto.com - Smart dca' },
  { id: '1817774', exchange: 'Coinbase - Smart dca' },
  { id: '1992607', exchange: 'Kucoin - Swing trader' },
  { id: '1992597', exchange: 'Coinbase - Swing trader EUR' },
  { id: '1992599', exchange: 'Coinbase - Swing trader USDC' },
  { id: '2084026', exchange: 'OKX - Swing trader' },
];

export const HOPPER_CONFIGS_BTC = [
  { id: '1989465', exchange: 'Coinbase - EUR' },
  { id: '1989473', exchange: 'Coinbase - USDC' },
  { id: '1989545', exchange: 'Kucoin - USDC' },
];

export const HOPPER_CONFIGS_AI = [
  { id: '1790517', exchange: 'Kraken X stocks' },
];

export interface HopperConfig {
  id: string;
  exchange: string;
} 