"use client";

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
  Scale
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  totalValue: number;
  isDarkMode: boolean;
}

const TotalValueGraph: React.FC<Props> = ({ totalValue, isDarkMode }) => {
  // Format the total value as currency
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalValue);

  // For now, we'll just show a single point with the current total
  // Later we can add historical data tracking
  const data = {
    labels: ['Total Value'],
    datasets: [
      {
        label: 'Total Portfolio Value',
        data: [totalValue],
        borderColor: isDarkMode ? '#0e639c' : '#2563eb',
        backgroundColor: isDarkMode ? 'rgba(14, 99, 156, 0.5)' : 'rgba(37, 99, 235, 0.5)',
        tension: 0.4,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Total Portfolio Value',
        color: isDarkMode ? '#cccccc' : '#1f2937',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
            return `$${Number(context.raw).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: isDarkMode ? '#cccccc' : '#1f2937',
          callback: function(tickValue: number | string) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            return '$' + value.toLocaleString();
          },
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        ticks: {
          color: isDarkMode ? '#cccccc' : '#1f2937',
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className={`p-6 rounded-lg shadow-lg ${
      isDarkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'
    } border`}>
      <div className="mb-4">
        <h2 className={`text-2xl font-bold ${
          isDarkMode ? 'text-[#cccccc]' : 'text-gray-800'
        }`}>
          {formattedTotal}
        </h2>
      </div>
      <div className="h-[300px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default TotalValueGraph; 