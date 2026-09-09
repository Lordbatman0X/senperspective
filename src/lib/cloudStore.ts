// =============================================================================
// Cloud persistence helper — routes ALL user-generated content through the
// central server API (/api/mongodb/*), which persists to MongoDB Atlas.
// Replaces the retired browser-side Supabase client for messages,
// notifications, friends, interactions and profile updates.
// =============================================================================
import { sanitizeFirestorePayload } from './imageUtils';

export async function cloudSave(collection: string, id: string, data: any): Promise<void> {
  try {
    const clean = await sanitizeFirestorePayload(data);
    await fetch(`/api/mongodb/doc/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
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
    await fetch(`/api/mongodb/doc/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn(`[CloudStore] delete ${collection}/${id} notice:`, err);
  }
}

// Returns an array of document payloads (each containing at least an `id`)
export async function cloudLoadCollection(collection: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/mongodb/collection/${encodeURIComponent(collection)}`);
    if (!res.ok) return [];
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
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...clean, email: cleanEmail, id: cleanEmail })
    });
  } catch (err) {
    console.warn('[CloudStore] profile save notice:', err);
  }
}
