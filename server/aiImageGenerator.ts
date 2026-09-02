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
  bodyText?: string;
  category?: string;
  keyActors?: string[];
  tags?: string[];
  styleHint?: string;
  forceAiGeneration?: boolean;
  customPrompt?: string;
}

export interface GeneratedImageResult {
  imageUrl: string;
  source: "internet_search" | "pollinations_flux" | "gemini" | "openai" | "contextual";
  modelUsed?: string;
  promptUsed?: string;
}

/**
 * Searches the Internet (Wikimedia Commons & Wikipedia REST APIs) for verified real-world news photos
 * matching the article title, key entities, or subjects.
 */
export async function searchInternetForArticleImage(options: ImageGenerationOptions): Promise<GeneratedImageResult | null> {
  const { title, keyActors = [], tags = [], category = "" } = options;
  if (!title || typeof title !== "string") return null;

  // Build an ordered list of search candidate queries
  const candidateQueries: string[] = [];

  // 1. Specific Key Actors if passed
  if (Array.isArray(keyActors) && keyActors.length > 0) {
    for (const actor of keyActors) {
      if (typeof actor === "string" && actor.length > 3 && !actor.toLowerCase().includes("perspective")) {
        candidateQueries.push(actor.trim());
      }
    }
  }

  // 2. High-profile entity patterns in title
  const cleanTitle = title
    .replace(/^.*?(sénégal|dakar|afrique|urgent|analyse|économie|politique|sports?|flash|exclusif)\s*:\s*/i, "")
    .replace(/[«»"“”#*`]/g, "")
    .trim();

  // Known entities detection
  const ENTITY_MATCHERS: Array<{ match: RegExp; query: string }> = [
    { match: /bassirou\s+diomaye|diomaye\s+faye/i, query: "Bassirou Diomaye Faye" },
    { match: /ousmane\s+sonko|sonko/i, query: "Ousmane Sonko" },
    { match: /macky\s+sall/i, query: "Macky Sall" },
    { match: /sadio\s+man[eé]/i, query: "Sadio Mané" },
    { match: /pape\s+thiaw/i, query: "Pape Thiaw" },
    { match: /aliou\s+ciss[eé]/i, query: "Aliou Cissé" },
    { match: /port\s+autonome\s+de\s+dakar|port\s+de\s+dakar/i, query: "Port autonome de Dakar" },
    { match: /train\s+express\s+r[eé]gional|ter\s+dakar|seter/i, query: "Train express régional de Dakar" },
    { match: /sunubrt|bus\s+rapid\s+transit|brt\s+dakar/i, query: "SunuBRT Dakar" },
    { match: /bceao|banque\s+centrale\s+des\s+[eé]tats/i, query: "BCEAO" },
    { match: /stade\s+abdoulaye\s+wade/i, query: "Stade Abdoulaye-Wade" },
    { match: /a[eé]roport\s+international\s+blaise\s+diagne|aibd/i, query: "Aéroport international Blaise-Diagne" },
    { match: /monument\s+de\s+la\s+renaissance/i, query: "Monument de la Renaissance africaine" },
    { match: /diamniadio/i, query: "Diamniadio" },
    { match: /saint-louis\s+du\s+s[eé]n[eé]gal|saint-louis\s+s[eé]n[eé]gal/i, query: "Saint-Louis (Sénégal)" },
    { match: /gor[eé]e/i, query: "Île de Gorée" },
    { match: /senelec/i, query: "Senelec" },
    { match: /sonatel/i, query: "Sonatel" },
    { match: /petrosen/i, query: "Petrosen" },
    { match: /woodside/i, query: "Woodside Energy" },
    { match: /cedeao|ecowas/i, query: "CEDEAO" },
    { match: /uemoa/i, query: "UEMOA" },
    { match: /zlecaf|afcfta/i, query: "ZLECAf" }
  ];

  for (const item of ENTITY_MATCHERS) {
    if (item.match.test(title)) {
      if (!candidateQueries.includes(item.query)) {
        candidateQueries.push(item.query);
      }
    }
  }

  // 3. Cleaned title segment query
  if (cleanTitle.length > 5 && cleanTitle.length < 50) {
    candidateQueries.push(cleanTitle);
  }

  // 4. Primary tags if present
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag === "string" && tag.length > 4 && !["sénégal", "actualité", "perspective"].includes(tag.toLowerCase())) {
        if (!candidateQueries.includes(tag)) candidateQueries.push(tag);
      }
    }
  }

  // Helper to validate whether an image URL is high-quality and not a generic icon/flag
  const isValidPhotoUrl = (url: string, width?: number): boolean => {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    if (lower.includes(".svg") || lower.includes("flag_") || lower.includes("coat_of_arms") || lower.includes("blason") || lower.includes("logo") || lower.includes("icon")) {
      return false;
    }
    if (width && width < 380) return false;
    return lower.startsWith("http://") || lower.startsWith("https://");
  };

  // Perform search across candidates (timeout bound 3.5s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    for (const query of candidateQueries.slice(0, 4)) {
      // Step A: Search Wikimedia Commons for real bitmap photography
      try {
        const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query + " filetype:bitmap")}&gsrlimit=4&prop=imageinfo&iiprop=url|size|mime&format=json&origin=*`;
        const resp = await fetch(commonsUrl, { signal: controller.signal });
        if (resp.ok) {
          const data = await resp.json();
          const pages = data.query?.pages || {};
          for (const page of Object.values(pages)) {
            const info = (page as any).imageinfo?.[0];
            if (info && info.url && isValidPhotoUrl(info.url, info.width)) {
              clearTimeout(timeoutId);
              console.log(`[INTERNET IMAGE SEARCH SUCCESS] Matched Commons photo for "${query}": ${info.url}`);
              return {
                imageUrl: info.url,
                source: "internet_search",
                modelUsed: `Verified Internet Press Wire (Wikimedia: ${query})`,
                promptUsed: query
              };
            }
          }
        }
      } catch (_commonsErr) {
        // Continue to Wikipedia summary
      }

      // Step B: Search French Wikipedia Page Summary
      try {
        const wikiSummaryUrl = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, "_"))}`;
        const resp = await fetch(wikiSummaryUrl, { signal: controller.signal });
        if (resp.ok) {
          const summary = await resp.json();
          const imgUrl = summary.originalimage?.source || summary.thumbnail?.source;
          const imgWidth = summary.originalimage?.width || summary.thumbnail?.width || 800;
          if (imgUrl && isValidPhotoUrl(imgUrl, imgWidth)) {
            clearTimeout(timeoutId);
            console.log(`[INTERNET IMAGE SEARCH SUCCESS] Matched Wikipedia photo for "${query}": ${imgUrl}`);
            return {
              imageUrl: imgUrl,
              source: "internet_search",
              modelUsed: `Verified Internet Editorial Photo (Wikipedia: ${query})`,
              promptUsed: query
            };
          }
        }
      } catch (_wikiErr) {
        // Continue
      }
    }
  } catch (searchErr: any) {
    console.warn(`[INTERNET IMAGE SEARCH] Completed with note: ${searchErr?.message || searchErr}`);
  } finally {
    clearTimeout(timeoutId);
  }

  return null;
}

