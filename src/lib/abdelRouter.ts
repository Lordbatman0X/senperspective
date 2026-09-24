/**
 * ABDEL — MULTI-ENDPOINT ROUTER
 * =============================
 * Abdel can be linked to FOUR independent AI backends, each configured
 * separately in Admin → "Assistant Abdel & Chat". Every block has its own
 * endpoint, model, provider key and persona, and they are tried in priority
 * order: the first one that answers wins, the next one takes over when a
 * backend is down, rate-limited or misconfigured.
 *
 *   1. Every enabled slot is called with a single, stable JSON contract so the
 *      same backend code works for OpenAI/Anthropic/Gemini proxies, n8n, Make,
 *      a Cloud Function, a Railway/Cloud-Run Express server, etc.
 *   2. Provider keys travel in dedicated headers (`x-gemini-key`,
 *      `x-openai-key`, ...) — exactly the convention already used by the
 *      article-rewrite and RSS pipelines, so one server implementation can
 *      serve all of them.
 *   3. When ALL slots fail (or none is enabled) the router falls back to the
 *      in-browser client engine, so Abdel never goes silent.
 *
 * This module is deliberately free of any store import: the caller passes the
 * configured slots in, which keeps it side-effect free and testable.
 */
import { getApiBaseUrl, getAuthHeaders, isStaticApiRoute, resolveApiUrl, safeJsonParse } from './apiUtils';
import { clientAbdelChat } from './clientAiEngine';

export type AbdelSlotId = 'slot1' | 'slot2' | 'slot3' | 'slot4';

export type AbdelKeyProvider =
  | 'none'
  | 'gemini'
  | 'openai'
  | 'groq'
  | 'openrouter'
  | 'anthropic'
  | 'deepseek';

export type AbdelSlotRole = 'primary' | 'secondary' | 'tertiary' | 'fallback';

export interface AbdelApiSlot {
  /** Stable id so the admin blocks and the router always agree. */
  id: AbdelSlotId;
  /** Human label shown in the admin + in Abdel's debug footer. */
  label: string;
  role: AbdelSlotRole;
  /** A disabled slot is skipped entirely by the router. */
  enabled: boolean;
  /** Full URL or relative path (e.g. https://api.example.com/api/chat). */
  endpoint: string;
  /** Model id forwarded to the backend (empty = let the backend decide). */
  model: string;
  /** Which stored provider key is sent as a header with the request. */
  keyProvider: AbdelKeyProvider;
  temperature: number;
  /** Optional per-slot persona. Empty = the backend's own Abdel persona. */
  systemPrompt: string;
  /** Lower runs first. 1..4. */
  priority: number;
}

export const ABDEL_SLOT_IDS: AbdelSlotId[] = ['slot1', 'slot2', 'slot3', 'slot4'];

export const ABDEL_SLOT_ROLES: AbdelSlotRole[] = ['primary', 'secondary', 'tertiary', 'fallback'];

export const ABDEL_KEY_PROVIDERS: AbdelKeyProvider[] = [
  'none',
  'gemini',
  'openai',
  'groq',
  'openrouter',
  'anthropic',
  'deepseek',
];

/** Header carrying each provider's key — shared with the other AI pipelines. */
export const ABDEL_PROVIDER_HEADERS: Record<AbdelKeyProvider, string> = {
  none: '',
  gemini: 'x-gemini-key',
  openai: 'x-openai-key',
  groq: 'x-groq-key',
  openrouter: 'x-openrouter-key',
  anthropic: 'x-anthropic-key',
  deepseek: 'x-deepseek-key',
};

/**
 * Out-of-the-box state: all slots are inactive until an operator links a real
 * backend URL. A relative `/api/chat` route would be served by the Firebase
 * SPA fallback, so it must not be presented as a working API.
 */
export const DEFAULT_ABDEL_SLOTS: AbdelApiSlot[] = ABDEL_SLOT_IDS.map((id, i) => ({
  id,
  label: `Abdel AI ${i + 1}`,
  role: ABDEL_SLOT_ROLES[i],
  enabled: false,
  endpoint: '',
  model: '',
  keyProvider: 'none',
  temperature: 0.7,
  systemPrompt: '',
  priority: i + 1,
}));

/**
 * Coerces whatever is stored in `siteSettings.abdelApiSlots` (possibly
 * partial, legacy, or hand-edited JSON) into a complete, safe, ordered list of
 * exactly four slots. Missing fields take the defaults, so a half-configured
 * install can never crash the router.
 */
