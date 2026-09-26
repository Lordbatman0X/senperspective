import { getUserConsent } from './telemetry';

const GA_SRC = 'https://www.googletagmanager.com/gtag/js';

function isValidMeasurementId(id: string): boolean {
  return /^G-[A-Z0-9]{4,}$/i.test(String(id || '').trim());
}

let injectedId = '';

/** Loads GA4 if a valid id is configured and the reader consented. */
export function initGa4(measurementId?: string): void {
  if (typeof window === 'undefined') return;
  const id = String(measurementId || '').trim();
  // Rejects the old `G-[#PERSP-2026]` placeholder default and any malformed
  // value, rather than requesting a tag that can never report.
  if (!isValidMeasurementId(id)) return;

  if (!getUserConsent().analytics) return;

  const w = window as any;
  if (injectedId === id && w.gtag) return;

  if (!w.dataLayer) w.dataLayer = [];
  w.gtag = w.gtag || function () { w.dataLayer.push(arguments); };
  w.gtag('js', new Date());
  w.gtag('config', id, { anonymize_ip: true });

  if (!document.querySelector(`script[src^="${GA_SRC}"]`)) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `${GA_SRC}?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
  }
  injectedId = id;
}

/**
 * Disables GA4 when consent is withdrawn.
 *
 * Blocking the network and denying storage is the most a page can do once the
 * script has run — it cannot un-send data already reported, which is exactly
 * why the gate above is the control that actually matters.
 */
export function disableGa4(): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (w.gtag) {
    try {
      w.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied' });
    } catch { /* ignore */ }
  }
  document.querySelectorAll(`script[src^="${GA_SRC}"]`).forEach(el => el.remove());
  injectedId = '';
}

/** Reports a page view, if the tag is active. */
export function trackGa4PageView(path: string): void {
  const w = typeof window !== 'undefined' ? (window as any) : null;
  if (!w?.gtag || !injectedId) return;
  w.gtag('event', 'page_view', { page_path: path });
}