// =============================================================================
// Cloud persistence helper — routes ALL user-generated content through the
// central server API (/api/mongodb/*), which persists to MongoDB Atlas.
// Replaces the retired browser-side Supabase client for messages,
// notifications, friends, interactions and profile updates.
//
// IMPORTANT (audit fix): every request is resolved through resolveApiUrl()
// so it honors the configured backend base (Admin → API, VITE_BACKEND_URL,
// or the static-host fallback). A raw relative fetch would hit the static
// Firebase host instead of the Express API and silently return index.html.
// =============================================================================
import { sanitizeFirestorePayload } from './imageUtils';
import { resolveApiUrl } from './apiUtils';

function cloudFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(resolveApiUrl(path), options);
}

export async function cloudSave(collection: string, id: string, data: any): Promise<void> {
  try {
    const clean = await sanitizeFirestorePayload(data);
    await cloudFetch(`/api/mongodb/doc/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: clean, merge: true })
    });
  } catch (err) {
    console.warn(`[CloudStore] save ${collection}/${id} notice:`, err);
  }
}

export async function cloudDelete(collection: string, id: string): Promise<void> {
  try {
    await cloudFetch(`/api/mongodb/doc/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn(`[CloudStore] delete ${collection}/${id} notice:`, err);
  }
}

// Returns an array of document payloads (each containing at least an `id`)
export async function cloudLoadCollection(collection: string): Promise<any[]> {
  try {
    const res = await cloudFetch(`/api/mongodb/collection/${encodeURIComponent(collection)}`);
    if (!res.ok) return [];
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return []; // static-hosting fallback page, not the API
    const json = await res.json();
    if (!json?.success || !Array.isArray(json.documents)) return [];
    // Server returns flattened docs: { id, ...fields }
    return json.documents.filter((d: any) => d && d.id);
  } catch (err) {
    console.warn(`[CloudStore] load ${collection} notice:`, err);
    return [];
  }
}

// Merge-save a user profile (avatar, bio, preferences...) into the users collection
export async function cloudSaveUserProfile(email: string, fields: Record<string, any>): Promise<void> {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return;
  try {
    const clean = await sanitizeFirestorePayload(fields);
    await cloudFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...clean, email: cleanEmail, id: cleanEmail })
    });
  } catch (err) {
    console.warn('[CloudStore] profile save notice:', err);
  }
}
