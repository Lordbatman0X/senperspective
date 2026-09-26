import { resolveApiUrl } from './apiUtils';

type User = any;

let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('pg_google_access_token') : null;
let cachedUser: User | null = null;
let cachedUserEmail: string | null = typeof window !== 'undefined' ? localStorage.getItem('pg_google_user_email') : null;

// ONLY the scope newsletter sending actually needs.
//
// This previously requested four scopes: `spreadsheets`, `gmail.send`,
// `gmail.readonly` and `gmail.compose`. `gmail.send` alone is sufficient to
// POST a message, and the other three made the consent screen far worse:
// because they are sensitive scopes, Google flags a new client as
// "unverified" and shows a red "Google hasn't verified this app" warning page
// that every reader has to click through â€” for permissions this app never
// uses. Dropping them removes that warning.
//
// The Sheets scope in particular was dead weight: `appendSubscriberToGoogleSheet`
// is never called anywhere in the app, and its own guard skips its default
// placeholder spreadsheet id, so the subscriber-sheet sync was unreachable
// code. If it is ever revived it should request its own scope separately, not
// piggyback on the newsletter connection.
const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
];

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisLoadPromise: Promise<void> | null = null;

/**
 * The OAuth client id.
 *
 * Read from the build-time env so it works on any deploy, with the legacy
 * `window.__GOOGLE_CLIENT_ID__` kept as a fallback for anyone still injecting
 * it by hand. It used to read ONLY that global, which nothing in this codebase
 * ever set, so every "Connect Google" click died with "Google Identity
 * Services not loaded" before the account picker could appear.
 */
export function getGoogleClientId(): string {
  const fromEnv = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  if (typeof window !== 'undefined') {
    const injected = (window as any).__GOOGLE_CLIENT_ID__;
    if (typeof injected === 'string' && injected.trim()) return injected.trim();
  }
  return '';
}

/**
 * Shape check for an OAuth web client id, run before the network call.
 *
 * A real one is `<digits>-<43 base64url chars>.apps.googleusercontent.com`.
 * This catches a stray quote, a truncated paste, or whitespace, which are
 * otherwise indistinguishable from a deleted client and surface as the very
 * unhelpful `invalid_client` from Google's own error page.
 */
function looksLikeGoogleClientId(id: string): boolean {
  return /^[0-9]+-[a-zA-Z0-9_-]{20,}\.apps\.googleusercontent\.com$/.test(id);
}

/**
 * Loads the Google Identity Services script on demand.
 *
 * It was never loaded anywhere before, so `window.google.accounts.oauth2` did
 * not exist and the token client could not be constructed. Injecting it here
 * (rather than a blocking <script> in index.html) means the admin suite only
 * pays for it when someone actually connects an account, and a failure becomes
 * a catchable error instead of a permanently dead button.
 */
function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Connexion Google indisponible hors navigateur.'));
  }
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    const fail = () => {
      gisLoadPromise = null;
      reject(new Error('Le module Google Identity Services n\u2019a pas pu \u00eatre charg\u00e9. V\u00e9rifiez votre connexion.'));
    };
    const timer = window.setTimeout(fail, 15000);

    script.addEventListener('load', () => { window.clearTimeout(timer); resolve(); }, { once: true });
    script.addEventListener('error', () => { window.clearTimeout(timer); fail(); }, { once: true });
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    if (!existing) document.head.appendChild(script);
  });

  return gisLoadPromise;
}

/**
 * Resolves the connected account's real address.
 *
 * A granted OAuth token carries no identity of its own, so the UI used to
 * display â€” and the newsletter "From" used â€” the literal string
 * "connected-user@google.com". Reading the real address from the OpenID
 * userinfo endpoint makes the connected badge trustworthy, and keeps a
 * genuinely unknown identity visibly unknown instead of invented.
 */
async function fetchGoogleUserEmail(token: string): Promise<string> {
  try {
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data?.email) return String(data.email);
    }
  } catch {
    /* fall through to the token-free path */
  }
  return 'Compte Google connectÃ©';
}

/**
 * Turns Google's OAuth failure into something actionable.
 *
 * `invalid_client` is the one that wastes the most time: it does NOT mean the
 * user's account or consent screen is wrong, it means Google could not find
 * the client id we sent. In practice that is a mistyped or truncated client id
 * (often a character dropped when copying a 70+ character string), or a client
 * that was deleted in the Cloud console. Spelling that out saves re-checking
 * the authorized origins, which are not the cause.
 */
