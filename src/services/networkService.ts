
// Network monitoring service
import { toast } from "sonner";

export interface NetworkSnapshot {
  timestamp: number;
  pingTime: number;
  status: 'good' | 'warning' | 'error' | 'unknown';
  online: boolean;
  networkName: string;
}

export interface NetworkStats {
  min: number;
  max: number;
  avg: number;
  currentPing: number;
  lastUpdated: Date;
  packetLoss: number;
  status: 'good' | 'warning' | 'error' | 'unknown';
  networkName: string;
}

class NetworkService {
  private data: NetworkSnapshot[] = [];
  private intervalId: number | null = null;
  private subscribers: ((data: NetworkSnapshot[]) => void)[] = [];
  private statsSubscribers: ((stats: NetworkStats) => void)[] = [];
  private isMonitoring = false;
  private lastOnlineStatus = navigator.onLine;
  private currentNetworkName = "Unknown";
  
  // Configuration
  private monitoringFrequency = 3000; // 3 seconds
  private maxDataPoints = 100; // Maximum data points to keep (5 minutes at 3s frequency)
  private pingTimeout = 2000; // 2 second timeout for ping
  private goodThreshold = 150; // ms - Anything below is considered good
  private warningThreshold = 300; // ms - Anything below is warning, above is error

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleNetworkChange);
    window.addEventListener('offline', this.handleNetworkChange);
    
    // Get initial network name
    this.updateNetworkName();
  }

  private handleNetworkChange = () => {
    const isOnline = navigator.onLine;
    
    // Check if status changed
    if (isOnline !== this.lastOnlineStatus) {
      this.lastOnlineStatus = isOnline;
      
      if (isOnline) {
        this.updateNetworkName();
        toast.success("Internet connection restored");
      } else {
        toast.error("Internet connection lost");
      }
    }
  }

  // Method to update current network name
  private async updateNetworkName() {
    try {
      if ('connection' in navigator && 'networkInfo' in (navigator as any).connection) {
        // For browsers that support NetworkInformation API
        this.currentNetworkName = (navigator as any).connection.networkInfo?.name || "Unknown";
      } else {
        // Fallback: try to determine network name from connection type
        const connectionType = ('connection' in navigator) ? 
          (navigator as any).connection?.type || "Unknown" : "Unknown";
        
        this.currentNetworkName = connectionType === 'wifi' ? "WiFi" : 
          connectionType === 'cellular' ? "Cellular" : 
          connectionType === 'ethernet' ? "Ethernet" : "Unknown";
      }
    } catch (error) {
      this.currentNetworkName = "Unknown";
    }
  }

  // Get all unique network names
  getNetworks(): string[] {
    const networkSet = new Set<string>(this.data.map(item => item.networkName));
    return Array.from(networkSet);
  }

  // Get data for a specific network
  getNetworkData(networkName?: string): NetworkSnapshot[] {
    if (!networkName) return [...this.data];
    return this.data.filter(item => item.networkName === networkName);
  }

  subscribe(callback: (data: NetworkSnapshot[]) => void, networkName?: string) {
    const wrappedCallback = (data: NetworkSnapshot[]) => {
      if (networkName) {
        callback(data.filter(item => item.networkName === networkName));
      } else {
        callback(data);
      }
    };
    
    this.subscribers.push(wrappedCallback);
    // Immediately send current data
    wrappedCallback([...this.data]);
    
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== wrappedCallback);
    };
  }

  subscribeToStats(callback: (stats: NetworkStats) => void, networkName?: string) {
    const wrappedCallback = (stats: NetworkStats) => {
      // Only send stats if they match the requested network or no network specified
      if (!networkName || stats.networkName === networkName) {
        callback(stats);
      }
    };
    
    this.statsSubscribers.push(wrappedCallback);
    // Immediately send current stats
    wrappedCallback(this.calculateStats(networkName));
    
    return () => {
      this.statsSubscribers = this.statsSubscribers.filter(cb => cb !== wrappedCallback);
    };
  }

  private notifySubscribers() {
    const currentData = [...this.data];
    this.subscribers.forEach(callback => callback(currentData));
    
    // Calculate stats for each network and overall
    const networks = this.getNetworks();
    
    // Calculate overall stats
    const overallStats = this.calculateStats();
    this.statsSubscribers.forEach(callback => callback(overallStats));
    
    // Calculate stats for each network
    networks.forEach(network => {
      const networkStats = this.calculateStats(network);
      this.statsSubscribers.forEach(callback => callback(networkStats));
    });
  }

  private calculateStats(networkName?: string): NetworkStats {
    let dataToAnalyze = networkName 
      ? this.data.filter(snapshot => snapshot.networkName === networkName)
      : this.data;
      
    if (dataToAnalyze.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        currentPing: 0,
        lastUpdated: new Date(),
        packetLoss: 0,
        status: 'unknown',
        networkName: networkName || 'All Networks'
      };
    }

    // Filter out error values (-1)
    const validPings = dataToAnalyze.filter(snapshot => snapshot.pingTime >= 0);
    const pingValues = validPings.map(snapshot => snapshot.pingTime);
    
    const min = pingValues.length > 0 ? Math.min(...pingValues) : 0;
    const max = pingValues.length > 0 ? Math.max(...pingValues) : 0;
    const avg = pingValues.length > 0 
      ? pingValues.reduce((sum, val) => sum + val, 0) / pingValues.length 
      : 0;
    
    const currentPing = dataToAnalyze[dataToAnalyze.length - 1]?.pingTime ?? 0;
    const packetLoss = dataToAnalyze.length > 0 
      ? (dataToAnalyze.filter(d => d.pingTime < 0).length / dataToAnalyze.length) * 100 
      : 0;

    // Determine overall status
    let status: 'good' | 'warning' | 'error' | 'unknown' = 'unknown';
    if (!navigator.onLine) {
      status = 'error';
    } else if (currentPing < 0) {
      status = 'error';
    } else if (currentPing <= this.goodThreshold) {
      status = 'good';
    } else if (currentPing <= this.warningThreshold) {
      status = 'warning';
    } else {
      status = 'error';
    }

    return {
      min,
      max,
      avg,
      currentPing,
      lastUpdated: new Date(),
      packetLoss,
      status,
      networkName: networkName || 'All Networks'
    };
  }

  async pingServer(): Promise<number> {
    const startTime = performance.now();
    const online = navigator.onLine;

    if (!online) {
      return -1;
    }

    try {
      // Create a unique URL to prevent caching
      const testUrl = `https://www.google.com/generate_204?cache=${Date.now()}`;
      
      // Use a timeout to catch slow connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.pingTimeout);
      
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const endTime = performance.now();
      return Math.round(endTime - startTime);
    } catch (error) {
      console.log('Ping error:', error);
      return -1; // Error case
    }
  }

  async captureSnapshot() {
    // Update network name before capturing
    await this.updateNetworkName();
    
    const pingTime = await this.pingServer();
    const online = navigator.onLine;
    
    let status: 'good' | 'warning' | 'error' | 'unknown';
    if (!online) {
      status = 'error';
    } else if (pingTime < 0) {
      status = 'error';
    } else if (pingTime <= this.goodThreshold) {
      status = 'good';
    } else if (pingTime <= this.warningThreshold) {
      status = 'warning';
    } else {
      status = 'error';
    }
    
    const snapshot: NetworkSnapshot = {
      timestamp: Date.now(),
      pingTime,
      status,
      online,
      networkName: this.currentNetworkName
    };
    
    this.data.push(snapshot);
    
    // Limit the number of data points
    if (this.data.length > this.maxDataPoints) {
      this.data = this.data.slice(this.data.length - this.maxDataPoints);
    }
    
    this.notifySubscribers();
    return snapshot;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.captureSnapshot(); // Capture initial snapshot
    
    this.intervalId = window.setInterval(() => {
      this.captureSnapshot();
    }, this.monitoringFrequency);
  }
  
  stopMonitoring() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
  }
  
  clearData() {
    this.data = [];
    this.notifySubscribers();
  }
  
  exportData(networkName?: string): string {
    const dataToExport = networkName 
      ? this.data.filter(item => item.networkName === networkName)
      : this.data;
      
    if (dataToExport.length === 0) {
      return 'No data to export';
    }
    
    // Create CSV content
    const headers = ["Timestamp", "Date/Time", "Ping (ms)", "Status", "Online", "Network"];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(item => {
        const date = new Date(item.timestamp);
        const dateTimeStr = date.toLocaleString();
        return [
          item.timestamp,
          dateTimeStr,
          item.pingTime,
          item.status,
          item.online,
          item.networkName
        ].join(',');
      })
    ].join('\n');
    
    return csvContent;
  }
  
  downloadCSV(networkName?: string) {
    const csvContent = this.exportData(networkName);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    const network = networkName ? `-${networkName.replace(/[^a-z0-9]/gi, '-')}` : '';
    link.setAttribute('href', url);
    link.setAttribute('download', `network-data${network}-${date}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Create singleton instance
export const networkService = new NetworkService();

