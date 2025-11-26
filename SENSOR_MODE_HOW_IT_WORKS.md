# 📊 CÁCH HOẠT ĐỘNG: Chế Độ Cảm Biến (Sensor Mode)

## 🔄 Tổng Quan Luồng Hoạt Động

```
ESP32 → MQTT Broker → Backend SensorController → Kiểm Tra Ngưỡng → MQTT Broker → ESP32 Điều Khiển
```

---

## 📝 Chi Tiết Từng Bước

### **Bước 1: Khởi Động SensorController**

**File:** `backend/services/sensorController.js`

Khi backend khởi động (`server.js`):

```javascript
const sensorController = new SensorController(mqttClient);
sensorController.start();
```

**SensorController làm gì?**

1. **Subscribe các MQTT topics:**
   ```javascript
   // Nhận dữ liệu cảm biến từ ESP32
   sensor/humidity       → Độ ẩm đất
   sensor/temperature    → Nhiệt độ không khí  
   sensor/light          → Cường độ ánh sáng
   
   // Nhận trạng thái thiết bị
   device/pump/status
   device/fan/status
   device/lamp/status
   ```

2. **Khởi tạo monitoring cho các thiết bị đang ở sensor mode:**
   ```javascript
   await this.initializeSensorMode();
   // → Tìm tất cả devices có mode = 'sensor'
   // → Start interval checking cho mỗi device
   ```

---

### **Bước 2: Nhận Dữ Liệu Cảm Biến**

**ESP32 publish dữ liệu lên MQTT:**

```javascript
// Topic: sensor/humidity
{
  "value": 45,
  "unit": "%"
}

// Topic: sensor/temperature  
{
  "value": 32,
  "unit": "°C"
}

// Topic: sensor/light
{
  "value": 65,
  "unit": "%"
}
```

**Backend nhận và lưu:**

```javascript
handleSensorData(topic, message) {
  const sensorType = topic.split('/')[1]; // 'humidity', 'temperature', 'light'
  const data = JSON.parse(message.toString());
  
  this.currentSensorData[sensorType] = {
    value: data.value,
    unit: data.unit || '',
    lastUpdate: new Date()  // ⏰ Timestamp quan trọng
  };
  
  console.log(`📊 Sensor update: ${sensorType} = ${data.value}${data.unit}`);
}
```

**Dữ liệu được lưu trong bộ nhớ:**
```javascript
{
  humidity: { value: 45, unit: "%", lastUpdate: "2025-11-25T08:00:00Z" },
  temperature: { value: 32, unit: "°C", lastUpdate: "2025-11-25T08:00:05Z" },
  light: { value: 65, unit: "%", lastUpdate: "2025-11-25T08:00:10Z" }
}
```

---

### **Bước 3: Bật Chế Độ Sensor cho Thiết Bị**

**Frontend gửi request:**

```http
PATCH /api/device-modes/pump/mode
{
  "mode": "sensor"
}
```

**Backend xử lý:**

```javascript
// File: routes/deviceModes.js

// 1. Cập nhật mode trong database
await DeviceMode.findOneAndUpdate(
  { deviceType: 'pump' },
  { mode: 'sensor', ... }
);

// 2. ✅ Khởi động monitoring (QUAN TRỌNG)
if (mode === 'sensor' && req.app.locals.sensorController) {
  await req.app.locals.sensorController.restartSensorCheck('pump');
  console.log(`✅ Started sensor monitoring for pump`);
}
```

**SensorController.restartSensorCheck() làm gì?**

```javascript
async restartSensorCheck(deviceType) {
  // Lấy config từ database
  const mode = await DeviceMode.findOne({ deviceType: 'pump' });
  
  // mode = {
  //   deviceType: 'pump',
  //   mode: 'sensor',
  //   sensorConfig: {
  //     sensorType: 'humidity',
  //     minThreshold: 30,
  //     maxThreshold: 70,
  //     checkInterval: 60  // giây
  //   }
  // }
  
  this.startSensorCheck(mode);
}
```

---

### **Bước 4: Monitoring Loop (Vòng Lặp Kiểm Tra)**

**startSensorCheck() tạo interval:**

