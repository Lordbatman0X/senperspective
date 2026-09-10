// =============================================================================
// Backend data-layer shim (no Supabase dependency)
//
// This module preserves the exact export surface that the rest of the codebase
// imports from `./supabaseClient`, but routes every operation through the
// Express backend (MongoDB Atlas) via resolveApiUrl(). This avoids:
//   - The old Proxy `this`-binding bug where supabase.from() silently returned
//     unbound methods and caused every DB write to fail (=> accounts "disappearing")
//   - Raw fetch('/api/...') hitting the static Firebase host instead of the backend
//   - The @supabase/supabase-js dependency
// =============================================================================

import { resolveApiUrl, safeFetchJson, SafeFetchResult } from './apiUtils';
import { sanitizeFirestorePayload } from './imageUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type User = {
  id: string;
  email: string | null;
  user_metadata?: Record<string, any>;
  email_confirmed_at?: string;
  [k: string]: any;
};

export type Session = {
  user: User | null;
  access_token: string;
};

// ---------------------------------------------------------------------------
// In-memory session (mirrors Supabase Auth session shape)
// ---------------------------------------------------------------------------
let _sessionUser: any = null;
try {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('perspective_auth_session');
    if (stored) _sessionUser = safeJsonParse(stored, {});
  }
} catch {}

// ---------------------------------------------------------------------------
// Field mappers (camelCase <-> backend)
// ---------------------------------------------------------------------------
export function formatUserForSupabase(user: any): Record<string, any> {
  return formatUserForBackend(user);
}
export function formatUserFromSupabase(row: any): Record<string, any> {
  return formatUserFromBackend(row);
}

export function formatUserForBackend(user: any): Record<string, any> {
  const email = String(user.email || user.id || '').toLowerCase().trim();
  const id = user.id || email;
  const isSuperAdmin = email === 'kadersdiaz3@gmail.com';
  return {
    id,
    email,
    name: user.name || (isSuperAdmin ? 'Kader S. Diaz' : email.split('@')[0]),
    avatarUrl: user.avatarUrl || user.avatar_url || 'preset-male',
    role: isSuperAdmin ? 'Admin' : (user.role || 'Member'),
    isOnline: Boolean(user.isOnline || user.is_online),
    streak: typeof user.streak === 'number' ? user.streak : 1,
    readingTime: typeof user.readingTime === 'number' ? user.readingTime : 0,
    hidePersonalInfo: Boolean(user.hidePersonalInfo || user.hide_personal_info),
    hideEmail: Boolean(user.hideEmail || user.hide_email),
    bio: user.bio || (isSuperAdmin ? 'Super Administrateur & Fondateur Perspective Group' : ''),
    accolades: Array.isArray(user.accolades) ? user.accolades : (isSuperAdmin ? ['verified_identity', 'editorial_board', 'elite_clearance', 'sahel_insider'] : ['verified_identity']),
    coverPhotoUrl: user.coverPhotoUrl || user.cover_photo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop',
    registeredAt: user.registeredAt || user.registered_at || new Date().toISOString(),
    lastActiveAt: user.lastActiveAt || user.last_active_at || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt || new Date().toISOString(),
    authType: user.authType || 'password',
    emailVerified: user.emailVerified !== undefined ? user.emailVerified : true,
    mfaEnabled: Boolean(user.mfaEnabled || user.twoFactorEnabled),
    twoFactorEnabled: Boolean(user.mfaEnabled || user.twoFactorEnabled),
    deletedAt: user.deletedAt || user.deleted_at || null,
    ...user
  };
}

