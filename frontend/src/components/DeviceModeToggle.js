import React from 'react';
import './DeviceModeToggle.css';

function DeviceModeToggle({ deviceType, currentMode, onModeChange, disabled = false }) {
  const modes = [
    { 
      value: 'manual', 
      label: 'Thủ công', 
      icon: '🎮',
      description: 'Điều khiển trực tiếp bằng nút ON/OFF'
    },
    { 
      value: 'schedule', 
      label: 'Hẹn giờ', 
      icon: '⏰',
      description: 'Tự động theo lịch đã tạo'
    }
  ];

  // Thêm chế độ cảm biến cho tất cả thiết bị
  const sensorDescriptions = {
    pump: 'Tự động theo độ ẩm đất',
    fan: 'Tự động theo nhiệt độ',
    lamp: 'Tự động theo ánh sáng'
  };

  modes.push({ 
    value: 'sensor', 
    label: 'Cảm biến', 
    icon: '🤖',
    description: sensorDescriptions[deviceType] || 'Tự động theo cảm biến'
  });

  const handleModeClick = (mode) => {
    if (!disabled && mode !== currentMode) {
      onModeChange(mode);
    }
  };

  return (
    <div className="device-mode-toggle">
      <div className="mode-label">Chế độ hoạt động:</div>
      <div className="mode-buttons">
        {modes.map(mode => (
          <button
            key={mode.value}
            className={`mode-btn ${currentMode === mode.value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => handleModeClick(mode.value)}
            disabled={disabled}
            title={mode.description}
          >
            <span className="mode-text">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default DeviceModeToggle;
