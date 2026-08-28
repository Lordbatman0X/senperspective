sed -i '/const ai = new GoogleGenAI/i\
      if (!process.env.GEMINI_API_KEY) throw new Error("La clé API Gemini est manquante.");\
' server.ts
