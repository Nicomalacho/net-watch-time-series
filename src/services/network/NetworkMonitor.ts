
import { NetworkSnapshot, NetworkStats, MonitoringChangeCallback } from './types';
import { mockPing, mockSpeedTest } from './mockUtils';

class NetworkMonitor {
  private snapshots: Map<string, NetworkSnapshot[]> = new Map();
  private intervalId: number | null = null;
  private subscribers: Map<string, Set<(data: NetworkSnapshot[]) => void>> = new Map();
  private statsSubscribers: Map<string, Set<(data: NetworkStats) => void>> = new Map();
  private monitoringSubscribers: Set<MonitoringChangeCallback> = new Set();
  private currentNetwork: string | undefined;
  private isMonitoring: boolean = false;
  private networkList: string[] = ['Home WiFi', 'Office Network', 'Mobile Hotspot'];
  
  constructor() {
    // Initialize with default network
    this.snapshots.set('default', []);
  }
  
  // Get list of detected networks
  getNetworks(): string[] {
    return this.networkList;
  }
  
  // Start monitoring network
  startMonitoring(networkName?: string) {
    this.stopMonitoring();
    
    this.isMonitoring = true;
    this.currentNetwork = networkName || 'default';
    
    // Initialize network if it doesn't exist
    if (!this.snapshots.has(this.currentNetwork)) {
      this.snapshots.set(this.currentNetwork, []);
    }
    
    // Notify subscribers of monitoring state change
    this.notifyMonitoringSubscribers();
    
    this.intervalId = window.setInterval(async () => {
      const result = await this.checkNetwork();
      this.addSnapshot(result);
      
      // Notify subscribers of new data
      this.notifySubscribers();
      this.notifyStatsSubscribers();
    }, 3000); // Check every 3 seconds
  }
  
  // Stop monitoring
  stopMonitoring() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isMonitoring = false;
    this.notifyMonitoringSubscribers();
  }
  
  // Check if currently monitoring
  getMonitoringState(): boolean {
    return this.isMonitoring;
  }
  
  // Subscribe to monitoring state changes
  onMonitoringChange(callback: MonitoringChangeCallback): () => void {
    this.monitoringSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.monitoringSubscribers.delete(callback);
    };
  }
  
  // Notify all monitoring state subscribers
  private notifyMonitoringSubscribers() {
    this.monitoringSubscribers.forEach(subscriber => {
      subscriber(this.isMonitoring);
    });
  }
  
  // Check the current network status
  private async checkNetwork(): Promise<NetworkSnapshot> {
    const pingTime = await mockPing();
    const online = pingTime >= 0;
    
    // Determine network status based on ping time
    let status: NetworkSnapshot['status'] = 'unknown';
    if (online) {
      if (pingTime < 100) {
        status = 'good';
      } else if (pingTime < 300) {
        status = 'warning';
      } else {
        status = 'error';
      }
    } else {
      status = 'error';
    }
    
    let snapshot: NetworkSnapshot = {
      timestamp: Date.now(),
      pingTime,
      status,
      online,
      networkName: this.currentNetwork,
    };
    
    // Every 5 checks, do a speed test
    if (this.snapshots.get(this.currentNetwork!)?.length % 5 === 0) {
      const { download, upload } = await mockSpeedTest();
      snapshot.downloadSpeed = download;
      snapshot.uploadSpeed = upload;
    }
    
    return snapshot;
  }
  
  // Add a new snapshot for the current network
  private addSnapshot(snapshot: NetworkSnapshot) {
    const networkSnapshots = this.snapshots.get(this.currentNetwork!)!;
    
    // Keep only the last 100 snapshots
    if (networkSnapshots.length >= 100) {
      networkSnapshots.shift();
    }
    
    networkSnapshots.push(snapshot);
  }
  
  // Get all snapshots for a specific network
  getSnapshots(networkName?: string): NetworkSnapshot[] {
    const name = networkName || this.currentNetwork || 'default';
    return this.snapshots.get(name) || [];
  }
  
  // Subscribe to snapshots updates
  subscribe(callback: (data: NetworkSnapshot[]) => void, networkName?: string): () => void {
    const name = networkName || this.currentNetwork || 'default';
    
    if (!this.subscribers.has(name)) {
      this.subscribers.set(name, new Set());
    }
    
    this.subscribers.get(name)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(name);
      if (subs) {
        subs.delete(callback);
      }
    };
  }
  
  // Notify all subscribers for a specific network
  private notifySubscribers() {
    const name = this.currentNetwork || 'default';
    const subs = this.subscribers.get(name);
    
    if (subs) {
      const data = this.getSnapshots(name);
      subs.forEach(callback => {
        callback(data);
      });
    }
  }
  
  // Calculate stats from snapshots
  calculateStats(snapshots: NetworkSnapshot[]): NetworkStats {
    const recentSnapshots = snapshots.slice(-10); // Last 10 snapshots
    
    // If no snapshots, return default stats
    if (recentSnapshots.length === 0) {
      return {
        status: 'unknown',
        currentPing: 0,
        min: 0,
        max: 0,
        packetLoss: 0,
      };
    }
    
    // Calculate min and max ping time
    const pingTimes = recentSnapshots
      .filter(s => s.pingTime >= 0)
      .map(s => s.pingTime);
    
    const min = pingTimes.length > 0 ? Math.min(...pingTimes) : 0;
    const max = pingTimes.length > 0 ? Math.max(...pingTimes) : 0;
    
    // Calculate packet loss
    const packetLoss = recentSnapshots.length > 0 
      ? (recentSnapshots.filter(s => !s.online || s.pingTime < 0).length / recentSnapshots.length) * 100
      : 0;
    
    // Get latest snapshot for current status
    const latestSnapshot = recentSnapshots[recentSnapshots.length - 1];
    
    // Find the most recent speed test
    const latestWithSpeed = [...recentSnapshots].reverse()
      .find(s => s.downloadSpeed !== undefined && s.uploadSpeed !== undefined);
    
    return {
      status: latestSnapshot?.status || 'unknown',
      currentPing: latestSnapshot?.pingTime || 0,
      min,
      max,
      packetLoss,
      networkName: latestSnapshot?.networkName,
      downloadSpeed: latestWithSpeed?.downloadSpeed,
      uploadSpeed: latestWithSpeed?.uploadSpeed,
    };
  }
  
  // Notify all stats subscribers
  private notifyStatsSubscribers() {
    for (const [name, subscribers] of this.statsSubscribers.entries()) {
      const stats = this.calculateStats(this.getSnapshots(name));
      for (const callback of subscribers) {
        callback(stats);
      }
    }
  }
}

export default NetworkMonitor;
