import { resolveApiUrl, safeFetchJson, safeJsonParse } from './apiUtils';
import { ref, get, update } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { withFirestoreTimeout } from '../firebase/db';

/**
 * Client-Side AI and RSS Engine
 * Backed exclusively by Firebase Firestore and client-side intelligence.
 */

export interface ClientRewriteOptions {
  article: any;
  prompt?: string;
  category?: string;
  type?: string;
  preferredEngine?: string;
}

export interface ClientRewriteResult {
  success: boolean;
  message?: string;
  engineUsed: string;
  article: any;
  error?: string;
}

export interface ClientRssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  guid?: string;
  category?: string;
  enclosure?: { url: string; type?: string };
  imageUrl?: string;
  featuredImage?: string;
}

/**
 * In-memory cache for API keys synced from Firestore
 */
let cachedFirestoreKeys: Record<string, string> = {};
let hasLoadedFromFirestore = false;
let loadPromise: Promise<Record<string, string>> | null = null;

/**
 * Loads API keys from Firestore site_settings into memory and localStorage
 */
export async function loadClientApiKeysFromFirestore(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const snap = await withFirestoreTimeout(get(ref(rtdb, 'site_settings/api_keys')), 6000).catch(() => null);
      if (snap && snap.exists()) {
        const data = snap.val();
        const apiKeys = (data?.api_keys || data || {}) as Record<string, string>;
        cachedFirestoreKeys = { ...apiKeys };
        hasLoadedFromFirestore = true;
        if (window.localStorage) {
          for (const [k, v] of Object.entries(apiKeys)) {
            if (typeof v === 'string' && v.trim()) {
              const lower = k.toLowerCase();
              const upper = k.toUpperCase();
              if (!localStorage.getItem(`api_key_${lower}`)) {
                localStorage.setItem(`api_key_${lower}`, v.trim());
              }
              if (!localStorage.getItem(`${upper}_API_KEY`)) {
                localStorage.setItem(`${upper}_API_KEY`, v.trim());
              }
            }
          }
        }
        return cachedFirestoreKeys;
      }
    } catch (e) {
      console.warn('[Firebase] Notice loading API keys from Firestore:', e);
    } finally {
      loadPromise = null;
    }
    return cachedFirestoreKeys;
  })();

  return loadPromise;
}

// Auto-trigger load on client initialization
if (typeof window !== 'undefined') {
  loadClientApiKeysFromFirestore();
}

/**
 * Gets the cleanest available API key from localStorage or Firestore cache
 */
