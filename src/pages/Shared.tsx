
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import NetworkChart from "@/components/NetworkChart";
import StatusIndicator from "@/components/StatusIndicator";
import { supabase } from "@/integrations/supabase/client";
import { NetworkSnapshot } from "@/services/networkService";

interface SharedLinkData {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
}

const Shared = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<SharedLinkData | null>(null);
  const [metrics, setMetrics] = useState<NetworkSnapshot[]>([]);

  useEffect(() => {
    const fetchSharedData = async () => {
      if (!slug) return;
      
      try {
        setIsLoading(true);
        
        // Fetch the share link data
        const { data: shareData, error: shareError } = await supabase
          .from('shared_links')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();
          
        if (shareError) throw shareError;
        if (!shareData) {
          setError('Shared link not found or has expired');
          setIsLoading(false);
          return;
        }
        
        setShareData(shareData);
        
        // Fetch network metrics for this user
        const { data: metricsData, error: metricsError } = await supabase
          .from('network_metrics')
          .select('*')
          .eq('user_id', shareData.user_id)
          .order('timestamp', { ascending: false })
          .limit(100);
          
        if (metricsError) throw metricsError;
        
        // Transform the data to match NetworkSnapshot format
        const transformedMetrics: NetworkSnapshot[] = metricsData.map(item => ({
          timestamp: item.timestamp,
          pingTime: item.ping_time,
          status: item.status as 'good' | 'warning' | 'error' | 'unknown',
          online: item.online,
          networkName: item.network_name,
          downloadSpeed: item.download_speed,
          uploadSpeed: item.upload_speed
        }));
        
        setMetrics(transformedMetrics);
      } catch (err: any) {
        console.error('Error fetching shared data:', err);
        setError(err.message || 'Failed to load shared data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSharedData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading shared metrics...</p>
        </div>
      </div>
    );
  }
  
  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error || 'Shared link not found'}</p>
            <Button 
              onClick={() => navigate('/')}
              className="mt-4 w-full"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      <div className="container mx-auto px-4">
        <header className="py-6 md:py-8 mb-2">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-2xl md:text-4xl font-bold">
            {shareData.title}
          </h1>
          
          {shareData.description && (
            <p className="text-muted-foreground mt-2">
              {shareData.description}
            </p>
          )}
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <StatusIndicator />
          </div>
          
          <div className="md:col-span-2">
            <NetworkChart sharedMetrics={metrics} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shared;
