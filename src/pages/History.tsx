
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowUp, ChartBar, Gauge, Clock, Percent } from "lucide-react";
import { networkService } from "@/services/networkService";
import NetworkSelector from "@/components/NetworkSelector";
import HistoricalMetricsCard from "@/components/HistoricalMetricsCard";
import NetworkAvailabilityChart from "@/components/NetworkAvailabilityChart";
import SpeedComparisonChart from "@/components/SpeedComparisonChart";
import { useIsMobile } from "@/hooks/use-mobile";

const History = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedNetwork, setSelectedNetwork] = useState<string | undefined>(undefined);
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week'>('day');

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      <div className="container mx-auto px-4">
        <header className="py-6 md:py-8 mb-2 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Historical Network Metrics
            </h1>
            <p className="text-muted-foreground mt-1">
              Performance statistics over time
            </p>
          </div>
          <Button onClick={() => navigate("/")} size="sm" variant="outline" className="flex items-center gap-1">
            <ArrowUp className="h-4 w-4 rotate-90" />
            Back to Dashboard
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Sidebar */}
          <div className="flex flex-col gap-4 md:col-span-1">
            <NetworkSelector 
              selectedNetwork={selectedNetwork} 
              onNetworkChange={setSelectedNetwork} 
            />
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="day" onValueChange={(value) => setTimeframe(value as 'hour' | 'day' | 'week')}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="hour">Hour</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
            
            <HistoricalMetricsCard selectedNetwork={selectedNetwork} timeframe={timeframe} />
          </div>
          
          {/* Main content */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <NetworkAvailabilityChart selectedNetwork={selectedNetwork} timeframe={timeframe} />
            <SpeedComparisonChart selectedNetwork={selectedNetwork} timeframe={timeframe} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
