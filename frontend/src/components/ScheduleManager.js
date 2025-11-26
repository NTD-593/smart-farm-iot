import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScheduleForm from './ScheduleForm';
import './ScheduleManager.css';

function ScheduleManager() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [filter, setFilter] = useState({
    deviceType: 'all',
    action: 'all',
    isActive: 'all'
  });

  useEffect(() => {
    loadSchedules();
  }, [token]);

  const loadSchedules = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Không thể tải danh sách lịch hẹn');

      const data = await response.json();
      setSchedules(data.schedules || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingSchedule(null);
    setShowModal(true);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowModal(true);
  };

  const handleDelete = async (scheduleId, description) => {
    if (!window.confirm(`Bạn có chắc muốn xóa lịch hẹn "${description || 'này'}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Không thể xóa lịch hẹn');

      await loadSchedules();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggle = async (scheduleId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/schedules/${scheduleId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Không thể thay đổi trạng thái');

      await loadSchedules();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async () => {
    await loadSchedules();
    setShowModal(false);
  };

  const getDeviceIcon = (deviceType) => {
    const icons = { pump: '💧', lamp: '💡', fan: '🌀' };
    return icons[deviceType] || '📱';
  };

  const getDeviceName = (deviceType) => {
    const names = { pump: 'Bơm', lamp: 'Đèn', fan: 'Quạt' };
    return names[deviceType] || deviceType;
  };

  const getRepeatText = (repeat) => {
    if (repeat.type === 'daily') return 'Hàng ngày';
    if (repeat.type === 'weekdays') return 'T2-T6';
    if (repeat.type === 'once') return 'Một lần';
    if (repeat.type === 'custom') {
      const dayNames = { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' };
      return repeat.days.map(d => dayNames[d]).join(', ');
    }
    return '';
  };

  const filteredSchedules = schedules.filter(schedule => {
    if (filter.deviceType !== 'all' && schedule.deviceType !== filter.deviceType) return false;
    if (filter.action !== 'all' && schedule.action !== filter.action) return false;
    if (filter.isActive !== 'all' && schedule.isActive !== (filter.isActive === 'true')) return false;
    return true;
  });

  const stats = {
    total: schedules.length,
    active: schedules.filter(s => s.isActive).length,
    inactive: schedules.filter(s => !s.isActive).length
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="schedule-manager">
      <div className="sm-header">
        <div>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Về Dashboard
          </button>
          <h2>📅 Quản Lý Hẹn Giờ</h2>
        </div>
        <button onClick={handleAddNew} className="btn-add">
          ➕ Thêm Lịch Hẹn
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>🔍 Thiết bị:</label>
          <select value={filter.deviceType} onChange={(e) => setFilter({...filter, deviceType: e.target.value})}>
            <option value="all">Tất cả</option>
            <option value="pump">💧 Bơm</option>
            <option value="lamp">💡 Đèn</option>
            <option value="fan">🌀 Quạt</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Hành động:</label>
          <select value={filter.action} onChange={(e) => setFilter({...filter, action: e.target.value})}>
            <option value="all">Tất cả</option>
            <option value="on">Bật</option>
            <option value="off">Tắt</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Trạng thái:</label>
          <select value={filter.isActive} onChange={(e) => setFilter({...filter, isActive: e.target.value})}>
            <option value="all">Tất cả</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm dừng</option>
          </select>
        </div>

        <button onClick={() => setFilter({ deviceType: 'all', action: 'all', isActive: 'all' })} className="btn-reset">
          🔄 Reset
        </button>
      </div>

      {/* Table */}
      <div className="schedules-table">
        <table>
          <thead>
            <tr>
              <th>Thiết bị</th>
              <th>Hành động</th>
              <th>Thời gian</th>
              <th>Lặp lại</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Chưa có lịch hẹn nào
                </td>
              </tr>
            ) : (
              filteredSchedules.map(schedule => (
                <tr key={schedule._id}>
                  <td>
                    <span className="device-cell">
                      <span className="device-icon">{getDeviceIcon(schedule.deviceType)}</span>
                      {getDeviceName(schedule.deviceType)}
                    </span>
                  </td>
                  <td>
                    <span className={`action-badge action-${schedule.action}`}>
                      {schedule.action === 'on' ? '⚫→🟢 BẬT' : '🟢→⚫ TẮT'}
                    </span>
                  </td>
                  <td className="time-cell">🕐 {schedule.time}</td>
                  <td>{getRepeatText(schedule.repeat)}</td>
                  <td className="desc-cell">{schedule.description || '-'}</td>
                  <td>
                    <button
                      onClick={() => handleToggle(schedule._id)}
                      className={`btn-status ${schedule.isActive ? 'active' : 'inactive'}`}
                    >
                      {schedule.isActive ? '✅ Bật' : '❌ Tắt'}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => handleEdit(schedule)} className="btn-edit" title="Sửa">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(schedule._id, schedule.description)} className="btn-delete" title="Xóa">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="stats-footer">
        📊 Tổng: <strong>{stats.total}</strong> lịch | 
        🟢 Hoạt động: <strong>{stats.active}</strong> | 
        ⚫ Tạm dừng: <strong>{stats.inactive}</strong>
      </div>

      {/* Modal */}
      {showModal && (
        <ScheduleForm
          schedule={editingSchedule}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default ScheduleManager;
