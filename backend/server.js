/*
  ===== ServerFM IoT Gateway =====
    - Nhận dữ liệu telemetry qua MQTT: serverfm/devices/{deviceId}/telemetry
    - Gửi điều khiển qua MQTT: serverfm/devices/{deviceId}/control
    - Lưu dữ liệu vào MongoDB
    - Cung cấp REST API (xem, tìm kiếm, sửa, xóa)
    - Phát dữ liệu thời gian thực qua WebSocket cho frontend
*/

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');

// ===================== AUTH IMPORTS =====================
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const schedulesRoutes = require('./routes/schedules');
const deviceModesRoutes = require('./routes/deviceModes');
const { authenticate } = require('./middleware/auth');
const { checkRole, checkPermission } = require('./middleware/checkRole');

// ===================== SERVICES =====================
const SchedulerService = require('./services/scheduler');
const SensorController = require('./services/sensorController');

// ===================== ENV CONFIG =====================
const {
  PROJECT_NAME = 'serverfm',
  MQTT_HOST = 'localhost',
  MQTT_PORT = 1883,
  MQTT_USERNAME = 'mqtt_ante',
  MQTT_PASSWORD = 'iotante123@X',
  MQTT_TOPIC_SUBSCRIBE = 'serverfm/devices/+/telemetry',
  CONTROL_TOPIC_TEMPLATE = 'serverfm/devices/{device}/control',
  MONGODB_URI = 'mongodb://localhost:27017/farm_monitor',
  HTTP_PORT = 3000,
  WS_PORT = 8080,
  LOG_LEVEL = 'info'
} = process.env;

const MQTT_URL = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;

// ===================== MONGODB =====================
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log(`[MongoDB] Connected to ${MONGODB_URI}`);
  
  // Initialize default device modes
  const DeviceMode = require('./models/DeviceMode');
  await DeviceMode.initializeDefaults();
}).catch(err => { 
  console.error('[MongoDB] Connection error:', err); 
  process.exit(1); 
});

// ===================== MONGOOSE MODEL =====================
const telemetrySchema = new mongoose.Schema({
  project: { type: String, index: true },
  deviceId: { type: String, index: true },
  temperature: Number,
  humidity: Number,
  humiGround: Number,
  ctrPump: Number,
  ctrLamp: Number,
  ctrFan: Number,
  raw: mongoose.Schema.Types.Mixed,
  topic: String,
  createdAt: { type: Date, default: Date.now, index: true }
});

const Telemetry = mongoose.model('Telemetry', telemetrySchema);

// ===================== MQTT CLIENT =====================
const mqttClient = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD
});

mqttClient.on('connect', () => {
  console.log(`[MQTT] Connected to ${MQTT_URL}`);
  mqttClient.subscribe(MQTT_TOPIC_SUBSCRIBE, (err) => {
    if (err) console.error('[MQTT] Subscribe error:', err);
    else console.log(`[MQTT] Subscribed to topic: ${MQTT_TOPIC_SUBSCRIBE}`);
  });
  
  // ===================== START SERVICES =====================
  // Initialize scheduler for time-based automation
  const scheduler = new SchedulerService(mqttClient);
  scheduler.start();
  
  // Initialize sensor controller for sensor-based automation
  const sensorController = new SensorController(mqttClient);
  sensorController.start();
  
  // Store services in app.locals for route access
  app.locals.sensorController = sensorController;
  app.locals.scheduler = scheduler;
});

mqttClient.on('error', (err) => console.error('[MQTT] Error:', err));

// ===================== WEBSOCKET SERVER =====================
const wss = new WebSocket.Server({ port: WS_PORT });
console.log(`[WebSocket] Listening on port ${WS_PORT}`);

function broadcastJSON(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected');
  ws.send(JSON.stringify({ type: 'welcome', message: `Connected to ${PROJECT_NAME} WebSocket` }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'control' && msg.device && msg.cmd) {
        const topic = CONTROL_TOPIC_TEMPLATE.replace('{device}', msg.device);
        const payload = JSON.stringify(msg.cmd);
        mqttClient.publish(topic, payload, { qos: 1 });
        
        // Broadcast device status to all clients
        Object.keys(msg.cmd).forEach(deviceName => {
          const status = msg.cmd[deviceName] === 1 ? 'on' : 'off';
          broadcastJSON({
            type: 'deviceStatus',
            deviceName: deviceName,
            status: status,
            timestamp: new Date().toISOString()
          });
        });
        
        ws.send(JSON.stringify({ type: 'ok', topic, payload }));
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', error: 'invalid json' }));
    }
  });
});

