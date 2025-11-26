import React from 'react';
import './GlobalModeSelector.css';

function GlobalModeSelector({ 
  syncEnabled, 
  globalMode, 
  onSyncToggle, 
  onModeChange, 
  disabled = false 
}) {
  return (
    <div className="global-mode-selector">
      {/* Sync Toggle */}
      <div className="sync-toggle-container">
        <label className="sync-toggle-label">
          <input
            type="checkbox"
            checked={syncEnabled}
            onChange={(e) => onSyncToggle(e.target.checked)}
            disabled={disabled}
          />
          <span className="sync-toggle-text">
            ⚙️ Đồng bộ chế độ cho tất cả thiết bị
          </span>
        </label>
        <span className="sync-toggle-hint">
          {syncEnabled ? '✓ Khi BẬT: 1 chế độ điều khiển cả 3 thiết bị' : 'Khi TẮT: mỗi thiết bị chọn riêng'}
        </span>
      </div>

      {/* Global Mode Buttons - Chỉ hiện khi sync enabled */}
      {syncEnabled && (
        <div className="global-mode-buttons">
          <div className="mode-section-header">
            <h4>🎛️ Chế độ hoạt động chung:</h4>
          </div>
          
          <div className="mode-btn-group">
            <button
              className={`global-mode-btn ${globalMode === 'manual' ? 'active' : ''}`}
              onClick={() => onModeChange('manual')}
              disabled={disabled}
            >
              <span className="mode-icon">🎮</span>
              <span className="mode-label">Thủ công</span>
              <span className="mode-desc">Điều khiển trực tiếp</span>
            </button>

            <button
              className={`global-mode-btn ${globalMode === 'schedule' ? 'active' : ''}`}
              onClick={() => onModeChange('schedule')}
              disabled={disabled}
            >
              <span className="mode-icon">⏰</span>
              <span className="mode-label">Hẹn giờ</span>
              <span className="mode-desc">Tự động theo lịch</span>
            </button>

            <button
              className={`global-mode-btn ${globalMode === 'sensor' ? 'active' : ''}`}
              onClick={() => onModeChange('sensor')}
              disabled={disabled}
            >
              <span className="mode-icon">🤖</span>
              <span className="mode-label">Cảm biến</span>
              <span className="mode-desc">
                Tự động thông minh
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalModeSelector;
