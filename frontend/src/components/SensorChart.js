import React, { useEffect, useState } from 'react';
import { useFarm } from '../context/FarmContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './SensorChart.css';

const SensorChart = () => {
  const { chartData, refreshChartData } = useFarm();
  const [timeRange, setTimeRange] = useState(24);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChartData();
  }, [timeRange]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      await refreshChartData(timeRange);
    } catch (error) {
      console.error('Lỗi tải dữ liệu biểu đồ:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatData = () => {
    return chartData.map(item => ({
      time: item._id,
      'Nhiệt độ (°C)': parseFloat(item.avgTemperature.toFixed(1)),
      'Độ ẩm (%)': parseFloat(item.avgHumidity.toFixed(1)),
      'Độ ẩm đất (%)': parseFloat(item.avgSoilMoisture.toFixed(1))
    }));
  };

  return (
    <div className="sensor-chart">
      <div className="chart-header">
        <h2>📈 Biểu Đồ Dữ Liệu</h2>
        <div className="time-range-selector">
          <button 
            className={timeRange === 6 ? 'active' : ''}
            onClick={() => setTimeRange(6)}
          >
            6h
          </button>
          <button 
            className={timeRange === 12 ? 'active' : ''}
            onClick={() => setTimeRange(12)}
          >
            12h
          </button>
          <button 
            className={timeRange === 24 ? 'active' : ''}
            onClick={() => setTimeRange(24)}
          >
            24h
          </button>
          <button 
            className={timeRange === 48 ? 'active' : ''}
            onClick={() => setTimeRange(48)}
          >
            48h
          </button>
        </div>
      </div>

      {loading ? (
        <div className="chart-loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="chart-empty">
          <p>📊 Chưa có dữ liệu để hiển thị</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={formatData()}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
            <XAxis 
              dataKey="time" 
              stroke="#7f8c8d"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#7f8c8d"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #ecf0f1',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '20px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="Nhiệt độ (°C)" 
              stroke="#e74c3c" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="Độ ẩm (%)" 
              stroke="#3498db" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="Độ ẩm đất (%)" 
              stroke="#2ecc71" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SensorChart;
