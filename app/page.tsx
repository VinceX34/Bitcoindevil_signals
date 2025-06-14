"use client";

import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import HopperCard from "./components/HopperCard";
import TotalValueGraph from "./components/TotalValueGraph";
import WealthHistoryGraph from "./components/WealthHistoryGraph";

// Helper to check auth client-side only (used inside a useEffect)
const determineClientAuth = (): boolean => {
  // Check localStorage first
  const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (loggedIn) return true;
  // Fallback to cookie check
  return document.cookie.split('; ').some(c => c.startsWith('authorized='));
};

// Placeholder hopper objects to ensure stable SSR markup
const PLACEHOLDER_HOPPERS = {
  default: [
    { id: '1403066', name: 'Loading...', exchange: 'Bitvavo', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1506523', name: 'Loading...', exchange: 'Bybit', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1455342', name: 'Loading...', exchange: 'Kucoin', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1790517', name: 'Loading...', exchange: 'Kraken', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1808770', name: 'Loading...', exchange: 'Crypto.com', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1817774', name: 'Loading...', exchange: 'Coinbase', total_cur: '0', error: true, assets: {}, image: null },
  ],
  btc: [
    { id: '1989465', name: 'Loading...', exchange: 'Coinbase - EUR', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1989473', name: 'Loading...', exchange: 'Coinbase - USDC', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1989528', name: 'Loading...', exchange: 'Bybit - USDC', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1989545', name: 'Loading...', exchange: 'Kucoin - USDC', total_cur: '0', error: true, assets: {}, image: null },
  ],
  ai: [
    { id: '1992610', name: 'Loading...', exchange: 'Bybit', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1992607', name: 'Loading...', exchange: 'Kucoin', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1992597', name: 'Loading...', exchange: 'Coinbase - EUR', total_cur: '0', error: true, assets: {}, image: null },
    { id: '1992599', name: 'Loading...', exchange: 'Coinbase - USDC', total_cur: '0', error: true, assets: {}, image: null },
  ]
};

export default function HomePage() {
  // Always start unauthorized to keep server & client markup identical during hydration
  const [authorized, setAuthorized] = useState(false);
  // Track mounting to avoid code that relies on 'window' during SSR
  const [mounted, setMounted] = useState(false);

  // After mount, determine real auth status
  useEffect(() => {
    setMounted(true);
    setAuthorized(determineClientAuth());
  }, []);

  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentThemeIsDark, setCurrentThemeIsDark] = useState(true);

  // State for Hopper data
  const [hoppers, setHoppers] = useState<{
    default: any[];
    btc: any[];
    ai: any[];
  }>(PLACEHOLDER_HOPPERS);
  const [loadingHoppers, setLoadingHoppers] = useState(false);
  const [hopperError, setHopperError] = useState<string | null>(null);
  const [initialHopperLoadAttempted, setInitialHopperLoadAttempted] = useState(false);

  // Fetch hopper data
  const fetchHoppers = async (isManualRefresh = false) => {
    if (!isManualRefresh && loadingHoppers) return; // Prevent multiple auto-fetches if already loading
    setLoadingHoppers(true);
    setHopperError(null);
    try {
      const res = await fetch('/api/hoppers');
      const data = await res.json();
      let processedHoppers = PLACEHOLDER_HOPPERS;
      if (data.success) {
        const fetched = data.hoppers || [];
        processedHoppers = {
          default: PLACEHOLDER_HOPPERS.default.map((ph) => 
            fetched.find((h: any) => h.id === ph.id && h.group === 'default') || 
            { ...ph, name: `${ph.exchange} (Error)`, error: true }
          ),
          btc: PLACEHOLDER_HOPPERS.btc.map((ph) => 
            fetched.find((h: any) => h.id === ph.id && h.group === 'btc') || 
            { ...ph, name: `${ph.exchange} (Error)`, error: true }
          ),
          ai: PLACEHOLDER_HOPPERS.ai.map((ph) => 
            fetched.find((h: any) => h.id === ph.id && h.group === 'ai') || 
            { ...ph, name: `${ph.exchange} (Error)`, error: true }
          )
        };
        setHoppers(processedHoppers);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hopperData', JSON.stringify(processedHoppers));
          localStorage.setItem('hopperDataTimestamp', Date.now().toString());
        }
      } else {
        const fetched = data.hoppers || [];
        processedHoppers = {
          default: PLACEHOLDER_HOPPERS.default.map((ph) => 
            fetched.find((h: any) => h.id === ph.id && h.group === 'default') || 
            { ...ph, name: `${ph.exchange} (Load Failed)`, error: true }
          ),
          btc: PLACEHOLDER_HOPPERS.btc.map((ph) => 
            fetched.find((h: any) => h.id === ph.id && h.group === 'btc') || 
            { ...ph, name: `${ph.exchange} (Load Failed)`, error: true }
          ),
          ai: PLACEHOLDER_HOPPERS.ai.map((ph) => 
            fetched.find((h: any) => h.id === ph.id && h.group === 'ai') || 
            { ...ph, name: `${ph.exchange} (Load Failed)`, error: true }
          )
        };
        setHoppers(processedHoppers);
        setHopperError(data.error || 'Failed to load hopper data.');
      }
    } catch (e: any) {
      console.error('Error fetching hoppers:', e);
      setHopperError(e?.message || 'Unknown error fetching data.');
      setHoppers({
        default: PLACEHOLDER_HOPPERS.default.map(ph => ({ ...ph, name: `${ph.exchange} (Network Error)`, error: true })),
        btc: PLACEHOLDER_HOPPERS.btc.map(ph => ({ ...ph, name: `${ph.exchange} (Network Error)`, error: true })),
        ai: PLACEHOLDER_HOPPERS.ai.map(ph => ({ ...ph, name: `${ph.exchange} (Network Error)`, error: true }))
      });
    } finally {
      setLoadingHoppers(false);
      if (!initialHopperLoadAttempted) {
        setInitialHopperLoadAttempted(true);
      }
    }
  };

  // Effect for initial data load and handling authorization changes
  useEffect(() => {
    if (!mounted || !authorized || initialHopperLoadAttempted) return;

    if (typeof window !== 'undefined') {
      const cachedHoppers = localStorage.getItem('hopperData');
      if (cachedHoppers) {
        try {
          const parsedHoppers = JSON.parse(cachedHoppers);
          if (parsedHoppers && parsedHoppers.default && parsedHoppers.btc && parsedHoppers.ai) {
            setHoppers(parsedHoppers);
            console.log('Loaded hoppers from cache');
            setInitialHopperLoadAttempted(true);
            setLoadingHoppers(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing cached hopper data:', e);
          localStorage.removeItem('hopperData');
          localStorage.removeItem('hopperDataTimestamp');
        }
      }
    }
    if (!initialHopperLoadAttempted) {
      console.log('No valid cache or first load, fetching hoppers...');
      fetchHoppers();
    }
  }, [mounted, authorized, initialHopperLoadAttempted]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  // Calculate total value from all hoppers
  const totalValue = Object.values(hoppers).flat().reduce((sum, hopper) => {
    const value = Number(hopper.total_cur) || 0;
    return sum + value;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      console.log('Attempting login...');
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      console.log('Login response:', data);
      if (data.success) {
        setAuthorized(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('isLoggedIn', 'true'); // Set flag in localStorage
        }
      } else {
        setError(data.error || "Invalid password. Please try again.");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("Something went wrong. Please try again.");
    }
  };

  if (!authorized) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center ${currentThemeIsDark ? 'bg-[#1e1e1e]' : 'bg-gray-100'} p-4`}>
        <div className={`${currentThemeIsDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'} p-8 rounded-md shadow-2xl w-full max-w-md space-y-6 border`}>
          <h1 className={`text-2xl font-medium text-center ${currentThemeIsDark ? 'text-[#cccccc]' : 'text-gray-800'}`}>
            Password Required
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="passwordInput" className="sr-only">Password</label>
              <div className="relative">
                <input
                  id="passwordInput"
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your password"
                  className={`border p-3 w-full rounded focus:ring-1 focus:ring-[#007acc] focus:border-[#007acc] outline-none pr-10 ${
                    currentThemeIsDark 
                      ? 'border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc] placeholder-[#808080]' 
                      : 'border-gray-300 bg-white text-gray-800 placeholder-gray-400'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 px-3 flex items-center text-sm ${
                    currentThemeIsDark ? 'text-[#cccccc] hover:text-white' : 'text-gray-600 hover:text-gray-800'
                  }`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-[#0e639c] hover:bg-[#1177bb] text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-1 focus:ring-[#007acc]"
            >
              Submit
            </button>
          </form>
          {error && <p className="text-[#f48771] text-sm text-center">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-grow p-4 lg:p-8 ${currentThemeIsDark ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-gray-100 text-gray-800'}`}>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold">
              Home Dashboard
            </h1>
            <button
              onClick={() => fetchHoppers(true)}
              disabled={loadingHoppers}
              className={`px-4 py-2 rounded-md font-medium ${
                currentThemeIsDark
                  ? 'bg-[#0e639c] hover:bg-[#1177bb] text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loadingHoppers ? 'Refreshing...' : 'Refresh Stats'}
            </button>
          </div>

          {/* Display Total Portfolio Value from loaded hoppers */}
          {!loadingHoppers && Object.values(hoppers).flat().length > 0 && !Object.values(hoppers).flat().every(h => h.error) && (
            <div className={`mt-2 mb-4 p-4 rounded-md shadow ${currentThemeIsDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'} border`}>
              <p className={`text-xl font-semibold ${currentThemeIsDark ? 'text-gray-200' : 'text-gray-800'}`}>
                Current portfolio value: 
                <span className={`${currentThemeIsDark ? 'text-sky-400' : 'text-sky-600'}`}>
                  ${totalValue.toFixed(2)}
                </span>
              </p>
            </div>
          )}
          
          {hopperError && (
            <div className={`p-4 rounded-md ${
              currentThemeIsDark ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
            }`}>
              {hopperError}
            </div>
          )}

          {/* Total Value Graph */}
          <WealthHistoryGraph isDarkMode={currentThemeIsDark} />

          {/* Default Pipeline Hoppers */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">Default Pipeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hoppers.default.map((hopper) => (
                <HopperCard key={hopper.id} hopper={hopper} isDarkMode={currentThemeIsDark} />
              ))}
            </div>
          </div>

          {/* BTC Pipeline Hoppers */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">BTC Pipeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hoppers.btc.map((hopper) => (
                <HopperCard key={hopper.id} hopper={hopper} isDarkMode={currentThemeIsDark} />
              ))}
            </div>
          </div>

          {/* AI Pipeline Hoppers */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">AI Pipeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hoppers.ai.map((hopper) => (
                <HopperCard key={hopper.id} hopper={hopper} isDarkMode={currentThemeIsDark} />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer isDarkMode={currentThemeIsDark} />
    </div>
  );
}
