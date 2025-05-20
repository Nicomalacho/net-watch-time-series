
// Network monitoring service
import { toast } from "sonner";

export interface NetworkSnapshot {
  timestamp: number;
  pingTime: number;
  status: 'good' | 'warning' | 'error' | 'unknown';
  online: boolean;
}

export interface NetworkStats {
  min: number;
  max: number;
  avg: number;
  currentPing: number;
  lastUpdated: Date;
  packetLoss: number;
  status: 'good' | 'warning' | 'error' | 'unknown';
}

class NetworkService {
  private data: NetworkSnapshot[] = [];
  private intervalId: number | null = null;
  private subscribers: ((data: NetworkSnapshot[]) => void)[] = [];
  private statsSubscribers: ((stats: NetworkStats) => void)[] = [];
  private isMonitoring = false;
  private lastOnlineStatus = navigator.onLine;
  
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
  }

  private handleNetworkChange = () => {
    const isOnline = navigator.onLine;
    
    // Check if status changed
    if (isOnline !== this.lastOnlineStatus) {
      this.lastOnlineStatus = isOnline;
      
      if (isOnline) {
        toast.success("Internet connection restored");
      } else {
        toast.error("Internet connection lost");
      }
    }
  }

  subscribe(callback: (data: NetworkSnapshot[]) => void) {
    this.subscribers.push(callback);
    // Immediately send current data
    callback([...this.data]);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  subscribeToStats(callback: (stats: NetworkStats) => void) {
    this.statsSubscribers.push(callback);
    // Immediately send current stats
    callback(this.calculateStats());
    return () => {
      this.statsSubscribers = this.statsSubscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers() {
    const currentData = [...this.data];
    this.subscribers.forEach(callback => callback(currentData));
    
    const stats = this.calculateStats();
    this.statsSubscribers.forEach(callback => callback(stats));
  }

  private calculateStats(): NetworkStats {
    if (this.data.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        currentPing: 0,
        lastUpdated: new Date(),
        packetLoss: 0,
        status: 'unknown'
      };
    }

    // Filter out error values (-1)
    const validPings = this.data.filter(snapshot => snapshot.pingTime >= 0);
    const pingValues = validPings.map(snapshot => snapshot.pingTime);
    
    const min = pingValues.length > 0 ? Math.min(...pingValues) : 0;
    const max = pingValues.length > 0 ? Math.max(...pingValues) : 0;
    const avg = pingValues.length > 0 
      ? pingValues.reduce((sum, val) => sum + val, 0) / pingValues.length 
      : 0;
    
    const currentPing = this.data[this.data.length - 1]?.pingTime ?? 0;
    const packetLoss = this.data.length > 0 
      ? (this.data.filter(d => d.pingTime < 0).length / this.data.length) * 100 
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
      status
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
      online
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
  
  exportData(): string {
    if (this.data.length === 0) {
      return 'No data to export';
    }
    
    // Create CSV content
    const headers = ["Timestamp", "Date/Time", "Ping (ms)", "Status", "Online"];
    const csvContent = [
      headers.join(','),
      ...this.data.map(item => {
        const date = new Date(item.timestamp);
        const dateTimeStr = date.toLocaleString();
        return [
          item.timestamp,
          dateTimeStr,
          item.pingTime,
          item.status,
          item.online
        ].join(',');
      })
    ].join('\n');
    
    return csvContent;
  }
  
  downloadCSV() {
    const csvContent = this.exportData();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `network-data-${date}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Create singleton instance
export const networkService = new NetworkService();
