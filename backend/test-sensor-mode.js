// Test script để kiểm tra chức năng sensor mode
// Run: node backend/test-sensor-mode.js

const mqtt = require('mqtt');

// Kết nối MQTT
const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'mqtt_ante',
  password: 'iotante123@X'
});

console.log('🔌 Connecting to MQTT broker...');

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  
  // Subscribe để xem lệnh điều khiển
  client.subscribe('serverfm/devices/farm01/control', (err) => {
    if (err) {
      console.error('❌ Subscribe error:', err);
    } else {
      console.log('✅ Subscribed to control topic');
    }
  });
  
  console.log('\n📊 Starting sensor data simulation...\n');
  
  // Simulate sensor data
  testScenario();
});

client.on('message', (topic, message) => {
  if (topic === 'serverfm/devices/farm01/control') {
    console.log(`📥 [CONTROL RECEIVED] ${message.toString()}`);
  }
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});

// ========================================
// TEST SCENARIO
// ========================================

async function testScenario() {
  console.log('='.repeat(60));
  console.log('TEST: Pump Auto Control based on Humidity');
  console.log('='.repeat(60));
  console.log('Config: Min=30%, Max=70%, Interval=60s');
  console.log('Current Mode: Assume SENSOR mode is enabled for pump');
  console.log('='.repeat(60));
  console.log('');
  
  // Scenario 1: Normal humidity (should not trigger)
  await sleep(2000);
  publishSensor('humidity', 50, '%');
  console.log('Expected: ✅ No action (50% is within range)');
  console.log('');
  
  // Scenario 2: Low humidity (should turn ON pump)
  await sleep(5000);
  publishSensor('humidity', 25, '%');
  console.log('Expected: 🔼 Turn pump ON (25% < 30%)');
  console.log('');
  
  // Scenario 3: Still low (pump already ON, no action)
  await sleep(5000);
  publishSensor('humidity', 28, '%');
  console.log('Expected: ✅ No action (pump already ON)');
  console.log('');
  
  // Scenario 4: Rising humidity (still in low range)
  await sleep(5000);
  publishSensor('humidity', 35, '%');
  console.log('Expected: ✅ No action (35% in safe range, pump keeps running)');
  console.log('');
  
  // Scenario 5: High humidity (should turn OFF pump)
  await sleep(5000);
  publishSensor('humidity', 72, '%');
  console.log('Expected: 🔽 Turn pump OFF (72% > 70%)');
  console.log('');
  
  // Scenario 6: Test temperature for fan
  await sleep(5000);
  console.log('='.repeat(60));
  console.log('TEST: Fan Auto Control based on Temperature');
  console.log('='.repeat(60));
  console.log('Config: Min=28°C, Max=35°C');
  console.log('');
  
  publishSensor('temperature', 37, '°C');
  console.log('Expected: 🔥 Turn fan ON (37°C > 35°C)');
  console.log('');
  
  await sleep(5000);
  publishSensor('temperature', 26, '°C');
  console.log('Expected: ❄️ Turn fan OFF (26°C < 28°C)');
  console.log('');
  
  // Scenario 7: Test light for lamp
  await sleep(5000);
  console.log('='.repeat(60));
  console.log('TEST: Lamp Auto Control based on Light');
  console.log('='.repeat(60));
  console.log('Config: Min=20%, Max=80%');
  console.log('');
  
  publishSensor('light', 15, '%');
  console.log('Expected: 💡 Turn lamp ON (15% < 20%)');
  console.log('');
  
  await sleep(5000);
  publishSensor('light', 85, '%');
  console.log('Expected: ☀️ Turn lamp OFF (85% > 80%)');
  console.log('');
  
  // End test
  await sleep(3000);
  console.log('='.repeat(60));
  console.log('✅ Test completed. Check backend logs for sensor controller output.');
  console.log('='.repeat(60));
  
  setTimeout(() => {
    console.log('\n👋 Disconnecting...');
    client.end();
    process.exit(0);
  }, 2000);
}

function publishSensor(type, value, unit) {
  const topic = `sensor/${type}`;
  const payload = JSON.stringify({ value, unit });
  
  client.publish(topic, payload, { qos: 1 });
  console.log(`📤 Published: ${topic} -> ${payload}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('');
console.log('⚠️  REQUIREMENTS:');
console.log('1. Backend must be running (npm start in backend/)');
console.log('2. Device(s) must be in SENSOR mode');
console.log('3. MQTT broker must be running on localhost:1883');
console.log('');
