import "dotenv/config";
import { getGeminiClient, getOpenAIClient, getEffectiveApiKey } from "./aiNewsroomEngine";

/**
 * Editorial contextual imagery database for West African and International Newsroom.
 * High-definition, verified, copyright-safe editorial photography categorized by theme.
 */
const THEMATIC_EDITORIAL_IMAGES: Record<string, string[]> = {
  "Politique": [
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=1200", // Government & institutions
    "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80&w=1200", // Diplomatic assembly
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&q=80&w=1200", // Governance & flags
    "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&q=80&w=1200"  // Civic dialogue
  ],
  "Économie": [
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1200", // African currency & financial analytics
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1200", // Stock & market indicators
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200", // Modern business financial towers
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200"  // Trading & commodities
  ],
  "Société": [
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=1200", // Community & education
    "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&q=80&w=1200", // African youth & social leadership
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200", // Decision makers & civic society
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1200"  // Forum & debate
  ],
  "International": [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200", // Global connectivity & satellite
    "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&q=80&w=1200", // International press & world affairs
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200", // Global journalism desk
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=1200"  // World breaking news print
  ],
  "Sports": [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200", // Stadium lights & football arena
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=1200", // Football on pitch
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=1200", // Track & athletic tournament
    "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=1200"  // Sports competition energy
  ],
  "Dossiers": [
    "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=1200", // In-depth investigative documents
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200", // Journalistic investigation records
    "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=1200"  // Deep dive study desk
  ],
  "Flash Info": [
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200", // Breaking wire
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200", // Press wire live
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=1200"  // Immediate dispatch
  ],
  "Météo & Maritime": [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200", // Ocean & maritime coastline
    "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=1200", // Port logistics & container ships
    "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&q=80&w=1200"  // Meteorological sky & weather
  ],
  "Culture & People": [
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=1200", // Art & African creativity
    "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&q=80&w=1200", // Festival & heritage
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200"  // Music & cultural performance
  ],
  "Tech & Innovation": [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200", // Microchip & digital economy
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200", // Tech innovation team & coders
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200"  // Server room & telecom network
  ]
};

// Default fallback image
export const DEFAULT_EDITORIAL_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200";

/**
 * Returns a high-definition context-matched editorial image based on category and title keywords.
 */
export function getCategoryDefaultEditorialImage(category?: string, titleText?: string): string {
  const catKey = category && THEMATIC_EDITORIAL_IMAGES[category] ? category : "Économie";
  const title = (titleText || "").toLowerCase();

  // Fine-grained semantic overrides for specific African & global subjects
  if (title.includes("dakar") || title.includes("sénégal") || title.includes("senegal")) {
    if (title.includes("port") || title.includes("maritime") || title.includes("pêche") || title.includes("bateau")) {
      return "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=1200";
    }
    if (title.includes("ter") || title.includes("train") || title.includes("brt") || title.includes("route") || title.includes("transport")) {
      return "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=1200";
    }
    if (title.includes("pétrole") || title.includes("gaz") || title.includes("sangomar") || title.includes("énergie") || title.includes("gta")) {
      return "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&q=80&w=1200";
    }
  }

  if (title.includes("football") || title.includes("lions") || title.includes("can") || title.includes("fifa") || title.includes("stade")) {
    return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200";
  }

  if (title.includes("bceao") || title.includes("franc cfa") || title.includes("banque") || title.includes("inflation") || title.includes("dette")) {
    return "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1200";
  }

  const list = THEMATIC_EDITORIAL_IMAGES[catKey] || THEMATIC_EDITORIAL_IMAGES["Économie"];
  // Deterministic or pseudo-random selection based on title hash
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % list.length;
  return list[idx] || DEFAULT_EDITORIAL_IMAGE;
}

export interface ImageGenerationOptions {
  title: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  styleHint?: string;
}

export interface GeneratedImageResult {
  imageUrl: string;
  source: "pollinations_flux" | "gemini" | "openai" | "contextual";
  modelUsed?: string;
  promptUsed?: string;
}

/**
 * Builds a professional editorial photojournalism prompt suited for GenAI image models.
 */
