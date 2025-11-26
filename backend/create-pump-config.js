const mongoose = require('mongoose');
const DeviceMode = require('./models/DeviceMode');

// QUAN TRỌNG: Phải dùng ĐÚNG database mà backend đang dùng!
mongoose.connect('mongodb://localhost:27017/farm_monitor')
  .then(async () => {
    // Delete ALL configs to be sure
    await mongoose.connection.db.collection('devicemodes').deleteMany({});
    console.log('✅ Deleted ALL device configs');
    
    // Create fresh pump config
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
    
    console.log('\n✅ CREATED PUMP CONFIG:');
    console.log('   SensorType:', pump.sensorConfig.sensorType);
    console.log('   Range: [', pump.sensorConfig.minThreshold, ',', pump.sensorConfig.maxThreshold, ']');
    console.log('   Interval:', pump.sensorConfig.checkInterval, 's');
    
    // Verify
    const verify = await DeviceMode.findOne({ deviceType: 'pump' });
    console.log('\n✅ VERIFIED FROM DATABASE:');
    console.log('   SensorType:', verify.sensorConfig.sensorType);
    console.log('   Range: [', verify.sensorConfig.minThreshold, ',', verify.sensorConfig.maxThreshold, ']');
    
    console.log('\n==> RESTART BACKEND BAY GIO!\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
