"use client";

import { useEffect, useState } from "react";
import SignalsDisplay from "./components/SignalsDisplay";
import ForwardedSignalsDisplay from "./components/chsignals";
import QueuedSignalsDisplay from "./components/queued-signals";
import type { SimpleTradingViewSignal, ForwardedSignal, QueuedSignal } from "@/lib/db";

export default function HomePage() {
  /* ------------------------------------------------------------------
   *  STATE
   * ------------------------------------------------------------------*/
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const [isRawSignalsOpen, setIsRawSignalsOpen] = useState(true);
  const [isForwardedSignalsOpen, setIsForwardedSignalsOpen] = useState(true);
  const [isQueuedSignalsOpen, setIsQueuedSignalsOpen] = useState(true);

  const [raw, setRaw] = useState<SimpleTradingViewSignal[]>([]);
  const [forwarded, setForwarded] = useState<ForwardedSignal[]>([]);
  const [queued, setQueued] = useState<QueuedSignal[]>([]);

  const handleRawSignalsDelete = () => {
    setRaw([]);
  };

  const handleForwardedSignalsDelete = () => {
    setForwarded([]);
  };

  const handleQueuedSignalsDelete = () => {
    setQueued([]);
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const response = await fetch('/api/worker/process-ch-queue');
      const data = await response.json();
      if (data.success) {
        // Refresh the data after processing
        const [r1, r2, r3] = await Promise.all([
          fetch("/api/webhook").then((r) => r.json()),
          fetch("/api/cryptohopper").then((r) => r.json()),
          fetch("/api/queue").then((r) => r.json()),
        ]);
        if (r1.success) setRaw(r1.signals);
        if (r2.success) setForwarded(r2.signals);
        if (r3.success) setQueued(r3.signals);
      } else {
        alert('Failed to process queue: ' + (data.error || 'Unknown error'));
      }
    } catch {
      console.error('Error processing queue');
      alert('Error processing queue. Check console for details.');
    } finally {
      setIsProcessingQueue(false);
    }
  };

  /* ------------------------------------------------------------------
   *  AUTHENTICATION CHECK (runs once on mount)
   * ------------------------------------------------------------------*/
  useEffect(() => {
    const isAuthorized = document.cookie
      .split("; ")
      .some((c) => c.startsWith("authorized="));

    setAuthorized(isAuthorized);
  }, []);

  /* ------------------------------------------------------------------
   *  PASSWORD SUBMIT HANDLER
   * ------------------------------------------------------------------*/
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (data.success) {
        setAuthorized(true);
      } else {
        setError("Invalid password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  /* ------------------------------------------------------------------
   *  DATA FETCHING (only when authorized)
   * ------------------------------------------------------------------*/
  useEffect(() => {
    if (!authorized) return;

    const load = async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch("/api/webhook").then((r) => r.json()),
          fetch("/api/cryptohopper").then((r) => r.json()),
          fetch("/api/queue").then((r) => r.json()),
        ]);
        if (r1.success) setRaw(r1.signals);
        if (r2.success) setForwarded(r2.signals);
        if (r3.success) setQueued(r3.signals);
      } catch {
        /* swallow errors silently or log */
      }
    };

    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [authorized]);

  const toggleRawSignals = () => {
    setIsRawSignalsOpen(!isRawSignalsOpen);
  };

  const toggleForwardedSignals = () => {
    setIsForwardedSignalsOpen(!isForwardedSignalsOpen);
  };

  const toggleQueuedSignals = () => {
    setIsQueuedSignalsOpen(!isQueuedSignalsOpen);
  };

  /* ------------------------------------------------------------------
   *  RENDER
   * ------------------------------------------------------------------*/
  if (!authorized) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-gray-100'} p-4`}>
        <div className={`${isDarkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'} p-8 rounded-md shadow-2xl w-full max-w-md space-y-6 border`}>
          <div className="flex justify-between items-center">
            <h1 className={`text-2xl font-medium ${isDarkMode ? 'text-[#cccccc]' : 'text-gray-800'}`}>
              Password Required
            </h1>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle theme"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${isDarkMode ? 'text-[#cccccc] bg-[#3c3c3c] hover:bg-[#4f4f4f]' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}
            >
              {isDarkMode ? 'Light' : 'Dark'}
            </button>
          </div>
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
                    isDarkMode 
                      ? 'border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc] placeholder-[#808080]' 
                      : 'border-gray-300 bg-white text-gray-800 placeholder-gray-400'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 px-3 flex items-center text-sm ${
                    isDarkMode ? 'text-[#cccccc] hover:text-white' : 'text-gray-600 hover:text-gray-800'
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
    <main className={`min-h-screen ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-gray-100'} p-4 sm:p-6 lg:p-8`}>
      <div className="max-w-4xl mx-auto">
        <header className={`flex justify-between items-center mb-8 p-4 rounded-md shadow-md ${isDarkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'} border`}>
          <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-[#cccccc]' : 'text-gray-800'}`}>Signal Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleProcessQueue}
              disabled={isProcessingQueue}
              title="Process Queue"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                isDarkMode 
                  ? 'text-[#cccccc] bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c]' 
                  : 'text-white bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessingQueue ? 'Processing...' : 'Process Queue'}
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle theme"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${isDarkMode ? 'text-[#cccccc] bg-[#3c3c3c] hover:bg-[#4f4f4f]' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}
            >
              {isDarkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>

        <div className="space-y-8">
          <SignalsDisplay
            signals={raw}
            title="TradingView Signals"
            isOpen={isRawSignalsOpen}
            onToggle={toggleRawSignals}
            onDelete={handleRawSignalsDelete}
            isDarkMode={isDarkMode}
          />
          <ForwardedSignalsDisplay
            signals={forwarded}
            title="Forwarded Signals"
            isOpen={isForwardedSignalsOpen}
            onToggle={toggleForwardedSignals}
            onDelete={handleForwardedSignalsDelete}
            isDarkMode={isDarkMode}
          />
          <QueuedSignalsDisplay
            signals={queued}
            title="Queued Signals"
            isOpen={isQueuedSignalsOpen}
            onToggle={toggleQueuedSignals}
            onDelete={handleQueuedSignalsDelete}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </main>
  );
}
