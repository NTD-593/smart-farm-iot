# 🔐 Hệ Thống Đăng Nhập & Phân Quyền

## 📋 Tổng Quan

Hệ thống authentication & authorization đã được thêm vào dự án với các tính năng:

- ✅ Đăng nhập/Đăng xuất
- ✅ JWT token-based authentication
- ✅ 3 cấp phân quyền: ADMIN, OPERATOR, VIEWER
- ✅ Quản lý users (CRUD)
- ✅ Bảo vệ các API endpoints

## 👥 Phân Quyền (Roles)

### 🔴 ADMIN (Quản trị viên)
**Quyền đầy đủ:**
- ✅ Xem tất cả dữ liệu
- ✅ Điều khiển thiết bị
- ✅ Sửa/Xóa dữ liệu telemetry
- ✅ **Quản lý users** (tạo, sửa, xóa user)
- ✅ Thay đổi phân quyền

### 🟡 OPERATOR (Người vận hành)
**Quyền vận hành:**
- ✅ Xem tất cả dữ liệu
- ✅ Điều khiển thiết bị (bật/tắt bơm, quạt, đèn)
- ❌ Không sửa/xóa dữ liệu
- ❌ Không quản lý users

### 🟢 VIEWER (Người xem)
**Chỉ xem:**
- ✅ Xem dữ liệu cảm biến
- ✅ Xem biểu đồ
- ❌ Không điều khiển thiết bị
- ❌ Không sửa/xóa dữ liệu
- ❌ Không quản lý users

## 🔑 Tài Khoản Admin Mặc Định

```
Username: admin
Password: admin123
Role: ADMIN
```

**⚠️ QUAN TRỌNG:** Đổi password ngay sau lần đăng nhập đầu tiên!

## 🚀 API Endpoints

### Authentication (`/api/auth`)

#### 1. Đăng nhập
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "fullName": "System Administrator",
    "role": "ADMIN"
  }
}
```

#### 2. Lấy thông tin user hiện tại
```bash
GET /api/auth/me
Authorization: Bearer <token>

# Response:
{
  "id": "...",
  "username": "admin",
  "fullName": "System Administrator",
  "role": "ADMIN",
  "lastLogin": "2025-11-18T..."
}
```

#### 3. Đổi password
```bash
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "admin123",
  "newPassword": "newSecurePassword123"
}
```

#### 4. Đăng xuất
```bash
POST /api/auth/logout
Authorization: Bearer <token>

# Response:
{
  "message": "Logged out successfully"
}
```

### User Management (`/api/users`) - ADMIN Only

#### 1. Danh sách users
```bash
GET /api/users
Authorization: Bearer <admin_token>

# Response:
{
  "users": [
    {
      "id": "...",
      "username": "admin",
      "fullName": "System Administrator",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "..."
    },
    ...
  ],
  "count": 3
}
```

#### 2. Tạo user mới
```bash
POST /api/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "operator1",
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "role": "OPERATOR"
}

# Response:
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "username": "operator1",
    "fullName": "Nguyễn Văn A",
    "role": "OPERATOR"
  }
}
```

#### 3. Cập nhật user
```bash
PUT /api/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fullName": "Nguyễn Văn B",
  "role": "VIEWER",
  "isActive": false
}
```

#### 4. Xóa user
```bash
DELETE /api/users/:id
Authorization: Bearer <admin_token>

# Response:
{
  "message": "User deleted successfully"
}
```

### Protected Endpoints

#### Điều khiển thiết bị (OPERATOR + ADMIN)
```bash
POST /control
Authorization: Bearer <token>
Content-Type: application/json

{
  "device": "farm01",
  "cmd": {
    "pump": 1
  }
}

# Nếu user là VIEWER → 403 Forbidden
```

#### Sửa dữ liệu (ADMIN Only)
```bash
PUT /data/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "temperature": 26.5
}
```

#### Xóa dữ liệu (ADMIN Only)
```bash
DELETE /data/:id
Authorization: Bearer <admin_token>
```

## 🧪 Test API với cURL

### 1. Đăng nhập
```powershell
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"admin123"}'
```

### 2. Lấy danh sách users (với token)
```powershell
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6..."

curl http://localhost:3000/api/users `
  -H "Authorization: Bearer $token"