```javascript
startSensorCheck(deviceMode) {
  const { deviceType, sensorConfig } = deviceMode;
  
  console.log(`🎬 Starting sensor monitoring for ${deviceType}`);
  console.log(`   Sensor type: ${sensorConfig.sensorType}`);
  console.log(`   Min threshold: ${sensorConfig.minThreshold}%`);
  console.log(`   Max threshold: ${sensorConfig.maxThreshold}%`);
  console.log(`   Check interval: ${sensorConfig.checkInterval}s`);
  
  // Tạo interval - chạy mỗi X giây
  const intervalId = setInterval(async () => {
    await this.checkAndControl(deviceType, sensorConfig);
  }, sensorConfig.checkInterval * 1000);
  
  this.intervals['pump'] = intervalId;
  
  // Chạy ngay lần đầu (không chờ interval)
  this.checkAndControl(deviceType, sensorConfig);
}
```

**Timeline:**
```
T=0s   → checkAndControl() lần 1
T=60s  → checkAndControl() lần 2  
T=120s → checkAndControl() lần 3
T=180s → checkAndControl() lần 4
...
```

---

### **Bước 5: Kiểm Tra và Điều Khiển**

**checkAndControl() - Hàm quan trọng nhất:**

```javascript
async checkAndControl(deviceType, config) {
  // VD: deviceType = 'pump', config.sensorType = 'humidity'
  
  // ========================
  // 1. VERIFY MODE
  // ========================
  const mode = await DeviceMode.findOne({ deviceType: 'pump' });
  
  if (!mode || mode.mode !== 'sensor') {
    console.log(`⏭️ Stopping - mode changed to ${mode?.mode}`);
    this.stopSensorCheck('pump');
    return; // ❌ Dừng nếu không còn ở sensor mode
  }
  
  // ========================
  // 2. GET SENSOR DATA
  // ========================
  const sensorType = config.sensorType; // 'humidity'
  const sensorData = this.currentSensorData['humidity'];
  const sensorValue = sensorData?.value || 0; // 45
  const lastUpdate = sensorData?.lastUpdate;
  
  // ========================
  // 3. CHECK DATA FRESHNESS
  // ========================
  if (!lastUpdate) {
    console.log(`⚠️ No humidity data received yet`);
    return; // ❌ Chưa có dữ liệu
  }
  
  const dataAge = Date.now() - lastUpdate.getTime();
  if (dataAge > 120000) { // > 2 phút
    console.log(`⚠️ Data too old (${Math.round(dataAge/1000)}s)`);
    return; // ❌ Dữ liệu quá cũ
  }
  
  // ========================
  // 4. DECISION LOGIC
  // ========================
  console.log(`🔍 Checking pump: humidity=${sensorValue}%, range=[30, 70]`);
  
  const currentStatus = this.deviceStatus['pump']; // 'on' hoặc 'off'
  let action = null;
  
  // --- PUMP LOGIC (humidity sensor) ---
  if (sensorValue < config.minThreshold) {
    // 45 < 30? NO
    // Nếu độ ẩm THẤP → BẬT bơm
    if (currentStatus !== 'on') {
      action = 'on';
      console.log(`🔼 LOW HUMIDITY! Turning pump ON (${sensorValue} < 30)`);
    }
  } 
  else if (sensorValue > config.maxThreshold) {
    // 45 > 70? NO
    // Nếu độ ẩm CAO → TẮT bơm
    if (currentStatus !== 'off') {
      action = 'off';
      console.log(`🔽 HIGH HUMIDITY! Turning pump OFF (${sensorValue} > 70)`);
    }
  }
  else {
    // 30 <= 45 <= 70? YES ✅
    console.log(`✅ pump humidity OK (45%), no action needed`);
    return; // ❌ Trong khoảng an toàn, không làm gì
  }
  
  // ========================
  // 5. PUBLISH MQTT COMMAND
  // ========================
  if (action) {
    await this.publishCommand('pump', action, sensorValue, 'humidity');
  }
}
```

---

### **Bước 6: Gửi Lệnh Điều Khiển**

**Khi cần điều khiển (action != null):**

