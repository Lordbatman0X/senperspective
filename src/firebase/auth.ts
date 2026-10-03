import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  ActionCodeSettings,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { ref, get, set as dbSet, update as dbUpdate, remove } from 'firebase/database';
import { auth, rtdb, firebaseConfig } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { withFirestoreTimeout, safeKey } from './db';

export const BOOTSTRAP_ADMIN_EMAILS = [
  'admin@senperspective.com',
  'kadersdiaz3@gmail.com',
];

export interface AppUserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'Admin' | 'Journaliste' | 'Membre' | string;
  avatarUrl: string;
  bio?: string;
  coverPhotoUrl?: string;
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
  friend_ids?: string[];
}

const googleProvider = new GoogleAuthProvider();

import { sanitizeKeySegment, friendsKey, requestKey, legacyRelationKeys, rtdbPathSegment } from './db';

/** RTDB-safe key: these characters are forbidden in RTDB keys.
 *  Canonical helpers (sanitizeKeySegment/friendsKey/requestKey/legacyRelationKeys)
 *  live in firebase/db.ts — re-exported here so every writer/reader shares
 *  one implementation. */
export { sanitizeKeySegment, friendsKey, requestKey, legacyRelationKeys, rtdbPathSegment };

/** RTDB-safe key for single-email user records (kept for backward compat). */
const emailKey = (email: string): string => sanitizeKeySegment(email);
function normalizeKeySegment(email: string): string {
  return sanitizeKeySegment(email);
}
/** RTDB rejects undefined values — strip them via a JSON round-trip */
const stripUndefined = (obj: any) => JSON.parse(JSON.stringify(obj));

export function isBootstrapAdmin(email?: string | null): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/** Central authorization helpers — the ONLY place role/privilege logic lives. */
export function isSuperAdminProfile(profile?: any): boolean {
  if (!profile) return false;
  return isBootstrapAdmin(profile.email || profile.uid || '');
}

export function isAdminProfile(profile?: any): boolean {
  if (!profile) return false;
  if (isSuperAdminProfile(profile)) return true;
  return String(profile.role || '').toLowerCase() === 'admin';
}

/**
 * THE single answer to "should this person see the Administration link?".
 *
 * WHY THIS EXISTS
 * ---------------
 * The desktop account menu asked isAdminProfile(), while the phone drawer used a
 * separate and wider test of its own:
 *   role === "Admin" || role === "Éditeur" ||
 *   email === "kadersdiaz3@gmail.com" || email === "admin@senperspective.com" ||
 *   sessionStorage["perspective-temp-admin-session"] === "authenticated"
 *
 * The two therefore disagreed: a role of "Éditeur" saw Administration on the
 * phone but not on desktop, so the same signed-in person got a different menu on
 * each device. Both surfaces now call this.
 *
 * `allowTempSession` is passed in rather than read here, because sessionStorage
 * only exists in the browser; keeping it a parameter also makes this function
 * safe to call during server-side or prerender passes.
 */
