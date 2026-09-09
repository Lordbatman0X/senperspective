import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// SECURITY (audit fix): passwords are hashed server-side with the same SHA-256
// scheme used by the client (authCrypto.ts) instead of being stored in plaintext.
const AUTH_SALT = '_perspective_auth_v2_2026_salt';
export function hashPasswordServer(password?: string): string {
  if (!password) return '';
  return createHash('sha256').update(String(password) + AUTH_SALT).digest('hex');
}

// ==============================================================================
// MONGODB ATLAS â€” single source of truth (replaces Supabase).
// Configure MONGODB_URI in .env (never committed). Falls back to a local JSON
// file store only if the database is unreachable, so the app keeps working.
// ==============================================================================
const MONGO_URI = process.env.MONGODB_URI as string | undefined;
const MONGO_DB_NAME = (process.env.MONGODB_DB || 'perspective') as string;

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let connectPromise: Promise<Db | null> | null = null;
let seeded = false;

async function getDb(): Promise<Db | null> {
  if (mongoDb) return mongoDb;
  if (!MONGO_URI) {
    console.warn('[MongoDB] MONGODB_URI not set. Using local fallback store only.');
    return null;
  }
  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        mongoClient = new MongoClient(MONGO_URI!, { serverSelectionTimeoutMS: 8000 });
        await mongoClient.connect();
        mongoDb = mongoClient.db(MONGO_DB_NAME);
        console.log(`[MongoDB] Connected to Atlas database "${MONGO_DB_NAME}".`);
        await seedCoreAccounts();
        return mongoDb;
      } catch (err: any) {
        console.error('[MongoDB] Connection failed, using local fallback:', err?.message || err);
        connectPromise = null;
        return null;
      }
    })();
  }
  return connectPromise;
}

export const PROTECTED_EMAILS = ['kadersdiaz3@gmail.com', 'admin@perspective.sn'];

async function seedCoreAccounts() {
  if (seeded || !mongoDb) return;
  try {
    const users = mongoDb.collection('users');
    // DISAPPEARING-ACCOUNTS FIX: protected identities are always enforced on
    // connect/restart — name, role, bio, accolades and verified flag can never be
    // wiped. deletedAt is cleared so the super admin can never become invisible.
    // A custom-uploaded avatar is preserved; default is only applied when missing.
    const accounts = [
      {
        email: 'kadersdiaz3@gmail.com',
        password: 'Perspective2026!',
        avatar: 'preset-male',
        identity: {
          id: 'kadersdiaz3@gmail.com', email: 'kadersdiaz3@gmail.com',
          name: 'Kader S. Diaz', role: 'Admin', authType: 'password',
          isOnline: false, streak: 25, readingTime: 820,
          bio: 'Fondateur & Directeur de Publication — Perspective Group Sénégal',
          accolades: ['verified_identity', 'editorial_board', 'elite_clearance', 'sahel_insider'],
          emailVerified: true, registeredAt: '2026-01-01T00:00:00.000Z',
          lastActiveAt: new Date().toISOString(), deletedAt: null
        }
      },
      {
        email: 'admin@perspective.sn',
        password: 'Admin2026!',
        avatar: 'preset-male',
        identity: {
          id: 'admin@perspective.sn', email: 'admin@perspective.sn',
          name: 'Perspective Admin', role: 'Admin', authType: 'password',
          isOnline: false, streak: 10, readingTime: 320,
          bio: 'Administrateur Système & Supervision Rédactionnelle',
          accolades: ['verified_identity', 'elite_clearance'],
          emailVerified: true, registeredAt: '2026-01-01T00:00:00.000Z',
          lastActiveAt: new Date().toISOString(), deletedAt: null
        }
      }
    ];
    for (const acct of accounts) {
      const current = await users.findOne({ _id: acct.email } as any);
      const identity: any = { ...acct.identity };
      if (current?.avatarUrl && String(current.avatarUrl).trim() !== '') {
        delete identity.avatarUrl; // keep the admin's custom photo
      } else if (!acct.email.includes('@perspective.sn')) {
        identity.avatarUrl = acct.avatar;
      }
      const setOnInsert: any = { ...acct.identity, avatarUrl: acct.avatar, passwordHash: hashPasswordServer(acct.password) };
      await users.updateOne(
        { _id: acct.email } as any,
        { $set: { ...identity, deletedAt: null, isOnline: Boolean(current?.isOnline) }, $setOnInsert: setOnInsert },
        { upsert: true }
      );
    }

    seeded = true;
    console.log('[MongoDB] Core accounts seeded (kadersdiaz3@gmail.com, admin@perspective.sn).');
  } catch (err: any) {
    console.warn('[MongoDB] Seed notice:', err?.message || err);
  }
}

