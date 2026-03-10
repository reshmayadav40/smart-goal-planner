const mongoose = require('mongoose');

const goalScheduleSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
  subtopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subtopic', required: true },
  assignedDate: { type: Date, required: true },
  session: { type: String, enum: ['Morning', 'Afternoon', 'Evening', 'Daily Focus'], required: true },
  plannedMinutes: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'done', 'delayed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('GoalSchedule', goalScheduleSchema);
