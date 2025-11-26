import axios from 'axios';
import config from '../config';

const API_URL = config.API_URL;

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL
});

// Axios interceptor để tự động thêm token vào headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý lỗi 401 (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Sensor API - adapted to backend endpoints
export const sensorAPI = {
  // Backend GET /data returns paginated telemetry
  getLatest: async () => {
    const res = await api.get('/data', { params: { limit: 1 } });
    if (res.data.items && res.data.items.length > 0) {
      const item = res.data.items[0];
      return {
        data: {
          temperature: item.temperature || 0,
          humidity: item.humidity || 0,
          soilMoisture: item.humiGround || 0,
          timestamp: item.createdAt
        }
      };
    }
    return { data: null };
  },
  
  getHistory: (params) => api.get('/data', { params }),
  
  // Backend doesn't have /chart endpoint - we'll use /data/search
  getChartData: async (hours = 24) => {
    const device = config.DEFAULT_DEVICE_ID;
    const to = new Date();
    const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
    
    try {
      const res = await api.get('/data/search', {
        params: {
          device,
          from: from.toISOString(),
          to: to.toISOString()
        }
      });
      
      // Transform backend data to chart format
      const items = res.data.items || [];
      
      if (items.length === 0) {
        return { data: [] };
      }
      
      // Group by hour and calculate averages
      const groupedData = {};
      
      items.forEach(item => {
        if (!item.createdAt) return;
        
        const date = new Date(item.createdAt);
        // Format: "Nov 6, 14:00" để dễ đọc hơn
        const hourKey = `${date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })} ${String(date.getHours()).padStart(2, '0')}:00`;
        
        if (!groupedData[hourKey]) {
          groupedData[hourKey] = {
            _id: hourKey,
            timestamp: date.getTime(),
            temps: [],
            hums: [],
            soils: []
          };
        }
        
        if (item.temperature != null) groupedData[hourKey].temps.push(item.temperature);
        if (item.humidity != null) groupedData[hourKey].hums.push(item.humidity);
        if (item.humiGround != null) groupedData[hourKey].soils.push(item.humiGround);
      });
      
      // Sort by timestamp và calculate averages
      const chartData = Object.values(groupedData)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(g => ({
          _id: g._id,
          avgTemperature: g.temps.length ? g.temps.reduce((a,b) => a+b, 0) / g.temps.length : 0,
          avgHumidity: g.hums.length ? g.hums.reduce((a,b) => a+b, 0) / g.hums.length : 0,
          avgSoilMoisture: g.soils.length ? g.soils.reduce((a,b) => a+b, 0) / g.soils.length : 0
        }));
      
      return { data: chartData };
    } catch (err) {
      console.error('Chart data error:', err);
      return { data: [] };
    }
  }
};

// Device API - adapted to backend /control endpoint
export const deviceAPI = {
  // Backend doesn't have /devices/status endpoint
  getStatus: async () => {
    // Return default status - will be updated via WebSocket
    return {
      data: {
        pump: 'off',
        fan: 'off',
        light: 'off'
      }
    };
  },
  
  // Backend POST /control expects { device, cmd }
  control: (deviceName, status) => {
    const device = config.DEFAULT_DEVICE_ID;
    const cmd = {
      [deviceName]: status === 'on' ? 1 : 0
    };
    
    return api.post('/control', { device, cmd });
  },
  
  getHistory: (deviceName) => 
    api.get('/data', { params: { device: deviceName } })
};

// Health Check
export const healthCheck = () => api.get('/data');

// Default export để sử dụng với import api from './api'
export default api;