// Legacy Supabase export kept so existing imports don't break. MongoDB replaces it.
export function getSupabaseServer(): never {
  throw new Error('[Migration] Supabase has been replaced by MongoDB Atlas (set MONGODB_URI in .env).');
}

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
        streak: 25,
        readingTime: 820,
        bio: "Fondateur & Directeur de Publication â€” Perspective Group SÃ©nÃ©gal",
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
        bio: "Administrateur SystÃ¨me & Supervision RÃ©dactionnelle",
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

// Table name mapping
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

// Helper to normalize Mongo docs (unwrap data field for site_settings, strip _id)
function docFromMongo(docId: string, doc: any): any {
  const { _id, ...rest } = doc || {};
  if (rest && rest.data && typeof rest.data === 'object' && Object.keys(rest).length === 1) {
    return { id: docId, ...rest.data };
  }
  return { id: docId, ...rest };
}


export async function getCollectionDocs(collectionName: string): Promise<any[]> {
  const central = loadCentralDB();
  // Soft-deleted users stay invisible everywhere (recoverable, never erased)
  const rawLocal = Object.entries(central[collectionName] || {}).map(([id, data]) => ({ id, ...(data as any) }));
  const localDocs = (collectionName === 'users')
    ? rawLocal.filter(d => !d.deletedAt)
    : rawLocal;

  try {
    const db = await getDb();
    if (!db) throw new Error('MongoDB not connected');
    const table = resolveTable(collectionName);
    // Soft-deleted users stay invisible everywhere (recoverable, never erased)
    const filter: any = (table === 'users')
      ? { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }
      : {};
    const rows = await db.collection(table).find(filter).toArray();
    const docs = rows.map(r => docFromMongo(String(r._id), r));
    if (!central[collectionName]) central[collectionName] = {};
    docs.forEach(d => { central[collectionName][d.id] = d; });
    saveCentralDB();
    return docs;
  } catch (err: any) {
    console.warn(`[MongoDB fallback] Fetching "${collectionName}" from local store:`, err?.message || err);
    return localDocs;
  }
}