export function getClientApiKey(provider: string): string | null {
  if (typeof window === 'undefined') return null;
  const p = provider.toLowerCase();
  const P = provider.toUpperCase();

  // 1. Check browser localStorage
  if (window.localStorage) {
    const val = localStorage.getItem(`api_key_${p}`) || localStorage.getItem(`${P}_API_KEY`);
    if (val) {
      const trimmed = val.replace(/^["']|["']$/g, '').trim();
      if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') return trimmed;
    }
  }

  // 2. Check cached Firestore keys
  if (cachedFirestoreKeys[P]) return cachedFirestoreKeys[P];
  if (cachedFirestoreKeys[p]) return cachedFirestoreKeys[p];
  if (cachedFirestoreKeys[`${p}_api_key`]) return cachedFirestoreKeys[`${p}_api_key`];
  if (cachedFirestoreKeys[`api_key_${p}`]) return cachedFirestoreKeys[`api_key_${p}`];

  return null;
}

/**
 * Checks if ANY AI provider API key is currently available
 */
export function hasAnyClientApiKey(): boolean {
  const providers = ['gemini', 'groq', 'openai', 'openrouter', 'anthropic', 'deepseek'];
  return providers.some(p => !!getClientApiKey(p));
}

/**
 * Saves an API key to localStorage AND Firestore so it persists across all devices
 */
export async function saveClientApiKey(provider: string, key: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const p = provider.toLowerCase();
  const P = provider.toUpperCase();
  const cleanKey = (key || '').replace(/^["']|["']$/g, '').trim();

  // 1. Save in localStorage
  if (window.localStorage) {
    if (cleanKey) {
      localStorage.setItem(`api_key_${p}`, cleanKey);
      localStorage.setItem(`${P}_API_KEY`, cleanKey);
    } else {
      localStorage.removeItem(`api_key_${p}`);
      localStorage.removeItem(`${P}_API_KEY`);
    }
  }

  // 2. Cache in memory
  if (cleanKey) {
    cachedFirestoreKeys[P] = cleanKey;
  } else {
    delete cachedFirestoreKeys[P];
  }

  // 3. Persist to Realtime Database site_settings/api_keys
  try {
    await withFirestoreTimeout(update(ref(rtdb, 'site_settings/api_keys'), {
      api_keys: { ...cachedFirestoreKeys, [P]: cleanKey }
    }));
    console.log(`[Firebase] Successfully saved ${P} API key to the database.`);
  } catch (err) {
    console.warn(`[Firebase] Could not sync ${P} key to Firestore:`, err);
  }
}

/**
 * Returns a high-definition thematic editorial image based on category and title
 */
export function getEditorialFallbackImage(category: string = 'Économie', titleText: string = ''): string {
  const title = (titleText || '').toLowerCase();
  
  if (title.includes('football') || title.includes('sport') || title.includes('stade') || title.includes('can') || title.includes('caf') || title.includes('seed') || title.includes('samoura')) {
    return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200';
  }
  if (title.includes('dakar') || title.includes('sénégal') || title.includes('senegal')) {
    if (title.includes('port') || title.includes('pêche') || title.includes('mer')) {
      return 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=1200';
    }
    if (title.includes('ter') || title.includes('brt') || title.includes('transport') || title.includes('train')) {
      return 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=1200';
    }
    if (title.includes('pétrole') || title.includes('gaz') || title.includes('énergie') || title.includes('sangomar')) {
      return 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&q=80&w=1200';
    }
  }
  if (title.includes('politique') || title.includes('gouvernement') || title.includes('président') || title.includes('ministre') || title.includes('assemblée')) {
    return 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=1200';
  }
  if (title.includes('tech') || title.includes('ia') || title.includes('numérique') || title.includes('digital') || title.includes('startup')) {
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200';
  }

  const cat = (category || '').toLowerCase();
  if (cat.includes('sport')) return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200';
  if (cat.includes('politique')) return 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=1200';
  if (cat.includes('tech') || cat.includes('innovation')) return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200';
  if (cat.includes('culture') || cat.includes('société')) return 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=1200';
  if (cat.includes('international') || cat.includes('monde')) return 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1200';
  return 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1200';
}

/**
 * Tests an AI provider directly from the client browser
 */
export async function clientTestProvider(provider: string): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  modelUsed?: string;
}> {
  if (!hasLoadedFromFirestore) {
    await loadClientApiKeysFromFirestore();
  }
  const p = provider.toUpperCase();
  const startTime = Date.now();

  try {
    if (p === 'GEMINI') {
      const key = getClientApiKey('gemini');
      if (!key) throw new Error('Clé API Gemini non configurée dans le navigateur.');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Réponds uniquement par: OK' }] }]
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'Google Gemini 3.8 Flash opérationnel (Test direct navigateur)',
        modelUsed: 'gemini-3.8-flash'
      };
    }

    if (p === 'OPENAI') {
      const key = getClientApiKey('openai');
      if (!key) throw new Error('Clé API OpenAI non configurée.');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'OpenAI GPT-4o Mini opérationnel (Test direct navigateur)',
        modelUsed: 'gpt-4o-mini'
      };
    }

    if (p === 'GROQ') {
      const key = getClientApiKey('groq');
      if (!key) throw new Error('Clé API Groq non configurée.');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'Groq Llama 3.3 70B opérationnel (Test direct navigateur)',
        modelUsed: 'llama-3.3-70b-versatile'
      };
    }

    if (p === 'OPENROUTER') {
      const key = getClientApiKey('openrouter');
      if (!key) throw new Error('Clé API OpenRouter non configurée.');
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'OpenRouter opérationnel (Test direct navigateur)',
        modelUsed: 'meta-llama/llama-3.3-70b-instruct'
      };
    }

    if (p === 'DEEPSEEK') {
      const key = getClientApiKey('deepseek');
      if (!key) throw new Error('Clé API DeepSeek non configurée.');
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'DeepSeek Chat opérationnel (Test direct navigateur)',
        modelUsed: 'deepseek-chat'
      };
    }

    if (p === 'ANTHROPIC') {
      const key = getClientApiKey('anthropic');
      if (!key) throw new Error('Clé API Anthropic non configurée.');
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'Clé Anthropic enregistrée (Nécessite backend ou proxy CORS pour les requêtes de messages directs)',
        modelUsed: 'claude-3-5-sonnet'
      };
    }

    throw new Error(`Moteur ${provider} non supporté pour le test direct.`);
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      message: err.message || 'Erreur lors du test'
    };
  }
}

/**
 * Rewrites and polishes an article using direct client-side AI calls
 */
