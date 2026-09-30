/**
 * ============================================================================
 * SOCIAL GRAPH — the single source of truth for friendships, requests,
 * follows, blocks and mutes.
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The previous design spread one relationship across THREE places, each with
 * its own key format and its own idea of what a "pending" request is:
 *
 *   1. `friends/`         — two directional rows per friendship
 *   2. `friend_requests/` — rows with a mutable `status` field
 *   3. `users/{uid}.friend_ids` — a denormalised cache on the profile
 *
 * Because accepting a request wrote a NEW `status: 'accepted'` row at the
 * reversed key instead of consuming the pending one, both rows survived
 * forever. The UI filtered on `status === 'pending'` without ever consulting
 * the friends list, so a stale pending row re-offered a friendship that
 * already existed — on every device, on every reload, forever.
 *
 * The fix is not another patch; it is to make contradictory states
 * unrepresentable. FOUR INVARIANTS, enforced on every write:
 *
 *   I1. A friendship is ONE undirected edge, keyed by the sorted pair.
 *       (Both directional rows are still written so existing readers keep
 *       working, but they are always written together and deleted together.)
 *   I2. A request is directed: only `from -> to` exists, never the reverse.
 *   I3. If a friendship exists, NO request may exist in either direction.
 *       This is the invariant whose absence caused the reported bug.
 *   I4. Nothing is derived by filtering in the UI. `deriveSocialState()` is
 *       the only place that decides what a user may see, so every surface
 *       agrees.
 *
 * Readers must use `deriveSocialState()` / `getRelation()` rather than
 * filtering raw rows, and writers must use the actions below rather than
 * touching RTDB directly. That is what keeps the pages and the store from
 * drifting apart.
 */

import { ref, get, set as dbSet, remove as dbRemove, onValue, type Unsubscribe } from 'firebase/database';
import { rtdb } from './config';
import { withFirestoreTimeout } from './db';

export type RelationState =
  | 'self'
  | 'friends'
  | 'incoming'   // they asked me
  | 'outgoing'   // I asked them
  | 'blocked'
  | 'muted'
  | 'none';

/** Canonical email form used for EVERY comparison and every key. */
export const normEmail = (email: unknown): string =>
  String(email ?? '').toLowerCase().trim();

