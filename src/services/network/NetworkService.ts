
import NetworkMonitor from './NetworkMonitor';
import { NetworkSnapshot, NetworkStats } from './types';

class NetworkService {
  private monitor: NetworkMonitor;
  
  constructor() {
    this.monitor = new NetworkMonitor();
  }
  
  // Monitor methods
  getNetworks(): string[] {
    return this.monitor.getNetworks();
  }
  
  startMonitoring(networkName?: string) {
    this.monitor.startMonitoring(networkName);
  }
  
  stopMonitoring() {
    this.monitor.stopMonitoring();
  }
  
  getMonitoringState(): boolean {
    return this.monitor.getMonitoringState();
  }
  
  onMonitoringChange(callback: (isMonitoring: boolean) => void): () => void {
    return this.monitor.onMonitoringChange(callback);
  }
  
  getSnapshots(networkName?: string): NetworkSnapshot[] {
    return this.monitor.getSnapshots(networkName);
  }
  
  subscribe(callback: (data: NetworkSnapshot[]) => void, networkName?: string): () => void {
    return this.monitor.subscribe(callback, networkName);
  }
  
  // Analyzer methods (now using monitor)
  getNetworkData(networkName?: string): NetworkSnapshot[] {
    return this.getSnapshots(networkName);
  }
  
  calculateStats(networkName?: string): NetworkStats {
    return this.monitor.calculateStats(this.getSnapshots(networkName));
  }
  
  getHistoricalMetrics(networkName?: string, timeframe: 'hour' | 'day' | 'week' = 'day') {
    // Calculate historical metrics based on snapshots and timeframe
    const snapshots = this.getSnapshots(networkName);
    
    // Filter snapshots by timeframe
    const now = Date.now();
    let timeLimit: number;
    
    switch (timeframe) {
      case 'hour':
        timeLimit = now - (60 * 60 * 1000); // 1 hour
        break;
      case 'week':
        timeLimit = now - (7 * 24 * 60 * 60 * 1000); // 7 days
        break;
      case 'day':
      default:
        timeLimit = now - (24 * 60 * 60 * 1000); // 24 hours
        break;
    }
    
    const filteredSnapshots = snapshots.filter(s => s.timestamp >= timeLimit);
    
    if (filteredSnapshots.length === 0) {
      return {
        availabilityPercentage: 0,
        avgPing: 0,
        p95Ping: 0,
        avgDownloadSpeed: 0,
        avgUploadSpeed: 0,
        snapshots: []
      };
    }
    
    // Calculate metrics
    const onlineCount = filteredSnapshots.filter(s => s.online).length;
    const availabilityPercentage = (onlineCount / filteredSnapshots.length) * 100;
    
    // Calculate average ping (excluding failed pings)
    const validPings = filteredSnapshots.filter(s => s.online && s.pingTime >= 0);
    const avgPing = validPings.length > 0
      ? validPings.reduce((sum, s) => sum + s.pingTime, 0) / validPings.length
      : 0;
    
    // Calculate P95 ping
    const sortedPings = [...validPings].sort((a, b) => a.pingTime - b.pingTime);
    const p95Index = Math.floor(sortedPings.length * 0.95);
    const p95Ping = sortedPings.length > 0 ? sortedPings[p95Index >= sortedPings.length ? sortedPings.length - 1 : p95Index]?.pingTime || 0 : 0;
    
    // Calculate average speeds (from snapshots that have speed data)
    const snapshotsWithSpeed = filteredSnapshots.filter(
      s => s.downloadSpeed !== undefined && s.uploadSpeed !== undefined
    );
    
    const avgDownloadSpeed = snapshotsWithSpeed.length > 0
      ? snapshotsWithSpeed.reduce((sum, s) => sum + (s.downloadSpeed || 0), 0) / snapshotsWithSpeed.length
      : 0;
    
    const avgUploadSpeed = snapshotsWithSpeed.length > 0
      ? snapshotsWithSpeed.reduce((sum, s) => sum + (s.uploadSpeed || 0), 0) / snapshotsWithSpeed.length
      : 0;
    
    return {
      availabilityPercentage,
      avgPing,
      p95Ping,
      avgDownloadSpeed,
      avgUploadSpeed,
      snapshots: filteredSnapshots
    };
  }
  
  // Stats subscription
  subscribeToStats(callback: (stats: NetworkStats) => void, networkName?: string): () => void {
    const name = networkName || 'default';
    
    // Create a local stats map to store subscribers
    if (!this.statsSubscribers) {
      this.statsSubscribers = new Map<string, Set<(data: NetworkStats) => void>>();
    }
    
    if (!this.statsSubscribers.has(name)) {
      this.statsSubscribers.set(name, new Set());
    }
    
    this.statsSubscribers.get(name)!.add(callback);
    
    // Send initial stats
    const initialStats = this.calculateStats(name);
    callback(initialStats);
    
    // Create a subscription to network data to calculate stats
    const unsubscribe = this.subscribe(() => {
      const stats = this.calculateStats(name);
      callback(stats);
    }, name);
    
    // Return unsubscribe function
    return () => {
      unsubscribe();
      const subs = this.statsSubscribers.get(name);
      if (subs) {
        subs.delete(callback);
      }
    };
  }
  
  // Private property for stats subscribers
  private statsSubscribers = new Map<string, Set<(data: NetworkStats) => void>>();
}

// Export singleton instance
export const networkService = new NetworkService();