export async function clientRewriteArticle(options: ClientRewriteOptions): Promise<ClientRewriteResult> {
  const { article, prompt, category = 'Économie', type = 'Analysis', preferredEngine = 'auto' } = options;

  if (!hasLoadedFromFirestore) {
    await loadClientApiKeysFromFirestore();
  }

  const geminiKey = getClientApiKey('gemini');
  const groqKey = getClientApiKey('groq');
  const openaiKey = getClientApiKey('openai');
  const openrouterKey = getClientApiKey('openrouter');
  const deepseekKey = getClientApiKey('deepseek');

  let engine = preferredEngine.toLowerCase();
  if (engine === 'auto') {
    if (geminiKey) engine = 'gemini';
    else if (groqKey) engine = 'groq';
    else if (openaiKey) engine = 'openai';
    else if (openrouterKey) engine = 'openrouter';
    else if (deepseekKey) engine = 'deepseek';
    else throw new Error('Aucune clé API IA disponible dans le navigateur. Rendez-vous dans l\'onglet Diagnostics pour renseigner votre clé Gemini, Groq ou OpenAI.');
  }

  const articleContext = typeof article === 'object' ? JSON.stringify(article) : String(article);
  const promptText = `Tu es l'Intelligence Éditoriale de Perspective Group ("L'actualité. Sans Filtre. Sans Compromis.").
RÉÉCRIS et PERFECTIONNE l'article suivant selon les standards d'investigation et d'analyse géopolitique/économique ouest-africaine.
Ton : Analytique, précis, sans jargon creux, sans clichés ("dans un monde en perpétuelle évolution").
Structure : Bilingue intégral (fr et en).

INSTRUCTIONS COMPLÉMENTAIRES DU RÉDACTEUR EN CHEF :
${prompt || 'Réécriture intégrale avec dossier analytique, Perspective Brief, acteurs clés et chronologie.'}

CATÉGORIE CIBLE : ${category}
FORMAT / TYPE D'ARTICLE : ${type}

DONNÉES SOURCE DE L'ARTICLE :
${articleContext}

RÉPONDS UNIQUEMENT PAR UN OBJET JSON STRICT respectant exactement ce schéma :
{
  "title": { "fr": "Titre percutant en français", "en": "Impactful English headline" },
  "excerpt": { "fr": "Chapeau analytique 2-3 phrases en français", "en": "Analytical executive summary in English" },
  "body": { "fr": "Corps de l'article approfondi en Markdown (au moins 4 paragraphes structurés avec sous-titres)", "en": "Deep investigative article in English (at least 4 structured paragraphs with markdown headings)" },
  "category": "${category}",
  "type": "${type}",
  "perspectiveBrief": {
    "whatHappened": { "fr": "Synthèse factuelle claire des faits", "en": "Clear factual overview of what took place" },
    "whyItMatters": { "fr": "Analyse d'impact structurel et enjeux cachés", "en": "Structural impact and strategic stakes" },
    "whatToWatchNext": { "fr": "Prochaines échéances, signaux faibles et perspectives", "en": "Upcoming milestones and forward trajectory" }
  },
  "keyActors": [
    { "name": "Nom de l'acteur ou institution", "role": "Rôle / Fonction", "significance": "Poids stratégique dans le dossier" }
  ],
  "timeline": [
    { "date": "Date ou repère", "description": { "fr": "Événement clé", "en": "Key event" } }
  ],
  "structuralForces": {
    "political": { "fr": "Dynamique politique", "en": "Political dynamics" },
    "economic": { "fr": "Leviers économiques et financiers", "en": "Economic & financial factors" },
    "social": { "fr": "Répercussions sociales et populaires", "en": "Social & public impact" },
    "international": { "fr": "Dimensions régionales et diplomatiques", "en": "Diplomatic & international angles" }
  },
  "tags": ["Tag1", "Tag2", "Tag3"]
}`;

  let rawContent = '';
  let modelUsed = '';
  let lastError = '';

  // Helper to query Gemini with model fallback
  const callGeminiDirect = async (apiKey: string) => {
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    for (const model of candidateModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content && content.trim()) {
            return { content, model: `Gemini ${model} (Client Direct)` };
          }
        } else {
          const errJson = await res.json().catch(() => ({}));
          console.warn(`[Client AI] Gemini ${model} returned HTTP ${res.status}:`, errJson?.error?.message);
        }
      } catch (err: any) {
        console.warn(`[Client AI] Gemini ${model} fetch failed:`, err.message);
      }
    }
    throw new Error('Les modèles Gemini sont temporairement saturés ou la clé API est restreinte.');
  };

  // Helper to query Groq
  const callGroqDirect = async (apiKey: string) => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erreur Groq HTTP ${res.status}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return { content, model: 'Groq Llama 3.3 70B (Client Direct)' };
  };

  // Helper to query OpenAI
  const callOpenAIDirect = async (apiKey: string) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erreur OpenAI HTTP ${res.status}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return { content, model: 'OpenAI GPT-4o Mini (Client Direct)' };
  };

  // Execution flow with intelligent auto-failover
  if (engine === 'gemini' || (engine === 'auto' && geminiKey)) {
    try {
      if (!geminiKey) throw new Error('Clé Gemini non configurée.');
      const res = await callGeminiDirect(geminiKey);
      rawContent = res.content;
      modelUsed = res.model;
    } catch (e: any) {
      lastError = e.message;
      if (engine === 'auto' && groqKey) {
        console.warn('[Client AI Failover] Gemini failed, failing over to Groq Llama 3.3...');
        try {
          const res = await callGroqDirect(groqKey);
          rawContent = res.content;
          modelUsed = `${res.model} (Failover Gemini -> Groq)`;
        } catch (groqErr: any) {
          lastError = groqErr.message;
        }
      } else if (engine === 'auto' && openaiKey) {
        console.warn('[Client AI Failover] Gemini failed, failing over to OpenAI...');
        try {
          const res = await callOpenAIDirect(openaiKey);
          rawContent = res.content;
          modelUsed = `${res.model} (Failover Gemini -> OpenAI)`;
        } catch (oErr: any) {
          lastError = oErr.message;
        }
      } else {
        throw new Error(lastError);
      }
    }
  } else if (engine === 'groq' || (engine === 'auto' && groqKey)) {
    try {
      if (!groqKey) throw new Error('Clé Groq non configurée.');
      const res = await callGroqDirect(groqKey);
      rawContent = res.content;
      modelUsed = res.model;
    } catch (e: any) {
      lastError = e.message;
      if (engine === 'auto' && openaiKey) {
        const res = await callOpenAIDirect(openaiKey);
        rawContent = res.content;
        modelUsed = `${res.model} (Failover Groq -> OpenAI)`;
      } else {
        throw new Error(lastError);
      }
    }
  } else if (engine === 'openai' || (engine === 'auto' && openaiKey)) {
    if (!openaiKey) throw new Error('Clé OpenAI non configurée.');
    const res = await callOpenAIDirect(openaiKey);
    rawContent = res.content;
    modelUsed = res.model;
  } else if (engine === 'openrouter') {
    if (!openrouterKey) throw new Error('Clé OpenRouter non configurée.');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erreur OpenRouter HTTP ${res.status}`);
    }
    const data = await res.json();
    rawContent = data?.choices?.[0]?.message?.content || '';
    modelUsed = 'OpenRouter Llama 3.3 (Client Direct)';
  } else {
    throw new Error(`Moteur IA ${engine} non disponible pour la réécriture directe.`);
  }

  // Parse JSON response safely with resilient multi-pass recovery
  let parsedArticle: any = null;
  let cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    parsedArticle = safeJsonParse(cleaned, {});
  } catch (_) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const candidate = cleaned.substring(firstBrace, lastBrace + 1).replace(/,(\s*[}\]])/g, '$1');
        parsedArticle = safeJsonParse(candidate, {});
      } catch (e2: any) {
        throw new Error('Le modèle IA n\'a pas renvoyé un format JSON valide: ' + e2.message);
      }
    } else {
      throw new Error('Format de réponse JSON incomplet renvoyé par le modèle.');
    }
  }

  // Ensure high-definition image is assigned: ALWAYS prioritize original article / RSS feed image
  const itemImg = typeof article === 'object' ? (article.imageUrl || article.featuredImage || article.image || article.enclosure?.url || article.thumbnail) : null;
  if (itemImg && typeof itemImg === 'string' && itemImg.startsWith('http')) {
    parsedArticle.featuredImage = itemImg;
    parsedArticle.imageUrl = itemImg;
  } else if (!parsedArticle.featuredImage || parsedArticle.featuredImage.includes('photo-1504711434969-e33886168f5c')) {
    parsedArticle.featuredImage = getEditorialFallbackImage(category, parsedArticle.title?.fr || parsedArticle.title?.en || (typeof article === 'object' ? article.title : ''));
    parsedArticle.imageUrl = parsedArticle.featuredImage;
  } else {
    parsedArticle.imageUrl = parsedArticle.featuredImage;
  }

  return {
    success: true,
    message: `Article réécrit avec succès via ${modelUsed}`,
    engineUsed: modelUsed,
    article: parsedArticle
  };
}

/**
 * Generates landmark events for investigation articles client-side
 */
export async function clientGenerateTimeline(title: string, excerpt: string, language: string = 'fr'): Promise<{
  success: boolean;
  events: Array<{ date: string; descriptionFr: string; descriptionEn: string }>;
}> {
  const geminiKey = getClientApiKey('gemini');
  const groqKey = getClientApiKey('groq');
  const openaiKey = getClientApiKey('openai');

  const promptText = `Génère 4 à 6 dates et repères chronologiques majeurs pour ce dossier d'investigation :
Titre : "${title}"
Contexte : "${excerpt}"

Réponds UNIQUEMENT par un tableau JSON d'objets :
[
  { "date": "Ex: Janvier 2024", "descriptionFr": "Explication en français", "descriptionEn": "Description in English" }
]`;

  let raw = '';
  if (geminiKey) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    if (res.ok) {
      const data = await res.json();
      raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    }
  } else if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });
    if (res.ok) {
      const data = await res.json();
      raw = data?.choices?.[0]?.message?.content || '[]';
    }
  } else if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: promptText }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      raw = data?.choices?.[0]?.message?.content || '[]';
    }
  }

  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = safeJsonParse<any>(cleaned, []);
    const events = Array.isArray(parsed) ? parsed : (parsed.events || []);
    return { success: true, events };
  } catch (_) {
    return {
      success: true,
      events: [
        { date: 'Genèse', descriptionFr: 'Origine et premiers développements du dossier.', descriptionEn: 'Origins and initial dossier developments.' },
        { date: 'Phase critique', descriptionFr: 'Point de bascule stratégique et déclarations clés.', descriptionEn: 'Strategic turning point and key statements.' },
        { date: 'Situation actuelle', descriptionFr: 'État des forces et implications en cours.', descriptionEn: 'Current state of play and active implications.' }
      ]
    };
  }
}

/**
 * Fetches and parses an RSS feed directly from the client browser
 * Uses high-availability CORS bridge proxies when calling external feeds from HTTPS
 */
export async function clientFetchRssFeed(feedUrl: string, feedName?: string): Promise<{
  success: boolean;
  items: ClientRssItem[];
  count: number;
  feedUrl: string;
  source: string;
}> {
  if (!feedUrl || !feedUrl.trim()) {
    throw new Error('URL de flux RSS manquante.');
  }

  const cleanUrl = feedUrl.trim();

  // 1. Primary High-Reliability Strategy: Dedicated RSS-to-JSON services (zero-CORS)
  try {
    const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(rss2jsonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
        const items: ClientRssItem[] = data.items.map((it: any) => {
          const rawContent = `${it.description || ''} ${it.content || ''}`;
          const imgMatch = rawContent.match(/<img[^>]+(?:src|data-src|data-orig-file)=["'](https?:\/\/[^"'\s>]+)["']/i);
          const resolvedImg = (it.enclosure?.link || it.thumbnail || it.image || it.banner_image || (imgMatch ? imgMatch[1] : undefined) || '').trim();

          return {
            title: (it.title || '').trim(),
            link: it.link || it.guid || cleanUrl,
            description: (it.description || it.content || '').replace(/<[^>]*>?/gm, ' ').slice(0, 500).trim(),
            pubDate: it.pubDate || new Date().toISOString(),
            source: feedName || data.feed?.title || 'Agence de Presse',
            guid: it.guid || it.link || `rss-${Date.now()}-${Math.random()}`,
            category: it.categories?.[0] || 'Actualité',
            enclosure: resolvedImg ? { url: resolvedImg, type: it.enclosure?.type } : undefined,
            imageUrl: resolvedImg || undefined,
            featuredImage: resolvedImg || undefined
          };
        });

        if (items.length > 0) {
          return {
            success: true,
            items,
            count: items.length,
            feedUrl: cleanUrl,
            source: 'rss2json Bridge'
          };
        }
      }
    }
  } catch (_) {
    // Continue to next bridge
  }

  // 2. Secondary Strategy: Feed2JSON RFC-compatible converter
  try {
    const feed2jsonUrl = `https://feed2json.org/convert?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(feed2jsonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const items: ClientRssItem[] = data.items.map((it: any) => {
          const rawContent = `${it.summary || ''} ${it.content_html || ''} ${it.content_text || ''}`;
          const imgMatch = rawContent.match(/<img[^>]+(?:src|data-src|data-orig-file)=["'](https?:\/\/[^"'\s>]+)["']/i);
          const resolvedImg = (it.image || it.banner_image || (imgMatch ? imgMatch[1] : undefined) || '').trim();

          return {
            title: (it.title || '').trim(),
            link: it.url || it.id || cleanUrl,
            description: (it.summary || it.content_html || it.content_text || '').replace(/<[^>]*>?/gm, ' ').slice(0, 500).trim(),
            pubDate: it.date_published || it.date_modified || new Date().toISOString(),
            source: feedName || data.title || 'Agence de Presse',
            guid: it.id || it.url || `rss-${Date.now()}-${Math.random()}`,
            category: 'Actualité',
            enclosure: resolvedImg ? { url: resolvedImg } : undefined,
            imageUrl: resolvedImg || undefined,
            featuredImage: resolvedImg || undefined
          };
        });

        if (items.length > 0) {
          return {
            success: true,
            items,
            count: items.length,
            feedUrl: cleanUrl,
            source: 'feed2json Bridge'
          };
        }
      }
    }
  } catch (_) {
    // Continue to next strategy
  }

  // 3. Tertiary Strategy: Raw XML bridges with DOMParser
  const proxyEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
    `https://thingproxy.freeboard.io/fetch/${cleanUrl}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`,
    cleanUrl // Direct fetch attempt as fallback
  ];

  let xmlText = '';
  let successfulBridge = '';

  for (const endpoint of proxyEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }
      });
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<item') || text.includes('<entry'))) {
          xmlText = text;
          successfulBridge = endpoint;
          break;
        }
      }
    } catch (_) {
      // Continue to next bridge
    }
  }

  if (xmlText) {
    // Parse XML using browser DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const items: ClientRssItem[] = [];

    // 1. Standard RSS 2.0 <item>
    const rssItems = xmlDoc.querySelectorAll('item');
    if (rssItems.length > 0) {
      rssItems.forEach((node) => {
        const title = node.querySelector('title')?.textContent?.trim() || '';
        const link = node.querySelector('link')?.textContent?.trim() || '';
        
        let desc = node.querySelector('description')?.textContent?.trim() || '';
        const contentEncoded = node.getElementsByTagNameNS('*', 'encoded')[0]?.textContent?.trim();
        if (contentEncoded && contentEncoded.length > desc.length) {
          desc = contentEncoded;
        }

        const pubDate = node.querySelector('pubDate')?.textContent?.trim() || new Date().toISOString();
        const guid = node.querySelector('guid')?.textContent?.trim() || link;
        const category = node.querySelector('category')?.textContent?.trim() || 'Actualité';

        let encUrl = '';
        const encNode = node.querySelector('enclosure');
        if (encNode && encNode.getAttribute('url')) {
          encUrl = encNode.getAttribute('url') || '';
        }
        if (!encUrl) {
          const mediaContent = node.getElementsByTagNameNS('*', 'content')[0];
          if (mediaContent?.getAttribute('url')) encUrl = mediaContent.getAttribute('url') || '';
        }
        if (!encUrl) {
          const mediaThumb = node.getElementsByTagNameNS('*', 'thumbnail')[0];
          if (mediaThumb?.getAttribute('url')) encUrl = mediaThumb.getAttribute('url') || '';
        }
        if (!encUrl) {
          const itunesImg = node.getElementsByTagNameNS('*', 'image')[0];
          if (itunesImg?.getAttribute('href')) encUrl = itunesImg.getAttribute('href') || '';
        }
        if (!encUrl) {
          const combinedHtml = `${desc} ${contentEncoded || ''}`;
          const imgMatch = combinedHtml.match(/<img[^>]+(?:src|data-src|data-orig-file)=["'](https?:\/\/[^"'\s>]+)["']/i);
          if (imgMatch) encUrl = imgMatch[1];
        }

        encUrl = encUrl.trim();

        if (title) {
          items.push({
            title,
            link,
            description: desc.replace(/<[^>]*>?/gm, ' ').slice(0, 500).trim(),
            pubDate,
            source: feedName || 'Agence de Presse',
            guid,
            category,
            enclosure: encUrl ? { url: encUrl } : undefined,
            imageUrl: encUrl || undefined,
            featuredImage: encUrl || undefined
          });
        }
      });
    } else {
      // 2. Atom <entry>
      const atomEntries = xmlDoc.querySelectorAll('entry');
      atomEntries.forEach((node) => {
        const title = node.querySelector('title')?.textContent?.trim() || '';
        let link = node.querySelector('link')?.getAttribute('href') || node.querySelector('link')?.textContent?.trim() || '';
        const summary = node.querySelector('summary')?.textContent?.trim() || node.querySelector('content')?.textContent?.trim() || '';
        const updated = node.querySelector('updated')?.textContent?.trim() || node.querySelector('published')?.textContent?.trim() || new Date().toISOString();
        const id = node.querySelector('id')?.textContent?.trim() || link;

        let encUrl = '';
        const encLink = node.querySelector('link[rel="enclosure"]');
        if (encLink?.getAttribute('href')) encUrl = encLink.getAttribute('href') || '';
        if (!encUrl) {
          const mediaContent = node.getElementsByTagNameNS('*', 'content')[0];
          if (mediaContent?.getAttribute('url')) encUrl = mediaContent.getAttribute('url') || '';
        }
        if (!encUrl) {
          const imgMatch = summary.match(/<img[^>]+(?:src|data-src|data-orig-file)=["'](https?:\/\/[^"'\s>]+)["']/i);
          if (imgMatch) encUrl = imgMatch[1];
        }

        encUrl = encUrl.trim();

        if (title) {
          items.push({
            title,
            link,
            description: summary.replace(/<[^>]*>?/gm, ' ').slice(0, 500).trim(),
            pubDate: updated,
            source: feedName || 'Dépêche Atom',
            guid: id,
            enclosure: encUrl ? { url: encUrl } : undefined,
            imageUrl: encUrl || undefined,
            featuredImage: encUrl || undefined
          });
        }
      });
    }

    if (items.length > 0) {
      return {
        success: true,
        items,
        count: items.length,
        feedUrl: cleanUrl,
        source: successfulBridge.includes('allorigins') ? 'CORS Bridge' : 'Direct XML'
      };
    }
  }

  // 4. Jina Reader fallback (extracts markdown links from RSS feed)
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const res = await fetch(jinaUrl);
    if (res.ok) {
      const markdown = await res.text();
      const regex = /###\s+\[(.*?)\]\((.*?)\)/g;
      const items: ClientRssItem[] = [];
      let match;
      while ((match = regex.exec(markdown)) !== null && items.length < 15) {
        const title = match[1]?.trim();
        const link = match[2]?.trim();
        if (title && !title.toLowerCase().includes('rss feed') && !title.toLowerCase().includes('accueil')) {
          items.push({
            title,
            link,
            description: title,
            pubDate: new Date().toISOString(),
            source: feedName || 'Dépêche Presse',
            guid: link || `jina-${Date.now()}-${items.length}`,
            category: 'Actualité'
          });
        }
      }

      if (items.length > 0) {
        return {
          success: true,
          items,
          count: items.length,
          feedUrl: cleanUrl,
          source: 'Jina Web Reader'
        };
      }
    }
  } catch (_) {
    // End of fallbacks
  }

  throw new Error(`Impossible de contacter le flux RSS (${cleanUrl}). Vérifiez la connectivité de la source ou son adresse.`);
}

