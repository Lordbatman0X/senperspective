/**
 * Storage keys for custom backend API URL
 */
const BACKEND_URL_STORAGE_KEY = 'perspective_backend_api_url';

/**
 * Default API base used when the app is served from a STATIC host
 * (Firebase Hosting) where a relative `/api` call would
 * hit the static site instead of the backend. 
 * Set your Firebase Function URL or MongoDB Atlas App Service URL here.
 * Overridable per-user in Admin → API, or via VITE_BACKEND_URL env var.
 */
export const DEFAULT_STATIC_BACKEND = '';

function isStaticHost(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const host = window.location.hostname || '';
  // Render/Express serve the site AND the API from the same origin → relative works.
  // Firebase Vercel Netlify static hosts have no backend → we must point elsewhere.
  return /\.(web\.app|firebaseapp|vercel\.app|netlify\.app|pages\.dev)$/i.test(host) || host === 'localhost' || host === '127.0.0.1';
}

/**
 * Normalises a hand-entered backend base URL to a usable http(s) origin,
 * or '' when it is not one.
 *
 * WHY: `getApiBaseUrl` used to return whatever was stored/env'd with only the
 * trailing slashes trimmed, so a value typed without a scheme — the natural
 * inputs `localhost:3000`, `//localhost:3000`, or a bare `https://` — was
 * concatenated by `resolveApiUrl` into an invalid URL. `fetch` then threw
 * "Failed to parse URL from //" on EVERY `/api/...` call (config, chat, RSS),
 * which looked like a dead backend rather than a typo. `new URL('localhost:3000')`
 * even *succeeds* with protocol `localhost:`, so a naive parse is not enough —
 * the scheme must be explicitly http/https and a host must be present.
 *
 * Returning '' for anything invalid makes the value "unset": `resolveApiUrl`
 * falls back to a clean relative path (same-origin) instead of building a URL
 * that cannot be fetched, and the Admin save button's existing "Invalid URL"
 * feedback becomes truthful.
 */
export function normalizeBackendBase(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return '';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
  if (!u.hostname) return '';
  // Keep origin + any mount path (some proxies serve under /base), drop the
  // trailing slash, query and hash so concatenation with a `/api/...` path is
  // always clean.
  const path = u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, '');
  return `${u.origin}${path}`;
}

/**
 * Returns the configured Backend API base URL, if any.
 * Allows custom domains (like senperspective.com on Firebase/Vercel) to point
 * to a dedicated Express backend (e.g. Railway, Render, Cloud Run).
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(BACKEND_URL_STORAGE_KEY) || localStorage.getItem('backend_api_url');
  if (stored && stored.trim()) {
    const normalized = normalizeBackendBase(stored);
    if (normalized) return normalized;
  }
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    const normalized = normalizeBackendBase(envUrl);
    if (normalized) return normalized;
  }
  // Static-hosting fallback so the deployed Firebase site reaches the API.
  if (isStaticHost()) {
    const fallback = normalizeBackendBase(DEFAULT_STATIC_BACKEND);
    if (fallback) return fallback;
  }
  return '';
}

/**
 * Sets or clears the configured Backend API base URL
 */
export function setApiBaseUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(BACKEND_URL_STORAGE_KEY);
    localStorage.removeItem('backend_api_url');
  } else {
    localStorage.setItem(BACKEND_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  }
}

/**
 * Resolves an API path (e.g. /api/ai/...) against the configured Backend URL if needed
 */
export function resolveApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getApiBaseUrl();
  if (base) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  return path;
}

/** True when a relative API route would be served by a static SPA host. */
export function isStaticApiRoute(path: string): boolean {
  if (!path || /^(data|javascript):/i.test(path)) return true;
  if (/^https?:\/\//i.test(path)) {
    if (typeof window === 'undefined') return false;
    try {
      const endpointUrl = new URL(path);
      // Firebase Hosting rewrites unknown API paths to index.html. The
      // current site origin and the known Firebase host variants must never
      // be treated as AI backends, even if another base URL is configured.
      const firebaseHost = /\.(web\.app|firebaseapp\.com)$/i.test(endpointUrl.hostname);
      return firebaseHost || endpointUrl.origin === window.location.origin;
    } catch {
      return true;
    }
  }
  if (!path.startsWith('/')) return true;
  // Local Express/Vite development serves the API on the same origin.
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.hostname)) {
    return false;
  }
  // A relative endpoint has no server to target unless an explicit backend
  // base is configured. This also covers Firebase custom domains (for example
  // senperspective.com), which are not matched by the *.web.app regex.
  return !getApiBaseUrl();
}