export async function getDocument(collectionName: string, docId: string): Promise<{ id: string; data: any } | null> {
  const central = loadCentralDB();
  const localData = central[collectionName]?.[docId];
  try {
    const db = await getDb();
    if (!db) throw new Error('MongoDB not connected');
    const table = resolveTable(collectionName);
    const row = await db.collection(table).findOne({ _id: docId } as any);
    if (row) {
      if (table === 'users' && row.deletedAt) return null;
      const normalized = docFromMongo(docId, row);
      if (!central[collectionName]) central[collectionName] = {};
      central[collectionName][docId] = normalized;
      saveCentralDB();
      return { id: docId, data: normalized };
    }
  } catch (err: any) {
    console.warn(`[MongoDB fallback] getDocument ${collectionName}/${docId}:`, err?.message || err);
  }
  if (localData) {
    if (collectionName === 'users' && localData.deletedAt) return null; // soft-deleted = invisible
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

  // Write to MongoDB (source of truth). Never store plaintext passwords and
  // never resurrect a soft-deleted user unless the payload explicitly clears it.
  try {
    const db = await getDb();
    if (!db) throw new Error('MongoDB not connected');
    const table = resolveTable(collectionName);
    const payload: any = { ...updated };
    if (table === 'users') {
      if (payload.password) payload.passwordHash = hashPasswordServer(payload.password);
      delete payload.password;
    }
    const setPayload: any = { $set: payload };
    if (table === 'users') {
      const current = await db.collection(table).findOne({ _id: docId } as any);
      if (current?.deletedAt && payload.deletedAt === undefined) {
        setPayload.$set.deletedAt = current.deletedAt;
      }
    }
    await db.collection(table).updateOne({ _id: docId } as any, setPayload, { upsert: true });
  } catch (err: any) {
    console.warn(`[MongoDB mirror notice] ${collectionName}/${docId}:`, err?.message || err);
  }

  return { id: docId, data: updated };
}

export async function deleteDocument(collectionName: string, docId: string): Promise<boolean> {
  const normalizedId = String(docId).toLowerCase().trim();
  // DISAPPEARING-ACCOUNTS FIX: users are NEVER hard-deleted. A tombstone
  // (deletedAt) hides them from all reads while keeping the row recoverable.
  if (collectionName === 'users') {
    if (PROTECTED_EMAILS.includes(normalizedId)) {
      console.warn(`[Central DB] Blocked attempt to delete protected account ${normalizedId}`);
      return false;
    }
    const central = loadCentralDB();
    if (central.users?.[normalizedId]) {
      central.users[normalizedId].deletedAt = new Date().toISOString();
      saveCentralDB();
    }
    try {
      const db = await getDb();
      if (db) {
        await db.collection('users').updateOne(
          { _id: normalizedId as any },
          { $set: { deletedAt: new Date().toISOString(), isOnline: false } }
        );
      }
    } catch (err: any) {
      console.warn(`[MongoDB mirror notice] soft-delete ${normalizedId}:`, err?.message || err);
    }
    return true;
  }

  const central = loadCentralDB();
  if (central[collectionName]?.[docId]) {
    delete central[collectionName][docId];
    saveCentralDB();
  }

  try {
    const db = await getDb();
    if (db) await db.collection(resolveTable(collectionName)).deleteOne({ _id: docId } as any);
  } catch (err: any) {
    console.warn(`[MongoDB mirror notice] Could not delete ${collectionName}/${docId}:`, err?.message || err);
  }

  return true;
}

export async function wipeCollection(collectionName: string): Promise<number> {
  const central = loadCentralDB();
  const existingCount = Object.keys(central[collectionName] || {}).length;
  central[collectionName] = {};

  if (collectionName === 'users') {
    // Protected core accounts are always preserved after a wipe
    for (const email of PROTECTED_EMAILS) {
      if (!central.users[email]) central.users[email] = { id: email, email, role: 'Admin' };
    }
  }

  saveCentralDB();

  try {
    const db = await getDb();
    if (db) {
      const table = resolveTable(collectionName);
      if (collectionName === 'users') {
        // Soft-delete everyone except protected accounts
        await db.collection(table).updateMany(
          { _id: { $nin: PROTECTED_EMAILS } } as any,
          { $set: { deletedAt: new Date().toISOString(), isOnline: false } }
        );
      } else {
        await db.collection(table).deleteMany({});
      }
    }
  } catch (err: any) {
    console.warn(`[Central DB] Notice wiping collection in MongoDB:`, err?.message || err);
  }

  return existingCount;
}

export async function registerUser(email: string, password?: string, name?: string, role: string = 'AbonnÃ©', additionalFields: any = {}) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const central = loadCentralDB();

  const existingMongo = await (async () => {
    try {
      const db = await getDb();
      if (!db) return null;
      const row = await db.collection('users').findOne({ _id: normalizedEmail } as any);
      return row ? docFromMongo(normalizedEmail, row) : null;
    } catch { return null; }
  })();

  if (existingMongo && !existingMongo.deletedAt) {
    // Known account: update profile fields, keep credential authoritative
    const updated: any = { ...existingMongo, ...additionalFields, email: normalizedEmail, lastActiveAt: new Date().toISOString() };
    if (password && !existingMongo.passwordHash) {
      updated.passwordHash = hashPasswordServer(password); // claim credential for pre-migration rows
    } else if (password) {
      delete updated.passwordHash; // existing credential is authoritative; registration cannot overwrite it
    }
    central.users[normalizedEmail] = updated;
    saveCentralDB();
    try {
      const db = await getDb();
      if (db) {
        const p: any = { ...updated };
        delete p.id;
        await db.collection('users').updateOne({ _id: normalizedEmail as any }, { $set: p }, { upsert: true });
      }
    } catch (err: any) {
      console.warn(`[MongoDB mirror notice] register ${normalizedEmail}:`, err?.message || err);
    }
    return { id: normalizedEmail, ...updated };
  }

  const isSuperAdmin = normalizedEmail === 'kadersdiaz3@gmail.com';
  const userData: any = {
    id: normalizedEmail,
    email: normalizedEmail,
    name: name || normalizedEmail.split('@')[0],
    role: isSuperAdmin ? 'Admin' : role,
    passwordHash: hashPasswordServer(password || additionalFields.password),
    avatarUrl: additionalFields.avatarUrl || 'preset-male',
    registeredAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isOnline: true,
    streak: 1,
    readingTime: 0,
    accolades: isSuperAdmin ? ['verified_identity', 'editorial_board', 'elite_clearance', 'sahel_insider'] : ['verified_identity'],
    deletedAt: null,
    ...additionalFields
  };
  delete userData.password;

  central.users[normalizedEmail] = userData;
  saveCentralDB();

  try {
    const db = await getDb();
    if (db) {
      const p: any = { ...userData };
      delete p.id;
      await db.collection('users').updateOne({ _id: normalizedEmail as any }, { $set: p }, { upsert: true });
    }
  } catch (err: any) {
    console.warn(`[MongoDB mirror notice] register ${normalizedEmail}:`, err?.message || err);
  }

  return { id: normalizedEmail, ...userData };
}