/**
 * Automates fetching a feed and generating article drafts directly in the browser
 */
export async function clientProcessFeedAndGenerate(options: {
  feedUrl: string;
  feedName?: string;
  category?: string;
  maxItems?: number;
  type?: string;
  preferredEngine?: string;
  customPrompt?: string;
}): Promise<{
  success: boolean;
  articles: any[];
  generatedCount: number;
  engineUsed: string;
  error?: string;
}> {
  const { 
    feedUrl, 
    feedName, 
    category = 'Économie', 
    maxItems = 1, 
    type = 'News', 
    preferredEngine = 'auto',
    customPrompt 
  } = options;

  try {
    if (!hasLoadedFromFirestore) {
      await loadClientApiKeysFromFirestore();
    }
    // 1. Fetch RSS items via client bridge
    const feedResult = await clientFetchRssFeed(feedUrl, feedName);
    if (!feedResult.success || !Array.isArray(feedResult.items) || feedResult.items.length === 0) {
      throw new Error(`Aucun article disponible dans le flux "${feedName || feedUrl}".`);
    }

    const itemsToProcess = feedResult.items.slice(0, maxItems);
    const createdArticles: any[] = [];
    let lastEngineUsed = '';

    for (const item of itemsToProcess) {
      const rewriteRes = await clientRewriteArticle({
        article: item,
        prompt: customPrompt || `Rédige un article d'actualité rigoureux et complet à partir de cette dépêche de presse : "${item.title}". Source : ${feedName || 'Dépêche'}.`,
        category,
        type,
        preferredEngine
      });

      if (rewriteRes.success && rewriteRes.article) {
        lastEngineUsed = rewriteRes.engineUsed;
        const newArt = {
          ...rewriteRes.article,
          id: 'art-wire-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          slug: 'wire-' + (item.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now(),
          publishedAt: new Date().toISOString(),
          isPublished: false,
          sourceFeed: feedUrl,
          sourceName: feedName || feedResult.source,
          sourceUrl: item.link || feedUrl,
          author: 'Perspective Newsroom'
        };
        createdArticles.push(newArt);
      }
    }

    if (createdArticles.length === 0) {
      throw new Error('Échec de la rédaction des articles par le moteur IA client.');
    }

    return {
      success: true,
      articles: createdArticles,
      generatedCount: createdArticles.length,
      engineUsed: lastEngineUsed || 'IA Client'
    };
  } catch (err: any) {
    return {
      success: false,
      articles: [],
      generatedCount: 0,
      engineUsed: '',
      error: err?.message || 'Erreur lors du traitement du flux'
    };
  }
}

