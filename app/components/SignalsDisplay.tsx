import React from 'react';
import { SimpleTradingViewSignal } from '../../lib/db'; // Adjusted relative path

interface SignalsDisplayProps {
  signals: SimpleTradingViewSignal[];
  title?: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const SignalsDisplay: React.FC<SignalsDisplayProps> = ({
  signals,
  title = "Trading Signals",
  isOpen,
  onToggle,
  className = ""
}) => {
  return (
    <div className={`p-6 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl bg-gray-50 dark:bg-neutral-800 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
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
          {!signals || signals.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No signals to display yet. Waiting for new data...</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className="p-4 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-mono bg-indigo-100 dark:bg-indigo-700/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                      ID: {signal.id}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      {new Date(signal.received_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <pre className="bg-gray-100 dark:bg-neutral-600 p-3 rounded-md text-xs text-gray-700 dark:text-gray-300 overflow-x-auto custom-scrollbar">
                      {JSON.stringify(signal.raw_data, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SignalsDisplay;