export function formatUserFromBackend(row: any): Record<string, any> {
  if (!row) return row;
  const email = String(row.email || row.id || '').toLowerCase().trim();
  const isSuperAdmin = email === 'kadersdiaz3@gmail.com';
  return {
    id: row.id || email,
    email,
    name: row.name || (isSuperAdmin ? 'Kader S. Diaz' : email.split('@')[0]),
    avatarUrl: row.avatarUrl || row.avatar_url || 'preset-male',
    role: isSuperAdmin ? 'Admin' : (row.role || 'Member'),
    isOnline: Boolean(row.isOnline || row.is_online),
    streak: typeof row.streak === 'number' ? row.streak : 1,
    readingTime: typeof row.readingTime === 'number' ? row.readingTime : 0,
    hidePersonalInfo: Boolean(row.hidePersonalInfo || row.hide_personal_info),
    hideEmail: Boolean(row.hideEmail || row.hide_email),
    bio: row.bio || (isSuperAdmin ? 'Super Administrateur & Fondateur Perspective Group' : ''),
    accolades: Array.isArray(row.accolades) ? row.accolades : (isSuperAdmin ? ['verified_identity', 'editorial_board', 'elite_clearance', 'sahel_insider'] : ['verified_identity']),
    coverPhotoUrl: row.coverPhotoUrl || row.cover_photo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop',
    registeredAt: row.registeredAt || row.registered_at || new Date().toISOString(),
    lastActiveAt: row.lastActiveAt || row.last_active_at || new Date().toISOString(),
    lastLoginAt: row.lastLoginAt || new Date().toISOString(),
    authType: row.authType || (row.pin ? 'pin' : 'password'),
    emailVerified: row.emailVerified !== undefined ? row.emailVerified : true,
    mfaEnabled: Boolean(row.mfaEnabled || row.twoFactorEnabled),
    twoFactorEnabled: Boolean(row.mfaEnabled || row.twoFactorEnabled),
    password: row.password,
    passwordHash: row.passwordHash || row.password_hash,
    pin: row.pin,
    deletedAt: row.deletedAt || row.deleted_at || null,
    notificationPreferences: row.notificationPreferences || row.notification_preferences,
    hidePersonalInfo_raw: row
  };
}

// ---------------------------------------------------------------------------
// Query builder — mimics the Supabase postgrest query-builder interface
// Supports: .select(), .eq(), .neq(), .is(), .single(), .maybeSingle(),
//           .upsert(), .insert(), .update(), .delete(), thenable (await / Promise.all)
// ---------------------------------------------------------------------------

function createQueryBuilder(table: string): any {
  const qb: any = {
    _table: table,
    _operation: 'select',
    _data: null,
    _selectFields: '*',
    _eqFilters: [] as Array<{ col: string; val: any }>,
    _isFilter: null as { col: string; val: any } | null,

    select(fields?: string) { qb._selectFields = fields || '*'; return qb; },
    eq(col: string, val: any) { qb._eqFilters.push({ col, val }); return qb; },
    neq(col: string, val: any) { qb._eqFilters.push({ col, val: { neq: val } }); return qb; },
    is(col: string, val: any) { qb._isFilter = { col, val }; return qb; },
    order(_col: string, _opts?: any) { return qb; },
    limit(_n: number) { return qb; },

    upsert(data: any, _opts?: any) { qb._operation = 'upsert'; qb._data = data; return qb; },
    insert(data: any) { qb._operation = 'insert'; qb._data = data; return qb; },
    update(data: any) { qb._operation = 'update'; qb._data = data; return qb; },
    delete() { qb._operation = 'delete'; return qb; },

    async _exec() {
      return await executeQuery(qb);
    },

        // thenable — so `await qb` and `Promise.all([qb, ...])` work
    then(onResolve: any, onReject?: any) {
      return executeQuery(qb).then(onResolve, onReject);
    },
    // catch — so `.catch()` chains work on thenables (many call-sites use .catch())
    catch(onReject: any) {
      return executeQuery(qb).catch(onReject);
    },

    async single() {
      const result = await executeQuery(qb);
      const data = Array.isArray(result.data) ? result.data[0] : result.data;
      return { data: qb._table === 'users' ? formatUserFromBackend(data) : data, error: result.error };
    },

    async maybeSingle() {
      const result = await executeQuery(qb);
      const data = Array.isArray(result.data) ? result.data[0] : result.data;
      return { data: qb._table === 'users' ? formatUserFromBackend(data) : data, error: result.error };
    }
  };

  return qb;
}

