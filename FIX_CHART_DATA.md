# ✅ Đã Sửa: Biểu Đồ Không Hiện Dữ Liệu

## Vấn Đề
Biểu đồ không hiển thị vì:
1. ❌ Device ID không khớp: Frontend tìm `ESP32_01` nhưng database có `farm01`
2. ❌ Logic aggregate chart data cần cải thiện

## Giải Pháp Đã Áp Dụng

### 1. Cập nhật Device ID
✅ Tạo file `frontend/src/config.js` để quản lý cấu hình tập trung
✅ Đổi DEFAULT_DEVICE_ID từ `ESP32_01` → `farm01`

### 2. Cải thiện Chart Data Aggregation
✅ Group data theo giờ với format dễ đọc: "Nov 6, 14:00"
✅ Sort data theo thời gian
✅ Handle null values đúng cách
✅ Tối ưu performance với early return

### 3. Files Đã Sửa
- ✅ `frontend/src/config.js` (mới)
- ✅ `frontend/src/services/api.js` 
- ✅ `frontend/src/services/socket.js`
- ✅ `QUICK_START.md`

## Cách Kiểm Tra

### 1. Reload Browser
Vì React dev server đã hot reload, nhưng để chắc chắn:
```
Ctrl + Shift + R (hard refresh)
```

### 2. Xem Console
Mở Browser Console (F12) và check:
- ✅ Không có error màu đỏ
- ✅ Thấy log WebSocket connected
- ✅ Network tab thấy request tới `/data/search?device=farm01`

### 3. Xác Nhận Data
Biểu đồ bây giờ sẽ hiện:
- 📊 Nhiệt độ (đường đỏ)
- 📊 Độ ẩm không khí (đường xanh dương)
- 📊 Độ ẩm đất (đường xanh lá)

### 4. Test API Trực Tiếp (Optional)
```powershell
# Kiểm tra data có trong DB
curl "http://localhost:3000/data/search?device=farm01&from=2025-11-05T00:00:00.000Z&to=2025-11-07T00:00:00.000Z"
```

Kết quả mong đợi: `"count": 1746` (hoặc số tương tự)

## Nếu Vẫn Không Thấy Biểu Đồ

### Debug Steps:

**1. Kiểm tra Device ID trong database:**
```powershell
cd backend
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => mongoose.connection.db.collection('telemetries').distinct('deviceId')).then(ids => console.log('Device IDs:', ids)).finally(() => process.exit())"
```

**2. Nếu device ID khác `farm01`:**
Sửa `frontend/src/config.js`:
```javascript
DEFAULT_DEVICE_ID: 'your_device_id_here',
```

**3. Kiểm tra data structure:**
```powershell
cd backend
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => mongoose.connection.db.collection('telemetries').findOne({deviceId: 'farm01'})).then(doc => console.log(JSON.stringify(doc, null, 2))).finally(() => process.exit())"
```

**4. Xem React console:**
```
F12 → Console tab
```
Tìm message: "Chart data error:" - nếu có thì sẽ thấy chi tiết lỗi

**5. Clear cache & restart:**
```powershell
# Stop frontend (Ctrl+C)
# Clear npm cache
cd frontend
npm cache clean --force

# Reinstall (nếu cần)
rm -rf node_modules
rm package-lock.json
npm install

# Restart
npm start
```

## Thay Đổi Device ID Sau Này

### Cách 1: Sửa config (Recommended)
Sửa file `frontend/src/config.js`:
```javascript
export const config = {
  DEFAULT_DEVICE_ID: 'farm01', // ← Đổi ở đây
  // ...
};
```

### Cách 2: Environment variable
Thêm vào `frontend/.env`:
```env
REACT_APP_DEVICE_ID=farm01
```

Rồi sửa `frontend/src/config.js`:
```javascript
DEFAULT_DEVICE_ID: process.env.REACT_APP_DEVICE_ID || 'farm01',
```

## Test Nhanh API

**Get latest data:**
```powershell
curl http://localhost:3000/data?limit=1
```

**Get chart data:**
```powershell
curl "http://localhost:3000/data/search?device=farm01"
```

**Check WebSocket:**
Mở http://localhost:3001 → F12 Console:
```
✅ WebSocket connected
```

## Summary

✅ Device ID đã sửa: `farm01`
✅ Chart aggregation đã optimize
✅ Config đã tách riêng file
✅ Code đã hot reload (nếu dev server đang chạy)

**→ Reload browser (Ctrl+Shift+R) và biểu đồ sẽ hiển thị!** 📊
