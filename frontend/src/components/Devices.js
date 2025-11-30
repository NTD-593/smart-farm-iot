import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarm } from '../context/FarmContext';
import { 
  MdWaterDrop, 
  MdBolt, 
  MdPublic, 
  MdCheckCircle,
  MdAccessTime,
  MdBarChart,
  MdSchedule,
  MdCircle,
  MdLens,
  MdGrass,
  MdThermostat,
  MdWbSunny,
  MdPerson
} from 'react-icons/md';
import { FaFan } from 'react-icons/fa';
import { GiWaterDrop } from 'react-icons/gi';
import api from '../services/api';
import './Devices.css';

const Devices = () => {
  const navigate = useNavigate();
  const { deviceStatus, controlDevice } = useFarm();
  const [deviceModes, setDeviceModes] = useState({});
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [configModal, setConfigModal] = useState({ show: false, device: null });
  const [sensorConfig, setSensorConfig] = useState({ minThreshold: 0, maxThreshold: 100 });

  // Device configuration
  const devices = [
    {
      id: 'pump',
      name: 'Máy bơm',
      icon: <GiWaterDrop />,
      power: 200,
      color: '#4dabf7',
      sensor: 'Độ ẩm đất',
      sensorIcon: <MdGrass />,
      unit: '%'
    },
    {
      id: 'fan',
      name: 'Quạt',
      icon: <FaFan />,
      power: 100,
      color: '#51cf66',
      sensor: 'Nhiệt độ',
      sensorIcon: <MdThermostat />,
      unit: '°C'
    },
    {
      id: 'lamp',
      name: 'Đèn',
      icon: '💡',
      power: 250,
      color: '#ffd43b',
      sensor: 'Ánh sáng',
      sensorIcon: <MdWbSunny />,
      unit: 'lux'
    }
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [modesRes, historyRes, statsRes] = await Promise.all([
        api.get('/api/device-modes'),
        api.get(`/api/devices/history?device=${selectedDevice}`),
        api.get('/api/devices/stats')
      ]);
      
      console.log('📊 Device modes response:', modesRes.data);
      
      // Backend returns {modes: [...]} not array directly
      const modesArray = modesRes.data.modes || modesRes.data;
      
      // Transform array to object: [{deviceType: 'pump', mode: 'manual'}] → {pump: {mode: 'manual'}}
      const modesObj = {};
      if (Array.isArray(modesArray)) {
        modesArray.forEach(item => {
          modesObj[item.deviceType] = item;
        });
      }
      
      console.log('🔄 Transformed modes:', modesObj);
      setDeviceModes(modesObj);
      setHistory(historyRes.data || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Error fetching device data:', error);
      setHistory([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (deviceType) => {
    try {
      const currentStatus = deviceStatus[deviceType];
      const newStatus = currentStatus === 'on' ? 'off' : 'on';
      await controlDevice(deviceType, newStatus);
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const handleModeChange = async (deviceType, mode) => {
    console.log('🔄 Changing mode:', deviceType, '→', mode);
    try {
      const response = await api.patch(`/api/device-modes/${deviceType}/mode`, { mode });
      console.log('✅ Mode changed successfully:', response.data);
      
      // Fetch lại data ngay lập tức
      await fetchData();
      
      // Hiển thị config modal nếu chọn chế độ sensor
      if (mode === 'sensor') {
        openConfigModal(deviceType);
      }
    } catch (error) {
      console.error('❌ Error changing mode:', error);
      console.error('Error details:', error.response?.data);
      alert(`Lỗi: ${error.response?.data?.message || error.message}`);
    }
  };

  const openConfigModal = (deviceType) => {
    const currentConfig = deviceModes[deviceType];
    if (currentConfig) {
      setSensorConfig({
        minThreshold: currentConfig.minThreshold || 0,
        maxThreshold: currentConfig.maxThreshold || 100
      });
    }
    setConfigModal({ show: true, device: deviceType });
  };

  const closeConfigModal = () => {
    setConfigModal({ show: false, device: null });
  };

  const saveSensorConfig = async () => {
    try {
      await api.patch(`/api/device-modes/${configModal.device}/sensor-config`, sensorConfig);
      fetchData();
      closeConfigModal();
    } catch (error) {
      console.error('Error saving sensor config:', error);
    }
  };

  const handleQuickAction = async (action) => {
    try {
      switch (action) {
        case 'all-off':
          await Promise.all(devices.map(d => controlDevice(d.id, 'off')));
          break;
        case 'all-on':
          await Promise.all(devices.map(d => controlDevice(d.id, 'on')));
          break;
        case 'night-mode':
          await controlDevice('lamp', 'off');
          await controlDevice('fan', 'on');
          break;
        case 'reset':
          await Promise.all(devices.map(d => 
            api.patch(`/api/device-modes/${d.id}/mode`, { mode: 'manual' })
          ));
          fetchData();
          break;
      }
    } catch (error) {
      console.error('Error with quick action:', error);
    }
  };

  const getTotalPower = () => {
    return devices.reduce((total, device) => {
      return total + (deviceStatus[device.id] === 'on' ? device.power : 0);
    }, 0);
  };

  const getActiveCount = () => {
    return devices.filter(d => deviceStatus[d.id] === 'on').length;
  };

  const getTodayRuntime = (deviceId) => {
    const deviceStats = stats[deviceId];
    if (!deviceStats) return '0h 0m';
    const hours = Math.floor(deviceStats.todayRuntime / 60);
    const minutes = deviceStats.todayRuntime % 60;
    return `${hours}h ${minutes}m`;
  };

  const getToggleCount = (deviceId) => {
    return stats[deviceId]?.todayToggleCount || 0;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="devices-page">
      {/* Quick Overview */}
      <div className="overview-cards">
        <div className="overview-card">
          <div className="overview-icon"><MdWaterDrop size={32} style={{ color: '#4dabf7' }} /></div>
          <div className="overview-content">
            <div className="overview-label">Đang hoạt động</div>
            <div className="overview-value">{getActiveCount()}/3</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><MdBolt size={32} style={{ color: '#f39c12' }} /></div>
          <div className="overview-content">
            <div className="overview-label">Công suất</div>
            <div className="overview-value">{getTotalPower()}W</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><MdPublic size={32} style={{ color: '#51cf66' }} /></div>
          <div className="overview-content">
            <div className="overview-label">Trạng thái</div>
            <div className="overview-value"><MdCheckCircle size={20} style={{ color: '#28a745' }} /> Online</div>
          </div>
        </div>
      </div>

      {/* Device Control Cards */}
      <div className="devices-grid">
        {devices.map(device => {
          const isOn = deviceStatus[device.id] === 'on';
          const mode = deviceModes[device.id]?.mode || 'manual';
          
          return (
            <div key={device.id} className={`device-card ${isOn ? 'active' : ''}`}>
              <div className="device-header">
                <div className="device-icon" style={{ color: device.color }}>
                  {device.icon}
                </div>
                <div className="device-info">
                  <h3>{device.name}</h3>
                  <span className={`status-badge ${isOn ? 'on' : 'off'}`}>
                    {isOn ? <><MdCircle size={12} style={{ color: '#28a745' }} /> ĐANG BẬT</> : <><MdCircle size={12} style={{ color: '#6c757d' }} /> TẮT</>}
                  </span>
                </div>
              </div>

              <div className="device-stats">
                <div className="stat-item">
                  <span className="stat-icon"><MdAccessTime size={16} style={{ color: '#667eea' }} /></span>
                  <span>{getTodayRuntime(device.id)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon"><MdBarChart size={16} style={{ color: '#51cf66' }} /></span>
                  <span>{getToggleCount(device.id)} lần</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon"><MdBolt size={16} style={{ color: '#f39c12' }} /></span>
                  <span>{isOn ? device.power : 0}W</span>
                </div>
              </div>

              <button 
                className={`device-toggle ${isOn ? 'on' : 'off'}`}
                onClick={() => handleToggle(device.id)}
              >
                {isOn ? 'TẮT' : 'BẬT'}
              </button>

              <div className="device-modes">
                <div className="mode-label">Chế độ:</div>
                <div className="mode-buttons">
                  <button
                    className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
                    onClick={() => handleModeChange(device.id, 'manual')}
                  >
                    Thủ công
                  </button>
                  <button
                    className={`mode-btn ${mode === 'schedule' ? 'active' : ''}`}
                    onClick={() => handleModeChange(device.id, 'schedule')}
                  >
                    Hẹn giờ
                  </button>
                  <button
                    className={`mode-btn ${mode === 'sensor' ? 'active' : ''}`}
                    onClick={() => handleModeChange(device.id, 'sensor')}
                  >
                    Cảm biến
                  </button>
                </div>
                {/* Debug: Show current mode */}
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  Mode hiện tại: {mode || 'undefined'}
                </div>
              </div>

              <div className="device-sensor-info">
                <span>{device.sensorIcon} {device.sensor}</span>
                {deviceModes[device.id] && (
                  <span className="sensor-threshold">
                    {deviceModes[device.id].minThreshold} - {deviceModes[device.id].maxThreshold} {device.unit}
                  </span>
                )}
              </div>

              {/* Sensor Config Section */}
              {mode === 'sensor' && (
                <button 
                  className="config-btn"
                  onClick={() => openConfigModal(device.id)}
                >
                  Cấu hình ngưỡng
                </button>
              )}

              {/* Schedule Link */}
              {mode === 'schedule' && (
                <button 
                  className="config-btn"
                  onClick={() => navigate('/schedules')}
                >
                  Quản lý lịch hẹn giờ
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Điều khiển nhanh</h3>
        <div className="action-buttons">
          <button className="action-btn danger" onClick={() => handleQuickAction('all-off')}>
            Tắt tất cả
          </button>
          <button className="action-btn success" onClick={() => handleQuickAction('all-on')}>
            Bật tất cả
          </button>
          <button className="action-btn primary" onClick={() => handleQuickAction('night-mode')}>
           Chế độ đêm
          </button>
          <button className="action-btn secondary" onClick={() => handleQuickAction('reset')}>
             Reset
          </button>
        </div>
      </div>

      {/* Activity History */}
      <div className="device-history">
        <div className="history-header">
          <h3><MdAccessTime size={20} style={{ color: '#667eea' }} /> Lịch sử hoạt động</h3>
          <select 
            value={selectedDevice} 
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="device-filter"
          >
            <option value="all">Tất cả thiết bị</option>
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="history-timeline">
          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : history.length === 0 ? (
            <div className="no-data">Chưa có lịch sử hoạt động</div>
          ) : (
            history.slice(0, 20).map((item, index) => {
              const device = devices.find(d => d.id === item.device);
              return (
                <div key={index} className="history-item">
                  <div className={`history-indicator ${item.action === 'on' ? 'on' : 'off'}`}>
                    {item.action === 'on' ? <MdCircle size={12} style={{ color: '#28a745' }} /> : <MdCircle size={12} style={{ color: '#dc3545' }} />}
                  </div>
                  <div className="history-content">
                    <div className="history-time">{formatTime(item.timestamp)}</div>
                    <div className="history-text">
                      {device?.icon} <strong>{device?.name}</strong> → {item.action === 'on' ? 'BẬT' : 'TẮT'}
                      <span className="history-mode">({item.mode === 'manual' ? 'Thủ công' : item.mode === 'schedule' ? 'Hẹn giờ' : 'Tự động - Cảm biến'})</span>
                    </div>
                    {item.reason && (
                      <div className="history-reason">{item.reason}</div>
                    )}
                    {item.user && (
                      <div className="history-user"><MdPerson size={14} /> {item.user}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sensor Config Modal */}
      {configModal.show && (
        <div className="modal-overlay" onClick={closeConfigModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cấu hình cảm biến - {devices.find(d => d.id === configModal.device)?.name}</h3>
              <button className="modal-close" onClick={closeConfigModal}>✕</button>
            </div>
            
            <div className="modal-body">
              {configModal.device && (
                <>
                  <div className="config-info">
                    <span className="config-icon">
                      {devices.find(d => d.id === configModal.device)?.sensorIcon}
                    </span>
                    <span>
                      {devices.find(d => d.id === configModal.device)?.sensor}
                    </span>
                  </div>

                  <div className="config-field">
                    <label>
                      Ngưỡng tối thiểu ({devices.find(d => d.id === configModal.device)?.unit})
                    </label>
                    <input
                      type="number"
                      value={sensorConfig.minThreshold}
                      onChange={(e) => setSensorConfig({
                        ...sensorConfig,
                        minThreshold: Number(e.target.value)
                      })}
                      className="config-input"
                    />
                    <small>Thiết bị sẽ BẬT khi giá trị {'<'} ngưỡng này</small>
                  </div>

                  <div className="config-field">
                    <label>
                      Ngưỡng tối đa ({devices.find(d => d.id === configModal.device)?.unit})
                    </label>
                    <input
                      type="number"
                      value={sensorConfig.maxThreshold}
                      onChange={(e) => setSensorConfig({
                        ...sensorConfig,
                        maxThreshold: Number(e.target.value)
                      })}
                      className="config-input"
                    />
                    <small>Thiết bị sẽ TẮT khi giá trị {'>'} ngưỡng này</small>
                  </div>

                  <div className="config-preview">
                    <div className="preview-label"><MdBolt size={16} style={{ color: '#667eea' }} /> Hoạt động:</div>
                    <div className="preview-rule">
                      <MdCircle size={12} style={{ color: '#28a745' }} /> BẬT: {devices.find(d => d.id === configModal.device)?.sensor} {'<'} {sensorConfig.minThreshold} {devices.find(d => d.id === configModal.device)?.unit}
                    </div>
                    <div className="preview-rule">
                      <MdCircle size={12} style={{ color: '#dc3545' }} /> TẮT: {devices.find(d => d.id === configModal.device)?.sensor} {'>'} {sensorConfig.maxThreshold} {devices.find(d => d.id === configModal.device)?.unit}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeConfigModal}>
                Hủy
              </button>
              <button className="btn-save" onClick={saveSensorConfig}>
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;
