/**
 * Impression + click tracking for public ad placements.
 *
 * Two problems this solves:
 *
 * 1. IMPRESSIONS WERE NEVER INCREMENTED. The admin UI displayed
 *    `impressions` and `clicks`, but nothing in the codebase ever incremented
 *    them — every campaign showed 0 forever. This module adds the missing
 *    counter.
 *
 * 2. REACT RE-RENDERS MUST NOT INFLATE THE COUNT. A banner re-renders on every
 *    parent state change (scroll, language toggle, store update). Counting
 *    each render would report dozens of impressions for one human seeing the
 *    ad once. So an impression is recorded at most once per ad per browsing
 *    session, and only when the creative is actually in the viewport.
 *
 * PRIVACY: only an ad id and a session-scoped random key are stored. No IP,
 * no user agent, no cross-site identifier, nothing personal.
 */
import { useEffect, useRef } from 'react';
import { incrementAdMetric } from '../firebase/db';

const IMPRESSION_KEY = 'sp_ad_impressions_seen';

/** Ad ids already counted in this tab session. */
function seenSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(IMPRESSION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const set = seenSet();
    set.add(id);
    sessionStorage.setItem(IMPRESSION_KEY, JSON.stringify([...set]));
  } catch {
    // Private-mode browsers can refuse sessionStorage. Tracking simply does
    // not happen; the ad still renders.
  }
}

/**
 * Records one impression for `adId` the first time it becomes genuinely
 * visible in this session.
 *
 * Uses IntersectionObserver rather than a plain effect so a banner that is
 * mounted but scrolled out of view (far-left skyscraper, below-the-fold
 * in-article unit) is not counted as served.
 */
export function useAdImpression(adId: string | undefined | null, enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null);
  const firedRef = useRef(false);
  useEffect(() => {
    if (!enabled || !adId) return;
    if (firedRef.current) return;
    if (seenSet().has(adId)) return;

    const node = ref.current;
    if (!node) return;

    const record = () => {
      if (firedRef.current || seenSet().has(adId)) return;
      firedRef.current = true;
      markSeen(adId);
      void incrementAdMetric(adId, 'impressions');
    };

    if (typeof IntersectionObserver === 'undefined') {
      record();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          record();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [adId, enabled]);

  return ref;
}

/**
 * Records a click, then returns true so the caller can proceed to the target
 * URL. The caller's existing navigation is preserved — we never redirect from
 * here, so the ad keeps working if the network write fails.
 */
export async function trackAdClick(adId: string | undefined | null): Promise<void> {
  if (!adId) return;
  try {
    await incrementAdMetric(adId, 'clicks');
  } catch {
    // Never block navigation on a failed metric.
  }
}

/** Ref to attach to the element that wraps the creative. */
export type AdImpressionRef = React.RefObject<HTMLDivElement | null>;
