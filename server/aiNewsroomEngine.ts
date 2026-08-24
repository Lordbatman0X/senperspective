import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

export type ArticleStyleType = "News" | "Analysis" | "Deep Dive" | "Explainer" | "Opinion";

export interface CustomEditorialGuidelines {
  customDirectives: string;
  editorialComments: string;
  forbiddenPhrases: string[];
  preferredTone: "analytical" | "investigative" | "diplomatic" | "dynamic" | "custom";
  exemplaryExample: {
    titleFr: string;
    excerptFr: string;
    bodyFr: string;
    titleEn?: string;
    excerptEn?: string;
    bodyEn?: string;
  };
  updatedAt?: string;
}

export interface GenerateArticleOptions {
  rssItem?: any;
  prompt?: string;
  category?: string;
  type?: ArticleStyleType;
  preferredEngine?: "auto" | "gemini" | "openai" | "groq" | "openrouter";
  feedUrl?: string;
  customGuidelinesOverride?: CustomEditorialGuidelines;
}

export interface DualEngineResult {
  success: boolean;
  article: any;
  engineUsed: string;
  failoverTriggered: boolean;
  failoverReason?: string;
  error?: string;
}

const GUIDELINES_FILE_PATH = path.join(process.cwd(), "server", "editorial_guidelines.json");

export const DEFAULT_EDITORIAL_GUIDELINES: CustomEditorialGuidelines = {
  customDirectives: `[TRIAGE ÉDITORIAL DYNAMIQUE & LOGIQUE DUAL-NEWS]
Avant d'écrire, classifier l'information en [STANDARD_NEWS] ou [DEEP_DIVE] :

1. IF [STANDARD_NEWS] (Information factuelle, fait local, fait sportif, communiqué simple, dépêche) :
   - Format : 2 à 3 courts paragraphes de texte continu fluide.
   - Sous-titres (##) : AUCUN SOUS-TITRE / AUCUN INTERTITRE (No ##).
   - Perspective Brief : Fournir UNIQUEMENT "What Happened". OMETTRE "Why It Matters" et "What To Watch Next".
   - Forces Structurelles : OMETTRE ENTIÈREMENT. Ne pas créer artificiellement de grille structurelle pour les faits divers ou brèves.

2. IF [DEEP_DIVE] (Dossier complexe, analyse sectorielle, grand format Tech/Culture/Sport/Politique/Économie) :
   - Format : 3 à 5 paragraphes développés.
   - Sous-titres (##) : OBLIGATOIRE d'utiliser des intertitres Markdown (##) adaptés au domaine (ex: "Tactique & Enjeux" pour le Sport, "Souveraineté & Code" pour la Tech, "Création & Patrimoine" pour la Culture).
   - Citations (> ) : OBLIGATOIRE d'inclure au moins une citation pertinente (> ).
   - Perspective Brief : OBLIGATOIRE d'inclure les 3 volets (What Happened, Why It Matters, What To Watch Next).
   - Forces Structurelles : OBLIGATOIRE de générer les grilles adaptées à la thématique.

[RÈGLE D'ADAPTATION PAR RUBRIQUE]
Le journal couvre TOUTES les rubriques (Politique, Économie, Société, Tech, Culture, Sports, Santé, International). Adapter le vocabulaire, le ton et les sous-titres à la rubrique réelle de l'article sans plaquer artificiellement du jargon géopolitique ou macroéconomique sur les sujets culturels, sportifs ou technologiques.

[EMBODIED STORYTELLING & STYLE]
- Toujours ouvrir l'article par une scène vivante, une situation humaine concrète ou un ancrage géographique fort (ex: "Dans les pépinières tech de Dakar...", "Sur le sable chaud de l'Arène...", "Dans les galeries de la Biennale...", "Dans les couloirs de l'Assemblée...").
- Bilinguisme d'excellence : La version anglaise doit impérativement lire comme une publication internationale de référence (anglais idiomatique, concis et élégant).`,
  editorialComments: `Respecter strictement la politique Zero-Cliché. Les chapeaux doivent obligatoirement inclure un ancrage géographique ou une personnalité nommée. Pour les STANDARD_NEWS, garder une longueur dynamique sans fioritures.`,
  forbiddenPhrases: [
    "game-changer",
    "pleine mutation",
    "monde en perpétuelle évolution",
    "plonger au cœur de",
    "il convient de noter que",
    "forces vives",
    "tournant historique"
  ],
  preferredTone: "analytical",
  exemplaryExample: {
    titleFr: "Port de Ndayane : Radiographie d'un mégaprojet logistique au cœur de l'ambition maritime ouest-africaine",
    excerptFr: "À 50 kilomètres au sud de Dakar, les engins de chantier dessinent les contours du futur poumon portuaire de l'Afrique de l'Ouest. Entre souveraineté logistique et retombées économiques, Perspective décrypte les enjeux d'un investissement de plus de 800 millions de dollars.",
    bodyFr: `## Une ambition logistique aux portes de Dakar

Sous le soleil zénithal de la Petite-Côte, le chantier du port en eau profonde de Ndayane s'impose comme le plus vaste projet d'infrastructures de la décennie au Sénégal. Conçu pour désengorger le Port Autonome de Dakar, ce complexe vise à accueillir les plus grands navires porte-conteneurs du commerce mondial.

> « Ndayane n'est pas seulement un port commercial, c'est le levier stratégique qui repositionne la presqu'île du Cap-Vert au centre des flux Atlantique-Sahel. »

## Impact économique et souveraineté sous-régionale

L'engorgement récurrent des quais dakarois imposait une alternative industrielle d'envergure. En connectant Ndayane aux grands corridors de transport de l'UEMOA, les autorités sénégalaises entendent réduire de 30% les délais de transit des marchandises vers le Mali et la sous-région.

## Ce qu'il faut surveiller

La livraison de la première phase opérationnelle est scrutée par les acteurs de la logistique internationale. Les prochains mois seront décisifs pour finaliser les raccordements autoroutiers et ferroviaires.`,
    titleEn: "Ndayane Deepwater Port: Inside West Africa's $800M Maritime Logistics Anchor",
    excerptEn: "Fifty kilometers south of Dakar, heavy machinery is shaping West Africa's next maritime hub. Perspective breaks down the economic leverage and regional trade dynamics behind Senegal's flagship infrastructure project.",
    bodyEn: `## Strategic Maritime Hub at Dakar's Doorstep

Along Senegal's Atlantic coastline, the construction of the Ndayane deepwater port represents the nation's largest infrastructure endeavor of the decade. Designed to relieve chronic congestion at the Port of Dakar, the terminal is built to accommodate ultra-large container vessels.

> "Ndayane is not merely a commercial harbor; it is the strategic pivot positioning the Cap-Vert peninsula at the center of Atlantic-Sahel trade flows."

## Economic Impact & Regional Integration

Connecting Ndayane directly to WAEMU trade corridors aims to shave up to 30% off transit times for landlocked neighbors like Mali.

## Outlook & Next Milestones

Phase-one operational trials will be closely monitored by global logistics operators. Road and rail intermodal links remain the critical path over the coming months.`
  },
  updatedAt: new Date().toISOString()
};

