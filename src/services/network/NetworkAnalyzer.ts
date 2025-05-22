
import { NetworkSnapshot, NetworkStats } from './types';

class NetworkAnalyzer {
  // Get network data for charts (alias for getSnapshots)
  getNetworkData(snapshots: NetworkSnapshot[]): NetworkSnapshot[] {
    return snapshots;
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
  
  // Get historical metrics (aggregated data for charts)
  getHistoricalMetrics(snapshots: NetworkSnapshot[], timeframe: 'hour' | 'day' | 'week' = 'day') {
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
}

export default NetworkAnalyzer;