async function executeQuery(qb: any): Promise<{ data: any; error: any | null }> {
  const table = qb._table;
  const op = qb._operation;

  if (op === 'upsert' || op === 'insert' || op === 'update') {
    return execMutation(qb);
  }

  if (op === 'delete') {
    return execDelete(qb);
  }

  // SELECT
  const docs = await fetchCollection(table);
  if (!docs) return { data: [], error: { message: 'Collection not found' } };

  let filtered = docs;

  // Apply .eq() filters client-side
  for (const f of qb._eqFilters) {
    const fcol = f.col.toLowerCase();
    const fval = typeof f.val === 'object' && f.val !== null ? f.val.neq : f.val;
    if (typeof f.val === 'object' && f.val !== null && !Array.isArray(f.val)) {
      // neq
      filtered = filtered.filter((d: any) => d[fcol] !== fval);
    } else {
      filtered = filtered.filter((d: any) => {
        const dval = d[fcol] !== undefined ? d[fcol] : d[f.col] !== undefined ? d[f.col] : undefined;
        return String(dval || '').toLowerCase() === String(fval || '').toLowerCase();
      });
    }
  }

  // Apply .is() filter (soft-delete filtering)
  if (qb._isFilter && qb._isFilter.val === null) {
    filtered = filtered.filter((d: any) => !d[qb._isFilter.col] && !d[qb._isFilter.col?.replace(/_/g, '')]);
  }

  if (table === 'users') {
    filtered = filtered.map(formatUserFromBackend);
  }

  return { data: filtered, error: null };
}

async function fetchCollection(table: string): Promise<any[] | null> {
  // /api/users returns flat user objects; other collections return documents with { id, ... }
  if (table === 'users') {
    const res = await safeFetchJson(resolveApiUrl('/api/users'));
    if (!res.ok) {
      // fall through to mongodb collection endpoint
    } else if (res.data && Array.isArray((res.data as any).users)) {
      return (res.data as any).users;
    }
  }

  const res = await safeFetchJson(resolveApiUrl(`/api/mongodb/collection/${encodeURIComponent(table)}`));
  if (!res.ok) return null;

  if (res.isStaticFallback) return null;

  // Response shape: { success, documents: [{ id, ...fields }] }
  // or { data: [...] }
  const arr = (res.data as any)?.documents || (res.data as any)?.data || (Array.isArray(res.data) ? res.data : []);
  if (!Array.isArray(arr)) return null;

  // If documents are wrapped in { id, data }, unwrap
  return arr.map((d: any) => {
    if (d && typeof d === 'object' && 'data' in d && typeof d.data === 'object' && Object.keys(d).length === 2) {
      return { id: d.id, ...d.data };
    }
    return d;
  });
}

async function fetchDocById(table: string, id: string): Promise<any | null> {
  const res = await safeFetchJson(resolveApiUrl(`/api/mongodb/doc/${encodeURIComponent(table)}/${encodeURIComponent(id)}`));
  if (!res.ok || !res.data) return null;
  // Unwrap { id, data }
  if (res.data && typeof res.data === 'object' && 'data' in res.data && typeof res.data.data === 'object' && Object.keys(res.data).length === 2) {
    return { id: res.data.id, ...res.data.data };
  }
  return res.data;
}

