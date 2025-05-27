
import { supabase } from "@/integrations/supabase/client";
import { NetworkSnapshot } from "./network/types";

class MetricsStorage {
  async saveMetric(snapshot: NetworkSnapshot): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Only save if user is authenticated
      if (user) {
        const { error } = await supabase
          .from('network_metrics')
          .insert({
            user_id: user.id,
            timestamp: snapshot.timestamp,
            ping_time: snapshot.pingTime,
            status: snapshot.status,
            online: snapshot.online,
            network_name: snapshot.networkName || 'default',
            download_speed: snapshot.downloadSpeed || null,
            upload_speed: snapshot.uploadSpeed || null
          });

        if (error) {
          console.error('Error saving metric to database:', error);
        } else {
          console.log('MetricsStorage: Saved metric to database:', snapshot);
        }
      }
    } catch (error) {
      console.error('MetricsStorage: Failed to save metric:', error);
    }
  }

  async getMetrics(userId: string, limit: number = 100): Promise<NetworkSnapshot[]> {
    try {
      const { data, error } = await supabase
        .from('network_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching metrics from database:', error);
        return [];
      }

      // Transform database data to NetworkSnapshot format
      return data.map(item => ({
        timestamp: item.timestamp,
        pingTime: item.ping_time,
        status: item.status as 'good' | 'warning' | 'error' | 'unknown',
        online: item.online,
        networkName: item.network_name,
        downloadSpeed: item.download_speed,
        uploadSpeed: item.upload_speed
      }));
    } catch (error) {
      console.error('MetricsStorage: Failed to fetch metrics:', error);
      return [];
    }
  }
}

export const metricsStorage = new MetricsStorage();
