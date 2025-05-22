
import NetworkMonitor from './NetworkMonitor';
import NetworkAnalyzer from './NetworkAnalyzer';
import { NetworkSnapshot, NetworkStats } from './types';

class NetworkService {
  private monitor: NetworkMonitor;
  private analyzer: NetworkAnalyzer;
  
  constructor() {
    this.monitor = new NetworkMonitor();
    this.analyzer = new NetworkAnalyzer();
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
  
  // Analyzer methods
  getNetworkData(networkName?: string): NetworkSnapshot[] {
    return this.analyzer.getNetworkData(this.getSnapshots(networkName));
  }
  
  calculateStats(networkName?: string): NetworkStats {
    return this.analyzer.calculateStats(this.getSnapshots(networkName));
  }
  
  getHistoricalMetrics(networkName?: string, timeframe: 'hour' | 'day' | 'week' = 'day') {
    return this.analyzer.getHistoricalMetrics(this.getSnapshots(networkName), timeframe);
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
