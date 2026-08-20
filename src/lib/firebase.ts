import { initializeApp, getApps, getApp, setLogLevel } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, onSnapshot, Query, DocumentReference } from "firebase/firestore";
import rawConfig from "../../firebase-applet-config.json";

// Silence internal Firebase SDK log noise
try {
  setLogLevel('silent');
} catch (_) {}

const defaultConfig = {
  projectId: "earnest-strand-z71nt",
  appId: "1:357139667334:web:0b3ce7b362c3f238a2b407",
  apiKey: "AIzaSyALmx2cnEFumIoBPUj0qQjoO30zFG4pJrg",
  authDomain: "earnest-strand-z71nt.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-perspectivegroup-9af7fbb0-c841-48c0-854d-ab5c65f4ba29",
  storageBucket: "earnest-strand-z71nt.firebasestorage.app",
  messagingSenderId: "357139667334",
  measurementId: ""
};

const firebaseConfig = (rawConfig && typeof rawConfig === 'object' && (rawConfig as any).apiKey) 
  ? rawConfig 
  : defaultConfig;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || defaultConfig.firestoreDatabaseId);

let globalQuotaExceeded = false;

export function isQuotaExceeded(): boolean {
  return globalQuotaExceeded;
}

export function markQuotaExceeded(): void {
  globalQuotaExceeded = true;
}

export function safeOnSnapshot(
  ref: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  if (globalQuotaExceeded) {
    if (onError) {
      onError({ code: 'resource-exhausted', message: 'Firestore quota limit reached. Using local state fallback.' });
    }
    return () => {};
  }

  let unsubscribeFn: (() => void) | null = null;

  unsubscribeFn = onSnapshot(
    ref,
    (snapshot: any) => {
      onNext(snapshot);
    },
    (error: any) => {
      if (
        error?.code === 'resource-exhausted' ||
        (error?.message && (error.message.includes('Quota exceeded') || error.message.includes('quota')))
      ) {
        globalQuotaExceeded = true;
        if (unsubscribeFn) {
          try { unsubscribeFn(); } catch (_) {}
        }
      }
      if (onError) {
        onError(error);
      }
    }
  );

  return () => {
    if (unsubscribeFn) {
      try { unsubscribeFn(); } catch (_) {}
    }
  };
}

export default app;

