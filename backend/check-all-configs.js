const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/farm_iot')
  .then(async () => {
    const db = mongoose.connection.db;
    const all = await db.collection('devicemodes').find({}).toArray();
    
    console.log('\n=== TAT CA CONFIG TRONG DATABASE ===');
    console.log('So luong records:', all.length);
    
    all.forEach((doc, i) => {
      console.log(`\n[${i+1}] ${doc.deviceType}:`);
      console.log('   _id:', doc._id);
      console.log('   mode:', doc.mode);
      console.log('   sensorType:', doc.sensorConfig?.sensorType);
      console.log('   range: [', doc.sensorConfig?.minThreshold, ',', doc.sensorConfig?.maxThreshold, ']');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
