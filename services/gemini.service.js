const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const useGemini = process.env.USE_GEMINI === "true";

const generateSubtopicsFromAI = async (
  overview,
  dailyCapacityMinutes,
  totalGoalDays = 1,
) => {
  const isAiEnabled =
    process.env.USE_GEMINI === "true" && process.env.GEMINI_API_KEY;

  if (!isAiEnabled) {
    console.log("AI status:", {
      USE_GEMINI: process.env.USE_GEMINI,
      hasKey: !!process.env.GEMINI_API_KEY,
    });
    console.log(
      "Gemini AI is disabled or missing key. Using dynamic fallback...",
    );
    // Return a more varied fallback to avoid identical results
    return {
      subtopics: [
        {
          title: "Task 1: " + overview.split("and")[0] || overview,
          description: "Initial focus on requested topic.",
          estimatedMinutes: 90,
        },
        {
          title:
            "Task 2: " + (overview.split("and")[1] || "Practical Application"),
          description: "Secondary task and practice.",
          estimatedMinutes: 120,
        },
        {
          title: "Task 3: Review & Exercise",
          description: "Deepening understanding through practice.",
          estimatedMinutes: 120,
        },
        {
          title: "Task 4: Small Project Implementation",
          description: "Building something with what was learned.",
          estimatedMinutes: 150,
        },
      ],
      feasibilityAnalysis:
        "AI analysis is currently disabled in your .env file (USE_GEMINI=false). Please set it to true and restart the server for real AI feedback.",
    };
  }

  try {
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-2.0-flash-exp",
      "gemma-2-27b-it",
      "gemini-1.5-pro-latest",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini 3 flash",
      "gemini 3 pro",
    ];

    let result;
    let success = false;
    let lastError;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting AI generation with model: ${modelName}...`);
        const activeModel = genAI.getGenerativeModel({ model: modelName });

        const prompt = `
          You are an elite study architect and task breakdown expert.
          The student has provided this overview of their goal: "${overview}"
          Total study time allocated: ${dailyCapacityMinutes} minutes.
          Total duration: ${totalGoalDays} days.
          
          Instructions:
          1. CRITICAL: Identify ALL topics mentioned in the student's request (e.g., "data types", "loops", "arrays", "practice", "code writing").
          2. Granularity & Duration: 
             - If total duration is 1 day: Generate EXACTLY 3 subtopics (Morning, Afternoon, Evening sessions) for that day.
             - TIME FILL: For 1-day goals, ensure the 3 sessions cover ${dailyCapacityMinutes} minutes total. 
               (e.g., 30% Morning, 40% Afternoon, 30% Evening).
             - If total duration > 1 day: Generate EXACTLY ${totalGoalDays} subtopics, one representing each day of the plan (Day 1, Day 2, ..., Day ${totalGoalDays}).
          3. DIVERSE DISTRIBUTION: Do not repeat the same combined title for every day. 
             - If multiple topics are mentioned (e.g., "Arrays and Strings"), split them across the duration.
          4. SOLID TITLES: CLEAN and OPTIMIZE user input into professional academic titles.
             - WRONG: "in this week every methods of array"
             - RIGHT: "Advanced Array Methods" or "Comprehensive Array Practice"
          5. Progression: Start from basic fundamentals and gradually move to intermediate and advanced topics.
          6. Coverage: Ensure EVERY topic mentioned in the overview is scheduled.
          7. Achievability: Content must be BEGINNER-FRIENDLY. Use simple language.
          8. Time: Each subtopic should stay within 30-150 minutes of study time.
          
          Return a JSON object with this exact structure:
          {
            "subtopics": [
              { "title": "${totalGoalDays === 1 ? "Morning: [Topic]" : "Day 1: [Topic]"}", "description": "Specific tasks...", "estimatedMinutes": 60 }
            ],
            "feasibilityAnalysis": "A 2-sentence expert assessment of this ${totalGoalDays}-day plan."
          }
        `;

        const responseResult = await activeModel.generateContent(prompt);
        const response = await responseResult.response;
        const text = response.text().trim();

        // Improved JSON extraction regex
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;

        const parsed = JSON.parse(jsonString);

        // STRICT SAFETY CHECK: Ensure subtopics exist and are the correct count
        const requiredSubtopics = totalGoalDays === 1 ? 3 : totalGoalDays;
        if (
          !parsed.subtopics ||
          !Array.isArray(parsed.subtopics) ||
          parsed.subtopics.length < requiredSubtopics
        ) {
          console.warn(
            `Model ${modelName} returned invalid or incomplete subtopics (${parsed.subtopics?.length || 0} found, but ${requiredSubtopics} required). Retrying...`,
          );
          continue;
        }

        result = parsed;
        success = true;
        console.log(`Success with model: ${modelName}`);
        break; // Exit loop on success
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} failed: ${err.message || err}`);
        // Continue to next model
      }
    }

    if (!success) {
      throw lastError || new Error("All models failed to generate content.");
    }

    return result;
  } catch (error) {
    console.error(
      "CRITICAL Gemini AI Service Error (All Retries Failed):",
      error.message || error,
    );
    if (error.stack) console.error("Stack Trace:", error.stack);

    // INTELLIGENT FALLBACK: Programmatically generate a detailed plan
    console.log(
      `Generating programmatic fallback for ${totalGoalDays} days...`,
    );

    const subtopics = [];

    // Meta-phrases to filter out
    const noise = [
      "i want to",
      "complete all the things",
      "i have to",
      "i'm looking to",
      "learn",
      "study",
      "language",
      "with all the topics",
      "and code writing",
      "and practice",
      "set my goal",
      "for how much time",
      "i want to learn",
      "in this week",
      "properly",
      "actually",
      "every",
      "topics of",
      "methods of array",
      "methods of",
      "basics of",
      "introduction to",
      "intro to",
      "all the thing",
      "all the things",
      "everything",
      "with coding practice",
      "with practice",
    ];

    const toTitleCase = (str) => {
      return str.replace(/\b\w/g, (l) => l.toUpperCase());
    };

    // Smarter topic extraction: split by common separators
    let topics = overview
      .split(/[,;]|\band\b|\b&\b/)
      .map((t) => {
        let clean = t.toLowerCase();
        noise.forEach((phrase) => {
          clean = clean.split(phrase).join("");
        });
        return clean.trim();
      })
      .filter((t) => t.length > 2);

    // If no topics left after filtering, use the original split but shorter
    if (topics.length === 0) {
      topics = overview
        .split(/[,\s]+/)
        .filter((t) => t.length > 3)
        .slice(0, 5);
    }

    const mainTopic = topics[0] || "Learning Goal";

    if (totalGoalDays === 1) {
      // 3 sessions for 1 day, distributing identified topics
      const morningTopic = toTitleCase(topics[0] || mainTopic);
      const afternoonTopic = toTitleCase(topics[1] || topics[0] || mainTopic);
      const eveningTopic = toTitleCase(topics[2] || topics[0] || mainTopic);

      subtopics.push(
        {
          title: `Morning: ${morningTopic}`,
          description: `Focus on fundamentals and key concepts of ${morningTopic} (${Math.floor(dailyCapacityMinutes * 0.3)} mins).`,
          estimatedMinutes: Math.floor(dailyCapacityMinutes * 0.3),
        },
        {
          title: `Afternoon: ${afternoonTopic}`,
          description: `Deep dive practice and intensive exercises for ${afternoonTopic} (${Math.floor(dailyCapacityMinutes * 0.4)} mins).`,
          estimatedMinutes: Math.floor(dailyCapacityMinutes * 0.4),
        },
        {
          title: `Evening: ${eveningTopic} Complete`,
          description: `Final review, concluding all tasks for ${overview}, and solving practice questions (${Math.floor(dailyCapacityMinutes * 0.3)} mins).`,
          estimatedMinutes: Math.floor(dailyCapacityMinutes * 0.3),
        },
      );
    } else {
      // Distribute topics across multiple days
      for (let day = 1; day <= totalGoalDays; day++) {
        let title = "";
        let description = "";

        const topicIndex = (day - 1) % (topics.length || 1);
        const currentTopic = toTitleCase(topics[topicIndex] || mainTopic);

        if (day === 1) {
          title = `Day ${day}: Introduction to ${currentTopic}`;
          description = `Laying the foundation for ${overview}.`;
        } else if (day === totalGoalDays) {
          title = `Day ${day}: Final Review & ${currentTopic}`;
          description = `Consolidating knowledge and finishing tasks for ${overview}.`;
        } else {
          title = `Day ${day}: ${currentTopic} Deep Dive`;
          description = `Dedicated study and application phase for ${currentTopic}.`;
        }

        subtopics.push({
          title,
          description,
          estimatedMinutes: Math.min(120, dailyCapacityMinutes),
        });
      }
    }

    return {
      subtopics,
      feasibilityAnalysis: `AI service encountered an issue with all models. Generated a structured ${totalGoalDays === 1 ? "3-session" : totalGoalDays + "-day"} roadmap covering your key topics programmatically!`,
    };
  }
};

const provideReflectionFeedback = async (
  goal,
  reflectionText,
  completionPercentage,
) => {
  const isAiEnabled =
    process.env.USE_GEMINI === "true" && process.env.GEMINI_API_KEY;

  if (!isAiEnabled) {
    return "Great job on your progress! Reflecting on your work is a key part of the learning process. Keep pushing towards your goal!";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
      You are an AI study coach. A student has a goal: "${goal.title}" (${goal.overview}).
      They just wrote a reflection on their progress: "${reflectionText}"
      They completed ${completionPercentage}% of their goal for this period.
      
      Based on this, provide a 2-3 sentence encouraging and constructive piece of advice to help them stay on track or improve next time.
      Be personal and refer to their goal or reflection specifically.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini reflection feedback error:", error.message || error);
    return "Keep up the good work! Consistent reflection is the secret to long-term success.";
  }
};

module.exports = {
  generateSubtopicsFromAI,
  provideReflectionFeedback,
};
