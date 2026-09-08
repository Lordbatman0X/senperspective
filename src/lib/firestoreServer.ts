import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Server-side Supabase client (uses process.env, not VITE_ vars)
const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY as string | undefined;

let supabaseServer: SupabaseClient | null = null;

function getSupabaseServer(): SupabaseClient {
  if (supabaseServer) return supabaseServer;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Supabase Server] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Database operations will use local fallback only.');
    throw new Error('Supabase server not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
  return supabaseServer;
}

export { getSupabaseServer };

// Path to durable centralized file-backed store (fallback when Supabase is unreachable)
const DB_FILE_PATH = path.join(process.cwd(), 'server', 'data', 'central_db.json');

interface CentralDB {
  users: Record<string, any>;
  messages: Record<string, any>;
  articles: Record<string, any>;
  comments: Record<string, any>;
  reports: Record<string, any>;
  guest_preferences: Record<string, any>;
  analytics_events: Record<string, any>;
  user_consents: Record<string, any>;
  [key: string]: Record<string, any>;
}

function getInitialDB(): CentralDB {
  return {
    users: {
      "kadersdiaz3@gmail.com": {
        id: "usr_kadersdiaz3_gmail_com",
        email: "kadersdiaz3@gmail.com",
        name: "Kader S. Diaz",
        avatarUrl: "preset-male",
        role: "Admin",
        authType: "password",
        isOnline: true,
        streak: 15,
        readingTime: 480,
        bio: "Super Administrateur & Fondateur Perspective Group",
        accolades: ["verified_identity", "editorial_board", "elite_clearance", "sahel_insider"],
        emailVerified: true,
        registeredAt: "2026-01-01T00:00:00.000Z",
        lastActiveAt: new Date().toISOString()
      },
      "admin@perspective.sn": {
        id: "usr_admin_perspective_sn",
        email: "admin@perspective.sn",
        name: "Perspective Admin",
        avatarUrl: "preset-male",
        role: "Admin",
        authType: "password",
        isOnline: true,
        streak: 10,
        readingTime: 320,
        bio: "Administrateur Système & Supervision Rédactionnelle",
        accolades: ["verified_identity", "elite_clearance"],
        emailVerified: true,
        registeredAt: "2026-01-01T00:00:00.000Z",
        lastActiveAt: new Date().toISOString()
      }
    },
    messages: {},
    articles: {},
    comments: {},
    reports: {},
    guest_preferences: {},
    analytics_events: {},
    user_consents: {}
  };
}

let inMemoryDB: CentralDB | null = null;

function loadCentralDB(): CentralDB {
  if (inMemoryDB) return inMemoryDB;

  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      inMemoryDB = JSON.parse(raw);
      if (!inMemoryDB!.users) inMemoryDB!.users = {};
      if (!inMemoryDB!.users["kadersdiaz3@gmail.com"]) {
        inMemoryDB!.users["kadersdiaz3@gmail.com"] = getInitialDB().users["kadersdiaz3@gmail.com"];
      }
      return inMemoryDB!;
    }
  } catch (err) {
    console.warn("[Central DB] Error reading central_db.json, creating fresh store:", err);
  }

  inMemoryDB = getInitialDB();
  saveCentralDB();
  return inMemoryDB!;
}

function saveCentralDB() {
  if (!inMemoryDB) return;
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(inMemoryDB, null, 2), 'utf-8');
  } catch (err) {
    console.error("[Central DB] Error writing to central_db.json:", err);
  }
}

// Table name mapping (legacy collection names → Supabase table names)
const TABLE_MAP: Record<string, string> = {
  'system_config': 'site_settings',
  'messages': 'messages',
  'articles': 'articles',
  'comments': 'comments',
  'reports': 'reports',
  'guest_preferences': 'guest_preferences',
  'analytics_events': 'analytics_events',
  'user_consents': 'user_consents',
  'users': 'users',
  'media': 'media',
  'ads': 'ads',
  'matches': 'matches',
  'subscribers': 'subscribers'
};

function resolveTable(collectionName: string): string {
  return TABLE_MAP[collectionName] || collectionName;
}

// Helper to normalize doc data for Supabase (unwrap data field for site_settings)
function normalizeSupabaseResult(table: string, row: any): any {
  if (table === 'site_settings' && row.data) {
    return { id: row.id, ...row.data };
  }
  return row;
}