```

### 3. Tạo user mới
```powershell
curl -X POST http://localhost:3000/api/users `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"username":"viewer1","password":"pass123","fullName":"User Viewer","role":"VIEWER"}'
```

### 4. Test điều khiển với OPERATOR
```powershell
# Login as operator
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"operator1","password":"pass123"}'

# Control device
curl -X POST http://localhost:3000/control `
  -H "Authorization: Bearer $operatorToken" `
  -H "Content-Type: application/json" `
  -d '{"device":"farm01","cmd":{"pump":1}}'
```

## 🔄 Luồng Hoạt Động

```
1. User mở app → Hiện màn hình login
2. Nhập username/password → Gọi POST /api/auth/login
3. Backend verify → Trả về JWT token
4. Frontend lưu token (localStorage/sessionStorage)
5. Mọi request sau đó gửi kèm: Authorization: Bearer <token>
6. Backend verify token → Check role → Allow/Deny
```

## 🛡️ Bảo Mật

### Token Storage (Frontend)
```javascript
// Sau khi login thành công
localStorage.setItem('token', response.token);
localStorage.setItem('user', JSON.stringify(response.user));

// Gửi request với token
axios.get('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

// Logout
localStorage.removeItem('token');
localStorage.removeItem('user');
```

### Axios Interceptor (Recommended)
```javascript
// Setup axios để tự động gửi token
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expired
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expired → redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## 📁 Cấu Trúc File

```
backend/
├── models/
│   └── User.js              # User model với bcrypt
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── checkRole.js         # Role-based authorization
├── routes/
│   ├── auth.js              # Login, logout, change password
│   └── users.js             # CRUD users (admin only)
├── scripts/
│   └── createAdmin.js       # Script tạo admin ban đầu
├── .env                      # JWT_SECRET, JWT_EXPIRES_IN
└── server.js                 # Main server (đã thêm auth routes)
```

## ⚙️ Environment Variables

Thêm vào `.env`:
```env
# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

## 🎯 Next Steps - Frontend

Để hoàn thiện hệ thống, cần implement frontend:

### 1. Tạo Login Page
```jsx
// LoginPage.jsx
import { useState } from 'react';
import axios from 'axios';

function LoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', credentials);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/dashboard';
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input 
        type="text" 
        placeholder="Username"
        value={credentials.username}
        onChange={(e) => setCredentials({...credentials, username: e.target.value})}
      />
      <input 
        type="password" 
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### 2. Protected Route Component
```jsx
// ProtectedRoute.jsx
function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <div>Access Denied</div>;
  }

  return children;
}
```

### 3. Role-based UI
```jsx
// Hiển thị nút điều khiển nếu có quyền
{(user.role === 'OPERATOR' || user.role === 'ADMIN') && (
  <DeviceControl />
)}

// Hiển thị quản lý user nếu là admin
{user.role === 'ADMIN' && (
  <UserManagement />
)}
```

## 🔧 Troubleshooting

### Lỗi: "No token, authorization denied"
→ Chưa gửi token hoặc token không đúng format
→ Kiểm tra header: `Authorization: Bearer <token>`

### Lỗi: "Access denied"
→ User không có quyền cho action này
→ Kiểm tra role trong response

### Lỗi: "Token expired"
→ Token đã hết hạn (mặc định 24h)
→ User cần login lại

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  password: String (hashed),
  fullName: String,
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER',
  isActive: Boolean,
  createdAt: Date,
  lastLogin: Date
}
```

## 🎓 Ví Dụ Tạo Users

```javascript
// Tạo Operator
POST /api/users
{
  "username": "nhanvien1",
  "password": "password123",
  "fullName": "Nhân Viên Vận Hành",
  "role": "OPERATOR"
}

// Tạo Viewer
POST /api/users
{
  "username": "khachhang1",
  "password": "password123",
  "fullName": "Khách Hàng Xem Demo",
  "role": "VIEWER"
}
```

---

## ✅ Tóm Tắt

1. ✅ Hệ thống authentication hoàn chỉnh
2. ✅ Phân quyền 3 cấp: ADMIN, OPERATOR, VIEWER
3. ✅ Admin account mặc định: admin/admin123
4. ✅ API endpoints đã được bảo vệ
5. ✅ JWT token-based security
6. ✅ User management (CRUD)

**Bước tiếp theo:** Implement frontend (Login page, Protected routes, Role-based UI)
