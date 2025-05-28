"use client";

import Image from 'next/image';

interface HopperData {
  id: string;
  name?: string;
  exchange?: string;
  total_cur?: string | number;
  error?: boolean;
}

interface Props {
  hopper: HopperData;
  isDarkMode: boolean;
}

const exchangeImageMap: Record<string, string> = {
  bitvavo: '/Smart-DCA-bitvavo.jpg',
  bybit: '/smart-dca-bybit.jpg',
  kucoin: '/smart-dca-Kucoin.jpg',
  kraken: '/Smart-DCA-Kraken.jpg',
  'crypto.com': '/Smart-DCA-crypto.com.jpg',
  crypto: '/Smart-DCA-crypto.com.jpg', // Sample shows `exchange: "crypto"` for Crypto.com
  coinbase: '/Smart-DCA-coinbase.jpg',
  coinbasepro: '/Smart-DCA-coinbase.jpg',
};

function getImageForExchange(exchange?: string): string {
  if (!exchange) return '/devil_full_white.png';
  const key = exchange.toLowerCase();
  return exchangeImageMap[key] || '/devil_full_white.png';
}

const HopperCard: React.FC<Props> = ({ hopper, isDarkMode }) => {
  const imgSrc = getImageForExchange(hopper.exchange);
  const totalFormatted = hopper.total_cur
    ? Number(hopper.total_cur).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      })
    : 'N/A';

  return (
    <div
      className={`border rounded-md shadow-lg overflow-hidden transition-colors ${
        isDarkMode
          ? 'bg-[#252526] border-[#3c3c3c] text-[#cccccc]'
          : 'bg-white border-gray-200 text-gray-800'
      } ${hopper.error ? 'opacity-50' : ''}`}
    >
      <div className="relative aspect-[600/430]">
        <Image
          src={imgSrc}
          alt={`${hopper.exchange} bot image`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority
        />
        {hopper.error && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Data Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-1">
        <h3 className="text-lg font-semibold break-words">
          {hopper.name || 'Unnamed Hopper'}
        </h3>
        <p className="text-sm">Exchange: {hopper.exchange || '—'}</p>
        <p className="text-sm font-medium">Total: {totalFormatted}</p>
      </div>
    </div>
  );
};

export default HopperCard; 