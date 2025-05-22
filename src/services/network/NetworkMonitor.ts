
import { NetworkSnapshot, NetworkStats, MonitoringChangeCallback } from './types';
import MonitoringManager from './MonitoringManager';
import SnapshotManager, { calculateStats } from './SnapshotManager';

class NetworkMonitor {
  private monitoringManager: MonitoringManager;
  private snapshotManager: SnapshotManager;
  
  constructor() {
    this.monitoringManager = new MonitoringManager();
    this.snapshotManager = new SnapshotManager();
  }
  
  // Get list of detected networks
  getNetworks(): string[] {
    return this.snapshotManager.getNetworks();
  }
  
  // Start monitoring network
  startMonitoring(networkName?: string) {
    const currentNetwork = this.monitoringManager.startMonitoring(networkName);
    
    // Initialize network if it doesn't exist
    this.snapshotManager.initializeNetwork(currentNetwork);
    
    // Setup monitoring interval
    this.monitoringManager.setupMonitoringInterval(
      (snapshot) => this.snapshotManager.addSnapshot(snapshot),
      (network) => this.snapshotManager.getSnapshotsLength(network)
    );
  }
  
  // Stop monitoring
  stopMonitoring() {
    this.monitoringManager.stopMonitoring();
  }
  
  // Check if currently monitoring
  getMonitoringState(): boolean {
    return this.monitoringManager.getMonitoringState();
  }
  
  // Subscribe to monitoring state changes
  onMonitoringChange(callback: MonitoringChangeCallback): () => void {
    return this.monitoringManager.onMonitoringChange(callback);
  }
  
  // Get all snapshots for a specific network
  getSnapshots(networkName?: string): NetworkSnapshot[] {
    return this.snapshotManager.getSnapshots(networkName);
  }
  
  // Subscribe to snapshots updates
  subscribe(callback: (data: NetworkSnapshot[]) => void, networkName?: string): () => void {
    return this.snapshotManager.subscribe(callback, networkName);
  }
  
  // Calculate stats from snapshots
  calculateStats(snapshots: NetworkSnapshot[]): NetworkStats {
    return calculateStats(snapshots);
  }
}

export default NetworkMonitor;
