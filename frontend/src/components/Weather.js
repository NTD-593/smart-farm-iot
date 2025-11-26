import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Weather.css';

const Weather = () => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('Da Nang,VN');
  const [locationInput, setLocationInput] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);

  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 30 * 60 * 1000); // Update every 30 mins
    return () => clearInterval(interval);
  }, [location]);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/weather?location=${location}`);
      const data = response.data;
      
      setCurrentWeather(data.current);
      setForecast(data.forecast || []);
      setHourly(data.hourly || []);
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching weather:', error);
      // Use mock data if API fails
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setCurrentWeather({
      temp: 28,
      feels_like: 30,
      humidity: 65,
      description: 'Trời nắng',
      icon: '01d',
      wind_speed: 12,
      wind_deg: 45,
      rain: 0,
      uv: 7,
      visibility: 10,
      sunrise: '06:15',
      sunset: '17:30'
    });

    setForecast([
      { date: '22/11', temp_max: 28, temp_min: 20, icon: '01d', description: 'Nắng', rain: 5, wind: 10 },
      { date: '23/11', temp_max: 29, temp_min: 21, icon: '02d', description: 'Nắng ít mây', rain: 10, wind: 12 },
      { date: '24/11', temp_max: 27, temp_min: 20, icon: '03d', description: 'Nhiều mây', rain: 30, wind: 15 },
      { date: '25/11', temp_max: 24, temp_min: 18, icon: '10d', description: 'Mưa vừa', rain: 80, wind: 20 },
      { date: '26/11', temp_max: 23, temp_min: 19, icon: '09d', description: 'Mưa nhẹ', rain: 60, wind: 18 },
      { date: '27/11', temp_max: 25, temp_min: 20, icon: '04d', description: 'Nhiều mây', rain: 20, wind: 13 },
      { date: '28/11', temp_max: 26, temp_min: 21, icon: '02d', description: 'Nắng ít mây', rain: 15, wind: 11 }
    ]);

    setHourly([
      { time: '15:00', temp: 28, icon: '01d', humidity: 60, wind: 12 },
      { time: '16:00', temp: 27, icon: '01d', humidity: 62, wind: 10 },
      { time: '17:00', temp: 26, icon: '02d', humidity: 65, wind: 8 },
      { time: '18:00', temp: 25, icon: '02d', humidity: 68, wind: 6 },
      { time: '19:00', temp: 24, icon: '01n', humidity: 70, wind: 5 },
      { time: '20:00', temp: 23, icon: '01n', humidity: 72, wind: 4 },
      { time: '21:00', temp: 22, icon: '01n', humidity: 75, wind: 3 }
    ]);

    setRecommendations([
      { type: 'success', title: 'Thời tiết thuận lợi', message: 'Thời tiết thuận lợi cho cây trồng', action: null },
      { type: 'info', title: 'Tiết kiệm điện', message: 'Tắt đèn vào ban ngày để tiết kiệm điện', action: null },
      { type: 'warning', title: 'Giảm tưới', message: 'Độ ẩm không khí cao (65%), giảm 20% lượng tưới', action: 'adjust' },
      { type: 'info', title: 'Bật quạt', message: 'Nhiệt độ 28°C, bật quạt từ 13:00-16:00', action: 'schedule' },
      { type: 'warning', title: 'UV cao', message: 'Chỉ số UV cao (7), che phủ cho cây nhạy cảm', action: null }
    ]);
  };

  const getWeatherIcon = (iconCode) => {
    const icons = {
      '01d': '☀️', '01n': '🌙',
      '02d': '🌤️', '02n': '🌙',
      '03d': '⛅', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return icons[iconCode] || '🌤️';
  };

  const getWindDirection = (deg) => {
    const directions = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
    return directions[Math.round(deg / 45) % 8];
  };

  const handleLocationChange = () => {
    if (locationInput.trim()) {
      setLocation(locationInput.trim());
      setShowLocationInput(false);
    }
  };

  const handleLocationKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLocationChange();
    }
  };

  if (loading && !currentWeather) {
    return (
      <div className="weather-page">
        <div className="loading-weather">
          <div className="loading-spinner">🌍</div>
          <p>Đang tải dữ liệu thời tiết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-page">
      {/* Location Header */}
      <div className="weather-header">
        <div className="location-info">
          <span className="location-icon">📍</span>
          {showLocationInput ? (
            <div className="location-input-group">
              <input
                type="text"
                className="location-input"
                placeholder="VD: Dong Nai,VN hoặc Ho Chi Minh City,VN"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={handleLocationKeyPress}
                autoFocus
              />
              <button className="location-save-btn" onClick={handleLocationChange}>✓</button>
              <button className="location-cancel-btn" onClick={() => setShowLocationInput(false)}>✕</button>
            </div>
          ) : (
            <>
              <span className="location-name" onClick={() => { setLocationInput(location); setShowLocationInput(true); }} style={{cursor: 'pointer', textDecoration: 'underline'}}>
                {location.replace(',VN', ', Việt Nam').replace(',', ', ')}
              </span>
              <span className="current-time">🕐 {new Date().toLocaleString('vi-VN')}</span>
            </>
          )}
        </div>
        <button className="refresh-btn" onClick={fetchWeatherData}>
          🔄 Làm mới
        </button>
      </div>

      {/* Current Weather */}
      {currentWeather && (
        <div className="current-weather-card">
          <div className="current-main">
            <div className="weather-icon-large">
              {getWeatherIcon(currentWeather.icon)}
            </div>
            <div className="current-temp">
              <div className="temp-value">{Math.round(currentWeather.temp)}°C</div>
              <div className="feels-like">Cảm giác: {Math.round(currentWeather.feels_like)}°C</div>
              <div className="description">{currentWeather.description}</div>
            </div>
          </div>

          <div className="current-details">
            <div className="detail-item">
              <div className="detail-icon">💨</div>
              <div className="detail-info">
                <div className="detail-label">Gió</div>
                <div className="detail-value">{currentWeather.wind_speed} km/h</div>
                <div className="detail-sub">{getWindDirection(currentWeather.wind_deg)}</div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">🌧️</div>
              <div className="detail-info">
                <div className="detail-label">Mưa</div>
                <div className="detail-value">{currentWeather.rain}%</div>
                <div className="detail-sub">{currentWeather.rain > 50 ? 'Có mưa' : 'Không mưa'}</div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">💧</div>
              <div className="detail-info">
                <div className="detail-label">Độ ẩm</div>
                <div className="detail-value">{currentWeather.humidity}%</div>
                <div className="detail-sub">{currentWeather.humidity > 70 ? 'Cao' : 'Bình thường'}</div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">☀️</div>
              <div className="detail-info">
                <div className="detail-label">UV</div>
                <div className="detail-value">{currentWeather.uv}</div>
                <div className="detail-sub">{currentWeather.uv > 6 ? 'Cao' : 'Trung bình'}</div>
              </div>
            </div>
          </div>

          <div className="sun-times">
            <span>🌅 Mặt trời mọc: {currentWeather.sunrise}</span>
            <span>🌄 Mặt trời lặn: {currentWeather.sunset}</span>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-card">
          <h3>🤖 Khuyến nghị tự động</h3>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-item ${rec.type}`}>
                <div className="rec-icon">
                  {rec.type === 'success' && '✅'}
                  {rec.type === 'warning' && '⚠️'}
                  {rec.type === 'info' && '💡'}
                  {rec.type === 'error' && '🔴'}
                </div>
                <div className="rec-content">
                  <div className="rec-title">{rec.title}</div>
                  <div className="rec-message">{rec.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7 Day Forecast */}
      <div className="forecast-card">
        <h3>📅 Dự báo 7 ngày</h3>
        <div className="forecast-grid">
          {forecast.map((day, index) => (
            <div key={index} className="forecast-day">
              <div className="forecast-date">{day.date}</div>
              <div className="forecast-icon">{getWeatherIcon(day.icon)}</div>
              <div className="forecast-temps">
                <span className="temp-max">{day.temp_max}°</span>
                <span className="temp-min">{day.temp_min}°</span>
              </div>
              <div className="forecast-desc">{day.description}</div>
              <div className="forecast-rain">💧 {day.rain}%</div>
              <div className="forecast-wind">💨 {day.wind}km/h</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Forecast */}
      <div className="hourly-card">
        <h3>⏰ Dự báo theo giờ (24h)</h3>
        <div className="hourly-scroll">
          {hourly.map((hour, index) => (
            <div key={index} className="hourly-item">
              <div className="hourly-time">{hour.time}</div>
              <div className="hourly-icon">{getWeatherIcon(hour.icon)}</div>
              <div className="hourly-temp">{hour.temp}°C</div>
              <div className="hourly-humidity">💧 {hour.humidity}%</div>
              <div className="hourly-wind">💨 {hour.wind}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Weather;
