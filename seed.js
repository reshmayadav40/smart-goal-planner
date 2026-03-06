const mongoose = require('mongoose');
const Roadmap = require('./models/Roadmap');
const Subtopic = require('./models/Subtopic');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/goalplanner';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    await Roadmap.deleteMany({});
    await Subtopic.deleteMany({});

    const roadmap1 = await Roadmap.create({
      title: 'Full Stack Web Development',
      description: 'Learn to build modern web applications from scratch.'
    });

    const subtopics = [
      { roadmapId: roadmap1._id, title: 'HTML & CSS Basics', description: 'Syntax, elements, and styling.', estimatedMinutes: 120 },
      { roadmapId: roadmap1._id, title: 'JavaScript Fundamentals', description: 'Variables, loops, and functions.', estimatedMinutes: 180 },
      { roadmapId: roadmap1._id, title: 'Node.js and Express', description: 'Server-side development.', estimatedMinutes: 150 },
      { roadmapId: roadmap1._id, title: 'MongoDB and Mongoose', description: 'Database management.', estimatedMinutes: 120 },
      { roadmapId: roadmap1._id, title: 'React Basics', description: 'Components, props, and state.', estimatedMinutes: 180 },
      { roadmapId: roadmap1._id, title: 'Redux and Context API', description: 'State management.', estimatedMinutes: 150 }
    ];

    await Subtopic.insertMany(subtopics);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedData();
