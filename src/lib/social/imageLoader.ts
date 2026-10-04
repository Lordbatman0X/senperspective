/**
 * Image loading with a shared cache.
 *
 * Every card is rendered many times (live preview on each drag frame, then again
 * for each export), so images must be decoded once and kept. Without this the
 * studio would re-download the same featured image on every mouse move.
 */

type CacheEntry =
  | { state: 'loading' }
  | { state: 'ready'; image: HTMLImageElement }
  | { state: 'failed' };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<HTMLImageElement | null>>();

/**
 * Fetch and decode an image.
 *
 * `crossOrigin='anonymous'` is set so a remote asset does not taint the canvas —
 * a tainted canvas cannot be exported with `toBlob`, which would break export
 * for any image not already served same-origin. Remote servers must send CORS
 * headers; where they do not, the image simply fails and the layer falls back to
 * its fill colour rather than silently exporting a blank card.
 */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);

  const cached = cache.get(src);
  if (cached?.state === 'ready') return Promise.resolve(cached.image);
  if (cached?.state === 'failed') return Promise.resolve(null);

  const pending = inFlight.get(src);
  if (pending) return pending;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      cache.set(src, { state: 'ready', image: img });
      inFlight.delete(src);
      resolve(img);
    };
    img.onerror = () => {
      cache.set(src, { state: 'failed' });
      inFlight.delete(src);
      resolve(null);
    };
    img.src = src;
  });

  inFlight.set(src, promise);
  return promise;
}

/** Synchronous peek, for renderers that run inside an animation frame. */
export function peekImage(src: string): HTMLImageElement | null {
  const entry = cache.get(src);
  return entry?.state === 'ready' ? entry.image : null;
}

export function isImageReady(src: string): boolean {
  return cache.get(src)?.state === 'ready';
}

/** Preload every distinct asset a set of cards needs. */
export async function preloadAssets(srcs: Array<string | undefined>): Promise<void> {
  const unique = Array.from(new Set(srcs.filter((s): s is string => Boolean(s))));
  await Promise.all(unique.map(s => loadImage(s)));
}

/**
 * Wait for the brand fonts so the first paint is not measured in a fallback
 * face. Canvas text metrics are font-dependent, so measuring in `serif` and
 * rendering in Playfair would produce a different wrap.
 */
export async function ensureFontsReady(
  families: Array<{ family: string; weights: number[]; styles: Array<'normal' | 'italic'> }>,
): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) return false;
  try {
    await document.fonts.ready;
    await Promise.all(
      families.flatMap(f =>
        f.weights.flatMap(w =>
          f.styles.map(style =>
            document.fonts.load(`${style} ${w} 64px "${f.family}"`).catch(() => []),
          ),
        ),
      ),
    );
    return true;
  } catch {
    // A missing font must not block the studio: text still renders in fallback.
    return false;
  }
}