/**
 * Direct client-side Abdel AI chat fallback
 * Engages when the Express backend is inaccessible or deployed statically
 */
export async function clientAbdelChat(params: {
  message: string;
  language?: string;
  history?: Array<{ role: string; text: string }>;
  contextArticle?: any;
  locationInfo?: any;
}): Promise<string> {
  const { message, language = 'fr', history = [], contextArticle } = params;

  await loadClientApiKeysFromFirestore();

  const geminiKey = getClientApiKey('gemini');
  const groqKey = getClientApiKey('groq');
  const openrouterKey = getClientApiKey('openrouter');

  const isFrench = language === 'fr';

  const systemPrompt = `Tu es Abdel, l'intelligence éditoriale et compagnon de réflexion de Perspective Group, média indépendant ouest-africain basé à Dakar.
Ta mission est d'éclairer le lecteur avec pertinence, esprit critique, rigueur intellectuelle et courtoisie.
RÈGLES D'EXPRESSION STRICTES :
1. Reste court, percutant et précis. Pas de bavardage inutile.
2. N'UTILISE JAMAIS d'astérisques de gras (aucun "**" ou "*").
3. Si un article est en contexte, appuie-toi sur ses faits clés.
4. Réponds toujours dans la langue du lecteur (${isFrench ? 'Français' : 'English'}).`;

  let userContext = `Message du lecteur : ${message}`;
  if (contextArticle) {
    userContext = `[ARTICLE EN CONTEXTE: "${contextArticle.title?.[language] || contextArticle.title?.fr || 'Sans titre'}" | Catégorie: ${contextArticle.category || 'Général'}]\nExtrait: ${(contextArticle.excerpt?.[language] || contextArticle.excerpt?.fr || '').slice(0, 300)}\n\n` + userContext;
  }

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const contents: any[] = [];
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role === 'abdel' ? 'model' : 'user',
          parts: [{ text: h.text }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: userContext }]
      });

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        }
      }
    } catch (_) {}
  }

  // 2. Try Groq
  if (groqKey) {
    try {
      const messages: any[] = [{ role: 'system', content: systemPrompt }];
      for (const h of history.slice(-6)) {
        messages.push({
          role: h.role === 'abdel' ? 'assistant' : 'user',
          content: h.text
        });
      }
      messages.push({ role: 'user', content: userContext });

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.7,
          max_tokens: 600
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        }
      }
    } catch (_) {}
  }

  // 3. Try OpenRouter
  if (openrouterKey) {
    try {
      const messages: any[] = [{ role: 'system', content: systemPrompt }];
      for (const h of history.slice(-6)) {
        messages.push({
          role: h.role === 'abdel' ? 'assistant' : 'user',
          content: h.text
        });
      }
      messages.push({ role: 'user', content: userContext });

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages,
          temperature: 0.7,
          max_tokens: 600
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        }
      }
    } catch (_) {}
  }

  // Graceful contextual response if keys are not ready
  if (contextArticle) {
    const title = contextArticle.title?.[language] || contextArticle.title?.fr || 'cet article';
    return isFrench
      ? `Sur « ${title} », les points d'ancrage essentiels résident dans l'analyse des arbitrages stratégiques et leurs impacts directs sur le terrain.`
      : `Regarding "${title}", the pivotal elements center on strategic trade-offs and their immediate field impacts.`;
  }

  return isFrench
    ? "Je suis à votre écoute pour analyser l'actualité ou approfondir un dossier."
    : "I am at your service to analyze ongoing developments or unpack any story.";
}

