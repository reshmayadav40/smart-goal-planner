const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Roadmap', roadmapSchema);
