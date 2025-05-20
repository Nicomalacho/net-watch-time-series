
import React, { useEffect } from "react";
import NetworkChart from "@/components/NetworkChart";
import StatusIndicator from "@/components/StatusIndicator";
import ControlPanel from "@/components/ControlPanel";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      <div className="container mx-auto px-4">
        <header className="py-6 md:py-8 mb-2">
          <h1 className="text-2xl md:text-4xl font-bold text-center">
            Network Connection Monitor
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            Track your internet connection quality over time
          </p>
        </header>
        
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4 md:gap-6`}>
          {/* Status and Controls (side by side on desktop) */}
          <div className="flex flex-col gap-4">
            <StatusIndicator />
            <ControlPanel />
          </div>
          
          {/* Main chart (takes up more space on desktop) */}
          <div className="md:col-span-2">
            <NetworkChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
