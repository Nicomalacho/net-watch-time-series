
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { networkService } from "@/services/networkService";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { ChartBar } from "lucide-react";

interface SpeedComparisonChartProps {
  selectedNetwork?: string;
  timeframe: 'hour' | 'day' | 'week';
}

const SpeedComparisonChart = ({ selectedNetwork, timeframe }: SpeedComparisonChartProps) => {
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
      const filteredData = networkData.filter(d => 
        (now - d.timestamp) <= timeframeMs && 
        (d.downloadSpeed !== undefined || d.uploadSpeed !== undefined)
      );
      
      // Group data into time buckets for the chart
      const buckets = 12; // 12 buckets for any timeframe
      const bucketSize = timeframeMs / buckets;
      
      const speedData = Array(buckets).fill(0).map((_, i) => {
        const bucketStart = now - timeframeMs + (i * bucketSize);
        const bucketEnd = bucketStart + bucketSize;
        
        const bucketData = filteredData.filter(d => 
          d.timestamp >= bucketStart && d.timestamp < bucketEnd
        );
        
        const validDownloadData = bucketData.filter(d => 
          d.downloadSpeed !== undefined && d.downloadSpeed > 0
        );
        const validUploadData = bucketData.filter(d => 
          d.uploadSpeed !== undefined && d.uploadSpeed > 0
        );
        
        const avgDownload = validDownloadData.length > 0
          ? validDownloadData.reduce((sum, d) => sum + (d.downloadSpeed || 0), 0) / validDownloadData.length
          : 0;
          
        const avgUpload = validUploadData.length > 0
          ? validUploadData.reduce((sum, d) => sum + (d.uploadSpeed || 0), 0) / validUploadData.length
          : 0;
          
        const label = formatBucketLabel(bucketStart, timeframe);
          
        return {
          name: label,
          download: avgDownload,
          upload: avgUpload,
          bucketStart,
          bucketEnd
        };
      });
      
      return speedData;
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <ChartBar className="h-4 w-4" />
          Speed Comparison
          {selectedNetwork && selectedNetwork !== 'All Networks' && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {selectedNetwork}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {data.length > 0 && data.some(d => d.download > 0 || d.upload > 0) ? (
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
                tick={{ fill: '#888', fontSize: 12 }}
                stroke="#888"
                label={{ 
                  value: 'Speed (Mbps)', 
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
                formatter={(value: any) => {
                  return [`${value.toFixed(2)} Mbps`, ''];
                }}
              />
              <Legend />
              <Bar dataKey="download" name="Download" fill="#3B82F6" />
              <Bar dataKey="upload" name="Upload" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No speed data available for the selected timeframe
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpeedComparisonChart;