async function execMutation(qb: any): Promise<{ data: any; error: any | null }> {
  const table = qb._table;
  let docs = qb._data;

  if (!Array.isArray(docs)) docs = [docs];
  docs = docs.filter((d: any) => d !== null && d !== undefined);

  const results: any[] = [];

  for (let doc of docs) {
    // Merge eq-filters into the document (e.g. .eq('email', x) for user upserts)
    qb._eqFilters.forEach((f: any) => {
      const fval = typeof f.val === 'object' && f.val !== null && !Array.isArray(f.val) ? f.val.neq : f.val;
      if (!(f.col in doc) && fval !== undefined) {
        doc[f.col] = fval;
      }
    });

    // Format for backend
    if (table === 'users') {
      doc = formatUserForBackend(doc);
    }

    const docId = doc.id || doc.email || doc._id;
    if (!docId) continue;

    const clean = await sanitizeFirestorePayload(doc);
    const res = await safeFetchJson(
      resolveApiUrl(`/api/mongodb/doc/${encodeURIComponent(table)}/${encodeURIComponent(String(docId))}`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: clean, merge: qb._operation === 'upsert' || qb._operation === 'update' })
      }
    );

    if (res.ok && res.data) {
      results.push(res.data);
    } else if (!res.ok && res.status === 0) {
      // network error — continue silently
    }
  }

  return { data: results, error: null };
}

async function execDelete(qb: any): Promise<{ data: any; error: any | null }> {
  const table = qb._table;
  const docs = await fetchCollection(table) || [];

  // Apply eq-filters to find the doc(s) to delete
  let toDelete = docs;
  for (const f of qb._eqFilters) {
    const fval = typeof f.val === 'object' && f.val !== null && !Array.isArray(f.val) ? f.val.neq : f.val;
    if (!(typeof f.val === 'object' && f.val !== null && !Array.isArray(f.val))) {
      toDelete = toDelete.filter((d: any) => {
        const dval = d[f.col] !== undefined ? d[f.col] : d[f.col.replace(/_/g, '')];
        return String(dval || '').toLowerCase() === String(fval || '').toLowerCase();
      });
    }
  }

  const results: any[] = [];

  for (const doc of toDelete) {
    const docId = doc.id || doc.email || doc._id;
    if (!docId) continue;

    // Protected accounts can never be deleted
    const email = String(doc.email || '').toLowerCase().trim();
    if (email === 'kadersdiaz3@gmail.com' || email === 'admin@perspective.sn') {
      console.warn(`[Backend] Blocked attempt to delete protected account ${email}`);
      continue;
    }

    const res = await safeFetchJson(
      resolveApiUrl(`/api/mongodb/doc/${encodeURIComponent(table)}/${encodeURIComponent(String(docId))}`),
      { method: 'DELETE' }
    );
    if (res.ok) results.push(docId);
  }

  return { data: results, error: null };
}

// ---------------------------------------------------------------------------
// `supabase` compatibility object — replaces the broken Proxy
// ---------------------------------------------------------------------------
export const supabase: any = {
  from(table: string) {
    return createQueryBuilder(table);
  },

  auth: {
    async getSession(): Promise<{ data: { session: Session | null }; error: any }> {
      try {
        const stored = localStorage.getItem('perspective_auth_session');
        if (stored) {
          const parsed = safeJsonParse(stored, {});
          _sessionUser = parsed;
          const sessUser: User = {
            id: parsed.id || parsed.email,
            email: parsed.email,
            user_metadata: { full_name: parsed.name, avatar_url: parsed.avatarUrl },
            email_confirmed_at: parsed.emailVerified ? new Date().toISOString() : undefined
          };
          return { data: { session: { user: sessUser, access_token: 'session_' + parsed.email } }, error: null };
        }
      } catch (e) { return { data: { session: null }, error: e }; }
      return { data: { session: null }, error: null };
    },

    async signUp(payload: any): Promise<{ data: { user: User | null; session: Session | null }; error: any }> {
      try {
        const res = await safeFetchJson(resolveApiUrl('/api/mongodb/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, email: (payload.email || '').toLowerCase().trim() })
        });
        if (res.ok && res.data?.user) {
          const user = res.data.user;
          const sessUser: User = {
            id: user.id,
            email: user.email,
            user_metadata: { full_name: user.name, avatar_url: user.avatarUrl },
            email_confirmed_at: user.emailVerified ? new Date().toISOString() : undefined
          };
          _sessionUser = user;
          localStorage.setItem('perspective_auth_session', JSON.stringify(user));
          return { data: { user: sessUser, session: { user: sessUser, access_token: 'token_' + user.email } }, error: null };
        }
        if (res.data?.error?.includes('existe déjà') || res.data?.error?.includes('already')) {
          return { data: { user: null, session: null }, error: { message: 'already registered' } };
        }
        return { data: { user: null, session: null }, error: { message: res.error || 'Registration failed' } };
      } catch (e: any) {
        return { data: { user: null, session: null }, error: e };
      }
    },

    async signInWithPassword(payload: any): Promise<{ data: { user: User | null; session: Session | null }; error: any }> {
      try {
        const res = await safeFetchJson(resolveApiUrl('/api/mongodb/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: (payload.email || '').toLowerCase().trim(),
            password: payload.password
          })
        });
        if (res.ok && res.data?.user) {
          const user = res.data.user;
          const sessUser: User = {
            id: user.id,
            email: user.email,
            user_metadata: { full_name: user.name, avatar_url: user.avatarUrl },
            email_confirmed_at: user.emailVerified ? new Date().toISOString() : undefined
          };
          _sessionUser = user;
          localStorage.setItem('perspective_auth_session', JSON.stringify(user));
          return { data: { user: sessUser, session: { user: sessUser, access_token: 'token_' + user.email } }, error: null };
        }
        return { data: { user: null, session: null }, error: { message: res.error || 'Invalid credentials' } };
      } catch (e: any) {
        return { data: { user: null, session: null }, error: e };
      }
    },

    async signOut(): Promise<{ error: any }> {
      try { localStorage.removeItem('perspective_auth_session'); } catch {}
      _sessionUser = null;
      return { error: null };
    }
  },

  channel() {
    return {
      on() { return this; },
      subscribe() { return { unsubscribe() {} }; },
      unsubscribe() {}
    };
  }
};

