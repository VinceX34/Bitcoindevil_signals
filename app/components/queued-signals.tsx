import React, { useState } from 'react';
import { QueuedSignal } from '../../lib/db';

interface Props {
  signals: QueuedSignal[];
  title?: string;
  headerColor?: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  onDelete: () => Promise<void> | void;
  isDarkMode: boolean;
}

const QueuedSignalsDisplay: React.FC<Props> = ({
  signals,
  title = "Queued Signals",
  headerColor = "bg-[#0e639c]",
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
      console.error('The onDelete handler for queued signals failed:', error);
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
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className={`${isDarkMode ? 'bg-[#1e1e1e] border-[#3c3c3c] hover:bg-[#2a2d2e]' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} border rounded-md transition-colors`}
                >
                  <div className={`flex justify-between items-start p-3 border-b ${isDarkMode ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className={`text-xs font-mono text-white px-2 py-1 rounded ${headerColor}`}>
                        ID: {signal.payload.original_tv_signal_id}.{signal.payload.task_sub_id}
                      </span>
                      <span className={`text-xs font-mono ${isDarkMode ? 'text-[#b0b0b0]' : 'text-gray-600'} px-1`}>
                        ({signal.payload.exchange_name} - {signal.payload.hopper_id})
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        signal.status === 'pending' ? (isDarkMode ? 'bg-[#4d4d4d] text-[#cccccc]' : 'bg-gray-200 text-gray-700') :
                        signal.status === 'processing' ? 'bg-[#0e639c] text-white' :
                        signal.status === 'completed' ? 'bg-[#2d7d46] text-white' :
                        'bg-[#f48771] text-white'
                      }`}>
                        {signal.status.toUpperCase()}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-[#808080]' : 'text-gray-500'}`}>
                        Attempts: {signal.attempts}
                      </span>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-[#808080]' : 'text-gray-500'} mt-1 sm:mt-0`}>
                      {new Date(signal.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3">
                    <pre className={`${isDarkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-gray-50 text-gray-800'} p-3 rounded text-xs overflow-x-auto font-mono`}>
                      {JSON.stringify(signal.payload.payload_to_ch_api, null, 2)}
                    </pre>
                    {signal.error_message && (
                      <p className="text-xs text-[#f48771] mt-2">Error: {signal.error_message}</p>
                    )}
                    {signal.last_attempt_at && (
                      <p className={`text-xs ${isDarkMode ? 'text-[#808080]' : 'text-gray-500'} mt-1`}>
                        Last attempt: {new Date(signal.last_attempt_at).toLocaleString()}
                      </p>
                    )}
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

export default QueuedSignalsDisplay;