export function canAccessAdmin(input: {
  profile?: any;
  email?: string | null;
  allowTempSession?: boolean;
} = {}): boolean {
  const profile = input.profile || null;
  if (isAdminProfile(profile)) return true;
  if (input.allowTempSession) return true;

  const email = String(profile?.email || input.email || '').trim().toLowerCase();
  if (email && isBootstrapAdmin(email)) return true;

  // "Éditeur" is an editorial role that was only ever honoured by the phone
  // drawer. Treating it as admin here makes the two surfaces agree instead of
  // silently differing.
  const role = String(profile?.role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'éditeur' || role === 'editeur') return true;

  return false;
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
    // Timeout-guarded: a slow backend must never delay login (reads AND writes).
    //
    // FIX (multi-second delay between pressing Login and being logged in): the
    // uid read and the email-mirror read were AWAITED SEQUENTIALLY, each with a
    // 5s timeout, so a slow round-trip stacked up to 10s before login could
    // even start writing. They are independent lookups, so issue them together
    // and await once: worst case is now a single timeout, not the sum of both.
    const mirrorKey = email ? emailKey(email) : '';
    // Distinguish "the read FAILED" from "the record does not exist".
    //
    // FIX (profile destroyed on every login, so the phone and the desktop could
    // never agree): `.catch(() => null)` made a timed-out read indistinguishable
    // from an absent record. `data` became null, control fell into the
    // brand-new-user branch, and that branch `set()` DEFAULTS over the real
    // record - name from the admin fallback, avatarUrl 'preset-male', bio ''.
    // A transiently slow read therefore wiped a perfectly good profile, which
    // is exactly what kept undoing the phone's edits.
    const [uidRead, mirrorSnap] = await Promise.all([
      withFirestoreTimeout(get(ref(rtdb, `users/${uid}`)), 5000)
        .then(snap => ({ ok: true as const, snap }))
        .catch(() => ({ ok: false as const, snap: null })),
      mirrorKey
        ? withFirestoreTimeout(get(ref(rtdb, `users/${mirrorKey}`)), 5000).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Read failed => we do not know what is stored. Never write in that case.
    if (!uidRead.ok) {
      console.warn('[Firebase] syncUserProfile: read failed for', uid, '- skipping write to avoid destroying the stored profile.');
      return {
        uid,
        email,
        name: email.split('@')[0],
        role: 'Membre',
        avatarUrl: 'preset-male',
        coverPhotoUrl: '',
        bio: '',
        streak: 1,
        readingTime: 0,
        accolades: ['verified_identity'],
        hideEmail: false,
        hidePersonalInfo: false,
      } as AppUserProfile;
    }

    const existingSnap = uidRead.snap;
    let data = existingSnap && existingSnap.exists() ? (existingSnap.val() as Partial<AppUserProfile>) : null;

    // FIX (attributed roles lost on login): profiles are stored under BOTH the
    // Firebase Auth uid key and a sanitized email key. If the uid-keyed record
    // is missing (or has no role yet), adopt the email-keyed record so roles
    // attributed by the super admin survive the login sync instead of being
    // replaced by a fresh 'Membre' profile.
    if ((!data || !data.role) && mirrorSnap && mirrorSnap.exists()) {
      const mirror = mirrorSnap.val() as Partial<AppUserProfile>;
      if (!data) {
        data = { ...mirror, uid };
      } else {
        data = { ...mirror, ...data, role: data.role || mirror.role };
      }
    }
    // FIX (avatar / cover / name / bio / privacy reverting on every login).
    //
    // The uid-keyed record is not always the real profile: the email-keyed
    // mirror is written as a POINTER (`pointerTo: uid`) that also carries a
    // COPY of avatarUrl / coverPhotoUrl / name. This function read whichever
    // record sat at `users/${uid}` and, if that happened to be the pointer,
    // it adopted the mirror's stale copies as the truth — then wrote them back
    // over the canonical record with `set()`. Result: the moment a user signed
    // in on a new build (i.e. right after a deploy), their picture and name
    // snapped back to whatever the old mirror held, and the change was then
    // persisted, so it stayed wrong on every device.
    //
    // Resolve the pointer to the canonical record and merge the two, with the
    // canonical record winning on any field it actually defines.
    if (data && (data as any).pointerTo) {
      const target = sanitizeKeySegment(String((data as any).pointerTo));
      if (target) {
        const canonicalSnap = await withFirestoreTimeout(
          get(ref(rtdb, `users/${target}`)), 5000
        ).catch(() => null);
        const canonical = canonicalSnap && canonicalSnap.exists()
          ? (canonicalSnap.val() as Partial<AppUserProfile>)
          : null;
        if (canonical) {
          data = { ...data, ...canonical } as Partial<AppUserProfile>;
        } else {
          // The canonical read FAILED (timeout/offline). `data` is still just a
          // POINTER STUB — it carries no name, avatar, bio or cover. Falling
          // through would rebuild the profile from defaults
          // (name = email.split('@')[0], avatarUrl = 'preset-male', bio = '')
          // and `set()` those over the real record, DESTROYING the user's
          // profile. This is what silently reset a profile to
          // "kadersdiaz3" / "preset-male" while the server data was correct.
          // Bail out WITHOUT writing: a slow read must never overwrite data.
          console.warn('[Firebase] syncUserProfile: canonical read failed for', target, '- skipping write to avoid clobbering the profile.');
          return {
            uid,
            email,
            name: (data.name || email.split('@')[0]) as string,
            role: ((data as any).role || 'Membre') as any,
            avatarUrl: ((data as any).avatarUrl || 'preset-male') as string,
            coverPhotoUrl: '',
            bio: ((data as any).bio || '') as string,
            streak: (data.streak || 1) as number,
            readingTime: (data.readingTime || 0) as number,
            accolades: (data.accolades || ['verified_identity']) as any,
            hideEmail: false,
            hidePersonalInfo: false,
          } as AppUserProfile;
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
        hideEmail: data.hideEmail === true || (data as any).hide_email === true,
        hidePersonalInfo: data.hidePersonalInfo === true || (data as any).hide_personal_info === true,
        accolades: isAdmin
          ? ['verified_identity', 'editorial_board', 'elite_clearance']
          : (data.accolades || ['verified_identity']),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        suspended: data.suspended === true,
        friend_ids: Array.isArray((userOrData as any).friend_ids)
          ? (userOrData as any).friend_ids.map((id: string) => String(id || '').toLowerCase().trim()).filter(Boolean)
          : (Array.isArray(data?.friend_ids) ? data.friend_ids.map((id: string) => String(id || '').toLowerCase().trim()).filter(Boolean) : []),
        ...(!isFirebaseUser ? (userOrData as Partial<AppUserProfile>) : {})
      };
      // ARCHITECTURAL FIX (profiles kept reverting; phone and desktop never
      // agreed): signing in is a READ operation. It must never rewrite profile
      // content.
      //
      // This block used to set() a rebuilt object, spreading the stored record
      // underneath a freshly constructed profile. That silently replaced any
      // field whose rebuilt value fell back to a default (streak 1, readingTime
      // 0, the default accolades list, the admin name fallback), so a login on
      // one device could overwrite what the user had saved on another.
      //
      // A targeted update() of lastActive cannot delete or overwrite any other
      // field, by definition. Profile content is written in exactly one place,
      // saveUserProfileFields(), and nowhere else.
      void withFirestoreTimeout(
        dbUpdate(ref(rtdb, `users/${uid}`), { lastActive: Date.now() }),
        5000
      ).catch(() => {});
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
      void withFirestoreTimeout(dbSet(ref(rtdb, `users/${uid}`), stripUndefined({ ...profileData, createdAtServer: Date.now() })), 5000).catch(() => {});
    }

    // The email-keyed mirror is a POINTER and nothing else.
    //
    // FIX (desktop and phone showing different pictures/names): this used to
    // also write a COPY of avatarUrl / coverPhotoUrl / name / role onto the
    // mirror. That copy went stale the moment the user edited their profile
    // from any surface, and because `fetchUserProfile` and `fetchAllUsers`
    // both resolve pointers, whichever record was read first could hand back
    // the STALE copy — so the desktop build and the phone build regularly
    // disagreed about the same account.
    //
    // Writing only the pointer removes the second source of truth entirely.
    if (email && email !== uid) {
      // Non-blocking: the mirror is a pointer that already exists in practice,
      // so awaiting this write only added its timeout to the login latency.
      void withFirestoreTimeout(
        dbSet(ref(rtdb, `users/${emailKey(email)}`), stripUndefined({
          email,
          uid,
          pointerTo: uid,
        })),
        5000
      ).catch(() => {});
    }

    // If Admin, register in /admins/{uid} for security rules
    if (isAdmin) {
      // Non-blocking for the same reason as the writes above.
      void withFirestoreTimeout(
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
        let val = snap.val() as AppUserProfile & { pointerTo?: string };
        // Follow pointer records (email-keyed mirrors now store only a
        // pointer to the canonical uid-keyed record).
        let hops = 0;
        while (val?.pointerTo && hops < 3) {
          const target = await withFirestoreTimeout(get(ref(rtdb, `users/${val.pointerTo}`)), 5000).catch(() => null);
          if (!target || !target.exists()) break;
          val = target.val() as AppUserProfile;
          hops++;
        }
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
    let raw: Record<string, any> = {};

    // 1. Direct REST read (fast path: instant, avoids WebSocket timeout)
    if (firebaseConfig?.databaseURL) {
      try {
        const res = await fetch(`${firebaseConfig.databaseURL}/users.json`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            raw = data;
          }
        }
      } catch {
        // Fall through to SDK read
      }
    }

    // 2. SDK fallback
    if (Object.keys(raw).length === 0) {
      try {
        const snap = await withFirestoreTimeout(get(ref(rtdb, 'users')), 15000);
        if (snap.exists() && typeof snap.val() === 'object') {
          raw = snap.val() as Record<string, any>;
        }
      } catch (err) {
        console.warn('[Firebase] fetchAllUsers SDK notice:', err);
      }
    }

    // FIX (stale roles shown): each user may have TWO records (uid key + email
    // mirror key). Merge duplicates by email instead of keeping the first
    // record encountered, preferring an attributed 'Admin' role.
    const byEmail = new Map<string, AppUserProfile>();

    // Pass 1 — learn which uid/keys belong to which real email address.
    //
    // A record is only a disposable "pointer stub" when it points at a DIFFERENT
    // key. A self-pointer (`pointerTo === key`) is a real account that merely
    // carries a redundant pointer, and in the live data those are the records
    // that actually hold a name, avatar, bio AND email. Skipping them (as the
    // old `if (p.pointerTo) continue;` did) is what left the Network tab
    // showing 1 of 8 accounts.
    const emailByUid = new Map<string, string>();
    const emailBySanitizedKey = new Map<string, string>();
    const norm = (s: unknown) => String(s ?? '').toLowerCase().trim();
    for (const [key, d] of Object.entries(raw)) {
      const p = (d || {}) as any;
      if (p.pointerTo && p.pointerTo !== key) continue;
      const email = norm(p.email);
      if (!email) continue;
      if (p.uid) {
        emailByUid.set(norm(p.uid), email);
        // A lowercased duplicate key must resolve to the same person.
        emailByUid.set(norm(p.uid).toLowerCase(), email);
      }
      // The record key is often the uid itself (canonical or lowercased).
      emailByUid.set(norm(key), email);
      // A sanitised key (dots -> underscore) maps back to the address too.
      emailBySanitizedKey.set(norm(key).replace(/[._]/g, ''), email);
      emailBySanitizedKey.set(norm(email).replace(/[._@]/g, ''), email);
    }

    if (Object.keys(raw).length === 0) {
      console.warn('[Firebase] No users data found');
    }

    // Pass 2 — assign every record an identity and merge by it.
    Object.entries(raw).forEach(([key, d]) => {
      const profile = (d || {}) as AppUserProfile & { pointerTo?: string };
      // Skip only genuine pointer STUBS (they point at a different key and
      // carry no profile data of their own). A self-pointer is a real record.
      if (profile.pointerTo && profile.pointerTo !== key) return;

      // Resolve the identity from any available signal, most reliable first.
      // `emailByUid` is keyed by uid AND by record key, so a lowercased
      // duplicate (e.g. sq7d8wld...) resolves to the address held by its
      // canonical twin (Sq7D8WLD...) without needing a uid field of its own.
      const identity =
        norm(profile.email)
        || emailByUid.get(norm(profile.uid))
        || emailByUid.get(norm(key))
        || emailBySanitizedKey.get(norm(key).replace(/[._]/g, ''))
        || emailBySanitizedKey.get(norm(key).replace(/[._@]/g, ''))
        || norm(key);
      if (!identity) return;

      const existing = byEmail.get(identity);
      if (existing) {
        const role = (existing.role === 'Admin' || profile.role === 'Admin')
          ? 'Admin'
          : (profile.role || existing.role);

        // Prefer the record whose `uid` is a real Firebase uid (no '@') as the
        // canonical one, so every surface shows the same profile.
        const existingIsCanonical = !String(existing.uid || '').includes('@');
        const incomingIsCanonical = !String(profile.uid || key).includes('@');
        const winner = incomingIsCanonical && !existingIsCanonical ? profile : existing;
        const loser = winner === profile ? existing : profile;

        // Keep the BEST value per field instead of letting the winner's blanks
        // erase the loser's data. An email-less record still carries the real
        // name/avatar, and that is often the only copy that has it.
        const merged: any = { ...loser, ...winner };
        for (const field of ['email', 'name', 'avatarUrl', 'coverPhotoUrl', 'bio', 'role'] as const) {
          const w = (winner as any)[field];
          const l = (loser as any)[field];
          if (w === undefined || w === null || w === '') merged[field] = l;
        }
        // Never let the identity be lost in the merge.
        merged.email = norm(profile.email) || norm(existing.email) || identity;
        merged.role = role;
        byEmail.set(identity, { ...merged, uid: winner.uid || loser.uid || key } as AppUserProfile);
      } else {
        byEmail.set(identity, {
          ...profile,
          email: norm(profile.email) || identity,
          uid: profile.uid || key,
        } as AppUserProfile);
      }
    });
    const users: AppUserProfile[] = Array.from(byEmail.values());
    // Backfill any missing `email` back onto the orphaned records, so the next
    // read does not have to infer identity again — and so other code paths
    // (which still key on `email`) can see these accounts at all.
    void repairUserEmails(raw, emailByUid, emailBySanitizedKey).catch(() => {});
    return users;
  } catch (err) {
    console.warn('[Firebase] Notice fetching all users:', err);
    return [];
  }
}

/**
 * Persist the resolved email onto user records that are missing one.
 *
 * WHY: the live `users` collection contains many records with a name and an
 * avatar but NO `email` field — leftovers from earlier builds. Every code path
 * that keys an account on its email therefore cannot see them, which is why
 * several members were invisible in the Network tab. Writing the resolved
 * address back is additive: no field is cleared, and a record that already has
 * an email is left untouched.
 *
 * Runs at most once per browser (guarded by a caller-level flag) and never
 * throws, so it can never block the directory from rendering.
 */
async function repairUserEmails(
  raw: Record<string, any>,
  emailByUid: Map<string, string>,
  emailBySanitizedKey: Map<string, string>
): Promise<number> {
  const norm = (s: unknown) => String(s ?? '').toLowerCase().trim();
  let patched = 0;
  for (const [key, d] of Object.entries(raw)) {
    const p = (d || {}) as any;
    // A self-pointer is a real record, not a stub — backfill it too.
    if (p.pointerTo && p.pointerTo !== key) continue;
    if (norm(p.email)) continue; // already identified
    const resolved =
      emailByUid.get(norm(p.uid))
      || emailByUid.get(norm(key))
      || emailBySanitizedKey.get(norm(key).replace(/[._]/g, ''))
      || emailBySanitizedKey.get(norm(key).replace(/[._@]/g, ''));
    if (!resolved) continue;
    try {
      // `update` on the leaf path: additive, so no other field can be lost.
      await withFirestoreTimeout(
        dbUpdate(ref(rtdb, `users/${safeKey(key)}`), { email: resolved }),
        6000
      );
      patched++;
    } catch (err) {
      console.warn('[Firebase] email backfill failed for', key, err);
    }
  }
  if (patched) console.info(`[Firebase] backfilled email on ${patched} user record(s)`);
  return patched;
}

/**
 * Resolve ALL database keys that may hold a given account.
 * If given an email, derives every key variant directly.
 * If given a uid/mangled key (no '@'), reads the record to find its email,
 * then adds every email-derived variant too — so admin actions always
 * update the record(s) that login sync actually reads from.
 */
async function resolveAccountKeys(emailOrUid: string): Promise<string[]> {
  const clean = emailOrUid.trim();
  const keys = new Set<string>([clean]);
  const lower = clean.toLowerCase();
  if (clean.includes('@')) keys.add(lower);

  // FIX (profile edits not reaching other devices).
  //
  // One account can leave two records behind: a canonical one keyed by the real
  // Firebase Auth uid, and a shadow keyed by the sanitized email whose `uid`
  // field holds a mangled address. Following `uid` finds the canonical record —
  // but ONLY in the non-email branch. The drawer always saves by EMAIL, so the
  // canonical key was never discovered and every edit landed on the shadow
  // alone. The editing device showed the change from local state, while any
  // other device re-read the untouched canonical record and saw the old name,
  // photo and cover — even after a hard refresh, because the data really was
  // different on the server.
  //
  // The chain is email key -> record -> pointerTo/uid -> canonical key, so it
  // must be walked with a worklist rather than a single pre-computed pass: the
  // key that carries the real uid (the pointer mirror) is only discovered
  // AFTER reading the sanitized-email record.
  const emailVariants = new Set<string>([clean]);
  if (clean.includes('@')) {
    emailVariants.add(lower);
    emailVariants.add(emailKey(clean));
    emailVariants.add(lower.replace(/[^a-zA-Z0-9_-]/g, '_'));
  }

  const queue: string[] = Array.from(emailVariants);
  const seen = new Set<string>(queue);

  while (queue.length) {
    const key = queue.shift() as string;
    keys.add(key);
    try {
      // RTDB rejects `.` `#` `$` `/` `[` `]` inside a path segment, and an
      // email address contains a dot. Every key derived from an email must
      // therefore be sanitized before being used to build a path — otherwise
      // the read throws and the chain never reaches the canonical record.
      //
      // `rtdbPathSegment()` rather than `sanitizeKeySegment()`: these keys may be
      // canonical uids, which are case-sensitive, and lowercasing here made the
      // walk read the all-lowercase shadow instead of the real record — so the
      // canonical key was never discovered and never written to.
      const snap = await get(ref(rtdb, `users/${rtdbPathSegment(key)}`));
      const record: any = snap.exists() ? snap.val() : null;
      if (!record) continue;

      const add = (next: string) => {
        if (next && !seen.has(next)) { seen.add(next); keys.add(next); queue.push(next); }
      };

      const email = String(record.email || '');
      if (email.includes('@')) {
        const el = email.toLowerCase();
        add(el);
        add(emailKey(email));
        add(el.replace(/[^a-zA-Z0-9_-]/g, '_'));
      }

      // `pointerTo` is written on the email mirror and always holds the real
      // Firebase uid. `uid` on a shadow record is a mangled email, so it is only
      // useful when it contains no '@'.
      add(String(record.pointerTo || ''));
      const storedUid = String(record.uid || '');
      if (storedUid && !storedUid.includes('@')) add(storedUid);
    } catch (_) { /* non-fatal: keep the keys resolved so far */ }
  }
  return Array.from(keys).filter(Boolean);
}

/**
 * Delete a user profile from Firestore
 */
export async function deleteUserProfile(emailOrUid: string): Promise<void> {
  if (!emailOrUid) return;
  try {
    const targets = await resolveAccountKeys(emailOrUid);
    for (const key of targets) {
      if (!key) continue;
      // Case-preserving segment: a raw uid must keep its case, and an email
      // must have its dots escaped, so both go through rtdbPathSegment().
      await withFirestoreTimeout(remove(ref(rtdb, `users/${rtdbPathSegment(key)}`)), 5000).catch(() => {});
    }
  } catch (err) {
    console.warn('[Firebase] Notice deleting user profile:', err);
  }
}

/**
 * Persist reader-editable profile fields to Realtime Database.
 *
 * WHY THIS EXISTS: every edit in ConnectionsAndProfile (avatar upload, cover
 * photo, display name, bio, privacy toggles, streak, reading time) called only
 * `setReaderProfile(...)`, i.e. local React state. Nothing was ever written, so
 * the drawer showed the new value until the next fetch or reload and then
 * reverted to whatever the database held. That is exactly the "it resets the
 * name and the image I changed" symptom.
 *
 * Written with the same read-merge-write shape as setUserRole /
 * setUserSuspended, and applied to every key variant, because an account can
 * exist under BOTH a uid key and an email-mirror key. Writing only one would
 * leave the other stale, and login sync may read either.
 *
 * Only the fields listed in PROFILE_EDITABLE_FIELDS are accepted. Role,
 * suspension and account identity are deliberately NOT writable from here —
 * those stay admin-only, so this cannot be used to escalate privileges.
 */
const PROFILE_EDITABLE_FIELDS = [
  'name',
  'bio',
  'avatarUrl',
  'coverPhotoUrl',
  'hidePersonalInfo',
  'hideEmail',
  'streak',
  'readingTime',
  'jobTitle',
  'location',
  'website',
  // Self-selected display badges. Not privilege-bearing (admin-assigned roles
  // live in `role`), so it is safe to let a user manage their own.
  'accolades',
] as const;

export async function saveUserProfileFields(
  emailOrUid: string,
  patch: Partial<AppUserProfile>
): Promise<boolean> {
  if (!emailOrUid) return false;

  // Whitelist: silently drop anything that is not a reader-editable field so
  // a caller cannot smuggle `role` or `suspended` through this path.
  const clean: Record<string, any> = {};
  for (const field of PROFILE_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) {
      clean[field] = (patch as any)[field];
    }
  }
  if (Object.keys(clean).length === 0) return false;

  const targets = await resolveAccountKeys(emailOrUid);
  let wrote = false;
  for (const key of targets) {
    if (!key) continue;
    // Same RTDB path rule as the read: a raw email is not a valid path segment.
    //
    // FIX (phone edit invisible on desktop): this used `sanitizeKeySegment()`,
    // which LOWERCASES its input. Keys returned by resolveAccountKeys() include
    // the canonical Firebase uid (e.g. `Sq7D8WLDqyLpbSH51cP5wBfikLk2`), and uids
    // are case-sensitive, so the write silently landed on a DIFFERENT record —
    // the all-lowercase shadow `sq7d8wldqylpbsh51cp5wbfiklk2`. The phone then
    // rendered the new value from its own local state, while the desktop read
    // the untouched canonical record. `rtdbPathSegment()` keeps the case.
    const segment = rtdbPathSegment(key);
    if (!segment) continue;
    try {
      const existingRef = ref(rtdb, `users/${segment}`);
      let existing: any = {};
      // A failed read must NOT be treated as an empty record: writing
      // `{ ...{}, ...clean }` would erase every OTHER stored field (avatar,
      // bio, cover...) along with the one being edited. Skip the key instead.
      const readOk = await get(existingRef)
        .then(snap => { if (snap.exists()) existing = snap.val() || {}; return true; })
        .catch(() => false);
      if (!readOk) {
        console.warn(`[Firebase] saveUserProfileFields ${key}: read failed, skipping to avoid erasing the record.`);
        continue;
      }

      // A pointer record must stay a pointer and carry NO profile fields.
      //
      // FIX (desktop vs phone disagreeing): this used to reset `existing` to
      // `{ pointerTo }` and then spread `clean` on top of it, so the email-keyed
      // mirror ended up holding its own avatarUrl / name / cover copy. Readers
      // that resolve the pointer can then return either the canonical record or
      // that stale copy, which is exactly why the desktop build and the phone
      // build showed different information for the same account.
      //
      // Skip it: `resolveAccountKeys()` also returns the canonical uid key, and
      // that record is the one written just below. The pointer is already
      // correct — it needs no update.
      if (existing.pointerTo) continue;

      await withFirestoreTimeout(
        dbSet(existingRef, {
          ...existing,
          ...clean,
          updatedAt: new Date().toISOString(),
        }),
        6000
      );
      wrote = true;
    } catch (err) {
      console.warn(`[Firebase] saveUserProfileFields ${key} failed:`, err);
    }
  }
  return wrote;
}

/**
 * Admin account management (super admin only, enforced by the caller).
 * Attribute a role to an account.
 */
export async function setUserRole(emailOrUid: string, role: string): Promise<void> {
  if (!emailOrUid || !role) return;
  const targets = await resolveAccountKeys(emailOrUid);
  for (const key of targets) {
    if (!key) continue;
    try {
      // Case-preserving segment: these keys may be canonical uids.
      const existingRef = ref(rtdb, `users/${rtdbPathSegment(key)}`);
      let existing: any = {};
      try {
        const snap = await get(existingRef);
        if (snap.exists()) existing = snap.val() || {};
      } catch (getErr) {
        console.warn('[Firebase] Get existing user failed:', getErr);
      }
      await withFirestoreTimeout(
        dbSet(existingRef, { ...existing, ...stripUndefined({ role, updatedAt: new Date().toISOString() }) }),
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
  const targets = await resolveAccountKeys(emailOrUid);
  for (const key of targets) {
    if (!key) continue;
    // Use set() to create-or-update, instead of update() which silently no-ops on missing records
    // Case-preserving segment: these keys may be canonical uids.
    const existingRef = ref(rtdb, `users/${rtdbPathSegment(key)}`);
    let existing: any = {};
    try {
      const snap = await get(existingRef);
      if (snap.exists()) existing = snap.val() || {};
    } catch (_) {}
    const patch = suspended
      ? { suspended: true, suspendedAt: new Date().toISOString() }
      : { suspended: false, suspendedAt: null };
    await withFirestoreTimeout(
      dbSet(existingRef, { ...existing, ...patch }),
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
 * Send a password reset email.
 *
 * Previously this was a bare wrapper: no ActionCodeSettings, so the reset link
 * went wherever the Firebase console default points (often the bare project
 * domain, landing the reader outside the app), and raw Firebase error codes
 * such as `auth/invalid-email` surfaced verbatim in the UI.
 *
 * `handleCodeInApp` is set because the app reads the oobCode itself; without
 * it Firebase forces a redirect to the console-configured continue URL.
 * The code survives page reloads in sessionStorage so a reader who opens the
 * emailed link in a new tab can still complete the reset.
 */
export async function resetPasswordEmail(
  email: string,
  continueUrl?: string
): Promise<void> {
  const actionCodeSettings: ActionCodeSettings = {
    url: continueUrl || getPasswordResetRedirectUrl(),
    handleCodeInApp: true,
  };

  return sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
}

/**
 * The URL the emailed link should return to. Uses the current origin so the
 * same build works on localhost and on the production domain.
 */
export function getPasswordResetRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth?mode=reset`;
  }
  return 'https://senperspective.com/auth?mode=reset';
}

/**
 * Translate Firebase auth error codes into a message the reader can act on.
 *
 * The language is passed in explicitly so the existing FR/EN store mechanism
 * stays the single source of truth for locale, rather than sniffing the
 * navigator and showing a language the site is not currently using.
 *
 * Unknown codes fall back to the original message rather than being swallowed.
 */
export function passwordResetErrorMessage(
  code: string,
  isFr = false,
  fallback?: string
): string {
  const en: Record<string, string> = {
    'auth/invalid-email': 'That email address is not valid.',
    'auth/missing-email': 'Enter the email address for your account.',
    'auth/user-not-found': 'No account exists with that email address.',
    'auth/too-many-requests': 'Too many reset requests. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/unauthorized-domain': 'This domain is not authorised for password reset.',
    'auth/operation-not-allowed': 'Password reset is disabled for this project.',
    'auth/invalid-action-code': 'This reset link is invalid or has already been used.',
    'auth/expired-action-code': 'This reset link has expired. Please request a new one.',
    'auth/weak-password': 'Choose a stronger password (at least 6 characters).',
    'auth/missing-password': 'Enter a new password.',
  };
  const fr: Record<string, string> = {
    'auth/invalid-email': 'Cette adresse e-mail n’est pas valide.',
    'auth/missing-email': 'Saisissez l’adresse e-mail de votre compte.',
    'auth/user-not-found': 'Aucun compte n’existe avec cette adresse e-mail.',
    'auth/too-many-requests': 'Trop de demandes. Patientez quelques minutes puis réessayez.',
    'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion et réessayez.',
    'auth/unauthorized-domain': 'Ce domaine n’est pas autorisé pour la réinitialisation.',
    'auth/operation-not-allowed': 'La réinitialisation est désactivée pour ce projet.',
    'auth/invalid-action-code': 'Ce lien de réinitialisation est invalide ou a déjà été utilisé.',
    'auth/expired-action-code': 'Ce lien a expiré. Veuillez en demander un nouveau.',
    'auth/weak-password': 'Choisissez un mot de passe plus fort (6 caractères minimum).',
    'auth/missing-password': 'Saisissez un nouveau mot de passe.',
  };
  const map = isFr ? fr : en;
  return (
    map[code] ||
    fallback ||
    (isFr ? 'Échec de la réinitialisation.' : 'Password reset failed. Please try again.')
  );
}
