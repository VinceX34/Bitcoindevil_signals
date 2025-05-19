'use client';
import { useEffect, useState } from 'react';
import SignalsDisplay              from './components/SignalsDisplay';
import ForwardedSignalsDisplay     from './components/chsignals';
import type { SimpleTradingViewSignal, ForwardedSignal } from '@/lib/db';

export default function HomePage() {
  const [raw,       setRaw]       = useState<SimpleTradingViewSignal[]>([]);
  const [forwarded, setForwarded] = useState<ForwardedSignal[]>([]);

  useEffect(() => {
    const load = async () => {
      const [r1, r2] = await Promise.all([
        fetch('/api/webhook').then(r => r.json()),
        fetch('/api/cryptohopper').then(r => r.json()),
      ]);
      if (r1.success) setRaw(r1.signals);
      if (r2.success) setForwarded(r2.signals);
    };
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="container mx-auto p-4 space-y-10">
      <SignalsDisplay
        signals={raw}
        title="TradingView Signals"
        className="max-w-3xl mx-auto"
      />
      <ForwardedSignalsDisplay
        signals={forwarded}
        className="max-w-3xl mx-auto"
      />
    </main>
  );
}