export async function getCollectionDocs(collectionName: string): Promise<any[]> {
  const central = loadCentralDB();
  const localDocsMap = central[collectionName] || {};
  const localDocs = Object.entries(localDocsMap).map(([id, data]) => ({ id, ...(data as any) }));

  try {
    const table = resolveTable(collectionName);
    const client = getSupabaseServer();
    const { data: rows, error } = await client.from(table).select('*');

    if (error) throw error;

    const supabaseDocs: any[] = [];
    if (rows) {
      for (const row of rows) {
        const normalized = normalizeSupabaseResult(table, row);
        supabaseDocs.push(normalized);
        if (!central[collectionName]) central[collectionName] = {};
        central[collectionName][row.id] = normalized;
      }
    }

    saveCentralDB();
    const mergedMap = new Map<string, any>();
    localDocs.forEach(d => mergedMap.set(d.id, d));
    supabaseDocs.forEach(d => mergedMap.set(d.id, d));
    return Array.from(mergedMap.values());
  } catch (err: any) {
    console.warn(`[Central DB / Supabase fallback] Fetching collection "${collectionName}" from local store:`, err?.message || err);
    return localDocs;
  }
}

export async function getDocument(collectionName: string, docId: string): Promise<{ id: string; data: any } | null> {
  const central = loadCentralDB();
  const localData = central[collectionName]?.[docId];

  try {
    const table = resolveTable(collectionName);
    const client = getSupabaseServer();

    if (table === 'site_settings') {
      const { data, error } = await client.from('site_settings').select('*').eq('id', docId).single();
      if (error) throw error;
      if (data) {
        const normalized = normalizeSupabaseResult('site_settings', data);
        if (!central[collectionName]) central[collectionName] = {};
        central[collectionName][docId] = normalized;
        saveCentralDB();
        return { id: data.id, data: normalized };
      }
    } else {
      const { data, error } = await client.from(table).select('*').eq('id', docId).single();
      if (error) throw error;
      if (data) {
        if (!central[collectionName]) central[collectionName] = {};
        central[collectionName][docId] = data;
        saveCentralDB();
        return { id: data.id, data };
      }
    }
  } catch (err: any) {
    console.warn(`[Central DB / Supabase fallback] getDocument for ${collectionName}/${docId}:`, err?.message || err);
  }

  if (localData) {
    return { id: docId, data: localData };
  }
  return null;
}

export async function saveDocument(collectionName: string, docId: string, data: any, merge: boolean = true): Promise<{ id: string; data: any }> {
  const central = loadCentralDB();
  if (!central[collectionName]) central[collectionName] = {};

  const existing = central[collectionName][docId] || {};
  const updated = merge ? { ...existing, ...data } : { ...data };
  central[collectionName][docId] = updated;
  saveCentralDB();

  // Background mirror to Supabase (non-blocking)
  try {
    const table = resolveTable(collectionName);
    const client = getSupabaseServer();

    if (table === 'site_settings') {
      const { data: existingRow } = await client.from('site_settings').select('data').eq('id', docId).maybeSingle();
      const existingData = existingRow?.data || {};
      const mergedData = merge ? { ...existingData, ...data } : { ...data };
      try {
        await client.from('site_settings').upsert({ id: docId, data: mergedData });
      } catch (mirrorErr: any) {
        if (mirrorErr?.message) console.warn(`[Supabase mirror notice] ${collectionName}/${docId}:`, mirrorErr.message);
      }
    } else {
      try {
        await client.from(table).upsert({ id: docId, ...updated });
      } catch (mirrorErr: any) {
        if (mirrorErr?.message) console.warn(`[Supabase mirror notice] ${collectionName}/${docId}:`, mirrorErr.message);
      }
    }
  } catch (err: any) {
    console.warn(`[Supabase mirror notice] Could not mirror ${collectionName}/${docId}:`, err?.message || err);
  }

  return { id: docId, data: updated };
}

export async function deleteDocument(collectionName: string, docId: string): Promise<boolean> {
  if (collectionName === 'users' && docId.toLowerCase().trim() === 'kadersdiaz3@gmail.com') {
    console.warn('[Central DB] Blocked attempt to delete Super Admin kadersdiaz3@gmail.com');
    return false;
  }

  const central = loadCentralDB();
  if (central[collectionName]?.[docId]) {
    delete central[collectionName][docId];
    saveCentralDB();
  }

  // Background mirror delete to Supabase
  try {
    const table = resolveTable(collectionName);
    const client = getSupabaseServer();
    const { error } = await client.from(table).delete().eq('id', docId);
    if (error) console.warn(`[Supabase mirror notice] Could not mirror delete ${collectionName}/${docId}:`, error.message);
  } catch (err: any) {
    console.warn(`[Supabase mirror notice] Could not mirror delete ${collectionName}/${docId}:`, err?.message || err);
  }

  return true;
}

