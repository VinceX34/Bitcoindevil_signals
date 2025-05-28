"use client";

import { useEffect, useState } from "react";
import Footer from "./components/Footer";

// Helper function to check cookie (client-side only)
const getInitialAuthState = () => {
  if (typeof window !== 'undefined') {
    // First, check localStorage
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (loggedIn === 'true') {
      return true;
    }
    // Fallback to cookie check
    return document.cookie.split('; ').some(c => c.startsWith('authorized='));
  }
  return false; // Default for server-side rendering
};

export default function HomePage() {
  const [authorized, setAuthorized] = useState(getInitialAuthState());
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
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

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
          <h1 className="text-3xl font-semibold">
            Home Dashboard
          </h1>
          <p>Welcome to your Home Dashboard! Content coming soon.</p>
        </div>
      </main>
      <Footer isDarkMode={currentThemeIsDark} />
    </div>
  );
}