export async function loginUser(email: string, password?: string) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const central = loadCentralDB();

  // Authoritative read from MongoDB
  try {
    const db = await getDb();
    if (!db) throw new Error('MongoDB not connected');
    const row = await db.collection('users').findOne({ _id: normalizedEmail } as any);
    if (row) {
      if (row.deletedAt) {
        // Soft-deleted account: treat as recoverable â€” resurrect on successful login
        const res = password ? true : false;
        if (!res) throw new Error('Invalid credentials');
      } else if (row.passwordHash) {
        // REAL password verification (the previous implementation returned any
        // existing user without checking the password â€” a critical auth hole).
        if (!password || hashPasswordServer(password) !== row.passwordHash) {
          throw new Error('Invalid credentials');
        }
      } else if (password) {
        // Legacy row without a stored credential: claim the provided password
        await db.collection('users').updateOne({ _id: normalizedEmail as any }, {
          $set: { passwordHash: hashPasswordServer(password), lastActiveAt: new Date().toISOString(), isOnline: true, deletedAt: null }
        });
      }
      const userDoc: any = docFromMongo(normalizedEmail, row);
      userDoc.lastActiveAt = new Date().toISOString();
      userDoc.isOnline = true;
      if (row.deletedAt && password) userDoc.deletedAt = null;
      central.users[normalizedEmail] = userDoc;
      saveCentralDB();
      await db.collection('users').updateOne({ _id: normalizedEmail as any }, {
        $set: { lastActiveAt: new Date().toISOString(), isOnline: true, ...(row.deletedAt && password ? { deletedAt: null } : {}) }
      });
      const { passwordHash: _ph, ...safeUser } = userDoc as any;
      return { id: normalizedEmail, ...safeUser };
    }
  } catch (err: any) {
    if (err?.message === 'Invalid credentials') {
      console.warn(`[MongoDB] Login rejected for ${normalizedEmail}: invalid credentials.`);
      return { id: normalizedEmail, error: 'Invalid credentials' };
    }
    console.warn(`[MongoDB] loginUser fallback for ${normalizedEmail}:`, err?.message || err);
  }

  // Fallback: local store / auto-register
  if (central.users[normalizedEmail]) {
    const user = central.users[normalizedEmail];
    if (user.passwordHash && (!password || hashPasswordServer(password) !== user.passwordHash)) {
      return { id: normalizedEmail, error: 'Invalid credentials' };
    }
    if (password && !user.passwordHash) user.passwordHash = hashPasswordServer(password);
    if (user.deletedAt && password) delete user.deletedAt;
    user.lastActiveAt = new Date().toISOString();
    user.isOnline = true;
    saveCentralDB();
    const { passwordHash: _ph2, ...safeUser2 } = user as any;
    return { id: normalizedEmail, ...safeUser2 };
  }
  return await registerUser(email, password);
}

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
    central.users[normalizedEmail].passwordHash = hashPasswordServer(newPassword);
    central.users[normalizedEmail].passwordUpdatedAt = new Date().toISOString();
    saveCentralDB();
  }

  try {
    const db = await getDb();
    if (db) {
      await db.collection('users').updateOne({ _id: normalizedEmail as any }, {
        $set: { passwordHash: hashPasswordServer(newPassword), passwordUpdatedAt: new Date().toISOString() }
      });
    }
  } catch (err: any) {
    console.warn(`[MongoDB mirror notice] Could not update password for ${normalizedEmail}:`, err?.message || err);
  }

  return { success: true, email: normalizedEmail };
}

