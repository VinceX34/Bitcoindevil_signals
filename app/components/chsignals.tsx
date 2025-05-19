// components/ForwardedSignalsDisplay.tsx
import React from 'react';
import type { ForwardedSignal } from '@/lib/db';

interface Props {
  signals: ForwardedSignal[];
  className?: string;
}

export default function ForwardedSignalsDisplay({
  signals,
  className = '',
}: Props) {
  return (
    <div className={`p-6 border rounded-lg shadow-xl bg-gray-50 ${className}`}>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
        Forwarded Signals
      </h2>

      {signals.length === 0 ? (
        <p className="text-gray-500">No forwarded signals yet.</p>
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
          {signals.map((s) => (
            <div
              key={s.id}
              className="p-4 border border-gray-300 rounded-md bg-white shadow-sm"
            >
              <div className="flex justify-between text-xs mb-2">
                <span className="font-mono bg-green-100 text-green-700 px-2 py-1 rounded">
                  ID&nbsp;{s.id}
                </span>
                <span>{new Date(s.created_at).toLocaleString()}</span>
              </div>

              <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                {JSON.stringify(s.cryptohopper_payload, null, 2)}
              </pre>

              <p
                className={`mt-2 text-sm font-semibold ${
                  s.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {s.status}
              </p>

              {s.error_message && (
                <p className="text-xs text-red-500 mt-1">{s.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
