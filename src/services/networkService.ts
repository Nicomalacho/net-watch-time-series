// Network monitoring service
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface NetworkSnapshot {
  timestamp: number;
  pingTime: number;
  status: 'good' | 'warning' | 'error' | 'unknown';
  online: boolean;
  networkName: string;
  downloadSpeed?: number; // Speed in Mbps
  uploadSpeed?: number;   // Speed in Mbps
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
  downloadSpeed?: number; // Current download speed in Mbps
  uploadSpeed?: number;   // Current upload speed in Mbps
  avgDownloadSpeed?: number; // Average download speed in Mbps
  avgUploadSpeed?: number;   // Average upload speed in Mbps
}

// Helper function to get user-friendly network type name
const getNetworkTypeName = (type: string): string => {
  switch (type) {
    case 'wifi': return 'WiFi';
    case 'cellular': return 'Cellular';
    case 'ethernet': return 'Ethernet';
    case 'none': return 'Offline';
    case 'other': return 'Other';
    case 'unknown': return 'Unknown';
    case 'wimax': return 'WiMax';
    case 'bluetooth': return 'Bluetooth';
    default: return type.charAt(0).toUpperCase() + type.slice(1) || 'Unknown';
  }
};

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
  private speedTestInterval = 30000; // 30 seconds between speed tests

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleNetworkChange);
    window.addEventListener('offline', this.handleNetworkChange);
    
    // Get initial network name
    this.updateNetworkName();
    
    // Add connection change listener if supported
    if ('connection' in navigator && 'addEventListener' in (navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', this.handleConnectionChange);
    }
  }

  private handleConnectionChange = () => {
    console.log('Connection change detected');
    this.updateNetworkName();
  };

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
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        
        // Try to get the network type
        const connectionType = connection?.type || 'unknown';
        console.log('Connection type:', connectionType);
        
        // Try to get additional info if available
        const effectiveType = connection?.effectiveType || '';
        console.log('Effective type:', effectiveType);
        
        // Combine information for more descriptive name
        let networkName = getNetworkTypeName(connectionType);
        
        // Add speed info if available
        if (effectiveType && effectiveType !== 'unknown') {
          const speedLabels: {[key: string]: string} = {
            'slow-2g': '(Very Slow)',
            '2g': '(Slow)',
            '3g': '(Medium)',
            '4g': '(Fast)',
            '5g': '(Very Fast)'
          };
          
          const speedLabel = speedLabels[effectiveType] || '';
          if (speedLabel) {
            networkName += ` ${speedLabel}`;
          }
        }
        
        // Add timestamp to make each network instance somewhat unique when changing between networks
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.currentNetworkName = `${networkName} (${timestamp})`;
        
        console.log('Detected network name:', this.currentNetworkName);
      } else {
        // Fallback
        this.currentNetworkName = navigator.onLine ? "Online Network" : "Offline";
      }
    } catch (error) {
      console.error('Error detecting network:', error);
      this.currentNetworkName = "Unknown Network";
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

  // Method to measure download speed
  async measureDownloadSpeed(): Promise<number> {
    try {
      const startTime = performance.now();
      const fileSize = 1024 * 500; // 500KB file size
      const testUrl = `https://www.cloudflare.com/cdn-cgi/trace?cache=${Date.now()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
      
      const response = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Calculate speed in Mbps (Megabits per second)
      // This is an approximation since we don't know the exact file size
      const downloadSpeedMbps = (fileSize * 8) / (durationSeconds * 1024 * 1024);
      
      return downloadSpeedMbps;
    } catch (error) {
      console.log('Speed measurement error:', error);
      return -1;
    }
  }

  // Method to measure upload speed (approximation)
  async measureUploadSpeed(): Promise<number> {
    try {
      const startTime = performance.now();
      const dataSize = 256 * 1024; // 256KB of data
      const testData = new Array(dataSize).fill('X').join('');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
      
      // Using a post request to simulate upload
      const response = await fetch('https://httpbin.org/post', {
        method: 'POST',
        body: testData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Calculate speed in Mbps
      const uploadSpeedMbps = (dataSize * 8) / (durationSeconds * 1024 * 1024);
      
      return uploadSpeedMbps;
    } catch (error) {
      console.log('Upload speed measurement error:', error);
      return -1;
    }
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
        networkName: networkName || 'All Networks',
        downloadSpeed: 0,
        uploadSpeed: 0,
        avgDownloadSpeed: 0,
        avgUploadSpeed: 0
      };
    }

    // Filter out error values (-1)
    const validPings = dataToAnalyze.filter(snapshot => snapshot.pingTime >= 0);
    const pingValues = validPings.map(snapshot => snapshot.pingTime);
    
    // Calculate download/upload speed averages
    const validDownloadSpeeds = dataToAnalyze
      .filter(snapshot => snapshot.downloadSpeed !== undefined && snapshot.downloadSpeed > 0)
      .map(snapshot => snapshot.downloadSpeed!);
      
    const validUploadSpeeds = dataToAnalyze
      .filter(snapshot => snapshot.uploadSpeed !== undefined && snapshot.uploadSpeed > 0)
      .map(snapshot => snapshot.uploadSpeed!);
    
    const min = pingValues.length > 0 ? Math.min(...pingValues) : 0;
    const max = pingValues.length > 0 ? Math.max(...pingValues) : 0;
    const avg = pingValues.length > 0 
      ? pingValues.reduce((sum, val) => sum + val, 0) / pingValues.length 
      : 0;
    
    const avgDownloadSpeed = validDownloadSpeeds.length > 0
      ? validDownloadSpeeds.reduce((sum, val) => sum + val, 0) / validDownloadSpeeds.length
      : 0;
      
    const avgUploadSpeed = validUploadSpeeds.length > 0
      ? validUploadSpeeds.reduce((sum, val) => sum + val, 0) / validUploadSpeeds.length
      : 0;
    
    const latestSnapshot = dataToAnalyze[dataToAnalyze.length - 1];
    const currentPing = latestSnapshot?.pingTime ?? 0;
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
      networkName: networkName || 'All Networks',
      downloadSpeed: latestSnapshot?.downloadSpeed,
      uploadSpeed: latestSnapshot?.uploadSpeed,
      avgDownloadSpeed,
      avgUploadSpeed
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
    
    // Time-based speed measurement
    // Only do speed test every 30 seconds to avoid overloading
    let downloadSpeed, uploadSpeed;
    if (Date.now() % this.speedTestInterval < this.monitoringFrequency) {
      downloadSpeed = await this.measureDownloadSpeed();
      uploadSpeed = await this.measureUploadSpeed();
    } else {
      // Use latest values if we're not doing a speed test this round
      const latestSnapshot = this.data[this.data.length - 1];
      downloadSpeed = latestSnapshot?.downloadSpeed;
      uploadSpeed = latestSnapshot?.uploadSpeed;
    }
    
    const snapshot: NetworkSnapshot = {
      timestamp: Date.now(),
      pingTime,
      status,
      online,
      networkName: this.currentNetworkName,
      downloadSpeed,
      uploadSpeed
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
    
    // Create CSV content with added speed metrics
    const headers = ["Timestamp", "Date/Time", "Ping (ms)", "Status", "Online", "Network", "Download (Mbps)", "Upload (Mbps)"];
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
          item.networkName,
          item.downloadSpeed !== undefined ? item.downloadSpeed.toFixed(2) : "N/A",
          item.uploadSpeed !== undefined ? item.uploadSpeed.toFixed(2) : "N/A"
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

  // Get historical metrics for time periods
  getHistoricalMetrics(networkName?: string, period: 'day'|'week'|'hour' = 'day') {
    const data = networkName 
      ? this.data.filter(item => item.networkName === networkName)
      : this.data;

    if (data.length === 0) {
      return {
        availabilityPercentage: 0,
        p95Ping: 0,
        p99Ping: 0,
        maxPing: 0,
        avgPing: 0,
        avgDownloadSpeed: 0,
        avgUploadSpeed: 0,
        timeframe: period
      };
    }
    
    // Filter data by time period
    const now = Date.now();
    const periodMs = period === 'hour' ? 3600000 : period === 'day' ? 86400000 : 604800000;
    const filteredData = data.filter(item => (now - item.timestamp) <= periodMs);
    
    if (filteredData.length === 0) {
      return {
        availabilityPercentage: 0,
        p95Ping: 0,
        p99Ping: 0,
        maxPing: 0,
        avgPing: 0,
        avgDownloadSpeed: 0,
        avgUploadSpeed: 0,
        timeframe: period
      };
    }
    
    // Calculate availability percentage
    const totalDataPoints = filteredData.length;
    const availableDataPoints = filteredData.filter(item => 
      item.online && item.pingTime >= 0 && item.pingTime < this.warningThreshold
    ).length;
    
    const availabilityPercentage = (availableDataPoints / totalDataPoints) * 100;
    
    // Calculate ping percentiles
    const validPings = filteredData
      .filter(item => item.pingTime >= 0)
      .map(item => item.pingTime)
      .sort((a, b) => a - b);
      
    const maxPing = validPings.length ? validPings[validPings.length - 1] : 0;
    const avgPing = validPings.length 
      ? validPings.reduce((sum, val) => sum + val, 0) / validPings.length 
      : 0;
      
    const p95Index = Math.floor(validPings.length * 0.95);
    const p99Index = Math.floor(validPings.length * 0.99);
    
    const p95Ping = validPings.length ? validPings[p95Index] : 0;
    const p99Ping = validPings.length ? validPings[p99Index] : 0;
    
    // Calculate average speeds
    const validDownloadSpeeds = filteredData
      .filter(item => item.downloadSpeed !== undefined && item.downloadSpeed > 0)
      .map(item => item.downloadSpeed!);
      
    const validUploadSpeeds = filteredData
      .filter(item => item.uploadSpeed !== undefined && item.uploadSpeed > 0)
      .map(item => item.uploadSpeed!);
    
    const avgDownloadSpeed = validDownloadSpeeds.length 
      ? validDownloadSpeeds.reduce((sum, val) => sum + val, 0) / validDownloadSpeeds.length 
      : 0;
      
    const avgUploadSpeed = validUploadSpeeds.length 
      ? validUploadSpeeds.reduce((sum, val) => sum + val, 0) / validUploadSpeeds.length 
      : 0;
    
    return {
      availabilityPercentage,
      p95Ping,
      p99Ping,
      maxPing,
      avgPing,
      avgDownloadSpeed,
      avgUploadSpeed,
      timeframe: period
    };
  }

  // Add method to sync data to Supabase
  async syncToSupabase(user_id: string | undefined) {
    if (!user_id) return;
    
    try {
      // Only sync the last 10 metrics to avoid overloading
      const metricsToSync = this.data.slice(-10);
      
      if (metricsToSync.length === 0) return;
      
      const { error } = await supabase.from('network_metrics')
        .insert(metricsToSync.map(metric => ({
          user_id,
          timestamp: metric.timestamp,
          ping_time: metric.pingTime,
          status: metric.status,
          online: metric.online,
          network_name: metric.networkName,
          download_speed: metric.downloadSpeed,
          upload_speed: metric.uploadSpeed
        })));
        
      if (error) {
        console.error('Error syncing metrics to Supabase:', error);
        throw error;
      }
      
      console.log('Successfully synced metrics to Supabase');
      return true;
    } catch (error) {
      console.error('Failed to sync metrics to Supabase:', error);
      return false;
    }
  }
  
  // Method to check for user session
  async getUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
}

// Create singleton instance
export const networkService = new NetworkService();
