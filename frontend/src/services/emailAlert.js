import emailjs from '@emailjs/browser';
import api from './api';

// Cấu hình EmailJS
const EMAILJS_CONFIG = {
  publicKey: 'b9eUWvThsFzsnakaM',
  serviceId: 'service_h3isn6z',
  templateId: 'template_qkk0el8'
};

// Khởi tạo EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

// Email nhận thông báo (có thể thay đổi)
const DEFAULT_RECIPIENT = 'dat_2151220005@dau.edu.vn';

// Ngưỡng cảnh báo - sẽ được load từ database
let deviceThresholds = {
  pump: { sensorType: 'soilMoisture', min: 5, max: 10 },
  fan: { sensorType: 'temperature', min: 28, max: 33 },
  lamp: { sensorType: 'light', min: 300, max: 800 }
};

// Mapping sensor type để hiển thị
const SENSOR_INFO = {
  temperature: { unit: '°C', name: 'Nhiệt độ' },
  humidity: { unit: '%', name: 'Độ ẩm không khí' },
  soilMoisture: { unit: '%', name: 'Độ ẩm đất' },
  light: { unit: ' lux', name: 'Ánh sáng' }
};

// Mapping device name
const DEVICE_NAMES = {
  pump: 'Máy bơm nước',
  fan: 'Quạt',
  lamp: 'Đèn'
};

// Lưu trạng thái cảnh báo để tránh gửi email liên tục
const alertState = {
  pump: { lastAlert: null, alertType: null },
  fan: { lastAlert: null, alertType: null },
  lamp: { lastAlert: null, alertType: null }
};

// Thời gian chờ giữa các cảnh báo (5 phút)
const ALERT_COOLDOWN = 5 * 60 * 1000;

/**
 * Load ngưỡng từ database (devicemodes)
 */
export const loadThresholdsFromDB = async () => {
  try {
    const response = await api.get('/api/device-modes');
    const modes = response.data.modes || [];
    
    modes.forEach(mode => {
      // Chỉ load pump, fan, lamp - bỏ qua global
      if (mode.deviceType && mode.sensorConfig && ['pump', 'fan', 'lamp'].includes(mode.deviceType)) {
        deviceThresholds[mode.deviceType] = {
          sensorType: mode.sensorConfig.sensorType,
          min: mode.sensorConfig.minThreshold,
          max: mode.sensorConfig.maxThreshold
        };
      }
    });
    
    console.log('✅ Đã load ngưỡng từ database:', deviceThresholds);
    return deviceThresholds;
  } catch (error) {
    console.error('❌ Lỗi load ngưỡng từ database:', error);
    return deviceThresholds;
  }
};

/**
 * Lấy ngưỡng hiện tại (format cho UI)
 */
export const getThresholds = () => {
  const thresholds = {};
  
  Object.entries(deviceThresholds).forEach(([device, config]) => {
    const sensorType = config.sensorType;
    if (!thresholds[sensorType]) {
      thresholds[sensorType] = {
        min: config.min,
        max: config.max,
        ...SENSOR_INFO[sensorType],
        device: device
      };
    }
  });
  
  return thresholds;
};

/**
 * Gửi email cảnh báo
 * @param {Object} params - Thông tin cảnh báo
 * @param {string} params.deviceName - Tên thiết bị (pump, fan, lamp)
 * @param {string} params.action - Hành động (BẬT, TẮT)
 * @param {string} params.alertType - Loại chế độ (Thủ công, Hẹn giờ, Cảm biến)
 * @param {string} params.scheduledTime - Thời gian hẹn (nếu có)
 * @param {string} params.toEmail - Email nhận (tùy chọn)
 */
export const sendAlertEmail = async (params) => {
  const deviceNames = {
    pump: 'Máy bơm nước',
    fan: 'Quạt',
    lamp: 'Đèn'
  };

  const templateParams = {
    to_email: params.toEmail || DEFAULT_RECIPIENT,
    device_name: deviceNames[params.deviceName] || params.deviceName,
    action: params.action,
    alert_type: params.alertType,
    scheduled_time: params.scheduledTime || 'Không có',
    timestamp: new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };

  try {
    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );
    console.log('✅ Email cảnh báo đã gửi thành công:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Lỗi gửi email cảnh báo:', error);
    return { success: false, error };
  }
};

/**
 * Gửi cảnh báo chế độ THỦ CÔNG
 */
export const sendManualAlert = (deviceName, isOn) => {
  return sendAlertEmail({
    deviceName,
    action: isOn ? 'BẬT' : 'TẮT',
    alertType: 'Thủ công',
    scheduledTime: 'Không có'
  });
};

/**
 * Gửi cảnh báo chế độ HẸN GIỜ
 */
export const sendScheduledAlert = (deviceName, isOn, scheduledTime) => {
  return sendAlertEmail({
    deviceName,
    action: isOn ? 'BẬT' : 'TẮT',
    alertType: 'Hẹn giờ',
    scheduledTime: scheduledTime
  });
};

/**
 * Gửi cảnh báo chế độ CẢM BIẾN
 */
export const sendSensorAlert = (deviceName, isOn, sensorInfo) => {
  return sendAlertEmail({
    deviceName,
    action: isOn ? 'BẬT' : 'TẮT',
    alertType: 'Cảm biến tự động',
    scheduledTime: sensorInfo || 'Dựa trên ngưỡng cảm biến'
  });
};

/**
 * Kiểm tra và gửi cảnh báo khi cảm biến vượt ngưỡng
 * Sử dụng ngưỡng từ devicemodes trong database
 * @param {Object} sensorData - Dữ liệu cảm biến { temperature, humidity, soilMoisture }
 */
