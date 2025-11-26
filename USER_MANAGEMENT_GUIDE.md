# 👥 Hướng Dẫn Quản Lý Người Dùng

## Tính năng chính

### 1. **Xem danh sách người dùng**
- Hiển thị tất cả users trong hệ thống
- Thông tin: Username, Họ tên, Quyền, Trạng thái, Lần đăng nhập cuối

### 2. **Thêm người dùng mới**
Nhấn nút **"➕ Thêm Người Dùng"**

**Thông tin cần nhập:**
- **Username**: Tên đăng nhập (duy nhất, không thể đổi sau khi tạo)
- **Password**: Mật khẩu (tối thiểu 6 ký tự)
- **Họ Tên**: Tên đầy đủ của người dùng
- **Quyền**: Chọn 1 trong 3 cấp quyền
  - **VIEWER**: Chỉ xem dữ liệu
  - **OPERATOR**: Xem + điều khiển thiết bị
  - **ADMIN**: Toàn quyền (bao gồm quản lý users)
- **Trạng thái**: Tài khoản hoạt động hay vô hiệu hóa

### 3. **Sửa thông tin người dùng**
Nhấn nút **✏️** trên dòng user muốn sửa

**Có thể sửa:**
- Họ tên
- Mật khẩu (để trống nếu không đổi)
- Quyền
- Trạng thái

**Không thể sửa:**
- Username (không thể thay đổi)

### 4. **Bật/Tắt tài khoản**
Nhấn nút trạng thái để nhanh chóng vô hiệu hóa/kích hoạt tài khoản
- **✓ Hoạt động**: Tài khoản có thể đăng nhập
- **✕ Vô hiệu**: Tài khoản bị khóa, không thể đăng nhập

### 5. **Xóa người dùng**
Nhấn nút **🗑️** để xóa user

**Lưu ý:**
- Không thể xóa chính mình (tài khoản đang đăng nhập)
- Xóa vĩnh viễn, không thể khôi phục

## Phân quyền hệ thống

### 🔴 ADMIN (Quản trị viên)
**Quyền hạn:**
- ✅ Xem tất cả dữ liệu
- ✅ Điều khiển thiết bị
- ✅ Sửa/Xóa dữ liệu cảm biến
- ✅ **Quản lý người dùng** (CRUD users)
- ✅ Truy cập tất cả chức năng

**Sử dụng cho:** Ban quản lý, IT admin

### 🟠 OPERATOR (Điều hành viên)
**Quyền hạn:**
- ✅ Xem tất cả dữ liệu
- ✅ Điều khiển thiết bị (bật/tắt bơm, đèn, quạt)
- ❌ Không sửa/xóa dữ liệu
- ❌ Không quản lý users

**Sử dụng cho:** Nhân viên vận hành, kỹ thuật viên

### 🟢 VIEWER (Người xem)
**Quyền hạn:**
- ✅ Chỉ xem dữ liệu
- ❌ Không điều khiển thiết bị
- ❌ Không sửa/xóa dữ liệu
- ❌ Không quản lý users

**Sử dụng cho:** Khách, nhân viên theo dõi, báo cáo

## Truy cập tính năng

### Điều kiện:
- Phải đăng nhập với tài khoản **ADMIN**
- Nút "👥 Quản lý Users" chỉ hiện với ADMIN

### Cách vào:
1. Đăng nhập với tài khoản admin
2. Tại Dashboard, nhấn nút **"👥 Quản lý Users"** ở header
3. Hoặc truy cập trực tiếp: `http://localhost:3001/users`

## Tài khoản mặc định

**Admin:**
- Username: `admin`
- Password: `admin123`
- Role: ADMIN

⚠️ **Bảo mật:** Nên đổi mật khẩu admin sau khi cài đặt!

## API Endpoints (cho developer)

### GET /api/users
Lấy danh sách tất cả users
- **Auth**: Bearer token (ADMIN only)
- **Response**: Array của users

### POST /api/users
Tạo user mới
- **Auth**: Bearer token (ADMIN only)
- **Body**: `{ username, password, fullName, role, isActive }`

### PUT /api/users/:id
Cập nhật user
- **Auth**: Bearer token (ADMIN only)
- **Body**: `{ fullName?, password?, role?, isActive? }`

### DELETE /api/users/:id
Xóa user
- **Auth**: Bearer token (ADMIN only)
- **Lưu ý**: Không thể xóa chính mình

## Lưu ý quan trọng

1. **Không thể xóa tài khoản đang đăng nhập**
2. **Username là duy nhất** - không được trùng
3. **Password tối thiểu 6 ký tự** khi tạo mới
4. **Tài khoản vô hiệu** (isActive=false) không thể đăng nhập
5. **Chỉ ADMIN** mới thấy nút "Quản lý Users"

## Troubleshooting

### ⚠️ Không thấy nút "Quản lý Users"
→ Bạn không phải ADMIN, chỉ ADMIN mới có quyền này

### ⚠️ Lỗi "Không có quyền truy cập"
→ Token hết hạn hoặc không có quyền ADMIN, đăng nhập lại

### ⚠️ Không tạo được user mới
→ Kiểm tra:
- Username đã tồn tại?
- Password có ít nhất 6 ký tự?
- Backend có đang chạy?

### ⚠️ Không xóa được user
→ Không thể xóa chính mình, đăng nhập bằng admin khác để xóa
