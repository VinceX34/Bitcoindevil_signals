"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import SignalsDisplay from "../components/SignalsDisplay";
import ForwardedSignalsDisplay from "../components/chsignals";
import QueuedSignalsDisplay from "../components/queued-signals";
import Footer from "../components/Footer";
import type { SimpleTradingViewSignal, ForwardedSignal, QueuedSignal } from "@/lib/db";

// Helper function to check auth state (client-side only)
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

export default function SignalDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  // --- Default Signal States ---
  const [raw, setRaw] = useState<SimpleTradingViewSignal[]>([]);
  const [forwarded, setForwarded] = useState<ForwardedSignal[]>([]);
  const [queued, setQueued] = useState<QueuedSignal[]>([]);
  
  // --- BTC Signal States ---
  const [forwardedBtc, setForwardedBtc] = useState<ForwardedSignal[]>([]);
  const [queuedBtc, setQueuedBtc] = useState<QueuedSignal[]>([]);

  // --- UI States ---
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isRawSignalsOpen, setRawSignalsOpen] = useState(true);
  const [isForwardedSignalsOpen, setForwardedSignalsOpen] = useState(true);
  const [isQueuedSignalsOpen, setQueuedSignalsOpen] = useState(true);
  const [isForwardedBtcSignalsOpen, setForwardedBtcSignalsOpen] = useState(true);
  const [isQueuedBtcSignalsOpen, setQueuedBtcSignalsOpen] = useState(true);
  const [currentThemeIsDark, setCurrentThemeIsDark] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch default signals
      const [rawRes, forwardedRes, queuedRes] = await Promise.all([
        fetch('/api/webhook'),
        fetch('/api/cryptohopper'),
        fetch('/api/queue')
      ]);
      const rawData = await rawRes.json();
      const forwardedData = await forwardedRes.json();
      const queuedData = await queuedRes.json();
      
      // Fetch BTC signals
      const [rawBtcRes, forwardedBtcRes, queuedBtcRes] = await Promise.all([
        fetch('/api/webhook-btc'), // Fetch raw BTC signals
        fetch('/api/cryptohopper-btc'),
        fetch('/api/queue-btc')
      ]);
      const rawBtcData = await rawBtcRes.json();
      const forwardedBtcData = await forwardedBtcRes.json();
      const queuedBtcData = await queuedBtcRes.json();
      
      // Combine and sort raw signals
      let combinedRawSignals: SimpleTradingViewSignal[] = [];
      if (rawData.success) {
        // Add group identifier to default signals
        const defaultRaw = rawData.signals.map((s: SimpleTradingViewSignal) => ({ ...s, signal_group: 'default' }));
        combinedRawSignals = combinedRawSignals.concat(defaultRaw);
      }
      if (rawBtcData.success) {
        // Add group identifier to btc signals
        const btcRaw = rawBtcData.signals.map((s: SimpleTradingViewSignal) => ({ ...s, signal_group: 'btc' }));
        combinedRawSignals = combinedRawSignals.concat(btcRaw);
      }
      combinedRawSignals.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
      
      setRaw(combinedRawSignals);
      if (forwardedData.success) setForwarded(forwardedData.signals);
      if (queuedData.success) setQueued(queuedData.signals);
      if (forwardedBtcData.success) setForwardedBtc(forwardedBtcData.signals);
      if (queuedBtcData.success) setQueuedBtc(queuedBtcData.signals);

    } catch (error) {
      console.error("Failed to fetch signal data:", error);
    }
  };

  useEffect(() => {
    setMounted(true);
    const isAuth = getInitialAuthState();
    setAuthorized(isAuth);
    if (!isAuth) {
      router.push('/');
    } else {
      fetchData();
    }
  }, [router]);
  
  useEffect(() => {
    if (!authorized) return;
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [authorized]);

  useEffect(() => {
    const observer = new MutationObserver(() => setCurrentThemeIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  const handleProcessQueue = async (group: 'default' | 'btc') => {
    setIsProcessingQueue(true);
    const url = group === 'btc' ? '/api/worker/process-ch-queue-btc' : '/api/worker/process-ch-queue';
    try {
      await fetch(url);
      await fetchData(); // Refresh data after processing
    } catch (error) {
      console.error(`Error processing ${group} queue:`, error);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const createDeleteHandler = (apiPath: string) => async () => {
    if (!confirm(`Are you sure you want to delete all signals from ${apiPath}?`)) return;
    await fetch(apiPath, { method: 'DELETE' });
    await fetchData();
  };

  const deleteAllRawSignals = async () => {
    if (!confirm(`Are you sure you want to delete ALL raw signals from BOTH groups?`)) return;
    await Promise.all([
      fetch('/api/webhook/delete', { method: 'DELETE' }),
      fetch('/api/webhook-btc', { method: 'DELETE' })
    ]);
    await fetchData();
  }

  if (!mounted || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading & checking authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-grow p-4 lg:p-8 ${currentThemeIsDark ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-gray-100 text-gray-800'}`}>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-3xl font-semibold">Signal Dashboard</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => handleProcessQueue('default')} disabled={isProcessingQueue}>Process Default Queue</button>
              <button onClick={() => handleProcessQueue('btc')} disabled={isProcessingQueue}>Process BTC Queue</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column for Default Signals */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">Default Signal Group</h2>
              <ForwardedSignalsDisplay
                signals={forwarded}
                isOpen={isForwardedSignalsOpen}
                onToggle={() => setForwardedSignalsOpen(!isForwardedSignalsOpen)}
                onDelete={createDeleteHandler('/api/cryptohopper/delete')}
                isDarkMode={currentThemeIsDark}
              />
              <QueuedSignalsDisplay
                signals={queued}
                isOpen={isQueuedSignalsOpen}
                onToggle={() => setQueuedSignalsOpen(!isQueuedSignalsOpen)}
                onDelete={createDeleteHandler('/api/queue/delete')}
                isDarkMode={currentThemeIsDark}
              />
            </div>

            {/* Column for BTC Signals */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">BTC Signal Group</h2>
              <ForwardedSignalsDisplay
                signals={forwardedBtc}
                title="Forwarded Signals (BTC Group)"
                headerColor="bg-orange-600" // New orange color!
                isOpen={isForwardedBtcSignalsOpen}
                onToggle={() => setForwardedBtcSignalsOpen(!isForwardedBtcSignalsOpen)}
                onDelete={createDeleteHandler('/api/cryptohopper-btc/delete')}
                isDarkMode={currentThemeIsDark}
              />
              <QueuedSignalsDisplay
                signals={queuedBtc}
                title="Queued Signals (BTC Group)"
                isOpen={isQueuedBtcSignalsOpen}
                onToggle={() => setQueuedBtcSignalsOpen(!isQueuedBtcSignalsOpen)}
                onDelete={createDeleteHandler('/api/queue-btc')}
                isDarkMode={currentThemeIsDark}
              />
            </div>
          </div>

          <SignalsDisplay
            signals={raw}
            isOpen={isRawSignalsOpen}
            onToggle={() => setRawSignalsOpen(!isRawSignalsOpen)}
            onDelete={deleteAllRawSignals}
            isDarkMode={currentThemeIsDark}
          />
        </div>
      </main>
      <Footer isDarkMode={currentThemeIsDark} />
    </div>
  );
} 