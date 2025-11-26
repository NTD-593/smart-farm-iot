const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Schedule = require('../models/Schedule');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/schedules
// @desc    Get all schedules
// @access  Authenticated
router.get('/', async (req, res) => {
  try {
    const { deviceType, action, isActive } = req.query;
    const filter = {};
    
    if (deviceType) filter.deviceType = deviceType;
    if (action) filter.action = action;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const schedules = await Schedule.find(filter)
      .sort({ time: 1 })
      .populate('createdBy', 'username fullName');
    
    res.json({ 
      schedules, 
      count: schedules.length,
      stats: {
        total: schedules.length,
        active: schedules.filter(s => s.isActive).length,
        inactive: schedules.filter(s => !s.isActive).length
      }
    });
  } catch (error) {
    console.error('[Schedules] List error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/schedules/:id
// @desc    Get schedule by ID
// @access  Authenticated
router.get('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('createdBy', 'username fullName');
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('[Schedules] Get error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/schedules
// @desc    Create new schedule
// @access  Operator, Admin
router.post('/', checkRole('OPERATOR', 'ADMIN'), [
  body('deviceType').isIn(['pump', 'lamp', 'fan']).withMessage('Invalid device type'),
  body('action').isIn(['on', 'off']).withMessage('Invalid action'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:mm)'),
  body('repeat.type').isIn(['daily', 'weekdays', 'custom', 'once']).withMessage('Invalid repeat type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceType, action, time, repeat, description, isActive } = req.body;

    // Validate custom repeat days
    if (repeat.type === 'custom' && (!repeat.days || repeat.days.length === 0)) {
      return res.status(400).json({ error: 'Custom repeat requires at least one day' });
    }

    const schedule = new Schedule({
      deviceId: 'farm01',
      deviceType,
      action,
      time,
      repeat,
      description,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id
    });

    await schedule.save();
    
    res.status(201).json(schedule);
  } catch (error) {
    console.error('[Schedules] Create error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/schedules/:id
// @desc    Update schedule
// @access  Operator, Admin
router.put('/:id', checkRole('OPERATOR', 'ADMIN'), [
  body('deviceType').optional().isIn(['pump', 'lamp', 'fan']),
  body('action').optional().isIn(['on', 'off']),
  body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('repeat.type').optional().isIn(['daily', 'weekdays', 'custom', 'once'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const { deviceType, action, time, repeat, description, isActive } = req.body;

    if (deviceType) schedule.deviceType = deviceType;
    if (action) schedule.action = action;
    if (time) schedule.time = time;
    if (repeat) schedule.repeat = repeat;
    if (description !== undefined) schedule.description = description;
    if (isActive !== undefined) schedule.isActive = isActive;

    await schedule.save();
    
    res.json(schedule);
  } catch (error) {
    console.error('[Schedules] Update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/schedules/:id/toggle
// @desc    Toggle schedule active status
// @access  Operator, Admin
router.patch('/:id/toggle', checkRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    schedule.isActive = !schedule.isActive;
    await schedule.save();
    
    res.json({ success: true, isActive: schedule.isActive });
  } catch (error) {
    console.error('[Schedules] Toggle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/schedules/:id
// @desc    Delete schedule
// @access  Operator, Admin
router.delete('/:id', checkRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (error) {
    console.error('[Schedules] Delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/schedules/next-runs/today
// @desc    Get schedules that will run today
// @access  Authenticated
router.get('/next-runs/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await Schedule.find({
      isActive: true,
      nextRun: { $gte: today, $lt: tomorrow }
    }).sort({ nextRun: 1 });

    res.json({ schedules, count: schedules.length });
  } catch (error) {
    console.error('[Schedules] Next runs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
