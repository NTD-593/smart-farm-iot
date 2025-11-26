import React, { createContext, useState, useContext, useEffect } from 'react';
import socketService from '../services/socket';
import { sensorAPI, deviceAPI } from '../services/api';

const FarmContext = createContext();

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarm phải được sử dụng trong FarmProvider');
  }
  return context;
};

export const FarmProvider = ({ children }) => {
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    soilMoisture: 0,
    timestamp: null
  });

  const [deviceStatus, setDeviceStatus] = useState({
    pump: 'off',
    fan: 'off',
    light: 'off'
  });

  const [isConnected, setIsConnected] = useState(false);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Kết nối Socket.io
    // Connect using browser WebSocket (service adapts to backend ws server)
    socketService.connect();

    socketService.onConnect(() => setIsConnected(true));
    socketService.onDisconnect(() => setIsConnected(false));

    // Lắng nghe dữ liệu cảm biến realtime
    socketService.onSensorData((data) => {
      setSensorData(data);
    });

    // Lắng nghe trạng thái thiết bị realtime
    socketService.onDeviceStatus((data) => {
      setDeviceStatus(prev => ({
        ...prev,
        [data.deviceName]: data.status
      }));
    });

    // Lấy dữ liệu ban đầu
    fetchInitialData();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      // Lấy dữ liệu cảm biến mới nhất
      const sensorRes = await sensorAPI.getLatest();
      if (sensorRes.data) {
        setSensorData(sensorRes.data);
      }

      // Lấy trạng thái thiết bị
      const deviceRes = await deviceAPI.getStatus();
      setDeviceStatus(deviceRes.data);

      // Lấy dữ liệu cho biểu đồ
      const chartRes = await sensorAPI.getChartData(24);
      setChartData(chartRes.data);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu ban đầu:', error);
    }
  };

  const controlDevice = async (deviceName, status) => {
    // Optimistic update - cập nhật UI ngay
    setDeviceStatus(prev => ({
      ...prev,
      [deviceName]: status
    }));

    try {
      await deviceAPI.control(deviceName, status);
      socketService.controlDevice({ deviceName, status });
    } catch (error) {
      console.error('Lỗi khi điều khiển thiết bị:', error);
      // Rollback nếu lỗi
      setDeviceStatus(prev => ({
        ...prev,
        [deviceName]: status === 'on' ? 'off' : 'on'
      }));
      throw error;
    }
  };

  const refreshChartData = async (hours = 24) => {
    try {
      const chartRes = await sensorAPI.getChartData(hours);
      setChartData(chartRes.data);
    } catch (error) {
      console.error('Lỗi khi làm mới dữ liệu biểu đồ:', error);
    }
  };

  const value = {
    sensorData,
    deviceStatus,
    isConnected,
    chartData,
    controlDevice,
    refreshChartData
  };

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
};
