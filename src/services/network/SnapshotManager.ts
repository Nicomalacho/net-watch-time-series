import { NetworkSnapshot, NetworkStats } from './types';
import { metricsStorage } from '../MetricsStorage';

class SnapshotManager {
  private snapshots: Map<string, NetworkSnapshot[]> = new Map();
  private subscribers: Map<string, Set<(data: NetworkSnapshot[]) => void>> = new Map();
  private statsSubscribers: Map<string, Set<(data: NetworkStats) => void>> = new Map();
  private networkList: string[] = ['Home WiFi', 'Office Network', 'Mobile Hotspot'];
  
  constructor() {
    // Initialize with default network
    this.snapshots.set('default', []);
  }
  
  // Get list of detected networks
  getNetworks(): string[] {
    return this.networkList;
  }
  
  // Add a new snapshot for a specific network
  async addSnapshot(snapshot: NetworkSnapshot) {
    const networkName = snapshot.networkName || 'default';
    console.log('SnapshotManager: Adding snapshot for network:', networkName, snapshot);
    
    if (!this.snapshots.has(networkName)) {
      this.snapshots.set(networkName, []);
    }
    
    const networkSnapshots = this.snapshots.get(networkName)!;
    
    // Keep only the last 100 snapshots
    if (networkSnapshots.length >= 100) {
      networkSnapshots.shift();
    }
    
    networkSnapshots.push(snapshot);
    console.log('SnapshotManager: Total snapshots for', networkName, ':', networkSnapshots.length);
    
    // Save to database (async, don't wait for it)
    metricsStorage.saveMetric(snapshot).catch(error => {
      console.error('SnapshotManager: Failed to save metric to database:', error);
    });
    
    // Notify subscribers of new data
    this.notifySubscribers(networkName);
    this.notifyStatsSubscribers(networkName);
    
    // Also notify 'default' subscribers if this is not the default network
    if (networkName !== 'default') {
      this.notifySubscribers('default');
      this.notifyStatsSubscribers('default');
    }
  }
  
  // Get snapshots length for a specific network
  getSnapshotsLength(networkName: string): number {
    return this.snapshots.get(networkName)?.length || 0;
  }
  
  // Get all snapshots for a specific network
  getSnapshots(networkName?: string): NetworkSnapshot[] {
    const name = networkName || 'default';
    return this.snapshots.get(name) || [];
  }
  
  // Subscribe to snapshots updates
  subscribe(callback: (data: NetworkSnapshot[]) => void, networkName?: string): () => void {
    const name = networkName || 'default';
    console.log('SnapshotManager: New subscription for network:', name);
    
    if (!this.subscribers.has(name)) {
      this.subscribers.set(name, new Set());
    }
    
    this.subscribers.get(name)!.add(callback);
    console.log('SnapshotManager: Total subscribers for', name, ':', this.subscribers.get(name)!.size);
    
    // Return unsubscribe function
    return () => {
      console.log('SnapshotManager: Unsubscribing from network:', name);
      const subs = this.subscribers.get(name);
      if (subs) {
        subs.delete(callback);
      }
    };
  }
  
  // Notify all subscribers for a specific network
  notifySubscribers(networkName: string) {
    const subs = this.subscribers.get(networkName);
    console.log('SnapshotManager: Notifying subscribers for network:', networkName, 'Count:', subs?.size || 0);
    
    if (subs) {
      const data = this.getSnapshots(networkName);
      console.log('SnapshotManager: Sending data with', data.length, 'snapshots');
      subs.forEach(callback => {
        callback(data);
      });
    }
  }
  
  // Subscribe to stats updates
  subscribeToStats(callback: (stats: NetworkStats) => void, networkName: string, calculateStatsFn: (snapshots: NetworkSnapshot[]) => NetworkStats): () => void {
    const name = networkName || 'default';
    
    if (!this.statsSubscribers.has(name)) {
      this.statsSubscribers.set(name, new Set());
    }
    
    this.statsSubscribers.get(name)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.statsSubscribers.get(name);
      if (subs) {
        subs.delete(callback);
      }
    };
  }
  
  // Notify all stats subscribers for a specific network
  notifyStatsSubscribers(networkName: string) {
    const subscribers = this.statsSubscribers.get(networkName);
    
    if (subscribers && subscribers.size > 0) {
      const stats = calculateStats(this.getSnapshots(networkName));
      subscribers.forEach(callback => {
        callback(stats);
      });
    }
  }
  
  // Initialize a network if it doesn't exist
  initializeNetwork(networkName: string): void {
    if (!this.snapshots.has(networkName)) {
      this.snapshots.set(networkName, []);
    }
  }
}

// Calculate stats from snapshots - extracted function to avoid circular dependency
function calculateStats(snapshots: NetworkSnapshot[]): NetworkStats {
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

export default SnapshotManager;
export { calculateStats };
