
import React, { useEffect, useState } from "react";
import { NetworkStats, networkService } from "@/services/networkService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const StatusColors = {
  good: "bg-network-good",
  warning: "bg-network-warning",
  error: "bg-network-error",
  unknown: "bg-gray-500"
};

const StatusIndicator: React.FC = () => {
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    const unsubscribe = networkService.subscribeToStats((newStats) => {
      setStats(newStats);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Connection Status</CardTitle>
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
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-secondary/50 p-3 rounded-md text-center">
              <div className="text-sm text-muted-foreground">Current Ping</div>
              <div className="text-xl font-semibold">{formatPing(stats.currentPing)}</div>
            </div>
            
            <div className="bg-secondary/50 p-3 rounded-md text-center">
              <div className="text-sm text-muted-foreground">Packet Loss</div>
              <div className="text-xl font-semibold">{stats.packetLoss.toFixed(1)}%</div>
            </div>
            
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