export function normalizeAbdelSlots(raw: any): AbdelApiSlot[] {
  const list = Array.isArray(raw) ? raw : [];
  const resolved = ABDEL_SLOT_IDS.map((id, i) => {
    const found: any = list.find((s: any) => String(s?.id || '') === id) || {};
    const fallback = DEFAULT_ABDEL_SLOTS[i];
    const temp = Number(found.temperature);
    const priority = Number(found.priority);
    const endpoint = String(found.endpoint || fallback.endpoint).trim();
    const enabledBySetting = found.enabled === undefined
      ? fallback.enabled
      : Boolean(found.enabled);
    // Migrate legacy relative SPA routes away from active settings on static
    // Firebase hosting. Absolute backend URLs and configured API bases stay valid.
    const staticRelative = isStaticApiRoute(endpoint);
    return {
      id,
      label: String(found.label || fallback.label).slice(0, 60),
      role: (ABDEL_SLOT_ROLES as string[]).includes(found.role)
        ? (found.role as AbdelSlotRole)
        : fallback.role,
      enabled: enabledBySetting && !staticRelative,
      endpoint: staticRelative ? '' : endpoint,
      model: String(found.model || '').trim(),
      keyProvider: (ABDEL_KEY_PROVIDERS as string[]).includes(found.keyProvider)
        ? (found.keyProvider as AbdelKeyProvider)
        : 'none',
      temperature: Number.isFinite(temp) ? Math.min(2, Math.max(0, temp)) : fallback.temperature,
      systemPrompt: String(found.systemPrompt || ''),
      priority: Number.isFinite(priority) ? priority : fallback.priority,
    } as AbdelApiSlot;
  });
  return resolved.sort((a, b) => a.priority - b.priority);
}

/**
 * Pulls the answer text out of the many shapes a backend may return:
 *   { response } · { reply } · { text } · { output } · { answer } · { message }
 *   { choices: [{ message: { content } }] }                (OpenAI)
 *   { candidates: [{ content: { parts: [{ text }] } }] }   (Gemini)
 * Returns '' when nothing usable is found.
 */
export function extractAbdelText(data: any): string {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  const direct =
    data.response ?? data.reply ?? data.text ?? data.output ?? data.answer ?? data.result ?? data.content;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
  const openAi = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;
  if (typeof openAi === 'string' && openAi.trim()) return openAi.trim();
  const gemini = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof gemini === 'string' && gemini.trim()) return gemini.trim();
  return '';
}

export interface AbdelAskParams {
  message: string;
  language?: string;
  history?: Array<{ role: string; text: string }>;
  contextArticle?: any;
  locationInfo?: any;
  /**
   * Optional provider preference coming from the admin setting
   * `siteSettings.abdelAiProvider`. Forwarded to the backend as a hint so an
   * operator can pin a provider without touching the slot routing.
   */
  providerHint?: string;
}

export interface AbdelAskResult {
  text: string;
  /** 'slot' = answered by an admin-configured backend, 'client' = in-browser engine. */
  source: 'slot' | 'client';
  slotId?: AbdelSlotId;
  slotLabel?: string;
  endpoint?: string;
  /** Non-fatal diagnostics (which endpoints failed, and why). */
  error?: string;
}

export interface AbdelAskOptions {
  /** Per-attempt network timeout. */
  timeoutMs?: number;
  /** Skips the in-browser engine and returns empty text on failure. */
  skipClientFallback?: boolean;
  /** Called after each attempt so the UI can show live progress. */
  onAttempt?: (info: { slot: AbdelApiSlot; ok: boolean; error?: string }) => void;
}

