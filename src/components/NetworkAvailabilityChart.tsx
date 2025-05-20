
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { networkService, NetworkSnapshot } from "@/services/networkService";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Percent } from "lucide-react";

interface NetworkAvailabilityChartProps {
  selectedNetwork?: string;
  timeframe: 'hour' | 'day' | 'week';
}

const NetworkAvailabilityChart = ({ selectedNetwork, timeframe }: NetworkAvailabilityChartProps) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Process data for the chart
    const processData = () => {
      const networkData = networkService.getNetworkData(selectedNetwork);
      if (!networkData.length) return [];
      
      const now = Date.now();
      const timeframeMsMap = {
        'hour': 60 * 60 * 1000,
        'day': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000
      };
      const timeframeMs = timeframeMsMap[timeframe];
      
      // Filter data by timeframe
      const filteredData = networkData.filter(d => (now - d.timestamp) <= timeframeMs);
      
      // Group data into time buckets for the chart
      const buckets = 12; // 12 buckets for any timeframe
      const bucketSize = timeframeMs / buckets;
      
      const availabilityData = Array(buckets).fill(0).map((_, i) => {
        const bucketStart = now - timeframeMs + (i * bucketSize);
        const bucketEnd = bucketStart + bucketSize;
        
        const bucketData = filteredData.filter(d => 
          d.timestamp >= bucketStart && d.timestamp < bucketEnd
        );
        
        const totalPoints = bucketData.length;
        const availablePoints = bucketData.filter(d => 
          d.online && d.pingTime >= 0 && d.pingTime < 300 // Good or warning threshold
        ).length;
        
        const avgPing = bucketData.length > 0
          ? bucketData.reduce((sum, d) => sum + (d.pingTime >= 0 ? d.pingTime : 0), 0) / 
            Math.max(1, bucketData.filter(d => d.pingTime >= 0).length)
          : 0;
          
        const availability = totalPoints > 0 
          ? (availablePoints / totalPoints) * 100 
          : 0;
          
        const label = formatBucketLabel(bucketStart, timeframe);
          
        return {
          name: label,
          availability: availability,
          avgPing: avgPing,
          bucketStart,
          bucketEnd
        };
      });
      
      return availabilityData;
    };
    
    // Initial data
    setData(processData());
    
    // Update on interval
    const interval = setInterval(() => {
      setData(processData());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedNetwork, timeframe]);

  const formatBucketLabel = (timestamp: number, timeframe: string) => {
    const date = new Date(timestamp);
    
    switch(timeframe) {
      case 'hour':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'day':
        return date.toLocaleString([], { 
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'week':
        return date.toLocaleDateString([], { 
          weekday: 'short',
          month: 'short',
          day: 'numeric' 
        });
      default:
        return date.toLocaleString();
    }
  };
  
  const getBarFill = (value: number) => {
    if (value >= 95) return "#10B981"; // green
    if (value >= 80) return "#F59E0B"; // amber
    return "#EF4444"; // red
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Network Availability
          {selectedNetwork && selectedNetwork !== 'All Networks' && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {selectedNetwork}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#888', fontSize: 12 }}
                stroke="#888"
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: '#888', fontSize: 12 }}
                stroke="#888"
                label={{ 
                  value: 'Availability (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#888' }
                }}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(30, 30, 30, 0.9)', 
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#fff' 
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'availability') {
                    return [`${value.toFixed(1)}%`, 'Availability'];
                  }
                  if (name === 'avgPing') {
                    return [`${value.toFixed(1)} ms`, 'Avg Ping'];
                  }
                  return [value, name];
                }}
              />
              <Bar dataKey="availability" name="Availability">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarFill(entry.availability)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data available for the selected timeframe
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NetworkAvailabilityChart;
