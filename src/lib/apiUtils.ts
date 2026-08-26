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
    const headers = { ...(mergedOptions.headers || {}) } as Record<string, string>;

    const gemini = localStorage.getItem('api_key_gemini');
    const openai = localStorage.getItem('api_key_openai');
    const groq = localStorage.getItem('api_key_groq');
    const openrouter = localStorage.getItem('api_key_openrouter');

    if (gemini) headers['x-gemini-key'] = gemini;
    if (openai) headers['x-openai-key'] = openai;
    if (groq) headers['x-groq-key'] = groq;
    if (openrouter) headers['x-openrouter-key'] = openrouter;

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

