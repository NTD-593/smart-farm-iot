const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

// Cache để giảm API calls
let weatherCache = {
  data: null,
  timestamp: null,
  location: null
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 phút

// Helper: Generate weather recommendations based on forecast
const generateRecommendations = (current, forecast) => {
  const recommendations = [];

  // Check current temperature
  if (current.temp > 30) {
    recommendations.push({
      type: 'warning',
      title: 'Nhiệt độ cao',
      message: 'Tăng cường thông gió và tưới nước để giảm nhiệt độ cho cây trồng.',
      action: 'fan_on'
    });
  }

  // Check UV index
  if (current.uvi && current.uvi > 7) {
    recommendations.push({
      type: 'warning',
      title: 'Chỉ số UV cao',
      message: 'Cân nhắc che phủ hoặc tưới nước buổi sáng sớm để bảo vệ cây khỏi ánh nắng gay gắt.',
      action: 'protect_plants'
    });
  }

  // Check rain forecast
  const upcomingRain = forecast.slice(0, 3).filter(day => day.pop > 0.6);
  if (upcomingRain.length > 0) {
    recommendations.push({
      type: 'info',
      title: 'Sắp có mưa',
      message: `Dự báo mưa trong ${upcomingRain.length} ngày tới. Giảm lượng tưới nước để tránh úng.`,
      action: 'reduce_watering'
    });
  }

  // Check humidity
  if (current.humidity > 80) {
    recommendations.push({
      type: 'warning',
      title: 'Độ ẩm cao',
      message: 'Độ ẩm không khí cao, tăng cường thông gió để tránh nấm mốc.',
      action: 'increase_ventilation'
    });
  } else if (current.humidity < 40) {
    recommendations.push({
      type: 'info',
      title: 'Độ ẩm thấp',
      message: 'Không khí khô, tăng tần suất tưới nước và phun sương.',
      action: 'increase_watering'
    });
  }

  // Check favorable conditions
  if (current.temp >= 22 && current.temp <= 28 && current.humidity >= 50 && current.humidity <= 70) {
    recommendations.push({
      type: 'success',
      title: 'Điều kiện thuận lợi',
      message: 'Thời tiết lý tưởng cho sự phát triển của cây trồng.',
      action: 'maintain'
    });
  }

  return recommendations;
};

// GET /api/weather - Lấy dữ liệu thời tiết
router.get('/', authenticate, async (req, res) => {
  try {
    const location = req.query.location || 'Hanoi,VN';
    const now = Date.now();

    // Check cache
    if (
      weatherCache.data &&
      weatherCache.location === location &&
      weatherCache.timestamp &&
      (now - weatherCache.timestamp) < CACHE_DURATION
    ) {
      console.log('Returning cached weather data');
      return res.json(weatherCache.data);
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      console.log('OpenWeatherMap API key not found, using mock data');
      // Return mock data if API key not configured
      const mockData = {
        current: {
          temp: 28,
          feels_like: 30,
          humidity: 65,
          description: 'Có mây',
          icon: '02d',
          wind_speed: 12,
          wind_deg: 45,
          rain: 0,
          uvi: 7,
          visibility: 10000,
          sunrise: '05:30',
          sunset: '18:15'
        },
        forecast: [
          { date: 'Hôm nay', temp_max: 29, temp_min: 23, icon: '02d', description: 'Có mây', pop: 0.1, wind_speed: 12 },
          { date: 'Ngày mai', temp_max: 28, temp_min: 22, icon: '10d', description: 'Mưa nhỏ', pop: 0.6, wind_speed: 15 },
          { date: 'T4', temp_max: 27, temp_min: 22, icon: '10d', description: 'Mưa rào', pop: 0.8, wind_speed: 18 },
          { date: 'T5', temp_max: 26, temp_min: 21, icon: '04d', description: 'Nhiều mây', pop: 0.3, wind_speed: 10 },
          { date: 'T6', temp_max: 28, temp_min: 23, icon: '01d', description: 'Nắng', pop: 0.05, wind_speed: 8 },
          { date: 'T7', temp_max: 29, temp_min: 24, icon: '01d', description: 'Nắng đẹp', pop: 0.0, wind_speed: 7 },
          { date: 'CN', temp_max: 27, temp_min: 22, icon: '02d', description: 'Có mây', pop: 0.2, wind_speed: 10 }
        ],
        hourly: [
          { time: '14:00', temp: 28, icon: '02d', humidity: 65, wind_speed: 12 },
          { time: '17:00', temp: 27, icon: '02d', humidity: 68, wind_speed: 10 },
          { time: '20:00', temp: 25, icon: '02n', humidity: 72, wind_speed: 8 },
          { time: '23:00', temp: 24, icon: '02n', humidity: 75, wind_speed: 7 },
          { time: '02:00', temp: 23, icon: '01n', humidity: 78, wind_speed: 6 },
          { time: '05:00', temp: 22, icon: '01n', humidity: 80, wind_speed: 5 },
          { time: '08:00', temp: 24, icon: '01d', humidity: 75, wind_speed: 7 }
        ]
      };

      // Generate recommendations
      mockData.recommendations = generateRecommendations(mockData.current, mockData.forecast);

      // Cache mock data
      weatherCache = {
        data: mockData,
        timestamp: now,
        location
      };

      return res.json(mockData);
    }

    // Call OpenWeatherMap API - Using free tier APIs (Current + Forecast)
    const [lat, lon] = await getCoordinates(location, apiKey);
    
    // Get current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${apiKey}`;
    const currentResponse = await axios.get(currentUrl);
    const currentData = currentResponse.data;
    
    // Get 5-day forecast (we'll use first 7 entries for ~2 days hourly)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${apiKey}`;
    const forecastResponse = await axios.get(forecastUrl);
    const forecastData = forecastResponse.data;

    // Format current weather
    const current = {
      temp: Math.round(currentData.main.temp),
      feels_like: Math.round(currentData.main.feels_like),
      humidity: currentData.main.humidity,
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      wind_speed: Math.round(currentData.wind.speed * 3.6), // m/s to km/h
      wind_deg: currentData.wind.deg,
      rain: currentData.rain ? currentData.rain['1h'] || 0 : 0,
      uvi: 5, // UV not available in free tier, use moderate default
      visibility: Math.round(currentData.visibility / 1000), // meters to km
      sunrise: new Date(currentData.sys.sunrise * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      sunset: new Date(currentData.sys.sunset * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    // Format 7-day forecast from 5-day/3-hour data (group by day)
    const dailyMap = {};
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          dateObj: date,
          temps: [],
          icons: [],
          descriptions: [],
          pops: [],
          winds: []
        };
      }
      
      dailyMap[dateKey].temps.push(item.main.temp);
      dailyMap[dateKey].icons.push(item.weather[0].icon);
      dailyMap[dateKey].descriptions.push(item.weather[0].description);
      dailyMap[dateKey].pops.push(item.pop || 0);
      dailyMap[dateKey].winds.push(item.wind.speed * 3.6);
    });
    
    const forecast = Object.values(dailyMap).slice(0, 7).map((day, index) => {
      const dateObj = day.dateObj;
      let dayName;
      
      if (index === 0) {
        dayName = 'Hôm nay';
      } else if (index === 1) {
        dayName = 'Ngày mai';
      } else {
        // Format: "Th 4 26" (Thứ 4, ngày 26)
        const weekday = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' });
        const dayNum = dateObj.getDate();
        dayName = `${weekday} ${dayNum}`;
      }
      
      return {
        date: dayName,
        temp_max: Math.round(Math.max(...day.temps)),
        temp_min: Math.round(Math.min(...day.temps)),
        icon: day.icons[Math.floor(day.icons.length / 2)], // midday icon
        description: day.descriptions[0],
        pop: Math.max(...day.pops),
        wind_speed: Math.round(day.winds.reduce((a, b) => a + b, 0) / day.winds.length)
      };
    });

    // Format hourly forecast (next 7 entries = ~21 hours)
    const hourly = forecastData.list.slice(0, 7).map(hour => {
      const time = new Date(hour.dt * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return {
        time,
        temp: Math.round(hour.main.temp),
        icon: hour.weather[0].icon,
        humidity: hour.main.humidity,
        wind_speed: Math.round(hour.wind.speed * 3.6)
      };
    });

    // Generate recommendations
    const recommendations = generateRecommendations(current, forecast);

    const weatherData = {
      current,
      forecast,
      hourly,
      recommendations
    };

    // Cache the data
    weatherCache = {
      data: weatherData,
      timestamp: now,
      location
    };

    res.json(weatherData);

  } catch (error) {
    console.error('Weather API error:', error.message);
    
    // Return mock data on error
    const mockData = {
      current: {
        temp: 28,
        feels_like: 30,
        humidity: 65,
        description: 'Có mây',
        icon: '02d',
        wind_speed: 12,
        wind_deg: 45,
        rain: 0,
        uvi: 7,
        visibility: 10,
        sunrise: '05:30',
        sunset: '18:15'
      },
      forecast: [
        { date: 'Hôm nay', temp_max: 29, temp_min: 23, icon: '02d', description: 'Có mây', pop: 0.1, wind_speed: 12 },
        { date: 'Ngày mai', temp_max: 28, temp_min: 22, icon: '10d', description: 'Mưa nhỏ', pop: 0.6, wind_speed: 15 }
      ],
      hourly: [
        { time: '14:00', temp: 28, icon: '02d', humidity: 65, wind_speed: 12 }
      ],
      recommendations: [
        { type: 'info', title: 'Dữ liệu mô phỏng', message: 'Đang sử dụng dữ liệu mô phỏng. Cấu hình API key để xem dữ liệu thực.', action: null }
      ]
    };

    res.json(mockData);
  }
});

// Helper: Get coordinates from location name
async function getCoordinates(location, apiKey) {
  try {
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
    const response = await axios.get(geoUrl);
    
    if (response.data && response.data.length > 0) {
      return [response.data[0].lat, response.data[0].lon];
    }
    
    // Default to Hanoi if location not found
    return [21.0285, 105.8542];
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return [21.0285, 105.8542]; // Hanoi coordinates
  }
}

module.exports = router;
