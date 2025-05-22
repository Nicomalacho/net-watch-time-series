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
  private monitoringSubscribers: Set<MonitoringChangeCallback> = new Set();
  private currentNetwork: string | undefined;
  private isMonitoring: boolean = false;
  
  constructor() {
    // Initialize with default network
    this.snapshots.set('default', []);
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
}

// Export singleton instance
export const networkService = new NetworkService();
