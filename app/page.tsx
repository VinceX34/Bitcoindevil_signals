"use client";

import { useEffect, useState } from "react";
import SignalsDisplay from "./components/SignalsDisplay";
import ForwardedSignalsDisplay from "./components/chsignals";
import type { SimpleTradingViewSignal, ForwardedSignal } from "@/lib/db";

export default function HomePage() {
  /* ------------------------------------------------------------------
   *  STATE
   * ------------------------------------------------------------------*/
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");

  const [isRawSignalsOpen, setIsRawSignalsOpen] = useState(true);
  const [isForwardedSignalsOpen, setIsForwardedSignalsOpen] = useState(true);

  const [raw, setRaw] = useState<SimpleTradingViewSignal[]>([]);
  const [forwarded, setForwarded] = useState<ForwardedSignal[]>([]);

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
        const [r1, r2] = await Promise.all([
          fetch("/api/webhook").then((r) => r.json()),
          fetch("/api/cryptohopper").then((r) => r.json()),
        ]);
        if (r1.success) setRaw(r1.signals);
        if (r2.success) setForwarded(r2.signals);
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

  /* ------------------------------------------------------------------
   *  RENDER
   * ------------------------------------------------------------------*/
  if (!authorized) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6">
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
            Wachtwoord Vereist
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="passwordInput" className="sr-only">Wachtwoord</label>
              <input
                id="passwordInput"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Typ uw wachtwoord"
                className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-black dark:text-white font-semibold py-3 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Verstuur
            </button>
          </form>
          {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
      <SignalsDisplay
        signals={raw}
        title="TradingView Signals"
        isOpen={isRawSignalsOpen}
        onToggle={toggleRawSignals}
        className="max-w-3xl mx-auto"
      />
      <ForwardedSignalsDisplay
        signals={forwarded}
        isOpen={isForwardedSignalsOpen}
        onToggle={toggleForwardedSignals}
        className="max-w-3xl mx-auto"
      />
    </main>
  );
}
