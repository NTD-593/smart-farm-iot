# Hướng Dẫn Chạy Nhanh

## 1. Chuẩn Bị

### Cài đặt MongoDB
```powershell
# Khởi động MongoDB service
net start MongoDB

# Hoặc chạy mongod thủ công
mongod --dbpath "C:\data\db"
```

### Cài đặt MQTT Broker (Mosquitto)
```powershell
# Download: https://mosquitto.org/download/
# Sau khi cài, chạy:
mosquitto -v

# Hoặc dùng broker online (đã config sẵn trong backend/.env)
# ante.ddns.net:1883
```

## 2. Backend

```powershell
# Di chuyển vào thư mục backend
cd backend

# Cài dependencies (chỉ chạy lần đầu)
npm install

# Khởi động server
npm start
```

**Backend sẽ chạy:**
- HTTP API: http://localhost:3000
- WebSocket: ws://localhost:8080
- MQTT: Kết nối tới broker đã config

**Console sẽ hiện:**
```
[MongoDB] Connected to mongodb://localhost:27017/farm_monitor
[MQTT] Connected to mqtt://ante.ddns.net:1883
[MQTT] Subscribed to topic: serverfm/devices/+/telemetry
[WebSocket] Listening on port 8080
[HTTP] Server listening on port 3000
```

## 3. Frontend

**Mở terminal mới:**

```powershell
# Di chuyển vào thư mục frontend
cd frontend

# Cài dependencies (chỉ chạy lần đầu)
npm install

# Khởi động React app
npm start
```

**Frontend sẽ tự động mở browser:**
- URL: http://localhost:3000 (hoặc 3001 nếu port 3000 đang bận)

## 4. Test Kết Nối

### Test WebSocket
Mở Browser Console (F12) và xem log:
```
✅ WebSocket connected
```

### Test MQTT (Gửi dữ liệu giả)
```powershell
# Cài mosquitto clients nếu chưa có
# Gửi dữ liệu test
mosquitto_pub -h ante.ddns.net -t "serverfm/devices/ESP32_01/telemetry" -u mqtt_ante -P iotante123@X -m '{"data":[25.5, 60.2, 45.0, 0, 1, 0]}'
```

Frontend sẽ nhận và hiển thị dữ liệu:
- Nhiệt độ: 25.5°C
- Độ ẩm: 60.2%
- Độ ẩm đất: 45.0%

### Test Điều Khiển
Trong UI, click nút bật/tắt thiết bị (Bơm, Quạt, Đèn).

Backend sẽ publish MQTT message tới topic:
```
serverfm/devices/ESP32_01/control
```

## 5. Xem Dữ Liệu Trong MongoDB

```powershell
# Kết nối MongoDB shell
mongosh

# Chọn database
use farm_monitor

# Xem dữ liệu
db.telemetries.find().sort({createdAt: -1}).limit(5)
```

## Troubleshooting

### Lỗi: ECONNREFUSED localhost:3000
➜ Backend chưa chạy. Chạy `npm start` trong folder `backend`

### Lỗi: WebSocket connection failed
➜ Kiểm tra WS_PORT trong `backend/.env` phải là 8080
➜ Kiểm tra `REACT_APP_SOCKET_URL` trong `frontend/.env` là `ws://localhost:8080`

### Lỗi: MongoDB connection failed
➜ Chạy `net start MongoDB` hoặc `mongod`
➜ Kiểm tra MONGODB_URI trong `backend/.env`

### Lỗi: Cannot find module 'socket.io-client'
➜ Đã gỡ bỏ dependency này. Chạy lại `npm install` trong folder frontend

### Không nhận được dữ liệu MQTT
➜ Kiểm tra MQTT broker đang chạy
➜ Test bằng `mosquitto_sub -h ante.ddns.net -t "serverfm/devices/+/telemetry" -u mqtt_ante -P iotante123@X`
➜ Kiểm tra credentials trong `backend/.env`

## Cấu Trúc Port

| Service | Port | Protocol |
|---------|------|----------|
| Backend HTTP API | 3000 | HTTP |
| Backend WebSocket | 8080 | WS |
| Frontend Dev Server | 3000/3001 | HTTP |
| MongoDB | 27017 | TCP |
| MQTT Broker | 1883 | TCP |

## Device ID Mặc Định

Frontend đang sử dụng device ID mặc định: **farm01**

Để thay đổi, sửa trong file `frontend/src/config.js`:
```javascript
DEFAULT_DEVICE_ID: 'farm01', // Đổi thành device ID của bạn
```

Hoặc kiểm tra device ID có trong database:
```powershell
cd backend
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => mongoose.connection.db.collection('telemetries').distinct('deviceId')).then(ids => console.log('Device IDs:', ids)).finally(() => process.exit())"
```

## Tips

1. **Xem log realtime**: Mở Browser Console (F12) để xem WebSocket messages
2. **Test API trực tiếp**: Dùng Postman hoặc curl
   ```powershell
   curl http://localhost:3000/data?limit=5
   ```
3. **Restart sau khi đổi .env**: Sau khi sửa file `.env`, cần restart backend/frontend
4. **Clear cache**: Nếu frontend không cập nhật, clear browser cache (Ctrl+Shift+R)
