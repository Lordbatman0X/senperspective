const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({});
ai.models.generateContent({ 
  model: "gemini-2.5-flash", 
  contents: "hi",
  config: { tools: [{ googleSearch: {} }] }
}).catch(e => console.error(e.message));