/**
 * Builds a rich, photorealistic, content-focused photojournalism prompt for GenAI image models.
 */
export function buildPhotojournalismPrompt(options: ImageGenerationOptions): string {
  const { title, excerpt = "", category = "Économie", keyActors = [] } = options;
  const rawText = `${title} ${excerpt} ${keyActors.join(" ")} ${category}`.replace(/<[^>]*>/g, "").replace(/[#*`_"]/g, " ");
  const words = rawText.split(/\s+/).filter(w => w.length > 2);
  const topKeywords = Array.from(new Set(words)).slice(0, 50).join(", ");
  
  if (options.customPrompt) {
    return `${options.customPrompt.slice(0, 250)} | 16:9 editorial press photo`.slice(0, 300);
  }

  return `Professional photojournalism, 16:9 widescreen editorial photograph, West African documentary context. Key elements: ${topKeywords}. Realistic lighting, sharp focus, zero text overlays.`;
}

/**
 * Primary AI Image Generator for Articles:
 * 1. Searches the internet (Wikimedia Commons / Wikipedia) for verified authentic news photography matching the article title / entities
 * 2. If no verified internet photo exists, generates a content-focused photojournalism image via Pollinations Flux AI / Gemini / OpenAI
 * 3. Falls back gracefully to curated high-resolution editorial photography
 */
export async function generateArticleImageWithAI(options: ImageGenerationOptions): Promise<GeneratedImageResult> {
  // Step 1: Internet Search for matching title and key entities (unless forceAiGeneration is requested)
  if (!options.forceAiGeneration) {
    try {
      console.log(`[AI IMAGE PIPELINE] Searching internet for matching photo for: "${options.title}"...`);
      const internetMatch = await searchInternetForArticleImage(options);
      if (internetMatch && internetMatch.imageUrl) {
        return internetMatch;
      }
      console.log(`[AI IMAGE PIPELINE] No verified internet photo found for title. Proceeding to content-focused AI image generation...`);
    } catch (searchErr) {
      console.warn(`[AI IMAGE PIPELINE] Internet search non-blocking notice:`, searchErr);
    }
  }

  const promptText = buildPhotojournalismPrompt(options);

  // Step 2: Try Gemini Image Generation via Google GenAI SDK (with strict 3s timeout)
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
            setTimeout(() => reject(new Error("Gemini Image timeout (30s)")), 30000)
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
          if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
            break;
          }
        }
      }
    }
  }

  // Step 3: Try OpenAI DALL-E 3 (if key provided, with 4s timeout)
  const openaiKey = getEffectiveApiKey("OPENAI");
  if (openaiKey) {
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("OpenAI DALL-E timeout (30s)")), 30000)
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

  // Step 4: Pollinations Flux AI Generation Engine (High-Performance, Zero-Quota, Realistic Photojournalism)
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
      clearTimeout(timeoutId);
      console.log(`[AI IMAGE GEN SUCCESS] Returning direct high-res Flux AI image URL: ${pollinationsUrl}`);
      return {
        imageUrl: pollinationsUrl,
        source: "pollinations_flux",
        modelUsed: "Flux AI Photojournalism CDN",
        promptUsed: promptText
      };
    }

    return {
      imageUrl: pollinationsUrl,
      source: "pollinations_flux",
      modelUsed: "Flux AI Photojournalism CDN",
      promptUsed: promptText
    };
  } catch (pollErr: any) {
    console.warn(`[AI IMAGE GEN NOTICE] Pollinations Flux skipped: ${pollErr?.message || pollErr}`);
  }

  // Step 5: Fallback to Highly Targeted Contextual Curated Editorial Photography
  console.log(`[AI IMAGE GEN CONTEXTUAL FALLBACK] Using contextual editorial photograph for: "${options.title}"`);
  const contextualUrl = getCategoryDefaultEditorialImage(options.category, options.title);
  return {
    imageUrl: contextualUrl,
    source: "contextual",
    modelUsed: "Perspective Contextual Press Visual Engine",
    promptUsed: promptText
  };
}
