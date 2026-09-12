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
import { ref, get, set as dbSet, remove } from 'firebase/database';
import { auth, rtdb } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { withFirestoreTimeout } from './db';

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
  suspended?: boolean;
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

/** RTDB-safe key: these characters are forbidden in RTDB keys */
const emailKey = (email: string): string => String(email || '').toLowerCase().trim().replace(/[.#$/[\]]/g, '_');
/** RTDB rejects undefined values — strip them via a JSON round-trip */
const stripUndefined = (obj: any) => JSON.parse(JSON.stringify(obj));

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

  try {
    // Timeout-guarded: a slow backend must never delay login (reads AND writes)
    const existingSnap = await withFirestoreTimeout(get(ref(rtdb, `users/${uid}`)), 5000).catch(() => null);
    let data = existingSnap && existingSnap.exists() ? (existingSnap.val() as Partial<AppUserProfile>) : null;

    // FIX (attributed roles lost on login): profiles are stored under BOTH the
    // Firebase Auth uid key and a sanitized email key. If the uid-keyed record
    // is missing (or has no role yet), adopt the email-keyed record so roles
    // attributed by the super admin survive the login sync instead of being
    // replaced by a fresh 'Membre' profile.
    if ((!data || !data.role) && email) {
      const mirrorSnap = await withFirestoreTimeout(get(ref(rtdb, `users/${emailKey(email)}`)), 5000).catch(() => null);
      const mirror = mirrorSnap && mirrorSnap.exists() ? (mirrorSnap.val() as Partial<AppUserProfile>) : null;
      if (mirror) {
        if (!data) {
          data = { ...mirror, uid };
        } else {
          data = { ...mirror, ...data, role: data.role || mirror.role };
        }
      }
    }
    let profileData: AppUserProfile;

    if (data) {
      profileData = {
        uid,
        email,
        name: isFirebaseUser
          ? (data.name || (userOrData as FirebaseUser).displayName || extraName || email.split('@')[0])
          : (userOrData as Partial<AppUserProfile>).name || data.name || email.split('@')[0],
        role: isAdmin ? 'Admin' : ((userOrData as Partial<AppUserProfile>).role || data.role || 'Membre'),
        avatarUrl: (userOrData as Partial<AppUserProfile>).avatarUrl || data.avatarUrl || (isFirebaseUser ? (userOrData as FirebaseUser).photoURL || 'preset-male' : 'preset-male'),
        coverPhotoUrl: (userOrData as Partial<AppUserProfile>).coverPhotoUrl || data.coverPhotoUrl || '',
        bio: (userOrData as Partial<AppUserProfile>).bio || data.bio || '',
        streak: data.streak || 1,
        readingTime: data.readingTime || 0,
        accolades: isAdmin
          ? ['verified_identity', 'editorial_board', 'elite_clearance']
          : (data.accolades || ['verified_identity']),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        suspended: data.suspended === true,
        ...(!isFirebaseUser ? (userOrData as Partial<AppUserProfile>) : {})
      };
      await withFirestoreTimeout(dbSet(ref(rtdb, `users/${uid}`), stripUndefined({ ...profileData, lastActive: Date.now() })), 5000).catch(() => {});
    } else {
      profileData = {
        uid,
        email,
        name: isFirebaseUser
          ? ((userOrData as FirebaseUser).displayName || extraName || (isAdmin ? 'Kader S. Diaz' : email.split('@')[0]))
          : ((userOrData as Partial<AppUserProfile>).name || (isAdmin ? 'Kader S. Diaz' : email.split('@')[0])),
        role: isAdmin ? 'Admin' : ((userOrData as Partial<AppUserProfile>).role || 'Membre'),
        avatarUrl: isFirebaseUser ? ((userOrData as FirebaseUser).photoURL || 'preset-male') : ((userOrData as Partial<AppUserProfile>).avatarUrl || 'preset-male'),
        coverPhotoUrl: (userOrData as Partial<AppUserProfile>).coverPhotoUrl || '',
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
      await withFirestoreTimeout(dbSet(ref(rtdb, `users/${uid}`), stripUndefined({ ...profileData, createdAtServer: Date.now() })), 5000).catch(() => {});
    }

    // Mirror under sanitized email key so direct email lookups work
    if (email && email !== uid) {
      await withFirestoreTimeout(dbSet(ref(rtdb, `users/${emailKey(email)}`), stripUndefined(profileData)), 5000).catch(() => {});
    }

    // If Admin, register in /admins/{uid} for security rules
    if (isAdmin) {
      await withFirestoreTimeout(
        dbSet(ref(rtdb, `admins/${uid}`), stripUndefined({
          email,
          uid,
          name: profileData.name,
          grantedAt: Date.now(),
        })),
        5000
      ).catch(() => {});
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
    // Try raw key, lowercase key, and sanitized email key (timeout-guarded)
    const tryKeys = [clean, clean.toLowerCase()];
    if (clean.includes('@')) tryKeys.push(emailKey(clean));
    for (const key of tryKeys) {
      if (!key) continue;
      const snap = await withFirestoreTimeout(get(ref(rtdb, `users/${key}`)), 5000).catch(() => null);
      if (snap && snap.exists()) {
        const val = snap.val() as AppUserProfile;
        return { ...val, uid: val.uid || key };
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
    console.log('[Firebase] Fetching all users...');
    const snap = await withFirestoreTimeout(get(ref(rtdb, 'users')));
    // FIX (stale roles shown): each user may have TWO records (uid key + email
    // mirror key). Merge duplicates by email instead of keeping the first
    // record encountered, preferring an attributed 'Admin' role.
    const byEmail = new Map<string, AppUserProfile>();
    if (snap.exists() && typeof snap.val() === 'object') {
      console.log('[Firebase] Users data found:', Object.keys(snap.val()).length, 'entries');
      Object.entries(snap.val() as Record<string, any>).forEach(([key, d]) => {
        const profile = (d || {}) as AppUserProfile;
        const k = (profile.email || key).toLowerCase().trim();
        if (!k) return;
        const existing = byEmail.get(k);
        if (existing) {
          const role = (existing.role === 'Admin' || profile.role === 'Admin')
            ? 'Admin'
            : (profile.role || existing.role);
          byEmail.set(k, {
            ...existing, ...profile, role,
            uid: profile.uid || existing.uid || key,
          } as AppUserProfile);
        } else {
          byEmail.set(k, { ...profile, uid: profile.uid || key });
        }
      });
    } else {
      console.log('[Firebase] No users data found');
    }
    const users: AppUserProfile[] = Array.from(byEmail.values());
    console.log('[Firebase] Returning', users.length, 'users');
    return users;
  } catch (err) {
    console.error('[Firebase] Error fetching all users:', err);
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
    const targets = new Set<string>([clean]);
    if (clean.includes('@')) {
      targets.add(clean.toLowerCase());
      targets.add(emailKey(clean));
      targets.add(clean.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_'));
    }
    for (const key of targets) {
      if (!key) continue;
      await withFirestoreTimeout(remove(ref(rtdb, `users/${key}`)), 5000).catch(() => {});
    }
  } catch (err) {
    console.warn('[Firebase] Notice deleting user profile:', err);
  }
}

/**
 * Admin account management (super admin only, enforced by the caller).
 * Attribute a role to an account.
 */
export async function setUserRole(emailOrUid: string, role: string): Promise<void> {
  if (!emailOrUid || !role) return;
  const clean = emailOrUid.trim();
  console.log('[Firebase] Setting role for:', clean, 'to:', role);
  const targets = new Set<string>([clean]);
  if (clean.includes('@')) {
    targets.add(clean.toLowerCase());
    targets.add(emailKey(clean));
    targets.add(clean.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_'));
  }
  for (const key of targets) {
    if (!key) continue;
    try {
      const existingRef = ref(rtdb, `users/${key}`);
      let existing: any = {};
      try {
        const snap = await get(existingRef);
        if (snap.exists()) existing = snap.val() || {};
      } catch (getErr) {
        console.warn('[Firebase] Get existing user failed:', getErr);
      }
      await withFirestoreTimeout(
        set(existingRef, { ...existing, ...stripUndefined({ role, updatedAt: new Date().toISOString() }) }),
        5000
      ).catch((setErr) => {
        console.error('[Firebase] Set role failed:', setErr);
      });
    } catch (err) {
      console.error('[Firebase] Error in setUserRole:', err);
    }
  }
}

/**
 * Suspend or restore an account (suspended users are blocked at login).
 */
export async function setUserSuspended(emailOrUid: string, suspended: boolean): Promise<void> {
  if (!emailOrUid) return;
  const clean = emailOrUid.trim();
  const targets = new Set<string>([clean]);
  if (clean.includes('@')) {
    targets.add(clean.toLowerCase());
    targets.add(emailKey(clean));
    targets.add(clean.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_'));
  }
  for (const key of targets) {
    if (!key) continue;
    // Use set() to create-or-update, instead of update() which silently no-ops on missing records
    const existingRef = ref(rtdb, `users/${key}`);
    let existing: any = {};
    try {
      const snap = await get(existingRef);
      if (snap.exists()) existing = snap.val() || {};
    } catch (_) {}
    const patch = suspended
      ? { suspended: true, suspendedAt: new Date().toISOString() }
      : { suspended: false, suspendedAt: null };
    await withFirestoreTimeout(
      set(existingRef, { ...existing, ...patch }),
      5000
    ).catch(() => {});
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInEmail(email: string, pass: string): Promise<AppUserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  try {
    return await syncUserProfile(cred.user);
  } catch (profileErr) {
    // FIX: Firestore failures (missing DB, offline, permission) must never block login.
    console.warn('[Firebase] Profile sync notice, using fallback profile:', profileErr);
    const isAdmin = isBootstrapAdmin(cred.user.email);
    return {
      uid: cred.user.uid,
      email: cred.user.email || '',
      name: cred.user.displayName || cred.user.email?.split('@')[0] || 'Utilisateur',
      role: isAdmin ? 'Admin' : 'Membre',
      avatarUrl: cred.user.photoURL || 'preset-male',
      streak: 1,
      readingTime: 0,
      accolades: isAdmin ? ['verified_identity', 'editorial_board', 'elite_clearance'] : ['verified_identity'],
    };
  }
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
