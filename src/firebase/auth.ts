import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { handleFirestoreError, OperationType } from './errors';

export const BOOTSTRAP_ADMIN_EMAILS = [
  'admin@perspective.sn',
  'kadersdiaz3@gmail.com',
];

export interface AppUserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'Admin' | 'Journaliste' | 'Membre' | string;
  avatarUrl: string;
  bio?: string;
  isOnline?: boolean;
  streak?: number;
  readingTime?: number;
  accolades?: string[];
  createdAt?: string;
  updatedAt?: string;
  password?: string;
  passwordHash?: string;
  passwordUpdatedAt?: string;
  authType?: string;
  registeredAt?: string;
  hideEmail?: boolean;
  hidePersonalInfo?: boolean;
}

const googleProvider = new GoogleAuthProvider();

export function isBootstrapAdmin(email?: string | null): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Ensures user document exists in Firestore and syncs profile
 */
export async function syncUserProfile(userOrData: FirebaseUser | Partial<AppUserProfile>, extraName?: string): Promise<AppUserProfile> {
  const isFirebaseUser = userOrData && 'uid' in userOrData && typeof (userOrData as any).getIdToken === 'function';
  const email = (isFirebaseUser ? (userOrData as FirebaseUser).email : (userOrData as Partial<AppUserProfile>).email || '')?.toLowerCase().trim() || '';
  const uid = isFirebaseUser ? (userOrData as FirebaseUser).uid : (userOrData as Partial<AppUserProfile>).uid || email.replace(/[^a-zA-Z0-9_-]/g, '_');
  const isAdmin = isBootstrapAdmin(email);
  const userDocRef = doc(db, 'users', uid);

  try {
    const existingSnap = await getDoc(userDocRef);
    let profileData: AppUserProfile;

    if (existingSnap.exists()) {
      const data = existingSnap.data() as Partial<AppUserProfile>;
      profileData = {
        uid,
        email,
        name: isFirebaseUser 
          ? (data.name || (userOrData as FirebaseUser).displayName || extraName || email.split('@')[0])
          : (userOrData as Partial<AppUserProfile>).name || data.name || email.split('@')[0],
        role: isAdmin ? 'Admin' : ((userOrData as Partial<AppUserProfile>).role || data.role || 'Membre'),
        avatarUrl: (userOrData as Partial<AppUserProfile>).avatarUrl || data.avatarUrl || (isFirebaseUser ? (userOrData as FirebaseUser).photoURL || 'preset-male' : 'preset-male'),
        bio: (userOrData as Partial<AppUserProfile>).bio || data.bio || '',
        streak: data.streak || 1,
        readingTime: data.readingTime || 0,
        accolades: isAdmin
          ? ['verified_identity', 'editorial_board', 'elite_clearance']
          : (data.accolades || ['verified_identity']),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(!isFirebaseUser ? (userOrData as Partial<AppUserProfile>) : {})
      };
      await setDoc(userDocRef, { ...profileData, lastActive: serverTimestamp() }, { merge: true });
    } else {
      profileData = {
        uid,
        email,
        name: isFirebaseUser 
          ? ((userOrData as FirebaseUser).displayName || extraName || (isAdmin ? 'Kader S. Diaz' : email.split('@')[0]))
          : ((userOrData as Partial<AppUserProfile>).name || (isAdmin ? 'Kader S. Diaz' : email.split('@')[0])),
        role: isAdmin ? 'Admin' : ((userOrData as Partial<AppUserProfile>).role || 'Membre'),
        avatarUrl: isFirebaseUser ? ((userOrData as FirebaseUser).photoURL || 'preset-male') : ((userOrData as Partial<AppUserProfile>).avatarUrl || 'preset-male'),
        bio: isAdmin ? 'Direction éditoriale Perspective Group' : ((userOrData as Partial<AppUserProfile>).bio || 'Lecteur passionné'),
        streak: 1,
        readingTime: 0,
        accolades: isAdmin
          ? ['verified_identity', 'editorial_board', 'elite_clearance']
          : ['verified_identity'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(!isFirebaseUser ? (userOrData as Partial<AppUserProfile>) : {})
      };
      await setDoc(userDocRef, { ...profileData, createdAtServer: serverTimestamp() }, { merge: true });
    }

    // Also mirror to /users/{userEmail} so queries and rules support email lookup
    if (email && email !== uid) {
      const emailDocRef = doc(db, 'users', email);
      await setDoc(emailDocRef, profileData, { merge: true }).catch(() => {});
    }

    // If Admin, register in /admins/{uid} for Firestore security rules
    if (isAdmin) {
      const adminDocRef = doc(db, 'admins', uid);
      await setDoc(adminDocRef, {
        email,
        uid,
        name: profileData.name,
        grantedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }

    return profileData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

/**
 * Fetch specific user profile by email or UID
 */
export async function fetchUserProfile(identifier: string): Promise<AppUserProfile | null> {
  if (!identifier) return null;
  const clean = identifier.trim();
  try {
    // Try direct lookup
    const docRef = doc(db, 'users', clean);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AppUserProfile;
    }
    // Try by lowercase email
    if (clean.includes('@')) {
      const emailSnap = await getDoc(doc(db, 'users', clean.toLowerCase()));
      if (emailSnap.exists()) {
        return emailSnap.data() as AppUserProfile;
      }
    }
    return null;
  } catch (err) {
    console.warn('[Firebase] Notice fetching user profile:', err);
    return null;
  }
}

/**
 * Fetch all user profiles from Firestore
 */
export async function fetchAllUsers(): Promise<AppUserProfile[]> {
  try {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    const seen = new Set<string>();
    const users: AppUserProfile[] = [];
    snap.docs.forEach(docSnap => {
      const data = docSnap.data() as AppUserProfile;
      const key = (data.email || docSnap.id).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        users.push({ ...data, uid: data.uid || docSnap.id });
      }
    });
    return users;
  } catch (err) {
    console.warn('[Firebase] Notice fetching all users:', err);
    return [];
  }
}

/**
 * Delete a user profile from Firestore
 */
export async function deleteUserProfile(emailOrUid: string): Promise<void> {
  if (!emailOrUid) return;
  const clean = emailOrUid.trim();
  try {
    await deleteDoc(doc(db, 'users', clean)).catch(() => {});
    if (clean.includes('@')) {
      await deleteDoc(doc(db, 'users', clean.toLowerCase())).catch(() => {});
      const safeId = clean.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
      await deleteDoc(doc(db, 'users', safeId)).catch(() => {});
    }
  } catch (err) {
    console.warn('[Firebase] Notice deleting user profile:', err);
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInEmail(email: string, pass: string): Promise<AppUserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return await syncUserProfile(cred.user);
}

/**
 * Register with Email and Password
 */
export async function registerEmail(email: string, pass: string, name: string): Promise<AppUserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: name }).catch(() => {});
  }
  return await syncUserProfile(cred.user, name);
}

/**
 * Sign in with Google (Popup)
 */
export async function signInGoogle(): Promise<AppUserProfile> {
  const cred = await signInWithPopup(auth, googleProvider);
  return await syncUserProfile(cred.user);
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}
