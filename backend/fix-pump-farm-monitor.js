const mongoose = require('mongoose');
const DeviceMode = require('./models/DeviceMode');

// Connect đến đúng database mà backend đang dùng
mongoose.connect('mongodb://localhost:27017/farm_monitor')
  .then(async () => {
    console.log('✅ Connected to farm_monitor database');
    
    // Xóa config pump cũ
    await DeviceMode.deleteOne({ deviceType: 'pump' });
    console.log('✅ Deleted old pump config');
    
    // Tạo config mới với soilMoisture
    const pump = await DeviceMode.create({
      deviceType: 'pump',
      mode: 'sensor',
      sensorConfig: {
        sensorType: 'soilMoisture',
        minThreshold: 15,
        maxThreshold: 85,
        checkInterval: 10
      },
      isActive: true
    });
    
    console.log('\n✅ CREATED NEW PUMP CONFIG:');
    console.log('   SensorType:', pump.sensorConfig.sensorType);
    console.log('   Range: [', pump.sensorConfig.minThreshold, ',', pump.sensorConfig.maxThreshold, ']');
    console.log('   Interval:', pump.sensorConfig.checkInterval, 's');
    
    // Verify
    const verify = await DeviceMode.findOne({ deviceType: 'pump' });
    console.log('\n✅ VERIFIED:');
    console.log('   SensorType:', verify.sensorConfig.sensorType);
    console.log('   Range: [', verify.sensorConfig.minThreshold, ',', verify.sensorConfig.maxThreshold, ']');
    
    console.log('\n==> RESTART BACKEND (Ctrl+C roi npm start)!\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
