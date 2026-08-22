import { safeFetchJson } from "./apiUtils";

// Types for MongoDB Client DB
export interface MongoDocRef {
  type: "doc";
  collectionName: string;
  docId: string;
}

export interface MongoCollectionRef {
  type: "collection";
  collectionName: string;
}

export interface MongoQueryRef {
  type: "query";
  collectionName: string;
  constraints?: any[];
}

export interface MongoDocSnapshot {
  id: string;
  exists: () => boolean;
  data: () => any;
}

export interface MongoQuerySnapshot {
  docs: MongoDocSnapshot[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: MongoDocSnapshot) => void) => void;
}

// Global state for MongoDB Client
class MongoClientDB {
  public connected: boolean = true;
}

export const db = new MongoClientDB();

// Collection & Doc Reference Helpers with Variadic Paths
export function collection(_db: any, ...pathSegments: string[]): MongoCollectionRef {
  const collectionName = pathSegments.join("/");
  return { type: "collection", collectionName };
}

export function doc(target: any, ...pathSegments: string[]): MongoDocRef {
  if (target?.type === "collection") {
    return { type: "doc", collectionName: target.collectionName, docId: pathSegments.join("/") };
  }
  if (typeof target === "string") {
    const all = [target, ...pathSegments];
    const docId = all.pop() || "doc";
    const collectionName = all.join("/") || "default";
    return { type: "doc", collectionName, docId };
  }
  const all = [...pathSegments];
  const docId = all.pop() || "doc";
  const collectionName = all.join("/") || "default";
  return { type: "doc", collectionName, docId };
}

export function query(collectionRef: MongoCollectionRef, ...constraints: any[]): MongoQueryRef {
  return { type: "query", collectionName: collectionRef.collectionName, constraints };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc") {
  return { type: "orderBy", field, direction };
}

// Database Operations via MongoDB Backend Endpoints
export async function getDoc(docRef: MongoDocRef): Promise<MongoDocSnapshot> {
  const url = `/api/mongodb/doc/${encodeURIComponent(docRef.collectionName)}/${encodeURIComponent(docRef.docId)}`;
  const { ok, data } = await safeFetchJson<{ success: boolean; data?: any }>(url);

  const exists = ok && !!data?.data;
  const docData = exists ? data?.data : null;

  return {
    id: docRef.docId,
    exists: () => exists,
    data: () => docData
  };
}

export async function getDocs(ref: MongoCollectionRef | MongoQueryRef): Promise<MongoQuerySnapshot> {
  const collectionName = ref.collectionName;
  const url = `/api/mongodb/collection/${encodeURIComponent(collectionName)}`;
  const { ok, data } = await safeFetchJson<{ success: boolean; documents?: any[] }>(url);

  const rawDocs = ok && Array.isArray(data?.documents) ? data.documents : [];
  const docs: MongoDocSnapshot[] = rawDocs.map((item: any) => {
    const id = item.id || item.docId || item._id || "doc_" + Math.random().toString(36).substring(2);
    const content = item.data !== undefined ? item.data : item;
    return {
      id,
      exists: () => true,
      data: () => content
    };
  });

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb) => docs.forEach(cb)
  };
}

export async function setDoc(docRef: MongoDocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const url = `/api/mongodb/doc/${encodeURIComponent(docRef.collectionName)}/${encodeURIComponent(docRef.docId)}`;
  await safeFetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, merge: options?.merge ?? true })
  });
}

export async function addDoc(collectionRef: MongoCollectionRef, data: any): Promise<MongoDocRef> {
  const generatedId = "mongo_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const docRef: MongoDocRef = { type: "doc", collectionName: collectionRef.collectionName, docId: generatedId };
  await setDoc(docRef, data);
  return docRef;
}

export async function updateDoc(docRef: MongoDocRef, data: any): Promise<void> {
  await setDoc(docRef, data, { merge: true });
}

export async function deleteDoc(docRef: MongoDocRef): Promise<void> {
  const url = `/api/mongodb/doc/${encodeURIComponent(docRef.collectionName)}/${encodeURIComponent(docRef.docId)}`;
  await safeFetchJson(url, { method: "DELETE" });
}

