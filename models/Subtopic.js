const mongoose = require('mongoose');

const subtopicSchema = new mongoose.Schema({
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  title: { type: String, required: true },
  description: { type: String },
  estimatedMinutes: { type: Number, default: 60 },
}, { timestamps: true });

module.exports = mongoose.model('Subtopic', subtopicSchema);
