import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Uploads a file (or Blob) to Firebase Storage and returns the public download URL.
 * Falls back to an optimized Data URL if Storage fails or is unavailable.
 */
export async function uploadMediaFile(file: File | Blob, customPath?: string): Promise<string> {
  const filename = customPath || `media/${Date.now()}-${(file as File).name || 'upload.webp'}`;
  try {
    const storageRef = ref(storage, filename);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/webp',
    });
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.warn('[Firebase Storage] Direct upload failed, falling back to data URL:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
