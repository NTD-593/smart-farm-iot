const express = require('express');
const router = express.Router();
const DeviceMode = require('../models/DeviceMode');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/device-modes
// @desc    Get all device modes
// @access  Authenticated
router.get('/', async (req, res) => {
  try {
    const modes = await DeviceMode.find()
      .populate('updatedBy', 'username fullName')
      .sort({ deviceType: 1 });
    
    res.json({ modes });
  } catch (error) {
    console.error('[DeviceModes] List error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/device-modes/:deviceType
// @desc    Get mode for specific device
// @access  Authenticated
router.get('/:deviceType', async (req, res) => {
  try {
    const { deviceType } = req.params;
    
    if (!['pump', 'lamp', 'fan'].includes(deviceType)) {
      return res.status(400).json({ error: 'Invalid device type' });
    }
    
    let mode = await DeviceMode.findOne({ deviceType })
      .populate('updatedBy', 'username fullName');
    
    // Create default if not exists
    if (!mode) {
      mode = await DeviceMode.create({ deviceType, mode: 'manual' });
    }
    
    res.json({ mode });
  } catch (error) {
    console.error('[DeviceModes] Get error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/device-modes/:deviceType
// @desc    Update device mode (full update)
// @access  Operator, Admin
router.put('/:deviceType', checkRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const { deviceType } = req.params;
    const { mode, sensorConfig, isActive } = req.body;
    
    if (!['pump', 'lamp', 'fan'].includes(deviceType)) {
      return res.status(400).json({ error: 'Invalid device type' });
    }
    
    if (mode && !['manual', 'schedule', 'sensor'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    
    // Validate sensor config if provided
    if (sensorConfig) {
      if (sensorConfig.minThreshold >= sensorConfig.maxThreshold) {
        return res.status(400).json({ 
          error: 'minThreshold must be less than maxThreshold' 
        });
      }
    }
    
    const updateData = {
      updatedBy: req.user._id,
      lastUpdated: Date.now()
    };
    
    if (mode !== undefined) updateData.mode = mode;
    if (sensorConfig !== undefined) updateData.sensorConfig = sensorConfig;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const deviceMode = await DeviceMode.findOneAndUpdate(
      { deviceType },
      updateData,
      { new: true, upsert: true, runValidators: true }
    ).populate('updatedBy', 'username fullName');
    
    console.log(`✅ Updated ${deviceType} mode to ${deviceMode.mode}`);
    
    res.json({ 
      message: 'Device mode updated successfully',
      mode: deviceMode 
    });
  } catch (error) {
    console.error('[DeviceModes] Update error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// @route   PATCH /api/device-modes/:deviceType/mode
// @desc    Quick switch mode only
// @access  Operator, Admin
router.patch('/:deviceType/mode', checkRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const { deviceType } = req.params;
    const { mode } = req.body;
    
    if (!mode) {
      return res.status(400).json({ error: 'Mode is required' });
    }
    
    if (!['manual', 'schedule', 'sensor'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    
    // Prepare update data
    const updateData = {
      mode,
      updatedBy: req.user._id,
      lastUpdated: Date.now()
    };
    
    // If switching to sensor mode and no config exists, create default
    if (mode === 'sensor') {
      const existing = await DeviceMode.findOne({ deviceType });
      if (!existing || !existing.sensorConfig || !existing.sensorConfig.sensorType) {
        // Set default sensorType based on device
        const defaultSensorTypes = {
          pump: 'soilMoisture',
          fan: 'temperature',
          lamp: 'light'
        };
        updateData.sensorConfig = {
          sensorType: defaultSensorTypes[deviceType] || 'humidity',
          minThreshold: 30,
          maxThreshold: 70,
          checkInterval: 60
        };
        console.log(`📝 Creating default sensor config for ${deviceType}: ${updateData.sensorConfig.sensorType}`);
      }
    }
    
    const deviceMode = await DeviceMode.findOneAndUpdate(
      { deviceType },
      updateData,
      { new: true, upsert: true }
    ).populate('updatedBy', 'username fullName');
    
    console.log(`🔄 Switched ${deviceType} to ${mode} mode`);
    
    // If switched to sensor mode, start monitoring
    if (mode === 'sensor' && req.app.locals.sensorController) {
      await req.app.locals.sensorController.restartSensorCheck(deviceType);
      console.log(`✅ Started sensor monitoring for ${deviceType}`);
    }
    
    // If switched away from sensor mode, stop monitoring
    if (mode !== 'sensor' && req.app.locals.sensorController) {
      req.app.locals.sensorController.stopSensorCheck(deviceType);
      console.log(`🛑 Stopped sensor monitoring for ${deviceType}`);
    }
    
    res.json({ 
      message: `Switched to ${mode} mode`,
      mode: deviceMode 
    });
  } catch (error) {
    console.error('[DeviceModes] Switch mode error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/device-modes/:deviceType/sensor-config
// @desc    Update sensor configuration only
// @access  Operator, Admin
router.patch('/:deviceType/sensor-config', checkRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const { deviceType } = req.params;
    const { minThreshold, maxThreshold, checkInterval } = req.body;
    
    // Allow sensor config for all devices
    if (!['pump', 'lamp', 'fan'].includes(deviceType)) {
      return res.status(400).json({ 
        error: 'Invalid device type' 
      });
    }
    
    const sensorConfig = {};
    if (minThreshold !== undefined) sensorConfig.minThreshold = minThreshold;
    if (maxThreshold !== undefined) sensorConfig.maxThreshold = maxThreshold;
    if (checkInterval !== undefined) sensorConfig.checkInterval = checkInterval;
    
    // Validate thresholds
    const deviceMode = await DeviceMode.findOne({ deviceType });
    const newMin = minThreshold !== undefined ? minThreshold : deviceMode?.sensorConfig?.minThreshold || 30;
    const newMax = maxThreshold !== undefined ? maxThreshold : deviceMode?.sensorConfig?.maxThreshold || 70;
    
    if (newMin >= newMax) {
      return res.status(400).json({ 
        error: 'minThreshold must be less than maxThreshold' 
      });
    }
    
    const updated = await DeviceMode.findOneAndUpdate(
      { deviceType },
      { 
        $set: {
          'sensorConfig.minThreshold': newMin,
          'sensorConfig.maxThreshold': newMax,
          'sensorConfig.checkInterval': checkInterval !== undefined ? checkInterval : (deviceMode?.sensorConfig?.checkInterval || 60),
          updatedBy: req.user._id,
          lastUpdated: Date.now()
        }
      },
      { new: true, upsert: true }
    ).populate('updatedBy', 'username fullName');
    
    console.log(`⚙️ Updated ${deviceType} sensor config:`, updated.sensorConfig);
    
    res.json({ 
      message: 'Sensor configuration updated',
      mode: updated 
    });
  } catch (error) {
    console.error('[DeviceModes] Update sensor config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/device-modes/sync-all
// @desc    Sync mode to all devices
// @access  Operator, Admin
router.post('/sync-all', checkRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!mode || !['manual', 'schedule', 'sensor'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    
    // Apply mode to all devices
    const updates = [];
    
    // Update all 3 devices
    updates.push(
      DeviceMode.updateMany(
        { deviceType: { $in: ['pump', 'fan', 'lamp'] } },
        { mode, updatedBy: req.user._id, lastUpdated: Date.now() }
      )
    );
    
    // Update global settings
    updates.push(
      DeviceMode.findOneAndUpdate(
        { deviceType: 'global' },
        { mode, syncMode: true, updatedBy: req.user._id, lastUpdated: Date.now() },
        { new: true, upsert: true }
      )
    );
    
    await Promise.all(updates);
    
    console.log(`🔄 Synced all devices to ${mode} mode`);
    
    // Handle sensor monitoring for all devices
    if (req.app.locals.sensorController) {
      const deviceTypes = ['pump', 'fan', 'lamp'];
      for (const deviceType of deviceTypes) {
        if (mode === 'sensor') {
          await req.app.locals.sensorController.restartSensorCheck(deviceType);
          console.log(`✅ Started sensor monitoring for ${deviceType}`);
        } else {
          req.app.locals.sensorController.stopSensorCheck(deviceType);
          console.log(`🛑 Stopped sensor monitoring for ${deviceType}`);
        }
      }
    }
    
    res.json({ 
      message: `All devices synced to ${mode} mode`,
      mode
    });
  } catch (error) {
    console.error('[DeviceModes] Sync all error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/device-modes/sync-toggle
// @desc    Toggle sync mode on/off
// @access  Operator, Admin
router.patch('/sync-toggle', checkRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const { syncMode } = req.body;
    
    if (typeof syncMode !== 'boolean') {
      return res.status(400).json({ error: 'syncMode must be boolean' });
    }
    
    const globalSettings = await DeviceMode.findOneAndUpdate(
      { deviceType: 'global' },
      { syncMode, updatedBy: req.user._id, lastUpdated: Date.now() },
      { new: true, upsert: true }
    ).populate('updatedBy', 'username fullName');
    
    console.log(`🔀 Sync mode ${syncMode ? 'enabled' : 'disabled'}`);
    
    res.json({ 
      message: `Sync mode ${syncMode ? 'enabled' : 'disabled'}`,
      settings: globalSettings
    });
  } catch (error) {
    console.error('[DeviceModes] Toggle sync error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/device-modes/:deviceType/restart-sensor
// @desc    Restart sensor monitoring for a device
// @access  Operator, Admin
router.post('/:deviceType/restart-sensor', checkRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const { deviceType } = req.params;
    
    if (!['pump', 'lamp', 'fan'].includes(deviceType)) {
      return res.status(400).json({ error: 'Invalid device type' });
    }
    
    if (!req.app.locals.sensorController) {
      return res.status(500).json({ error: 'Sensor controller not available' });
    }
    
    // Restart sensor monitoring
    await req.app.locals.sensorController.restartSensorCheck(deviceType);
    
    console.log(`🔄 Restarted sensor monitoring for ${deviceType}`);
    
    res.json({ 
      message: `Restarted sensor monitoring for ${deviceType}`,
      success: true
    });
  } catch (error) {
    console.error('[DeviceModes] Restart sensor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
