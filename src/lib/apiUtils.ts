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
 * Safely fetches an API endpoint and parses JSON.
 * Prevents "Unexpected token 'A' / '<'" syntax errors when server returns HTML/text error pages.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const mergedOptions = { ...options };
    const authHeaders = getAuthHeaders();
    const headers = { ...authHeaders, ...(mergedOptions.headers || {}) } as Record<string, string>;

    mergedOptions.headers = headers;

    const res = await fetch(url, mergedOptions);
    const text = await res.text();

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

    // Response was not JSON (e.g. plain text or HTML error page)
    const cleanMsg = (text || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const preview = cleanMsg.slice(0, 160) || `Erreur HTTP ${res.status}`;

    return {
      ok: false,
      status: res.status,
      error: `Réponse du serveur (${res.status}): ${preview}`
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Erreur de connexion au serveur'
    };
  }
}

