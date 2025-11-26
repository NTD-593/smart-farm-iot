const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const DeviceMode = require('../models/DeviceMode');

class SchedulerService {
  constructor(mqttClient) {
    this.mqttClient = mqttClient;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    // Chạy mỗi phút để kiểm tra lịch hẹn
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndExecuteSchedules();
    });

    this.isRunning = true;
    console.log('[Scheduler] Started - checking schedules every minute');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('[Scheduler] Stopped');
    }
  }

  async checkAndExecuteSchedules() {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];

      // Tìm tất cả lịch hẹn active và khớp thời gian
      const schedules = await Schedule.find({
        isActive: true,
        time: currentTime
      });

      for (const schedule of schedules) {
        // Kiểm tra xem hôm nay có chạy không
        if (this.shouldRunToday(schedule, currentDay)) {
          await this.executeSchedule(schedule);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Check error:', error);
    }
  }

  shouldRunToday(schedule, currentDay) {
    const { type, days } = schedule.repeat;

    switch (type) {
      case 'daily':
        return true;

      case 'weekdays':
        return !['Sat', 'Sun'].includes(currentDay);

      case 'custom':
        return days && days.includes(currentDay);

      case 'once':
        // Chỉ chạy 1 lần, nếu đã chạy rồi thì không chạy nữa
        return !schedule.lastRun;

      default:
        return false;
    }
  }

  async executeSchedule(schedule) {
    try {
      // Check if device is in schedule mode
      const deviceMode = await DeviceMode.findOne({ deviceType: schedule.deviceType });
      
      if (!deviceMode || deviceMode.mode !== 'schedule') {
        console.log(`[Scheduler] ⏭️ Skip ${schedule.deviceType}: mode is ${deviceMode?.mode || 'unknown'} (need 'schedule')`);
        return;
      }

      console.log(`[Scheduler] ✅ Executing: ${schedule.deviceType} ${schedule.action} at ${schedule.time}`);

      // Gửi MQTT command
      const topic = `serverfm/devices/${schedule.deviceId}/control`;
      const cmd = {
        [schedule.deviceType]: schedule.action === 'on' ? 1 : 0
      };

      this.mqttClient.publish(topic, JSON.stringify(cmd), { qos: 1 });

      // Cập nhật lastRun và nextRun
      schedule.lastRun = new Date();
      schedule.nextRun = schedule.calculateNextRun();

      // Nếu là once và đã chạy, tự động tắt
      if (schedule.repeat.type === 'once') {
        schedule.isActive = false;
      }

      await schedule.save();

      console.log(`[Scheduler] ✅ Executed successfully: ${schedule.deviceType} ${schedule.action}`);
    } catch (error) {
      console.error(`[Scheduler] Execute error:`, error);
    }
  }

  // Method để test scheduler manually
  async testRun(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      await this.executeSchedule(schedule);
      return { success: true, message: 'Schedule executed manually' };
    } catch (error) {
      console.error('[Scheduler] Test run error:', error);
      throw error;
    }
  }
}

module.exports = SchedulerService;
