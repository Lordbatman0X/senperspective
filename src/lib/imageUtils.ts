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
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return reject(new Error("Empty file result"));
      compressDataUrl(src, maxWidth, maxHeight, quality)
        .then(resolve)
        .catch(() => resolve(src)); // Fallback to raw if compression fails
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function compressDataUrl(
  dataUrl: string,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.75
): Promise<string> {
  // If not a data URL or already small enough (< 80KB), return as is
  if (!dataUrl || !dataUrl.startsWith("data:image/") || dataUrl.length < 80000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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
      canvas.width = width;
      canvas.height = height;
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
  const sanitized: Record<string, any> = { ...payload };

  for (const [key, val] of Object.entries(sanitized)) {
    if (typeof val === "string" && val.startsWith("data:image/")) {
      const isCover = key.toLowerCase().includes("cover");
      sanitized[key] = await compressDataUrl(
        val,
        isCover ? 800 : 400,
        isCover ? 500 : 400,
        0.75
      );
    }
  }

  return sanitized as T;
}
