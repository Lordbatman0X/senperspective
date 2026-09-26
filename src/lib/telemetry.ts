/**
 * Real User Telemetry & Audience Analytics Client
 * Sends consented reader metrics, pageviews, and commercial conversion events to Firebase Firestore
 */

import { saveFirestoreDoc } from '../firebase/db';

const STORAGE_SESSION_KEY = 'perspective_analytics_session_id';
const STORAGE_CONSENT_KEY = 'perspective_cookie_consent';

/** A session ends after this much idle time, matching common analytics convention. */
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_SESSION_TS = 'perspective_analytics_session_ts';
const STORAGE_DEVICE_KEY = 'perspective_analytics_device';

/**
 * Return a session id that expires after 30 minutes of inactivity.
 *
 * Previously the id was written to localStorage and never expired, so a single
 * browser produced exactly one "session" for the lifetime of the install. Every
 * unique-visitor and session count derived from that was wrong, and
 * duration-per-session metrics were meaningless because no session ever ended.
 *
 * The timestamp is refreshed on every call, so active reading keeps the session
 * alive and a genuine break in reading starts a new one.
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  const now = Date.now();
  let sid = localStorage.getItem(STORAGE_SESSION_KEY);
  const lastSeen = Number(localStorage.getItem(STORAGE_SESSION_TS) || '0');

  const expired = !sid || !lastSeen || now - lastSeen > SESSION_IDLE_MS;
  if (expired) {
    sid = 'sess_' + now + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(STORAGE_SESSION_KEY, sid);
  }
  try {
    localStorage.setItem(STORAGE_SESSION_TS, String(now));
  } catch {
    // Private mode: the id still works for this page view.
  }
  return sid;
}

/**
 * Stable device type for the lifetime of the session.
 *
 * This used to read window.innerWidth on every call, so one reader was counted
 * as "Desktop" and "Mobile" in the same session as soon as they rotated or
 * resized the window. Pinning the value to the session keeps one reader
 * classified as one device.
 */
export function getDeviceType(): string {
  if (typeof window === 'undefined') return 'Desktop';
  try {
    const pinned = sessionStorage.getItem(STORAGE_DEVICE_KEY);
    if (pinned) return pinned;
    const detected = detectDeviceType();
    sessionStorage.setItem(STORAGE_DEVICE_KEY, detected);
    return detected;
  } catch {
    return detectDeviceType();
  }
}

function detectDeviceType(): string {
  const width = window.innerWidth;
  if (width < 640) return 'Mobile';
  if (width < 1024) return 'Tablet';
  return 'Desktop';
}

/**
 * Reads the stored consent choice.
 *
 * IMPORTANT: when nothing has been stored, this reports analytics and
 * personalization as FALSE, not true. A visitor who has not yet chosen must be
 * treated as un-consented; assuming consent would start pageview tracking
 * before the reader has been asked, which is the opposite of what the banner
 * promises. "Essential" stays true because the site cannot function without it.
 *
 * Once a choice IS stored, it is returned verbatim — including an explicit
 * rejection — so a user who says "essentials only" keeps that choice on every
 * later page view.
 */
export function getUserConsent(): { essential: boolean; analytics: boolean; personalization: boolean; marketing: boolean } {
  const undecided: { essential: boolean; analytics: boolean; personalization: boolean; marketing: boolean } = {
    essential: true,
    analytics: false,
    personalization: false,
    marketing: false,
  };
  if (typeof window === 'undefined') return undecided;
  const stored = localStorage.getItem(STORAGE_CONSENT_KEY);
  if (!stored) return undecided;
  try {
    const parsed = JSON.parse(stored);
    // Merge onto the undecided defaults so a partially-written or older record
    // still yields a complete, correctly-typed object.
    return {
      essential: true,
      analytics: parsed.analytics === true,
      personalization: parsed.personalization === true,
      marketing: parsed.marketing === true,
    };
  } catch (e) {
    return undecided;
  }
}

export function detectRealLocation(): { country: string; city: string; region: string } {
  if (typeof window === 'undefined') {
    return { country: '', city: '', region: '' };
  }

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();

    // Timezone check
    if (timeZone.includes('Dakar') || timeZone.includes('Banjul')) {
      return { country: 'Sénégal', city: 'Dakar', region: 'Sénégal (Dakar, Thiès, Saint-Louis)' };
    }
    if (timeZone.includes('Bamako') || timeZone.includes('Abidjan') || timeZone.includes('Conakry') || timeZone.includes('Lome') || timeZone.includes('Cotonou') || timeZone.includes('Ouagadougou') || timeZone.includes('Niamey') || timeZone.includes('Accra') || timeZone.includes('Monrovia') || timeZone.includes('Freetown')) {
      return { country: 'Afrique de l’Ouest', city: timeZone.split('/')[1] || 'Abidjan', region: 'Sous-région (Mali, Côte d’Ivoire, Guinée)' };
    }
    if (timeZone.includes('Paris') || timeZone.includes('New_York') || timeZone.includes('Toronto') || timeZone.includes('Rome') || timeZone.includes('Madrid') || timeZone.includes('London') || timeZone.includes('Brussels') || timeZone.includes('Berlin') || timeZone.includes('Chicago') || timeZone.includes('Los_Angeles')) {
      return { country: 'Diaspora', city: timeZone.split('/')[1] || 'Paris', region: 'Diaspora (France, États-Unis, Canada, Italie)' };
    }

    // Language locale check
    if (lang.includes('fr-sn') || lang.includes('wo')) {
      return { country: 'Sénégal', city: 'Dakar', region: 'Sénégal (Dakar, Thiès, Saint-Louis)' };
    }
    if (lang.includes('fr')) {
      return { country: 'France / Diaspora', city: 'Paris', region: 'Diaspora (France, États-Unis, Canada, Italie)' };
    }

    return { country: 'International', city: timeZone.split('/')[1] || '', region: 'Reste du monde (Europe, Maghreb, Asie)' };
  } catch (e) {
    return { country: '', city: '', region: '' };
  }
}

