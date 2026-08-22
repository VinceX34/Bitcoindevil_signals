"use client";

import Image from 'next/image';

export interface Trading212Position {
  ticker: string;
  name: string;
  quantity: number;
  currentValue: number;
}

export interface Trading212Data {
  success: boolean;
  currency: string;
  totalValue: number;
  totalValueUsd: number;
  cash: {
    availableToTrade: number;
    inPies: number;
    reservedForOrders: number;
  };
  positions: Trading212Position[];
  error?: string | null;
}

interface Props {
  data: Trading212Data | null;
  loading: boolean;
  isDarkMode: boolean;
}

const formatMoney = (value: number, currency = 'USD') => {
  if (!Number.isFinite(value)) return '0.00';
  try {
    return value.toLocaleString(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const formatQuantity = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
};

const shortTicker = (ticker: string) => ticker.replace(/_EQ$/, '').replace(/_/g, ' ');

const Trading212Card: React.FC<Props> = ({ data, loading, isDarkMode }) => {
  const hasError = Boolean(data?.error) || (data !== null && !data.success);
  const currency = data?.currency || 'EUR';
  const mainPot = data?.cash.availableToTrade || 0;

  return (
    <div
      className={`rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out transform hover:scale-105
      ${isDarkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'}
      border ${hasError ? 'opacity-50' : ''}`}
    >
      <div className="relative aspect-[600/430] bg-gray-200 dark:bg-gray-700">
        <Image
          src="/Trading212.png"
          alt="Trading 212"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          priority={false}
          onError={(e) => {
            e.currentTarget.srcset = '/devil_full_white.png';
            e.currentTarget.src = '/devil_full_white.png';
          }}
        />
        {hasError && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
            <p className="text-white text-sm font-semibold text-center">
              {data?.error || 'Data Unavailable'}
            </p>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-grow mr-2">
            <h3 className={`font-semibold text-lg truncate ${isDarkMode ? 'text-[#e0e0e0]' : 'text-gray-800'}`}>
              {loading ? 'Loading...' : 'Trading 212'}
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Invest account
            </p>
          </div>
          <div className={`text-right flex-shrink-0 ${isDarkMode ? 'text-[#e0e0e0]' : 'text-gray-800'}`}>
            <p className="text-xs font-medium">Total Value</p>
            <p className="text-base font-bold">
              {formatMoney(data?.totalValue || 0, currency)}
            </p>
          </div>
        </div>

        {!hasError && (
          <div className={`mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h4 className={`text-xs font-medium mb-2 uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Holdings
            </h4>
            {(data?.positions.length || 0) === 0 && mainPot === 0 ? (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {loading ? 'Loading holdings...' : 'No open positions.'}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {mainPot > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mr-2 truncate`} title="Main pot">
                      CASH
                    </span>
                    <span className={`font-medium ${isDarkMode ? 'text-[#e0e0e0]' : 'text-gray-800'}`}>
                      {formatMoney(mainPot, currency)}
                    </span>
                  </div>
                )}
                {(data?.positions || []).map((position) => (
                  <div key={position.ticker} className="flex justify-between items-center text-xs gap-2">
                    <span
                      className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} truncate`}
                      title={`${position.name} (${formatQuantity(position.quantity)})`}
                    >
                      {shortTicker(position.ticker)}
                    </span>
                    <span className={`font-medium flex-shrink-0 ${isDarkMode ? 'text-[#e0e0e0]' : 'text-gray-800'}`}>
                      {formatMoney(position.currentValue, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trading212Card;
