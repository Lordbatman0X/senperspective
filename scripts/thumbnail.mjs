/**
 * Build-time image thumbnails for the static article index.
 *
 * Background
 * ----------
 * Uploaded article pictures are stored inline as base64 data URLs in the
 * Realtime Database. The static `article-index.json` is a *compact* list used
 * to paint the article cards before the live database has been read, so those
 * inline pictures used to be dropped from it and merely flagged with
 * `needsImage: true`. Nothing consumed that flag, so every such card fell
 * through to `getSafeImageUrl(undefined)` and rendered the generic stock
 * photo -- the "Unsplash replaces my uploaded image" bug.
 *
 * Node can decode images after all: `sharp` is already a build dependency, so
 * we shrink each inline picture to a card-sized JPEG right here, at build time,
 * and ship a real image URL in the index.
 *
 * Anything that cannot be decoded is returned as `null` so the caller can keep
 * the `needsImage` flag and let the client self-heal.
 */

/** Card images render at most ~320 CSS px wide (2x for retina, capped). */
export const THUMB_MAX_W = 320;

/** JPEG quality. 0.72 is visually clean for card art and keeps the index small. */
export const THUMB_QUALITY = 72;

/**
 * Hard ceiling on a single encoded thumbnail. A 320px JPEG should land far
 * below this; anything larger means something unexpected (e.g. an exotic
 * source image that resists compression) and is dropped rather than shipped.
 */
export const THUMB_MAX_CHARS = 96 * 1024;

/** Only formats we can meaningfully re-encode. */
const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const DATA_URL_RE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([\s\S]+)$/i;

/**
 * True when a stored image field is an inline data URL rather than a real URL.
 * Mirrors the `isInline` helper in prerender.mjs.
 */
export function isInlineImage(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

/**
 * Decode an inline data URL into a `Buffer`, or `null` if it is not a usable
 * base64 image data URL.
 */
export function decodeDataUrl(value) {
  if (!isInlineImage(value)) return null;
  const match = DATA_URL_RE.exec(value.trim());
  if (!match) return null;
  try {
    const buf = Buffer.from(match[2], 'base64');
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

let sharpPromise = null;
async function getSharp() {
  if (!sharpPromise) sharpPromise = import('sharp');
  return sharpPromise;
}

/**
 * Produce a card-sized JPEG data URL from an inline base64 image.
 *
 * @param {string} value        a `data:` URL holding a base64 image
 * @returns {Promise<string|null>} the thumbnail as a `data:image/jpeg;base64,...`
 *          URL, or `null` when the input is absent/invalid/undecodable.
 */
export async function makeThumb(value) {
  const input = decodeDataUrl(value);
  if (!input) return null;

  let sharp;
  try {
    ({ default: sharp } = await getSharp());
  } catch {
    // sharp is a build dependency; if it is missing we degrade rather than
    // break the whole build.
    return null;
  }

  try {
    const out = await sharp(input)
      // Only the width is constrained: the original aspect ratio is preserved so
      // nothing is cropped out of the subject. The card CSS already uses
      // `object-cover`, so it handles the final framing at render time.
      .resize({ width: THUMB_MAX_W, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }) // flatten alpha, else JPEG gets black
      .jpeg({ quality: THUMB_QUALITY, progressive: true, mozjpeg: true })
      .toBuffer();

    const dataUrl = `data:${MIME_BY_EXT.jpg};base64,${out.toString('base64')}`;
    if (dataUrl.length > THUMB_MAX_CHARS) return null;
    return dataUrl;
  } catch {
    // Unsupported or corrupt source image. Caller keeps `needsImage` so the
    // client can retry at runtime.
    return null;
  }
}

/**
 * Resolve an article's card image to something embeddable in the index.
 *
 * Remote URLs are passed straight through; only inline data URLs are worth
 * (and small enough) to decode.
 *
 * @param {string|null|undefined} value
 * @returns {Promise<{ url: string, thumbnailed: boolean } | null>} null when no
 *          usable image could be produced.
 */
export async function resolveCardImage(value) {
  if (!value) return null;
  if (!isInlineImage(value)) {
    return value.trim() ? { url: value.trim(), thumbnailed: false } : null;
  }
  const thumb = await makeThumb(value);
  return thumb ? { url: thumb, thumbnailed: true } : null;
}