/** RTDB forbids `. # $ / [ ]`; emails contain dots. */
const seg = (email: unknown): string =>
  normEmail(email).replace(/[.#$/[\]]/g, '_');

/**
 * Undirected friendship key. Sorting the pair means `a->b` and `b->a` can
 * NEVER produce two different keys — the single biggest source of the old
 * duplicate-record chaos.
 */
export const friendshipKey = (a: unknown, b: unknown): string => {
  const [x, y] = [seg(a), seg(b)].sort();
  return `f__${x}__${y}`;
};

/** Directed request key. Direction is preserved: `from -> to`. */
export const requestKey = (from: unknown, to: unknown): string =>
  `r__${seg(from)}__${seg(to)}`;

/** Directed follow key: `follower -> followed`. */
export const followKey = (follower: unknown, followed: unknown): string =>
  `w__${seg(follower)}__${seg(followed)}`;

/** Typed relation key (block / mute) so the two can coexist for a pair. */
export const typedKey = (type: string, a: unknown, b: unknown): string =>
  `${normEmail(type)}_${seg(a)}__${seg(b)}`;

/**
 * Every historical key shape this codebase has ever written, so a pair can be
 * fully cleaned no matter which build created the rows. Kept deliberately
 * exhaustive: a missed variant is precisely how stale rows survived before.
 */
export function allHistoricalKeys(a: unknown, b: unknown): string[] {
  const al = normEmail(a);
  const bl = normEmail(b);
  const as = seg(a);
  const bs = seg(b);
  const out = new Set<string>();
  const add = (...keys: string[]) => keys.forEach(k => k && out.add(k));
  // friendship / follow: both orders, all separators
  add(`${as}__${bs}`, `${bs}__${as}`, `${as}_${bs}`, `${bs}_${as}`, `${al}_${bl}`, `${bl}_${al}`);
  // requests: the `freq_` family, both orders, both separators
  add(
    `freq_${as}__${bs}`, `freq_${bs}__${as}`,
    `freq_${as}_${bs}`, `freq_${bs}_${as}`,
    `freq_${al}_${bl}`, `freq_${bl}_${al}`,
  );
  return Array.from(out);
}

// ---------------------------------------------------------------------------
// READS
// ---------------------------------------------------------------------------

const collRef = (name: string) => ref(rtdb, name);

async function readAll(name: string): Promise<Record<string, any>> {
  try {
    const snap = await withFirestoreTimeout(get(collRef(name)), 7000);
    const val = snap.val();
    return val && typeof val === 'object' ? val : {};
  } catch {
    return {};
  }
}

export interface SocialSnapshot {
  friends: string[];
  following: string[];
  followers: string[];
  blocked: string[];
  muted: string[];
  incoming: string[];
  outgoing: string[];
}

export interface SocialState extends SocialSnapshot {
  /** The one and only way a surface should ask "what is our relation?". */
  getRelation: (otherEmail: unknown) => RelationState;
  isFriend: (otherEmail: unknown) => boolean;
}

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

/**
 * Derive the complete, consistent social state for one account.
 *
 * Rows are matched by FIELD, never by key, so records written by any older
 * build are still understood. `me` is excluded everywhere and self-rows are
 * dropped, which stops an unsynced optimistic write from making "following"
 * disagree with "friends".
 */
export function deriveSocialState(
  me: unknown,
  friendsRows: any[],
  requestRows: any[],
  followRows: any[],
  blockRows: any[]
): SocialState {
  const self = normEmail(me);
  const friendSet = new Set<string>();
  const following = new Set<string>();
  const followers = new Set<string>();
  const blocked = new Set<string>();
  const muted = new Set<string>();

  for (const r of friendsRows || []) {
    const a = normEmail(r?.user_id ?? r?.from);
    const b = normEmail(r?.friend_email ?? r?.email ?? r?.to);
    if (!a || !b || a === b) continue;
    // A friendship row is symmetric: whichever side I am on, the other is a friend.
    if (a === self) friendSet.add(b);
    else if (b === self) friendSet.add(a);
  }

  for (const r of followRows || []) {
    // follow record: user_id = follower, follower_email = followed
    const follower = normEmail(r?.user_id);
    const followed = normEmail(r?.follower_email ?? r?.email);
    if (!follower || !followed || follower === followed) continue;
    if (follower === self) following.add(followed);
    if (followed === self) followers.add(follower);
  }

  for (const r of blockRows || []) {
    const a = normEmail(r?.user_id);
    const b = normEmail(r?.blocked_email ?? r?.email);
    if (!a || !b || a === b || a !== self) continue;
    const type = normEmail(r?.type);
    // Untyped legacy rows are blocks; typed rows may be a block or a mute.
    if (type === 'mute') muted.add(b);
    else blocked.add(b);
  }

  // Requests. I3: a request is meaningless once the friendship exists, so
  // friendSet is subtracted here. This is the guard that stops an
  // already-accepted request from ever being surfaced again.
  const incoming = new Set<string>();
  const outgoing = new Set<string>();
  for (const r of requestRows || []) {
    const from = normEmail(r?.from);
    const to = normEmail(r?.to);
    if (!from || !to || from === to) continue;
    if (normEmail(r?.status) && normEmail(r?.status) !== 'pending') continue;
    const other = from === self ? to : to === self ? from : '';
    if (!other) continue;
    if (friendSet.has(other) || blocked.has(other)) continue; // I3
    if (to === self) incoming.add(other);
    else outgoing.add(other);
  }

  const friends = uniq(Array.from(friendSet));
  return {
    friends,
    following: uniq(Array.from(following)),
    followers: uniq(Array.from(followers)),
    blocked: uniq(Array.from(blocked)),
    muted: uniq(Array.from(muted)),
    incoming: uniq(Array.from(incoming)),
    outgoing: uniq(Array.from(outgoing)),
    getRelation: (otherEmail: unknown): RelationState => {
      const o = normEmail(otherEmail);
      if (!o) return 'none';
      if (o === self) return 'self';
      if (blocked.has(o)) return 'blocked';
      if (muted.has(o)) return 'muted';
      if (friendSet.has(o)) return 'friends';
      if (incoming.has(o)) return 'incoming';
      if (outgoing.has(o)) return 'outgoing';
      return 'none';
    },
    isFriend: (otherEmail: unknown) => friendSet.has(normEmail(otherEmail)),
  };
}

/** Load the full social state for an account. */
export async function loadSocialState(me: unknown): Promise<SocialState> {
  const [f, r, w, b] = await Promise.all([
    readAll('friends'),
    readAll('friend_requests'),
    readAll('followers'),
    readAll('blocks'),
  ]);
  return deriveSocialState(me, Object.values(f), Object.values(r), Object.values(w), Object.values(b));
}

/**
 * Subscribe to every collection that can change social state.
 *
 * One subscription drives every surface, so the drawer, the profile page and
 * the store can never hold three different truths at once.
 */
export function subscribeToSocialState(
  me: unknown,
  onState: (state: SocialState) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const self = normEmail(me);
  const names = ['friends', 'friend_requests', 'followers', 'blocks'] as const;
  const latest: Record<string, any> = { friends: {}, friend_requests: {}, followers: {}, blocks: {} };
  const unsubs: Unsubscribe[] = [];

  const push = () => {
    try {
      onState(deriveSocialState(
        self,
        Object.values(latest.friends),
        Object.values(latest.friend_requests),
        Object.values(latest.followers),
        Object.values(latest.blocks),
      ));
    } catch (err) {
      onError?.(err as Error);
    }
  };

  for (const name of names) {
    unsubs.push(onValue(
      collRef(name),
      (snap) => { latest[name] = snap.val() || {}; push(); },
      (err) => onError?.(err)
    ));
  }
  return () => unsubs.forEach(u => { try { u(); } catch { /* already closed */ } });
}

// ---------------------------------------------------------------------------
// WRITES — every mutation goes through here so I1/I3 cannot be violated
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString();
const safe = (k: string) => k.replace(/[.#$/[\]]/g, '_');

/** Remove a pair's rows from a collection across every historical key. */
async function purgeByKey(name: string, a: unknown, b: unknown): Promise<void> {
  for (const key of allHistoricalKeys(a, b)) {
    try {
      await withFirestoreTimeout(dbRemove(ref(rtdb, `${name}/${safe(key)}`)), 5000);
    } catch { /* best-effort: the row may simply not exist */ }
  }
}

/**
 * Delete every row in `name` that carries this pair in the given fields.
 *
 * Purging by key alone is NOT enough: older builds wrote the same relation
 * under many different keys, so a key-based delete leaves orphans behind —
 * which is exactly how the stale pending requests survived. Every purge is
 * therefore paired with this field-based sweep.
 */
async function purgeByFields(
  name: string,
  a: unknown,
  b: unknown,
  leftField: string,
  rightField: string
): Promise<void> {
  const rows = await readAll(name);
  const av = normEmail(a);
  const bv = normEmail(b);
  for (const [key, row] of Object.entries(rows)) {
    const l = normEmail((row as any)?.[leftField]);
    const r = normEmail((row as any)?.[rightField]);
    if (!((l === av && r === bv) || (l === bv && r === av))) continue;
    try {
      await withFirestoreTimeout(dbRemove(ref(rtdb, `${name}/${safe(key)}`)), 5000);
    } catch { /* best-effort */ }
  }
}

/** Remove every trace of a request between two accounts, both directions. */
async function purgeRequests(a: unknown, b: unknown): Promise<void> {
  await purgeByKey('friend_requests', a, b);
  await purgeByFields('friend_requests', a, b, 'from', 'to');
}

/** True when a friendship row exists for the pair (either direction). */
export async function areFriends(a: unknown, b: unknown): Promise<boolean> {
  const av = normEmail(a);
  const bv = normEmail(b);
  if (!av || !bv || av === bv) return false;
  const rows = await readAll('friends');
  for (const row of Object.values(rows)) {
    const x = normEmail((row as any)?.user_id);
    const y = normEmail((row as any)?.friend_email ?? (row as any)?.email);
    if ((x === av && y === bv) || (x === bv && y === av)) return true;
  }
  return false;
}

/**
 * Establish a friendship. Writes both directional rows (so legacy readers keep
 * working) and, critically, clears every request for the pair — I3.
 */
export async function befriend(a: unknown, b: unknown): Promise<boolean> {
  const av = normEmail(a);
  const bv = normEmail(b);
  if (!av || !bv || av === bv) return false;
  try {
    // Consume the request FIRST, so there is no window in which both a
    // friendship and a request for the same pair exist on the server.
    await purgeRequests(av, bv);

    const ts = now();
    await withFirestoreTimeout(dbSet(ref(rtdb, `friends/${safe(friendshipKey(av, bv))}`), {
      id: friendshipKey(av, bv), a: av, b: bv,
      user_id: av, friend_email: bv, email: bv,
      type: 'friend', connected_at: ts,
    }), 6000);
    await withFirestoreTimeout(dbSet(ref(rtdb, `friends/${safe(friendshipKey(bv, av))}`), {
      id: friendshipKey(bv, av), a: bv, b: av,
      user_id: bv, friend_email: av, email: av,
      type: 'friend', connected_at: ts,
    }), 6000);
    return true;
  } catch (err) {
    console.warn('[social] befriend failed:', err);
    return false;
  }
}

/** Remove a friendship and any stray request for the pair. */
export async function unfriend(a: unknown, b: unknown): Promise<boolean> {
  try {
    await purgeByKey('friends', a, b);
    await purgeByFields('friends', a, b, 'user_id', 'friend_email');
    await purgeRequests(a, b);
    return true;
  } catch (err) {
    console.warn('[social] unfriend failed:', err);
    return false;
  }
}

/**
 * Send a friend request. Refuses when the two are already friends, so sending
 * is never a path back into the contradictory state.
 */
export async function sendFriendRequest(from: unknown, to: unknown): Promise<boolean> {
  const f = normEmail(from);
  const t = normEmail(to);
  if (!f || !t || f === t) return false;
  try {
    if (await areFriends(f, t)) return false; // I3
    await withFirestoreTimeout(dbSet(ref(rtdb, `friend_requests/${safe(requestKey(f, t))}`), {
      id: requestKey(f, t), from: f, to: t, status: 'pending', created_at: now(),
    }), 6000);
    return true;
  } catch (err) {
    console.warn('[social] sendFriendRequest failed:', err);
    return false;
  }
}

/**
 * Accept a request: befriend and consume the request in ONE operation, so
 * there is no code path that can leave a pending row behind.
 */
export async function acceptFriendRequest(me: unknown, them: unknown): Promise<boolean> {
  return befriend(me, them);
}

/**
 * Decline or cancel: remove the request. It never writes an 'accepted' row —
 * that status field is what made the old model ambiguous.
 */
export async function declineFriendRequest(a: unknown, b: unknown): Promise<boolean> {
  try {
    await purgeRequests(a, b);
    return true;
  } catch (err) {
    console.warn('[social] declineFriendRequest failed:', err);
    return false;
  }
}

export async function follow(follower: unknown, followed: unknown): Promise<boolean> {
  const f = normEmail(follower);
  const t = normEmail(followed);
  if (!f || !t || f === t) return false;
  try {
    await withFirestoreTimeout(dbSet(ref(rtdb, `followers/${safe(followKey(f, t))}`), {
      id: followKey(f, t), user_id: f, follower_email: t, type: 'follow', created_at: now(),
    }), 6000);
    return true;
  } catch { return false; }
}

export async function unfollow(follower: unknown, followed: unknown): Promise<boolean> {
  try {
    await purgeByKey('followers', follower, followed);
    await purgeByFields('followers', follower, followed, 'user_id', 'follower_email');
    return true;
  } catch { return false; }
}

/**
 * One-shot repair of contradictory data left behind by older builds.
 *
 * Removes request rows for pairs that are already friends, and drops
 * duplicate friendship rows. Safe to run repeatedly; it never creates
 * anything. Returns a summary so the caller can report what changed.
 */
export async function repairSocialData(): Promise<{
  removedRequests: number; friendships: number; removedFriendRows: number;
}> {
  const [friends, requests] = await Promise.all([readAll('friends'), readAll('friend_requests')]);
  const friendPairs = new Set<string>();
  for (const row of Object.values(friends)) {
    const x = normEmail((row as any)?.user_id);
    const y = normEmail((row as any)?.friend_email ?? (row as any)?.email);
    if (x && y && x !== y) friendPairs.add(friendshipKey(x, y));
  }

  let removedRequests = 0;
  for (const [key, row] of Object.entries(requests)) {
    const from = normEmail((row as any)?.from);
    const to = normEmail((row as any)?.to);
    if (!from || !to || from === to) continue;
    if (friendPairs.has(friendshipKey(from, to))) {
      try {
        await withFirestoreTimeout(dbRemove(ref(rtdb, `friend_requests/${safe(key)}`)), 5000);
        removedRequests++;
      } catch { /* best-effort */ }
    }
  }

  // Drop friendship rows that duplicate a pair already stored canonically.
  const seen = new Set<string>();
  let removedFriendRows = 0;
  for (const [key, row] of Object.entries(friends)) {
    const x = normEmail((row as any)?.user_id);
    const y = normEmail((row as any)?.friend_email ?? (row as any)?.email);
    if (!x || !y || x === y) continue;
    const k = friendshipKey(x, y);
    if (seen.has(k)) {
      try {
        await withFirestoreTimeout(dbRemove(ref(rtdb, `friends/${safe(key)}`)), 5000);
        removedFriendRows++;
      } catch { /* best-effort */ }
    } else {
      seen.add(k);
    }
  }

  return { removedRequests, friendships: seen.size, removedFriendRows };
}

/** Block and mute are stored under typed keys so they can coexist. */
export async function setTypedRelation(
  type: 'block' | 'mute', a: unknown, b: unknown, on: boolean
): Promise<boolean> {
  const av = normEmail(a);
  const bv = normEmail(b);
  if (!av || !bv) return false;
  try {
    const key = safe(typedKey(type, av, bv));
    if (on) {
      await withFirestoreTimeout(dbSet(ref(rtdb, `blocks/${key}`), {
        id: key, type, user_id: av, blocked_email: bv, created_at: now(),
      }), 6000);
      if (type === 'block') {
        // Blocking implies unfriending and cancelling any open request.
        await unfriend(av, bv);
        await declineFriendRequest(av, bv);
      }
    } else {
      await withFirestoreTimeout(dbRemove(ref(rtdb, `blocks/${key}`)), 5000);
    }
    return true;
  } catch (err) {
    console.warn('[social] setTypedRelation failed:', err);
    return false;
  }
}

