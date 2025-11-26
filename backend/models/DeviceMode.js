const mongoose = require('mongoose');

const deviceModeSchema = new mongoose.Schema({
  deviceType: {
    type: String,
    enum: ['pump', 'lamp', 'fan', 'global'],
    required: true,
    unique: true
  },
  mode: {
    type: String,
    enum: ['manual', 'schedule', 'sensor'],
    default: 'manual'
  },
  syncMode: {
    type: Boolean,
    default: false
  },
  sensorConfig: {
    // Sensor type: soilMoisture (pump), temperature (fan), light (lamp), humidity (air humidity)
    sensorType: {
      type: String,
      enum: ['humidity', 'temperature', 'light', 'soilMoisture'],
      default: 'humidity'
    },
    minThreshold: {
      type: Number,
      default: 30,
      min: 0,
      max: 100
    },
    maxThreshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    checkInterval: {
      type: Number,
      default: 60,
      min: 10,
      max: 3600
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Validate sensor config thresholds
deviceModeSchema.pre('save', function(next) {
  if (this.sensorConfig.minThreshold >= this.sensorConfig.maxThreshold) {
    next(new Error('minThreshold must be less than maxThreshold'));
  }
  this.lastUpdated = Date.now();
  next();
});

// Static method to initialize default modes
deviceModeSchema.statics.initializeDefaults = async function() {
  const deviceConfigs = [
    { 
      deviceType: 'pump', 
      sensorType: 'humidity',
      minThreshold: 30,
      maxThreshold: 70
    },
    { 
      deviceType: 'fan', 
      sensorType: 'temperature',
      minThreshold: 28,
      maxThreshold: 35
    },
    { 
      deviceType: 'lamp', 
      sensorType: 'light',
      minThreshold: 20,
      maxThreshold: 80
    }
  ];
  
  for (const config of deviceConfigs) {
    const existing = await this.findOne({ deviceType: config.deviceType });
    if (!existing) {
      await this.create({
        deviceType: config.deviceType,
        mode: 'manual',
        isActive: true,
        syncMode: false,
        sensorConfig: {
          sensorType: config.sensorType,
          minThreshold: config.minThreshold,
          maxThreshold: config.maxThreshold,
          checkInterval: 60
        }
      });
      console.log(`✅ Initialized default mode for ${config.deviceType} with sensor type ${config.sensorType}`);
    }
  }
  
  // Initialize global settings
  const globalSettings = await this.findOne({ deviceType: 'global' });
  if (!globalSettings) {
    await this.create({
      deviceType: 'global',
      mode: 'manual',
      syncMode: true,
      isActive: true
    });
    console.log(`✅ Initialized global sync settings`);
  }
};

module.exports = mongoose.model('DeviceMode', deviceModeSchema);
