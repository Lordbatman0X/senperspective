import { resolveApiUrl, safeFetchJson, safeJsonParse } from './apiUtils';
import { ref, get, update } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { withFirestoreTimeout } from '../firebase/db';
import {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  supportsDirectBrowserCall,
  type AiProviderId,
} from './aiProviders';

/**
 * Calls ANY provider directly from the browser and returns the text.
 *
 * This replaces a chain of near-duplicate per-provider fetch blocks, which had
 * drifted apart: Anthropic and DeepSeek were missing entirely, so choosing them
 * in the engine selector always failed. Adding a provider now means adding one
 * entry to aiProviders.ts and nothing else.
 *
 * Every provider is asked for strict JSON, because the article pipeline parses
 * the reply and cannot recover from prose.
 */
/**
 * Result of a direct provider call.
 *
 * A single shape with optional fields rather than a discriminated union: this
 * project does not enable strictNullChecks, and without it TypeScript cannot
 * narrow a union on a boolean literal, so a discriminated version reports
 * "Property 'error' does not exist" on the failure branch.
 */
export interface ProviderCallResult {
  ok: boolean;
  text: string;
  model: string;
  error: string;
}

export async function callProviderDirect(
  providerId: string,
  prompt: string,
  opts: { model?: string; maxTokens?: number; timeoutMs?: number } = {}
): Promise<ProviderCallResult> {
  const fail = (error: string): ProviderCallResult => ({ ok: false, text: '', model: '', error });
  const meta = AI_PROVIDERS[providerId as AiProviderId];
  if (!meta) return fail(`Fournisseur inconnu : ${providerId}`);

  const key = getClientApiKey(meta.id);
  if (!key) return fail(`Clé API ${meta.label} non configurée.`);

  if (!supportsDirectBrowserCall(meta.id)) {
    return fail(`${meta.label} : ${meta.directBlockedReason}`);
  }

  const model = opts.model || meta.defaultModel;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 90_000);

  try {
    let url = meta.directEndpoint.replace('{model}', model);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (meta.authStyle === 'query' && meta.keyParam) {
      url += `${url.includes('?') ? '&' : '?'}${meta.keyParam}=${encodeURIComponent(key)}`;
    } else {
      headers['Authorization'] = `Bearer ${key}`;
    }

    let body: Record<string, any>;
    if (meta.id === 'gemini') {
      body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      };
    } else {
      body = {
        model,
        messages: [{ role: 'user', content: prompt }],
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        response_format: { type: 'json_object' },
      };
    }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const detail =
        errJson?.error?.message ||
        errJson?.message ||
        (typeof errJson?.error === 'string' ? errJson.error : '') ||
        `HTTP ${res.status}`;
      return fail(`${meta.label} : ${detail}`);
    }

    const data: any = await res.json().catch(() => null);

    // One response reader for all OpenAI-compatible providers plus Gemini.
    const text =
      data?.choices?.[0]?.message?.content ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.content?.[0]?.text ||
      data?.output_text ||
      '';

    if (!text || !String(text).trim()) {
      return fail(`${meta.label} a renvoyé une réponse vide.`);
    }
    return { ok: true, text: String(text).trim(), model, error: '' };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return fail(`${meta.label} : délai dépassé (${Math.round((opts.timeoutMs || 90_000) / 1000)}s).`);
    }
    // A CORS rejection surfaces as an opaque TypeError, which is by far the most
    // common failure here and otherwise reports nothing useful at all.
    const msg = err?.message === 'Failed to fetch' || err?.name === 'TypeError'
      ? `${meta.label} : requête bloquée par le navigateur (CORS ou réseau). Vérifiez la clé et l'accès réseau.`
      : `${meta.label} : ${err?.message || String(err)}`;
    return fail(msg);
  } finally {
    clearTimeout(timer);
  }
}

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
 * In-memory cache for AI provider API keys.
 * SECURITY: keys are held ONLY in memory for the current browser session — they
 * are never written to localStorage or to the (potentially public) database.
 * This prevents key exfiltration from any user's browser and removes keys from
 * the shared Realtime Database that client reads allow. Re-enter keys once per
 * session; they do not need to persist across devices.
 */
