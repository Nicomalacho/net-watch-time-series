
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NetworkSnapshot, networkService } from "@/services/networkService";
import { ChartLineIcon } from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface NetworkChartProps {
  selectedNetwork?: string;
  sharedMetrics?: NetworkSnapshot[];
}

const NetworkChart: React.FC<NetworkChartProps> = ({ 
  selectedNetwork,
  sharedMetrics 
}) => {
  const [data, setData] = useState<NetworkSnapshot[]>([]);
  const [chartType, setChartType] = useState<"ping" | "speed">("ping");
  
  useEffect(() => {
    console.log('NetworkChart: Setting up subscription for network:', selectedNetwork);
    
    if (sharedMetrics) {
      console.log('NetworkChart: Using shared metrics:', sharedMetrics.length, 'items');
      setData(sharedMetrics);
      return;
    }
    
    const unsubscribe = networkService.subscribe((newData) => {
      console.log('NetworkChart: Received new data:', newData.length, 'items');
      console.log('NetworkChart: Latest data point:', newData[newData.length - 1]);
      // Force a new array reference to trigger re-render
      setData([...newData]);
    }, selectedNetwork);
    
    // Get initial data
    const initialData = networkService.getSnapshots(selectedNetwork);
    console.log('NetworkChart: Initial data:', initialData.length, 'items');
    setData([...initialData]);
    
    return () => {
      console.log('NetworkChart: Unsubscribing from network:', selectedNetwork);
      unsubscribe();
    };
  }, [selectedNetwork, sharedMetrics]);

  // Format time labels on x-axis
  const formatTimeLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Memoize chart data to ensure proper updates
  const chartData = useMemo(() => {
    console.log('NetworkChart: Recalculating chart data for', data.length, 'items');
    
    if (chartType === "ping") {
      return data.map((item, index) => ({
        name: formatTimeLabel(item.timestamp),
        ping: item.pingTime < 0 ? null : item.pingTime,
        timestamp: item.timestamp,
        id: `${item.timestamp}-${index}`, // Add unique ID for React key
      }));
    } else {
      return data.map((item, index) => ({
        name: formatTimeLabel(item.timestamp),
        download: item.downloadSpeed,
        upload: item.uploadSpeed,
        timestamp: item.timestamp,
        id: `${item.timestamp}-${index}`, // Add unique ID for React key
      }));
    }
  }, [data, chartType]);

  console.log('NetworkChart: Rendering with', chartData.length, 'chart data points');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <ChartLineIcon className="h-4 w-4" />
            {chartType === "ping" ? "Ping Latency" : "Network Speed"}
          </CardTitle>
          
          <div className="flex gap-2">
            <Select
              value={chartType}
              onValueChange={(value) => setChartType(value as "ping" | "speed")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ping">Ping Latency</SelectItem>
                <SelectItem value="speed">Speed Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "ping" ? (
              <RechartsLineChart
                key={`ping-${data.length}`} // Force re-render when data changes
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis 
                  label={{ value: 'ms', angle: -90, position: 'insideLeft' }} 
                  width={50} 
                />
                <Tooltip formatter={(value) => [`${value}ms`, "Ping"]} />
                <Line
                  type="monotone"
                  dataKey="ping"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  animationDuration={300}
                  connectNulls={false}
                />
              </RechartsLineChart>
            ) : (
              <RechartsLineChart
                key={`speed-${data.length}`} // Force re-render when data changes
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis 
                  label={{ value: 'Mbps', angle: -90, position: 'insideLeft' }} 
                  width={70} 
                />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} Mbps`]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="download"
                  name="Download"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  animationDuration={300}
                />
                <Line
                  type="monotone"
                  dataKey="upload"
                  name="Upload"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  animationDuration={300}
                />
              </RechartsLineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        <div className="text-xs text-muted-foreground mt-4">
          {data.length === 0 ? (
            "No data available. Start monitoring to see results."
          ) : (
            `Showing ${data.length} data points from ${formatTimeLabel(data[0]?.timestamp)} to ${formatTimeLabel(data[data.length - 1]?.timestamp)}`
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkChart;