/**
 * Returns authorization and AI provider headers stored in localStorage
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  if (typeof window !== 'undefined' && window.localStorage) {
    const gemini = localStorage.getItem('api_key_gemini') || localStorage.getItem('GEMINI_API_KEY');
    const openai = localStorage.getItem('api_key_openai') || localStorage.getItem('OPENAI_API_KEY');
    const groq = localStorage.getItem('api_key_groq') || localStorage.getItem('GROQ_API_KEY');
    const openrouter = localStorage.getItem('api_key_openrouter') || localStorage.getItem('OPENROUTER_API_KEY');
    const anthropic = localStorage.getItem('api_key_anthropic') || localStorage.getItem('ANTHROPIC_API_KEY');
    const deepseek = localStorage.getItem('api_key_deepseek') || localStorage.getItem('DEEPSEEK_API_KEY');

    if (gemini && gemini.trim()) headers['x-gemini-key'] = gemini.trim();
    if (openai && openai.trim()) headers['x-openai-key'] = openai.trim();
    if (groq && groq.trim()) headers['x-groq-key'] = groq.trim();
    if (openrouter && openrouter.trim()) headers['x-openrouter-key'] = openrouter.trim();
    if (anthropic && anthropic.trim()) headers['x-anthropic-key'] = anthropic.trim();
    if (deepseek && deepseek.trim()) headers['x-deepseek-key'] = deepseek.trim();
  }

  return headers;
}

/**
 * Crash-proof JSON parsing — a corrupted localStorage blob must NEVER
 * white-screen the app behind the ErrorBoundary.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/**
 * Result returned by safeFetchJson
 */
export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  isStaticFallback?: boolean;
}

/**
 * Safely fetches an API endpoint and parses JSON.
 * Prevents "Unexpected token 'A' / '<'" syntax errors when server returns HTML/text error pages.
 * Detects static hosting SPA fallbacks (e.g. index.html returned by Firebase Hosting on custom domains).
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const resolvedUrl = resolveApiUrl(url);
    const mergedOptions = { ...options };
    const authHeaders = getAuthHeaders();
    const headers = { ...authHeaders, ...(mergedOptions.headers || {}) } as Record<string, string>;

    mergedOptions.headers = headers;

    const res = await fetch(resolvedUrl, mergedOptions);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    // Check if the response is an HTML page (like index.html served by Firebase Hosting / CDN SPA rewrite)
    const isHtml = 
      contentType.toLowerCase().includes('text/html') ||
      text.trim().startsWith('<!doctype') ||
      text.trim().startsWith('<!DOCTYPE') ||
      text.trim().startsWith('<html') ||
      text.includes('<html lang=') ||
      text.includes('<title>Perspective Group');

    if (isHtml) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'ce domaine';
      return {
        ok: false,
        status: res.status,
        isStaticFallback: true,
        error: `Mode hébergement statique actif sur ${hostname} (réponse HTML du site au lieu de l'API JSON). Basculement automatique sur le moteur direct et Firestore.`
      };
    }

    let data: any = null;
    let isJson = false;

    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
        isJson = true;
      } catch (_) {
        isJson = false;
      }
    }

    if (isJson) {
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          data,
          error: data?.error || data?.message || `Erreur serveur (${res.status})`
        };
      }
      return { ok: true, status: res.status, data };
    }

    // Response was not JSON and not recognizable HTML
    const cleanMsg = (text || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const preview = cleanMsg.slice(0, 160) || `Erreur HTTP ${res.status}`;

    return {
      ok: false,
      status: res.status,
      error: `Réponse inattendue (${res.status}): ${preview}`
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Erreur de connexion au serveur'
    };
  }
}

