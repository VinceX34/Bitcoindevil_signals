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
const PLACEHOLDER_HOPPERS = [
  { id: '1403066', name: 'Loading...', exchange: 'Bitvavo', total_cur: '0', error: true, assets: {}, image: null },
  { id: '1506523', name: 'Loading...', exchange: 'Bybit', total_cur: '0', error: true, assets: {}, image: null },
  { id: '1455342', name: 'Loading...', exchange: 'Kucoin', total_cur: '0', error: true, assets: {}, image: null },
  { id: '1790517', name: 'Loading...', exchange: 'Kraken', total_cur: '0', error: true, assets: {}, image: null },
  { id: '1808770', name: 'Loading...', exchange: 'Crypto.com', total_cur: '0', error: true, assets: {}, image: null },
  { id: '1817774', name: 'Loading...', exchange: 'Coinbase', total_cur: '0', error: true, assets: {}, image: null },
];

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

  // useEffect(() => {
  //   // This effect now primarily handles cases where the cookie might change 
  //   // after initial load (e.g., logout elsewhere, cookie expiration if not handled by page reload)
  //   // or to ensure consistency if the initial sync check had issues.
  //   const isAuthorizedCookie = document.cookie.split('; ').some(c => c.startsWith('authorized='));
  //   if (isAuthorizedCookie !== authorized) {
  //       setAuthorized(isAuthorizedCookie);
  //   }
  // }, [authorized]); // Re-run if authorized state changes, or periodically if needed

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
  
  const [currentThemeIsDark, setCurrentThemeIsDark] = useState(true);

  // NEW: state for Hopper data
  const [hoppers, setHoppers] = useState<any[]>(PLACEHOLDER_HOPPERS);
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
        processedHoppers = PLACEHOLDER_HOPPERS.map((ph) => fetched.find((h: any) => h.id === ph.id) || { ...ph, name: `${ph.exchange} (Error)`, error: true });
        setHoppers(processedHoppers);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hopperData', JSON.stringify(processedHoppers));
          localStorage.setItem('hopperDataTimestamp', Date.now().toString());
        }
      } else {
        const fetched = data.hoppers || [];
        // Even on error, try to use any partial data returned, or stick to placeholders if API error
        processedHoppers = PLACEHOLDER_HOPPERS.map((ph) => fetched.find((h: any) => h.id === ph.id) || { ...ph, name: `${ph.exchange} (Load Failed)`, error: true });
        setHoppers(processedHoppers);
        setHopperError(data.error || 'Failed to load hopper data.');
        // Optionally, clear local storage on API error so next load attempts fresh fetch
        // if (typeof window !== 'undefined') {
        //   localStorage.removeItem('hopperData');
        //   localStorage.removeItem('hopperDataTimestamp');
        // }
      }
    } catch (e: any) {
      console.error('Error fetching hoppers:', e);
      setHopperError(e?.message || 'Unknown error fetching data.');
      // On catch, show placeholders, don't clear cache as it might be a temporary network issue
      setHoppers(PLACEHOLDER_HOPPERS.map(ph => ({ ...ph, name: `${ph.exchange} (Network Error)`, error: true })));
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
      // const cachedTimestamp = localStorage.getItem('hopperDataTimestamp'); // Could use for expiry later

      if (cachedHoppers) {
        try {
          const parsedHoppers = JSON.parse(cachedHoppers);
          // Basic validation: ensure it's an array and has expected structure (e.g., 6 items)
          if (Array.isArray(parsedHoppers) && parsedHoppers.length === PLACEHOLDER_HOPPERS.length) {
            setHoppers(parsedHoppers);
            console.log('Loaded hoppers from cache');
            setInitialHopperLoadAttempted(true); // Mark initial load from cache as attempted
            setLoadingHoppers(false); // Ensure loading is false if loaded from cache
            return; // Loaded from cache, no need to fetch initially
          }
        } catch (e) {
          console.error('Error parsing cached hopper data:', e);
          localStorage.removeItem('hopperData'); // Clear corrupted cache
          localStorage.removeItem('hopperDataTimestamp');
        }
      }
    }
    // If no valid cache, or if it's the first authorized load and initialHopperLoadAttempted is still false
    if (!initialHopperLoadAttempted) {
        console.log('No valid cache or first load, fetching hoppers...');
        fetchHoppers(); // Pass false or no arg for initial load
    }

  }, [mounted, authorized, initialHopperLoadAttempted]); // Add initialHopperLoadAttempted to dependencies

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  // Calculate total value from all hoppers
  const totalValue = hoppers.reduce((sum, hopper) => {
    const value = Number(hopper.total_cur) || 0;
    return sum + value;
  }, 0);

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
          {!loadingHoppers && hoppers.length > 0 && !hoppers.every(h => h.error) && (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hoppers.map((hopper) => (
              <HopperCard key={hopper.id} hopper={hopper} isDarkMode={currentThemeIsDark} />
            ))}
          </div>
        </div>
      </main>
      <Footer isDarkMode={currentThemeIsDark} />
    </div>
  );
}
