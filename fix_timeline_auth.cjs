const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const oldCode = `  app.post("/api/generate-timeline", express.json(), async (req, res) => {
    try {
      const { title, excerpt, language = 'fr' } = req.body;
      if (!process.env.GEMINI_API_KEY) throw new Error("La clé API Gemini est manquante.");

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });`;

const newCode = `  app.post("/api/generate-timeline", express.json(), async (req, res) => {
    try {
      const { title, excerpt, language = 'fr' } = req.body;
      
      // Use the centralized aiNewsroomEngine which handles secure API keys and environment credentials
      const ai = getGeminiClient();
      if (!ai) {
        throw new Error("La clé API Gemini est manquante. Veuillez la configurer dans les paramètres.");
      }`;

serverCode = serverCode.replace(oldCode, newCode);

fs.writeFileSync('server.ts', serverCode);
console.log("Updated timeline endpoint.");
