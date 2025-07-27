"use client";

import Image from 'next/image';
import { HOPPER_CONFIGS_AI } from '@/lib/hopperConfig'; // Import AI hopper config

interface HopperData {
  id: string;
  name: string;
  exchange: string;
  total_cur: string;
  error: boolean;
  assets: {
    [key: string]: string;
  };
  image?: string | null; // API might still send this, but we won't use it for the main card image
}

interface Props {
  hopper: HopperData;
  isDarkMode: boolean;
}

const getLargeExchangeImage = (exchangeName?: string): string => {
  if (!exchangeName) return '/devil_full_white.png';
  
  // Normalize by taking the first part of the name (e.g., "Coinbase" from "Coinbase - EUR")
  const normalizedExchange = exchangeName.split(' - ')[0].toLowerCase();
  
  const map: Record<string, string> = {
    'bitvavo': '/Smart-DCA-bitvavo.jpg',
    'bybit': '/smart-dca-bybit.jpg',
    'kucoin': '/smart-dca-Kucoin.jpg',
    'kraken': '/Smart-DCA-Kraken.jpg',
    'crypto.com': '/Smart-DCA-crypto.com.jpg',
    'crypto': '/Smart-DCA-crypto.com.jpg',
    'coinbase': '/Smart-DCA-coinbase.jpg',
    'coinbasepro': '/Smart-DCA-coinbase.jpg',
  };
  return map[normalizedExchange] || '/devil_full_white.png';
};

const HopperCard: React.FC<Props> = ({ hopper, isDarkMode }) => {
  const formatValue = (value: string, forceTwoDecimals = false) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    if (forceTwoDecimals) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  // Determine main image source with new logic
  const isAiHopper = HOPPER_CONFIGS_AI.some(config => config.id === hopper.id);
  const mainImageSrc = isAiHopper
    ? '/Swing-trader-low.jpg'
    : getLargeExchangeImage(hopper.exchange);


  const allowedAssetsBase = ['BTC', 'ETH', 'SOL', 'AVAX', 'ADA', 'XRP', 'DOT', 'BNB'];
  const allowedAssetsAi = [...allowedAssetsBase, 'NEAR', 'RENDER', 'TAO', 'MATIC', 'GRT', 'FET'];

  // Create a case-insensitive map of the assets from the API
  const assetsMap: Record<string, string> = Object.fromEntries(
    Object.entries(hopper.assets).map(([key, value]) => [key.toUpperCase(), value])
  );

  // Generate the list of assets to display, ensuring all specified tickers are included
  const filteredAssets: [string, string][] = (isAiHopper ? allowedAssetsAi : allowedAssetsBase).map(ticker => {
    return [ticker, assetsMap[ticker] || '0'];
  });

  // Append other relevant assets like EUR for Bitvavo or USD if they exist
  const otherAssets = Object.entries(hopper.assets).filter(([asset]) => {
    const upperAsset = asset.toUpperCase();
    if (upperAsset === 'EUR' && hopper.exchange === 'Bitvavo') {
      return true;
    }
    if (upperAsset === 'USD') {
        return true;
    }
    return false;
  });

  // Prepend other assets to the list to maintain a consistent order
  filteredAssets.unshift(...otherAssets);

  return (
    <div
      className={`rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out transform hover:scale-105
      ${isDarkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'}
      border ${hopper.error ? 'opacity-50' : ''}`}
    >
      <div className="relative aspect-[600/430] bg-gray-200 dark:bg-gray-700">
        <Image
          src={mainImageSrc} // Uses new logic
          alt={hopper.name || hopper.exchange || "Hopper image"}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          priority={false}
          onError={(e) => {
            // Fallback if the local exchange image (e.g., /Smart-DCA-bitvavo.jpg) itself is missing or errors
            e.currentTarget.srcset = '/devil_full_white.png'; // Default fallback image
            e.currentTarget.src = '/devil_full_white.png';
          }}
        />
        {hopper.error && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <p className="text-white text-lg font-semibold">Data Unavailable</p>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-grow mr-2">
            <h3 className={`font-semibold text-lg truncate ${isDarkMode ? 'text-[#e0e0e0]' : 'text-gray-800'}`} title={hopper.name}>
              {hopper.name || "Unnamed Hopper"}
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {hopper.exchange || "Unknown Exchange"}
            </p>
          </div>
          <div className={`text-right flex-shrink-0 ${isDarkMode ? 'text-[#e0e0e0]' : 'text-gray-800'}`}>
            <p className="text-xs font-medium">Total Value</p>
            <p className="text-base font-bold">
              ${formatValue(hopper.total_cur, true)}
            </p>
          </div>
        </div>

        {filteredAssets.length > 0 && !hopper.error && (
          <div className="mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
            <h4 className={`text-xs font-medium mb-2 uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Holdings
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {filteredAssets.map(([asset, amount]) => {
                const upperAsset = asset.toUpperCase();
                return (
                  <div key={asset} className="flex justify-between items-center text-xs">
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mr-2 w-16 truncate`} title={asset}>{upperAsset}</span>
                    <span className={`font-medium ${isDarkMode ? 'text-[#e0e0e0]' : 'text-gray-800'}`}>
                      {formatValue(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {filteredAssets.length === 0 && !hopper.error && (
           <div className="mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
             <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No specified assets held.</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default HopperCard; 