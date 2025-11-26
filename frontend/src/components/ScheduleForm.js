import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ScheduleForm.css';

function ScheduleForm({ schedule, onSave, onClose }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    deviceType: 'pump',
    action: 'on',
    time: '06:00',
    repeatType: 'daily',
    customDays: [],
    description: '',
    isActive: true
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (schedule) {
      setFormData({
        deviceType: schedule.deviceType,
        action: schedule.action,
        time: schedule.time,
        repeatType: schedule.repeat.type,
        customDays: schedule.repeat.days || [],
        description: schedule.description || '',
        isActive: schedule.isActive
      });
    }
  }, [schedule]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.repeatType === 'custom' && formData.customDays.length === 0) {
      setError('Vui lòng chọn ít nhất một ngày cho lặp lại tùy chỉnh');
      setLoading(false);
      return;
    }

    try {
      const url = schedule
        ? `http://localhost:3000/api/schedules/${schedule._id}`
        : 'http://localhost:3000/api/schedules';

      const method = schedule ? 'PUT' : 'POST';

      const body = {
        deviceType: formData.deviceType,
        action: formData.action,
        time: formData.time,
        repeat: {
          type: formData.repeatType,
          days: formData.repeatType === 'custom' ? formData.customDays : []
        },
        description: formData.description,
        isActive: formData.isActive
      };

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
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.map(e => e.msg).join(', '));
        }
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day) => {
    if (formData.customDays.includes(day)) {
      setFormData({
        ...formData,
        customDays: formData.customDays.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        customDays: [...formData.customDays, day]
      });
    }
  };

  const getPreviewText = () => {
    const devices = { pump: 'Bơm Nước', lamp: 'Đèn', fan: 'Quạt' };
    const actions = { on: 'BẬT', off: 'TẮT' };
    const repeatTexts = {
      daily: 'Hàng ngày',
      weekdays: 'Thứ 2 - Thứ 6',
      once: 'Chỉ một lần',
      custom: formData.customDays.length > 0 ? formData.customDays.map(d => {
        const names = { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' };
        return names[d];
      }).join(', ') : 'Chưa chọn ngày'
    };

    return {
      device: devices[formData.deviceType],
      action: actions[formData.action],
      time: formData.time,
      repeat: repeatTexts[formData.repeatType]
    };
  };

  const preview = getPreviewText();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content schedule-form" onClick={(e) => e.stopPropagation()}>
        <h3>{schedule ? '✏️ Sửa Lịch Hẹn' : '➕ Thêm Lịch Hẹn Mới'}</h3>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Device Type */}
          <div className="form-group">
            <label>Thiết bị *</label>
            <select
              value={formData.deviceType}
              onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
              required
            >
              <option value="pump">💧 Bơm Nước</option>
              <option value="lamp">💡 Đèn</option>
              <option value="fan">🌀 Quạt</option>
            </select>
          </div>

          {/* Action */}
          <div className="form-group">
            <label>Hành động *</label>
            <div className="action-selector">
              <label className={formData.action === 'on' ? 'active' : ''}>
                <input
                  type="radio"
                  name="action"
                  value="on"
                  checked={formData.action === 'on'}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                />
                <span>⚫→🟢 Bật</span>
              </label>
              <label className={formData.action === 'off' ? 'active' : ''}>
                <input
                  type="radio"
                  name="action"
                  value="off"
                  checked={formData.action === 'off'}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                />
                <span>🟢→⚫ Tắt</span>
              </label>
            </div>
          </div>

          {/* Time */}
          <div className="form-group">
            <label>Thời gian *</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>

          {/* Repeat */}
          <div className="form-group">
            <label>Lặp lại *</label>
            <div className="repeat-options">
              <label>
                <input
                  type="radio"
                  name="repeatType"
                  value="daily"
                  checked={formData.repeatType === 'daily'}
                  onChange={(e) => setFormData({ ...formData, repeatType: e.target.value })}
                />
                Hàng ngày
              </label>
              <label>
                <input
                  type="radio"
                  name="repeatType"
                  value="weekdays"
                  checked={formData.repeatType === 'weekdays'}
                  onChange={(e) => setFormData({ ...formData, repeatType: e.target.value })}
                />
                Ngày trong tuần (T2-T6)
              </label>
              <label>
                <input
                  type="radio"
                  name="repeatType"
                  value="once"
                  checked={formData.repeatType === 'once'}
                  onChange={(e) => setFormData({ ...formData, repeatType: e.target.value })}
                />
                Chỉ một lần
              </label>
              <label>
                <input
                  type="radio"
                  name="repeatType"
                  value="custom"
                  checked={formData.repeatType === 'custom'}
                  onChange={(e) => setFormData({ ...formData, repeatType: e.target.value })}
                />
                Tùy chỉnh:
              </label>

              {formData.repeatType === 'custom' && (
                <div className="weekday-selector">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                    return (
                      <label key={day} className={formData.customDays.includes(day) ? 'selected' : ''}>
                        <input
                          type="checkbox"
                          checked={formData.customDays.includes(day)}
                          onChange={() => handleDayToggle(day)}
                        />
                        <span>{labels[index]}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Mô tả (tùy chọn)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="VD: Tưới vườn buổi sáng"
            />
          </div>

          {/* Active */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span>Kích hoạt ngay sau khi tạo</span>
            </label>
          </div>

          {/* Preview */}
          <div className="schedule-preview">
            <h4>💡 XEM TRƯỚC LỊCH HẸN</h4>
            <p className="preview-text">
              <strong>{preview.device}</strong> sẽ <span className={`action-${formData.action}`}>{preview.action}</span> vào <strong>{preview.time}</strong>
            </p>
            <p className="repeat-info">
              Lặp lại: {preview.repeat}
            </p>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Đang lưu...' : (schedule ? 'Cập Nhật' : '💾 Lưu Lịch Hẹn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleForm;