function explainGoogleOAuthError(error: string, description: string): string {
  const combined = `${error} ${description}`.toLowerCase();

  if (combined.includes('invalid_client')) {
    return "Identifiant client Google introuvable (invalid_client). Copiez Ã  nouveau l'ID client OAuth depuis Google Cloud Console â†’ APIs & Services â†’ Credentials, en vÃ©rifiant chaque caractÃ¨re, puis reconstruisez le site.";
  }
  if (combined.includes('redirect_uri_mismatch') || combined.includes('redirect_uri')) {
    return "Domaine non autorisÃ© (redirect_uri_mismatch). Ajoutez le domaine exact dans Â« Authorized JavaScript origins Â» de la console Google, puis sauvegardez.";
  }
  if (combined.includes('access_denied')) {
    return 'Connexion annulÃ©e ou autorisations refusÃ©es.';
  }
  if (combined.includes('unverified') || combined.includes('developer_verification')) {
    return "Application Google non vÃ©rifiÃ©e : consent screen â†’ Publish app pour passer en Production.";
  }
  if (combined.includes('popup') || combined.includes('closed') || combined.includes('canceled') || combined.includes('cancelled')) {
    return 'FenÃªtre de connexion bloquÃ©e ou fermÃ©e. Autorisez les fenÃªtres contextuelles pour ce site, puis rÃ©essayez.';
  }

  return description || error || 'Connexion Google refusÃ©e.';
}

/**
 * Sign in with Google to grant permission to send mail from your account.
 * Uses Google Identity Services (GIS) â€” Supabase OAuth fallback removed (audit).
 */
