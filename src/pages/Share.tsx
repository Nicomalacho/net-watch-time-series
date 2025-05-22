
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowUp, Copy, ExternalLink } from "lucide-react";
import NetworkChart from "@/components/NetworkChart";
import StatusIndicator from "@/components/StatusIndicator";
import { supabase } from "@/integrations/supabase/client";

const Share = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    getSession();
    
    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      
      if (!session?.user) {
        navigate('/auth');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
  const generateRandomSlug = () => {
    return Math.random().toString(36).substring(2, 8) + 
           Math.random().toString(36).substring(2, 8);
  };
  
  const handleCreateShare = async () => {
    if (!user) {
      toast.error("You must be logged in to create a shared link");
      navigate('/auth');
      return;
    }
    
    if (!shareTitle) {
      toast.error("Please provide a title for your shared metrics");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const newSlug = slug || generateRandomSlug();
      
      const { error } = await supabase
        .from('shared_links')
        .insert({
          user_id: user.id,
          slug: newSlug,
          title: shareTitle,
          description: shareDescription
        });
        
      if (error) throw error;
      
      const shareLink = `${window.location.origin}/shared/${newSlug}`;
      setShareUrl(shareLink);
      setSlug(newSlug);
      toast.success("Share link created successfully!");
    } catch (error: any) {
      console.error("Error creating share link:", error);
      toast.error(error.message || "Failed to create share link");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      <div className="container mx-auto px-4">
        <header className="py-6 md:py-8 mb-2 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Share Network Metrics
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a public link to share your network monitoring data
            </p>
          </div>
          <Button onClick={() => navigate("/")} size="sm" variant="outline" className="flex items-center gap-1">
            <ArrowUp className="h-4 w-4 rotate-90" />
            Back to Dashboard
          </Button>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Create Share Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="My Network Metrics"
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Textarea
                    placeholder="Details about these metrics..."
                    value={shareDescription}
                    onChange={(e) => setShareDescription(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom URL Slug (Optional)</label>
                  <Input
                    placeholder="custom-url"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank for auto-generated
                  </p>
                </div>
                
                <Button 
                  onClick={handleCreateShare}
                  disabled={isLoading || !shareTitle}
                  className="w-full"
                >
                  {isLoading ? "Creating..." : "Create Share Link"}
                </Button>
                
                {shareUrl && (
                  <div className="pt-4 border-t mt-4">
                    <p className="text-sm font-medium mb-2">Your share link:</p>
                    <div className="flex gap-2">
                      <Input value={shareUrl} readOnly />
                      <Button size="icon" variant="outline" onClick={handleCopyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.open(shareUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Link
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is what visitors will see when they access your shared link.</p>
              </CardContent>
            </Card>
            
            <div className="space-y-4">
              <StatusIndicator />
              <NetworkChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Share;
