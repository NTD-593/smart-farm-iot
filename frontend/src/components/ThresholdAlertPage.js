import React, { useState, useEffect } from 'react';
import { MdWarning, MdNotifications, MdNotificationsOff, MdRefresh, MdEmail, MdHistory, MdSync, MdEdit, MdSave, MdClose } from 'react-icons/md';
import { FaThermometerHalf, FaTint, FaFan, FaLightbulb, FaSun } from 'react-icons/fa';
import { GiWaterDrop } from 'react-icons/gi';
import { getThresholds, resetAlertState, loadThresholdsFromDB } from '../services/emailAlert';
import socketService from '../services/socket';
import api from '../services/api';
import './ThresholdAlertPage.css';

const ThresholdAlertPage = () => {
  const [thresholds, setThresholds] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [emailSent, setEmailSent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(null);
  const [editValues, setEditValues] = useState({ min: 0, max: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadThresholds();
    socketService.onThresholdAlert((newAlerts) => {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
      setEmailSent(prev => prev + newAlerts.length);
    });
  }, []);

  const loadThresholds = async () => {
    setLoading(true);
    try {
      await loadThresholdsFromDB();
      setThresholds(getThresholds());
    } catch (error) {
      console.error('Loi load nguong:', error);
    }
    setLoading(false);
  };

  const handleToggleAlert = () => {
    const newState = !alertEnabled;
    setAlertEnabled(newState);
    socketService.setThresholdAlertEnabled(newState);
  };

  const handleResetAlerts = () => {
    resetAlertState();
    setAlerts([]);
    setEmailSent(0);
  };

  const clearAlert = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const startEdit = (sensorType, config) => {
    setEditMode(sensorType);
    setEditValues({ min: config.min, max: config.max, device: config.device });
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditValues({ min: 0, max: 0 });
  };

  const saveThreshold = async (sensorType) => {
    setSaving(true);
    try {
      const device = editValues.device;
      await api.put(`/api/device-modes/${device}`, {
        mode: 'sensor',
        sensorConfig: {
          sensorType: sensorType,
          minThreshold: parseFloat(editValues.min),
          maxThreshold: parseFloat(editValues.max)
        }
      });
      await loadThresholds();
      setEditMode(null);
      alert('✅ Đã lưu ngưỡng thành công!');
    } catch (error) {
      console.error('Loi luu nguong:', error);
      alert('Loi: ' + (error.response?.data?.message || error.message));
    }
    setSaving(false);
  };

  const getSensorIcon = (sensorType) => {
    switch (sensorType) {
      case 'temperature': return <FaThermometerHalf className="icon temp" />;
      case 'humidity': return <FaTint className="icon humidity" />;
      case 'soilMoisture': return <GiWaterDrop className="icon soil" />;
      case 'light': return <FaSun className="icon light" />;
      default: return <MdWarning className="icon" />;
    }
  };

  const getDeviceIcon = (device) => {
    switch (device) {
      case 'pump': return <GiWaterDrop className="icon pump" />;
      case 'fan': return <FaFan className="icon fan" />;
      case 'lamp': return <FaLightbulb className="icon lamp" />;
      default: return <MdWarning className="icon" />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return new Date().toLocaleString('vi-VN');
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  const getDeviceName = (device) => ({ pump: 'Máy bơm', fan: 'Quạt', lamp: 'Đèn' }[device] || device);
  const getSensorName = (sensorType) => ({ temperature: 'Nhiệt độ', humidity: 'Độ ẩm KK', soilMoisture: 'Độ ẩm đất', light: 'Ánh sáng' }[sensorType] || sensorType);
  const getSensorUnit = (sensorType) => {
    if (sensorType === 'temperature') return '°C';
    if (sensorType === 'light') return ' lux';
    return '%';
  };

  return (
    <div className="threshold-page">
      <div className="page-header">
        <div className="header-left">
          <h1><MdWarning /> Cảnh báo ngưỡng</h1>
          <p>Cấu hình ngưỡng và theo dõi cảnh báo email</p>
        </div>
        <div className="header-right">
          <div className="stat-box"><MdEmail /><span>{emailSent} email</span></div>
          <button className="icon-btn" onClick={loadThresholds} disabled={loading} title="Dong bo">
            <MdSync className={loading ? 'spinning' : ''} />
          </button>
          <button className={`toggle-btn ${alertEnabled ? 'on' : 'off'}`} onClick={handleToggleAlert}>
            {alertEnabled ? <><MdNotifications /> Bật</> : <><MdNotificationsOff /> Tắt</>}
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="config-section">
          <div className="section-card">
            <div className="card-header">
              <h2>⚙️ Cấu hình ngưỡng</h2>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="loading">Đang tải...</div>
              ) : (
                <div className="threshold-list">
                  {Object.entries(thresholds).map(([sensorType, config]) => (
                    <div className={`threshold-item ${sensorType}`} key={sensorType}>
                      <div className="item-row">
                        <div className="item-left">
                          {getSensorIcon(sensorType)}
                          <span className="sensor-name">{getSensorName(sensorType)}</span>
                        </div>
                        <div className="item-center">
                          {editMode === sensorType ? (
                            <div className="edit-inputs">
                              <input 
                                type="number" 
                                value={editValues.min}
                                onChange={(e) => setEditValues({...editValues, min: e.target.value})}
                                className="num-input"
                              />
                              <span>-</span>
                              <input 
                                type="number" 
                                value={editValues.max}
                                onChange={(e) => setEditValues({...editValues, max: e.target.value})}
                                className="num-input"
                              />
                              <span className="unit">{getSensorUnit(sensorType)}</span>
                            </div>
                          ) : (
                            <div className="values">
                              <span className="min">{config.min}</span>
                              <span className="dash">-</span>
                              <span className="max">{config.max}</span>
                              <span className="unit">{getSensorUnit(sensorType)}</span>
                            </div>
                          )}
                        </div>
                        <div className="item-right">
                          <div className="device-tag">
                            {getDeviceIcon(config.device)}
                            <span>{getDeviceName(config.device)}</span>
                          </div>
                          {editMode === sensorType ? (
                            <div className="edit-btns">
                              <button className="save-btn" onClick={() => saveThreshold(sensorType)} disabled={saving}>
                                <MdSave />
                              </button>
                              <button className="cancel-btn" onClick={cancelEdit}>
                                <MdClose />
                              </button>
                            </div>
                          ) : (
                            <button className="edit-btn" onClick={() => startEdit(sensorType, config)}>
                              <MdEdit />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="item-note">
                        {sensorType === 'temperature' 
                          ? `> ${config.max}°C → Bật ${getDeviceName(config.device)}`
                          : sensorType === 'light'
                          ? `< ${config.min} lux → Bật ${getDeviceName(config.device)}`
                          : `< ${config.min}% → Bật ${getDeviceName(config.device)}`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="alerts-section">
          <div className="section-card">
            <div className="card-header">
              <h2><MdHistory /> Lịch sử cảnh báo</h2>
              <button className="clear-btn" onClick={handleResetAlerts}><MdRefresh /> Xóa</button>
            </div>
            <div className="card-body">
              <div className="alerts-list">
                {alerts.length === 0 ? (
                  <div className="no-alerts">
                    <MdNotifications />
                    <span>Chưa có cảnh báo</span>
                    <p>Cảnh báo xuất hiện khi vượt ngưỡng</p>
                  </div>
                ) : (
                  alerts.map((alert, index) => (
                    <div key={index} className={`alert-item ${alert.alertType}`} onClick={() => clearAlert(index)}>
                      <div className="alert-icon">{getSensorIcon(alert.sensorType)}</div>
                      <div className="alert-content">
                        <span className="alert-msg">{alert.message}</span>
                        <span className="alert-info">{alert.value} | Ngưỡng: {alert.threshold}</span>
                        <span className="alert-time">{formatTime(alert.timestamp)}</span>
                      </div>
                      <span className={`alert-tag ${alert.alertType}`}>{alert.alertType === 'high' ? 'CAO' : 'THẤP'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThresholdAlertPage;
