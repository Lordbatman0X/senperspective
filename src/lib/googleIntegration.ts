import { resolveApiUrl } from './apiUtils';

type User = any;

let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('pg_google_access_token') : null;
let cachedUser: User | null = null;
let cachedUserEmail: string | null = typeof window !== 'undefined' ? localStorage.getItem('pg_google_user_email') : null;

const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose'
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
 * Sign in with Google to grant Gmail + Sheets permissions.
 * Uses Google Identity Services (GIS) — Supabase OAuth fallback removed (audit).
 */
export async function connectGoogleGmail(): Promise<{ user: User; accessToken: string }> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return Promise.reject(
      new Error("Identifiant client Google manquant : ajoutez VITE_GOOGLE_CLIENT_ID dans .env, puis recompilez.")
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
            reject(new Error(
              tokenResponse.error === 'access_denied'
                ? 'Connexion annulée ou autorisations refusées.'
                : `Connexion Google refusée : ${tokenResponse.error_description || tokenResponse.error}`
            ));
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
 * Append subscriber row to a Google Sheet via Google Sheets API (or server proxy)
 */
export async function appendSubscriberToGoogleSheet({
  email,
  date,
  topics,
  language,
  spreadsheetId = '1PerspectiveSubscribers_Default',
  accessToken
}: {
  email: string;
  date: string;
  topics: string;
  language: string;
  spreadsheetId?: string;
  accessToken?: string;
}): Promise<{ success: boolean; updatedRange?: string; error?: string }> {
  const token = accessToken || cachedAccessToken;

  // First try direct Google Sheets REST API if token is available
  if (token && spreadsheetId && !spreadsheetId.includes('Default')) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [
            [email, date, topics, language, 'Active Subscriber', new Date().toISOString()]
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, updatedRange: data.updates?.updatedRange };
      }
    } catch (e) {
      console.warn('Direct Google Sheets REST API call failed, trying server proxy:', e);
    }
  }

  // Fallback to server proxy route `/api/sheets/append`
  try {
    const res = await fetch(resolveApiUrl('/api/sheets/append'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        date,
        topics,
        language,
        spreadsheetId,
        accessToken: token || null
      })
    });

    const data = await res.json();
    return { success: !!data.success, updatedRange: data.updatedRange, error: data.error };
  } catch (err: any) {
    console.error('Failed to append subscriber to Google Sheets:', err);
    return { success: false, error: err.message || 'Sheets append error' };
  }
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
