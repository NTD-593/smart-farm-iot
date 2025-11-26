const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    default: 'farm01'
  },
  deviceType: {
    type: String,
    required: true,
    enum: ['pump', 'lamp', 'fan']
  },
  action: {
    type: String,
    required: true,
    enum: ['on', 'off']
  },
  time: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/  // HH:mm format
  },
  repeat: {
    type: {
      type: String,
      enum: ['daily', 'weekdays', 'custom', 'once'],
      default: 'daily'
    },
    days: [{
      type: String,
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  nextRun: {
    type: Date
  },
  lastRun: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Method để tính nextRun
scheduleSchema.methods.calculateNextRun = function() {
  const now = new Date();
  const [hours, minutes] = this.time.split(':').map(Number);
  
  const nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  // Nếu thời gian đã qua hôm nay, chuyển sang ngày mai
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  // Nếu là custom repeat, tìm ngày tiếp theo khớp
  if (this.repeat.type === 'custom' && this.repeat.days.length > 0) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let found = false;
    let daysChecked = 0;
    
    while (!found && daysChecked < 7) {
      const dayName = dayNames[nextRun.getDay()];
      if (this.repeat.days.includes(dayName)) {
        found = true;
      } else {
        nextRun.setDate(nextRun.getDate() + 1);
        daysChecked++;
      }
    }
  }
  
  // Nếu là weekdays (T2-T6)
  if (this.repeat.type === 'weekdays') {
    while (nextRun.getDay() === 0 || nextRun.getDay() === 6) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  }
  
  // Nếu là once, chỉ chạy 1 lần
  if (this.repeat.type === 'once' && this.lastRun) {
    return null;
  }
  
  return nextRun;
};

// Pre-save hook để tính nextRun
scheduleSchema.pre('save', function(next) {
  if (this.isModified('time') || this.isModified('repeat') || this.isNew) {
    this.nextRun = this.calculateNextRun();
  }
  next();
});

module.exports = mongoose.model('Schedule', scheduleSchema);