/** One POST to one admin-configured backend. Never throws. */
export async function callAbdelSlot(
  slot: AbdelApiSlot,
  params: AbdelAskParams,
  timeoutMs = 25000
): Promise<{ ok: boolean; text: string; error?: string }> {
  const url = resolveApiUrl(slot.endpoint || '/api/chat');
  const isFrench = (params.language || 'fr') === 'fr';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    'x-abdel-slot': slot.id,
    'x-abdel-slot-role': slot.role,
    'x-abdel-language': isFrench ? 'fr' : 'en',
  };
  if (slot.model) headers['x-abdel-model'] = slot.model;
  // The provider key header is only meaningful when the slot declares one;
  // getAuthHeaders() already carries every key this browser holds.
  const providerHeader = ABDEL_PROVIDER_HEADERS[slot.keyProvider];
  if (providerHeader && headers[providerHeader]) {
    headers['x-abdel-key-source'] = slot.keyProvider;
  }

  const body = {
    message: params.message,
    language: params.language || 'fr',
    model: slot.model || undefined,
    temperature: slot.temperature,
    systemPrompt: slot.systemPrompt || undefined,
    providerHint: params.providerHint || undefined,
    history: (params.history || []).slice(-8).map(h => ({
      role: h.role === 'abdel' ? 'assistant' : 'user',
      content: h.text,
    })),
    locationInfo: params.locationInfo || null,
    context: params.contextArticle
      ? {
          title:
            params.contextArticle?.title?.[params.language || 'fr'] ||
            params.contextArticle?.title?.fr ||
            '',
          category: params.contextArticle?.category || '',
          excerpt:
            params.contextArticle?.excerpt?.[params.language || 'fr'] ||
            params.contextArticle?.excerpt?.fr ||
            '',
        }
      : null,
    slot: { id: slot.id, label: slot.label, role: slot.role },
  };

  const configuredEndpoint = String(slot.endpoint || '').trim();
  if (!configuredEndpoint) {
    return {
      ok: false,
      text: '',
      error: 'Aucun endpoint API configuré. Renseignez une URL backend absolue.',
    };
  }
  // A relative /api route on Firebase Hosting is the SPA fallback, never an API.
  // Avoid a request that can only return index.html and give the admin a useful fix.
  if (isStaticApiRoute(configuredEndpoint)) {
    return {
      ok: false,
      text: '',
      error: 'Route API relative indisponible sur l’hébergement statique. Configurez une URL backend absolue (VITE_API_BASE_URL ou Admin → API).',
    };
  }
  let timer: number | null = null;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (controller) {
      timer = window.setTimeout(() => {
        try {
          controller.abort();
        } catch {
          /* ignore */
        }
      }, timeoutMs);
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify(body),
    });

    const raw = await res.text().catch(() => '');
    const trimmed = (raw || '').trim();

    // A static host answers unknown /api/* routes with the SPA index.html.
    if (trimmed.startsWith('<')) {
      return { ok: false, text: '', error: 'endpoint a renvoyé du HTML (hébergement statique / route absente)' };
    }

    const parsed = trimmed ? safeJsonParse<any>(trimmed, null) : null;

    if (!res.ok) {
      return {
        ok: false,
        text: '',
        error: `HTTP ${res.status}${parsed?.error ? ` — ${parsed.error}` : ''}`,
      };
    }

    const text = extractAbdelText(parsed ?? trimmed);
    if (!text) return { ok: false, text: '', error: 'réponse vide' };
    return { ok: true, text };
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return {
      ok: false,
      text: '',
      error: aborted ? `timeout ${Math.round(timeoutMs / 1000)}s` : err?.message || 'erreur réseau',
    };
  } finally {
    if (timer !== null) window.clearTimeout(timer);
  }
}

/**
 * THE ABDEL ROUTER.
 *
 * Tries every enabled slot in priority order; the first real answer wins.
 * Falls back to the in-browser client engine when every backend is
 * unreachable, so the reader always gets an answer.
 */
export async function askAbdel(
  params: AbdelAskParams,
  slots?: AbdelApiSlot[] | null,
  options?: AbdelAskOptions
): Promise<AbdelAskResult> {
  const normalized = normalizeAbdelSlots(slots);
  const usable = normalized.filter(s => s.enabled && String(s.endpoint || '').trim());
  const failures: string[] = [];

  for (const slot of usable) {
    const attempt = await callAbdelSlot(slot, params, options?.timeoutMs ?? 25000);
    options?.onAttempt?.({ slot, ok: attempt.ok, error: attempt.error });
    if (attempt.ok && attempt.text) {
      return {
        text: attempt.text,
        source: 'slot',
        slotId: slot.id,
        slotLabel: slot.label,
        endpoint: slot.endpoint,
      };
    }
    failures.push(`${slot.label || slot.id}: ${attempt.error || 'échec'}`);
  }

  if (options?.skipClientFallback) {
    return { text: '', source: 'client', error: failures.join(' | ') };
  }

  // Last line of defence — the existing in-browser engine.
  try {
    const text = await clientAbdelChat({
      message: params.message,
      language: params.language,
      history: params.history,
      contextArticle: params.contextArticle,
      locationInfo: params.locationInfo,
    } as any);
    if (text && typeof text === 'string' && text.trim()) {
      return { text: text.trim(), source: 'client' };
    }
    failures.push('moteur local: réponse vide');
  } catch (err: any) {
    failures.push(`moteur local: ${err?.message || 'erreur'}`);
  }

  return { text: '', source: 'client', error: failures.join(' | ') };
}
