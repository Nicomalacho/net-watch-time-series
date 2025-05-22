
// Mock functions for simulating network activity

// Mock function to simulate a ping
export const mockPing = async (): Promise<number> => {
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
export const mockSpeedTest = async (): Promise<{ download: number, upload: number }> => {
  // Simulate download speed between 10Mbps and 100Mbps
  const downloadSpeed = Math.random() * 90 + 10;
  
  // Simulate upload speed between 5Mbps and 30Mbps
  const uploadSpeed = Math.random() * 25 + 5;
  
  return { download: downloadSpeed, upload: uploadSpeed };
};