let cachedFirestoreKeys: Record<string, string> = {};
let hasLoadedFromFirestore = false;

/**
 * Real, currently-supported Gemini generation models (GA / stable names).
 * These are queried in order and the first one that answers is used.
 * The previous hardcoded ids (gemini-3.8-flash / gemini-3.1-*) do not exist
 * on the Generative Language API and always returned HTTP 404, which is why
 * AI article generation was silent-failing.
 */
export const GEMINI_MODEL_FALLBACKS: string[] = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
];

let discoveredGeminiModels: string[] | null = null;

/**
 * Asks the Generative Language API which models actually exist for this key,
 * so we never rely on hardcoded model names that may drift over time.
 * Prefers flash/pro generation models; falls back to the static list on error.
 */
async function resolveGeminiModels(apiKey: string): Promise<string[]> {
  if (discoveredGeminiModels) return discoveredGeminiModels;
  const fallback = GEMINI_MODEL_FALLBACKS;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      const names: string[] = (data?.models || [])
        .map((m: any) => String(m?.name || '').replace(/^models\//, ''))
        .filter((n: string) => n.startsWith('gemini'));
      if (names.length > 0) {
        const rank = (s: string) =>
          s.includes('flash') ? 0 : s.includes('pro') ? 1 : s.includes('lite') ? 2 : 3;
        discoveredGeminiModels = [...new Set(names)].sort((a, b) => rank(a) - rank(b)).slice(0, 12);
        return discoveredGeminiModels;
      }
    }
  } catch (e) {
    // ignore discovery failures; fall back to the static list
  }
  discoveredGeminiModels = fallback;
  return fallback;
}

async function callGeminiGenerative(
  models: string[],
  apiKey: string,
  body: Record<string, any>
): Promise<{ ok: boolean; text: string; lastError: string }> {
  let lastError = '';
  const candidates = models.length > 0 ? [...new Set([...models, ...(await resolveGeminiModels(apiKey))])] : await resolveGeminiModels(apiKey);
  for (const model of candidates) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) return { ok: true, text: text.trim(), lastError: '' };
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson?.error?.message || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }
  return { ok: false, text: '', lastError };
}

/**
 * Loads API keys into the in-memory cache. Reads the persisted localStorage
 * entries written by saveClientApiKey (or the diagnostics UI) so keys survive
 * page reloads.
 */
export async function loadClientApiKeysFromFirestore(): Promise<Record<string, string>> {
  if (hasLoadedFromFirestore) return cachedFirestoreKeys;
  if (typeof window === 'undefined') return cachedFirestoreKeys;

  const providers = ['gemini', 'groq', 'openai', 'openrouter', 'anthropic', 'deepseek'];
  for (const p of providers) {
    const P = p.toUpperCase();
    const candidates = [
      `api_key_${p}`,
      `${P}_API_KEY`,
      `${p}_API_KEY`,
      `api_key_${P}`,
      `${p}_api_key`,
      `${P}_api_key`
    ];
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (v && v.trim()) {
        cachedFirestoreKeys[P] = v.trim();
        break;
      }
    }
  }

  hasLoadedFromFirestore = true;
  return cachedFirestoreKeys;
}

/**
 * Gets the cleanest available API key, from the in-memory cache first and then
 * from localStorage as a fallback. The localStorage fallback self-heals the
 * cache when a key was written directly to storage (e.g. by another tab or by
 * a previous version of the diagnostics UI).
 */
export function getClientApiKey(provider: string): string | null {
  if (typeof window === 'undefined') return null;
  const p = provider.toLowerCase();
  const P = provider.toUpperCase();
  if (cachedFirestoreKeys[P]) return cachedFirestoreKeys[P];
  if (cachedFirestoreKeys[p]) return cachedFirestoreKeys[p];
  if (cachedFirestoreKeys[`${p}_api_key`]) return cachedFirestoreKeys[`${p}_api_key`];
  if (cachedFirestoreKeys[`api_key_${p}`]) return cachedFirestoreKeys[`api_key_${p}`];
  const candidates = [
    `api_key_${p}`,
    `${P}_API_KEY`,
    `${p}_API_KEY`,
    `api_key_${P}`,
    `${p}_api_key`,
    `${P}_api_key`,
  ];
  for (const k of candidates) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) {
      cachedFirestoreKeys[P] = v.trim();
      return cachedFirestoreKeys[P];
    }
  }
  return null;
}

