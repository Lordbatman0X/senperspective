const fs = require('fs');

let code = fs.readFileSync('server/aiNewsroomEngine.ts', 'utf8');

// 1. Add extractJsonFromText helper
const helperStr = `
function extractJsonFromText(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\\{[\\s\\S]*\\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Could not extract JSON from response: " + text.slice(0, 100));
  }
}
`;

if (!code.includes("extractJsonFromText")) {
  code = code.replace(
    'export function buildEditorialSystemPrompt',
    helperStr + '\nexport function buildEditorialSystemPrompt'
  );
}

// 2. Replace JSON.parse(text) with extractJsonFromText(text) where appropriate
// We replace only the ones in generateWithGemini, generateWithOpenAI, generateWithGroq, generateWithOpenRouter
code = code.replace(/const parsed = JSON\.parse\(text\);/g, 'const parsed = extractJsonFromText(text);');

// 3. Fix Groq models array
const oldGroqModels = `  const models = [
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
    "qwen/qwen3.6-27b",
    "qwen/qwen3.8-27b"
  ];`;
const newGroqModels = `  const models = [
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
    "qwen-2.5-32b"
  ];`;
code = code.replace(oldGroqModels, newGroqModels);

// 4. Remove strict response_format from Groq and OpenRouter to prevent 400 errors from API constraints
code = code.replace(/response_format:\s*{\s*type:\s*"json_object"\s*},/g, '');

fs.writeFileSync('server/aiNewsroomEngine.ts', code);