export async function wipeCollection(collectionName: string): Promise<number> {
  const central = loadCentralDB();
  const existingCount = Object.keys(central[collectionName] || {}).length;
  central[collectionName] = {};

  if (collectionName === 'users') {
    central.users["kadersdiaz3@gmail.com"] = getInitialDB().users["kadersdiaz3@gmail.com"];
    central.users["admin@perspective.sn"] = getInitialDB().users["admin@perspective.sn"];
  }

  saveCentralDB();

  try {
    const table = resolveTable(collectionName);
    const client = getSupabaseServer();
    await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err: any) {
    console.warn(`[Central DB] Notice wiping collection in Supabase:`, err?.message || err);
  }

  return existingCount;
}

export async function registerUser(email: string, password?: string, name?: string, role: string = 'Abonné', additionalFields: any = {}) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const central = loadCentralDB();

  if (central.users[normalizedEmail]) {
    const existing = central.users[normalizedEmail];
    const updated = {
      ...existing,
      ...additionalFields,
      lastActiveAt: new Date().toISOString()
    };
    central.users[normalizedEmail] = updated;
    saveCentralDB();
    return { id: normalizedEmail, ...updated };
  }

  const isSuperAdmin = normalizedEmail === 'kadersdiaz3@gmail.com';
  const userData = {
    id: normalizedEmail,
    email: normalizedEmail,
    name: name || normalizedEmail.split('@')[0],
    role: isSuperAdmin ? 'Admin' : role,
    password: password || 'default_pass',
    avatarUrl: additionalFields.avatarUrl || 'preset-male',
    registeredAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isOnline: true,
    streak: 1,
    readingTime: 0,
    accolades: isSuperAdmin ? ['verified_identity', 'editorial_board', 'elite_clearance'] : ['verified_identity'],
    ...additionalFields
  };

  central.users[normalizedEmail] = userData;
  saveCentralDB();

  // Background mirror to Supabase (non-blocking)
  try {
    const client = getSupabaseServer();
    const { error } = await client.from('users').upsert({ id: normalizedEmail, ...userData });
    if (error) console.warn(`[Supabase mirror notice] Could not mirror register ${normalizedEmail}:`, error.message);
  } catch (err: any) {
    console.warn(`[Supabase mirror notice] Could not mirror register ${normalizedEmail}:`, err?.message || err);
  }

  return { id: normalizedEmail, ...userData };
}

export async function loginUser(email: string, password?: string) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const central = loadCentralDB();
  if (central.users[normalizedEmail]) {
    const user = central.users[normalizedEmail];
    user.lastActiveAt = new Date().toISOString();
    user.isOnline = true;
    saveCentralDB();
    return { id: normalizedEmail, ...user };
  }
  return await registerUser(email, password);
}

// Map legacy collection names to Supabase tables for analytics/consents
const SUPABASE_TABLE_MAP: Record<string, string> = {
  'analytics_events': 'analytics_events',
  'user_consents': 'user_consents'
};

export async function saveAnalyticsEvent(eventRecord: any) {
  const id = eventRecord.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  return await saveDocument('analytics_events', id, eventRecord, true);
}

export async function saveUserConsent(consentRecord: any) {
  const id = consentRecord.id || consentRecord.sessionId || `consent_${Date.now()}`;
  return await saveDocument('user_consents', id, consentRecord, true);
}

export async function getAnalyticsEvents() {
  return await getCollectionDocs('analytics_events');
}

export async function getUserConsents() {
  return await getCollectionDocs('user_consents');
}

export async function wipeAnalytics() {
  await wipeCollection('analytics_events');
  await wipeCollection('user_consents');
  return true;
}

export async function updateUserPasswordServer(email: string, newPassword: string) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const central = loadCentralDB();
  if (central.users[normalizedEmail]) {
    central.users[normalizedEmail].password = newPassword;
    central.users[normalizedEmail].passwordUpdatedAt = new Date().toISOString();
    saveCentralDB();
  }

  // Background mirror to Supabase
  try {
    const client = getSupabaseServer();
    const { error } = await client.from('users').update({ password: newPassword, passwordUpdatedAt: new Date().toISOString() }).eq('id', normalizedEmail);
    if (error) console.warn(`[Supabase mirror notice] Could not update password for ${normalizedEmail}:`, error.message);
  } catch (err: any) {
    console.warn(`[Supabase mirror notice] Could not update password for ${normalizedEmail}:`, err?.message || err);
  }

  return { success: true, email: normalizedEmail };
}

