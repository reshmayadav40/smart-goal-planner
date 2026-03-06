const GoalSchedule = require('../models/GoalSchedule');
const GoalProgress = require('../models/GoalProgress');

exports.markProgress = async (req, res) => {
  try {
    const { goalScheduleId, actualMinutes } = req.body;
    
    const progress = new GoalProgress({
      goalScheduleId,
      actualMinutes
    });
    await progress.save();

    await GoalSchedule.findByIdAndUpdate(goalScheduleId, { status: 'done' });

    res.status(201).json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const schedules = await GoalSchedule.find({ goalId: req.params.goalId }).populate('subtopicId');
    const progress = await GoalProgress.find({
      goalScheduleId: { $in: schedules.map(s => s._id) }
    });
    
    res.json({ schedules, progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.replan = async (req, res) => {
    // Basic replan: find pending, redistribute from tomorrow
    res.status(501).json({ message: "Replan feature coming soon" });
};
