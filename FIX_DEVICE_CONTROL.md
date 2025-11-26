# ✅ Sửa Lỗi: Nút Bật/Tắt Không Hoạt Động

## Vấn Đề
❌ Click nút bật/tắt thiết bị nhưng UI không cập nhật
❌ Nút vẫn ở vị trí OFF dù hiện "Đang tắt"

## Nguyên Nhân
1. Backend không broadcast device status về client khi nhận control command
2. Frontend không cập nhật UI ngay (đợi server response)

## Giải Pháp Đã Áp Dụng

### 1. Backend (`server.js`)
✅ Thêm broadcast device status khi nhận control command qua WebSocket
✅ Gửi message type 'deviceStatus' cho tất cả clients

### 2. Frontend (`FarmContext.js`)
✅ Optimistic update: Cập nhật UI ngay khi click (không đợi server)
✅ Rollback nếu có lỗi

## Cách Áp Dụng

### Bước 1: Restart Backend (BẮT BUỘC)

**Tìm terminal đang chạy backend và:**
```
Ctrl + C (stop server)
npm start (restart)
```

**Hoặc nếu không tìm thấy terminal:**
```powershell
# Kill process cũ
taskkill /PID 15276 /F

# Restart
cd backend
npm start
```

### Bước 2: Reload Frontend

Frontend sẽ tự động hot reload, nhưng để chắc:
```
Ctrl + Shift + R trong browser
```

## Kiểm Tra Hoạt Động

### 1. Mở Browser Console (F12)
Khi click nút bật/tắt, bạn sẽ thấy:

```javascript
// WebSocket nhận message
{
  type: 'deviceStatus',
  deviceName: 'pump',
  status: 'on',
  timestamp: '2025-11-06T...'
}
```

### 2. Test Các Nút
- Click **Bơm Nước** → toggle ON → badge chuyển "Đang bật"
- Click **Quạt** → toggle ON → badge chuyển "Đang bật"
- Click **Đèn** → toggle ON → badge chuyển "Đang bật"
- Click lại → toggle OFF → badge về "Đang tắt"

### 3. Kiểm Tra MQTT (Optional)
Nếu có MQTT client, subscribe:
```
serverfm/devices/farm01/control
```

Khi click nút, sẽ thấy message:
```json
{"pump": 1}  // hoặc 0 khi tắt
{"fan": 1}
{"light": 1}
```

## Luồng Hoạt Động Mới

```
User click nút
    ↓
Frontend: Cập nhật UI ngay (Optimistic)
    ↓
Gọi API POST /control
    ↓
Backend: Publish MQTT
    ↓
Backend: Broadcast deviceStatus qua WebSocket
    ↓
Frontend: Nhận WebSocket message
    ↓
Confirm trạng thái (hoặc rollback nếu lỗi)
```

## Nếu Vẫn Không Hoạt Động

### Debug Checklist:

**1. Backend có chạy không?**
```powershell
netstat -ano | findstr :3000
```
Phải thấy LISTENING

**2. WebSocket có kết nối không?**
```powershell
netstat -ano | findstr :8080
```
Phải thấy ESTABLISHED

**3. Browser Console có lỗi gì không?**
- F12 → Console tab
- Click nút
- Xem có error màu đỏ không

**4. Network tab**
- F12 → Network tab
- Click nút
- Thấy request POST `/control` với status 200?

**5. WebSocket messages**
- F12 → Network → WS (WebSocket)
- Click connection `ws://localhost:8080`
- Tab Messages → click nút và xem message flow

## Test Nhanh Qua API

```powershell
# Test bật bơm
curl -X POST http://localhost:3000/control -H "Content-Type: application/json" -d "{\"device\": \"farm01\", \"cmd\": {\"pump\": 1}}"

# Test tắt bơm
curl -X POST http://localhost:3000/control -H "Content-Type: application/json" -d "{\"device\": \"farm01\", \"cmd\": {\"pump\": 0}}"
```

## Ghi Chú

- **Optimistic Update**: UI cập nhật ngay không đợi server → trải nghiệm nhanh hơn
- **Rollback**: Nếu API lỗi, UI sẽ rollback về trạng thái cũ
- **WebSocket Broadcast**: Tất cả clients đang kết nối đều nhận update realtime

## Files Đã Sửa
- ✅ `backend/server.js` (thêm broadcast device status)
- ✅ `frontend/src/context/FarmContext.js` (optimistic update + rollback)

---

**⚠️ QUAN TRỌNG: Phải restart backend để thay đổi có hiệu lực!**

```powershell
# Terminal backend (Ctrl+C rồi)
npm start
```