let currentGuidelinesInMemory: CustomEditorialGuidelines | null = null;

export function getEditorialGuidelines(): CustomEditorialGuidelines {
  if (currentGuidelinesInMemory) {
    return currentGuidelinesInMemory;
  }
  try {
    if (fs.existsSync(GUIDELINES_FILE_PATH)) {
      const content = fs.readFileSync(GUIDELINES_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      currentGuidelinesInMemory = { ...DEFAULT_EDITORIAL_GUIDELINES, ...parsed };
      return currentGuidelinesInMemory!;
    }
  } catch (err) {
    console.warn("[EDITORIAL GUIDELINES] Could not read file, using defaults:", err);
  }
  currentGuidelinesInMemory = { ...DEFAULT_EDITORIAL_GUIDELINES };
  return currentGuidelinesInMemory;
}

export function saveEditorialGuidelines(updated: Partial<CustomEditorialGuidelines>): CustomEditorialGuidelines {
  const existing = getEditorialGuidelines();
  const merged: CustomEditorialGuidelines = {
    ...existing,
    ...updated,
    updatedAt: new Date().toISOString()
  };
  currentGuidelinesInMemory = merged;
  try {
    const dir = path.dirname(GUIDELINES_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(GUIDELINES_FILE_PATH, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err) {
    console.error("[EDITORIAL GUIDELINES] Failed to save to disk:", err);
  }
  return merged;
}

export function resetEditorialGuidelinesToDefault(): CustomEditorialGuidelines {
  currentGuidelinesInMemory = { ...DEFAULT_EDITORIAL_GUIDELINES, updatedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(GUIDELINES_FILE_PATH, JSON.stringify(currentGuidelinesInMemory, null, 2), "utf-8");
  } catch (err) {
    console.error("[EDITORIAL GUIDELINES] Failed to reset on disk:", err);
  }
  return currentGuidelinesInMemory;
}

// Lazy-initialized Gemini Client
let geminiInstance: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "" || key === "undefined" || key === "null") {
    return null;
  }
  if (!geminiInstance) {
    geminiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiInstance;
}

// Lazy-initialized OpenAI Client
let openaiInstance: OpenAI | null = null;
export function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === "" || key === "undefined" || key === "null") {
    return null;
  }
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey: key });
  }
  return openaiInstance;
}

// Lazy-initialized Groq Client (using OpenAI SDK compatibility)
let groqInstance: OpenAI | null = null;
export function getGroqClient(): OpenAI | null {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.trim() === "" || key === "undefined" || key === "null") {
    return null;
  }
  if (!groqInstance) {
    groqInstance = new OpenAI({
      apiKey: key,
      baseURL: "https://api.groq.com/openai/v1"
    });
  }
  return groqInstance;
}

