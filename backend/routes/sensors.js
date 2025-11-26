const express = require('express');
const router = express.Router();
const SensorHistory = require('../models/SensorHistory');
const { authenticate } = require('../middleware/auth');

// GET /api/sensors/history?range=24h
router.get('/history', authenticate, async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    
    // Tính toán thời gian bắt đầu dựa trên range
    const now = new Date();
    let startTime = new Date();
    
    switch (range) {
      case '1h':
        startTime = new Date(now - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now - 24 * 60 * 60 * 1000);
    }
    
    // Query dữ liệu từ database
    const data = await SensorHistory.find({
      timestamp: { $gte: startTime }
    })
    .sort({ timestamp: 1 })
    .limit(1000) // Giới hạn 1000 điểm dữ liệu
    .lean();
    
    // Nếu có quá nhiều điểm, sample down
    let sampledData = data;
    if (data.length > 200) {
      const step = Math.ceil(data.length / 200);
      sampledData = data.filter((_, index) => index % step === 0);
    }
    
    res.json(sampledData);
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/sensors/current - Lấy giá trị cảm biến hiện tại
router.get('/current', authenticate, async (req, res) => {
  try {
    const latest = await SensorHistory.findOne()
      .sort({ timestamp: -1 })
      .lean();
    
    if (!latest) {
      return res.json({
        temperature: 0,
        humidity: 0,
        soilMoisture: 0,
        timestamp: new Date()
      });
    }
    
    res.json(latest);
  } catch (error) {
    console.error('Error fetching current sensor data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