// ---------------------------------------------------------------------------
// Auth helpers (kept for import compatibility)
// ---------------------------------------------------------------------------
export const getSupabaseClientOrNull = () => supabase;

export async function bootstrapAnonymousAuth(): Promise<User | null> {
  try {
    const r = await supabase.auth.getSession();
    return r.data?.session?.user ?? null;
  } catch { return null; }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const r = await supabase.auth.getSession();
    return r.data?.session?.user ?? null;
  } catch { return null; }
}

// Auth state change listener — checks localStorage every 1s
export function onAuthStateChanged(callback: (user: User | null) => void) {
  let lastSig = '';
  const check = async () => {
    try {
      const r = await supabase.auth.getSession();
      const u = r.data?.session?.user ?? null;
      const sig = u?.email || '';
      if (sig !== lastSig) {
        lastSig = sig;
        callback(u);
      }
    } catch { callback(null); }
  };
  check();
  const iv = setInterval(check, 1000);
  return { data: { subscription: { unsubscribe() { clearInterval(iv); } } } };
}

// No-op realtime subscription (backend doesn't expose realtime)
export function subscribeToTable(_table: string, _callback: (payload: any) => void, _filter?: string) {
  return { unsubscribe() {} };
}

// ---------------------------------------------------------------------------
// usersQuery — returns a thenable query-builder for non-deleted users
// ---------------------------------------------------------------------------
export function usersQuery(): any {
  return createQueryBuilder('users')
    .select('*')
    .is('deletedAt', null);
}

// ---------------------------------------------------------------------------
// High-level save (compat)
// ---------------------------------------------------------------------------
export async function saveUserToSupabase(userData: any): Promise<{ success: boolean; data?: any; error?: any }> {
  const email = String(userData.email || userData.id || '').toLowerCase().trim();
  if (!email) return { success: false, error: 'Email missing' };
  try {
    const clean = await sanitizeFirestorePayload({ ...userData, email, lastActiveAt: new Date().toISOString() });
    const res = await safeFetchJson(resolveApiUrl(`/api/mongodb/doc/users/${encodeURIComponent(email)}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: clean, merge: true })
    });
    if (res.ok && res.data) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Save failed' };
  } catch (err: any) {
    return { success: false, error: err };
  }
}
export const saveUserToBackend = saveUserToSupabase;
