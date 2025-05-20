
import React, { useEffect, useState } from "react";
import { NetworkStats, networkService } from "@/services/networkService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Gauge, TrendingUp } from "lucide-react";

const StatusColors = {
  good: "bg-network-good",
  warning: "bg-network-warning",
  error: "bg-network-error",
  unknown: "bg-gray-500"
};

interface StatusIndicatorProps {
  selectedNetwork?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ selectedNetwork }) => {
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    const unsubscribe = networkService.subscribeToStats((newStats) => {
      setStats(newStats);
    }, selectedNetwork);

    return () => {
      unsubscribe();
    };
  }, [selectedNetwork]);

  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px]">
            <div className="text-muted-foreground">Initializing...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusText = () => {
    if (!navigator.onLine) return "Offline";
    
    switch (stats.status) {
      case "good": return "Excellent";
      case "warning": return "Moderate";
      case "error": return "Poor";
      default: return "Unknown";
    }
  };

  const formatPing = (ping: number) => {
    if (ping < 0) return "Timeout";
    return `${ping}ms`;
  };
  
  const formatSpeed = (speed: number | undefined) => {
    if (speed === undefined || speed < 0) return "N/A";
    return `${speed.toFixed(1)} Mbps`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          Connection Status
          {stats.networkName && stats.networkName !== 'All Networks' && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {stats.networkName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-4">
          <div className="flex items-center space-x-2 mb-4">
            <div 
              className={cn(
                "w-4 h-4 rounded-full animate-pulse-slow",
                StatusColors[stats.status]
              )}
            />
            <span className="text-2xl font-bold">{getStatusText()}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full mb-4">
            <div className="bg-secondary/50 p-3 rounded-md text-center">
              <div className="text-sm text-muted-foreground">Current Ping</div>
              <div className="text-xl font-semibold">{formatPing(stats.currentPing)}</div>
            </div>
            
            <div className="bg-secondary/50 p-3 rounded-md text-center">
              <div className="text-sm text-muted-foreground">Packet Loss</div>
              <div className="text-xl font-semibold">{stats.packetLoss.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full mb-2">
            <div className="bg-secondary/50 p-3 rounded-md text-center flex flex-col items-center">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Download
              </div>
              <div className="text-xl font-semibold">{formatSpeed(stats.downloadSpeed)}</div>
            </div>
            
            <div className="bg-secondary/50 p-3 rounded-md text-center flex flex-col items-center">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 transform rotate-180" /> Upload
              </div>
              <div className="text-xl font-semibold">{formatSpeed(stats.uploadSpeed)}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-secondary/50 p-3 rounded-md text-center">
              <div className="text-sm text-muted-foreground">Min Ping</div>
              <div className="text-xl font-semibold">{stats.min}ms</div>
            </div>
            
            <div className="bg-secondary/50 p-3 rounded-md text-center">
              <div className="text-sm text-muted-foreground">Max Ping</div>
              <div className="text-xl font-semibold">{stats.max}ms</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusIndicator;
