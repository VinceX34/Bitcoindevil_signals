'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Import TimeScale for time-based x-axis
  Filler,    // For area fill
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns'; // Adapter for date-fns

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Register TimeScale
  Filler
);

interface WealthHistoryGraphProps {
  isDarkMode: boolean;
}

interface HistoryDataPoint {
  snapshot_at: string; // ISO string
  total_value_usd: number;
}

const WealthHistoryGraph: React.FC<WealthHistoryGraphProps> = ({ isDarkMode }) => {
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('last_30_days');
  const chartRef = useRef<ChartJS<"line", any[], any>>(null); // For accessing chart instance

  const fetchData = async (period: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wealth-history?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setHistoryData(data.history || []);
        console.log('WealthHistoryGraph fetched data:', data.history);
      } else {
        setError(data.error || 'Failed to load wealth history.');
        setHistoryData([]);
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching history data.');
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedPeriod);
  }, [selectedPeriod]);

  const latestWealth = historyData.length > 0 ? historyData[historyData.length - 1].total_value_usd : 0;

  const chartData = {
    labels: historyData.map(d => new Date(d.snapshot_at)), // Use Date objects for TimeScale
    datasets: [
      {
        label: 'Total Portfolio Value (USD)',
        data: historyData.map(d => d.total_value_usd),
        borderColor: isDarkMode ? '#38bdf8' : '#0ea5e9', // Light blue / Sky blue
        backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(14, 165, 233, 0.2)',
        tension: 0.1,
        fill: true,
        pointBackgroundColor: isDarkMode ? '#0ea5e9' : '#0284c7',
        pointBorderColor: isDarkMode ? '#0ea5e9' : '#0284c7',
        pointRadius: historyData.length < 50 ? 3 : 0, // Show points if data is sparse
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#374151',
          font: { size: 14 }
        }
      },
      title: {
        display: true,
        text: `Wealth Fluctuation (${selectedPeriod.replace('_',' ').replace('last ','Last ')})`,
        color: isDarkMode ? '#f3f4f6' : '#1f2937',
        font: { size: 18, weight: 'bold' as const}
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDarkMode ? '#f3f4f6' : '#1f2937',
        bodyColor: isDarkMode ? '#e5e7eb' : '#374151',
        borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: historyData.length > 60 ? (selectedPeriod === 'all_time' || selectedPeriod === 'last_90_days' ? 'month' : 'day') : 'day' as const,
          tooltipFormat: 'MMM dd, yyyy HH:mm', // e.g., Aug 23, 2023 14:30
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
            quarter: 'MMM yyyy',
            year: 'yyyy',
          }
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#4b5563',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: selectedPeriod === 'last_7_days' ? 7 : 10,
        }
      },
      y: {
        beginAtZero: false, // Adjust based on your data, false allows better view of fluctuations
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#4b5563',
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  const periodOptions = [
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'all_time', label: 'All Time' },
  ];

  return (
    <div className={`${isDarkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'} border rounded-md shadow-lg p-4 md:p-6`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
        <div>
          {historyData.length > 0 && (
            <p className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Current Total Wealth: 
              <span className={`${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                ${latestWealth.toFixed(2)}
              </span>
            </p>
          )}
        </div>
        <select 
          value={selectedPeriod} 
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className={`${isDarkMode ? 'bg-[#3c3c3c] text-white border-[#555]' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-[#007acc] focus:border-[#007acc] outline-none w-full sm:w-auto`}
        >
          {periodOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      {loading && <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading chart data...</p>}
      {error && <p className={`text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Error: {error}</p>}
      {!loading && !error && historyData.length === 0 && (
        <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No historical data available for the selected period.</p>
      )}
      {!loading && !error && historyData.length > 0 && (
        <div style={{ height: '400px' }}> {/* Set a fixed height for the chart container */}
          <Line ref={chartRef} options={options as any} data={chartData} />
        </div>
      )}
    </div>
  );
};

export default WealthHistoryGraph; 