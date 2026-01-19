import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { VehicleData } from '../types';

interface ComparisonChartProps {
  vehicleA: VehicleData;
  vehicleB: VehicleData;
}

const extractPrice = (priceStr: string) => {
  if (!priceStr) return 0;
  const match = priceStr.replace(/,/g, '').match(/(\d+)/);
  return match ? parseInt(match[0], 10) : 0;
};

export const ComparisonChart: React.FC<ComparisonChartProps> = ({ vehicleA, vehicleB }) => {
  // If market data is not yet available, show a loading state
  if (!vehicleA.market || !vehicleB.market) {
    return (
      <div className="border border-[#999] bg-white p-2 h-[230px] flex items-center justify-center bg-[#f0f0f0]">
         <div className="text-center">
            <div className="animate-spin h-6 w-6 border-2 border-[#0000cc] border-t-transparent rounded-full mx-auto mb-2"></div>
            <span className="text-[10px] text-[#666]">Analyzing Market Prices...</span>
         </div>
      </div>
    );
  }

  const data = [
    {
      name: 'New',
      [vehicleA.name]: extractPrice(vehicleA.market.averagePriceNew),
      [vehicleB.name]: extractPrice(vehicleB.market.averagePriceNew),
    },
    {
      name: 'Used',
      [vehicleA.name]: extractPrice(vehicleA.market.averagePriceUsed),
      [vehicleB.name]: extractPrice(vehicleB.market.averagePriceUsed),
    },
  ];

  return (
    <div className="border border-[#999] bg-white p-2">
      <div className="font-bold text-center border-b border-[#ccc] mb-2 bg-[#eee]">Price Chart</div>
      <div style={{ width: '100%', height: 200, fontSize: '11px' }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `$${value/1000}k`} />
            <Tooltip 
              itemStyle={{ fontSize: '11px' }}
              contentStyle={{ border: '1px solid #000', borderRadius: 0 }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey={vehicleA.name} fill="#0000cc" name={vehicleA.name} />
            <Bar dataKey={vehicleB.name} fill="#cc0000" name={vehicleB.name} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};