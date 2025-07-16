"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  const [signals, setSignals] = useState<any[]>([]);
  const [forwardedSignals, setForwardedSignals] = useState<any[]>([]);
  const [queuedSignals, setQueuedSignals] = useState<any[]>([]);
  const [forwardedSignalsBtc, setForwardedSignalsBtc] = useState<any[]>([]);
  const [queuedSignalsBtc, setQueuedSignalsBtc] = useState<any[]>([]);
  const [forwardedSignalsAi, setForwardedSignalsAi] = useState<any[]>([]);
  const [queuedSignalsAi, setQueuedSignalsAi] = useState<any[]>([]);

  // --- UI States ---
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isRawSignalsOpen, setRawSignalsOpen] = useState(true);
  const [isForwardedSignalsOpen, setForwardedSignalsOpen] = useState(true);
  const [isQueuedSignalsOpen, setQueuedSignalsOpen] = useState(true);
  const [isForwardedBtcSignalsOpen, setForwardedBtcSignalsOpen] = useState(true);
  const [isQueuedBtcSignalsOpen, setQueuedBtcSignalsOpen] = useState(true);
  const [isForwardedAiSignalsOpen, setForwardedAiSignalsOpen] = useState(true);
  const [isQueuedAiSignalsOpen, setQueuedAiSignalsOpen] = useState(true);
  const [currentThemeIsDark, setCurrentThemeIsDark] = useState(true);

  // Functie om de data op te halen
  const fetchData = useCallback(async () => {
    try {
      // Gebruik Promise.all om alle fetches parallel uit te voeren
      const [
        signalsRes,
        queuedRes,
        queuedBtcRes,
        queuedAiRes,
        forwardedRes,
        forwardedBtcRes,
        forwardedAiRes
      ] = await Promise.all([
        fetch('/api/webhook?limit=50'), // Fetches raw signals from all groups
        fetch('/api/queue'),
        fetch('/api/queue-btc'),
        fetch('/api/queue-ai'),
        fetch('/api/forwarded'),
        fetch('/api/forwarded-btc'),
        fetch('/api/forwarded-ai'),
      ]);

      const signalsData = await signalsRes.json();
      const queuedData = await queuedRes.json();
      const queuedBtcData = await queuedBtcRes.json();
      const queuedAiData = await queuedAiRes.json();
      const forwardedData = await forwardedRes.json();
      const forwardedBtcData = await forwardedBtcRes.json();
      const forwardedAiData = await forwardedAiRes.json();
      
      // De 'raw' signals worden nu al gecombineerd door de backend, maar we moeten ze sorteren
      if (signalsData.success) {
        signalsData.signals.sort((a:any, b:any) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
        setSignals(signalsData.signals);
      }
      
      if (queuedData.success) setQueuedSignals(queuedData.signals.reverse());
      if (queuedBtcData.success) setQueuedSignalsBtc(queuedBtcData.signals.reverse());
      if (queuedAiData.success) setQueuedSignalsAi(queuedAiData.signals.reverse());
      if (forwardedData.success) setForwardedSignals(forwardedData.signals.reverse());
      if (forwardedBtcData.success) setForwardedSignalsBtc(forwardedBtcData.signals.reverse());
      if (forwardedAiData.success) setForwardedSignalsAi(forwardedAiData.signals.reverse());

    } catch (error) {
      console.error("Failed to fetch signal data:", error);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const isAuth = getInitialAuthState();
    setAuthorized(isAuth);
    if (!isAuth) {
      router.push('/');
    } else {
      fetchData();
    }
  }, [router, fetchData]);
  
  useEffect(() => {
    if (!authorized) return;
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [authorized, fetchData]);

  useEffect(() => {
    const observer = new MutationObserver(() => setCurrentThemeIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setCurrentThemeIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  const handleProcessQueue = async (group: 'default' | 'btc' | 'ai') => {
    setIsProcessingQueue(true);
    const url = group === 'btc' ? '/api/worker/process-ch-queue-btc'
                : group === 'ai' ? '/api/worker/process-ch-queue-ai'
                : '/api/worker/process-ch-queue';
    try {
      await fetch(url);
      await fetchData(); // Refresh data after processing
    } catch (error) {
      console.error(`Error processing ${group} queue:`, error);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const createDeleteHandler = useCallback((endpoint: string) => async () => {
    if (!confirm('Are you sure you want to delete all signals in this group? This cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('All signals in this group have been deleted.');
        fetchData(); // Refresh data after deletion
      } else {
        alert(`Failed to delete signals: ${data.error}`);
      }
    } catch (error) {
      console.error('Deletion failed:', error);
      alert('An error occurred while deleting signals.');
    }
  }, [fetchData]);

  const deleteAllRawHandler = useMemo(
    () => createDeleteHandler('/api/webhook/delete'),
    [createDeleteHandler]
  );
  const deleteQueuedHandler = useMemo(
    () => createDeleteHandler('/api/queue/delete'),
    [createDeleteHandler]
  );
  const deleteQueuedBtcHandler = useMemo(
    () => createDeleteHandler('/api/queue-btc/delete'),
    [createDeleteHandler]
  );
  const deleteQueuedAiHandler = useMemo(
    () => createDeleteHandler('/api/queue-ai/delete'),
    [createDeleteHandler]
  );
  const deleteForwardedHandler = useMemo(
    () => createDeleteHandler('/api/forwarded/delete'),
    [createDeleteHandler]
  );
  const deleteForwardedBtcHandler = useMemo(
    () => createDeleteHandler('/api/forwarded-btc/delete'),
    [createDeleteHandler]
  );
  const deleteForwardedAiHandler = useMemo(
    () => createDeleteHandler('/api/forwarded-ai/delete'),
    [createDeleteHandler]
  );

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
              <button onClick={() => handleProcessQueue('ai')} disabled={isProcessingQueue}>Process AI Queue</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Column for Default Signals */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">Default Signal Group</h2>
              <ForwardedSignalsDisplay
                signals={forwardedSignals}
                onDelete={deleteForwardedHandler}
                isDarkMode={currentThemeIsDark}
                isOpen={isForwardedSignalsOpen}
                onToggle={() => setForwardedSignalsOpen(!isForwardedSignalsOpen)}
              />
              <QueuedSignalsDisplay
                signals={queuedSignals}
                isOpen={isQueuedSignalsOpen}
                onToggle={() => setQueuedSignalsOpen(!isQueuedSignalsOpen)}
                onDelete={deleteQueuedHandler}
                isDarkMode={currentThemeIsDark}
              />
            </div>

            {/* Column for BTC Signals */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">BTC Signal Group</h2>
              <ForwardedSignalsDisplay
                title="Forwarded Signals (BTC Group)"
                headerColor="bg-orange-600"
                signals={forwardedSignalsBtc}
                onDelete={deleteForwardedBtcHandler}
                isDarkMode={currentThemeIsDark}
                isOpen={isForwardedBtcSignalsOpen}
                onToggle={() => setForwardedBtcSignalsOpen(!isForwardedBtcSignalsOpen)}
              />
              <QueuedSignalsDisplay
                signals={queuedSignalsBtc}
                title="Queued Signals (BTC Group)"
                headerColor="bg-orange-600"
                isOpen={isQueuedBtcSignalsOpen}
                onToggle={() => setQueuedBtcSignalsOpen(!isQueuedBtcSignalsOpen)}
                onDelete={deleteQueuedBtcHandler}
                isDarkMode={currentThemeIsDark}
              />
            </div>

            {/* Column for AI Signals */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">AI Signal Group</h2>
              <ForwardedSignalsDisplay
                title="Forwarded Signals (AI Group)"
                headerColor="bg-purple-600"
                signals={forwardedSignalsAi}
                onDelete={deleteForwardedAiHandler}
                isDarkMode={currentThemeIsDark}
                isOpen={isForwardedAiSignalsOpen}
                onToggle={() => setForwardedAiSignalsOpen(!isForwardedAiSignalsOpen)}
              />
              <QueuedSignalsDisplay
                signals={queuedSignalsAi}
                title="Queued Signals (AI Group)"
                headerColor="bg-purple-600"
                isOpen={isQueuedAiSignalsOpen}
                onToggle={() => setQueuedAiSignalsOpen(!isQueuedAiSignalsOpen)}
                onDelete={deleteQueuedAiHandler}
                isDarkMode={currentThemeIsDark}
              />
            </div>
          </div>

          <SignalsDisplay
            signals={signals}
            isOpen={isRawSignalsOpen}
            onToggle={() => setRawSignalsOpen(!isRawSignalsOpen)}
            onDelete={deleteAllRawHandler}
            isDarkMode={currentThemeIsDark}
          />
        </div>
      </main>
      <Footer isDarkMode={currentThemeIsDark} />
    </div>
  );
} 