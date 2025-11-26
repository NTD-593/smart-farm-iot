# 🧪 HƯỚNG DẪN TEST CHẾ ĐỘ SENSOR

## ✅ Chức Năng Sensor Mode Đã Được Sửa

### Lỗi đã sửa:
1. ✅ MQTT topic sai → Đã sửa thành `serverfm/devices/farm01/control`
2. ✅ Payload format sai → Đã sửa thành `{"pump": 1}`
3. ✅ Logic fan ngược → Đã sửa (nóng = bật quạt)
4. ✅ Không auto start → Đã thêm auto start/stop

---

## 🚀 CÁCH TEST NHANH

### Cách 1: Dùng Frontend (Đơn giản nhất)

1. **Khởi động backend:**
   ```powershell
   cd backend
   npm start
   ```

2. **Khởi động frontend:**
   ```powershell
   cd frontend
   npm start
   ```

3. **Vào trình duyệt:**
   - Mở http://localhost:3001
   - Đăng nhập
   - Vào **Device Control**

4. **Bật chế độ Sensor:**
   - Chọn thiết bị (VD: Bơm nước)
   - Chuyển sang "Cảm biến"
   - Cấu hình ngưỡng (VD: Min=30, Max=70)

5. **Kiểm tra log backend:**
   ```
   ✅ Started sensor monitoring for pump
   🎬 Starting sensor monitoring for pump
      Min threshold: 30%
      Max threshold: 70%
      Check interval: 60s
   ```

6. **Giả lập dữ liệu cảm biến:**
   - Chạy script test (xem Cách 2)
   - Hoặc dùng ESP32 thật

---

### Cách 2: Dùng Test Script (Kiểm tra logic)

1. **Chắc chắn backend đang chạy**

2. **Chạy test script:**
   ```powershell
   cd backend
   node test-sensor-mode.js
   ```

3. **Script sẽ:**
   - Kết nối MQTT
   - Giả lập dữ liệu cảm biến
   - Subscribe control topic để xem lệnh

4. **Xem output:**
   ```
   📤 Published: sensor/humidity -> {"value":25,"unit":"%"}
   Expected: 🔼 Turn pump ON (25% < 30%)
   📥 [CONTROL RECEIVED] {"pump":1}  ← Backend gửi lệnh
   ```

5. **Kiểm tra backend log:**
   ```
   📊 Sensor update: humidity = 25%
   🔍 Checking pump: humidity=25%, range=[30, 70]
   🔼 LOW HUMIDITY! Turning pump ON
   📤 [Sensor Control] Published: serverfm/devices/farm01/control -> {"pump":1}
   ```

---

### Cách 3: Dùng MQTT Client (MQTT.fx, MQTT Explorer)

1. **Kết nối MQTT broker:**
   - Host: localhost
   - Port: 1883
   - Username: mqtt_ante
   - Password: iotante123@X

2. **Subscribe topics:**
   ```
   sensor/#
   serverfm/devices/farm01/control
   ```

3. **Publish dữ liệu cảm biến:**
   ```
   Topic: sensor/humidity
   Payload: {"value":25,"unit":"%"}
   ```

4. **Xem backend gửi lệnh:**
   ```
   Topic: serverfm/devices/farm01/control
   Payload: {"pump":1}
   ```

---

## 📊 TEST CASES

### Test 1: Pump (Độ Ẩm)

**Cấu hình:** Min=30%, Max=70%

| Độ Ẩm | Backend Sẽ Làm Gì | MQTT Output |
|-------|-------------------|-------------|
| 25% | 🔼 Bật bơm | `{"pump":1}` |
| 50% | ✅ Không làm gì | (không có) |
| 75% | 🔽 Tắt bơm | `{"pump":0}` |

### Test 2: Fan (Nhiệt Độ)

**Cấu hình:** Min=28°C, Max=35°C

| Nhiệt Độ | Backend Sẽ Làm Gì | MQTT Output |
|----------|-------------------|-------------|
| 37°C | 🔥 Bật quạt | `{"fan":1}` |
| 30°C | ✅ Không làm gì | (không có) |
| 25°C | ❄️ Tắt quạt | `{"fan":0}` |

