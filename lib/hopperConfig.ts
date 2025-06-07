export const HOPPER_CONFIGS = [
  { id: '1403066', exchange: 'Bitvavo' },
  { id: '1506523', exchange: 'Bybit' },
  { id: '1455342', exchange: 'Kucoin' },
  { id: '1790517', exchange: 'Kraken' },
  { id: '1808770', exchange: 'Crypto.com' },
  { id: '1817774', exchange: 'Coinbase' },
];

export const HOPPER_CONFIGS_BTC = [
  { id: '1989465', exchange: 'Coinbase - EUR' },
  { id: '1989473', exchange: 'Coinbase - USDC' },
  { id: '1989528', exchange: 'Bybit - USDC' }, // Assuming USDXC was a typo for USDC
  { id: '1989545', exchange: 'Kucoin - USDC' },
];

export interface HopperConfig {
  id: string;
  exchange: string;
} 