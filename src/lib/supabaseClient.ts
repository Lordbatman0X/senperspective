import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cachedClient: SupabaseClient<any> | null = null;
let initFailed = false;

function getSupabaseClient(): SupabaseClient<any> {
  if (cachedClient) return cachedClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const msg = '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Check your .env file.';
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

  console.log('[Supabase] Client initialized.');
  return cachedClient;
}

export function getSupabaseClientOrNull(): SupabaseClient<any> | null {
  if (initFailed) {
    initFailed = false;
  }
  try {
    return getSupabaseClient();
  } catch (e) {
    initFailed = true;
    console.error('[Supabase] Client initialization failed. Database operations will be skipped.', e);
    return null;
  }
}

// Lazy singleton via Proxy: retries initialization on each access after a failure
export const supabase: SupabaseClient<any> = new Proxy({} as SupabaseClient<any>, {
  get(_, prop) {
    if (initFailed) {
      initFailed = false;
    }
    try {
      const client = getSupabaseClient();
      return (client as any)[prop];
    } catch (e) {
      console.error(`[Supabase] Cannot access .${String(prop)}: client not initialized.`, e);
      return undefined;
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
      .channel(`realtime:${table}`)
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

// Always filter out soft-deleted users from reads
export function usersQuery() {
  const client = getSupabaseClient();
  return client.from('users').select('*').is('deleted_at', null);
}
