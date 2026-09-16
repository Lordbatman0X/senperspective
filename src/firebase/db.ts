import {
  ref,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  Unsubscribe,
} from 'firebase/database';
import { rtdb } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { Article } from '../types';

// -------------------------------------------------------------
// TIMEOUT GUARD
// Every network read/write races a short timeout so a slow or
// unreachable backend can never freeze the first paint or login.
// -------------------------------------------------------------
export function withFirestoreTimeout<T>(promise: PromiseLike<T>, ms = 7000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Database timeout after ${ms}ms`)), ms);
    // Promise.resolve() accepts both native Promises and RTDB ThenableReferences
    Promise.resolve(promise).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); }
    );
  });
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
/** RTDB rejects `undefined` values — strip them via a JSON round-trip. */
function cleanForRtdb<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

/** Convert an RTDB object node ({key: value}) into an array with `id`. */
function toList(val: any): any[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val).map(([id, data]) => ({
    id,
    ...(data && typeof data === 'object' ? data : { value: data }),
  }));
}

function safeKey(id: string): string {
  return String(id).replace(/[.#$/[\]]/g, '_');
}

// -------------------------------------------------------------
// TYPES (kept for backward compatibility with existing imports)
// -------------------------------------------------------------
export interface FirestoreComment {
  id: string;
  articleId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes?: number;
}

export interface FirestoreDiscussion {
  id: string;
  title: string;
  category: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  repliesCount?: number;
  views?: number;
  lastActivity?: string;
}

export interface FirestoreDiscussionReply {
  id: string;
  discussionId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface FirestoreDirectMessage {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  date: string;
  timestamp: number;
  read?: boolean;
}

// -------------------------------------------------------------
// ARTICLES
// -------------------------------------------------------------
function sortByDateDesc(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const da = new Date((a as any)?.date || (a as any)?.createdAt || 0).getTime() || 0;
    const dbb = new Date((b as any)?.date || (b as any)?.createdAt || 0).getTime() || 0;
    return dbb - da;
  });
}

export function subscribeToArticles(
  callback: (articles: Article[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const articlesRef = ref(rtdb, 'articles');
  return onValue(
    articlesRef,
    (snap) => {
    // CAP REMOVED: return the full article list — previously capped at 100,
    // which silently hid newer/older articles once the count passed 100.
    const list = sortByDateDesc(toList(snap.val()) as Article[]);
      callback(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'articles');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function fetchAllArticles(): Promise<Article[]> {
  try {
    // 15s (up from 7s): the articles node holds the full catalog — on slower
    // mobile connections the default timeout can fire while the RTDB
    // connection is still being established, silently falling back to a
    // stale local cache. A generous timeout avoids the "other device never
    // sees new articles" failure mode; the real-time listener in App.tsx is
    // the primary sync channel anyway.
    const snap = await withFirestoreTimeout(get(ref(rtdb, 'articles')), 15000);
    // CAP REMOVED: previously sliced to 100 — return everything.
    return sortByDateDesc(toList(snap.val()) as Article[]);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'articles');
  }
}

export async function saveArticle(article: Article): Promise<{ success: boolean; error?: string }> {
  const articleId = article.id || `art-${Date.now()}`;
  try {
    // set() creates OR completely overwrites the node. update() does
    // merge semantics which can silently fail on new paths or cause
    // partial writes. Using set() ensures the full article is written.
    await withFirestoreTimeout(
      set(ref(rtdb, `articles/${safeKey(articleId)}`), {
        ...cleanForRtdb(article),
        id: articleId,
        updatedAtServer: Date.now(),
      })
    );
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Firebase] saveArticle error:', msg);
    return { success: false, error: msg };
  }
}
export const saveCommentToFirestore = addComment;
export const saveArticleToFirestore = saveArticle;

export async function deleteArticle(articleId: string): Promise<void> {
  try {
    await withFirestoreTimeout(remove(ref(rtdb, `articles/${safeKey(articleId)}`)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `articles/${articleId}`);
  }
}
export const deleteArticleFromFirestore = deleteArticle;

// -------------------------------------------------------------
// COMMENTS
// -------------------------------------------------------------
export function subscribeToComments(
  articleId: string,
  callback: (comments: FirestoreComment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const commentsRef = ref(rtdb, 'comments');
  return onValue(
    commentsRef,
    (snap) => {
      const all = toList(snap.val()) as FirestoreComment[];
      callback(all.filter(c => c?.articleId === articleId));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'comments');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function addComment(comment: Omit<FirestoreComment, 'id'> & { id?: string }): Promise<string> {
  try {
    // Deterministic key = the comment's own id. The store later approves/edits/likes/
    // deletes via saveFirestoreDoc('comments', id) / deleteFirestoreDoc('comments', id),
    // which resolve to comments/<safeKey(id)> — so the original write MUST live at that
    // same node, otherwise updates create duplicates and deletes silently no-op.
    const commentId = (comment as any).id || `c-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await withFirestoreTimeout(
      set(ref(rtdb, `comments/${safeKey(commentId)}`), {
        ...cleanForRtdb(comment),
        id: commentId,
        createdAtServer: Date.now(),
      })
    );
    return commentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'comments');
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    // 1) Remove the canonical node comments/<safeKey(id)> (comments created after
    //    the deterministic-key fix live here).
    await withFirestoreTimeout(remove(ref(rtdb, `comments/${safeKey(commentId)}`)));
    // 2) Legacy comments were written under random push() keys with their `id`
    //    stored as a field — scan once and remove any node whose id field matches,
    //    otherwise deleted legacy comments resurrect on reload.
    const snap = await withFirestoreTimeout(get(ref(rtdb, 'comments')));
    if (snap.exists()) {
      const val = snap.val() as Record<string, any>;
      for (const [key, rec] of Object.entries(val)) {
        if (key !== safeKey(commentId) && String(rec?.id || '') === String(commentId)) {
          await withFirestoreTimeout(remove(ref(rtdb, `comments/${key}`))).catch(() => {});
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
  }
}

export async function fetchAllComments(): Promise<any[]> {
  try {
    // FIX (comments disappearing on reload): increase timeout from default 7s
    // to 12s for comment fetches. Comments are high-value engagement data that
    // must survive page reloads; a premature timeout causes the store to fall
    // back to the empty seed array and the realtime listener hasn't fired yet.
    const snap = await withFirestoreTimeout(get(ref(rtdb, 'comments')), 12000);
    return toList(snap.val()) as any[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'comments');
    return [];
  }
}

export function subscribeToAllComments(
  callback: (comments: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const commentsRef = ref(rtdb, 'comments');
  // FIX (comments disappearing on reload): The realtime listener must not
  // overwrite the store with an empty array on first fire. On initial connect
  // Firebase may return null before the full dataset is streamed, which would
  // clobber comments that were already loaded by fetchAllComments(). Only
  // push to the store when we have actual comment data.
  let firstFire = true;
  return onValue(
    commentsRef,
    (snap) => {
      const list = toList(snap.val()) as any[];
      if (firstFire) {
        firstFire = false;
        // On first fire, only update if we have real comments (not empty).
        // This prevents the listener from clobbering the fetchAllComments()
        // result with a premature empty snapshot.
        if (list.length > 0) {
          callback(list);
        }
      } else {
        // Subsequent fires always reflect the truth.
        callback(list);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'comments');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

// -------------------------------------------------------------
// DISCUSSIONS
// -------------------------------------------------------------
export function subscribeToDiscussions(
  callback: (discussions: FirestoreDiscussion[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const discussionsRef = ref(rtdb, 'discussions');
  return onValue(
    discussionsRef,
    (snap) => {
      const list = (toList(snap.val()) as FirestoreDiscussion[])
        .sort((a, b) => new Date(b?.lastActivity || b?.createdAt || 0).getTime() - new Date(a?.lastActivity || a?.createdAt || 0).getTime());
      callback(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'discussions');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function createDiscussion(discussion: Omit<FirestoreDiscussion, 'id'>): Promise<string> {
  try {
    const discussionsRef = ref(rtdb, 'discussions');
    const docRef = await withFirestoreTimeout(push(discussionsRef));
    await withFirestoreTimeout(
      set(docRef, {
        ...cleanForRtdb(discussion),
        repliesCount: 0,
        views: 0,
        lastActivity: discussion.createdAt || new Date().toISOString(),
        createdAtServer: Date.now(),
      })
    );
    return docRef.key as string;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'discussions');
  }
}

export function subscribeToDiscussionReplies(
  discussionId: string,
  callback: (replies: FirestoreDiscussionReply[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const repliesRef = ref(rtdb, 'discussion_replies');
  return onValue(
    repliesRef,
    (snap) => {
      const all = toList(snap.val()) as FirestoreDiscussionReply[];
      const filtered = all
        .filter(r => r?.discussionId === discussionId)
        .sort((a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime());
      callback(filtered);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'discussion_replies');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function addDiscussionReply(reply: Omit<FirestoreDiscussionReply, 'id'>): Promise<string> {
  try {
    const repliesRef = ref(rtdb, 'discussion_replies');
    const docRef = await withFirestoreTimeout(push(repliesRef));
    await withFirestoreTimeout(
      set(docRef, {
        ...cleanForRtdb(reply),
        createdAtServer: Date.now(),
      })
    );
    // Best-effort: bump the parent discussion's activity counters
    if (reply.discussionId) {
      withFirestoreTimeout(
        update(ref(rtdb, `discussions/${safeKey(reply.discussionId)}`), {
          repliesCount: (n: any) => ((typeof n === 'number' ? n : 0) + 1),
          lastActivity: new Date().toISOString(),
        })
      ).catch(() => {});
    }
    return docRef.key as string;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'discussion_replies');
  }
}

// -------------------------------------------------------------
// DIRECT MESSAGES
// -------------------------------------------------------------
export function subscribeToMessages(
  userEmail: string,
  callback: (messages: FirestoreDirectMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const messagesRef = ref(rtdb, 'messages');
  return onValue(
    messagesRef,
    (snap) => {
      const all = toList(snap.val()) as FirestoreDirectMessage[];
      // Case-insensitive matching: the store normalizes sender/receiver to
      // lowercase at send time, but the logged-in email may keep its original
      // casing (e.g. "Kader@Gmail.com"), which previously hid every message.
      const target = String(userEmail || '').toLowerCase().trim();
      const list = all.filter(m => {
        const s = String(m?.sender || '').toLowerCase().trim();
        const r = String(m?.receiver || '').toLowerCase().trim();
        return s === target || r === target;
      });
      // Chronological order so conversations render oldest → newest
      list.sort((a, b) => (a?.timestamp || 0) - (b?.timestamp || 0));
      callback(list);
    },
    (error) => {
      // handleFirestoreError throws — wrap so the SDK's error callback never
      // surfaces an uncaught exception; surface via the optional onError.
      try {
        handleFirestoreError(error, OperationType.GET, 'messages');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function sendDirectMessage(msg: Omit<FirestoreDirectMessage, 'id'>): Promise<string> {
  try {
    const messagesRef = ref(rtdb, 'messages');
    const docRef = await withFirestoreTimeout(push(messagesRef));
    await withFirestoreTimeout(
      set(docRef, {
        ...cleanForRtdb(msg),
        timestamp: msg.timestamp || Date.now(),
        createdAtServer: Date.now(),
      })
    );
    return docRef.key as string;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'messages');
  }
}

// -------------------------------------------------------------
// SITE SETTINGS
// -------------------------------------------------------------
export async function fetchSiteSettings(): Promise<any> {
  try {
    const snap = await withFirestoreTimeout(get(ref(rtdb, 'site_settings/global')));
    if (snap.exists()) {
      return snap.val();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site_settings/global');
  }
}

export async function updateSiteSettings(settings: any): Promise<void> {
  try {
    await withFirestoreTimeout(
      update(ref(rtdb, 'site_settings/global'), {
        ...cleanForRtdb(settings),
        updatedAtServer: Date.now(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'site_settings/global');
  }
}

// -------------------------------------------------------------
// SUBSCRIBERS
// -------------------------------------------------------------
export async function addSubscriberEmail(email: string): Promise<void> {
  try {
    const key = safeKey(email.toLowerCase().trim());
    await withFirestoreTimeout(
      set(ref(rtdb, `subscribers/${key}`), {
        email: email.toLowerCase().trim(),
        subscribedAt: new Date().toISOString(),
        createdAtServer: Date.now(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `subscribers/${email}`);
  }
}

// -------------------------------------------------------------
// GENERIC HELPERS (Relations, Reports, Blocks, Analytics, etc.)
// -------------------------------------------------------------
/**
 * Save a document to Firebase Realtime Database.
 * Returns true if the write succeeded, false if it failed.
 * TODO: Remove the `never` throw from handleFirestoreError or make this
 * function actually surface errors to callers instead of swallowing them.
 */
export async function saveFirestoreDoc(coll: string, id: string, data: any): Promise<boolean> {
  try {
    const pathId = safeKey(id);
    // Use set() instead of update() — update() silently no-ops on non-existent
    // records, which caused Friend/Follow/Block/Mute writes to be lost entirely
    // when the record was created for the first time.
    await withFirestoreTimeout(
      set(ref(rtdb, `${coll}/${pathId}`), {
        ...cleanForRtdb(data),
        updatedAtServer: Date.now(),
      })
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[Firebase] saveFirestoreDoc ${coll}/${id} failed:`, msg);
    return false;
  }
}

export async function deleteFirestoreDoc(coll: string, id: string): Promise<boolean> {
  try {
    await withFirestoreTimeout(remove(ref(rtdb, `${coll}/${safeKey(id)}`)));
    return true;
  } catch (error) {
    console.warn(`[Firebase] deleteFirestoreDoc ${coll}/${id} failed:`, error);
    return false;
  }
}

export async function fetchFirestoreCollection(coll: string): Promise<any[]> {
  try {
    const snap = await withFirestoreTimeout(get(ref(rtdb, coll)));
    return toList(snap.val());
  } catch (error) {
    console.warn(`[Firebase] fetchFirestoreCollection ${coll} error:`, error);
    return [];
  }
}

// -------------------------------------------------------------
// FRIEND REQUESTS — realtime subscription (syncs across devices)
// -------------------------------------------------------------
export function subscribeToFriendRequests(
  callback: (rows: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const refPath = ref(rtdb, 'friend_requests');
  return onValue(
    refPath,
    (snap) => {
      const list = toList(snap.val());
      callback(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'friend_requests');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}
export async function fetchAllAds(): Promise<any[]> {
  try {
    const snap = await withFirestoreTimeout(get(ref(rtdb, 'ads')));
    return toList(snap.val());
  } catch (error) {
    console.warn('[Firebase] fetchAllAds error:', error);
    return [];
  }
}

export function subscribeToAds(
  callback: (ads: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const adsRef = ref(rtdb, 'ads');
  return onValue(
    adsRef,
    (snap) => {
      const list = toList(snap.val());
      callback(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'ads');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function saveAdToFirestore(ad: any): Promise<boolean> {
  try {
    const adId = ad.id || `ad-${Date.now()}`;
    await withFirestoreTimeout(
      set(ref(rtdb, `ads/${safeKey(adId)}`), {
        ...cleanForRtdb(ad),
        id: adId,
        updatedAtServer: Date.now(),
      })
    );
    return true;
  } catch (error) {
    console.warn('[Firebase] saveAdToFirestore failed:', error);
    return false;
  }
}

export async function deleteAdFromFirestore(id: string): Promise<boolean> {
  try {
    await withFirestoreTimeout(remove(ref(rtdb, `ads/${safeKey(id)}`)));
    return true;
  } catch (error) {
    console.warn(`[Firebase] deleteAdFromFirestore ${id} failed:`, error);
    return false;
  }
}