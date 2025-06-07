import React, { useState } from 'react';
import { SimpleTradingViewSignal } from '../../lib/db'; // Adjusted relative path

interface SignalsDisplayProps {
  signals: SimpleTradingViewSignal[];
  title?: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  onDelete: () => Promise<void> | void;
  isDarkMode: boolean;
}

const SignalsDisplay: React.FC<SignalsDisplayProps> = ({
  signals,
  title = "Trading Signals",
  isOpen,
  onToggle,
  className = "",
  onDelete,
  isDarkMode
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('The onDelete handler failed:', error);
      alert('The delete operation failed. Please check the console for more details.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`${isDarkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'} border rounded-md shadow-lg ${className}`}>
      <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
        <h2 className={`${isDarkMode ? 'text-[#cccccc]' : 'text-gray-800'} font-medium`}>{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={onToggle}
            className={`px-3 py-1 text-sm font-medium ${isDarkMode ? 'text-[#cccccc] hover:text-white' : 'text-gray-600 hover:text-gray-800'} focus:outline-none`}
            aria-expanded={isOpen}
          >
            {isOpen ? 'Hide Signals' : 'Show Signals'}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || signals.length === 0}
            className="px-3 py-1 text-sm font-medium text-[#f48771] hover:text-[#ff9d8d] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete All'}
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          {!signals || signals.length === 0 ? (
            <p className={`p-4 ${isDarkMode ? 'text-[#808080]' : 'text-gray-500'}`}>No signals to display yet. Waiting for new data...</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto space-y-2 p-2">
              {signals.map((signal) => {
                const isBtcGroup = signal.signal_group === 'btc';
                const idColor = isBtcGroup ? 'bg-orange-600' : 'bg-[#0e639c]';
                
                return (
                  <div
                    key={`${signal.signal_group || 'default'}-${signal.id}`}
                    className={`${isDarkMode ? 'bg-[#1e1e1e] border-[#3c3c3c] hover:bg-[#2a2d2e]' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} border rounded-md transition-colors`}
                  >
                    <div className="flex justify-between items-center p-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono text-white px-2 py-1 rounded ${idColor}`}>
                          ID: {signal.id}
                        </span>
                        {isBtcGroup && <span className="text-xs font-bold text-orange-500">[BTC Group]</span>}
                      </div>
                      <span className={`text-xs ${isDarkMode ? 'text-[#808080]' : 'text-gray-500'}`}>
                        {new Date(signal.received_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3">
                      <pre className={`${isDarkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-gray-50 text-gray-800'} p-3 rounded text-xs overflow-x-auto font-mono`}>
                        {JSON.stringify(signal.raw_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SignalsDisplay;