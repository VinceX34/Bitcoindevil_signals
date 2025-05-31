"use client";

import { useEffect, useState } from "react";
import Footer from "../components/Footer";
// import CryptoChart from "../components/CryptoChart"; // Removed Recharts import
import TradingViewWidget from "../components/TradingViewWidget"; // Import the new widget

// Placeholder for API data types - will be refined
interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap_rank: number; // For default selection
  // Add more fields as needed from CoinGecko API
}

// ChartDataPoint interface can be removed if no longer used by other parts

export default function CryptoInsightsPage() {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentThemeIsDark, setCurrentThemeIsDark] = useState(true);

  const [selectedCoin, setSelectedCoin] = useState<CryptoData | null>(null);
  // const [chartData, setChartData] = useState<ChartDataPoint[]>([]); // Removed Recharts state
  // const [loadingChart, setLoadingChart] = useState(false); // Removed Recharts state

  useEffect(() => {
    // Detect theme for styling
    const observer = new MutationObserver(() => {
      setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setCurrentThemeIsDark(document.documentElement.classList.contains('dark')); // Initial check
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchCryptoData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Example: Fetch top 100 cryptocurrencies by market cap, vs_currency in USD
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
        if (!response.ok) {
          throw new Error(`CoinGecko API Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setCryptoData(data);
        if (data.length > 0 && !selectedCoin) {
          // Select the first coin by default if none is selected yet
          // Or a specific one, e.g., Bitcoin, if present
          const defaultCoin = data.find((c: CryptoData) => c.id === 'bitcoin') || data[0];
          setSelectedCoin(defaultCoin);
        }
      } catch (err: any) {
        setError(err.message);
        setCryptoData([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    };

    fetchCryptoData();
  }, []); // Dependency array includes selectedCoin to re-trigger if it changes (but initial load is main goal)

  // Effect for chart data fetching (now for TradingView or can be removed if widget handles its own data)
  // For now, we rely on the widget itself. If we need to pass more specific data, this can be reinstated.
  // useEffect(() => {
  //   if (!selectedCoin) return;
  //   // Logic to prepare data or symbol for TradingView widget if needed
  // }, [selectedCoin]);

  const handleRowClick = (coin: CryptoData) => {
    setSelectedCoin(coin);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-grow p-4 lg:p-8 ${currentThemeIsDark ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-gray-100 text-gray-800'}`}>
        <div className="max-w-7xl mx-auto space-y-8">
          <h1 className="text-3xl font-semibold">
            Crypto Insights
          </h1>
          
          {selectedCoin && (
            <div 
              className={`${currentThemeIsDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'} border rounded-lg shadow-md mb-8 h-[400px] md:h-[500px] lg:h-[600px]`}
            >
              <TradingViewWidget 
                symbol={`${selectedCoin.symbol.toUpperCase()}USD`} 
                theme={currentThemeIsDark ? 'dark' : 'light'} 
              />
            </div>
          )}
          
          <div className={`${currentThemeIsDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'} border rounded-lg shadow-md overflow-hidden`}>
            {loading && <p className="p-4 text-center">Loading market data...</p>}
            {error && <p className="p-4 text-center text-red-500">Error fetching data: {error}</p>}
            {!loading && !error && cryptoData.length > 0 && (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={`${currentThemeIsDark ? 'bg-[#323233]' : 'bg-gray-50'}`}>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${currentThemeIsDark ? 'text-gray-300' : 'text-gray-500'}">#</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${currentThemeIsDark ? 'text-gray-300' : 'text-gray-500'}">Coin</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${currentThemeIsDark ? 'text-gray-300' : 'text-gray-500'}">Price</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${currentThemeIsDark ? 'text-gray-300' : 'text-gray-500'}">24h Change</th>
                    {/* Add more headers like Market Cap, Volume etc. if needed */}
                  </tr>
                </thead>
                <tbody className={`${currentThemeIsDark ? 'bg-[#252526] divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                  {cryptoData.map((coin, index) => (
                    <tr 
                      key={coin.id} 
                      className={`${currentThemeIsDark ? 'hover:bg-[#323233]' : 'hover:bg-gray-50'} cursor-pointer ${selectedCoin?.id === coin.id ? (currentThemeIsDark ? 'bg-[#3a3a3e]': 'bg-gray-100') : ''}`}
                      onClick={() => handleRowClick(coin)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm ${currentThemeIsDark ? 'text-gray-400' : 'text-gray-500'}">{coin.market_cap_rank || index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium ${currentThemeIsDark ? 'text-white' : 'text-gray-900'}">
                        <div className="flex items-center">
                          <img className="h-6 w-6 rounded-full mr-3" src={coin.image} alt={coin.name} />
                          {coin.name} <span className="ml-2 text-xs ${currentThemeIsDark ? 'text-gray-400' : 'text-gray-500'}">{coin.symbol.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm ${currentThemeIsDark ? 'text-gray-300' : 'text-gray-700'}">${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${coin.price_change_percentage_24h >= 0 ? (currentThemeIsDark ? 'text-green-400' : 'text-green-600') : (currentThemeIsDark ? 'text-red-400' : 'text-red-600')}`}>
                        {coin.price_change_percentage_24h.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !error && cryptoData.length === 0 && (
              <p className="p-4 text-center">No data available.</p>
            )}
          </div>

        </div>
      </main>
      <Footer isDarkMode={currentThemeIsDark} />
    </div>
  );
} 