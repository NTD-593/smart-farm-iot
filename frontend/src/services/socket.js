import config from '../config';
import { sendScheduledAlert, sendSensorAlert, checkAndAlertThreshold } from './emailAlert';

const SOCKET_URL = config.SOCKET_URL;

class SocketService {
  constructor() {
    this.socket = null;
    this._sensorCb = null;
    this._deviceCb = null;
    this._connectCb = null;
    this._disconnectCb = null;
    this._scheduleCb = null;
    this._thresholdAlertCb = null;
    this.thresholdAlertEnabled = true; // Bật/tắt cảnh báo ngưỡng
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return this.socket;

    this.socket = new WebSocket(SOCKET_URL);

    this.socket.addEventListener('open', () => {
      console.log('✅ WebSocket connected');
      if (this._connectCb) this._connectCb();
    });

    this.socket.addEventListener('close', () => {
      console.log('❌ WebSocket disconnected');
      if (this._disconnectCb) this._disconnectCb();
    });

    this.socket.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        // Handle telemetry messages from backend (type: 'telemetry')
        if (msg.type === 'telemetry') {
          const d = msg.data || {};
          const payload = {
            temperature: d.temperature ?? 0,
            humidity: d.humidity ?? 0,
            soilMoisture: d.humiGround ?? d.soilMoisture ?? 0,
            timestamp: msg.createdAt || Date.now()
          };
          if (this._sensorCb) this._sensorCb(payload);

          // Kiểm tra cảnh báo ngưỡng tự động
          if (this.thresholdAlertEnabled) {
            this.checkThresholdAlerts(payload);
          }
        }

        // Device status events (if backend sends type: 'deviceStatus')
        else if (msg.type === 'deviceStatus') {
          if (this._deviceCb) this._deviceCb(msg);
        }

        // Schedule execution events - Gửi email cảnh báo hẹn giờ
        else if (msg.type === 'scheduleExecuted') {
          console.log('📅 Lịch hẹn đã thực thi:', msg);
          if (this._scheduleCb) this._scheduleCb(msg);
          
          // Gửi email cảnh báo chế độ hẹn giờ
          sendScheduledAlert(
            msg.deviceType,
            msg.action === 'on',
            msg.time || new Date().toLocaleTimeString('vi-VN')
          ).then(result => {
            if (result.success) {
              console.log(`📧 Đã gửi email cảnh báo hẹn giờ: ${msg.deviceType}`);
            }
          });
        }

        // Sensor auto control events - Gửi email cảnh báo cảm biến
        else if (msg.type === 'sensorControl') {
          console.log('🌡️ Cảm biến tự động điều khiển:', msg);
          
          // Gửi email cảnh báo chế độ cảm biến
          sendSensorAlert(
            msg.deviceType,
            msg.action === 'on',
            msg.sensorInfo || `Ngưỡng: ${msg.threshold || 'N/A'}`
          ).then(result => {
            if (result.success) {
              console.log(`📧 Đã gửi email cảnh báo cảm biến: ${msg.deviceType}`);
            }
          });
        }

        // Other message types can be handled here
      } catch (err) {
        console.error('WebSocket message parse error', err);
      }
    });

    return this.socket;
  }

  // Kiểm tra và gửi cảnh báo khi cảm biến vượt ngưỡng
  async checkThresholdAlerts(sensorData) {
    try {
      const alerts = await checkAndAlertThreshold(sensorData);
      
      if (alerts.length > 0) {
        console.log('🚨 Có cảnh báo ngưỡng:', alerts);
        if (this._thresholdAlertCb) {
          this._thresholdAlertCb(alerts);
        }
      }
    } catch (error) {
      console.error('Lỗi kiểm tra cảnh báo ngưỡng:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onSensorData(cb) {
    this._sensorCb = cb;
  }

  onDeviceStatus(cb) {
    this._deviceCb = cb;
  }

  onConnect(cb) {
    this._connectCb = cb;
  }

  onDisconnect(cb) {
    this._disconnectCb = cb;
  }

  onScheduleExecuted(cb) {
    this._scheduleCb = cb;
  }

  // Callback khi có cảnh báo ngưỡng
  onThresholdAlert(cb) {
    this._thresholdAlertCb = cb;
  }

  // Bật/tắt cảnh báo ngưỡng
  setThresholdAlertEnabled(enabled) {
    this.thresholdAlertEnabled = enabled;
    console.log(`🔔 Cảnh báo ngưỡng: ${enabled ? 'BẬT' : 'TẮT'}`);
  }

  controlDevice(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected - cannot send control');
      return;
    }

    // Normalize payload to match backend expectation
    const payload = JSON.stringify({
      type: 'control',
      device: data.deviceName || data.device,
      cmd: data.status || data.cmd
    });

    this.socket.send(payload);
  }
}

const socketService = new SocketService();
export default socketService;
