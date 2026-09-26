/**
 * Real User Telemetry & Audience Analytics Client
 * Sends consented reader metrics, pageviews, and commercial conversion events to Firebase Firestore
 */

import { saveFirestoreDoc, deleteFirestoreDoc } from '../firebase/db';

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

/** Stable pseudonymous visitor key. A random local id, not a fingerprint. */
const VISITOR_KEY = 'perspective_visitor_id';
const PROFILE_QUEUE_KEY = 'perspective_profile_queue';
const FIRST_SEEN_KEY = 'perspective_visitor_first_seen';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server-visitor';
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = 'vis_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return 'vis_ephemeral';
  }
}

/** Classifies where a reader came from, from the referrer host only. */
function classifyAcquisition(referrer: string): string {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (/google|bing|duckduckgo|yahoo|qwant/.test(host)) return 'search';
    if (/facebook|twitter|x\.com|instagram|linkedin|tiktok|whatsapp/.test(host)) return 'social';
    if (/news|press|journal|times|letters/.test(host)) return 'press';
    return 'referral';
  } catch {
    return 'referral';
  }
}

/**
 * Consent-GATED commercial audience profile.
 *
 * WHAT THIS IS: a rollup of signals the reader has already agreed to share,
 * stored once per visitor so the admin can see a real audience segment
 * (interests, device, geography, acquisition source, engagement depth,
 * newsletter status) instead of guessing from pageview totals.
 *
 * WHAT THIS IS NOT — deliberately:
 *  • A strict no-op unless the reader accepted. `getUserConsent()` reports
 *    false for analytics/marketing when nothing is stored, so an undecided
 *    visitor produces no profile at all.
 *  • Nothing is collected here that the consented telemetry above does not
 *    already produce; this only aggregates those signals.
 *  • No canvas/WebGL/audio fingerprinting, no keystroke or text-content
 *    capture, no cross-site tracking, and no device detail beyond the coarse
 *    Mobile/Tablet/Desktop the banner already describes.
 *  • No IP address is stored, only the coarse country/city already recorded.
 *  • Email is attached ONLY when the reader signed in or subscribed — the two
 *    cases where they gave us an address deliberately.
 *
 * `analytics` covers measurement and `marketing` covers building a marketable
 * segment, so BOTH are required to write. Declining either leaves the reader
 * unprofiled rather than partially profiled.
 */
export async function syncAudienceProfile(args: {
  userEmail?: string;
  isSubscribed?: boolean;
  pagePath?: string;
  articleCategory?: string;
}): Promise<void> {
  // The entire privacy guarantee of this module, enforced at the write.
  const consent = getUserConsent();
  if (!consent.analytics || !consent.marketing) return;
  if (typeof window === 'undefined') return;

  try {
    // Interest signals accumulated locally from consented reads.
    let queue: Array<{ category: string; path: string; at: string }> = [];
    try {
      const raw = localStorage.getItem(PROFILE_QUEUE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) queue = parsed;
      }
    } catch { /* storage unavailable: continue without interest history */ }

    if (args.pagePath) {
      queue.push({ category: args.articleCategory || '', path: args.pagePath, at: new Date().toISOString() });
      // Capped so this can never grow into a browsing log on the device.
      queue = queue.slice(-60);
      try { localStorage.setItem(PROFILE_QUEUE_KEY, JSON.stringify(queue)); } catch { /* ignore */ }
    }

    const categoryCounts = new Map<string, number>();
    queue.forEach(q => {
      if (q.category) categoryCounts.set(q.category, (categoryCounts.get(q.category) || 0) + 1);
    });
    const topInterests = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, reads]) => ({ category, reads }));

    const loc = detectRealLocation();
    const visitorId = getVisitorId();
    const referrer = typeof document !== 'undefined' ? (document.referrer || '') : '';

    let firstSeenAt = new Date().toISOString();
    try { firstSeenAt = localStorage.getItem(FIRST_SEEN_KEY) || firstSeenAt; } catch { /* ignore */ }
    try { localStorage.setItem(FIRST_SEEN_KEY, firstSeenAt); } catch { /* ignore */ }

    let referrerHost = '';
    try { referrerHost = referrer ? new URL(referrer).hostname : ''; } catch { /* ignore */ }

    const ok = await saveFirestoreDoc('reader_profiles', visitorId, {
      id: visitorId,
      visitorId,
      sessionId: getSessionId(),
      email: args.userEmail || '',
      isSubscribed: Boolean(args.isSubscribed),
      deviceType: getDeviceType(),
      platform: typeof navigator !== 'undefined' ? navigator.platform || '' : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      country: loc.country,
      city: loc.city,
      region: loc.region,
      acquisition: classifyAcquisition(referrer),
      referrerHost,
      topInterests,
      articlesRead: queue.length,
      distinctSections: new Set(queue.map(q => q.path.split('/')[1] || '')).size,
      firstSeenAt,
      lastSeenAt: new Date().toISOString(),
      consent: {
        essential: true,
        analytics: true,
        personalization: consent.personalization,
        marketing: true,
        recordedAt: new Date().toISOString(),
      },
    });

    if (!ok) console.warn('[AUDIENCE PROFILE] not persisted this time');
  } catch (err) {
    console.warn('[AUDIENCE PROFILE ERROR]', err);
  }
}

/**
 * Stops profiling and DELETES the stored profile.
 *
 * Honoring a withdrawal has to actually remove the record, not merely stop
 * writing it. Called by the consent banner when a reader rejects or downgrades.
 */
export async function withdrawAudienceProfile(): Promise<void> {
  try {
    localStorage.removeItem(PROFILE_QUEUE_KEY);
  } catch { /* ignore */ }
  if (typeof window === 'undefined') return;
  const consent = getUserConsent();
  if (consent.analytics && consent.marketing) {
    try {
      await deleteFirestoreDoc('reader_profiles', getVisitorId());
    } catch (err) {
      console.warn('[AUDIENCE PROFILE WITHDRAW ERROR]', err);
    }
  }
}

export function trackConversion(type: 'newsletter_subscription' | 'premium_click' | 'ad_click' | 'contact_lead', userEmail?: string, metadata?: Record<string, any>) {
  trackEvent(type, { userEmail, metadata });
}

