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
 * Returns the configured Backend API base URL, if any.
 * Allows custom domains (like senperspective.com on Firebase/Vercel) to point
 * to a dedicated Express backend (e.g. Railway, Render, Cloud Run).
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(BACKEND_URL_STORAGE_KEY) || localStorage.getItem('backend_api_url');
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, '');
  }
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Static-hosting fallback so the deployed Firebase site reaches the API.
  if (isStaticHost()) {
    const fallback = (DEFAULT_STATIC_BACKEND || '').trim().replace(/\/+$/, '');
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
  if (/^https?:\/\//i.test(path) || !path.startsWith('/')) return false;
  if (typeof window === 'undefined') return false;
  return /\.(web\.app|firebaseapp|vercel\.app|netlify\.app|pages\.dev)$/i.test(window.location.hostname);
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

