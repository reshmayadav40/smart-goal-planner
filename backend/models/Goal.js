const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: false },
  goalType: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  overview: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  dailyCapacityMinutes: { type: Number, required: true },
  feasibilityAnalysis: { type: String },
  reflections: [{
    text: { type: String, required: true },
    completionPercentage: { type: Number, required: true },
    feedback: { type: String },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