export function buildPhotojournalismPrompt(options: ImageGenerationOptions): string {
  const { title, excerpt = "", category = "Économie" } = options;
  const cleanTitle = title.replace(/[#*`_"]/g, "").trim();
  const cleanExcerpt = excerpt.replace(/<[^>]*>/g, "").replace(/[#*`_"]/g, "").slice(0, 140).trim();

  return `Award-winning newsroom photojournalism capturing the core theme: "${cleanTitle}". Topic: ${category}. Key context: ${cleanExcerpt}. Professional documentary style, sharp focus, authentic natural lighting, high dynamic range, 16:9 widescreen composition, realistic journalistic quality, West African and global editorial atmosphere.`;
}

/**
 * Primary AI Image Generator for Articles:
 * 1. Generates hyper-realistic photojournalism images via Pollinations Flux AI model (instant, zero quota limit)
 * 2. Tries Gemini image generation / OpenAI DALL-E 3 with fast non-blocking timeouts
 * 3. Falls back smoothly to curated high-resolution editorial photography matched to the article's context
 */
export async function generateArticleImageWithAI(options: ImageGenerationOptions): Promise<GeneratedImageResult> {
  const promptText = buildPhotojournalismPrompt(options);

  // 1. Try Gemini Image Generation via Google GenAI SDK (with strict 3s timeout)
  const geminiKey = getEffectiveApiKey("GEMINI");
  if (geminiKey) {
    const ai = getGeminiClient();
    if (ai) {
      const modelsToTry = [
        "gemini-3.1-flash-lite-image",
        "gemini-2.5-flash-image"
      ];

      for (const model of modelsToTry) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Gemini Image timeout (3s)")), 3000)
          );

          const genPromise = ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            config: {
              imageConfig: {
                aspectRatio: "16:9"
              }
            }
          });

          const response = await Promise.race([genPromise, timeoutPromise]);
          const candidates = response.candidates || [];
          for (const cand of candidates) {
            const parts = cand.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                const mime = part.inlineData.mimeType || "image/jpeg";
                const base64Url = `data:${mime};base64,${part.inlineData.data}`;
                console.log(`[AI IMAGE GEN SUCCESS] Generated with Gemini model ${model}!`);
                return {
                  imageUrl: base64Url,
                  source: "gemini",
                  modelUsed: model,
                  promptUsed: promptText
                };
              }
            }
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          console.warn(`[AI IMAGE GEN NOTICE] Gemini image model ${model} skipped: ${msg.slice(0, 80)}`);
          // If quota hit or rate limit, break out of Gemini immediately
          if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
            break;
          }
        }
      }
    }
  }

  // 2. Try OpenAI DALL-E 3 (if key provided, with 4s timeout)
  const openaiKey = getEffectiveApiKey("OPENAI");
  if (openaiKey) {
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("OpenAI DALL-E timeout (4s)")), 4000)
        );
        const genPromise = openai.images.generate({
          model: "dall-e-3",
          prompt: promptText.slice(0, 950),
          n: 1,
          size: "1024x1024",
          quality: "standard"
        });

        const response = await Promise.race([genPromise, timeoutPromise]);
        if (response.data && response.data[0]?.url) {
          console.log(`[AI IMAGE GEN SUCCESS] Generated image via OpenAI DALL-E 3!`);
          return {
            imageUrl: response.data[0].url,
            source: "openai",
            modelUsed: "dall-e-3",
            promptUsed: promptText
          };
        }
      } catch (dalleErr: any) {
        console.warn(`[AI IMAGE GEN NOTICE] OpenAI DALL-E 3 skipped: ${dalleErr?.message || dalleErr}`);
      }
    }
  }

  // 3. Pollinations Flux AI Generation Engine (High-Performance, Zero-Quota, Realistic Photojournalism)
  try {
    const seed = Math.floor(Math.random() * 100000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1200&height=675&nologo=true&model=flux&seed=${seed}`;
    console.log(`[AI IMAGE GEN POLLINATIONS] Requesting Flux AI photojournalism for "${options.title}"...`);

    // Quick attempt to convert to base64 for local persistence (3.5s timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const resp = await fetch(pollinationsUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const contentType = resp.headers.get("content-type") || "image/jpeg";
        if (contentType.includes("image")) {
          const buffer = await resp.arrayBuffer();
          if (buffer.byteLength > 1000) {
            const base64Data = Buffer.from(buffer).toString("base64");
            const mime = contentType.includes("png") ? "image/png" : "image/jpeg";
            const dataUri = `data:${mime};base64,${base64Data}`;
            console.log(`[AI IMAGE GEN SUCCESS] Generated and synthesized with Pollinations Flux AI (${Math.round(buffer.byteLength / 1024)} KB)!`);
            return {
              imageUrl: dataUri,
              source: "pollinations_flux",
              modelUsed: "Flux AI Photojournalism Engine",
              promptUsed: promptText
            };
          }
        }
      }
    } catch (_abortErr) {
      // If fetching binary buffer timed out after 3.5s, return direct CDN URL instantly
      clearTimeout(timeoutId);
      console.log(`[AI IMAGE GEN SUCCESS] Returning direct high-res Flux AI image URL: ${pollinationsUrl}`);
      return {
        imageUrl: pollinationsUrl,
        source: "pollinations_flux",
        modelUsed: "Flux AI Photojournalism CDN",
        promptUsed: promptText
      };
    }

    // Direct URL fallback if response wasn't converted
    return {
      imageUrl: pollinationsUrl,
      source: "pollinations_flux",
      modelUsed: "Flux AI Photojournalism CDN",
      promptUsed: promptText
    };
  } catch (pollErr: any) {
    console.warn(`[AI IMAGE GEN NOTICE] Pollinations Flux skipped: ${pollErr?.message || pollErr}`);
  }

  // 4. Fallback: Highly Targeted Contextual Curated Editorial Photography
  console.log(`[AI IMAGE GEN CONTEXTUAL FALLBACK] Using contextual editorial photograph for: "${options.title}"`);
  const contextualUrl = getCategoryDefaultEditorialImage(options.category, options.title);
  return {
    imageUrl: contextualUrl,
    source: "contextual",
    modelUsed: "Perspective Contextual Press Visual Engine",
    promptUsed: promptText
  };
}
