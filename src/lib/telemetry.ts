/**
 * Real User Telemetry & Audience Analytics Client
 * Sends consented reader metrics, pageviews, and commercial conversion events to server & Firestore
 */

import { db, collection, addDoc, setDoc, doc, getDoc } from './mongodb';

const STORAGE_SESSION_KEY = 'perspective_analytics_session_id';
const STORAGE_CONSENT_KEY = 'perspective_cookie_consent';

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  let sid = localStorage.getItem(STORAGE_SESSION_KEY);
  if (!sid) {
    sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    localStorage.setItem(STORAGE_SESSION_KEY, sid);
  }
  return sid;
}

export function getDeviceType(): string {
  if (typeof window === 'undefined') return 'Desktop';
  const width = window.innerWidth;
  if (width < 640) return 'Mobile';
  if (width < 1024) return 'Tablet';
  return 'Desktop';
}

export function getUserConsent(): { essential: boolean; analytics: boolean; personalization: boolean; marketing: boolean } {
  if (typeof window === 'undefined') return { essential: true, analytics: true, personalization: true, marketing: false };
  const stored = localStorage.getItem(STORAGE_CONSENT_KEY);
  if (!stored) return { essential: true, analytics: true, personalization: true, marketing: false };
  try {
    return JSON.parse(stored);
  } catch (e) {
    return { essential: true, analytics: true, personalization: true, marketing: false };
  }
}

// Update daily analytics aggregate directly in Firestore
async function updateDailyAnalyticsSnapshot(dateStr: string, isPageview: boolean, isSession: boolean, isConsent: boolean, isMarketing: boolean, isAnalyticsOptIn: boolean, isConversion: boolean) {
  try {
    const dailyDocRef = doc(db, 'daily_analytics', dateStr);
    const snap = await getDoc(dailyDocRef);
    const existing = snap.exists() ? snap.data() : {
      date: dateStr,
      totalPageviews: 0,
      uniqueSessions: 0,
      totalConsents: 0,
      analyticsOptIns: 0,
      marketingOptIns: 0,
      leadConversions: 0
    };

    await setDoc(dailyDocRef, {
      date: dateStr,
      totalPageviews: (existing.totalPageviews || 0) + (isPageview ? 1 : 0),
      uniqueSessions: (existing.uniqueSessions || 0) + (isSession ? 1 : 0),
      totalConsents: (existing.totalConsents || 0) + (isConsent ? 1 : 0),
      analyticsOptIns: (existing.analyticsOptIns || 0) + (isAnalyticsOptIn ? 1 : 0),
      marketingOptIns: (existing.marketingOptIns || 0) + (isMarketing ? 1 : 0),
      leadConversions: (existing.leadConversions || 0) + (isConversion ? 1 : 0),
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('[FIRESTORE DAILY SNAPSHOT ERROR]', err);
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

export async function sendConsentTelemetry(preferences: { essential: boolean; analytics: boolean; personalization: boolean; marketing: boolean }, userEmail?: string) {
  const sessionId = getSessionId();
  const todayStr = new Date().toISOString().split('T')[0];
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
    country: locInfo.region,
    city: locInfo.city,
    updatedAt: new Date().toISOString(),
    userEmail: userEmail || ''
  };

  // 1. Write directly to Firestore using Firebase Web SDK (works on senperspective.com & everywhere)
  try {
    await setDoc(doc(db, 'user_consents', consentDocId), payload, { merge: true });
    await setDoc(doc(db, 'analytics_archive', consentDocId), {
      id: consentDocId,
      sessionId,
      ...payload,
      recordType: 'consent',
      archivedAt: new Date().toISOString()
    }, { merge: true });
    await updateDailyAnalyticsSnapshot(todayStr, false, false, true, Boolean(preferences.marketing), Boolean(preferences.analytics), false);
    console.log('[TELEMETRY] Cookie consent stored directly in Firestore analytics_archive:', consentDocId);
  } catch (firestoreErr) {
    console.warn('[TELEMETRY FIRESTORE CONSENT ERROR]', firestoreErr);
  }

  // 2. Secondary fetch attempt to API route if backend server exists
  try {
    await fetch('/api/analytics/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, preferences, ...payload })
    });
  } catch (err) {
    // Expected on static hosting
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
  // If user declined analytics, skip non-essential tracking
  if (!consent.analytics && eventName === 'pageview') {
    return;
  }

  const sessionId = getSessionId();
  const todayStr = new Date().toISOString().split('T')[0];
  // Only use real location if user granted explicit analytics/location permission
  const locInfo = consent.analytics ? detectRealLocation() : { country: '', city: '', region: '' };

  const payload = {
    eventName: eventName || 'pageview',
    sessionId,
    path: details.path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    articleId: details.articleId || '',
    articleTitle: details.articleTitle || '',
    category: details.category || 'Général',
    durationSeconds: details.durationSeconds || 0,
    deviceType: getDeviceType(),
    referrer: typeof document !== 'undefined' ? document.referrer : 'Direct',
    country: locInfo.region,
    city: locInfo.city,
    timestamp: new Date().toISOString(),
    userEmail: details.userEmail || '',
    metadata: details.metadata || {}
  };

  // 1. Write directly to Firestore using Firebase Web SDK
  try {
    const eventDocId = `evt_${sessionId}_${Date.now()}`;
    await addDoc(collection(db, 'analytics_events'), payload);
    await setDoc(doc(db, 'analytics_archive', eventDocId), {
      id: eventDocId,
      sessionId,
      ...payload,
      recordType: 'visit_event',
      archivedAt: new Date().toISOString()
    }, { merge: true });
    const isConversion = ['newsletter_subscription', 'conversion_lead', 'premium_click', 'ad_click', 'contact_lead'].includes(eventName);
    await updateDailyAnalyticsSnapshot(todayStr, eventName === 'pageview', false, false, false, false, isConversion);
    console.log('[TELEMETRY] Event tracked directly in Firestore analytics_archive:', eventName);
  } catch (firestoreErr) {
    console.warn('[TELEMETRY FIRESTORE EVENT ERROR]', firestoreErr);
  }

  // 2. Secondary fetch attempt to API route if backend server exists
  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Expected on static hosting
  }
}

export function trackPageView(path: string, articleId?: string, articleTitle?: string, category?: string) {
  trackEvent('pageview', { path, articleId, articleTitle, category });
}

export function trackConversion(type: 'newsletter_subscription' | 'premium_click' | 'ad_click' | 'contact_lead', userEmail?: string, metadata?: Record<string, any>) {
  trackEvent(type, { userEmail, metadata });
}
