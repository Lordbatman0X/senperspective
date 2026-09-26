/**
 * Navigation targets: smooth, predictable landing when the reader follows a
 * link to a new page.
 *
 * Two problems this solves, both reported as "the click didn't take me
 * anywhere useful":
 *
 *  1. PAGE TRANSITIONS. Several pages each called `window.scrollTo(0, 0)` in
 *     their own effect, but the target content was frequently BELOW the fold,
 *     so the reader landed on an apparently empty page. Worse, a
 *     `scrollTo(0, 0)` in the destination page fights the browser's own
 *     `#hash` handling, so deep links silently landed at the top.
 *
 *  2. DEEP LINKS TO A SPECIFIC ITEM. Clicking a matchup in the homepage
 *     quadrant has to arrive at that SAME matchup on the sports category
 *     page, not at the top of a long board.
 *
 * This module gives every such jump one implementation:
 *
 *   - `scrollToTarget(id)`  — centres an element under the sticky header.
 *   - `useRouteScroll()`    — top-of-page by default, target-of-page on a hash.
 *   - `matchAnchor(id)`     — the `id=` placed on a matchup row.
 *   - `openAccountChat()`   — opens the account drawer on Messages, with the
 *                             exact conversation already selected.
 *
 * No routing, layout or design is changed here; this is purely positioning.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Height reserved for the sticky header when scrolling to a target, so the
 * row is never hidden underneath it. Matches the header's tall (unscrolled)
 * padding, which is the worst case.
 */
const HEADER_OFFSET = 88;

export const matchAnchor = (id: string) => `match-${id}`;

/**
 * Scrolls an element into view, below the sticky header.
 *
 * `center` is the default because the most common complaint was arriving at
 * the wrong row, not arriving at the wrong vertical position. Scrolling an
 * item to the middle of the viewport makes it unmistakable which one it is.
 */
export function scrollToTarget(id: string, behavior: ScrollBehavior = 'smooth') {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

/**
 * Scrolls to a target, then keeps it in view while the page finishes loading.
 *
 * A single scroll is not enough on this site. The destination page mounts
 * immediately but its content is still streaming: the sports board awaits
 * TheSportsDB/OpenLigaDB, and the article grid awaits the store. Scrolling as
 * soon as the anchor exists lands on a position that is correct for the
 * CURRENT layout, and every block that arrives afterwards pushes the target
 * further down. That is why a clicked fixture could end up hundreds of pixels
 * below the viewport.
 *
 * So: scroll, then re-check a few times and correct if the target has drifted
 * more than a few pixels. Cheap, self-limiting, and it stops as soon as the
 * layout holds steady.
 */
function scrollToTargetAndSettle(id: string, attempts = 6) {
  scrollToTarget(id);

  let tries = 0;
  const correct = () => {
    const el = document.getElementById(id);
    if (!el) return;
    const drift = el.getBoundingClientRect().top - HEADER_OFFSET;
    // Within a few pixels: the layout has settled, so stop watching.
    if (Math.abs(drift) <= 4) return;
    if (tries++ >= attempts) return;
    window.scrollTo({ top: Math.max(0, window.scrollY + drift), behavior: 'smooth' });
    window.setTimeout(correct, 120);
  };
  window.setTimeout(correct, 150);
}

/**
 * Route-change scroll behaviour for the whole app.
 *
 * - With a `#hash`   -> land on that element (the reader asked for a specific
 *                      item, so honour it over "always go to the top").
 * - Without a hash   -> top of the page.
 *
 * The delay is deliberate. The destination component has just mounted and its
 * content is frequently still being hydrated by the store, so measuring the
 * element immediately can find a zero-height placeholder and scroll to the
 * wrong offset. A short rAF + timeout wait is the cheapest reliable fix.
 */
export function useRouteScroll() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      let tries = 0;
      const attempt = () => {
        const el = document.getElementById(id);
        if (el) {
          scrollToTargetAndSettle(id);
          return;
        }
        // The target may not be mounted yet; a couple of retries covers the
        // async data loads without spinning.
        if (tries++ < 12) window.setTimeout(attempt, 80);
      };
      const raf = window.requestAnimationFrame(attempt);
      return () => window.cancelAnimationFrame(raf);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash, key]);
}

/**
 * Asks the account drawer to open directly on a specific conversation.
 *
 * The drawer's sub-menu and selected contact are local React state, so there
 * is no route to navigate to. A window event is the same mechanism the
 * existing "open the floating messenger" button already uses, so this adds no
 * new pattern and no new global state.
 */
export function openAccountChat(email: string) {
  if (typeof window === 'undefined' || !email) return;
  window.dispatchEvent(new CustomEvent('open-account-chat', { detail: { email } }));
}
