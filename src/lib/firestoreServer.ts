import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  setLogLevel,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

try {
  setLogLevel('error');
} catch (e) {
  // Ignore
}

// Path to durable centralized file-backed store
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
      // Ensure users exists
      if (!inMemoryDB!.users) inMemoryDB!.users = {};
      // Ensure super admin always exists
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
  return inMemoryDB;
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

let cachedFirestore: any = null;

function getFirestoreInstance() {
  if (cachedFirestore) return cachedFirestore;
  
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  let config: any = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.warn('[Firestore Server] Could not read firebase-applet-config.json:', err);
  }

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  cachedFirestore = getFirestore(app, config.firestoreDatabaseId);
  return cachedFirestore;
}

const db = getFirestoreInstance();

export async function getCollectionDocs(collectionName: string): Promise<any[]> {
  const central = loadCentralDB();
  const localDocsMap = central[collectionName] || {};
  const localDocs = Object.entries(localDocsMap).map(([id, data]) => ({ id, ...(data as any) }));

  try {
    // Attempt Firestore fetch
    const snapshot = await getDocs(collection(db, collectionName));
    const fsDocs: any[] = [];
    snapshot.forEach((d) => {
      const docData = { id: d.id, ...d.data() };
      fsDocs.push(docData);
      // Merge into central DB
      if (!central[collectionName]) central[collectionName] = {};
      central[collectionName][d.id] = { ...d.data(), id: d.id };
    });

    saveCentralDB();
    // Return merged docs, guaranteeing local docs aren't lost
    const mergedMap = new Map<string, any>();
    localDocs.forEach(d => mergedMap.set(d.id, d));
    fsDocs.forEach(d => mergedMap.set(d.id, d));
    return Array.from(mergedMap.values());
  } catch (err: any) {
    console.warn(`[Central DB / Firestore fallback] Fetching collection "${collectionName}" from central store due to Firestore notice:`, err?.message || err);
    // Return durable local docs
    return localDocs;
  }
}

export async function getDocument(collectionName: string, docId: string): Promise<{ id: string; data: any } | null> {
  const central = loadCentralDB();
  const localData = central[collectionName]?.[docId];

  try {
    const d = await getDoc(doc(db, collectionName, docId));
    if (d.exists()) {
      const data = d.data();
      if (!central[collectionName]) central[collectionName] = {};
      central[collectionName][docId] = data;
      saveCentralDB();
      return { id: d.id, data };
    }
  } catch (err: any) {
    console.warn(`[Central DB / Firestore fallback] getDocument for ${collectionName}/${docId}:`, err?.message || err);
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

  // Background mirror to Firestore (non-blocking)
  setDoc(doc(db, collectionName, docId), updated, { merge }).catch((err: any) => {
    console.warn(`[Central DB / Firestore background mirror notice] Could not mirror ${collectionName}/${docId} to Firestore:`, err?.message || err);
  });

  return { id: docId, data: updated };
}

export async function deleteDocument(collectionName: string, docId: string): Promise<boolean> {
  // Never delete super admin
  if (collectionName === 'users' && docId.toLowerCase().trim() === 'kadersdiaz3@gmail.com') {
    console.warn('[Central DB] Blocked attempt to delete Super Admin kadersdiaz3@gmail.com');
    return false;
  }

  const central = loadCentralDB();
  if (central[collectionName]?.[docId]) {
    delete central[collectionName][docId];
    saveCentralDB();
  }

  // Background mirror delete
  deleteDoc(doc(db, collectionName, docId)).catch((err: any) => {
    console.warn(`[Central DB] Could not mirror delete ${collectionName}/${docId} to Firestore:`, err?.message || err);
  });

  return true;
}

export async function wipeCollection(collectionName: string): Promise<number> {
  const central = loadCentralDB();
  const existingCount = Object.keys(central[collectionName] || {}).length;
  central[collectionName] = {};

  // Preserve Super Admin in users collection
  if (collectionName === 'users') {
    central.users["kadersdiaz3@gmail.com"] = getInitialDB().users["kadersdiaz3@gmail.com"];
    central.users["admin@perspective.sn"] = getInitialDB().users["admin@perspective.sn"];
  }

  saveCentralDB();

  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      if (collectionName === 'users' && d.id.toLowerCase() === 'kadersdiaz3@gmail.com') return;
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err: any) {
    console.warn(`[Central DB] Notice wiping collection in Firestore:`, err?.message || err);
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
    id: `usr_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
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

  // Background mirror to Firestore
  setDoc(doc(db, 'users', normalizedEmail), userData, { merge: true }).catch((err) => {
    console.warn(`[Central DB] Could not mirror register ${normalizedEmail} to Firestore:`, err?.message || err);
  });

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
  setDoc(doc(db, 'users', normalizedEmail), { password: newPassword, passwordUpdatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  return { success: true, email: normalizedEmail };
}
