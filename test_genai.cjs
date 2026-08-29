const { GoogleGenAI } = require("@google/genai");
process.env.GEMINI_API_KEY = "";
const ai = new GoogleGenAI({});
ai.models.generateContent({ model: "gemini-2.5-flash", contents: "hi" }).catch(e => console.error(e.message));
