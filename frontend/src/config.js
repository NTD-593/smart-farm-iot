// App configuration
export const config = {
  // Device ID mặc định - thay đổi theo thiết bị của bạn
  DEFAULT_DEVICE_ID: 'farm01',
  
  // API endpoints
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'ws://localhost:8080',
  
  // Chart settings
  DEFAULT_CHART_HOURS: 24,
  CHART_REFRESH_INTERVAL: 60000, // 1 minute
  
  // WebSocket settings
  WS_RECONNECT_DELAY: 1000,
  WS_RECONNECT_ATTEMPTS: 5,
  
  // Data refresh
  DATA_REFRESH_INTERVAL: 30000, // 30 seconds
};

export default config;