```javascript
async publishCommand(device, action, sensorValue, sensorType) {
  // device = 'pump'
  // action = 'on'
  // sensorValue = 25 (giả sử giảm xuống)
  // sensorType = 'humidity'
  
  // ========================
  // FORMAT PAYLOAD
  // ========================
  const cmd = {
    [device]: action === 'on' ? 1 : 0
  };
  // cmd = { "pump": 1 }
  
  const payload = JSON.stringify(cmd);
  // payload = '{"pump":1}'
  
  // ========================
  // PUBLISH MQTT
  // ========================
  const topic = `serverfm/devices/farm01/control`;
  this.mqttClient.publish(topic, payload, { qos: 1 });
  
  // ========================
  // UPDATE LOCAL STATUS
  // ========================
  this.deviceStatus['pump'] = action; // 'on'
  
  console.log(`📤 [Sensor Control] Published: ${topic} -> ${payload}`);
  console.log(`   Reason: ${sensorType}=${sensorValue}`);
}
```

**ESP32 nhận:**
```
Topic: serverfm/devices/farm01/control
Payload: {"pump": 1}

→ ESP32 parse JSON
→ Tìm key "pump"
→ Value = 1 → BẬT relay bơm nước
```

---

## 🎯 Ví Dụ Thực Tế

### **Scenario: Bơm Nước Tự Động**

**Cấu hình:**
```javascript
{
  deviceType: 'pump',
  mode: 'sensor',
  sensorConfig: {
    sensorType: 'humidity',
    minThreshold: 30,   // 30%
    maxThreshold: 70,   // 70%
    checkInterval: 60   // 60 giây
  }
}
```

**Timeline hoạt động:**

| Thời Gian | Độ Ẩm | Trạng Thái | Hành Động | Lý Do |
|-----------|-------|------------|-----------|-------|
| **08:00:00** | 65% | OFF | ✅ Không làm gì | 30 < 65 < 70 (OK) |
| **08:01:00** | 62% | OFF | ✅ Không làm gì | 30 < 62 < 70 (OK) |
| **08:02:00** | 28% | OFF | 🔼 **BẬT BƠM** | 28 < 30 (Quá khô!) |
| **08:03:00** | 35% | ON | ✅ Không làm gì | 30 < 35 < 70 (Đang tưới) |
| **08:04:00** | 50% | ON | ✅ Không làm gì | 30 < 50 < 70 (Đang tưới) |
| **08:05:00** | 68% | ON | ✅ Không làm gì | 30 < 68 < 70 (Sắp đủ) |
| **08:06:00** | 72% | ON | 🔽 **TẮT BƠM** | 72 > 70 (Đủ ẩm!) |
| **08:07:00** | 71% | OFF | ✅ Không làm gì | 30 < 71 < 70 (OK) |

---

## 🔥 Logic Điều Khiển Từng Thiết Bị

### **1. PUMP (Bơm Nước) - Humidity Sensor**

```javascript
// Sensor: humidity (độ ẩm đất)
// Min: 30%, Max: 70%

if (humidity < 30) {
  action = 'on';  // 🔼 Quá khô → Tưới nước
}
else if (humidity > 70) {
  action = 'off'; // 🔽 Đủ ẩm → Dừng tưới
}
else {
  // 30 ≤ humidity ≤ 70 → OK, không làm gì
}
```

**Nguyên tắc:** Độ ẩm THẤP → BẬT bơm

---

### **2. FAN (Quạt) - Temperature Sensor**

```javascript
// Sensor: temperature (nhiệt độ không khí)
// Min: 28°C, Max: 35°C

if (sensorType === 'temperature') {
  if (temperature > 35) {
    action = 'on';  // 🔥 Quá nóng → Bật quạt làm mát
  }
  else if (temperature < 28) {
    action = 'off'; // ❄️ Đủ mát → Tắt quạt
  }
  else {
    // 28 ≤ temperature ≤ 35 → OK, không làm gì
  }
}
```

**Nguyên tắc:** Nhiệt độ CAO → BẬT quạt (NGƯỢC với pump!)

---

### **3. LAMP (Đèn) - Light Sensor**

```javascript
// Sensor: light (cường độ ánh sáng)
// Min: 20%, Max: 80%

if (light < 20) {
  action = 'on';  // 🌙 Quá tối → Bật đèn
}
else if (light > 80) {
  action = 'off'; // ☀️ Đủ sáng → Tắt đèn
}
else {
  // 20 ≤ light ≤ 80 → OK, không làm gì
}
```

**Nguyên tắc:** Ánh sáng THẤP → BẬT đèn

---

## 🛑 Khi Nào Dừng Monitoring?

### **1. Chuyển sang chế độ khác**

