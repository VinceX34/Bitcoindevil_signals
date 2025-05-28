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
  const [authorized, setAuthorized] = useState(getInitialAuthState());
  const router = useRouter();
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const [isRawSignalsOpen, setIsRawSignalsOpen] = useState(true);
  const [isForwardedSignalsOpen, setIsForwardedSignalsOpen] = useState(true);
  const [isQueuedSignalsOpen, setIsQueuedSignalsOpen] = useState(true);

  const [raw, setRaw] = useState<SimpleTradingViewSignal[]>([]);
  const [forwarded, setForwarded] = useState<ForwardedSignal[]>([]);
  const [queued, setQueued] = useState<QueuedSignal[]>([]);

  const handleRawSignalsDelete = () => setRaw([]);
  const handleForwardedSignalsDelete = () => setForwarded([]);
  const handleQueuedSignalsDelete = () => setQueued([]);

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const response = await fetch('/api/worker/process-ch-queue');
      const data = await response.json();
      if (data.success) {
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

  useEffect(() => {
    if (!authorized) {
      router.push('/');
      return;
    }
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
      } catch { /* swallow */ }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [authorized, router]);

  const toggleRawSignals = () => setIsRawSignalsOpen(!isRawSignalsOpen);
  const toggleForwardedSignals = () => setIsForwardedSignalsOpen(!isForwardedSignalsOpen);
  const toggleQueuedSignals = () => setIsQueuedSignalsOpen(!isQueuedSignalsOpen);
  
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
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-grow p-4 lg:p-8 ${currentThemeIsDark ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-gray-100 text-gray-800'}`}>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-3xl font-semibold">
              Signal Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleProcessQueue}
                disabled={isProcessingQueue}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isProcessingQueue ? 'opacity-50 cursor-not-allowed' : ''} ${currentThemeIsDark ? 'bg-[#3c3c3c] hover:bg-[#4f4f4f] text-[#cccccc]' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                {isProcessingQueue ? 'Processing...' : 'Process Queue'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SignalsDisplay
              signals={raw}
              isOpen={isRawSignalsOpen}
              onToggle={toggleRawSignals}
              onDelete={handleRawSignalsDelete}
              isDarkMode={currentThemeIsDark}
              className="lg:col-span-1"
            />
            <ForwardedSignalsDisplay
              signals={forwarded}
              isOpen={isForwardedSignalsOpen}
              onToggle={toggleForwardedSignals}
              onDelete={handleForwardedSignalsDelete}
              isDarkMode={currentThemeIsDark}
              className="lg:col-span-1"
            />
            <QueuedSignalsDisplay
              signals={queued}
              isOpen={isQueuedSignalsOpen}
              onToggle={toggleQueuedSignals}
              onDelete={handleQueuedSignalsDelete}
              isDarkMode={currentThemeIsDark}
              className="lg:col-span-1"
            />
          </div>
        </div>
      </main>
      <Footer isDarkMode={currentThemeIsDark} />
    </div>
  );
} 