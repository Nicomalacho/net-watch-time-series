
import React, { useEffect, useState } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  ReferenceLine
} from "recharts";
import { NetworkSnapshot, networkService } from "@/services/networkService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NetworkChartProps {
  title?: string;
  selectedNetwork?: string;
}

const NetworkChart: React.FC<NetworkChartProps> = ({ 
  title = "Network Performance",
  selectedNetwork 
}) => {
  const [data, setData] = useState<NetworkSnapshot[]>([]);

  useEffect(() => {
    // Subscribe to network data updates with optional network filter
    const unsubscribe = networkService.subscribe((newData) => {
      setData([...newData]);
    }, selectedNetwork);

    return () => {
      unsubscribe();
    };
  }, [selectedNetwork]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTooltip = (value: number, name: string) => {
    if (value < 0) return "Timeout";
    return `${value} ms`;
  };

  const getLineColor = (dataPoint: NetworkSnapshot) => {
    if (dataPoint.pingTime < 0) return "#EF4444";  // Error/timeout
    if (dataPoint.pingTime <= 150) return "#10B981"; // Good (green)
    if (dataPoint.pingTime <= 300) return "#F59E0B"; // Warning (amber)
    return "#EF4444"; // Error (red)
  };

  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    
    if (payload.pingTime < 0) {
      // For timeout/error data points
      return (
        <svg x={cx - 6} y={cy - 6} width={12} height={12} fill="red">
          <circle cx="6" cy="6" r="6" fill="#EF4444" />
        </svg>
      );
    }
    
    return (
      <svg x={cx - 4} y={cy - 4} width={8} height={8} fill="green">
        <circle cx="4" cy="4" r="4" fill={getLineColor(payload)} />
      </svg>
    );
  };

  const chartTitle = selectedNetwork 
    ? `${title} - ${selectedNetwork}` 
    : `${title} - All Networks`;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 5, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.2} />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime}
              stroke="#888"
              tick={{ fill: '#888', fontSize: 12 }}
              minTickGap={50}
            />
            <YAxis 
              stroke="#888"
              tick={{ fill: '#888', fontSize: 12 }}
              domain={[0, 'dataMax + 100']} 
              label={{ 
                value: 'Ping (ms)', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#888',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(timestamp) => {
                const dataPoint = data.find(d => d.timestamp === timestamp);
                return `Time: ${formatTime(timestamp)}${dataPoint ? ` | Network: ${dataPoint.networkName}` : ''}`;
              }}
              contentStyle={{ 
                backgroundColor: 'rgba(30, 30, 30, 0.9)', 
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff' 
              }}
            />
            <ReferenceLine y={150} stroke="#10B981" strokeDasharray="3 3" label={{ 
              value: 'Good', 
              position: 'left',
              fill: '#10B981',
              fontSize: 12 
            }} />
            <ReferenceLine y={300} stroke="#F59E0B" strokeDasharray="3 3" label={{ 
              value: 'Warning', 
              position: 'left',
              fill: '#F59E0B',
              fontSize: 12 
            }} />
            <Line 
              type="monotone" 
              dataKey="pingTime"
              stroke="#3B82F6"
              strokeWidth={2}
              activeDot={{ r: 6 }}
              dot={<CustomizedDot />}
              connectNulls 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default NetworkChart;
