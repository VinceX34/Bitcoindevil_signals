import React from 'react';
import { SimpleTradingViewSignal } from '../../lib/db'; // Adjusted relative path

interface SignalsDisplayProps {
  signals: SimpleTradingViewSignal[];
  title?: string;
  className?: string;
}

const SignalsDisplay: React.FC<SignalsDisplayProps> = ({
  signals,
  title = "Trading Signals",
  className = ""
}) => {
  if (!signals || signals.length === 0) {
    return (
      <div className={`p-6 border rounded-lg shadow-lg bg-white ${className}`}>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">{title}</h2>
        <p className="text-gray-500">No signals to display yet. Waiting for new data...</p>
      </div>
    );
  }

  return (
    <div className={`p-6 border rounded-lg shadow-xl bg-gray-50 ${className}`}>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">{title}</h2>
      <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className="p-4 border border-gray-300 rounded-md bg-white shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                ID: {signal.id}
              </span>
              <span className="text-xs text-gray-500 text-right">
                {new Date(signal.received_at).toLocaleString()}
              </span>
            </div>
            <div>
              <pre className="bg-gray-100 p-3 rounded-md text-xs text-gray-700 overflow-x-auto custom-scrollbar">
                {JSON.stringify(signal.raw_data, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignalsDisplay;