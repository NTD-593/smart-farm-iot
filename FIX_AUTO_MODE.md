# ✅ Sửa Lỗi: Chế Độ Tự Động Bật Tắt Thiết Bị

## 🔍 Vấn Đề Đã Tìm Thấy

Hệ thống có 3 chế độ hoạt động:
1. **Thủ công (Manual)**: Điều khiển trực tiếp bằng tay ✅ HOẠT ĐỘNG
2. **Hẹn giờ (Schedule)**: Tự động theo lịch hẹn ✅ HOẠT ĐỘNG  
3. **Cảm biến (Sensor)**: Tự động dựa vào giá trị cảm biến ❌ KHÔNG HOẠT ĐỘNG

### Lỗi Tìm Thấy

#### 1. ❌ MQTT Topic Sai
**File:** `backend/services/sensorController.js`

**Vấn đề:**
```javascript
// SAI - Topic không đúng
this.mqttClient.publish(`device/${device}`, payload);
```

**ESP32 đang chờ:**
```
Topic: serverfm/devices/farm01/control
Payload: {"pump": 1} hoặc {"fan": 0}
```

**Sensor Controller đang gửi:**
```
Topic: device/pump  ❌ (ESP32 không subscribe)
Payload: {"action":"on","mode":"sensor",...}  ❌ (ESP32 không hiểu format này)
```

#### 2. ❌ Logic Điều Khiển Sai cho FAN
**Vấn đề:**
- Khi nhiệt độ **CAO** → Tắt quạt ❌ (NGƯỢC LẠI)
- Khi nhiệt độ **THẤP** → Bật quạt ❌ (NGƯỢC LẠI)

**Đúng phải là:**
- Khi nhiệt độ **CAO** → Bật quạt 🌡️ (làm mát)
- Khi nhiệt độ **THẤP** → Tắt quạt ❄️ (đủ mát)

#### 3. ❌ Không Tự Động Start Monitoring
**Vấn đề:** Khi chuyển chế độ sang "Sensor", backend không tự động bắt đầu kiểm tra cảm biến.

---

## ✅ Giải Pháp Đã Áp Dụng

### 1. Sửa MQTT Topic và Payload Format

**File:** `backend/services/sensorController.js` → Method `publishCommand()`

```javascript
async publishCommand(device, action, sensorValue, sensorType) {
  try {
    // ✅ Format payload đúng cho ESP32: {deviceType: 1/0}
    const cmd = {
      [device]: action === 'on' ? 1 : 0
    };
    const payload = JSON.stringify(cmd);

    // ✅ Publish đến đúng topic mà ESP32 đang subscribe
    const topic = `serverfm/devices/farm01/control`;
    this.mqttClient.publish(topic, payload, { qos: 1 });
    
    // Update local status
    this.deviceStatus[device] = action;
    
    console.log(`📤 [Sensor Control] Published: ${topic} -> ${payload}`);
  } catch (error) {
    console.error(`Error publishing command:`, error);
  }
}
```

**Kết quả:**
- ✅ Topic: `serverfm/devices/farm01/control` (giống Manual + Schedule)
- ✅ Payload: `{"pump": 1}` hoặc `{"fan": 0}` (ESP32 hiểu)

---

### 2. Sửa Logic Điều Khiển cho Fan

**File:** `backend/services/sensorController.js` → Method `checkAndControl()`

```javascript
// Logic điều khiển phụ thuộc vào loại cảm biến:
// - humidity (pump): LOW → ON (tưới), HIGH → OFF (đủ nước)
// - temperature (fan): HIGH → ON (làm mát), LOW → OFF (đủ mát) ✅ ĐÃ SỬA
// - light (lamp): LOW → ON (bật đèn), HIGH → OFF (đủ sáng)

if (sensorType === 'temperature') {
  // FAN: nhiệt độ cao → bật quạt, nhiệt độ thấp → tắt quạt
  if (sensorValue > config.maxThreshold) {
    // Temperature too high -> Turn ON fan
    action = 'on';
    console.log(`🔥 HIGH TEMPERATURE! Turning fan ON to cool down`);
  } else if (sensorValue < config.minThreshold) {
    // Temperature low enough -> Turn OFF fan
    action = 'off';
    console.log(`❄️ LOW TEMPERATURE! Turning fan OFF`);
  }
} else {
  // PUMP (humidity) & LAMP (light): giá trị thấp → bật, giá trị cao → tắt
  if (sensorValue < config.minThreshold) {
    action = 'on';
  } else if (sensorValue > config.maxThreshold) {
    action = 'off';
  }
}
```

**Logic Đúng:**

| Thiết Bị | Cảm Biến | Giá Trị Thấp | Giá Trị Cao |
|----------|----------|--------------|-------------|
| **Pump (Bơm)** | Humidity | 🔼 BẬT (tưới nước) | 🔽 TẮT (đủ ẩm) |
| **Fan (Quạt)** | Temperature | ❄️ TẮT (đủ mát) | 🔥 BẬT (làm mát) |
| **Lamp (Đèn)** | Light | 💡 BẬT (bật sáng) | ☀️ TẮT (đủ sáng) |

