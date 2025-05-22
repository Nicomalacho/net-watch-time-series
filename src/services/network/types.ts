
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

export interface HistoricalMetrics {
  availabilityPercentage: number;
  avgPing: number;
  p95Ping: number;
  avgDownloadSpeed: number;
  avgUploadSpeed: number;
}

export type MonitoringChangeCallback = (isMonitoring: boolean) => void;
