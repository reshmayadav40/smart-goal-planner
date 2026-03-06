const mongoose = require("mongoose");
const Roadmap = require("../models/Roadmap");
const Subtopic = require("../models/Subtopic");
const Goal = require("../models/Goal");
const GoalSchedule = require("../models/GoalSchedule");
const GoalProgress = require("../models/GoalProgress");
const {
  generateSubtopicsFromAI,
  provideReflectionFeedback,
} = require("../services/gemini.service");
const { distributeSubtopics } = require("../algorithms/scheduler");
const { addDays } = require("date-fns");

exports.getRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find();
    res.json(roadmaps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoadmapSubtopics = async (req, res) => {
  try {
    const subtopics = await Subtopic.find({ roadmapId: req.params.id });
    res.json(subtopics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const {
      title,
      goalType,
      overview,
      startDate,
      endDate,
      dailyCapacityMinutes,
    } = req.body;

    const start = new Date(startDate);
    const end = goalType === "daily" ? start : new Date(endDate);

    // Use date-fns differenceInDays + 1 for inclusive count
    const totalGoalDays =
      goalType === "daily"
        ? 1
        : Math.max(1, require("date-fns").differenceInDays(end, start) + 1);
    const totalLearningMinutes = dailyCapacityMinutes * totalGoalDays;

    // 2. Generate Subtopics using AI (tell it the TOTAL time to fill and number of days)
    const aiResponse = await generateSubtopicsFromAI(
      overview,
      totalLearningMinutes,
      totalGoalDays,
    );
    const { subtopics, feasibilityAnalysis } = aiResponse;

    // 1. Save Goal
    const goal = new Goal({
      userId: req.user._id,
      title,
      goalType,
      overview,
      startDate: start,
      endDate: end,
      dailyCapacityMinutes,
      feasibilityAnalysis,
    });
    await goal.save();

    // 3. Save these subtopics to the DB
    const createdSubtopics = await Subtopic.insertMany(
      subtopics.map((s) => ({
        ...s,
        roadmapId: new mongoose.Types.ObjectId(),
      })),
    );

    // 4. Schedule
    const scheduleData = distributeSubtopics(
      createdSubtopics,
      goal.startDate,
      goal.endDate,
      goal.dailyCapacityMinutes,
    );

    // 5. Save Schedule
    const savedSchedule = await GoalSchedule.insertMany(
      scheduleData.map((s) => ({ ...s, goalId: goal._id })),
    );

    res.status(201).json({ goal, schedule: savedSchedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const schedule = await GoalSchedule.find({ goalId: goal._id }).populate(
      "subtopicId",
    );
    res.json({ goal, schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const {
      title,
      overview,
      goalType,
      dailyCapacityMinutes,
      startDate,
      endDate,
    } = req.body;
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const overviewChanged = overview !== goal.overview;
    const capacityChanged =
      parseInt(dailyCapacityMinutes) !== goal.dailyCapacityMinutes;
    const typeChanged = goalType !== goal.goalType;

    // Date comparison
    const newStart = new Date(startDate);
    const newEnd =
      goalType === "daily"
        ? addDays(new Date(startDate), 1)
        : new Date(endDate);
    const startChanged = newStart.getTime() !== goal.startDate.getTime();
    const endChanged = newEnd.getTime() !== goal.endDate.getTime();

    goal.title = title;
    goal.overview = overview;
    goal.goalType = goalType;
    goal.dailyCapacityMinutes = parseInt(dailyCapacityMinutes);
    goal.startDate = newStart;
    goal.endDate = newEnd;

    if (
      overviewChanged ||
      capacityChanged ||
      startChanged ||
      endChanged ||
      typeChanged
    ) {
      // Regenerate Plan
      const totalGoalDays =
        goal.goalType === "daily"
          ? 1
          : Math.max(
              1,
              require("date-fns").differenceInDays(
                goal.endDate,
                goal.startDate,
              ) + 1,
            );
      const totalLearningMinutes = goal.dailyCapacityMinutes * totalGoalDays;

      const aiResponse = await generateSubtopicsFromAI(
        goal.overview,
        totalLearningMinutes,
        totalGoalDays,
      );
      const { subtopics, feasibilityAnalysis } = aiResponse;

      goal.feasibilityAnalysis = feasibilityAnalysis;

      // Delete old schedule
      await GoalSchedule.deleteMany({ goalId: goal._id });

      const createdSubtopics = await Subtopic.insertMany(
        subtopics.map((s) => ({
          ...s,
          roadmapId: new mongoose.Types.ObjectId(),
        })),
      );

      const scheduleData = distributeSubtopics(
        createdSubtopics,
        goal.startDate,
        goal.endDate,
        goal.dailyCapacityMinutes,
      );
      await GoalSchedule.insertMany(
        scheduleData.map((s) => ({ ...s, goalId: goal._id })),
      );
    }

    await goal.save();
    res.json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.addReflection = async (req, res) => {
  try {
    const { text, completionPercentage } = req.body;
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const feedback = await provideReflectionFeedback(
      goal,
      text,
      completionPercentage,
    );

    goal.reflections.push({
      text,
      completionPercentage,
      feedback,
      date: new Date(),
    });

    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    await GoalSchedule.deleteMany({ goalId: goal._id });
    // Keep or delete subtopics based on your preference? Let's not delete just yet to be safe,
    // since roadmap subtopics might be reused if standard. But here they are custom generated.
    // We should be able to delete the goal safely.
    await Goal.deleteOne({ _id: goal._id });

    res.json({ message: "Goal deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