// ===================== PAYLOAD PARSER =====================
function parsePayload(payloadBuffer) {
  const s = payloadBuffer.toString();
  try {
    const j = JSON.parse(s);
    if (j && Array.isArray(j.data)) {
      const arr = j.data;
      return {
        temperature: arr[0],
        humidity: arr[1],
        humiGround: arr[2],
        ctrPump: arr[3],
        ctrLamp: arr[4],
        ctrFan: arr[5],
        raw: j
      };
    }
    return { raw: j };
  } catch {
    return { raw: s };
  }
}

// ===================== MQTT MESSAGE HANDLER =====================
mqttClient.on('message', async (topic, payload) => {
  try {
    const parts = topic.split('/');
    const project = parts[0];
    const deviceId = parts[2];

    const parsed = parsePayload(payload);
    const doc = new Telemetry({
      project,
      deviceId,
      temperature: parsed.temperature,
      humidity: parsed.humidity,
      humiGround: parsed.humiGround,
      ctrPump: parsed.ctrPump,
      ctrLamp: parsed.ctrLamp,
      ctrFan: parsed.ctrFan,
      raw: parsed.raw,
      topic
    });

    await doc.save();
    
    // ===================== LƯU SENSOR HISTORY =====================
    // Lưu vào collection riêng cho charts
    const SensorHistory = require('./models/SensorHistory');
    await SensorHistory.create({
      temperature: parsed.temperature,
      humidity: parsed.humidity,
      soilMoisture: parsed.humiGround,
      timestamp: new Date()
    });

    broadcastJSON({
      type: 'telemetry',
      project,
      deviceId,
      data: {
        temperature: doc.temperature,
        humidity: doc.humidity,
        humiGround: doc.humiGround,
        ctrPump: doc.ctrPump,
        ctrLamp: doc.ctrLamp,
        ctrFan: doc.ctrFan
      },
      createdAt: doc.createdAt,
      id: doc._id
    });

    if (LOG_LEVEL === 'debug')
      console.log(`[MQTT] Data saved from ${deviceId}:`, parsed);
  } catch (err) {
    console.error('[MQTT] Message error:', err);
  }
});

// ===================== EXPRESS HTTP SERVER =====================
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// ===================== AUTHENTICATION ROUTES =====================
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/device-modes', deviceModesRoutes);

// ===================== SENSOR ROUTES =====================
const sensorsRoutes = require('./routes/sensors');
app.use('/api/sensors', sensorsRoutes);

// ===================== DEVICE ROUTES =====================
const devicesRoutes = require('./routes/devices');
app.use('/api/devices', devicesRoutes);

// ===================== WEATHER ROUTES =====================
const weatherRoutes = require('./routes/weather');
app.use('/api/weather', weatherRoutes);

// ----- REST: GET /data -----
app.get('/data', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.project) filter.project = req.query.project;
    if (req.query.device) filter.deviceId = req.query.device;
    if (req.query.from || req.query.to) filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);

    const [items, total] = await Promise.all([
      Telemetry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Telemetry.countDocuments(filter)
    ]);

    res.json({ page, limit, total, items });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// ----- REST: GET /data/search -----
app.get('/data/search', async (req, res) => {
  try {
    const { device, from, to } = req.query;
    if (!device) {
      return res.status(400).json({ error: 'device is required' });
    }

    const filter = { deviceId: device };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        // tự động cộng 1 ngày nếu chỉ có YYYY-MM-DD để lấy trọn ngày
        if (to.length === 10) toDate.setDate(toDate.getDate() + 1);
        filter.createdAt.$lte = toDate;
      }
    }

    const data = await Telemetry.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ device, from, to, count: data.length, items: data });
  } catch (err) {
    console.error('[HTTP] /data/search error:', err);
    res.status(500).json({ error: 'server error' });
  }
});


// ----- REST: POST /control -----
// Requires authentication and OPERATOR or ADMIN role
app.post('/control', authenticate, checkRole('OPERATOR', 'ADMIN'), (req, res) => {
  const { device, cmd } = req.body;
  if (!device || !cmd) return res.status(400).json({ error: 'device and cmd required' });

  const topic = CONTROL_TOPIC_TEMPLATE.replace('{device}', device);
  const payload = JSON.stringify(cmd);
  mqttClient.publish(topic, payload, { qos: 1 });
  res.json({ ok: true, topic, payload });
});

// ----- REST: PUT /data/:id (sửa dữ liệu) -----
// Requires ADMIN role
app.put('/data/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
  try {
    const doc = await Telemetry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'update failed' });
  }
});

// ----- REST: DELETE /data/:id (xóa dữ liệu) -----
// Requires ADMIN role
app.delete('/data/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
  try {
    const doc = await Telemetry.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'delete failed' });
  }
});

// ===================== START SERVER =====================
app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] Server listening on port ${HTTP_PORT}`);
});
