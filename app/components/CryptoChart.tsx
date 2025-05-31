"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  timestamp: number; // Unix timestamp
  date: string; // Formatted date string for display
  price: number;
}

interface CryptoChartProps {
  data: ChartDataPoint[];
  coinName: string;
  isDarkMode: boolean;
}

const CryptoChart: React.FC<CryptoChartProps> = ({ data, coinName, isDarkMode }) => {
  if (!data || data.length === 0) {
    return <p className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No chart data available for {coinName}.</p>;
  }

  // Determine stroke colors based on theme
  const strokeColor = isDarkMode ? "#8884d8" : "#8884d8"; // You can differentiate if needed
  const gridStrokeColor = isDarkMode ? "#444" : "#ccc";
  const textColor = isDarkMode ? "#ccc" : "#666";

  return (
    <div style={{ width: '100%', height: 400 }} className="p-4">
      <h3 className={`text-xl font-semibold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{coinName} Price Chart (Last 7 Days)</h3>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
          <XAxis dataKey="date" stroke={textColor} />
          <YAxis stroke={textColor} domain={['auto', 'auto']} tickFormatter={(value) => `$${value.toLocaleString()}`} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: isDarkMode ? '#333' : '#fff', 
              borderColor: isDarkMode ? '#555' : '#ccc' 
            }}
            itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
            labelStyle={{ color: isDarkMode ? '#fff' : '#000' }}
          />
          <Legend wrapperStyle={{ color: textColor }} />
          <Line type="monotone" dataKey="price" stroke={strokeColor} activeDot={{ r: 8 }} name={coinName} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CryptoChart; 