/**
 * Events that carry personal data and therefore require the marketing
 * consent, not merely the analytics one.
 *
 * Previously the consent gate only covered `pageview`, so
 * `newsletter_subscription`, `ad_click` and `contact_lead` were written to
 * Firestore regardless of the reader's choice — while carrying `userEmail`,
 * `path`, `referrer` and location. That is personal data leaving the site
 * without the marketing consent the banner asked for.
 */
const MARKETING_GATED_EVENTS = new Set([
  'newsletter_subscription',
  'ad_click',
  'contact_lead',
  'premium_click',
]);


export async function sendConsentTelemetry(preferences: { essential: boolean; analytics: boolean; personalization: boolean; marketing: boolean }, userEmail?: string) {
  const sessionId = getSessionId();
  const consentDocId = `consent_${sessionId}`;

  // Only detect and record real location if explicit analytics permission is granted by user
  const locInfo = preferences.analytics ? detectRealLocation() : { country: '', city: '', region: '' };

  const payload = {
    id: consentDocId,
    sessionId,
    essential: true,
    analytics: Boolean(preferences.analytics),
    personalization: Boolean(preferences.personalization),
    marketing: Boolean(preferences.marketing),
    deviceType: getDeviceType(),
    locale: typeof navigator !== 'undefined' ? navigator.language : 'fr-SN',
    referrer: typeof document !== 'undefined' ? document.referrer : 'Direct',
    // Same correction as trackEvent: `country` holds the country, `region`
    // keeps the descriptive grouping string.
    country: locInfo.country,
    region: locInfo.region,
    city: locInfo.city,
    updatedAt: new Date().toISOString(),
    userEmail: userEmail || ''
  };

  try {
    await saveFirestoreDoc('user_consents', consentDocId, payload);
    console.log('[TELEMETRY] Cookie consent stored in Firebase:', consentDocId);
  } catch (err) {
    console.warn('[TELEMETRY FIREBASE CONSENT ERROR]', err);
  }
}

export async function trackEvent(
  eventName: string,
  details: {
    path?: string;
    articleId?: string;
    articleTitle?: string;
    category?: string;
    durationSeconds?: number;
    userEmail?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  const consent = getUserConsent();

  // Consent gate. `pageview` needs analytics consent; the conversion events
  // carry a userEmail and location, so they additionally require marketing
  // consent. Before this, only `pageview` was checked and the personal-data
  // events were written no matter what the reader had chosen.
  if (eventName === 'pageview' && !consent.analytics) return;
  if (MARKETING_GATED_EVENTS.has(eventName) && !consent.marketing) return;

  const sessionId = getSessionId();
  // Only use real location if user granted explicit analytics/location permission
  const locInfo = consent.analytics ? detectRealLocation() : { country: '', city: '', region: '' };

  const eventDocId = `evt_${sessionId}_${Date.now()}`;
  const payload = {
    id: eventDocId,
    eventName: eventName || 'pageview',
    sessionId,
    path: details.path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    articleId: details.articleId || '',
    articleTitle: details.articleTitle || '',
    category: details.category || 'Général',
    durationSeconds: details.durationSeconds || 0,
    deviceType: getDeviceType(),
    referrer: typeof document !== 'undefined' ? document.referrer : 'Direct',
    // FIX (malformed geography): this used to be `locInfo.region`, so the
    // `country` field held values like "Sénégal (Dakar, Thiès, Saint-Louis)".
    // Any grouping by country produced a nonsensical result. `country` is now
    // the country, and the descriptive grouping string is kept in `region`.
    country: locInfo.country,
    region: locInfo.region,
    city: locInfo.city,
    timestamp: new Date().toISOString(),
    userEmail: details.userEmail || '',
    metadata: details.metadata || {}
  };

  try {
    await saveFirestoreDoc('analytics_events', eventDocId, payload);
    console.log('[TELEMETRY] Event tracked in Firebase:', eventName);
  } catch (err) {
    console.warn('[TELEMETRY FIREBASE EVENT ERROR]', err);
  }
}

export function trackPageView(path: string, articleId?: string, articleTitle?: string, category?: string) {
  trackEvent('pageview', { path, articleId, articleTitle, category });
}

export function trackConversion(type: 'newsletter_subscription' | 'premium_click' | 'ad_click' | 'contact_lead', userEmail?: string, metadata?: Record<string, any>) {
  trackEvent(type, { userEmail, metadata });
}

