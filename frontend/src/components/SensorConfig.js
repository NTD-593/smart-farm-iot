import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import './SensorConfig.css';

function SensorConfig({ show, deviceType, config, onSave, onClose }) {
  // Không khởi tạo giá trị, để rỗng hoàn toàn
  const [formData, setFormData] = useState({
    minThreshold: '',
    maxThreshold: '',
    checkInterval: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cập nhật form data khi config thay đổi
    if (config) {
      setFormData({
        minThreshold: config.minThreshold ?? '',
        maxThreshold: config.maxThreshold ?? '',
        checkInterval: config.checkInterval ?? ''
      });
    }
  }, [config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.minThreshold >= formData.maxThreshold) {
      setError('Ngưỡng dưới phải nhỏ hơn ngưỡng trên');
      return;
    }

    if (formData.minThreshold < 0 || formData.minThreshold > 100) {
      setError('Ngưỡng dưới phải từ 0-100%');
      return;
    }

    if (formData.maxThreshold < 0 || formData.maxThreshold > 100) {
      setError('Ngưỡng trên phải từ 0-100%');
      return;
    }

    if (formData.checkInterval < 10 || formData.checkInterval > 3600) {
      setError('Khoảng kiểm tra phải từ 10-3600 giây');
      return;
    }

    setLoading(true);
    try {
      // Đợi save và reload xong
      await onSave(formData);
      // Đóng modal sau khi đã có dữ liệu mới
      onClose();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceName = () => {
    const names = { pump: 'Bơm Nước', lamp: 'Đèn', fan: 'Quạt' };
    return names[deviceType] || deviceType;
  };

  const getSensorInfo = () => {
    const info = {
      pump: {
        type: 'soilMoisture',
        label: 'độ ẩm đất',
        unit: '%',
        icon: '💧',
        desc: 'Thiết lập ngưỡng độ ẩm để tự động tưới',
        minHint: 'Đất quá khô, cần tưới nước',
        maxHint: 'Đất đủ ẩm, ngưng tưới',
        actionLow: 'BẬT BƠM',
        actionHigh: 'TẮT BƠM'
      },
      fan: {
        type: 'temperature',
        label: 'nhiệt độ',
        unit: '°C',
        icon: '🌡️',
        desc: 'Thiết lập ngưỡng nhiệt độ để tự động bật quạt',
        minHint: 'Nhiệt độ thấp, tắt quạt',
        maxHint: 'Nhiệt độ cao, bật quạt',
        actionLow: 'TẮT QUẠT',
        actionHigh: 'BẬT QUẠT'
      },
      lamp: {
        type: 'light',
        label: 'ánh sáng',
        unit: '%',
        icon: '💡',
        desc: 'Thiết lập ngưỡng ánh sáng để tự động bật đèn',
        minHint: 'Trời tối, bật đèn',
        maxHint: 'Đủ sáng, tắt đèn',
        actionLow: 'BẬT ĐÈN',
        actionHigh: 'TẮT ĐÈN'
      }
    };
    return info[deviceType] || info.pump;
  };

  if (!show) return null;

  const sensorInfo = getSensorInfo();
  
  // Tạo unique key từ config để force re-mount form
  const formKey = `${deviceType}-${config?.minThreshold}-${config?.maxThreshold}-${config?.checkInterval}`;

  return (
    <Modal onClose={onClose}>
      <div className="sensor-config" key={formKey}>
        <h3>⚙️ Cấu hình cảm biến - {getDeviceName()}</h3>
        <p className="config-desc">
          {sensorInfo.desc}
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Min Threshold */}
          <div className="form-group">
            <label>
              Ngưỡng dưới ({sensorInfo.unit})
              <span className="label-desc">Điều kiện để tác động</span>
            </label>
            <div className="input-with-unit">
              <input
                key={`min-${formData.minThreshold}`}
                type="number"
                min="0"
                max="100"
                value={formData.minThreshold}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setFormData({ ...formData, minThreshold: val });
                }}
                required
              />
              <span className="unit">{sensorInfo.unit}</span>
            </div>
            <div className="input-hint">
              {sensorInfo.icon} {sensorInfo.minHint}
            </div>
          </div>

          {/* Max Threshold */}
          <div className="form-group">
            <label>
              Ngưỡng trên ({sensorInfo.unit})
              <span className="label-desc">Điều kiện để ngưng</span>
            </label>
            <div className="input-with-unit">
              <input
                key={`max-${formData.maxThreshold}`}
                type="number"
                min="0"
                max="100"
                value={formData.maxThreshold}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setFormData({ ...formData, maxThreshold: val });
                }}
                required
              />
              <span className="unit">{sensorInfo.unit}</span>
            </div>
            <div className="input-hint">
              {sensorInfo.icon} {sensorInfo.maxHint}
            </div>
          </div>

          {/* Check Interval */}
          <div className="form-group">
            <label>
              Khoảng kiểm tra (giây)
              <span className="label-desc">Tần suất kiểm tra cảm biến</span>
            </label>
            <div className="input-with-unit">
              <input
                key={`interval-${formData.checkInterval}`}
                type="number"
                min="10"
                max="3600"
                value={formData.checkInterval}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setFormData({ ...formData, checkInterval: val });
                }}
                required
              />
              <span className="unit">giây</span>
            </div>
            <div className="input-hint">
              Khuyến nghị: 60 giây (1 phút)
            </div>
          </div>

          {/* Preview */}
          <div className="config-preview">
            <h4>📊 Xem trước hoạt động:</h4>
            <div className="preview-item">
              <span className="preview-icon">{sensorInfo.icon}</span>
              <span className="preview-text">
                {sensorInfo.label.charAt(0).toUpperCase() + sensorInfo.label.slice(1)} &lt; {formData.minThreshold}{sensorInfo.unit} → <strong className="action-on">{sensorInfo.actionLow}</strong>
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-icon">{sensorInfo.icon}</span>
              <span className="preview-text">
                {sensorInfo.label.charAt(0).toUpperCase() + sensorInfo.label.slice(1)} &gt; {formData.maxThreshold}{sensorInfo.unit} → <strong className="action-off">{sensorInfo.actionHigh}</strong>
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-icon">⏱️</span>
              <span className="preview-text">
                Kiểm tra mỗi {formData.checkInterval} giây
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Đang lưu...' : '💾 Lưu cấu hình'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default SensorConfig;
