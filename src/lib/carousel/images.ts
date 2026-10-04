import { CarouselCardKind, CarouselDraft } from './types';

/** The renderer key a card's logo image is stored under. */
export function logoImageKey(kind: CarouselCardKind): string {
  return `logo:${kind}`;
}

/**
 * Every image a draft references, keyed exactly as the renderer expects.
 *
 * Shared by the preview and the exporter so the two can never disagree about
 * which images exist — the preview showing a photo the export then omits (or
 * vice versa) was the original symptom of these lists drifting apart.
 */
export function collectDraftImages(draft: CarouselDraft): Array<[string, string]> {
  const sources: Array<[string, string]> = [];
  if (draft.coverImage) sources.push(['coverImage', draft.coverImage]);
  if (draft.closingImage) sources.push(['closingImage', draft.closingImage]);

  // All three logo slots are requested, not just the visible card's, so that
  // switching cards never shows a stale or empty logo while loading.
  (['cover', 'body', 'closing'] as CarouselCardKind[]).forEach(kind => {
    const url = draft.logoUrls?.[kind];
    if (url) sources.push([logoImageKey(kind), url]);
  });

  return sources;
}

/**
 * Image loading for the canvas cards.
 *
 * The preview and the PNG export BOTH draw remote photos onto a canvas, and a
 * canvas cannot be read back (`toDataURL`) once a cross-origin image without
 * CORS headers has tainted it. That produced two separate, contradictory bugs:
 *
 *  - the preview set `crossOrigin = 'anonymous'` unconditionally, so any host
 *    that does not send `Access-Control-Allow-Origin` failed the load outright
 *    and the article photo silently vanished from the cover card;
 *  - the export needed the opposite (no `crossOrigin`), which would taint the
 *    canvas and make `toDataURL` throw, losing the download.
 *
 * So loading is done once, here, with an explicit two-step strategy:
 *  1. try a CORS-enabled load — usable for BOTH preview and export;
 *  2. fall back to a plain load — fine for the preview, but flagged `tainted`
 *     so the export can tell the editor exactly why the download is blocked.
 */

export interface LoadedCardImage {
  image: CanvasImageSource;
  /** True when the image could not be loaded with CORS headers. */
  tainted: boolean;
}

/** One `Image` load attempt. Resolves to null on failure rather than rejecting. */
function attempt(url: string, crossOrigin: boolean): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Loads one card image, preferring a CORS-clean source.
 *
 * Data URLs (what `compressImageFile` produces) are same-origin and always
 * clean, so they skip the network entirely.
 */
export async function loadCardImage(url: string): Promise<LoadedCardImage | null> {
  if (!url) return null;
  const cors = await attempt(url, true);
  if (cors) return { image: cors, tainted: false };
  const plain = await attempt(url, false);
  return plain ? { image: plain, tainted: true } : null;
}

export interface LoadedCardImages {
  /** Ready-to-draw sources, keyed exactly as `render.ts` expects them. */
  images: Record<string, CanvasImageSource>;
  /** URLs that could not be loaded at all, for a visible warning. */
  failed: string[];
  /** True when at least one image loaded without CORS and blocks export. */
  tainted: boolean;
}

/**
 * Loads every image a draft references, keyed for the renderer.
 *
 * `keys` maps a draft field to the renderer key, because the per-card logos are
 * keyed by card (`logo:cover`) while the photos are global (`coverImage`).
 */
export async function loadCardImages(
  sources: Array<[string, string]>,
): Promise<LoadedCardImages> {
  const entries = await Promise.all(
    sources.map(async ([key, url]) => {
      const loaded = await loadCardImage(url);
      return loaded ? ([key, loaded] as const) : null;
    }),
  );

  const images: Record<string, CanvasImageSource> = {};
  const failed: string[] = [];
  let tainted = false;

  for (const entry of entries) {
    if (!entry) continue;
    const [key, { image, tainted: wasTainted }] = entry;
    images[key] = image;
    if (wasTainted) tainted = true;
  }
  for (const [key, url] of sources) {
    if (!(key in images)) failed.push(url);
  }

  return { images, failed, tainted };
}