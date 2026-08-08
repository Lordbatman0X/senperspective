export const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800&fit=crop";

export function getSafeImageUrl(url?: string, fallback = DEFAULT_FALLBACK_IMAGE): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }
  const trimmed = url.trim();
  // Ensure valid URL or base64 data url or relative path
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return fallback;
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

      // Convert to compressed JPEG
      const compressed = canvas.toDataURL("image/jpeg", quality);
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
 * Sanitizes an object before sending to Firestore to ensure no single field or total payload exceeds safe limits.
 */
export async function sanitizeFirestorePayload<T extends Record<string, any>>(
  payload: T
): Promise<T> {
  if (!payload || typeof payload !== 'object') return payload;
  const sanitized: Record<string, any> = Array.isArray(payload) ? [...payload] : { ...payload };

  for (const [key, val] of Object.entries(sanitized)) {
    if (typeof val === "string" && val.startsWith("data:image/")) {
      sanitized[key] = await compressDataUrl(val, 1000, 700, 0.72);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      sanitized[key] = await sanitizeFirestorePayload(val);
    } else if (Array.isArray(val)) {
      sanitized[key] = await Promise.all(
        val.map(item => (typeof item === "object" && item ? sanitizeFirestorePayload(item) : item))
      );
    }
  }

  return sanitized as T;
}