export async function connectGoogleGmail(): Promise<{ user: User; accessToken: string }> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return Promise.reject(
      new Error("Identifiant client Google manquant : ajoutez VITE_GOOGLE_CLIENT_ID dans .env, puis recompilez.")
    );
  }
  // Catch a malformed value here, where the cause is obvious, instead of
  // letting Google answer `invalid_client` from its own error page.
  if (!looksLikeGoogleClientId(clientId)) {
    return Promise.reject(
      new Error("Identifiant client Google mal formÃ©. Copiez-le intÃ©gralement depuis Google Cloud Console (il doit se terminer par .apps.googleusercontent.com), sans guillemets ni espaces.")
    );
  }

  // The script must exist before initTokenClient can be called.
  await loadGoogleIdentityServices();

  const g = (window as any).google?.accounts?.oauth2;
  if (!g) {
    return Promise.reject(new Error('Google Identity Services not loaded'));
  }

  return new Promise((resolve, reject) => {
    try {
      const client = g.initTokenClient({
        client_id: clientId,
        scope: WORKSPACE_SCOPES.join(' '),
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            // Surface Google's own reason (access_denied, invalid_client, â€¦)
            // instead of rejecting with a bare object, which is why this failure
            // was impossible to diagnose from the UI.
            reject(new Error(explainGoogleOAuthError(
              tokenResponse.error || '',
              tokenResponse.error_description || ''
            )));
            return;
          }
          const accessToken = tokenResponse.access_token;
          // The token response carries NO identity. It used to be stored as the
          // literal "connected-user@google.com", so the UI showed a fake address
          // and the newsletter "From" used it. Ask Google who the token is for.
          const email = await fetchGoogleUserEmail(accessToken);
          cachedAccessToken = accessToken;
          cachedUser = { email };
          cachedUserEmail = email;
          if (typeof window !== 'undefined') {
            localStorage.setItem('pg_google_access_token', accessToken);
            localStorage.setItem('pg_google_user_email', email);
          }
          resolve({ user: cachedUser, accessToken });
        },
        error_callback: (err: any) => {
          reject(new Error(
            `Connexion Google impossible : ${err?.message || 'la fenÃªtre de connexion a Ã©tÃ© bloquÃ©e ou fermÃ©e'}. Si un bloqueur est actif, autorisez les fenÃªtres contextuelles pour ce site.`
          ));
        },
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Get current Google OAuth Access Token
 */
export function getCachedGoogleToken(): string | null {
  return cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('pg_google_access_token') : null);
}

export function getCachedGoogleUser(): User | null {
  return cachedUser;
}

export function getCachedGoogleEmail(): string | null {
  return cachedUserEmail || cachedUser?.email || (typeof window !== 'undefined' ? localStorage.getItem('pg_google_user_email') : null);
}

/**
 * Disconnect Google Account
 */
export async function disconnectGoogleGmail(): Promise<void> {
  cachedAccessToken = null;
  cachedUser = null;
  cachedUserEmail = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pg_google_access_token');
    localStorage.removeItem('pg_google_user_email');
  }
}


/**
 * Helper to encode UTF-8 string to base64url format for Gmail API
 */
function encodeMimeMessage(to: string, subject: string, bodyHtml: string, fromName?: string, fromEmail?: string): string {
  const senderHeader = fromEmail 
    ? `From: ${fromName ? `"${fromName}" ` : ''}<${fromEmail}>`
    : '';

  const headers = [
    `To: ${to}`,
    senderHeader,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    ''
  ].filter(Boolean).join('\r\n');

  const fullMessage = `${headers}\r\n${bodyHtml}`;

  return btoa(unescape(encodeURIComponent(fullMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email via Gmail REST API using the cached OAuth Access Token or Server Relay
 */
export async function sendEmailViaGmailApi({
  to,
  subject,
  htmlBody,
  accessToken,
  fromName,
  fromEmail
}: {
  to: string;
  subject: string;
  htmlBody: string;
  accessToken?: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const token = accessToken || cachedAccessToken;

  // If token is present, try client-side direct call
  if (token) {
    try {
      const rawMessage = encodeMimeMessage(to, subject, htmlBody, fromName, fromEmail);
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawMessage })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, id: data.id };
      }

      // FIX (send failed with no usable message): every non-OK response used to
      // fall through to the server-relay branch below, which threw away Google's
      // actual error and then reported a misleading "relay unavailable / static
      // hosting" message. The admin was told the server was the problem while
      // the real cause â€” an expired token, a missing gmail.send scope, a
      // malformed message â€” was discarded, leaving no way to act on it.
      // The Gmail error is now returned verbatim and translated below.
      if (res.status === 401 || res.status === 403) {
        await disconnectGoogleGmail();
      }
      return {
        success: false,
        error: describeGmailSendFailure(res.status, data),
      };
    } catch (err: any) {
      // A thrown error here is a transport problem (offline, blocked by an
      // extension), not a Gmail rejection. Report it as such rather than
      // silently retrying a relay that does not exist on static hosting.
      return {
        success: false,
        error: `Connexion Ã  Gmail impossible : ${err?.message || 'erreur rÃ©seau'}`,
      };
    }
  }

  // No token at all. The server relay is NOT a real fallback on static hosting,
  // so say that plainly instead of attempting a request that can only return
  // the SPA index.html.
  return {
    success: false,
    error: "Aucun compte Gmail connectÃ©. Cliquez sur Â« Connecter Google Â» puis rÃ©essayez.",
  };
}

/**
 * Turns a Gmail API rejection into an instruction the admin can follow.
 */
function describeGmailSendFailure(status: number, data: any): string {
  const reason = data?.error?.message || data?.error_description || data?.error || '';

  if (status === 401) {
    return 'Jeton expirÃ© ou rÃ©voquÃ© (401). Le compte a Ã©tÃ© dÃ©connectÃ© â€” reconnectez Gmail, puis renvoyez.';
  }
  if (status === 403) {
    if (/insufficient|scope|permission/i.test(reason)) {
      return "PortÃ©e insuffisante (403) : le compte connectÃ© n'a pas l'autorisation gmail.send. Reconnectez le compte et acceptez la permission d'envoi.";
    }
    if (/quota|daily limit|rate/i.test(reason)) {
      return `Quota d'envoi Gmail atteint (403). ${reason}`;
    }
    return `Envoi refusÃ© par Gmail (403) : ${reason || 'permission insuffisante'}`;
  }
  if (status === 400) {
    return `Message refusÃ© par Gmail (400) : ${reason || 'format invalide'}`;
  }
  if (status === 404) {
    return "Compte Gmail introuvable (404). Reconnectez le compte.";
  }
  if (status >= 500) {
    return `Erreur temporaire du service Gmail (${status}). RÃ©essayez dans quelques instants.`;
  }
  return `Ã‰chec de l'envoi Gmail (${status})${reason ? ` : ${reason}` : ''}`;
}

/**
 * Send a Google Chat Webhook message via server route (bypasses CORS) or direct fetch
 */
export async function sendGoogleChatMessage(webhookUrl: string, text: string): Promise<boolean> {
  // Try server proxy first to avoid CORS issues
  try {
    const res = await fetch(resolveApiUrl('/api/google-chat/send'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, text })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return true;
    }
  } catch (e) {
    console.warn('Server proxy for Google Chat failed, trying direct webhook:', e);
  }

  // Direct fetch fallback
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return res.ok;
  } catch (e) {
    console.error('Google Chat webhook direct error:', e);
    return false;
  }
}
