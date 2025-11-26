import React from 'react';
import { useFarm } from '../context/FarmContext';
import { FaThermometerHalf, FaTint, FaSeedling } from 'react-icons/fa';
import './SensorDisplay.css';

const SensorDisplay = () => {
  const { sensorData, isConnected } = useFarm();

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  const getSensorColor = (type, value) => {
    if (type === 'temperature') {
      if (value < 20) return '#3498db';
      if (value < 30) return '#2ecc71';
      return '#e74c3c';
    }
    if (type === 'humidity' || type === 'soilMoisture') {
      if (value < 30) return '#e74c3c';
      if (value < 70) return '#2ecc71';
      return '#3498db';
    }
    return '#95a5a6';
  };

  return (
    <div className="sensor-display">
      <div className="sensor-header">
        <h2> Dữ Liệu Cảm Biến</h2>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
        </div>
      </div>

      <div className="sensor-cards">
        <div className="sensor-card" style={{ borderColor: getSensorColor('temperature', sensorData.temperature) }}>
          <div className="sensor-icon temperature">
            <FaThermometerHalf />
          </div>
          <div className="sensor-info">
            <h3>Nhiệt Độ</h3>
            <div className="sensor-value">
              {sensorData.temperature ? sensorData.temperature.toFixed(1) : '--'}°C
            </div>
          </div>
        </div>

        <div className="sensor-card" style={{ borderColor: getSensorColor('humidity', sensorData.humidity) }}>
          <div className="sensor-icon humidity">
            <FaTint />
          </div>
          <div className="sensor-info">
            <h3>Độ Ẩm Không Khí</h3>
            <div className="sensor-value">
              {sensorData.humidity ? sensorData.humidity.toFixed(1) : '--'}%
            </div>
          </div>
        </div>

        <div className="sensor-card" style={{ borderColor: getSensorColor('soilMoisture', sensorData.soilMoisture) }}>
          <div className="sensor-icon soil">
            <FaSeedling />
          </div>
          <div className="sensor-info">
            <h3>Độ Ẩm Đất</h3>
            <div className="sensor-value">
              {sensorData.soilMoisture ? sensorData.soilMoisture.toFixed(1) : '--'}%
            </div>
          </div>
        </div>
      </div>

      <div className="sensor-timestamp">
        <small>Cập nhật lần cuối: {formatTime(sensorData.timestamp)}</small>
      </div>
    </div>
  );
};

export default SensorDisplay;
