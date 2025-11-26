# Hệ Thống Nông Trại Thông Minh (Smart Farm IoT)

Dự án giám sát và điều khiển nông trại thông minh sử dụng MQTT, WebSocket, MongoDB và React.

## Kiến Trúc

### Backend
- **Node.js + Express** - REST API server
- **MQTT Client** - Nhận dữ liệu từ thiết bị IoT
- **MongoDB** - Lưu trữ dữ liệu telemetry
- **WebSocket (ws)** - Phát dữ liệu realtime cho frontend

### Frontend
- **React** - UI framework
- **WebSocket API** - Kết nối realtime với backend
- **Axios** - REST API calls
- **Recharts** - Biểu đồ dữ liệu

## Cấu Hình

### Backend (.env)
```env
PROJECT_NAME=serverfm
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=mqtt_ante
MQTT_PASSWORD=iotante123@X
MQTT_TOPIC_SUBSCRIBE=serverfm/devices/+/telemetry
CONTROL_TOPIC_TEMPLATE=serverfm/devices/{device}/control
MONGODB_URI=mongodb://localhost:27017/farm_monitor
HTTP_PORT=3000
WS_PORT=8080
LOG_LEVEL=info
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=ws://localhost:8080
```

## Cài Đặt & Chạy

### Yêu Cầu
- Node.js v16+
- MongoDB
- MQTT Broker (Mosquitto)

### 1. Cài Đặt Dependencies

#### Backend
```powershell
cd backend
npm install
```

#### Frontend
```powershell
cd frontend
npm install
```

### 2. Khởi Động Dịch Vụ

#### MongoDB
```powershell
# Windows - nếu cài MongoDB service
net start MongoDB

# Hoặc chạy thủ công
mongod --dbpath "C:\data\db"
```

#### MQTT Broker
```powershell
# Nếu dùng Mosquitto
mosquitto -c mosquitto.conf

# Hoặc dùng broker online: mqtt://test.mosquitto.org
```

#### Backend Server
```powershell
cd backend
npm start
```
Server sẽ chạy:
- HTTP API: `http://localhost:3000`
- WebSocket: `ws://localhost:8080`

#### Frontend
```powershell
cd frontend
npm start
```
Truy cập: `http://localhost:3000` (React dev server thường dùng port 3000, nếu trùng sẽ hỏi dùng 3001)

## API Endpoints

### REST API (Backend)

#### GET /data
Lấy dữ liệu telemetry (có phân trang)
```
Query params:
- page: số trang (default: 1)
- limit: số records/trang (default: 20, max: 100)
- project: lọc theo project
- device: lọc theo deviceId
- from: lọc từ thời gian (ISO date)
- to: lọc đến thời gian (ISO date)
```

#### GET /data/search
Tìm kiếm dữ liệu theo device và khoảng thời gian
```
Query params:
- device: deviceId (required)
- from: ISO date
- to: ISO date
```

#### POST /control
Điều khiển thiết bị
```json
{
  "device": "ESP32_01",
  "cmd": {
    "pump": 1,
    "fan": 0,
    "light": 1
  }
}
```

#### PUT /data/:id
Cập nhật dữ liệu

#### DELETE /data/:id
Xóa dữ liệu

### WebSocket Protocol

#### Server -> Client Messages

**Telemetry Data:**
```json
{
  "type": "telemetry",
  "project": "serverfm",
  "deviceId": "ESP32_01",
  "data": {
    "temperature": 25.5,
    "humidity": 60.2,
    "humiGround": 45.0,
    "ctrPump": 0,
    "ctrLamp": 1,
    "ctrFan": 0
  },
  "createdAt": "2025-11-06T10:30:00.000Z",
  "id": "..."
}
```

#### Client -> Server Messages

**Control Device:**
```json
{
  "type": "control",
  "device": "ESP32_01",
  "cmd": {
    "pump": 1
  }
}
```

## MQTT Topics

### Subscribe (Backend nhận từ device)
```
serverfm/devices/{deviceId}/telemetry
```

**Payload format:**
```json
{
  "data": [
    25.5,  // temperature
    60.2,  // humidity
    45.0,  // humiGround
    0,     // ctrPump
    1,     // ctrLamp
    0      // ctrFan
  ]
}
```

### Publish (Backend gửi tới device)
```
serverfm/devices/{deviceId}/control
```

**Payload format:**
```json
{
  "pump": 1,
  "fan": 0,
  "light": 1
}
```

## Troubleshooting

### Frontend không kết nối được WebSocket
- Kiểm tra backend đã chạy chưa: `netstat -an | findstr :8080`
- Kiểm tra `.env` có đúng `REACT_APP_SOCKET_URL=ws://localhost:8080`
- Xem console browser có lỗi gì

### Backend không nhận dữ liệu MQTT
- Kiểm tra MQTT broker đã chạy: `netstat -an | findstr :1883`
- Test MQTT connection: `mosquitto_sub -h localhost -t "serverfm/devices/+/telemetry"`
- Kiểm tra username/password trong `.env`

### MongoDB không kết nối được
- Kiểm tra MongoDB đã chạy: `netstat -an | findstr :27017`
- Kiểm tra connection string trong `.env`

## Cấu Trúc Dữ Liệu MongoDB

**Collection: telemetries**
```javascript
{
  _id: ObjectId,
  project: String,        // "serverfm"
  deviceId: String,       // "ESP32_01"
  temperature: Number,    // °C
  humidity: Number,       // %
  humiGround: Number,     // %
  ctrPump: Number,        // 0 or 1
  ctrLamp: Number,        // 0 or 1
  ctrFan: Number,         // 0 or 1
  raw: Mixed,             // Original payload
  topic: String,          // MQTT topic
  createdAt: Date
}
```

## Phát Triển Tiếp

### Tính năng cần thêm:
- [ ] Xác thực người dùng (JWT)
- [ ] Multi-device management UI
- [ ] Alert/notification system
- [ ] Data export (CSV, Excel)
- [ ] Dashboard customization
- [ ] Mobile app support

### Cải tiến:
- [ ] Error handling tốt hơn
- [ ] Retry logic cho WebSocket
- [ ] Data caching
- [ ] Unit tests
- [ ] Docker deployment
- [ ] HTTPS/WSS support

## License
ISC
