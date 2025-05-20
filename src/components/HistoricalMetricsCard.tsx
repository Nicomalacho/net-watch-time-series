
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { networkService } from "@/services/networkService";
import { Gauge, TrendingUp, Percent } from "lucide-react";

interface HistoricalMetricsCardProps {
  selectedNetwork?: string;
  timeframe: 'hour' | 'day' | 'week';
}

const HistoricalMetricsCard = ({ selectedNetwork, timeframe }: HistoricalMetricsCardProps) => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // Get initial metrics
    const initialMetrics = networkService.getHistoricalMetrics(selectedNetwork, timeframe);
    setMetrics(initialMetrics);

    // Update metrics when new data comes in
    const interval = setInterval(() => {
      const updatedMetrics = networkService.getHistoricalMetrics(selectedNetwork, timeframe);
      setMetrics(updatedMetrics);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedNetwork, timeframe]);

  if (!metrics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Historical Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4">Loading metrics...</div>
        </CardContent>
      </Card>
    );
  }

  const formatTimeframe = () => {
    switch(timeframe) {
      case 'hour': return 'Past Hour';
      case 'day': return 'Past 24 Hours';
      case 'week': return 'Past Week';
      default: return 'Past 24 Hours';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Key Metrics
          </span>
          <span className="text-xs text-muted-foreground">{formatTimeframe()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-green-500" />
              <span className="text-sm">Availability</span>
            </div>
            <span className="font-medium">{metrics.availabilityPercentage.toFixed(1)}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Avg Ping</span>
            </div>
            <span className="font-medium">{metrics.avgPing.toFixed(1)} ms</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-amber-500" />
              <span className="text-sm">P95 Ping</span>
            </div>
            <span className="font-medium">{metrics.p95Ping.toFixed(1)} ms</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="text-sm">Avg Download</span>
            </div>
            <span className="font-medium">{metrics.avgDownloadSpeed.toFixed(1)} Mbps</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-purple-500 transform rotate-180" />
              <span className="text-sm">Avg Upload</span>
            </div>
            <span className="font-medium">{metrics.avgUploadSpeed.toFixed(1)} Mbps</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoricalMetricsCard;
