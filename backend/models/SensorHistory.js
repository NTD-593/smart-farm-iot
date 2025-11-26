const mongoose = require('mongoose');

const sensorHistorySchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  soilMoisture: Number,
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('SensorHistory', sensorHistorySchema);
