/**
 * The single registry of AI providers.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Provider knowledge was duplicated across three places that had drifted apart:
 * the article engine hardcoded its own list, the Abdel grid had its own, and
 * the diagnostics tab had a third. They disagreed about which providers exist,
 * which caused two real bugs (see below), so this is now the one source of
 * truth and every surface derives from it.
 *
 * BUG 1 — Anthropic and DeepSeek could never generate an article.
 *   `clientRewriteArticle` had branches for gemini/groq/openai/openrouter and
 *   fell through to `throw` for everything else, while the engine selector
 *   happily offered "Anthropic" and "DeepSeek". Selecting either was guaranteed
 *   to fail. (The Groq/OpenAI failovers were also dead code: the condition
 *   `engine === 'auto' && groqKey` can never be true, because `engine` was
 *   already reassigned from 'auto' to a concrete provider name above it.)
 *
 * BUG 2 — "Test" lied about Anthropic.
 *   `clientTestProvider` for Anthropic returned `success: true` WITHOUT making
 *   any network call. The panel therefore reported Anthropic as working while
 *   generation could not use it at all.
 */

export type AiProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'groq'
  | 'openrouter';

export interface AiProvider {
  id: AiProviderId;
  label: string;
  /** Header your backend receives the key in. */
  header: string;
  /** Direct browser endpoint; empty when the provider cannot be called from a
   *  browser and therefore always needs the backend proxy. */
  directEndpoint: string;
  defaultModel: string;
  /** Why direct browser calls may not work, shown verbatim in the admin UI. */
  directBlockedReason: string;
  /** Header for the direct call, when one is possible. */
  authStyle: 'bearer' | 'query';
  /** Where the key appears in the direct URL, for 'query' auth. */
  keyParam?: string;
  docsUrl: string;
}

export const AI_PROVIDERS: Record<AiProviderId, AiProvider> = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    header: 'x-gemini-key',
    directEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    defaultModel: 'gemini-2.5-flash',
    directBlockedReason: '',
    authStyle: 'query',
    keyParam: 'key',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    header: 'x-openai-key',
    directEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    directBlockedReason: '',
    authStyle: 'bearer',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    header: 'x-anthropic-key',
    directEndpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-latest',
    // Anthropic's API sends no CORS headers for browser origins, so a direct
    // call from the deployed site is blocked by the browser. It must go through
    // the backend proxy, like every other provider, using the x-anthropic-key
    // header.
    directBlockedReason:
      "Anthropic interdit les appels directs depuis un navigateur (pas d'en-têtes CORS). Configurez un endpoint proxy dans l'onglet Assistant Abdel, ou via votre backend.",
    authStyle: 'bearer',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    header: 'x-deepseek-key',
    directEndpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
    directBlockedReason: '',
    authStyle: 'bearer',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    header: 'x-groq-key',
    directEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    directBlockedReason: '',
    authStyle: 'bearer',
    docsUrl: 'https://console.groq.com/keys',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    header: 'x-openrouter-key',
    directEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    directBlockedReason: '',
    authStyle: 'bearer',
    docsUrl: 'https://openrouter.ai/keys',
  },
};

export const AI_PROVIDER_IDS: AiProviderId[] = Object.keys(AI_PROVIDERS) as AiProviderId[];

/** True when the provider can be called straight from the browser. */
export function supportsDirectBrowserCall(id: string): boolean {
  const p = AI_PROVIDERS[id as AiProviderId];
  return !!p && !p.directBlockedReason;
}

/** Model a provider should use, overridable by the admin. */
export function defaultModelFor(id: string): string {
  return AI_PROVIDERS[id as AiProviderId]?.defaultModel || '';
}