import React, { useState, useEffect } from 'react';
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';
import { FaFan, FaLightbulb } from 'react-icons/fa';
import { GiWaterDrop } from 'react-icons/gi';
import GlobalModeSelector from './GlobalModeSelector';
import DeviceModeToggle from './DeviceModeToggle';
import SensorConfig from './SensorConfig';
import api from '../services/api';
import './DeviceControl.css';

const DeviceControl = () => {
  const { deviceStatus, controlDevice } = useFarm();
  const { user } = useAuth();
  const [loading, setLoading] = useState({});
  const [deviceModes, setDeviceModes] = useState({});
  const [showSensorConfig, setShowSensorConfig] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [error, setError] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [globalMode, setGlobalMode] = useState('manual');

  // Load device modes khi component mount
  useEffect(() => {
    loadDeviceModes();
  }, []);

  const loadDeviceModes = async () => {
    try {
      const response = await api.get('/api/device-modes');
      const modesMap = {};
      response.data.modes.forEach(mode => {
        modesMap[mode.deviceType] = mode;
      });
      setDeviceModes(modesMap);
      
      // Load global settings
      const globalSettings = response.data.modes.find(m => m.deviceType === 'global');
      if (globalSettings) {
        setSyncEnabled(globalSettings.syncMode || false);
        setGlobalMode(globalSettings.mode || 'manual');
      }
    } catch (err) {
      console.error('Error loading device modes:', err);
    }
  };

  const handleModeChange = async (deviceType, newMode) => {
    try {
      setError('');
      await api.patch(`/api/device-modes/${deviceType}/mode`, { mode: newMode });
      
      // Reload modes
      await loadDeviceModes();
      
      // Show sensor config modal if switching to sensor mode
      if (newMode === 'sensor') {
        setSelectedDevice(deviceType);
        setShowSensorConfig(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể đổi chế độ');
      console.error('Error changing mode:', err);
    }
  };

  const handleSensorConfigSave = async (config) => {
    try {
      await api.patch(`/api/device-modes/${selectedDevice}/sensor-config`, config);
      // Đợi reload config mới
      await loadDeviceModes();
      // Cập nhật lại modal với config mới bằng cách set lại selectedDevice
      // Điều này trigger re-render của SensorConfig với config mới
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Không thể lưu cấu hình');
    }
  };

  const handleSyncToggle = async (enabled) => {
    try {
      setError('');
      await api.patch('/api/device-modes/sync-toggle', { syncMode: enabled });
      setSyncEnabled(enabled);
      await loadDeviceModes();
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể thay đổi trạng thái đồng bộ');
      console.error('Error toggling sync:', err);
    }
  };

  const handleGlobalModeChange = async (newMode) => {
    try {
      setError('');
      await api.post('/api/device-modes/sync-all', { mode: newMode });
      setGlobalMode(newMode);
      await loadDeviceModes();
      
      // Show sensor config for pump if switching to sensor mode
      if (newMode === 'sensor') {
        setSelectedDevice('pump');
        setShowSensorConfig(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể đổi chế độ toàn cục');
      console.error('Error changing global mode:', err);
    }
  };

  const handleToggle = async (deviceName) => {
    const mode = deviceModes[deviceName]?.mode || 'manual';
    
    // Chỉ cho phép điều khiển thủ công khi ở chế độ manual
    if (mode !== 'manual') {
      alert(`Thiết bị đang ở chế độ ${mode === 'schedule' ? 'hẹn giờ' : 'cảm biến'}. Vui lòng chuyển về chế độ thủ công để điều khiển trực tiếp.`);
      return;
    }

    setLoading(prev => ({ ...prev, [deviceName]: true }));
    
    try {
      const newStatus = deviceStatus[deviceName] === 'on' ? 'off' : 'on';
      await controlDevice(deviceName, newStatus);
    } catch (error) {
      console.error('Lỗi điều khiển:', error);
      alert('Không thể điều khiển thiết bị. Vui lòng thử lại!');
    } finally {
      setLoading(prev => ({ ...prev, [deviceName]: false }));
    }
  };

  const openSensorConfig = (deviceType) => {
    setSelectedDevice(deviceType);
    setShowSensorConfig(true);
  };

  const isOperatorOrAdmin = () => {
    return user?.role === 'OPERATOR' || user?.role === 'ADMIN';
  };

  const devices = [
    {
      name: 'pump',
      label: 'Bơm Nước',
      icon: <GiWaterDrop />,
      color: '#3498db'
    },
    {
      name: 'fan',
      label: 'Quạt',
      icon: <FaFan />,
      color: '#1abc9c'
    },
    {
      name: 'lamp',
      label: 'Đèn',
      icon: <FaLightbulb />,
      color: '#f39c12'
    }
  ];

  return (
    <div className="device-control">
      <div className="device-header">
        <h2>⚡ Điều Khiển Thiết Bị</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Global Mode Selector */}
      {isOperatorOrAdmin() && (
        <GlobalModeSelector
          syncEnabled={syncEnabled}
          globalMode={globalMode}
          onSyncToggle={handleSyncToggle}
          onModeChange={handleGlobalModeChange}
          disabled={loading.globalMode}
        />
      )}

      <div className="device-cards">
        {devices.map(device => {
          const mode = deviceModes[device.name]?.mode || 'manual';
          const isManual = mode === 'manual';
          
          return (
            <div 
              key={device.name}
              className={`device-card ${deviceStatus[device.name] === 'on' ? 'active' : ''}`}
              style={{ '--device-color': device.color }}
            >
              {/* Individual Mode Toggle - Only show when sync is disabled */}
              {isOperatorOrAdmin() && !syncEnabled && (
                <DeviceModeToggle
                  deviceType={device.name}
                  currentMode={mode}
                  onModeChange={(newMode) => handleModeChange(device.name, newMode)}
                />
              )}

              <div className="device-icon">
                {device.icon}
              </div>
              
              <div className="device-info">
                <h3>{device.label}</h3>
                <span className={`status-badge ${deviceStatus[device.name]}`}>
                  {deviceStatus[device.name] === 'on' ? 'Đang bật' : 'Đang tắt'}
                </span>
                {!isManual && (
                  <span className="mode-indicator">
                    {mode === 'schedule' ? '⏰ Chế độ hẹn giờ' : '🤖 Chế độ cảm biến'}
                  </span>
                )}
              </div>

              <button
                className={`toggle-btn ${deviceStatus[device.name]} ${!isManual ? 'disabled' : ''}`}
                onClick={() => handleToggle(device.name)}
                disabled={loading[device.name] || !isManual}
                title={!isManual ? 'Chuyển về chế độ thủ công để điều khiển' : ''}
              >
                <div className="toggle-slider">
                  {loading[device.name] ? '...' : (deviceStatus[device.name] === 'on' ? 'ON' : 'OFF')}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Sensor Config Modal */}
      <SensorConfig
        key={`${selectedDevice}-${showSensorConfig}`}
        show={showSensorConfig}
        deviceType={selectedDevice}
        config={deviceModes[selectedDevice]?.sensorConfig}
        onSave={handleSensorConfigSave}
        onClose={() => setShowSensorConfig(false)}
      />
    </div>
  );
};

export default DeviceControl;
