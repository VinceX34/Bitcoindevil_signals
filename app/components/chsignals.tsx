// components/ForwardedSignalsDisplay.tsx
import React from 'react';
import type { ForwardedSignal } from '@/lib/db';

interface Props {
  signals: ForwardedSignal[];
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export default function ForwardedSignalsDisplay({
  signals,
  isOpen,
  onToggle,
  className = '',
}: Props) {
  return (
    <div className={`p-6 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl bg-gray-50 dark:bg-neutral-800 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Forwarded Signals
        </h2>
        <button
          onClick={onToggle}
          className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
          aria-expanded={isOpen}
        >
          {isOpen ? 'Verberg' : 'Toon'}
        </button>
      </div>

      {isOpen && (
        <>
          {signals.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No forwarded signals yet.</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {signals.map((s) => (
                <div
                  key={s.id}
                  className="p-4 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 shadow-sm"
                >
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-mono bg-green-100 dark:bg-green-700/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                      ID&nbsp;{s.id}
                    </span>
                    <span className="dark:text-gray-400">{new Date(s.created_at).toLocaleString()}</span>
                  </div>

                  <pre className="bg-gray-100 dark:bg-neutral-600 p-3 rounded-md text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(s.cryptohopper_payload, null, 2)}
                  </pre>

                  <p
                    className={`mt-2 text-sm font-semibold ${
                      s.status === 'SUCCESS' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {s.status}
                  </p>

                  {s.error_message && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{s.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