### Test 3: Lamp (Ánh Sáng)

**Cấu hình:** Min=20%, Max=80%

| Ánh Sáng | Backend Sẽ Làm Gì | MQTT Output |
|----------|-------------------|-------------|
| 15% | 💡 Bật đèn | `{"lamp":1}` |
| 50% | ✅ Không làm gì | (không có) |
| 85% | ☀️ Tắt đèn | `{"lamp":0}` |

---

## 🔍 KIỂM TRA LOG

### Backend Log Khi Hoạt Động Đúng:

```
[MongoDB] Connected to mongodb://localhost:27017/farm_monitor
✅ Initialized default mode for pump with sensor type humidity
[MQTT] Connected to mqtt://localhost:1883
🤖 SensorController: Starting...
✅ Subscribed to sensor/#
✅ Subscribed to device/+/status

// Khi chuyển sang sensor mode:
🔄 Switched pump to sensor mode
✅ Started sensor monitoring for pump
🎬 Starting sensor monitoring for pump
   Sensor type: humidity
   Min threshold: 30%
   Max threshold: 70%
   Check interval: 60s

// Khi nhận dữ liệu cảm biến:
📊 Sensor update: humidity = 25%

// Khi kiểm tra (mỗi 60s):
🔍 Checking pump: humidity=25%, range=[30, 70]
🔼 LOW HUMIDITY! Turning pump ON (humidity=25 < 30)
📤 [Sensor Control] Published: serverfm/devices/farm01/control -> {"pump":1}
   (humidity: 25)
```

---

## ⚠️ TROUBLESHOOTING

### Không thấy log "Started sensor monitoring"?

**Nguyên nhân:** Device chưa ở sensor mode

**Giải pháp:**
```http
PATCH http://localhost:3000/api/device-modes/pump/mode
Authorization: Bearer <token>
Content-Type: application/json

{
  "mode": "sensor"
}
```

---

### Không thấy "Sensor update"?

**Nguyên nhân:** Backend không nhận dữ liệu MQTT

**Kiểm tra:**
1. MQTT broker có chạy không?
2. Backend có subscribe `sensor/#` không? (xem log)
3. ESP32/Test script có publish đúng format không?

**Format đúng:**
```json
Topic: sensor/humidity
Payload: {"value":45,"unit":"%"}
```

---

### Không thấy lệnh điều khiển?

**Nguyên nhân:** Giá trị cảm biến trong khoảng an toàn

**Ví dụ:** 
- Cấu hình: Min=30, Max=70
- Giá trị: 50
- → Không làm gì vì 30 < 50 < 70 ✅

**Test:** Gửi giá trị ngoài khoảng:
```json
{"value":25,"unit":"%"}  ← < 30 → Sẽ bật
{"value":75,"unit":"%"}  ← > 70 → Sẽ tắt
```

---

### Data too old?

**Log:** `⚠️ Data too old (150s)`

**Nguyên nhân:** Dữ liệu cảm biến > 2 phút

**Giải pháp:** Publish dữ liệu mới:
```json
Topic: sensor/humidity
Payload: {"value":45,"unit":"%"}
```

---

## 📝 CHECKLIST

Trước khi test, đảm bảo:

- [ ] Backend đang chạy (`npm start` trong `backend/`)
- [ ] MQTT broker đang chạy (localhost:1883)
- [ ] Device đã chuyển sang chế độ SENSOR
- [ ] Đã cấu hình ngưỡng (min/max threshold)
- [ ] Có dữ liệu cảm biến được publish lên `sensor/*`

---

## 🎯 KẾT QUẢ MONG ĐỢI

✅ Backend nhận dữ liệu cảm biến
✅ Kiểm tra định kỳ (mỗi 60s)
✅ Gửi lệnh MQTT khi cần
✅ ESP32 nhận được lệnh đúng format
✅ Thiết bị bật/tắt tự động

---

## 📚 TÀI LIỆU THAM KHẢO

- **Chi tiết cách hoạt động:** `SENSOR_MODE_HOW_IT_WORKS.md`
- **Lỗi đã sửa:** `FIX_AUTO_MODE.md`
- **Quick start:** `QUICK_START.md`
