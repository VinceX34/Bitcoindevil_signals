"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { HOPPER_CONFIGS, HOPPER_CONFIGS_BTC, HOPPER_CONFIGS_AI } from "@/lib/hopperConfig";
import { useState } from 'react';

interface Hopper {
  id: string;
  total_cur: string;
}

interface Props {
  hoppers: Hopper[];
  isDarkMode: boolean;
}

const PortfolioPieChart: React.FC<Props> = ({ hoppers, isDarkMode }) => {
  const groupConfigs = [
    { name: 'Smart dca - Layer 1', ids: new Set(HOPPER_CONFIGS.map(h => h.id)), color: 'url(#layer1-gradient)' },
    { name: 'Smart dca - BTC and ETH', ids: new Set(HOPPER_CONFIGS_BTC.map(h => h.id)), color: 'url(#btc-gradient)' },
    { name: 'Swing trader - A.I and layer 3', ids: new Set(HOPPER_CONFIGS_AI.map(h => h.id)), color: 'url(#ai-gradient)' },
  ];

  const data = groupConfigs.map(group => {
    const value = hoppers
      .filter(hopper => group.ids.has(hopper.id))
      .reduce((sum, hopper) => sum + (parseFloat(hopper.total_cur) || 0), 0);
    return { name: group.name, value };
  }).filter(d => d.value > 0); // Filter out empty groups

  const totalValue = data.reduce((sum, entry) => sum + entry.value, 0);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't render labels for tiny slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      return (
        <div className={`p-2 rounded-md shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
          <p className="font-semibold">{name}</p>
          <p>{`$${value.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const onPieEnter = (_: any, index: number) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(-1);

  const renderActiveShape = (props: any) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value,
    } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 12} // Make the hovered segment pop out
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'url(#shadow)' }}
        />
      </g>
    );
  };

  return (
    <div className="relative w-full flex justify-center items-center" style={{ maxWidth: 650, margin: '0 auto' }}>
      <div style={{ width: '100%', height: 520 }}>
        <ResponsiveContainer>
          <PieChart>
            <defs>
              <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="15" floodColor="#000" floodOpacity="0.3" />
              </filter>
              <linearGradient id="layer1-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0e639c" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#1177bb" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="btc-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="ai-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              innerRadius={160}
              outerRadius={230}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              activeIndex={activeIndex >= 0 ? activeIndex : undefined}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={groupConfigs[index].color} 
                  style={{ transition: 'opacity 0.3s ease', cursor: 'pointer' }}
                  fillOpacity={activeIndex === -1 || activeIndex === index ? 0.95 : 0.4}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-5xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          style={{ textShadow: isDarkMode ? '0 2px 12px #000a' : '0 2px 12px #ccca' }}>
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

export default PortfolioPieChart; 