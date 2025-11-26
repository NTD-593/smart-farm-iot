import config from '../config';

const SOCKET_URL = config.SOCKET_URL;

class SocketService {
  constructor() {
    this.socket = null;
    this._sensorCb = null;
    this._deviceCb = null;
    this._connectCb = null;
    this._disconnectCb = null;
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
        }

        // Device status events (if backend sends type: 'deviceStatus')
        else if (msg.type === 'deviceStatus') {
          if (this._deviceCb) this._deviceCb(msg);
        }

        // Other message types can be handled here
      } catch (err) {
        console.error('WebSocket message parse error', err);
      }
    });

    return this.socket;
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

export default new SocketService();
