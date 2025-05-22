
import { NetworkSnapshot, MonitoringChangeCallback } from './types';
import { mockPing, mockSpeedTest } from './mockUtils';

class MonitoringManager {
  private intervalId: number | null = null;
  private currentNetwork: string | undefined;
  private isMonitoring: boolean = false;
  private monitoringSubscribers: Set<MonitoringChangeCallback> = new Set();
  
  // Start monitoring network
  startMonitoring(networkName?: string) {
    this.stopMonitoring();
    
    this.isMonitoring = true;
    this.currentNetwork = networkName || 'default';
    
    // Notify subscribers of monitoring state change
    this.notifyMonitoringSubscribers();
    
    return this.currentNetwork;
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
  notifyMonitoringSubscribers() {
    this.monitoringSubscribers.forEach(subscriber => {
      subscriber(this.isMonitoring);
    });
  }
  
  // Check the current network status
  async checkNetwork(currentNetwork: string | undefined): Promise<NetworkSnapshot> {
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
      networkName: currentNetwork,
    };
    
    return snapshot;
  }
  
  // Run speed test and update snapshot
  async runSpeedTest(snapshot: NetworkSnapshot): Promise<NetworkSnapshot> {
    const { download, upload } = await mockSpeedTest();
    return {
      ...snapshot,
      downloadSpeed: download,
      uploadSpeed: upload
    };
  }
  
  // Setup the monitoring interval
  setupMonitoringInterval(
    callback: (snapshot: NetworkSnapshot) => void, 
    getSnapshotsLength: (network: string) => number
  ): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = window.setInterval(async () => {
      if (!this.currentNetwork) return;
      
      const result = await this.checkNetwork(this.currentNetwork);
      
      // Every 5 checks, do a speed test
      const snapshotsLength = getSnapshotsLength(this.currentNetwork);
      if (snapshotsLength % 5 === 0) {
        const snapshotWithSpeed = await this.runSpeedTest(result);
        callback(snapshotWithSpeed);
      } else {
        callback(result);
      }
      
    }, 3000); // Check every 3 seconds
  }
}

export default MonitoringManager;
