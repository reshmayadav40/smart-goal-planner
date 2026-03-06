const mongoose = require('mongoose');

const goalProgressSchema = new mongoose.Schema({
  goalScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoalSchedule', required: true },
  actualMinutes: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('GoalProgress', goalProgressSchema);
