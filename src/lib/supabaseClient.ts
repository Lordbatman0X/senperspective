import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { Database } from './supabaseDatabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Supabase client not initialized.');
    throw new Error('Supabase not configured: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  cachedClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  return cachedClient;
}

export const supabase = /* lazy */ (() => {
  try { return getSupabaseClient(); } catch { return null as any; }
})();

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

export function getCurrentUser(): User | null {
  try {
    const client = getSupabaseClient();
    return client.auth.getSession().then(({ data }) => data.session?.user ?? null) as any;
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
