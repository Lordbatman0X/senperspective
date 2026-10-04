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
 * Cross-origin is only set for remote URLs.
 *
 * Applying `crossOrigin` to a `data:` URL makes some browsers refuse to decode
 * the image at all, which is why an uploaded logo (stored as a data URL) could
 * fail while a library URL worked. Data URLs and blobs are already same-origin,
 * so they must not carry the attribute.
 */
function isRemote(src: string): boolean {
  return /^(https?:)?\/\//i.test(src);
}

/**
 * Fetch and decode an image.
 *
 * For a remote asset `crossOrigin='anonymous'` keeps the canvas untainted, which
 * is required for `toBlob` to work on export. Remote servers must therefore
 * send CORS headers; where they do not, the image fails and the layer falls back
 * to its fill colour rather than exporting a blank card.
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
    if (isRemote(src)) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      // An SVG with no intrinsic size still loads; give it a usable size so
      // downstream code can compute a rect for it.
      if (!img.naturalWidth && !img.naturalHeight) {
        img.width = 512;
        img.height = 512;
      }
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

/** Drop a cached entry, so a replaced file is re-decoded rather than reused. */
export function invalidateImage(src: string): void {
  cache.delete(src);
  inFlight.delete(src);
}

/** Synchronous peek, for renderers that run inside an animation frame. */
export function peekImage(src: string): HTMLImageElement | null {
  const entry = cache.get(src);
  return entry?.state === 'ready' ? entry.image : null;
}

export function isImageReady(src: string): boolean {
  return cache.get(src)?.state === 'ready';
}

/**
 * Read an uploaded file as a data URL, verifying it actually decodes.
 *
 * Reading a file is not the same as it being a usable image: a renamed `.png`
 * that is really a PDF, or a corrupt file, produces a data URL that decodes to
 * nothing. Checking here is what turns "my logo disappeared" into an error the
 * editor can act on.
 */
export function readImageFile(file: File): Promise<{ src: string } | { error: string }> {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) {
      resolve({ error: 'not-an-image' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      if (!src) {
        resolve({ error: 'read-failed' });
        return;
      }
      // Decode before accepting, so a broken upload never reaches the document.
      const probe = new Image();
      probe.onload = () => resolve({ src });
      probe.onerror = () => resolve({ error: 'decode-failed' });
      probe.src = src;
    };
    reader.onerror = () => resolve({ error: 'read-failed' });
    reader.readAsDataURL(file);
  });
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