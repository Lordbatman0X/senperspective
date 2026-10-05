export const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800&fit=crop";

export function getSafeImageUrl(url?: string, fallback = DEFAULT_FALLBACK_IMAGE): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }
  const trimmed = url.trim();
  // Ensure valid URL or base64 data url or relative path
  if (
    trimmed.startsWith('http://') || 
    trimmed.startsWith('https://') || 
    trimmed.startsWith('data:') || 
    trimmed.startsWith('blob:') || 
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  ) {
    return trimmed;
  }
  return fallback;
}

/**
 * True when any pixel is not fully opaque.
 *
 * Sampled on a stride rather than read in full: a 1080px logo has ~1M pixels,
 * and the answer we need is "is there transparency anywhere", so checking every
 * pixel is wasted work on large canvases.
 */
function hasVisibleAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 128));
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4 * step) {
      if (data[i] < 250) return true;
    }
    return false;
  } catch {
    // A tainted canvas (cross-origin image) can't be sampled; assume the worst
    // so we keep the original file rather than flattening its transparency.
    return true;
  }
}

/**
 * Utility to compress base64 images or File objects using HTML Canvas.
 * Ensures data URLs remain small (e.g., < 100KB) and never exceed Firestore document limits (1MB).
 */

export async function compressImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 700,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return resolve(DEFAULT_FALLBACK_IMAGE);
      compressDataUrl(src, maxWidth, maxHeight, quality)
        .then(resolve)
        .catch(() => resolve(src));
    };
    reader.onerror = () => resolve(DEFAULT_FALLBACK_IMAGE);
    reader.readAsDataURL(file);
  });
}

export async function compressDataUrl(
  dataUrl: string,
  maxWidth = 1000,
  maxHeight = 700,
  quality = 0.72
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return DEFAULT_FALLBACK_IMAGE;
  }

  // If not a data URL or already small enough (< 60KB), return as is
  if (!dataUrl.startsWith("data:image/") || dataUrl.length < 60000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    // NEVER set crossOrigin for data: URIs as it causes load failures in modern browsers
    if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    
    // Set a timeout to prevent hanging forever
    const timer = setTimeout(() => {
      resolve(dataUrl);
    }, 3000);

    img.onload = () => {
      clearTimeout(timer);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / maxWidth > height / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return resolve(dataUrl);
      }
      ctx.drawImage(img, 0, 0, width, height);

      // JPEG has no alpha channel: encoding to it flattens transparent pixels
      // onto black, which turned cut-out logo PNGs into solid rectangles.
      //
      // This is decided by INSPECTING the image, not by a caller-supplied flag.
      // An opt-in flag was tried first and was not enough: this function is also
      // reached on the save path (via `sanitizeFirestorePayload`), which
      // re-compresses every `data:image/` field in the payload and knows nothing
      // about which field is a logo. Any caller that forgot the flag — or simply
      // did not exist yet — silently re-flattened the logo on save. Detecting the
      // alpha channel here means transparency survives on every path by default,
      // and opaque photos still get the much smaller JPEG.
      const keepsAlpha = hasVisibleAlpha(ctx, canvas.width, canvas.height);
      const compressed = canvas.toDataURL(keepsAlpha ? "image/png" : "image/jpeg", quality);
      resolve(compressed);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

/**
 * Crops a logo to its non-transparent bounds, keeping the alpha channel.
 *
 * An uploaded logo often sits in the middle of a much larger transparent
 * canvas — a square export, a screenshot margin, padding left by the design
 * tool. Contain-fitted onto the card that padding is invisible but very real:
 * the placement box reaches the card's top edge while the visible mark still
 * floats below it, so the editor drags "as high as it goes" and the logo
 * refuses to go higher. Trimming at upload makes the stored image BE the mark,
 * so the placement box, the drag handle and the exported pixels all agree —
 * the logo can be dragged flush to the card's edge.
 *
 * Anything unexpected (a non-data source, a cross-origin source that taints
 * the canvas, an unreadable decode, an image with no transparency at all)
 * resolves to the original untouched: an untrimmed logo still works, it just
 * carries its margins.
 */
export function trimTransparentLogo(dataUrl: string): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return Promise.resolve(dataUrl);
  }
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => resolve(dataUrl), 3000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return resolve(dataUrl);
        const src = document.createElement('canvas');
        src.width = w;
        src.height = h;
        const sctx = src.getContext('2d');
        if (!sctx) return resolve(dataUrl);
        sctx.drawImage(img, 0, 0);
        const { data } = sctx.getImageData(0, 0, w, h);
        // Threshold above near-invisible noise so a semi-transparent halo
        // cannot pad the crop straight back out.
        const ALPHA = 16;
        let minX = w - 1;
        let minY = h - 1;
        let maxX = 0;
        let maxY = 0;
        let found = false;
        for (let y = 0; y < h; y++) {
          const row = y * w * 4;
          for (let x = 0; x < w; x++) {
            if (data[row + x * 4 + 3] >= ALPHA) {
              found = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        // Nothing visible, or nothing to gain: keep the original file rather
        // than re-encoding it for no reason.
        if (!found || (minX <= 0 && minY <= 0 && maxX >= w - 1 && maxY >= h - 1)) {
          return resolve(dataUrl);
        }
        const out = document.createElement('canvas');
        out.width = maxX - minX + 1;
        out.height = maxY - minY + 1;
        const octx = out.getContext('2d');
        if (!octx) return resolve(dataUrl);
        octx.drawImage(src, -minX, -minY);
        // Always PNG: the whole point is the alpha we just preserved.
        resolve(out.toDataURL('image/png'));
      } catch {
        // Tainted canvas or a decode hiccup: the untrimmed logo still works.
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Sanitizes an object before sending to Firestore to ensure no single field or total payload exceeds safe limits.
 */
export async function sanitizeFirestorePayload<T extends Record<string, any>>(
  payload: T
): Promise<T> {
  if (!payload || typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    const cleanArray = await Promise.all(
      payload.map(async (item) => {
        if (item === undefined) return null;
        if (item && typeof item === 'object') {
          return await sanitizeFirestorePayload(item);
        }
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          return await compressDataUrl(item, 1000, 700, 0.72);
        }
        return item;
      })
    );
    return cleanArray as unknown as T;
  }

  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(payload)) {
    if (val === undefined) {
      continue; // Skip undefined to prevent Firestore error
    }
    if (typeof val === 'string' && val.startsWith('data:image/')) {
      sanitized[key] = await compressDataUrl(val, 1000, 700, 0.72);
    } else if (val && typeof val === 'object') {
      sanitized[key] = await sanitizeFirestorePayload(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized as T;
}