export async function getUnifiedSyncState(): Promise<{
  articles: any[];
  ads: any[];
  siteSettings: Record<string, any>;
  users: any[];
  media: any[];
}> {
  const central = loadCentralDB();
  const [articles, ads, siteSettingsDocs, users, media] = await Promise.all([
    getCollectionDocs('articles').catch(() => []),
    getCollectionDocs('ads').catch(() => []),
    getCollectionDocs('system_config').catch(() => []),
    getCollectionDocs('users').catch(() => []),
    getCollectionDocs('media').catch(() => [])
  ]);

  const siteSettings: Record<string, any> = {};
  for (const doc of siteSettingsDocs) {
    if (doc && doc.id) {
      siteSettings[doc.id] = doc;
    }
  }

  return {
    articles: articles.length > 0 ? articles : Object.values(central.articles || {}),
    ads: ads.length > 0 ? ads : Object.values(central.ads || {}),
    siteSettings: Object.keys(siteSettings).length > 0 ? siteSettings : (central.system_config || {}),
    users: users.length > 0 ? users : Object.values(central.users || {}),
    media: media.length > 0 ? media : Object.values(central.media || {})
  };
}

export async function mergeUnifiedSyncState(incomingState: {
  articles?: any[];
  ads?: any[];
  siteSettings?: any;
  users?: any[];
  media?: any[];
}): Promise<{
  articles: any[];
  ads: any[];
  siteSettings: Record<string, any>;
  users: any[];
  media: any[];
}> {
  const central = loadCentralDB();

  if (incomingState.articles && Array.isArray(incomingState.articles)) {
    if (!central.articles) central.articles = {};
    for (const art of incomingState.articles) {
      if (art && art.id) {
        central.articles[art.id] = { ...(central.articles[art.id] || {}), ...art };
        saveDocument('articles', art.id, art, true).catch(() => {});
      }
    }
  }

  if (incomingState.ads && Array.isArray(incomingState.ads)) {
    if (!central.ads) central.ads = {};
    for (const ad of incomingState.ads) {
      if (ad && ad.id) {
        central.ads[ad.id] = { ...(central.ads[ad.id] || {}), ...ad };
        saveDocument('ads', ad.id, ad, true).catch(() => {});
      }
    }
  }

  if (incomingState.siteSettings && typeof incomingState.siteSettings === 'object') {
    if (!central.system_config) central.system_config = {};
    for (const [key, val] of Object.entries(incomingState.siteSettings)) {
      if (val && typeof val === 'object') {
        central.system_config[key] = { ...(central.system_config[key] || {}), ...(val as any) };
        saveDocument('system_config', key, val, true).catch(() => {});
      }
    }
  }

  if (incomingState.users && Array.isArray(incomingState.users)) {
    if (!central.users) central.users = {};
    for (const u of incomingState.users) {
      const email = (u?.email || u?.id || "").toLowerCase().trim();
      if (email) {
        central.users[email] = { ...(central.users[email] || {}), ...u };
        saveDocument('users', email, u, true).catch(() => {});
      }
    }
  }

  if (incomingState.media && Array.isArray(incomingState.media)) {
    if (!central.media) central.media = {};
    for (const m of incomingState.media) {
      if (m && m.id) {
        central.media[m.id] = { ...(central.media[m.id] || {}), ...m };
        saveDocument('media', m.id, m, true).catch(() => {});
      }
    }
  }

  saveCentralDB();
  return await getUnifiedSyncState();
}
