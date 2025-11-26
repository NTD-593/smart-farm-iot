import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import './Charts.css';

const Charts = () => {
  const [historyData, setHistoryData] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [visibleSensors, setVisibleSensors] = useState({
    temperature: true,
    humidity: true,
    soilMoisture: true
  });

  useEffect(() => {
    fetchHistoryData();
    const interval = setInterval(fetchHistoryData, 60000); // Cập nhật mỗi phút
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchHistoryData = async () => {
    try {
      console.log('📊 Fetching history data for range:', timeRange);
      setLoading(true);
      const response = await api.get(`/api/sensors/history?range=${timeRange}`);
      console.log('✅ History data received:', response.data);
      setHistoryData(response.data);
    } catch (error) {
      console.error('❌ Error fetching history:', error);
      // Set empty data on error
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  // Tính toán thống kê
  const calculateStats = (data, key) => {
    if (!data.length) return { avg: 0, min: 0, max: 0, current: 0, trend: 0 };
    
    const values = data.map(d => d[key]).filter(v => v !== null && v !== undefined);
    const current = values[values.length - 1] || 0;
    const previous = values[values.length - 2] || current;
    
    return {
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
      min: Math.min(...values).toFixed(1),
      max: Math.max(...values).toFixed(1),
      current: current.toFixed(1),
      trend: ((current - previous) / previous * 100).toFixed(1)
    };
  };

  const tempStats = calculateStats(historyData, 'temperature');
  const humidityStats = calculateStats(historyData, 'humidity');
  const soilStats = calculateStats(historyData, 'soilMoisture');

  // Format thời gian cho trục X
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    if (timeRange === '24h') {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  // Toggle hiển thị sensor
  const toggleSensor = (sensor) => {
    setVisibleSensors(prev => ({ ...prev, [sensor]: !prev[sensor] }));
  };

  // Export CSV
  const exportToCSV = () => {
    const headers = ['Thời gian', 'Nhiệt độ (°C)', 'Độ ẩm (%)', 'Độ ẩm đất (%)'];
    const csvContent = [
      headers.join(','),
      ...historyData.map(row => [
        new Date(row.timestamp).toLocaleString('vi-VN'),
        row.temperature || '',
        row.humidity || '',
        row.soilMoisture || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sensor-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="charts-page">
      <h1 style={{ marginBottom: '20px', color: '#2c3e50' }}>📈 Biểu đồ phân tích cảm biến</h1>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card temperature">
          <div className="stat-icon">🌡️</div>
          <div className="stat-content">
            <h3>Nhiệt độ</h3>
            <div className="stat-value">{tempStats.current}°C</div>
            <div className="stat-details">
              <span>TB: {tempStats.avg}°C</span>
              <span className={tempStats.trend >= 0 ? 'trend-up' : 'trend-down'}>
                {tempStats.trend >= 0 ? '↑' : '↓'} {Math.abs(tempStats.trend)}%
              </span>
            </div>
            <div className="stat-range">
              Min: {tempStats.min}°C | Max: {tempStats.max}°C
            </div>
          </div>
        </div>

        <div className="stat-card humidity">
          <div className="stat-icon">💧</div>
          <div className="stat-content">
            <h3>Độ ẩm</h3>
            <div className="stat-value">{humidityStats.current}%</div>
            <div className="stat-details">
              <span>TB: {humidityStats.avg}%</span>
              <span className={humidityStats.trend >= 0 ? 'trend-up' : 'trend-down'}>
                {humidityStats.trend >= 0 ? '↑' : '↓'} {Math.abs(humidityStats.trend)}%
              </span>
            </div>
            <div className="stat-range">
              Min: {humidityStats.min}% | Max: {humidityStats.max}%
            </div>
          </div>
        </div>

        <div className="stat-card soil">
          <div className="stat-icon">🌱</div>
          <div className="stat-content">
            <h3>Độ ẩm đất</h3>
            <div className="stat-value">{soilStats.current}%</div>
            <div className="stat-details">
              <span>TB: {soilStats.avg}%</span>
              <span className={soilStats.trend >= 0 ? 'trend-up' : 'trend-down'}>
                {soilStats.trend >= 0 ? '↑' : '↓'} {Math.abs(soilStats.trend)}%
              </span>
            </div>
            <div className="stat-range">
              Min: {soilStats.min}% | Max: {soilStats.max}%
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="chart-controls">
        <div className="time-filters">
          <button 
            className={timeRange === '1h' ? 'active' : ''} 
            onClick={() => setTimeRange('1h')}
          >
            1 giờ
          </button>
          <button 
            className={timeRange === '6h' ? 'active' : ''} 
            onClick={() => setTimeRange('6h')}
          >
            6 giờ
          </button>
          <button 
            className={timeRange === '24h' ? 'active' : ''} 
            onClick={() => setTimeRange('24h')}
          >
            24 giờ
          </button>
          <button 
            className={timeRange === '7d' ? 'active' : ''} 
            onClick={() => setTimeRange('7d')}
          >
            7 ngày
          </button>
        </div>

        <div className="sensor-toggles">
          <button 
            className={`toggle-btn temperature ${visibleSensors.temperature ? 'active' : ''}`}
            onClick={() => toggleSensor('temperature')}
          >
            Nhiệt độ
          </button>
          <button 
            className={`toggle-btn humidity ${visibleSensors.humidity ? 'active' : ''}`}
            onClick={() => toggleSensor('humidity')}
          >
            Độ ẩm
          </button>
          <button 
            className={`toggle-btn soil ${visibleSensors.soilMoisture ? 'active' : ''}`}
            onClick={() => toggleSensor('soilMoisture')}
          >
            Độ ẩm đất
          </button>
        </div>

        <button className="export-btn" onClick={exportToCSV}>
        Xuất CSV
        </button>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="loading">Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* Biểu đồ Nhiệt độ */}
          {visibleSensors.temperature && (
            <div className="chart-card">
              <h2>📊 Biểu đồ Nhiệt độ</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    stroke="#6c757d"
                  />
                  <YAxis 
                    stroke="#6c757d"
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString('vi-VN')}
                    formatter={(value) => [`${value}°C`, 'Nhiệt độ']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ff6b6b" 
                    strokeWidth={2}
                    dot={false}
                    name="Nhiệt độ (°C)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Biểu đồ Độ ẩm */}
          {visibleSensors.humidity && (
            <div className="chart-card">
              <h2>💧 Biểu đồ Độ ẩm</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    stroke="#6c757d"
                  />
                  <YAxis 
                    stroke="#6c757d"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString('vi-VN')}
                    formatter={(value) => [`${value}%`, 'Độ ẩm']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#4dabf7" 
                    strokeWidth={2}
                    dot={false}
                    name="Độ ẩm (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Biểu đồ Độ ẩm đất */}
          {visibleSensors.soilMoisture && (
            <div className="chart-card">
              <h2>🌱 Biểu đồ Độ ẩm đất</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    stroke="#6c757d"
                  />
                  <YAxis 
                    stroke="#6c757d"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString('vi-VN')}
                    formatter={(value) => [`${value}%`, 'Độ ẩm đất']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="soilMoisture" 
                    stroke="#51cf66" 
                    strokeWidth={2}
                    dot={false}
                    name="Độ ẩm đất (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Biểu đồ So sánh */}
          <div className="chart-card">
            <h2>📈 So sánh các cảm biến</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  stroke="#6c757d"
                />
                <YAxis stroke="#6c757d" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString('vi-VN')}
                />
                <Legend />
                {visibleSensors.temperature && (
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ff6b6b" 
                    strokeWidth={2}
                    dot={false}
                    name="Nhiệt độ (°C)"
                  />
                )}
                {visibleSensors.humidity && (
                  <Line 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#4dabf7" 
                    strokeWidth={2}
                    dot={false}
                    name="Độ ẩm (%)"
                  />
                )}
                {visibleSensors.soilMoisture && (
                  <Line 
                    type="monotone" 
                    dataKey="soilMoisture" 
                    stroke="#51cf66" 
                    strokeWidth={2}
                    dot={false}
                    name="Độ ẩm đất (%)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default Charts;