export const checkAndAlertThreshold = async (sensorData) => {
  const alerts = [];
  const now = Date.now();

  // Kiểm tra từng thiết bị và ngưỡng của nó
  for (const [device, config] of Object.entries(deviceThresholds)) {
    const sensorType = config.sensorType;
    const value = sensorData[sensorType];
    
    if (value === undefined || value === null) continue;

    const sensorInfo = SENSOR_INFO[sensorType] || { unit: '', name: sensorType };
    const state = alertState[device];
    let alertType = null;
    let alertMessage = '';

    // Logic khác nhau tùy loại cảm biến
    if (sensorType === 'temperature') {
      // Nhiệt độ: > max = quá nóng, < min = quá lạnh
      if (value > config.max) {
        alertType = 'high';
        alertMessage = `🔥 ${sensorInfo.name} QUÁ CAO: ${value}${sensorInfo.unit} (Ngưỡng: ${config.max}${sensorInfo.unit}) - ${DEVICE_NAMES[device]} sẽ được BẬT`;
      } else if (value < config.min) {
        alertType = 'low';
        alertMessage = `❄️ ${sensorInfo.name} THẤP: ${value}${sensorInfo.unit} (Ngưỡng: ${config.min}${sensorInfo.unit}) - ${DEVICE_NAMES[device]} sẽ được TẮT`;
      }
    } else if (sensorType === 'light') {
      // Ánh sáng: < min = tối, > max = sáng
      if (value < config.min) {
        alertType = 'low';
        alertMessage = `🌙 ${sensorInfo.name} QUÁ TỐI: ${value}${sensorInfo.unit} (Ngưỡng: ${config.min}${sensorInfo.unit}) - ${DEVICE_NAMES[device]} sẽ được BẬT`;
      } else if (value > config.max) {
        alertType = 'high';
        alertMessage = `☀️ ${sensorInfo.name} ĐỦ SÁNG: ${value}${sensorInfo.unit} (Ngưỡng: ${config.max}${sensorInfo.unit}) - ${DEVICE_NAMES[device]} sẽ được TẮT`;
      }
    } else {
      // Độ ẩm đất/KK: < min = quá khô, > max = quá ẩm
      if (value < config.min) {
        alertType = 'low';
        alertMessage = `💧 ${sensorInfo.name} QUÁ THẤP: ${value}${sensorInfo.unit} (Ngưỡng: ${config.min}${sensorInfo.unit}) - ${DEVICE_NAMES[device]} sẽ được BẬT`;
      } else if (value > config.max) {
        alertType = 'high';
        alertMessage = `💦 ${sensorInfo.name} QUÁ CAO: ${value}${sensorInfo.unit} (Ngưỡng: ${config.max}${sensorInfo.unit}) - ${DEVICE_NAMES[device]} sẽ được TẮT`;
      }
    }

    // Trở về bình thường
    if (!alertType && state.alertType !== null) {
      state.alertType = null;
      state.lastAlert = null;
      console.log(`✅ ${sensorInfo.name} đã trở về bình thường: ${value}${sensorInfo.unit}`);
      continue;
    }

    // Nếu có cảnh báo mới
    if (alertType) {
      // Kiểm tra cooldown
      const shouldAlert = !state.lastAlert || 
                          (now - state.lastAlert > ALERT_COOLDOWN) ||
                          (state.alertType !== alertType);

      if (shouldAlert) {
        console.log(`🚨 ${alertMessage}`);
        
        // Gửi email cảnh báo
        const emailConfig = {
          ...sensorInfo,
          min: config.min,
          max: config.max,
          device: device
        };
        const result = await sendThresholdAlert(sensorType, value, emailConfig, alertType, device);
        
        if (result.success) {
          state.lastAlert = now;
          state.alertType = alertType;
          alerts.push({
            sensorType,
            alertType,
            value,
            threshold: alertType === 'high' ? config.max : config.min,
            message: alertMessage,
            device: device,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.log(`⏳ Đang trong thời gian chờ cảnh báo ${sensorInfo.name}`);
      }
    }
  }

  return alerts;
};

/**
 * Gửi email cảnh báo vượt ngưỡng
 */
export const sendThresholdAlert = async (sensorType, value, config, alertType, device = '') => {
  // alertType được dùng để xác định loại cảnh báo

  const templateParams = {
    to_email: DEFAULT_RECIPIENT,
    device_name: `${config.name} → ${DEVICE_NAMES[device] || device}`,
    action: alertType === 'high' ? 'VƯỢT NGƯỠNG CAO' : 'DƯỚI NGƯỠNG THẤP',
    alert_type: '⚠️ CẢNH BÁO NGƯỠNG',
    scheduled_time: `Giá trị: ${value}${config.unit} | Ngưỡng: ${config.min}-${config.max}${config.unit}`,
    timestamp: new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };

  try {
    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );
    console.log(`📧 Email cảnh báo ngưỡng đã gửi: ${config.name} ${alertType}`, response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Lỗi gửi email cảnh báo ngưỡng:', error);
    return { success: false, error };
  }
};

/**
 * Reset trạng thái cảnh báo
 */
export const resetAlertState = () => {
  Object.keys(alertState).forEach(key => {
    alertState[key] = { lastAlert: null, alertType: null };
  });
  console.log('✅ Đã reset trạng thái cảnh báo');
};

const emailAlertService = {
  sendAlertEmail,
  sendManualAlert,
  sendScheduledAlert,
  sendSensorAlert,
  checkAndAlertThreshold,
  sendThresholdAlert,
  loadThresholdsFromDB,
  getThresholds,
  resetAlertState
};

export default emailAlertService;
