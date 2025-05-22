
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Share2, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

const Share = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [title, setTitle] = useState("My Network Metrics");
  const [description, setDescription] = useState("Check out my network performance metrics.");
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      setIsAuthenticated(true);
      fetchShareLinks();
    };
    
    checkAuthStatus();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
      setIsAuthenticated(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchShareLinks = async () => {
    setIsLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      const { data, error } = await supabase
        .from('shared_links')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setShareLinks(data || []);
    } catch (err) {
      console.error('Error fetching share links:', err);
      toast.error('Failed to load your shared links');
    } finally {
      setIsLoading(false);
    }
  };
  
  const createShareLink = async () => {
    if (!isAuthenticated) {
      toast.error('You must be signed in to share your metrics');
      return;
    }
    
    setIsCreatingLink(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not found');
      
      // Generate a random slug
      const slug = Math.random().toString(36).substring(2, 10);
      
      const { data, error } = await supabase
        .from('shared_links')
        .insert({
          user_id: userData.user.id,
          slug,
          title,
          description,
          is_active: true
        })
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success('Share link created successfully');
      fetchShareLinks();
    } catch (err) {
      console.error('Error creating share link:', err);
      toast.error('Failed to create share link');
    } finally {
      setIsCreatingLink(false);
    }
  };
  
  const deleteShareLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shared_links')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Share link deleted');
      fetchShareLinks();
    } catch (err) {
      console.error('Error deleting share link:', err);
      toast.error('Failed to delete share link');
    }
  };
  
  const copyShareLink = (slug: string) => {
    const url = `${window.location.origin}/shared/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  if (!isAuthenticated) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      <div className="container mx-auto px-4">
        <header className="py-6 md:py-8 mb-6">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-2xl md:text-4xl font-bold mb-2">
            Share Your Metrics
          </h1>
          
          <p className="text-muted-foreground">
            Create a public link to share your network metrics with others
          </p>
        </header>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Create New Share Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Network Metrics"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                  <Textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Check out my network performance metrics."
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={createShareLink}
                  disabled={isCreatingLink || !title.trim()}
                  className="w-full"
                >
                  {isCreatingLink ? (
                    <span className="animate-spin mr-2">●</span>
                  ) : (
                    <Share2 className="h-4 w-4 mr-2" />
                  )}
                  Create Share Link
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Your Share Links</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading your share links...</p>
                </div>
              ) : shareLinks.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>You haven't created any share links yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {shareLinks.map((link) => (
                    <div key={link.id} className="py-3 first:pt-0 last:pb-0">
                      <h3 className="font-medium">{link.title}</h3>
                      {link.description && (
                        <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                      )}
                      <div className="flex mt-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyShareLink(link.slug)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Link
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`/shared/${link.slug}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteShareLink(link.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Share;
