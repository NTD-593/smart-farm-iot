const DeviceMode = require('../models/DeviceMode');

class SensorController {
  constructor(mqttClient, wss = null) {
    this.mqttClient = mqttClient;
    this.wss = wss; // WebSocket server để gửi thông báo đến frontend
    this.currentSensorData = {
      humidity: { value: 0, lastUpdate: null },
      temperature: { value: 0, lastUpdate: null },
      light: { value: 0, lastUpdate: null },
      soilMoisture: { value: 0, lastUpdate: null }
    };
    this.intervals = {};
    this.deviceStatus = {
      pump: 'unknown',
      lamp: 'unknown',
      fan: 'unknown'
    };
  }

  // Cho phép set WebSocket server sau khi khởi tạo
  setWebSocketServer(wss) {
    this.wss = wss;
  }

  async start() {
    console.log('🤖 SensorController: Starting...');
    
    // Subscribe to telemetry topic to get sensor data
    this.mqttClient.subscribe('serverfm/devices/+/telemetry', (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to telemetry:', err);
      } else {
        console.log('✅ Subscribed to serverfm/devices/+/telemetry');
      }
    });

    // Subscribe to device status topics
    this.mqttClient.subscribe('device/+/status', (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to device status:', err);
      } else {
        console.log('✅ Subscribed to device/+/status');
      }
    });

    // Handle incoming messages
    this.mqttClient.on('message', (topic, message) => {
      if (topic.includes('/telemetry')) {
        this.handleTelemetryData(topic, message);
      } else if (topic.includes('/status')) {
        this.handleDeviceStatus(topic, message);
      }
    });

    // Initialize sensor monitoring for devices in sensor mode
    await this.initializeSensorMode();
  }

  handleTelemetryData(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      
      // ESP8266 gửi: {"data": [temperature, humidity, humiGround, pump, lamp, fan]}
      if (data.data && Array.isArray(data.data) && data.data.length >= 3) {
        const [temp, humi, humiGround] = data.data;
        
        // Update temperature
        this.currentSensorData.temperature = {
          value: temp,
          unit: '°C',
          lastUpdate: new Date()
        };
        
        // Update humidity (không khí)
        this.currentSensorData.humidity = {
          value: humi,
          unit: '%',
          lastUpdate: new Date()
        };
        
        // Update soil moisture (độ ẩm đất)
        this.currentSensorData.soilMoisture = {
          value: humiGround,
          unit: '%',
          lastUpdate: new Date()
        };
        
        console.log(`📊 Telemetry update: temp=${temp}°C, humidity=${humi}%, soilMoisture=${humiGround}%`);
      }
    } catch (error) {
      console.error('Error parsing telemetry data:', error);
    }
  }

  handleDeviceStatus(topic, message) {
    try {
      // topic: 'device/pump/status'
      const deviceType = topic.split('/')[1];
      const data = JSON.parse(message.toString());
      
      this.deviceStatus[deviceType] = data.status || data.action;
      console.log(`📱 Device status: ${deviceType} = ${this.deviceStatus[deviceType]}`);
    } catch (error) {
      console.error('Error parsing device status:', error);
    }
  }

  async initializeSensorMode() {
    try {
      console.log('🔍 Initializing sensor mode...');
      
      // Find all devices in sensor mode - don't filter by isActive yet
      const modes = await DeviceMode.find({ mode: 'sensor' });
      
      console.log(`📋 Found ${modes.length} devices in sensor mode`);
      
      if (modes.length === 0) {
        console.log('ℹ️ No devices in sensor mode');
        return;
      }

      for (const mode of modes) {
        console.log(`📍 Initializing ${mode.deviceType}:`);
        console.log(`   - SensorType: ${mode.sensorConfig?.sensorType}`);
        console.log(`   - Range: [${mode.sensorConfig?.minThreshold}, ${mode.sensorConfig?.maxThreshold}]`);
        console.log(`   - Active: ${mode.isActive}`);
        
        if (mode.isActive !== false) {
          this.startSensorCheck(mode);
        } else {
          console.log(`   ⚠️ Skipped (not active)`);
        }
      }
    } catch (error) {
      console.error('Error initializing sensor mode:', error);
    }
  }

  startSensorCheck(deviceMode) {
    const { deviceType, sensorConfig } = deviceMode;
    
    console.log(`🎬 Starting sensor monitoring for ${deviceType}`);
    console.log(`   Sensor type: ${sensorConfig.sensorType}`);
    console.log(`   Min threshold: ${sensorConfig.minThreshold}%`);
    console.log(`   Max threshold: ${sensorConfig.maxThreshold}%`);
    console.log(`   Check interval: ${sensorConfig.checkInterval}s`);
    
    // Clear existing interval if any
    this.stopSensorCheck(deviceType);
    
    // Create new interval - only pass deviceType, load config fresh each time
    const intervalId = setInterval(async () => {
      await this.checkAndControl(deviceType);
    }, sensorConfig.checkInterval * 1000);
    
    this.intervals[deviceType] = intervalId;
    
    // Run initial check immediately
    this.checkAndControl(deviceType);
  }

  async checkAndControl(deviceType) {
    try {
      // 1. Load fresh config from database every time
      const mode = await DeviceMode.findOne({ deviceType });
      
      if (!mode || mode.mode !== 'sensor') {
        console.log(`⏭️ Stopping sensor check for ${deviceType} (mode changed to ${mode?.mode})`);
        this.stopSensorCheck(deviceType);
        return;
      }

      // 2. Get sensor type and thresholds from fresh config
      const sensorType = mode.sensorConfig?.sensorType || 'humidity';
      const minThreshold = mode.sensorConfig?.minThreshold || 30;
      const maxThreshold = mode.sensorConfig?.maxThreshold || 70;
      
      // DEBUG: Log what we got from database
      console.log(`🔎 [DEBUG] Loaded from DB for ${deviceType}:`);
      console.log(`   - sensorType: ${sensorType} (from DB: ${mode.sensorConfig?.sensorType})`);
      console.log(`   - range: [${minThreshold}, ${maxThreshold}]`);
      
      // 3. Get current sensor value
      const sensorData = this.currentSensorData[sensorType];
      const sensorValue = sensorData?.value || 0;
      const lastUpdate = sensorData?.lastUpdate;
      
      // 4. Check if data is fresh (< 2 minutes old)
      if (!lastUpdate) {
        console.log(`⚠️ No ${sensorType} data received yet for ${deviceType}`);
        return;
      }

      const dataAge = Date.now() - lastUpdate.getTime();
      if (dataAge > 120000) { // 2 minutes
        console.log(`⚠️ ${sensorType} data too old (${Math.round(dataAge/1000)}s) for ${deviceType}`);
        return;
      }

      console.log(`🔍 Checking ${deviceType}: ${sensorType}=${sensorValue}${sensorData.unit || ''}, range=[${minThreshold}, ${maxThreshold}]`);

      // 5. Control logic based on device type and sensor
      const currentStatus = this.deviceStatus[deviceType];
      let action = null;
      let reason = '';
      
      // Logic điều khiển phụ thuộc vào loại cảm biến:
      // - humidity (pump): LOW → ON (tưới), HIGH → OFF (đủ nước)
      // - temperature (fan): HIGH → ON (làm mát), LOW → OFF (đủ mát)
      // - light (lamp): LOW → ON (bật đèn), HIGH → OFF (đủ sáng)
      
      if (sensorType === 'temperature') {
        // FAN: nhiệt độ cao → bật quạt, nhiệt độ thấp → tắt quạt
        if (sensorValue > maxThreshold) {
          // Temperature too high -> Turn ON fan
          if (currentStatus !== 'on') {
            action = 'on';
            reason = `${sensorType}=${sensorValue} > ${maxThreshold}`;
            console.log(`🔥 HIGH TEMPERATURE! Turning ${deviceType} ON to cool down (${reason})`);
          } else {
            console.log(`✓ ${deviceType} already ON (cooling)`);
          }
        } else if (sensorValue < minThreshold) {
          // Temperature low enough -> Turn OFF fan
          if (currentStatus !== 'off') {
            action = 'off';
            reason = `${sensorType}=${sensorValue} < ${minThreshold}`;
            console.log(`❄️ LOW TEMPERATURE! Turning ${deviceType} OFF (${reason})`);
          } else {
            console.log(`✓ ${deviceType} already OFF`);
          }
        } else {
          console.log(`✅ ${deviceType} temperature OK (${sensorValue}), no action needed`);
        }
      } else {
        // PUMP (soilMoisture) & LAMP (light): giá trị thấp → bật, giá trị cao → tắt
        if (sensorValue < minThreshold) {
          // Value too low -> Turn ON device
          if (currentStatus !== 'on') {
            action = 'on';
            reason = `${sensorType}=${sensorValue} < ${minThreshold}`;
            console.log(`🔼 LOW ${sensorType.toUpperCase()}! Turning ${deviceType} ON (${reason})`);
          } else {
            console.log(`✓ ${deviceType} already ON`);
          }
        } else if (sensorValue > maxThreshold) {
          // Value too high -> Turn OFF device
          if (currentStatus !== 'off') {
            action = 'off';
            reason = `${sensorType}=${sensorValue} > ${maxThreshold}`;
            console.log(`🔽 HIGH ${sensorType.toUpperCase()}! Turning ${deviceType} OFF (${reason})`);
          } else {
            console.log(`✓ ${deviceType} already OFF`);
          }
        } else {
          console.log(`✅ ${deviceType} ${sensorType} OK (${sensorValue}), no action needed`);
        }
      }
      
      if (action) {
        await this.publishCommand(deviceType, action, sensorValue, sensorType);
      }
    } catch (error) {
      console.error(`Error in checkAndControl for ${deviceType}:`, error);
    }
  }

  async publishCommand(device, action, sensorValue, sensorType) {
    try {
      // Format payload đúng cho ESP32: {deviceType: 1/0}
      const cmd = {
        [device]: action === 'on' ? 1 : 0
      };
      const payload = JSON.stringify(cmd);

      // Publish đến đúng topic mà ESP32 đang subscribe
      const topic = `serverfm/devices/farm01/control`;
      this.mqttClient.publish(topic, payload, { qos: 1 });
      
      // Update local status
      this.deviceStatus[device] = action;
      
      console.log(`📤 [Sensor Control] Published:`);
      console.log(`   Topic: ${topic}`);
      console.log(`   Payload: ${payload}`);
      console.log(`   Reason: ${sensorType}=${sensorValue}`);
      console.log(`   Expected: ESP32 should ${action.toUpperCase()} the ${device}`);

      // Gửi thông báo qua WebSocket để frontend gửi email cảnh báo
      this.broadcastSensorControl(device, action, sensorValue, sensorType);
    } catch (error) {
      console.error(`Error publishing command:`, error);
    }
  }

  // Gửi thông báo đến tất cả client khi cảm biến tự động điều khiển thiết bị
  broadcastSensorControl(deviceType, action, sensorValue, sensorType) {
    if (!this.wss) {
      console.log('[SensorController] WebSocket server not available');
      return;
    }

    const message = JSON.stringify({
      type: 'sensorControl',
      deviceType: deviceType,
      action: action,
      sensorType: sensorType,
      sensorValue: sensorValue,
      sensorInfo: `${sensorType} = ${sensorValue}`,
      executedAt: new Date().toISOString()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });

    console.log(`[SensorController] 📡 Broadcasted sensor control: ${deviceType} ${action} (${sensorType}=${sensorValue})`);
  }

  stopSensorCheck(deviceType) {
    if (this.intervals[deviceType]) {
      clearInterval(this.intervals[deviceType]);
      delete this.intervals[deviceType];
      console.log(`🛑 Stopped sensor monitoring for ${deviceType}`);
    }
  }

  async restartSensorCheck(deviceType) {
    // Stop old monitoring first
    this.stopSensorCheck(deviceType);
    
    // Load fresh config from database
    const mode = await DeviceMode.findOne({ deviceType });
    if (mode && mode.mode === 'sensor') {
      console.log(`🔄 Restarting sensor monitoring for ${deviceType} with fresh config`);
      this.startSensorCheck(mode);
    } else {
      console.log(`⚠️ Cannot restart sensor monitoring for ${deviceType}: mode is ${mode?.mode || 'not found'}`);
    }
  }

  stop() {
    // Stop all intervals
    for (const deviceType in this.intervals) {
      this.stopSensorCheck(deviceType);
    }
    console.log('🛑 SensorController stopped');
  }

  // Get current sensor data for monitoring
  getSensorData() {
    return this.currentSensorData;
  }

  // Get device status
  getDeviceStatus(deviceType) {
    return this.deviceStatus[deviceType];
  }
}

module.exports = SensorController;
