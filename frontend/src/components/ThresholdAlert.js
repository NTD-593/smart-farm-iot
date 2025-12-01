import React, { useState, useEffect } from 'react';
import { MdWarning, MdSettings, MdNotifications, MdNotificationsOff, MdSave, MdRefresh } from 'react-icons/md';
import { FaThermometerHalf, FaTint, FaSeedling } from 'react-icons/fa';
import { getThresholds, updateThresholds, resetAlertState } from '../services/emailAlert';
import socketService from '../services/socket';
import './ThresholdAlert.css';

const ThresholdAlert = () => {
  const [thresholds, setThresholds] = useState(getThresholds());
  const [alerts, setAlerts] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [editThresholds, setEditThresholds] = useState({});

  useEffect(() => {
    // Lắng nghe cảnh báo ngưỡng từ socket
    socketService.onThresholdAlert((newAlerts) => {
      setAlerts(prev => {
        // Thêm cảnh báo mới, giữ tối đa 10 cảnh báo
        const updated = [...newAlerts, ...prev].slice(0, 10);
        return updated;
      });
    });

    // Load thresholds
    setThresholds(getThresholds());
    setEditThresholds(getThresholds());
  }, []);

  const handleToggleAlert = () => {
    const newState = !alertEnabled;
    setAlertEnabled(newState);
    socketService.setThresholdAlertEnabled(newState);
  };

  const handleSaveThresholds = () => {
    updateThresholds(editThresholds);
    setThresholds(editThresholds);
    setShowSettings(false);
    alert('Đã lưu cấu hình ngưỡng cảnh báo!');
  };

  const handleResetAlerts = () => {
    resetAlertState();
    setAlerts([]);
  };

  const handleThresholdChange = (sensorType, field, value) => {
    setEditThresholds(prev => ({
      ...prev,
      [sensorType]: {
        ...prev[sensorType],
        [field]: Number(value)
      }
    }));
  };

  const clearAlert = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const getSensorIcon = (sensorType) => {
    switch (sensorType) {
      case 'temperature':
        return <FaThermometerHalf className="sensor-icon temp" />;
      case 'humidity':
        return <FaTint className="sensor-icon humidity" />;
      case 'soilMoisture':
        return <FaSeedling className="sensor-icon soil" />;
      default:
        return <MdWarning className="sensor-icon" />;
    }
  };

  return (
    <div className="threshold-alert-container">
      {/* Header */}
      <div className="threshold-header">
        <h3>
          <MdWarning className="header-icon" />
          Cảnh báo ngưỡng
        </h3>
        <div className="header-actions">
          <button 
            className={`toggle-btn ${alertEnabled ? 'active' : ''}`}
            onClick={handleToggleAlert}
            title={alertEnabled ? 'Tắt cảnh báo' : 'Bật cảnh báo'}
          >
            {alertEnabled ? <MdNotifications /> : <MdNotificationsOff />}
          </button>
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Cài đặt ngưỡng"
          >
            <MdSettings />
          </button>
          <button 
            className="reset-btn"
            onClick={handleResetAlerts}
            title="Xóa cảnh báo"
          >
            <MdRefresh />
          </button>
        </div>
      </div>

      {/* Current Thresholds Display */}
      <div className="current-thresholds">
        <div className="threshold-item">
          <FaThermometerHalf className="icon temp" />
          <span>Nhiệt độ: {thresholds.temperature?.min}°C - {thresholds.temperature?.max}°C</span>
        </div>
        <div className="threshold-item">
          <FaTint className="icon humidity" />
          <span>Độ ẩm KK: {thresholds.humidity?.min}% - {thresholds.humidity?.max}%</span>
        </div>
        <div className="threshold-item">
          <FaSeedling className="icon soil" />
          <span>Độ ẩm đất: {thresholds.soilMoisture?.min}% - {thresholds.soilMoisture?.max}%</span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <h4>Cấu hình ngưỡng cảnh báo</h4>
          
          <div className="threshold-form">
            <div className="form-group">
              <label><FaThermometerHalf /> Nhiệt độ (°C)</label>
              <div className="range-inputs">
                <input
                  type="number"
                  value={editThresholds.temperature?.min || 0}
                  onChange={(e) => handleThresholdChange('temperature', 'min', e.target.value)}
                  placeholder="Min"
                />
                <span>-</span>
                <input
                  type="number"
                  value={editThresholds.temperature?.max || 0}
                  onChange={(e) => handleThresholdChange('temperature', 'max', e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="form-group">
              <label><FaTint /> Độ ẩm không khí (%)</label>
              <div className="range-inputs">
                <input
                  type="number"
                  value={editThresholds.humidity?.min || 0}
                  onChange={(e) => handleThresholdChange('humidity', 'min', e.target.value)}
                  placeholder="Min"
                />
                <span>-</span>
                <input
                  type="number"
                  value={editThresholds.humidity?.max || 0}
                  onChange={(e) => handleThresholdChange('humidity', 'max', e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="form-group">
              <label><FaSeedling /> Độ ẩm đất (%)</label>
              <div className="range-inputs">
                <input
                  type="number"
                  value={editThresholds.soilMoisture?.min || 0}
                  onChange={(e) => handleThresholdChange('soilMoisture', 'min', e.target.value)}
                  placeholder="Min"
                />
                <span>-</span>
                <input
                  type="number"
                  value={editThresholds.soilMoisture?.max || 0}
                  onChange={(e) => handleThresholdChange('soilMoisture', 'max', e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          <button className="save-btn" onClick={handleSaveThresholds}>
            <MdSave /> Lưu cấu hình
          </button>
        </div>
      )}

      {/* Alerts List */}
      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <MdNotifications />
            <span>Không có cảnh báo</span>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div 
              key={index} 
              className={`alert-item ${alert.alertType}`}
              onClick={() => clearAlert(index)}
            >
              {getSensorIcon(alert.sensorType)}
              <div className="alert-content">
                <span className="alert-message">{alert.message}</span>
                <span className="alert-time">
                  {new Date().toLocaleTimeString('vi-VN')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ThresholdAlert;
