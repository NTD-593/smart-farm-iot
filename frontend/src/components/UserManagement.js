import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  MdPeople, 
  MdPersonAdd, 
  MdEdit, 
  MdDelete, 
  MdCheck, 
  MdClose,
  MdBlock 
} from 'react-icons/md';
import './UserManagement.css';

function UserManagement() {
  const { token, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'VIEWER',
    isActive: true
  });

  // Load danh sách users
  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Không thể tải danh sách người dùng');
      
      const data = await response.json();
      // API trả về { users: [...], count: n }
      setUsers(data.users || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      loadUsers();
    }
  }, [isAdmin, token]);

  // Mở modal thêm user mới
  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      role: 'VIEWER',
      isActive: true
    });
    setShowModal(true);
  };

  // Mở modal sửa user
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // không hiển thị password cũ
      confirmPassword: '',
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive
    });
    setShowModal(true);
  };

  // Xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Kiểm tra password khớp
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      const url = editingUser 
        ? `http://localhost:3000/api/users/${editingUser._id}`
        : 'http://localhost:3000/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const body = { ...formData };
      // Xóa confirmPassword trước khi gửi
      delete body.confirmPassword;
      // Nếu đang edit và password trống, không gửi password
      if (editingUser && !body.password) {
        delete body.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        // Backend trả về errors array hoặc error string
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.map(e => e.msg).join(', '));
        }
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      // Reload danh sách
      await loadUsers();
      setShowModal(false);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  // Xóa user
  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Bạn có chắc muốn xóa người dùng "${username}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể xóa người dùng');
      }

      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle active status
  const handleToggleActive = async (user) => {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể cập nhật trạng thái');
      }

      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="access-denied">
        <h2><MdBlock size={24} /> Không có quyền truy cập</h2>
        <p>Chỉ ADMIN mới có thể quản lý người dùng.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="user-management">
      <div className="um-header">
        <div>
          <h2>Quản Lý Người Dùng</h2>
        </div>
        <button onClick={handleAddNew} className="btn-add">
          <MdPersonAdd size={18} />
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Họ Tên</th>
              <th>Quyền</th>
              <th>Trạng Thái</th>
              <th>Đăng Nhập Cuối</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.fullName}</td>
                <td>
                  <span className={`badge badge-${user.role.toLowerCase()}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => handleToggleActive(user)}
                    className={`btn-status ${user.isActive ? 'active' : 'inactive'}`}
                  >
                    {user.isActive ? <><MdCheck size={16} /> Hoạt động</> : <><MdClose size={16} /> Vô hiệu</>}
                  </button>
                </td>
                <td>
                  {user.lastLogin 
                    ? new Date(user.lastLogin).toLocaleString('vi-VN')
                    : 'Chưa đăng nhập'}
                </td>
                <td>
                  <button 
                    onClick={() => handleEdit(user)}
                    className="btn-edit"
                    title="Sửa"
                  >
                    <MdEdit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(user._id, user.username)}
                    className="btn-delete"
                    title="Xóa"
                  >
                    <MdDelete size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal thêm/sửa user */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingUser ? <><MdEdit size={20} /> Sửa Người Dùng</> : <><MdPersonAdd size={20} /> Thêm Người Dùng Mới</>}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  disabled={!!editingUser}
                  placeholder="Tên đăng nhập (tối thiểu 3 ký tự)"
                  minLength={3}
                />
              </div>

              <div className="form-group">
                <label>
                  Mật khẩu {editingUser ? '(để trống nếu không đổi)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label>
                  Xác nhận mật khẩu {editingUser ? '(để trống nếu không đổi)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required={!editingUser && !!formData.password}
                  placeholder="Nhập lại mật khẩu"
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label>Họ Tên *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                  placeholder="Họ và tên đầy đủ"
                />
              </div>

              <div className="form-group">
                <label>Quyền *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                >
                  <option value="VIEWER">VIEWER - Chỉ xem</option>
                  <option value="OPERATOR">OPERATOR - Điều khiển thiết bị</option>
                  <option value="ADMIN">ADMIN - Quản trị viên</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <span>Tài khoản hoạt động</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  {editingUser ? 'Cập Nhật' : 'Tạo Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
