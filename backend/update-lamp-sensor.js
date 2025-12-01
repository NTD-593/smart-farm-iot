const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-farm')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Cập nhật lamp sang sensorType: light
    const result = await mongoose.connection.db.collection('devicemodes').updateOne(
      { deviceType: 'lamp' },
      { 
        $set: { 
          'sensorConfig.sensorType': 'light',
          'sensorConfig.minThreshold': 300,
          'sensorConfig.maxThreshold': 800
        } 
      }
    );
    
    console.log('Updated:', result.modifiedCount, 'document(s)');
    
    // Kiểm tra kết quả
    const lamp = await mongoose.connection.db.collection('devicemodes').findOne({ deviceType: 'lamp' });
    console.log('Lamp config:', JSON.stringify(lamp.sensorConfig, null, 2));
    
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