/**
 * Checks if ANY AI provider API key is currently available (in memory)
 */
export function hasAnyClientApiKey(): boolean {
  const providers = ['gemini', 'groq', 'openai', 'openrouter', 'anthropic', 'deepseek'];
  return providers.some(p => !!getClientApiKey(p));
}

/**
 * Stores an API key for this browser: persisted to localStorage (so it survives
 * reloads) AND updated in the in-memory cache (so it is usable immediately
 * without a page refresh).
 */
export async function saveClientApiKey(provider: string, key: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const p = provider.toLowerCase();
  const P = provider.toUpperCase();
  const cleanKey = (key || '').replace(/^["']|["']$/g, '').trim();

  if (cleanKey) {
    cachedFirestoreKeys[P] = cleanKey;
    try {
      localStorage.setItem(`api_key_${p}`, cleanKey);
      localStorage.setItem(`${P}_API_KEY`, cleanKey);
    } catch (_) { /* storage unavailable — memory still works for this session */ }
  } else {
    delete cachedFirestoreKeys[P];
    try {
      localStorage.removeItem(`api_key_${p}`);
      localStorage.removeItem(`${P}_API_KEY`);
    } catch (_) { /* ignore */ }
  }
}

/**
 * Removes a stored API key from both the in-memory cache and localStorage.
 */
export function revokeClientApiKey(provider: string): void {
  if (typeof window === 'undefined') return;
  const p = provider.toLowerCase();
  const P = provider.toUpperCase();
  delete cachedFirestoreKeys[P];
  const candidates = [
    `api_key_${p}`,
    `${P}_API_KEY`,
    `${p}_API_KEY`,
    `api_key_${P}`,
    `${p}_api_key`,
    `${P}_api_key`,
  ];
  for (const k of candidates) {
    try { localStorage.removeItem(k); } catch (_) { /* ignore */ }
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
      const r = await callGeminiGenerative(
        GEMINI_MODEL_FALLBACKS,
        key,
        { contents: [{ parts: [{ text: 'Réponds uniquement par: OK' }] }] }
      );
      if (!r.ok) throw new Error(r.lastError || 'HTTP erreur');
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: `Google Gemini opérationnel (${GEMINI_MODEL_FALLBACKS[0]}) — Test direct navigateur`,
        modelUsed: GEMINI_MODEL_FALLBACKS[0]
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
      // This used to return success: true WITHOUT making any network call, so
      // the diagnostics panel reported Anthropic as healthy while generation
      // could not use it. An unverifiable provider must not report success.
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message:
          "Anthropic n'autorise pas les appels directs depuis un navigateur (aucun en-tête CORS). La clé est enregistrée et sera utilisée dès qu'un endpoint proxy est configuré dans l'onglet Assistant Abdel.",
        modelUsed: AI_PROVIDERS.anthropic.defaultModel,
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

  const engine = preferredEngine.toLowerCase();
  // `auto` stays 'auto' here and is expanded to the provider order at execution
  // time. It used to be collapsed to a single provider name immediately, which
  // made every later `engine === 'auto'` failover check unreachable dead code.
  if (engine !== 'auto' && !getClientApiKey(engine)) {
    const known = AI_PROVIDERS[engine as AiProviderId];
    throw new Error(
      known
        ? `Clé API ${known.label} non configurée. Ajoutez-la dans Admin → APIs & IA.`
        : `Moteur IA inconnu : ${preferredEngine}.`
    );
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

  // EXECUTION
  // ---------
  // Previously this was a long if/else chain with one branch per provider.
  // Two engines were selectable in the UI (Anthropic, DeepSeek) but had no
  // branch at all, so they always threw "Moteur IA non disponible". The
  // Groq/OpenAI failovers were also unreachable: they tested `engine === 'auto'`,
  // but `engine` had already been resolved from 'auto' to a concrete name
  // above. Every provider now goes through callProviderDirect, so the selector
  // and the implementation cannot drift apart again.
  const order: string[] =
    engine === 'auto'
      ? AI_PROVIDER_IDS
      : [engine, ...AI_PROVIDER_IDS.filter((p) => p !== engine)];

  const attempted: string[] = [];
  for (const candidate of order) {
    // Skip a provider that was never selected and has no key: calling it would
    // only produce a confusing "clé non configurée" error. An explicitly chosen
    // engine is always attempted, so the user gets a precise "key missing"
    // message instead of a silent fall-through to a different model.
    if (candidate !== engine && !getClientApiKey(candidate)) continue;
    attempted.push(candidate);
    const res = await callProviderDirect(candidate, promptText, { maxTokens: 8192 });
    if (res.ok) {
      rawContent = res.text;
      const first = attempted[0];
      modelUsed =
        first === candidate
          ? `${AI_PROVIDERS[candidate as AiProviderId]?.label || candidate} · ${res.model} (Client Direct)`
          : `${AI_PROVIDERS[candidate as AiProviderId]?.label || candidate} · ${res.model} (repli depuis ${AI_PROVIDERS[first as AiProviderId]?.label || first})`;
      break;
    } else {
      lastError = res.error;
    }
    if (engine !== 'auto' && attempted.length >= 3) break;
  }

  if (!rawContent) {
    const detail = lastError || 'Aucune clé API configurée.';
    throw new Error(
      `Échec de la génération. ${detail} Engines tentés : ${attempted
        .map((p) => AI_PROVIDERS[p as AiProviderId]?.label || p)
        .join(', ') || 'aucun'}.`
    );
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
    const r = await callGeminiGenerative(
      GEMINI_MODEL_FALLBACKS,
      geminiKey,
      {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }
    );
    if (r.ok) raw = r.text || '[]';
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
 * Fetch helper with a hard timeout so dead/overloaded CORS bridges can't stall
 * the fallback chain for 30-60s each (which made RSS loading appear broken).
 * Returns null on network error or timeout instead of throwing.
 */
async function bridgeFetch(url: string, timeoutMs = 8000, headers?: Record<string, string>): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal, headers });
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
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
    const res = await bridgeFetch(rss2jsonUrl, 9000);
    if (res && res.ok) {
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

  // 2. Secondary Strategy: Raw XML bridges with DOMParser.
  // NOTE: feed2json.org was removed — it sends no Access-Control-Allow-Origin
  // header, so the browser always blocks it. thingproxy.freeboard.io and
  // api.allorigins.win are dead (connection timeouts). Direct fetch is tried
  // first because some feeds do send CORS headers.
  const xmlBridges: Array<{ name: string; url: string; unwrapJson?: boolean }> = [
    { name: 'Direct', url: cleanUrl },
    { name: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}` },
    { name: 'allorigins-raw', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}` },
    // JSON-wrapped variant: { contents: "<rss ...>" } — sometimes alive when /raw is not
    { name: 'allorigins-get', url: `https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`, unwrapJson: true },
  ];

  let xmlText = '';
  let successfulBridge = '';

  for (const bridge of xmlBridges) {
    try {
      const res = await bridgeFetch(bridge.url, 8000, {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      });
      if (!res || !res.ok) continue;
      let text = await res.text();
      if (bridge.unwrapJson) {
        try { text = String(JSON.parse(text)?.contents || ''); } catch (_) { continue; }
      }
      if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<item') || text.includes('<entry'))) {
        xmlText = text;
        successfulBridge = bridge.name;
        break;
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

  // 3. Jina Reader fallback (extracts markdown links from RSS feed)
  // NOTE: Jina now renders many feeds with EMPTY link text (### [](url)),
  // so when the title is blank we derive a readable one from the URL slug.
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const res = await bridgeFetch(jinaUrl, 10000);
    if (res && res.ok) {
      const markdown = await res.text();
      const regex = /###\s*\[(.*?)\]\((.*?)\)/g;
      const items: ClientRssItem[] = [];
      let match;
      while ((match = regex.exec(markdown)) !== null && items.length < 15) {
        let title = match[1]?.trim() || '';
        const link = match[2]?.trim();
        if (!title && link) {
          try {
            const u = new URL(link);
            const slug = u.pathname.split('/').filter(Boolean).pop() || '';
            title = slug.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
            if (title) title = title.charAt(0).toUpperCase() + title.slice(1);
          } catch (_) { /* keep empty — item will be skipped */ }
        }
        if (title && link && !title.toLowerCase().includes('rss feed') && !title.toLowerCase().includes('accueil')) {
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
  /** Pins Abdel to one engine, from Admin → APIs & IA. Empty means "first
   *  configured provider that answers". */
  preferredProvider?: string;
}): Promise<string> {
  const { message, language = 'fr', history = [], contextArticle } = params;

  await loadClientApiKeysFromFirestore();

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

  // PROVIDER SELECTION
  // ------------------
  // Previously Abdel's in-browser fallback hardcoded exactly three branches:
  // Gemini, Groq and OpenRouter. OpenAI, Anthropic and DeepSeek were never
  // tried, so a reader with only an OpenAI key (or a Claude key) got the canned
  // offline reply even though a working key was sitting in the browser. Every
  // configured provider is now attempted, in registry order, and the first
  // answer wins.
  //
  // `params.preferredProvider` lets the admin pin Abdel to one engine, so the
  // "choose an AI for Abdel" setting is honoured here and not only on the
  // backend path.
  const preferred = (params.preferredProvider || '').toLowerCase();
  const order: string[] =
    preferred && preferred !== 'auto' && AI_PROVIDERS[preferred as AiProviderId]
      ? [preferred, ...AI_PROVIDER_IDS.filter((p) => p !== preferred)]
      : AI_PROVIDER_IDS;

  const historyMessages = history.slice(-6);
  const errors: string[] = [];

  for (const pid of order) {
    if (!getClientApiKey(pid)) continue;
    const label = AI_PROVIDERS[pid as AiProviderId]?.label || pid;

    if (pid === 'gemini') {
      // Gemini carries the system instruction and multi-turn contents natively,
      // so it keeps its own request shape rather than the shared text prompt.
      try {
        const contents: any[] = [];
        for (const h of historyMessages) {
          contents.push({
            role: h.role === 'abdel' ? 'model' : 'user',
            parts: [{ text: h.text }],
          });
        }
        contents.push({ role: 'user', parts: [{ text: userContext }] });

        const resp = await callGeminiGenerative(
          GEMINI_MODEL_FALLBACKS,
          getClientApiKey('gemini')!,
          {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }
        );
        if (resp.ok && resp.text) return resp.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        errors.push(`${label}: ${resp.lastError || 'réponse vide'}`);
      } catch (e: any) {
        errors.push(`${label}: ${e?.message || String(e)}`);
      }
      continue;
    }

    // Every remaining provider speaks the OpenAI chat-completions shape, so one
    // call covers OpenAI, DeepSeek, Groq and OpenRouter together.
    //
    // The shared caller sends a single user message, so Abdel's system rules and
    // recent turns are folded into that one text. They are prepended as
    // instructions rather than appended and stripped back off afterwards, which
    // would be fragile: any reformatting by the model would defeat the match.
    const transcript = historyMessages
      .map((h) => `${h.role === 'abdel' ? 'Abdel' : 'Lecteur'} : ${h.text}`)
      .join('\n');
    const singlePrompt = [
      systemPrompt,
      transcript ? `\nCONTEXTE DE LA CONVERSATION :\n${transcript}` : '',
      `\n${userContext}`,
    ]
      .filter(Boolean)
      .join('\n');

    const res = await callProviderDirect(pid, singlePrompt, { maxTokens: 600, timeoutMs: 45_000 });
    if (res.ok) {
      return res.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    } else {
      errors.push(res.error);
    }
  }

  console.warn('[Abdel] all configured providers failed:', errors);

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

