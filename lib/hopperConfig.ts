export const HOPPER_CONFIGS = [
  { id: '1403066', exchange: 'Bitvavo' },
  { id: '1506523', exchange: 'Bybit' },
  { id: '1455342', exchange: 'Kucoin' },
  { id: '1790517', exchange: 'Kraken' },
  { id: '1808770', exchange: 'Crypto.com' },
  { id: '1817774', exchange: 'Coinbase' },
];

export interface HopperConfig {
  id: string;
  exchange: string;
} 