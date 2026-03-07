const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialization moved inside functions to pick up fresh process.env
const useGemini = process.env.USE_GEMINI === "true";

const generateSubtopicsFromAI = async (
  overview,
  dailyCapacityMinutes,
  totalGoalDays = 1,
) => {
  const isAiEnabled =
    process.env.USE_GEMINI === "true" && process.env.GEMINI_API_KEY;

  if (!isAiEnabled) {
    return {
      subtopics: [
        {
          title: "Session 1: Foundations",
          description: `Introduction to the core principles of ${overview}.`,
          estimatedMinutes: Math.floor(dailyCapacityMinutes / 3),
        },
        {
          title: "Session 2: Active Practice",
          description: "Practical exercises and application of concepts.",
          estimatedMinutes: Math.floor(dailyCapacityMinutes / 3),
        },
        {
          title: "Session 3: Advanced Review",
          description: "Deep dive into complex areas and final recap.",
          estimatedMinutes: Math.floor(dailyCapacityMinutes / 3),
        },
      ],
      feasibilityAnalysis:
        "AI is disabled. Generated a foundational study template.",
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-pro",
      "gemini-1.5-pro",
      "gemini-1.5-pro-latest",
      "gemini-2.0-flash-exp",
    ];

    let result;
    let success = false;
    let modelErrors = [];

    for (const modelName of modelsToTry) {
      try {
        console.log(`AI Attempt: Trying model ${modelName}...`);
        const activeModel = genAI.getGenerativeModel({ model: modelName });

        const prompt = `
          You are an elite educational architect.
          The student wants to master this topic: "${overview}"
          Daily capacity: ${dailyCapacityMinutes} minutes.
          Duration: ${totalGoalDays} days.
          
          Instructions:
          1. Provide a professional, subject-appropriate study plan.
          2. If 1 day: Generate EXACTLY 3 sessions (Morning, Afternoon, Evening).
          3. If >1 day: Generate EXACTLY ${totalGoalDays} subtopics (one for each day).
          4. Distribution: Spread the ${dailyCapacityMinutes} across the sessions.
          5. Progression: Logic flow from Foundations to Application to Review.
          
          Return JSON:
          {
            "subtopics": [
              { "title": "Professional Title", "description": "Specific learning tasks...", "estimatedMinutes": 60 }
            ],
            "feasibilityAnalysis": "Expert assessment of this plan."
          }
        `;

        const responseResult = await activeModel.generateContent(prompt);
        const response = await responseResult.response;
        const text = response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        const parsed = JSON.parse(jsonString);

        if (parsed.subtopics && Array.isArray(parsed.subtopics)) {
          result = parsed;
          success = true;
          console.log(`AI Success with model: ${modelName}`);
          break;
        }
      } catch (err) {
        const errMsg = err.message || "Unknown error";
        console.warn(`Model ${modelName} failed: ${errMsg}`);
        modelErrors.push(`${modelName}: ${errMsg}`);
      }
    }

    if (!success) {
      const errorDetail = modelErrors.join(" | ");
      throw new Error(`All models failed. Details: ${errorDetail}`);
    }
    return result;
  } catch (error) {
    console.error("AI Fallback triggered. Final Error:", error.message);
    const subtopics = [];
    const toTitleCase = (str) => str.replace(/\b\w/g, (l) => l.toUpperCase());
    const cleanTopic = overview
      .replace(/(i want to learn|study|everything about|methods of)/gi, "")
      .trim();
    const mainTitle = toTitleCase(cleanTopic || "Study Subject");

    if (totalGoalDays === 1) {
      subtopics.push(
        {
          title: `Morning: ${mainTitle} - Foundations`,
          description: `Key principles and essential introduction to ${mainTitle}.`,
          estimatedMinutes: Math.floor(dailyCapacityMinutes * 0.3),
        },
        {
          title: `Afternoon: ${mainTitle} - Practice`,
          description: `Hands-on application and exercises for ${mainTitle}.`,
          estimatedMinutes: Math.floor(dailyCapacityMinutes * 0.4),
        },
        {
          title: `Evening: ${mainTitle} - Review`,
          description: `Recap and final consolidation of today's learning.`,
          estimatedMinutes: Math.floor(dailyCapacityMinutes * 0.3),
        },
      );
    } else {
      for (let day = 1; day <= totalGoalDays; day++) {
        subtopics.push({
          title: `Day ${day}: ${mainTitle} Phase ${day}`,
          description: `Progressive study step for ${mainTitle}.`,
          estimatedMinutes: Math.min(120, dailyCapacityMinutes),
        });
      }
    }

    return {
      subtopics,
      feasibilityAnalysis: `AI Connection Error: "${error.message}". This usually means your API Key is missing in Render or Google's servers are busy. Please check your Render "Environment" settings!`,
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
    const apiKey = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);

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
