const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Mock data for now - in production, this would query MongoDB
router.get('/history', authenticate, async (req, res) => {
  try {
    const { device = 'all' } = req.query;
    
    // TODO: Query actual history from database
    // For now, return mock data
    const mockHistory = [
      {
        device: 'pump',
        action: 'on',
        mode: 'sensor',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        reason: 'Độ ẩm đất: 28% < 30% → Kích hoạt tưới'
      },
      {
        device: 'lamp',
        action: 'off',
        mode: 'manual',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        user: 'System Administrator'
      },
      {
        device: 'lamp',
        action: 'on',
        mode: 'schedule',
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
        reason: 'Lịch: "Chiếu sáng buổi chiều"'
      },
      {
        device: 'pump',
        action: 'off',
        mode: 'sensor',
        timestamp: new Date(Date.now() - 165 * 60 * 1000),
        reason: 'Độ ẩm đất: 72% > 70% → Dừng tưới'
      },
      {
        device: 'fan',
        action: 'on',
        mode: 'sensor',
        timestamp: new Date(Date.now() - 195 * 60 * 1000),
        reason: 'Nhiệt độ: 36°C > 35°C → Làm mát'
      }
    ];

    const filtered = device === 'all' 
      ? mockHistory 
      : mockHistory.filter(h => h.device === device);
    
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching device history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    // TODO: Calculate actual stats from database
    // For now, return mock stats
    const mockStats = {
      pump: {
        todayRuntime: 155, // minutes
        todayToggleCount: 8,
        weeklyAverage: 720 // minutes per day
      },
      fan: {
        todayRuntime: 0,
        todayToggleCount: 3,
        weeklyAverage: 360
      },
      lamp: {
        todayRuntime: 312,
        todayToggleCount: 12,
        weeklyAverage: 1080
      }
    };

    res.json(mockStats);
  } catch (error) {
    console.error('Error fetching device stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
