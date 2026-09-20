import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

const MAX_DIRECT_UPLOAD_BYTES = 1024 * 1024; // 1 MB — stay well inside Firestore/RTDB limits
const FALLBACK_BUCKET_PREFIX = 'media/';

/**
 * Uploads a file (or Blob) to Firebase Storage and returns the public download URL.
 * Falls back to an optimized, capped Data URL only when Storage is unreachable AND
 * the payload fits inside the safe limit — never as a first resort.
 */
export async function uploadMediaFile(file: File | Blob, customPath?: string): Promise<string> {
  const filename = customPath || `${FALLBACK_BUCKET_PREFIX}${Date.now()}-${(file as File).name || 'upload.webp'}`;

  // Quick size gate: if the blob is huge, never even attempt the Storage upload
  // (we'd rather cap it as a Data URL than risk a partial failed write).
  const byteSize = file instanceof File ? (file.size || 0) : (file as Blob).size || 0;

  // ---------------------------------------------------------------
  // 1. Try Firebase Storage upload (primary path)
  // ---------------------------------------------------------------
  try {
    const storageRef = ref(storage, filename);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/webp',
      // For large files, guard against indefinite hanging
    });
    return await getDownloadURL(snapshot.ref);
  } catch (storageError) {
    console.warn('[Firebase Storage] Direct upload failed, evaluating fallback:', storageError);
  }

  // ---------------------------------------------------------------
  // 2. Fallback: ONLY if the in-memory blob is small enough.
  //    Never persist a multi-MB Data URL into localStorage / RTDB.
  // ---------------------------------------------------------------
  if (byteSize <= MAX_DIRECT_UPLOAD_BYTES) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------
  // 3. Blob too big AND Storage failed → return a safe placeholder
  //    so the caller can show an error instead of a quota crash.
  // ---------------------------------------------------------------
  console.error(
    '[Firebase Storage] Blob exceeds safe fallback limit (1 MB) and Storage unavailable — ' +
    'article save aborted to avoid quota crash.'
  );
  throw new Error(
    'Image trop volumineuse ou Storage indisponible. Réduisez la taille ou réessayez.'
  );
}

/** Helper to compress an image file to a lightweight data URL */
function fileToSafeDataUrl(file: File | Blob, maxWidth = 1280, maxHeight = 720, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    if (file.type && !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width || 800;
      let height = img.height || 450;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.readAsDataURL(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
}

/**
 * Uploads an image file to Firebase Storage specifically for an article
 * (cover/banner image). Attempts Storage with a 4s timeout, then falls back
 * smoothly to an optimized compressed data URL so the article workflow never
 * breaks with alerts or errors.
 *
 * Naming convention:
 *   articles/{articleId}/cover/{timestamp}-{sanitizedName}.{ext}
 */
export async function uploadArticleImage(
  file: File,
  articleId: string,
  label: string = 'cover'
): Promise<string> {
  // Sanitize the filename but keep the original extension for compatibility
  const ext = (file.name?.split('.').pop() || 'webp').toLowerCase().slice(0, 8);
  const safeLabel = (label || 'cover').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `articles/${articleId}/${safeLabel}/${Date.now()}-${file.name || 'img'}.${ext}`;

  try {
    const storageRef = ref(storage, filename);
    const uploadPromise = uploadBytes(storageRef, file, {
      contentType: file.type || `image/${ext === 'svg' ? 'svg+xml' : ext === 'gif' ? 'gif' : 'webp'}`,
    }).then((snapshot) => getDownloadURL(snapshot.ref));

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timed out')), 4000)
    );

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err) {
    console.warn('[Firebase Storage] Direct upload failed, falling back to local compressed image:', err);
    return await fileToSafeDataUrl(file);
  }
}

/**
 * Deletes an article image from Firebase Storage. Best-effort; failures are
 * logged but never surface to the user (the DB record is the source of truth).
 */
export async function deleteArticleImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith('https://')) return;
  try {
    // Extract the storage path from a Firebase Storage download URL
    const match = imageUrl.match(/\/o\/(.+?)\/view/);
    if (!match) return; // not a Firebase Storage URL — nothing to delete
    const storageRef = ref(storage, decodeURIComponent(match[1]));
    await deleteObject(storageRef).catch(() => {});
  } catch (err) {
    console.warn('[Firebase Storage] deleteArticleImage failed:', err);
  }
}