// Lazy-initialized OpenRouter Client
let openRouterInstance: OpenAI | null = null;
export function getOpenRouterClient(): OpenAI | null {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.trim() === "" || key === "undefined" || key === "null") {
    return null;
  }
  if (!openRouterInstance) {
    openRouterInstance = new OpenAI({
      apiKey: key,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://perspective.sn",
        "X-Title": "Perspective Group"
      }
    });
  }
  return openRouterInstance;
}

/**
 * Builds the Master Editorial System Prompt tailored to Perspective's signature storytelling style.
 * Integrates Admin Custom Guidelines, Feedback Comments & Exemplary Reference Examples.
 */
export function buildEditorialSystemPrompt(
  articleType: ArticleStyleType = "News",
  overrideGuidelines?: CustomEditorialGuidelines
): string {
  const guidelines = overrideGuidelines || getEditorialGuidelines();
  const isShortNews = articleType === "News" || articleType === "Explainer";

  let prompt = `You are the "Perspective Group Master Editorial Engine", an autonomous AI Chief Editor for Perspective Group, a major independent West African media organization and journal of record based in Dakar, Senegal.

CORE FUNCTION:
Ingest raw RSS feeds or notes, INTELLIGENTLY TRIAGE the information, and dynamically adapt your writing style, vocabulary, structure, and output fields based on the specific CATEGORY and nature of the news.

JOURNAL CATEGORIES & MULTI-THEMATIC SCOPE:
Perspective Group is NOT limited to geopolitics or macroeconomics. It is a full-spectrum journal covering:
- **Politique & Gouvernance**: Institutional decisions, public policy, civic debate, legislative affairs.
- **Économie & Finances**: Markets, trade, investment, industry, inflation, local enterprise.
- **Société & Transports**: Community life, education, urban mobility, social change, daily civic developments.
- **Tech & Innovation**: Startups, software, AI, telecom, digital transformation, fintech, tech infrastructure.
- **Culture, Arts & People**: Cinema, music, literature, heritage, design, creative economy, cultural diplomacy.
- **Sports & L'Arène**: Senegalese Lamb wrestling, basketball, football, athletic performance, tactical breakdowns, fan culture.
- **Santé & Environnement**: Public health, medical innovation, climate resilience, ecological transition.
- **International & Afrique**: Global affairs, regional cooperation, diplomacy, South-South alliances.

CATEGORY-SPECIFIC WRITING STYLE ADAPTATION:
- **Tech & Innovation**: Use forward-looking, crisp, technical-yet-accessible prose focusing on innovation dynamics and digital impact.
- **Sports & L'Arène**: Use energetic, vivid, field-grounded storytelling highlighting athletic prowess, strategic matchups, and cultural fervor.
- **Culture & Arts**: Use evocative, expressive, artistic prose capturing creative vision, heritage, and human emotion.
- **Santé & Environnement**: Focus on community well-being, scientific facts, public policy, and environmental stewardship.
- **Société & Transports**: Focus on lived human experience, civic perspectives, and social transformations.
- **Politique & Économie**: Maintain sharp, balanced policy analysis and economic rigor.

TRIAGE LOGIC:
Before writing, classify the input into one of two categories:
1. [STANDARD_NEWS]: Factual, localized, or single-event reporting (e.g., match results, local announcements, tech launch, brief press release).
2. [DEEP_DIVE]: Complex multi-layered reporting requiring thorough analysis (e.g., policy reforms, major tech shifts, cultural retrospectives, tournament breakdowns, economic agreements).

DYNAMIC WRITING RULES:
IF [STANDARD_NEWS]:
- Format: 2 to 3 short paragraphs of continuous text.
- Subtitles: DO NOT USE ANY SUBTITLES (No ## in the Markdown body).
- Perspective Brief: Provide ONLY "What Happened". OMIT "Why It Matters" and "What To Watch Next".
- Structural Forces: OMIT ENTIRELY. Do not invent socio-economic impacts for minor news.

IF [DEEP_DIVE]:
- Format: 3 to 5 paragraphs.
- Subtitles: MUST use Markdown subtitles (##) tailored to the category (e.g., "Tactique & Enjeux" for Sports, "Code & Souveraineté" for Tech, "Patrimoine & Création" for Culture).
- Quotes: MUST include at least one relevant quote (real or highly plausible context) formatted as blockquote (> ).
- Perspective Brief: MUST include all 3 fields (What Happened, Why It Matters, What To Watch Next).
- Structural Forces: MUST generate the analytical forces relevant to the article.

UNIVERSAL GUIDELINES:
- Embodied Storytelling: Always open the article with a vivid scene, a concrete human situation, or a geographic anchor (e.g., "In Dakar's tech hubs...", "On the sands of the Arena...", "At the National Theatre...", "In the hallways of the Assembly...").
- Bilingual Output: All final output MUST be perfectly bilingual. You MUST provide BOTH a French and an English version for the title, excerpt, body, and all structural fields.
- Zero-Cliché Policy: NEVER use the following banned words: "game-changer", "pleine mutation", "monde en perpétuelle évolution", "plonger au cœur de", "il convient de noter que", "forces vives", "tournant historique".`;

  // Inject Admin Custom Guidelines
  if (guidelines.customDirectives && guidelines.customDirectives.trim()) {
    prompt += `\n\nADDITIONAL ADMIN DIRECTIVES & STYLE RULES:\n${guidelines.customDirectives.trim()}`;
  }

  // Inject Admin Editorial Feedback Comments
  if (guidelines.editorialComments && guidelines.editorialComments.trim()) {
    prompt += `\n\nCHIEF EDITOR CORRECTION NOTES (STRICTLY RESPECT THESE CORRECTIONS):\n${guidelines.editorialComments.trim()}`;
  }

  // Inject Forbidden Phrases / Clichés
  if (guidelines.forbiddenPhrases && guidelines.forbiddenPhrases.length > 0) {
    prompt += `\n\nFORBIDDEN WORDS & BANNED CLICHÉS (NEVER USE ANY OF THESE):\n${guidelines.forbiddenPhrases.map(p => `- "${p}"`).join("\n")}`;
  }

  // Inject Exemplary Gold Standard Reference Article Example
  if (guidelines.exemplaryExample && (guidelines.exemplaryExample.titleFr || guidelines.exemplaryExample.bodyFr)) {
    prompt += `\n\nGOLD-STANDARD EXEMPLARY REFERENCE ARTICLE:\n`;
    if (guidelines.exemplaryExample.titleFr) {
      prompt += `[EXAMPLE HEADLINE (FR)]: ${guidelines.exemplaryExample.titleFr}\n`;
    }
    if (guidelines.exemplaryExample.excerptFr) {
      prompt += `[EXAMPLE EXCERPT (FR)]: ${guidelines.exemplaryExample.excerptFr}\n`;
    }
    if (guidelines.exemplaryExample.bodyFr) {
      prompt += `[EXAMPLE BODY SAMPLE (FR)]:\n${guidelines.exemplaryExample.bodyFr}\n`;
    }
  }

  prompt += `\n\nOUTPUT FORMAT:
Return STRICT, VALID JSON ONLY conforming to this schema:
{
  "detectedCategory": "STANDARD_NEWS" | "DEEP_DIVE",
  "title": {
    "fr": "Titre percutant en français (Punchy title)",
    "en": "Punchy title in English (FT style)"
  },
  "excerpt": {
    "fr": "Extrait court de 2 phrases max incluant un lieu ou une personne spécifique.",
    "en": "Short excerpt (max 2 sentences) including specific location/person."
  },
  "body": {
    "fr": "Corps de l'article en français respectant les règles d'écritures dynamiques selon STANDARD_NEWS ou DEEP_DIVE.",
    "en": "Article body in English adhering to dynamic writing rules (Financial Times style)."
  },
  "category": "Politique|Économie|Société|International|L'Arène|Dossiers|Flash Info|Météo & Maritime|Culture & People|Tech & Innovation",
  "type": "${articleType}",
  "author": "Rédaction Perspective",
  "readingTime": ${isShortNews ? 3 : 6},
  "featuredImage": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
  "tags": ["Sénégal", "Afrique de l'Ouest", "Perspective"],
  "perspectiveBrief": {
    "whatHappened": {
      "fr": "Synthèse de ce qu'il s'est passé (max 30 mots).",
      "en": "Synthesis of what happened (max 30 words)."
    },
    "whyItMatters": {
      "fr": "Pourquoi cela compte (max 30 mots). [OMIT IF STANDARD_NEWS]",
      "en": "Why it matters (max 30 words). [OMIT IF STANDARD_NEWS]"
    },
    "whatToWatchNext": {
      "fr": "À surveiller (max 30 mots). [OMIT IF STANDARD_NEWS]",
      "en": "What to watch next (max 30 words). [OMIT IF STANDARD_NEWS]"
    }
  },
  "structuralForces": {
    "political": {
      "fr": "Impact politique [OMIT IF STANDARD_NEWS]",
      "en": "Political impact [OMIT IF STANDARD_NEWS]"
    },
    "economic": {
      "fr": "Impact économique [OMIT IF STANDARD_NEWS]",
      "en": "Economic impact [OMIT IF STANDARD_NEWS]"
    },
    "social": {
      "fr": "Impact social [OMIT IF STANDARD_NEWS]",
      "en": "Social impact [OMIT IF STANDARD_NEWS]"
    },
    "international": {
      "fr": "Impact international [OMIT IF STANDARD_NEWS]",
      "en": "International impact [OMIT IF STANDARD_NEWS]"
    }
  }
}`;

  return prompt;
}

