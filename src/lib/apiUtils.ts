/**
 * Storage keys for custom backend API URL
 */
const BACKEND_URL_STORAGE_KEY = 'perspective_backend_api_url';

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
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
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
        error: `Serveur API Express non connecté sur ${hostname} (réponse HTML du site au lieu de l'API JSON). Vous pouvez configurer l'URL de votre serveur backend dans l'onglet Diagnostics ou utiliser les clés directes du navigateur.`
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