// Real-Time MongoDB Listener (Polling against MongoDB API)
export function onSnapshot(
  ref: MongoDocRef | MongoCollectionRef | MongoQueryRef,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  let isSubscribed = true;

  const fetchLatest = async () => {
    if (!isSubscribed) return;
    try {
      if (ref.type === "doc") {
        const snap = await getDoc(ref as MongoDocRef);
        if (isSubscribed) onNext(snap);
      } else {
        const snap = await getDocs(ref as MongoCollectionRef | MongoQueryRef);
        if (isSubscribed) onNext(snap);
      }
    } catch (err) {
      if (isSubscribed && onError) onError(err);
    }
  };

  fetchLatest();
  const intervalId = setInterval(fetchLatest, 4000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
}

export function safeOnSnapshot(
  ref: MongoDocRef | MongoCollectionRef | MongoQueryRef,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  return onSnapshot(ref, onNext, onError);
}

// Auth Types & Client API for MongoDB User Management
export interface MongoUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
}

export const browserLocalPersistence = "LOCAL";
export const browserSessionPersistence = "SESSION";
export async function setPersistence(_authObj: any, _mode: string) {}

class MongoAuthService {
  public currentUser: MongoUser | null = null;
  private listeners: Array<(user: MongoUser | null) => void> = [];

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem("perspective_mongo_user");
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (_) {}
  }

  public notify() {
    if (this.currentUser) {
      try {
        localStorage.setItem("perspective_mongo_user", JSON.stringify(this.currentUser));
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem("perspective_mongo_user");
      } catch (_) {}
    }
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  public onAuthStateChanged(callback: (user: MongoUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public async signIn(email: string, pass: string): Promise<{ user: MongoUser }> {
    const { ok, data, error } = await safeFetchJson<{ success: boolean; user?: any; error?: string }>("/api/mongodb/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    if (!ok || !data?.success) {
      throw new Error(error || data?.error || "Identifiants MongoDB invalides.");
    }

    const u = data.user;
    this.currentUser = {
      uid: u.id || u.email,
      email: u.email,
      displayName: u.name || u.email.split("@")[0],
      photoURL: u.avatarUrl || null,
      emailVerified: true
    };
    this.notify();
    return { user: this.currentUser };
  }

  public async register(email: string, pass: string, name?: string): Promise<{ user: MongoUser }> {
    const { ok, data, error } = await safeFetchJson<{ success: boolean; user?: any; error?: string }>("/api/mongodb/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, name })
    });

    if (!ok || !data?.success) {
      throw new Error(error || data?.error || "Erreur lors de l'inscription MongoDB.");
    }

    const u = data.user;
    this.currentUser = {
      uid: u.id || u.email,
      email: u.email,
      displayName: u.name || name || u.email.split("@")[0],
      photoURL: u.avatarUrl || null,
      emailVerified: true
    };
    this.notify();
    return { user: this.currentUser };
  }

  public async signOut(): Promise<void> {
    await safeFetchJson("/api/mongodb/auth/logout", { method: "POST" });
    this.currentUser = null;
    this.notify();
  }

  public async resetPassword(email: string): Promise<void> {
    await safeFetchJson("/api/mongodb/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
  }
}

export const auth = new MongoAuthService();

export function onAuthStateChanged(authObj: any, callback: (user: any) => void): () => void {
  return auth.onAuthStateChanged(callback);
}

export async function signInWithEmailAndPassword(authObj: any, email: string, pass: string): Promise<any> {
  return auth.signIn(email, pass);
}

export async function createUserWithEmailAndPassword(authObj: any, email: string, pass: string): Promise<any> {
  return auth.register(email, pass);
}

export async function signOut(authObj: any): Promise<void> {
  return auth.signOut();
}

export async function sendPasswordResetEmail(authObj: any, email: string): Promise<void> {
  return auth.resetPassword(email);
}

export class GoogleAuthProvider {
  public addScope(_scope: string) {}
  public setCustomParameters(_params: any) {}
  public static credentialFromResult(_result: any) {
    return { accessToken: "demo_google_access_token_" + Date.now() };
  }
}

export async function signInWithPopup(_auth: any, _provider: any): Promise<any> {
  // Demo Google auth sync with MongoDB
  const demoEmail = "user.google@perspective.sn";
  const user = await auth.register(demoEmail, "google_oauth_pass", "Google Reader");
  return { user: user.user };
}

export function isQuotaExceeded(): boolean {
  return false;
}

export function markQuotaExceeded(): void {}

export default db;