/**
 * Execute Generation via Gemini SDK
 */
export async function generateWithGemini(userPrompt: string, systemInstruction: string): Promise<any> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  // Current production model cascade for fast inference and strict JSON response
  const models = ["gemini-2.5-flash", "gemini-2.5-pro"];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const apiCall = ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.25,
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini timeout on ${model} (25s)`)), 25000)
      );

      const response = await Promise.race([apiCall, timeoutPromise]);
      const text = response.text?.trim();

      if (!text) {
        throw new Error(`Empty response from Gemini model ${model}`);
      }

      const parsed = JSON.parse(text);
      if (parsed && (parsed.title?.fr || parsed.title?.en || parsed.title)) {
        return { parsed, modelUsed: `Gemini (${model})` };
      }
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || String(err);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
        console.warn(`[GEMINI ENGINE NOTICE] Quota limit hit on ${model}. Trying next model/engine...`);
      } else {
        console.warn(`[GEMINI ENGINE NOTICE] Model ${model} failed (${msg.slice(0, 100)}). Trying fallback...`);
      }
    }
  }

  throw lastErr || new Error("All Gemini models exhausted or rate-limited.");
}

/**
 * Execute Generation via OpenAI SDK
 */
export async function generateWithOpenAI(userPrompt: string, systemInstruction: string): Promise<any> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  // Models to try
  const models = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.25,
      });

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error(`Empty response from OpenAI model ${model}`);
      }

      const parsed = JSON.parse(text);
      if (parsed && (parsed.title?.fr || parsed.title?.en || parsed.title)) {
        return { parsed, modelUsed: `OpenAI (${model})` };
      }
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || String(err);
      if (msg.includes("429") || msg.includes("quota")) {
        console.warn(`[OPENAI ENGINE NOTICE] Quota limit hit on ${model}. Trying next model/engine...`);
      } else {
        console.warn(`[OPENAI ENGINE NOTICE] Model ${model} failed (${msg.slice(0, 100)}). Trying fallback...`);
      }
    }
  }

  throw lastErr || new Error("All OpenAI models exhausted or rate-limited.");
}

/**
 * Execute Generation via Groq API (High-speed Llama 3 models)
 */
export async function generateWithGroq(userPrompt: string, systemInstruction: string): Promise<any> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.25,
      });

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error(`Empty response from Groq model ${model}`);
      }

      const parsed = JSON.parse(text);
      if (parsed && (parsed.title?.fr || parsed.title?.en || parsed.title)) {
        return { parsed, modelUsed: `Groq (${model})` };
      }
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || String(err);
      if (msg.includes("429") || msg.includes("rate_limit")) {
        console.warn(`[GROQ ENGINE NOTICE] Rate limit hit on ${model}. Trying next Groq model...`);
      } else {
        console.warn(`[GROQ ENGINE NOTICE] Model ${model} notice (${msg.slice(0, 100)}). Trying fallback...`);
      }
    }
  }

  throw lastErr || new Error("All Groq models exhausted or rate-limited.");
}

/**
 * Execute Generation via OpenRouter API (Claude 3.5 Sonnet, DeepSeek R1, Llama 3.3, Gemini 2.5)
 */
export async function generateWithOpenRouter(userPrompt: string, systemInstruction: string): Promise<any> {
  const openRouter = getOpenRouterClient();
  if (!openRouter) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  const models = [
    "anthropic/claude-3.5-sonnet",
    "deepseek/deepseek-r1",
    "meta-llama/llama-3.3-70b-instruct",
    "google/gemini-2.5-flash",
    "openai/gpt-4o-mini"
  ];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const completion = await openRouter.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.25,
      });

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error(`Empty response from OpenRouter model ${model}`);
      }

      const parsed = JSON.parse(text);
      if (parsed && (parsed.title?.fr || parsed.title?.en || parsed.title)) {
        return { parsed, modelUsed: `OpenRouter (${model})` };
      }
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || String(err);
      console.warn(`[OPENROUTER ENGINE NOTICE] Model ${model} notice (${msg.slice(0, 100)}). Trying fallback...`);
    }
  }

  throw lastErr || new Error("All OpenRouter models exhausted or unavailable.");
}

/**
 * Validates and enriches parsed article data ensuring high storytelling coherence and zero blind spots.
 */
export function sanitizeAndEnrichArticle(rawJson: any, sourceItem: any, fallbackCategory = "Économie", articleType: ArticleStyleType = "News"): any {
  const todayIso = new Date().toISOString().split("T")[0];
  const itemTitle = typeof sourceItem === "string" ? sourceItem : (sourceItem?.title || "Actualité Ouest-Africaine");
  const itemDesc = typeof sourceItem === "object" ? (sourceItem.description || sourceItem.body || sourceItem.content || "") : "";

  // Title validation & bilingual pairing
  let titleFr = rawJson.title?.fr || (typeof rawJson.title === "string" ? rawJson.title : "") || itemTitle;
  let titleEn = rawJson.title?.en || (typeof rawJson.title === "string" ? rawJson.title : "") || itemTitle;
  if (!titleFr || titleFr.trim() === "") titleFr = itemTitle;
  if (!titleEn || titleEn.trim() === "") titleEn = titleFr;

  // Excerpt validation & storytelling hook
  let excerptFr = rawJson.excerpt?.fr || (typeof rawJson.excerpt === "string" ? rawJson.excerpt : "") || itemDesc.slice(0, 200);
  let excerptEn = rawJson.excerpt?.en || (typeof rawJson.excerpt === "string" ? rawJson.excerpt : "") || itemDesc.slice(0, 200);
  if (!excerptFr || excerptFr.trim() === "") {
    excerptFr = `À Dakar et dans la sous-région, l'actualité relative à « ${titleFr} » suscite un vif intérêt. La rédaction de Perspective en analyse les ressorts clés.`;
  }
  if (!excerptEn || excerptEn.trim() === "") {
    excerptEn = `In Dakar and across the wider region, developments regarding "${titleEn}" are drawing significant attention. Perspective analyzes the core dynamics.`;
  }

  // Markdown Body validation
  let bodyFr = rawJson.body?.fr || (typeof rawJson.body === "string" ? rawJson.body : "");
  let bodyEn = rawJson.body?.en || (typeof rawJson.body === "string" ? rawJson.body : "");

  if (!bodyFr || bodyFr.length < 60) {
    bodyFr = `${itemDesc || excerptFr}\n\nCette actualité met en lumière des évolutions significatives en Afrique de l'Ouest. Les équipes de la rédaction suit l'évolution de ce dossier.`;
  }
  if (!bodyEn || bodyEn.length < 60) {
    bodyEn = `${itemDesc || excerptEn}\n\nThis development highlights notable operational shifts across West Africa. Perspective editorial desk continues to follow progress.`;
  }

  // Slug generation
  const slug = titleFr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") + "-" + Date.now().toString().slice(-4);

  const isStandardNews = rawJson.detectedCategory === "STANDARD_NEWS" || (articleType === "News" && !rawJson.structuralForces);

  // Perspective Brief
  let perspectiveBrief: any = {
    whatHappened: {
      fr: rawJson.perspectiveBrief?.whatHappened?.fr || excerptFr.slice(0, 150),
      en: rawJson.perspectiveBrief?.whatHappened?.en || excerptEn.slice(0, 150)
    }
  };

  if (!isStandardNews || rawJson.perspectiveBrief?.whyItMatters) {
    perspectiveBrief.whyItMatters = {
      fr: rawJson.perspectiveBrief?.whyItMatters?.fr || "Impact direct sur les équilibres politiques, économiques et citoyens en Afrique de l'Ouest.",
      en: rawJson.perspectiveBrief?.whyItMatters?.en || "Direct impact on political, economic, and civic dynamics across West Africa."
    };
  }
  if (!isStandardNews || rawJson.perspectiveBrief?.whatToWatchNext) {
    perspectiveBrief.whatToWatchNext = {
      fr: rawJson.perspectiveBrief?.whatToWatchNext?.fr || "Surveiller les annonces officielles, les réactions du secteur et les prochaines échéances institutionnelles.",
      en: rawJson.perspectiveBrief?.whatToWatchNext?.en || "Monitor official statements, industry responses, and upcoming institutional milestones."
    };
  }

  // Timeline
  let timeline = Array.isArray(rawJson.timeline) && rawJson.timeline.length > 0 ? rawJson.timeline : [
    {
      date: todayIso,
      description: {
        fr: `Développement majeur documenté par la Rédaction Perspective sur : ${titleFr}`,
        en: `Major development documented by Perspective Editorial Desk on: ${titleEn}`
      }
    }
  ];

  // Key Actors
  let keyActors = Array.isArray(rawJson.keyActors) && rawJson.keyActors.length > 0 ? rawJson.keyActors : [
    {
      name: "Rédaction Perspective",
      role: "Journal de Référence",
      significance: {
        fr: "Veille journalistique et décryptage des dynamiques régionales.",
        en: "Journalistic intelligence and regional dynamics monitoring."
      }
    }
  ];

  // Structural Forces
  let structuralForces = rawJson.structuralForces;
  if (!structuralForces && !isStandardNews) {
    structuralForces = {
      political: {
        fr: "Analyse des dynamiques de gouvernance et des politiques publiques.",
        en: "Analysis of governance dynamics and public policy frameworks."
      },
      economic: {
        fr: "Évaluation de la valeur ajoutée, des flux commerciaux et des marchés.",
        en: "Assessment of value addition, trade flows, and markets."
      },
      social: {
        fr: "Mesure de l'impact direct sur les populations et les acteurs locaux.",
        en: "Measurement of direct impact on local communities and citizens."
      },
      international: {
        fr: "Portée sous-régionale CEDEAO/UEMOA et résonance géopolitique.",
        en: "ECOWAS/WAEMU sub-regional reach and geopolitical resonance."
      }
    };
  }

  const readingTime = typeof rawJson.readingTime === "number" && rawJson.readingTime > 0 
    ? rawJson.readingTime 
    : (articleType === "News" ? 3 : 6);

  return {
    title: { fr: titleFr, en: titleEn },
    excerpt: { fr: excerptFr, en: excerptEn },
    body: { fr: bodyFr, en: bodyEn },
    slug,
    category: rawJson.category || fallbackCategory || "Économie",
    type: rawJson.type || articleType,
    author: rawJson.author || "Rédaction Perspective",
    date: new Date().toISOString(),
    readingTime,
    tags: Array.isArray(rawJson.tags) && rawJson.tags.length > 0 ? rawJson.tags : ["Sénégal", "Actualité", "Perspective"],
    featuredImage: rawJson.featuredImage || rawJson.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
    perspectiveBrief,
    timeline,
    keyActors,
    structuralForces
  };
}