```javascript
// User đổi từ sensor → manual
PATCH /api/device-modes/pump/mode
{ "mode": "manual" }

→ Backend gọi: sensorController.stopSensorCheck('pump')
→ clearInterval(intervalId)
→ Dừng kiểm tra
```

### **2. Trong checkAndControl() phát hiện mode đã đổi**

```javascript
const mode = await DeviceMode.findOne({ deviceType: 'pump' });

if (!mode || mode.mode !== 'sensor') {
  this.stopSensorCheck('pump');
  return; // Tự động dừng
}
```

---

## 📊 Kiểm Tra Hoạt Động

### **1. Log Backend**

**Khi khởi động:**
```
🤖 SensorController: Starting...
✅ Subscribed to sensor/#
✅ Subscribed to device/+/status
ℹ️ No devices in sensor mode
```

**Khi chuyển sang sensor mode:**
```
🔄 Switched pump to sensor mode
✅ Started sensor monitoring for pump
🎬 Starting sensor monitoring for pump
   Sensor type: humidity
   Min threshold: 30%
   Max threshold: 70%
   Check interval: 60s
```

**Khi nhận dữ liệu cảm biến:**
```
📊 Sensor update: humidity = 45%
```

**Khi kiểm tra (mỗi 60s):**
```
🔍 Checking pump: humidity=45%, range=[30, 70]
✅ pump humidity OK (45%), no action needed
```

**Khi cần điều khiển:**
```
🔍 Checking pump: humidity=25%, range=[30, 70]
🔼 LOW HUMIDITY! Turning pump ON (humidity=25 < 30)
📤 [Sensor Control] Published: serverfm/devices/farm01/control -> {"pump":1}
   Reason: humidity=25
```

---

### **2. MQTT Messages**

**Subscribe để xem:**
```
# Cảm biến
sensor/humidity
sensor/temperature
sensor/light

# Điều khiển
serverfm/devices/farm01/control
```

**Message mẫu:**
```json
// sensor/humidity
{"value": 45, "unit": "%"}

// serverfm/devices/farm01/control
{"pump": 1}
{"fan": 0}
{"lamp": 1}
```

---

## ⚠️ Điều Kiện Hoạt Động

### **1. ESP32 phải publish sensor data**

```cpp
// ESP32 code phải publish định kỳ:
mqtt.publish("sensor/humidity", "{\"value\":45,\"unit\":\"%\"}");
mqtt.publish("sensor/temperature", "{\"value\":32,\"unit\":\"°C\"}");
mqtt.publish("sensor/light", "{\"value\":65,\"unit\":\"%\"}");
```

### **2. Dữ liệu phải mới (< 2 phút)**

```javascript
const dataAge = Date.now() - lastUpdate.getTime();
if (dataAge > 120000) {
  console.log(`⚠️ Data too old`);
  return; // Không điều khiển với data cũ
}
```

### **3. Device phải ở sensor mode**

```javascript
if (mode.mode !== 'sensor') {
  return; // Không điều khiển
}
```

---

## 🔧 Cấu Hình Sensor

### **Thay đổi ngưỡng:**

```http
PATCH /api/device-modes/pump/sensor-config
{
  "minThreshold": 35,
  "maxThreshold": 75,
  "checkInterval": 30
}
```

**Backend sẽ:**
1. Cập nhật config trong database
2. **Tự động restart monitoring** với config mới

---

## 🎯 Tóm Tắt

**Chế độ Sensor hoạt động theo chu trình:**

1. **Nhận** dữ liệu cảm biến từ ESP32 (MQTT)
2. **Lưu** vào bộ nhớ với timestamp
3. **Kiểm tra** định kỳ (mỗi X giây)
4. **So sánh** với ngưỡng min/max
5. **Quyết định** bật/tắt dựa trên logic
6. **Gửi** lệnh MQTT về ESP32
7. **Lặp lại** từ bước 3

**Key points:**
- ✅ Topic MQTT đúng: `serverfm/devices/farm01/control`
- ✅ Payload format đúng: `{"pump": 1}`
- ✅ Logic đúng cho từng thiết bị
- ✅ Auto start/stop monitoring khi đổi mode
- ✅ Kiểm tra data freshness
- ✅ Không điều khiển nếu trong khoảng an toàn

**Không ảnh hưởng:**
- Manual mode: Điều khiển trực tiếp vẫn hoạt động
- Schedule mode: Lịch hẹn vẫn chạy độc lập
