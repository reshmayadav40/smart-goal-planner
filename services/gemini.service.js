const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialization moved inside functions to pick up fresh process.env
const useGemini = process.env.USE_GEMINI === "true";

const generateSubtopicsFromAI = async (
  overview,
  dailyCapacityMinutes,
  totalGoalDays = 1,
  startDate = new Date()
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
      "gemini-2.5-flash",        // Primary confirmed model
      "gemini-2.0-flash",        // Modern stable
      "gemini-flash-latest",     // Alias for newest flash
      "gemini-flash-lite-latest",
      "gemini-1.5-flash-002",    // Versioned stable
      "gemini-1.5-flash-8b",     // High quota/low latency
      "gemini-1.5-pro-002",      // Pro fallback
    ];

    let result;
    let success = false;
    let modelErrors = [];

    const formattedStartDate = new Date(startDate).toISOString().split('T')[0];

    for (const modelName of modelsToTry) {
      try {
        console.log(`AI Attempt: Trying model ${modelName}...`);
        const activeModel = genAI.getGenerativeModel({ model: modelName });
        
        // Add a small 2-second sleep between retries to avoid overlapping transient 503s
        if (modelErrors.length > 0) {
           await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const prompt = `
          You are an Expert Study Planner.
          
          GOAL DETAILS:
          - Topic: "${overview}"
          - Daily Time: ${dailyCapacityMinutes} minutes
          - Duration: ${totalGoalDays} day(s)
          - Start Date: ${formattedStartDate}

          STRUCTURE OF THE RESPONSE:
          1. Plan Overview: A concise 3 to 5 line expert summary of the strategy and feasibility.
          
          2. My Study Plan (Table): 
             A table titled "My Study Plan:" with headers "Topic | Date | Session | Minutes".
             IMPORTANT: Each row MUST have a unique, descriptive sub-topic (e.g., Afternoon: Closure & Scopes).
             
          AI RULES:
          - You MUST generate exactly ${totalGoalDays * 3} sessions in the 'subtopics' array.
          - Minutes must sum to exactly ${dailyCapacityMinutes} per day.
          - Total sessions = ${totalGoalDays * 3}.

          JSON SCHEMA (Strict):
          {
            "subtopics": [
              { "title": "Day 1: [Topic] (Morning)", "description": "• Task (60m)...", "estimatedMinutes": integer }
            ],
            "feasibilityAnalysis": "# Plan Overview\\n[3-5 lines of expert strategy]\\n\\n# My Study Plan\\nTopic | Date | Session | Minutes\\n[Row 1]...\\n[Row 2]..."
          }

          Note: Dates start at ${formattedStartDate}. Each day has Morning/Afternoon/Evening.
          RETURN RAW JSON ONLY. NO MARKDOWN CODE BLOCKS.
        `;

        const responseResult = await activeModel.generateContent(prompt);
        const response = await responseResult.response;
        const text = (await response.text()).trim();

        let parsed = {};
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? jsonMatch[0] : text;
          parsed = JSON.parse(jsonString);
        } catch (jsonErr) {
          throw new Error("Failed to parse AI JSON response: " + jsonErr.message);
        }

        if (parsed.subtopics && Array.isArray(parsed.subtopics)) {
          result = parsed;
          success = true;
          break;
        }
      } catch (err) {
        modelErrors.push(`${modelName}: ${err.message}`);
      }
    }

    if (!success) throw new Error(modelErrors.join(" | "));
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
        }
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
      feasibilityAnalysis: `AI Connection Error: "${error.message}". Check your GEMINI_API_KEY or network connection.`,
    };
  }
};

const provideReflectionFeedback = async (
  goal,
  reflectionText,
  completionPercentage
) => {
  const isAiEnabled =
    process.env.USE_GEMINI === "true" && process.env.GEMINI_API_KEY;

  if (!isAiEnabled) {
    return "Great job on your progress! Reflecting on your work is a key part of the learning process. Keep pushing towards your goal!";
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash-8b",
    ];

    let feedback = "";
    let success = false;
    let errors = [];

    for (const modelName of modelsToTry) {
      try {
        if (errors.length > 0) {
           await new Promise(resolve => setTimeout(resolve, 2000));
        }
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = `
          You are an AI study coach. A student has a goal: "${goal.title}" (${goal.overview}).
          They just wrote a reflection on their progress: "${reflectionText}"
          They completed ${completionPercentage}% of their goal for this period.
          
          Based on this, provide a 2-3 sentence encouraging and constructive piece of advice to help them stay on track or improve next time.
          Be personal and refer to their goal or reflection specifically.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        feedback = (await response.text()).trim();
        success = true;
        break;
      } catch (err) {
        console.warn(`Reflection AI model ${modelName} failed: ${err.message}`);
        errors.push(err.message || "Unknown error");
      }
    }

    if (!success) {
      throw new Error("All models failed for reflection feedback.");
    }

    return feedback;
  } catch (error) {
    console.error("Gemini reflection feedback final error:", error.message || error);
    return "Keep up the good work! Consistent reflection is the secret to long-term success.";
  }
};

module.exports = {
  generateSubtopicsFromAI,
  provideReflectionFeedback,
};