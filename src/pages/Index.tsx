
import React, { useEffect, useState } from "react";
import NetworkChart from "@/components/NetworkChart";
import StatusIndicator from "@/components/StatusIndicator";
import ControlPanel from "@/components/ControlPanel";
import NetworkSelector from "@/components/NetworkSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { UserCircle2, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const isMobile = useIsMobile();
  const [selectedNetwork, setSelectedNetwork] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      <div className="container mx-auto px-4">
        <header className="py-6 md:py-8 mb-2">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl md:text-4xl font-bold">
              Network Connection Monitor
            </h1>
            
            <div className="flex gap-2">
              {isAuthenticated ? (
                <>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/share">
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </Link>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={async () => {
                      await supabase.auth.signOut();
                    }}
                  >
                    <UserCircle2 className="h-4 w-4 mr-2" /> Sign Out
                  </Button>
                </>
              ) : (
                <Button asChild size="sm" variant="default">
                  <Link to="/auth">
                    <UserCircle2 className="h-4 w-4 mr-2" /> Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-muted-foreground text-center">
            Track your internet connection quality over time
            {isAuthenticated && " • Your metrics are being saved to your account"}
          </p>
        </header>
        
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4 md:gap-6`}>
          {/* Status and Controls (side by side on desktop) */}
          <div className="flex flex-col gap-4">
            <NetworkSelector 
              selectedNetwork={selectedNetwork} 
              onNetworkChange={setSelectedNetwork} 
            />
            <StatusIndicator selectedNetwork={selectedNetwork} />
            <ControlPanel selectedNetwork={selectedNetwork} />
          </div>
          
          {/* Main chart (takes up more space on desktop) */}
          <div className="md:col-span-2">
            <NetworkChart selectedNetwork={selectedNetwork} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
