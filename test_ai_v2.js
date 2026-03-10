require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const candidates = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite-001"
  ];

  console.log("Testing specific candidates from discovery list...");

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hi");
      const response = await result.response;
      console.log(`✅ ${modelName}: Success!`);
    } catch (error) {
      console.log(`❌ ${modelName}: [${error.status || 'Error'}] ${error.message}`);
    }
  }
}

testModels();
