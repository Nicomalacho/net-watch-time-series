
// Define the types for our network service
export interface NetworkSnapshot {
  timestamp: number;
  pingTime: number;
  status: 'good' | 'warning' | 'error' | 'unknown';
  online: boolean;
  networkName?: string;
  downloadSpeed?: number;
  uploadSpeed?: number;
}

export interface NetworkStats {
  status: 'good' | 'warning' | 'error' | 'unknown';
  currentPing: number;
  min: number;
  max: number;
  packetLoss: number;
  networkName?: string;
  downloadSpeed?: number;
  uploadSpeed?: number;
}

// Mock function to simulate a ping
const mockPing = async (): Promise<number> => {
  // Simulate network latency between 10ms and 200ms
  const pingTime = Math.random() * 190 + 10;
  
  // 10% chance of high latency
  if (Math.random() < 0.1) {
    return pingTime + 300;
  }
  
  // 5% chance of very high latency
  if (Math.random() < 0.05) {
    return pingTime + 800;
  }
  
  // 2% chance of timeout
  if (Math.random() < 0.02) {
    return -1; // Representing timeout
  }
  
  return pingTime;
};

// Mock function to simulate a speed test
const mockSpeedTest = async (): Promise<{ download: number, upload: number }> => {
  // Simulate download speed between 10Mbps and 100Mbps
  const downloadSpeed = Math.random() * 90 + 10;
  
  // Simulate upload speed between 5Mbps and 30Mbps
  const uploadSpeed = Math.random() * 25 + 5;
  
  return { download: downloadSpeed, upload: uploadSpeed };
};

type MonitoringChangeCallback = (isMonitoring: boolean) => void;

// Network service class
class NetworkService {
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
  
  // Get network data for charts (alias for getSnapshots)
  getNetworkData(networkName?: string): NetworkSnapshot[] {
    return this.getSnapshots(networkName);
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
  
  // Calculate stats from snapshots
  calculateStats(networkName?: string): NetworkStats {
    const snapshots = this.getSnapshots(networkName);
    const recentSnapshots = snapshots.slice(-10); // Last 10 snapshots
    
    // If no snapshots, return default stats
    if (recentSnapshots.length === 0) {
      return {
        status: 'unknown',
        currentPing: 0,
        min: 0,
        max: 0,
        packetLoss: 0,
        networkName: networkName,
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
  
  // Subscribe to stats updates
  subscribeToStats(callback: (stats: NetworkStats) => void, networkName?: string): () => void {
    const name = networkName || this.currentNetwork || 'default';
    
    if (!this.statsSubscribers.has(name)) {
      this.statsSubscribers.set(name, new Set());
    }
    
    this.statsSubscribers.get(name)!.add(callback);
    
    // Send initial stats
    const initialStats = this.calculateStats(name);
    callback(initialStats);
    
    // Return unsubscribe function
    return () => {
      const subs = this.statsSubscribers.get(name);
      if (subs) {
        subs.delete(callback);
      }
    };
  }
  
  // Notify all stats subscribers
  private notifyStatsSubscribers() {
    for (const [name, subscribers] of this.statsSubscribers.entries()) {
      const stats = this.calculateStats(name);
      for (const callback of subscribers) {
        callback(stats);
      }
    }
  }

  // Get historical metrics (aggregated data for charts)
  getHistoricalMetrics(networkName?: string, timeframe: 'hour' | 'day' | 'week' = 'day') {
    const snapshots = this.getSnapshots(networkName);
    
    if (snapshots.length === 0) {
      return {
        availabilityPercentage: 0,
        avgPing: 0,
        p95Ping: 0,
        avgDownloadSpeed: 0,
        avgUploadSpeed: 0
      };
    }
    
    const now = Date.now();
    const timeframeMs = {
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000
    }[timeframe];
    
    // Filter snapshots by timeframe
    const filteredSnapshots = snapshots.filter(s => now - s.timestamp <= timeframeMs);
    
    if (filteredSnapshots.length === 0) {
      return {
        availabilityPercentage: 0,
        avgPing: 0,
        p95Ping: 0,
        avgDownloadSpeed: 0,
        avgUploadSpeed: 0
      };
    }
    
    // Calculate availability percentage
    const availabilityPercentage = 
      (filteredSnapshots.filter(s => s.online && s.pingTime >= 0 && s.pingTime < 300).length / 
      filteredSnapshots.length) * 100;
    
    // Calculate average ping time
    const validPings = filteredSnapshots.filter(s => s.pingTime >= 0);
    const avgPing = validPings.length > 0
      ? validPings.reduce((sum, s) => sum + s.pingTime, 0) / validPings.length
      : 0;
    
    // Calculate P95 ping time
    const pingTimes = validPings.map(s => s.pingTime).sort((a, b) => a - b);
    const p95Index = Math.floor(pingTimes.length * 0.95);
    const p95Ping = pingTimes.length > 0 ? pingTimes[p95Index] || pingTimes[pingTimes.length - 1] : 0;
    
    // Calculate average download and upload speeds
    const speedSnapshots = filteredSnapshots.filter(
      s => s.downloadSpeed !== undefined && s.uploadSpeed !== undefined
    );
    const avgDownloadSpeed = speedSnapshots.length > 0
      ? speedSnapshots.reduce((sum, s) => sum + (s.downloadSpeed || 0), 0) / speedSnapshots.length
      : 0;
    const avgUploadSpeed = speedSnapshots.length > 0
      ? speedSnapshots.reduce((sum, s) => sum + (s.uploadSpeed || 0), 0) / speedSnapshots.length
      : 0;
    
    return {
      availabilityPercentage,
      avgPing,
      p95Ping,
      avgDownloadSpeed,
      avgUploadSpeed
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
}

// Export singleton instance
export const networkService = new NetworkService();
