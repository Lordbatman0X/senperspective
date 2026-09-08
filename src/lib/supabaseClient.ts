import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

function resolveSupabaseUrl(rawUrl?: string, rawAnonKey?: string): string {
  if (rawUrl && (rawUrl.startsWith('https://') || rawUrl.startsWith('http://'))) {
    return rawUrl;
  }
  if (rawAnonKey && rawAnonKey.includes('.')) {
    try {
      const parts = rawAnonKey.split('.');
      if (parts[1]) {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = typeof window !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
        const payload = JSON.parse(json);
        if (payload.ref) {
          return `https://${payload.ref}.supabase.co`;
        }
      }
    } catch {}
  }
  return 'https://ymweduynoxuacchspgfj.supabase.co';
}

const RAW_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SUPABASE_URL = resolveSupabaseUrl(RAW_SUPABASE_URL, SUPABASE_ANON_KEY);

let cachedClient: SupabaseClient<any> | null = null;
let initFailed = false;

function getSupabaseClient(): SupabaseClient<any> {
  if (cachedClient) return cachedClient;

  if (!SUPABASE_ANON_KEY) {
    const msg = '[Supabase] VITE_SUPABASE_ANON_KEY not set. Check your environment settings.';
    console.error(msg);
    throw new Error(msg);
  }

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    },
    db: { schema: 'public' }
  });

  console.log(`[Supabase] Client initialized with URL: ${SUPABASE_URL}`);
  return cachedClient;
}

export function getSupabaseClientOrNull(): SupabaseClient<any> | null {
  // AUDIT fix: do NOT reset `initFailed` on access — a failed init must stay failed
  // until the environment is actually fixed, otherwise every property access
  // retried a full createClient() and spammed console errors.
  try {
    return getSupabaseClient();
  } catch (e) {
    initFailed = true;
    console.error('[Supabase] Client initialization failed. Database operations will be skipped.', e);
    return null;
  }
}

// Safe fallback builder for when Supabase is unconfigured or unreachable
function createSafeFallbackBuilder(): any {
  const result = Promise.resolve({ data: null, error: { message: 'Supabase client not initialized' } });
  const handler: ProxyHandler<any> = {
    get(_, prop) {
      if (prop === 'then') return result.then.bind(result);
      if (prop === 'catch') return result.catch.bind(result);
      if (prop === 'finally') return result.finally.bind(result);
      return (..._args: any[]) => new Proxy(() => {}, handler);
    },
    apply() {
      return new Proxy(() => {}, handler);
    }
  };
  return new Proxy(() => {}, handler);
}

const safeFallbackClient: any = {
  from: () => createSafeFallbackBuilder(),
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInAnonymously: async () => ({ data: { user: null }, error: { message: 'Client not configured' } }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Client not configured' } }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Client not configured' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
  },
  channel: () => ({
    on: () => ({
      subscribe: () => ({ unsubscribe() {} }),
      on: () => ({ subscribe: () => ({ unsubscribe() {} }) })
    }),
    subscribe: () => ({ unsubscribe() {} })
  })
};

// Lazy singleton via Proxy: retries initialization on each access after a failure
export const supabase: any = new Proxy({} as any, {
  get(_, prop) {
    // AUDIT fix: no `initFailed` reset here either; the safeFallbackClient below
    // absorbs all calls when the client is unconfigured, so no TypeError occurs.
    try {
      const client = getSupabaseClient();
      return (client as any)[prop];
    } catch (e) {
      return safeFallbackClient[prop] || createSafeFallbackBuilder();
    }
  }
}) as any;

export async function bootstrapAnonymousAuth(): Promise<User | null> {
  try {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    if (session?.user) return session.user;

    const { data, error } = await client.auth.signInAnonymously();
    if (error) {
      console.warn('[Supabase] Anonymous sign-in unavailable:', error.message);
      return null;
    }
    console.log(`[Supabase BOOT] Anonymous auth established (${data.user?.id?.slice(0, 8)}...)`);
    return data.user;
  } catch (e) {
    console.warn('[Supabase BOOT] Anonymous auth notice:', e);
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    return session?.user ?? null;
  } catch { return null; }
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  try {
    const client = getSupabaseClient();
    return client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  } catch {
    return { data: { subscription: { unsubscribe() {} } } };
  }
}