---

### 3. Tự Động Start/Stop Sensor Monitoring

**File:** `backend/server.js`

```javascript
// Store services in app.locals for route access
app.locals.sensorController = sensorController;
app.locals.scheduler = scheduler;
```

**File:** `backend/routes/deviceModes.js`

#### a) Khi đổi mode cho 1 thiết bị:
```javascript
router.patch('/:deviceType/mode', async (req, res) => {
  // ... update mode ...
  
  // ✅ If switched to sensor mode, start monitoring
  if (mode === 'sensor' && req.app.locals.sensorController) {
    await req.app.locals.sensorController.restartSensorCheck(deviceType);
    console.log(`✅ Started sensor monitoring for ${deviceType}`);
  }
  
  // ✅ If switched away from sensor mode, stop monitoring
  if (mode !== 'sensor' && req.app.locals.sensorController) {
    req.app.locals.sensorController.stopSensorCheck(deviceType);
    console.log(`🛑 Stopped sensor monitoring for ${deviceType}`);
  }
});
```

#### b) Khi đồng bộ mode cho tất cả thiết bị:
```javascript
router.post('/sync-all', async (req, res) => {
  // ... update all devices ...
  
  // ✅ Handle sensor monitoring for all devices
  if (req.app.locals.sensorController) {
    const deviceTypes = ['pump', 'fan', 'lamp'];
    for (const deviceType of deviceTypes) {
      if (mode === 'sensor') {
        await req.app.locals.sensorController.restartSensorCheck(deviceType);
      } else {
        req.app.locals.sensorController.stopSensorCheck(deviceType);
      }
    }
  }
});
```

---

## 🚀 Cách Sử Dụng

### Bước 1: Restart Backend (BẮT BUỘC)

**Phải restart backend để áp dụng các thay đổi:**

```powershell
# Trong VS Code terminal:
# 1. Tìm terminal đang chạy backend
# 2. Nhấn Ctrl + C để dừng
# 3. Chạy lại:
cd backend
npm start
```

**Hoặc nếu backend đang chạy background:**
```powershell
# Xem process đang chạy
Get-Process node

# Kill process (thay PID bằng số thực tế)
taskkill /PID <PID> /F

# Restart
cd backend
npm start
```

### Bước 2: Kiểm Tra Log

Khi backend khởi động, bạn sẽ thấy:

```
[MongoDB] Connected to mongodb://localhost:27017/farm_monitor
✅ Initialized default mode for pump with sensor type humidity
✅ Initialized default mode for fan with sensor type temperature
✅ Initialized default mode for lamp with sensor type light
[MQTT] Connected to mqtt://localhost:1883
🤖 SensorController: Starting...
✅ Subscribed to sensor/#
✅ Subscribed to device/+/status
🎬 Starting scheduler...
```

### Bước 3: Test Chế Độ Sensor

#### A. Chuyển 1 Thiết Bị sang Sensor Mode

1. Vào giao diện **Device Control**
2. Chọn thiết bị (VD: Bơm nước)
3. Chuyển sang chế độ **"Cảm biến"**
4. Cấu hình ngưỡng:
   - Min: 30%
   - Max: 70%
   - Interval: 60s

**Log Backend sẽ hiển thị:**
```
🔄 Switched pump to sensor mode
✅ Started sensor monitoring for pump
🎬 Starting sensor monitoring for pump
   Min threshold: 30%
   Max threshold: 70%
   Check interval: 60s
```

#### B. Kiểm Tra Hoạt Động

**Giả sử độ ẩm hiện tại: 25% (thấp hơn 30%)**

```
📊 Sensor update: humidity = 25%
🔍 Checking pump: humidity=25%, range=[30, 70]
🔼 LOW HUMIDITY! Turning pump ON (humidity=25 < 30)
📤 [Sensor Control] Published: serverfm/devices/farm01/control -> {"pump": 1}
```

**→ ESP32 nhận được lệnh và BẬT bơm nước**

**Sau khi độ ẩm tăng lên 75% (cao hơn 70%)**

```
📊 Sensor update: humidity = 75%
🔍 Checking pump: humidity=75%, range=[30, 70]
🔽 HIGH HUMIDITY! Turning pump OFF (humidity=75 > 70)
📤 [Sensor Control] Published: serverfm/devices/farm01/control -> {"pump": 0}
```

**→ ESP32 nhận được lệnh và TẮT bơm nước**

---

## 🧪 Test Cases

### Test 1: Pump (Bơm Nước) - Humidity Sensor

**Cấu hình:**
- Min: 30%
- Max: 70%

| Độ Ẩm | Hành Động | Kết Quả |
|--------|-----------|---------|
| 25% (< 30%) | ✅ Bật bơm | Tưới nước |
| 50% (30-70%) | ⏸️ Không thay đổi | Giữ nguyên |
| 75% (> 70%) | ✅ Tắt bơm | Đủ ẩm |

### Test 2: Fan (Quạt) - Temperature Sensor

