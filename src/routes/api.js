const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const progressController = require('../controllers/progressController');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Auth
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);

// Roadmaps
router.get('/roadmaps', auth, goalController.getRoadmaps);
router.get('/roadmaps/:id/subtopics', auth, goalController.getRoadmapSubtopics);

// Goals
router.post('/goals', auth, goalController.createGoal);
router.get('/goals', auth, goalController.getGoals);
router.get('/goals/:id', auth, goalController.getGoalById);
router.put('/goals/:id', auth, goalController.updateGoal);
router.delete('/goals/:id', auth, goalController.deleteGoal);
router.post('/goals/:id/reflection', auth, goalController.addReflection);

// Progress
router.post('/progress/mark', auth, progressController.markProgress);
router.get('/progress/:goalId', auth, progressController.getProgress);
router.post('/planner/replan', auth, progressController.replan);

module.exports = router;
