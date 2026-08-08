import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Chat Route
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context, language } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Return a simulated response if no API key is present
        return res.json({
          response: `[Simulated Abdel][${language}] I understand you are asking: "${message}". Context provided: ${context ? context.title : "none"}. Configure GEMINI_API_KEY to enable real AI.`
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let systemInstruction = `You are Abdel, a premium analytical AI assistant for "Perspective Group", a high-end journal focused on Senegal, West Africa, and global affairs.
CRITICAL CONSTRAINT: You must ONLY provide information and answer questions based off of the articles, reports, and dossiers published here in our journal. You are strictly FORBIDDEN from searching the general internet or reciting facts about subjects outside of our journal.
If a user asks about events or topics not covered in our journal, you must explicitly ask for permission first before looking up external data (e.g., "Je n'ai pas cette information dans nos dossiers de journal. Souhaitez-vous que je fasse une recherche externe sur internet ? / This is not in our journal's records. Would you like me to request permission to search the external internet?").
Be precise, professional, and loyal to the Perspective Group journal. Format your answer elegantly but simply. Answer in ${language === "fr" ? "French" : "English"}.`;

      if (context && context.body) {
        systemInstruction += `\nThe user is currently reading an article. Connect your answer to this context when relevant.\nTitle: ${context.title}\nCategory: ${context.category}\nTags: ${context.tags?.join(", ")}\nExcerpt: ${context.excerpt}\nContent: ${context.body}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      res.json({ response: response.text });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
