import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  setLogLevel,
  getDocFromServer,
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  OAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  signInAnonymously 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal gRPC idle stream connection logs
try {
  setLogLevel('error');
} catch (e) {
  // Ignore
}

const app = initializeApp(firebaseConfig);
export const realFirebaseAuth = getAuth(app);
export const realFirestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = realFirebaseAuth;
export const db = realFirestore;

// Test Firestore connection gracefully on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore notice: client is offline or re-establishing connection.");
    }
  }
}
testConnection().catch(() => {});

// Boot-time Anonymous auth fallback.
// If the project has Anonymous sign-in enabled, this gives the Firestore
// client a valid token so all reads/writes work even before the user logs in
// (Fixing the case where neither Email/Password nor Anonymous was enabled,
// which previously left the client unable to reach ANY Firestore data).
try {
  signInAnonymously(realFirebaseAuth)
    .then((cred) => {
      console.log(`[FIREBASE BOOT] Anonymous auth established (${cred.user.uid.slice(0, 8)}...) — Firestore online.`);
    })
    .catch((ae: any) => {
      console.warn(
        `[FIREBASE BOOT] Anonymous sign-in unavailable (${ae?.code || ae?.message}). ` +
        `If the store appears local-only / not shared across devices, ` +
        `enable "Anonymous" OR "Email/Password" in Firebase console → Authentication → Sign-in method.`
      );
    });
} catch (e) {
  // Never block boot
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const safeOnSnapshot = onSnapshot;
export const isQuotaExceeded = () => false;
export const markQuotaExceeded = () => {};

export { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy 
};

export { 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  OAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence 
};

export default realFirestore;
