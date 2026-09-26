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
// that every reader has to click through — for permissions this app never
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
 * display — and the newsletter "From" used — the literal string
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
  return 'Compte Google connecté';
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
    return "Identifiant client Google introuvable (invalid_client). Copiez à nouveau l'ID client OAuth depuis Google Cloud Console → APIs & Services → Credentials, en vérifiant chaque caractère, puis reconstruisez le site.";
  }
  if (combined.includes('redirect_uri_mismatch') || combined.includes('redirect_uri')) {
    return "Domaine non autorisé (redirect_uri_mismatch). Ajoutez le domaine exact dans « Authorized JavaScript origins » de la console Google, puis sauvegardez.";
  }
  if (combined.includes('access_denied')) {
    return 'Connexion annulée ou autorisations refusées.';
  }
  if (combined.includes('unverified') || combined.includes('developer_verification')) {
    return "Application Google non vérifiée : consent screen → Publish app pour passer en Production.";
  }
  if (combined.includes('popup') || combined.includes('closed') || combined.includes('canceled') || combined.includes('cancelled')) {
    return 'Fenêtre de connexion bloquée ou fermée. Autorisez les fenêtres contextuelles pour ce site, puis réessayez.';
  }

  return description || error || 'Connexion Google refusée.';
}

/**
 * Sign in with Google to grant permission to send mail from your account.
 * Uses Google Identity Services (GIS) — Supabase OAuth fallback removed (audit).
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
      new Error("Identifiant client Google mal formé. Copiez-le intégralement depuis Google Cloud Console (il doit se terminer par .apps.googleusercontent.com), sans guillemets ni espaces.")
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
            // Surface Google's own reason (access_denied, invalid_client, …)
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
            `Connexion Google impossible : ${err?.message || 'la fenêtre de connexion a été bloquée ou fermée'}. Si un bloqueur est actif, autorisez les fenêtres contextuelles pour ce site.`
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

      const data = await res.json();
      if (res.ok) {
        return { success: true, id: data.id };
      }
      if (res.status === 401 || res.status === 403) {
        disconnectGoogleGmail();
      }
    } catch (err: any) {
      // Direct call failed, fall back to server relay service
    }
  }

  // Server proxy route fallback.
  //
  // NOTE: this route does not exist on static Firebase Hosting — an unknown
  // path returns index.html, not JSON. The check below turns that confusing
  // "Unexpected token <" parse crash into an actionable message. Gmail OAuth
  // is the supported send path; see connectGoogleGmail().
  try {
    const res = await fetch(resolveApiUrl('/api/gmail/send'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        htmlBody,
        fromName,
        fromEmail,
        accessToken: token || null
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: 'Relay unavailable: /api/gmail/send did not return JSON (static hosting). Connect Gmail to send.'
      };
    }

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, id: data.id || 'msg-' + Date.now() };
    }
    return { success: false, error: data.error || 'Server mail dispatch failed' };
  } catch (err: any) {
    console.error(`Gmail API send error to ${to}:`, err);
    return { success: false, error: err.message || 'Unknown Gmail API error' };
  }
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
