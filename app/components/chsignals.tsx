// components/ForwardedSignalsDisplay.tsx
import React, { useState } from 'react';
import { ForwardedSignal } from '../../lib/db';
import { HOPPER_CONFIGS } from '../../lib/hopperConfig';

interface Props {
  signals: ForwardedSignal[];
  title?: string;
  headerColor?: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  onDelete: () => void;
  isDarkMode: boolean;
}

const ForwardedSignalsDisplay: React.FC<Props> = ({
  signals,
  title = "Forwarded Signals",
  headerColor = "bg-[#0e639c]",
  isOpen,
  onToggle,
  className = "",
  onDelete,
  isDarkMode
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete all forwarded signals?')) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting forwarded signals:', error);
      alert('Error deleting signals. Check console for details.');
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
                const exchangeName = signal.exchange_name || 
                                   HOPPER_CONFIGS.find(hc => hc.id === signal.hopper_id)?.exchange || 
                                   'Unknown Exchange';
                return (
                  <div
                    key={signal.id}
                    className={`${isDarkMode ? 'bg-[#1e1e1e] border-[#3c3c3c] hover:bg-[#2a2d2e]' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} border rounded-md transition-colors`}
                  >
                    <div className={`flex justify-between items-start p-3 border-b ${isDarkMode ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
                      <div>
                        <span className={`text-xs font-mono text-white px-2 py-1 rounded ${headerColor}`}>
                          ID: {signal.tradingview_signal_id}.{signal.task_sub_id}
                        </span>
                        <span className={`text-xs font-mono ${isDarkMode ? 'text-[#b0b0b0]' : 'text-gray-600'} px-2 py-1 rounded ml-2`}>
                          Hopper: {signal.hopper_id} ({exchangeName})
                        </span>
                        {signal.http_status_code && (
                          <span className={`text-xs font-medium px-2 py-1 rounded ml-2 ${
                            signal.http_status_code >= 200 && signal.http_status_code < 300 ? (isDarkMode ? 'bg-[#2d7d46] text-white' : 'bg-green-100 text-green-700') :
                            (isDarkMode ? 'bg-[#f48771] text-white' : 'bg-red-100 text-red-700')
                          }`}>
                            Status: {signal.http_status_code}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs ${isDarkMode ? 'text-[#808080]' : 'text-gray-500'}`}>
                        {new Date(signal.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3">
                      <pre className={`${isDarkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-gray-50 text-gray-800'} p-3 rounded text-xs overflow-x-auto font-mono`}>
                        {JSON.stringify(signal.cryptohopper_payload, null, 2)}
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

export default ForwardedSignalsDisplay;
