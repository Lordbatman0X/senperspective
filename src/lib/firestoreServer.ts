import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
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

let cachedDb: any = null;

function getDbInstance() {
  if (cachedDb) return cachedDb;
  
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  let config: any = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.warn('[Firestore Server] Could not read firebase-applet-config.json:', err);
  }

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  cachedDb = getFirestore(app, config.firestoreDatabaseId);
  return cachedDb;
}

const db = getDbInstance();

export async function getCollectionDocs(collectionName: string) {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDocument(collectionName: string, docId: string) {
  const d = await getDoc(doc(db, collectionName, docId));
  return d.exists() ? { id: d.id, data: d.data() } : null;
}

export async function saveDocument(collectionName: string, docId: string, data: any, merge: boolean = true) {
  await setDoc(doc(db, collectionName, docId), data, { merge });
  return { id: docId, data };
}

export async function deleteDocument(collectionName: string, docId: string) {
  await deleteDoc(doc(db, collectionName, docId));
  return true;
}

export async function wipeCollection(collectionName: string) {
  const snapshot = await getDocs(collection(db, collectionName));
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  return snapshot.size;
}

export async function registerUser(email: string, password?: string, name?: string) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const userRef = doc(db, 'users', normalizedEmail);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  
  const userData = {
    email: normalizedEmail,
    password: password || 'default_pass',
    name: name || normalizedEmail.split('@')[0],
    registeredAt: new Date().toISOString(),
    role: 'Abonné'
  };
  await setDoc(userRef, userData);
  return { id: userRef.id, ...userData };
}

export async function loginUser(email: string, password?: string) {
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
  await setDoc(doc(db, 'users', normalizedEmail), { password: newPassword }, { merge: true });
  return { success: true, email: normalizedEmail };
}
