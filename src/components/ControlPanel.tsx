
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { networkService } from "@/services/networkService";
import { Play, Pause, Settings } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/integrations/supabase/client";

interface ControlPanelProps {
  selectedNetwork?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ selectedNetwork }) => {
  const [monitoring, setMonitoring] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to monitoring state changes
    const unsubscribe = networkService.onMonitoringChange(isMonitoring => {
      setMonitoring(isMonitoring);
    });
    
    // Set initial state
    setMonitoring(networkService.getMonitoringState());
    
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session?.user);
    };
    
    checkAuthStatus();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const toggleMonitoring = () => {
    if (monitoring) {
      networkService.stopMonitoring();
      toast({
        title: "Monitoring Stopped",
        description: "Network monitoring has been paused.",
      });
    } else {
      networkService.startMonitoring(selectedNetwork);
      toast({
        title: "Monitoring Started",
        description: `Monitoring ${selectedNetwork ? selectedNetwork : "your network"} for issues.`,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <Button 
            onClick={toggleMonitoring}
            variant={monitoring ? "destructive" : "default"}
            className="w-full"
          >
            {monitoring ? (
              <>
                <Pause className="h-4 w-4 mr-2" /> Stop Monitoring
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" /> Start Monitoring
              </>
            )}
          </Button>
          
          {isAuthenticated && monitoring && (
            <p className="text-xs text-muted-foreground">
              Your metrics are being saved to your account.
            </p>
          )}
          
          {!isAuthenticated && monitoring && (
            <p className="text-xs text-muted-foreground">
              Sign in to save your metrics and access them later.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;