export function subscribeToTable(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) {
  try {
    const client = getSupabaseClient();
    const channel = client
      .channel(`realtime:public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: filter || undefined },
        callback
      );
    channel.subscribe();
    return channel;
  } catch {
    return { unsubscribe() {} };
  }
}

// FORMATTERS: Map strictly between app camelCase and Supabase public.users snake_case columns
// Columns in Supabase public.users:
// id, email, name, avatar_url, role, is_online, streak, reading_time, hide_personal_info, hide_email, bio, accolades, cover_photo_url, registered_at, last_active_at
export function formatUserForSupabase(user: any): Record<string, any> {
  const email = String(user.email || user.id || '').toLowerCase().trim();
  const id = user.id || email;
  return {
    id,
    email,
    name: user.name || (email === 'kadersdiaz3@gmail.com' ? 'Kader S. Diaz' : email.split('@')[0]),
    avatar_url: user.avatarUrl || user.avatar_url || 'preset-male',
    role: email === 'kadersdiaz3@gmail.com' ? 'Admin' : (user.role || 'Member'),
    is_online: Boolean(user.isOnline || user.is_online),
    streak: typeof user.streak === 'number' ? user.streak : 1,
    reading_time: typeof user.readingTime === 'number' ? user.readingTime : (typeof user.reading_time === 'number' ? user.reading_time : 0),
    hide_personal_info: Boolean(user.hidePersonalInfo || user.hide_personal_info),
    hide_email: Boolean(user.hideEmail || user.hide_email),
    bio: user.bio || (email === 'kadersdiaz3@gmail.com' ? 'Super Administrateur & Fondateur Perspective Group' : ''),
    accolades: Array.isArray(user.accolades) ? user.accolades : ['verified_identity'],
    cover_photo_url: user.coverPhotoUrl || user.cover_photo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop',
    registered_at: user.registeredAt || user.registered_at || new Date().toISOString(),
    last_active_at: user.lastActiveAt || user.last_active_at || new Date().toISOString()
  };
}

export function formatUserFromSupabase(row: any): Record<string, any> {
  if (!row) return row;
  const email = String(row.email || row.id || '').toLowerCase().trim();
  const isSuperAdmin = email === 'kadersdiaz3@gmail.com';
  return {
    id: row.id || email,
    email,
    name: row.name || (isSuperAdmin ? 'Kader S. Diaz' : email.split('@')[0]),
    avatarUrl: row.avatar_url || row.avatarUrl || 'preset-male',
    role: isSuperAdmin ? 'Admin' : (row.role || 'Member'),
    isOnline: Boolean(row.is_online || row.isOnline),
    streak: typeof row.streak === 'number' ? row.streak : 1,
    readingTime: typeof row.reading_time === 'number' ? row.reading_time : (typeof row.readingTime === 'number' ? row.readingTime : 0),
    hidePersonalInfo: Boolean(row.hide_personal_info || row.hidePersonalInfo),
    hideEmail: Boolean(row.hide_email || row.hideEmail),
    bio: row.bio || (isSuperAdmin ? 'Super Administrateur & Fondateur Perspective Group' : ''),
    accolades: Array.isArray(row.accolades) ? row.accolades : (isSuperAdmin ? ['verified_identity', 'editorial_board', 'elite_clearance', 'sahel_insider'] : ['verified_identity']),
    coverPhotoUrl: row.cover_photo_url || row.coverPhotoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop',
    registeredAt: row.registered_at || row.registeredAt || new Date().toISOString(),
    lastActiveAt: row.last_active_at || row.lastActiveAt || new Date().toISOString(),
    // Client-side authentication attributes
    authType: row.authType || row.auth_type || (row.pin ? 'pin' : 'password'),
    emailVerified: row.emailVerified !== undefined ? row.emailVerified : true,
    mfaEnabled: Boolean(row.mfaEnabled || row.twoFactorEnabled),
    twoFactorEnabled: Boolean(row.mfaEnabled || row.twoFactorEnabled),
    password: row.password,
    passwordHash: row.passwordHash || row.password_hash,
    pin: row.pin
  };
}

// Always query the live Supabase users table safely.
// FIX (disappearing accounts): exclude soft-deleted rows so deleteUser() can
// remain non-destructive and soft-deleted accounts never ghost the UI.
export function usersQuery() {
  const client = getSupabaseClient();
  return client.from('users').select('*').is('deleted_at', null);
}

// High-level safe upsert to both Supabase public.users and Central Server Database
export async function saveUserToSupabase(userData: any): Promise<{ success: boolean; data?: any; error?: any }> {
  const email = String(userData.email || userData.id || '').toLowerCase().trim();
  if (!email) return { success: false, error: 'Email missing' };

  let supaSuccess = false;
  let supaData: any = null;

  try {
    const formatted = formatUserForSupabase(userData);
    const { data, error } = await supabase.from('users').upsert(formatted, { onConflict: 'email' }).select();
    if (!error && data && data.length > 0) {
      supaSuccess = true;
      supaData = formatUserFromSupabase(data[0]);
    } else if (error) {
      console.warn('[saveUserToSupabase] Supabase upsert notice:', error.message);
    }
  } catch (err) {
    console.warn('[saveUserToSupabase] Error writing to Supabase users:', err);
  }

  // Also persist to server endpoint to backup complete auth credentials to site_settings
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.user) {
        return { success: true, data: result.user };
      }
    }
  } catch (err) {
    console.warn('[saveUserToSupabase] Notice syncing user to central server:', err);
  }

  return { success: supaSuccess, data: supaData || userData };
}

