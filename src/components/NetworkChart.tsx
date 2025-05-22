import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NetworkSnapshot, networkService } from "@/services/networkService";
import { BarChart4, ChartLineIcon } from "lucide-react";
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
    if (sharedMetrics) {
      setData(sharedMetrics);
      return;
    }
    
    const unsubscribe = networkService.subscribe((newData) => {
      setData(newData);
    }, selectedNetwork);
    
    return () => {
      unsubscribe();
    };
  }, [selectedNetwork, sharedMetrics]);

  // Format time labels on x-axis
  const formatTimeLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getPingData = () => {
    return data.map((item) => ({
      name: formatTimeLabel(item.timestamp),
      ping: item.pingTime < 0 ? null : item.pingTime,
      timestamp: item.timestamp,
    }));
  };
  
  const getSpeedData = () => {
    return data.map((item) => ({
      name: formatTimeLabel(item.timestamp),
      download: item.downloadSpeed,
      upload: item.uploadSpeed,
      timestamp: item.timestamp,
    }));
  };
  
  const chartData = chartType === "ping" ? getPingData() : getSpeedData();

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
                  animationDuration={500}
                />
              </RechartsLineChart>
            ) : (
              <RechartsLineChart
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
                  animationDuration={500}
                />
                <Line
                  type="monotone"
                  dataKey="upload"
                  name="Upload"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  animationDuration={500}
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