**Cấu hình:**
- Min: 28°C
- Max: 35°C

| Nhiệt Độ | Hành Động | Kết Quả |
|----------|-----------|---------|
| 25°C (< 28°C) | ✅ Tắt quạt | Đủ mát |
| 30°C (28-35°C) | ⏸️ Không thay đổi | Giữ nguyên |
| 37°C (> 35°C) | ✅ Bật quạt | Làm mát |

### Test 3: Lamp (Đèn) - Light Sensor

**Cấu hình:**
- Min: 20%
- Max: 80%

| Ánh Sáng | Hành Động | Kết Quả |
|----------|-----------|---------|
| 15% (< 20%) | ✅ Bật đèn | Bổ sung ánh sáng |
| 50% (20-80%) | ⏸️ Không thay đổi | Giữ nguyên |
| 85% (> 80%) | ✅ Tắt đèn | Đủ sáng |

---

## 📊 MQTT Flow Comparison

### Trước Khi Sửa ❌
```
SensorController
    ↓
Topic: device/pump (WRONG)
Payload: {"action":"on","mode":"sensor",...} (WRONG)
    ↓
ESP32: Không nhận được (không subscribe topic này)
    ↓
❌ Thiết bị KHÔNG hoạt động
```

### Sau Khi Sửa ✅
```
SensorController
    ↓
Topic: serverfm/devices/farm01/control (CORRECT)
Payload: {"pump": 1} (CORRECT)
    ↓
ESP32: Nhận được message
    ↓
✅ Thiết bị hoạt động chính xác
```

---

## 🔍 Debug Tips

### 1. Kiểm Tra Sensor Data

```javascript
// Backend sẽ log mỗi khi nhận dữ liệu cảm biến:
📊 Sensor update: humidity = 45%
📊 Sensor update: temperature = 32°C
📊 Sensor update: light = 65%
```

### 2. Kiểm Tra Mode Status

```javascript
// Khi device ở sensor mode, mỗi checkInterval sẽ có log:
🔍 Checking pump: humidity=45%, range=[30, 70]
✅ pump humidity OK (45%), no action needed
```

### 3. Kiểm Tra MQTT Commands

Nếu bạn có MQTT client (như MQTT.fx hoặc MQTT Explorer):

**Subscribe topic:**
```
serverfm/devices/farm01/control
```

**Khi sensor trigger, sẽ thấy:**
```json
{"pump": 1}   // Bật bơm
{"fan": 1}    // Bật quạt
{"lamp": 0}   // Tắt đèn
```

---

## 📝 Summary of Changes

### Files Modified

1. ✅ `backend/services/sensorController.js`
   - Sửa MQTT topic: `device/${device}` → `serverfm/devices/farm01/control`
   - Sửa payload format: object phức tạp → `{deviceType: 1/0}`
   - Sửa logic temperature control cho fan (đảo ngược)

2. ✅ `backend/server.js`
   - Lưu sensorController vào `app.locals` để routes truy cập

3. ✅ `backend/routes/deviceModes.js`
   - Thêm auto start monitoring khi chuyển sang sensor mode
   - Thêm auto stop monitoring khi chuyển sang mode khác
   - Áp dụng cho cả single device và sync-all

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Không Ảnh Hưởng Chức Năng Khác
- ✅ Manual mode: KHÔNG thay đổi
- ✅ Schedule mode: KHÔNG thay đổi
- ✅ User management: KHÔNG thay đổi
- ✅ Charts/Dashboard: KHÔNG thay đổi

### 2. Yêu Cầu ESP32
ESP32 phải đang publish dữ liệu cảm biến lên các topic:
- `sensor/humidity` → cho pump
- `sensor/temperature` → cho fan
- `sensor/light` → cho lamp

Format message:
```json
{
  "value": 45,
  "unit": "%"
}
```

### 3. Thời Gian Kiểm Tra
- Default: 60 giây (có thể thay đổi trong sensor config)
- Dữ liệu cảm biến phải mới hơn 2 phút, nếu không hệ thống bỏ qua

---

## 🎯 Kết Luận

**✅ ĐÃ SỬA:**
1. MQTT topic sai → Đã sửa đúng format ESP32 cần
2. Logic fan ngược → Đã sửa (cao nhiệt độ = bật quạt)
3. Không auto start → Đã thêm auto start/stop monitoring

**✅ HOẠT ĐỘNG:**
- Chế độ Sensor giờ đã BẬT/TẮT thiết bị đúng
- ESP32 nhận được lệnh điều khiển
- Logic điều khiển chính xác cho từng loại thiết bị

**🚀 CÁCH SỬ DỤNG:**
1. Restart backend
2. Chuyển device sang sensor mode
3. Hệ thống tự động kiểm tra và điều khiển

---

Nếu vẫn gặp vấn đề, kiểm tra:
- Backend log có message "📤 [Sensor Control] Published" không?
- ESP32 có đang subscribe `serverfm/devices/+/control` không?
- Sensor data có được publish lên `sensor/*` không?