/**
 * Primary Master Orchestrator for Writing Perspective Articles
 * Supports Gemini and OpenAI with Automatic Failover and Local Synthesis Safeguard
 */
export async function orchestrateDualEngineArticleGeneration(options: GenerateArticleOptions): Promise<DualEngineResult> {
  const {
    rssItem,
    prompt,
    category = "Économie",
    type = "News",
    preferredEngine = "auto",
    feedUrl = "",
    customGuidelinesOverride
  } = options;

  const systemInstruction = buildEditorialSystemPrompt(type, customGuidelinesOverride);
  const contextData = typeof rssItem === "object" ? JSON.stringify(rssItem) : (rssItem || prompt || "Actualité Ouest-Africaine");
  const userPrompt = `SOURCE STORY CONTEXT:
${contextData}
${prompt ? `\nADDITIONAL EDITORIAL INSTRUCTION: ${prompt}` : ""}
${category ? `\nTARGET CATEGORY: ${category}` : ""}
${feedUrl ? `\nSOURCE FEED: ${feedUrl}` : ""}

Please craft the complete bilingual storytelling article in strict JSON matching the schema.`;

  let primary = preferredEngine;
  const geminiAvailable = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "";
  const groqAvailable = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "";
  const openRouterAvailable = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== "";
  const openAiAvailable = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "";

  if (primary === "auto") {
    primary = geminiAvailable ? "gemini" : (groqAvailable ? "groq" : (openRouterAvailable ? "openrouter" : (openAiAvailable ? "openai" : "gemini")));
  }

  let failoverTriggered = false;
  let failoverReason = "";
  let rawJson: any = null;
  let engineUsed = "";

  // Helper for sequential execution
  const tryGroq = async (): Promise<boolean> => {
    if (!groqAvailable) return false;
    try {
      const res = await generateWithGroq(userPrompt, systemInstruction);
      rawJson = res.parsed;
      engineUsed = engineUsed ? `${res.modelUsed} (Failover)` : res.modelUsed;
      return true;
    } catch (err: any) {
      failoverReason += ` | Groq: ${err?.message || err}`;
      return false;
    }
  };

  const tryGemini = async (): Promise<boolean> => {
    if (!geminiAvailable) return false;
    try {
      const res = await generateWithGemini(userPrompt, systemInstruction);
      rawJson = res.parsed;
      engineUsed = engineUsed ? `${res.modelUsed} (Failover)` : res.modelUsed;
      return true;
    } catch (err: any) {
      failoverReason += ` | Gemini: ${err?.message || err}`;
      return false;
    }
  };

  const tryOpenRouter = async (): Promise<boolean> => {
    if (!openRouterAvailable) return false;
    try {
      const res = await generateWithOpenRouter(userPrompt, systemInstruction);
      rawJson = res.parsed;
      engineUsed = engineUsed ? `${res.modelUsed} (Failover)` : res.modelUsed;
      return true;
    } catch (err: any) {
      failoverReason += ` | OpenRouter: ${err?.message || err}`;
      return false;
    }
  };

  const tryOpenAI = async (): Promise<boolean> => {
    if (!openAiAvailable) return false;
    try {
      const res = await generateWithOpenAI(userPrompt, systemInstruction);
      rawJson = res.parsed;
      engineUsed = engineUsed ? `${res.modelUsed} (Failover)` : res.modelUsed;
      return true;
    } catch (err: any) {
      failoverReason += ` | OpenAI: ${err?.message || err}`;
      return false;
    }
  };

  // 1. Try Selected Primary Engine
  if (primary === "groq" && groqAvailable) {
    if (!(await tryGroq())) {
      failoverTriggered = true;
      if (!(await tryGemini())) {
        if (!(await tryOpenRouter())) {
          await tryOpenAI();
        }
      }
    }
  } else if (primary === "openrouter" && openRouterAvailable) {
    if (!(await tryOpenRouter())) {
      failoverTriggered = true;
      if (!(await tryGroq())) {
        if (!(await tryGemini())) {
          await tryOpenAI();
        }
      }
    }
  } else if (primary === "gemini" && geminiAvailable) {
    if (!(await tryGemini())) {
      failoverTriggered = true;
      if (!(await tryGroq())) {
        if (!(await tryOpenRouter())) {
          await tryOpenAI();
        }
      }
    }
  } else if (primary === "openai" && openAiAvailable) {
    if (!(await tryOpenAI())) {
      failoverTriggered = true;
      if (!(await tryGroq())) {
        if (!(await tryGemini())) {
          await tryOpenRouter();
        }
      }
    }
  } else {
    // Cascade fallback: Gemini -> Groq -> OpenRouter -> OpenAI
    if (!(await tryGemini())) {
      if (!(await tryGroq())) {
        if (!(await tryOpenRouter())) {
          await tryOpenAI();
        }
      }
    }
  }

  // Smart Local Synthesis Fallback if both cloud AI APIs hit rate/quota limits or are unconfigured
  if (!rawJson) {
    const fallbackItem = rssItem || prompt || "Actualité Ouest-Africaine";
    const itemTitle = typeof fallbackItem === "object" ? (fallbackItem.title || "Actualité Ouest-Africaine") : String(fallbackItem);
    const itemDesc = typeof fallbackItem === "object" ? (fallbackItem.description || fallbackItem.content || fallbackItem.body || "") : "";

    const isDeep = type === "Deep Dive" || type === "Analysis" || itemTitle.length > 65 || itemDesc.length > 350;
    const categoryName = category || (typeof fallbackItem === "object" && fallbackItem.category) || "Économie";

    rawJson = {
      detectedCategory: isDeep ? "DEEP_DIVE" : "STANDARD_NEWS",
      title: {
        fr: itemTitle,
        en: itemTitle
      },
      excerpt: {
        fr: itemDesc ? itemDesc.slice(0, 180) + "..." : `À Dakar et dans la sous-région, l'actualité relative à « ${itemTitle} » fait l'objet d'un décryptage approfondi par la rédaction.`,
        en: itemDesc ? itemDesc.slice(0, 180) + "..." : `In Dakar and across West Africa, developments regarding "${itemTitle}" are under close analytical review by Perspective editorial desk.`
      },
      body: {
        fr: isDeep 
          ? `## Contexte & Explication des Faits\n\n${itemDesc || itemTitle}\n\n> « La sous-région ouest-africaine traverse une période charnière où les arbitrages institutionnels et économiques façonnent directement l'avenir des territoires. »\n\n## Impact Économique & Portée Régionale\n\nLes enjeux stratégiques liés à ce dossier soulignent la nécessité d'une lecture claire des dynamiques à l'œuvre entre Dakar, la zone UEMOA et la CEDEAO.\n\n## Perspectives & Prochaines Échéances\n\nPerspective poursuit sa couverture journalistique pour éclairer les développements à venir et les prochaines échéances décisionnelles.`
          : `${itemDesc || itemTitle}\n\nCette actualité met en lumière des ajustements significatifs en Afrique de l'Ouest. La rédaction de Perspective en suit l'évolution.`,
        en: isDeep
          ? `## Context & Core Dynamics\n\n${itemDesc || itemTitle}\n\n> "West Africa is navigating a decisive juncture where institutional and economic policy choices directly impact regional development."\n\n## Economic Impact & Regional Scope\n\nThe strategic stakes surrounding this event highlight the importance of clear analysis across Dakar, WAEMU, and ECOWAS networks.\n\n## Outlook & Key Milestones\n\nPerspective maintains active coverage to report on forthcoming policy developments and key upcoming milestones.`
          : `${itemDesc || itemTitle}\n\nThis headline reflects notable operational adjustments in West Africa. Perspective editorial desk continues to monitor developments.`
      },
      category: categoryName,
      type: type,
      author: "Rédaction Perspective",
      perspectiveBrief: {
        whatHappened: {
          fr: (itemDesc || itemTitle).slice(0, 150),
          en: (itemDesc || itemTitle).slice(0, 150)
        },
        whyItMatters: isDeep ? {
          fr: "Impact direct sur la gouvernance, les flux économiques et la stabilité en Afrique de l'Ouest.",
          en: "Direct impact on governance, economic flows, and stability across West Africa."
        } : undefined,
        whatToWatchNext: isDeep ? {
          fr: "Suivre les annonces institutionnelles et les prochaines décisions officielles.",
          en: "Monitor official statements and upcoming institutional decisions."
        } : undefined
      },
      structuralForces: isDeep ? {
        political: {
          fr: "Évaluation de la gouvernance et des arbitrages publics.",
          en: "Evaluation of public policy frameworks and governance."
        },
        economic: {
          fr: "Analyse des flux financiers, commerciaux et d'investissement.",
          en: "Analysis of financial, trade, and investment flows."
        },
        social: {
          fr: "Impact sur les populations locales, l'emploi et le cadre de vie.",
          en: "Impact on local communities, employment, and living standards."
        },
        international: {
          fr: "Résonance dans l'espace UEMOA/CEDEAO et à l'international.",
          en: "WAEMU/ECOWAS sub-regional and international resonance."
        }
      } : undefined
    };

    engineUsed = failoverTriggered 
      ? `Perspective Local Synthesis (Quota Safeguard)`
      : "Perspective Local Synthesis Engine";
  }

  const enrichedArticle = sanitizeAndEnrichArticle(rawJson, rssItem || prompt, category, type);

  return {
    success: true,
    article: enrichedArticle,
    engineUsed,
    failoverTriggered,
    failoverReason: failoverTriggered ? failoverReason : undefined
  };
}
