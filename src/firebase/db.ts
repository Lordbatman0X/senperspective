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
      const list = sortByDateDesc(toList(snap.val()) as Article[]).slice(0, 100);
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
    return sortByDateDesc(toList(snap.val()) as Article[]).slice(0, 100);
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

export async function addComment(comment: Omit<FirestoreComment, 'id'>): Promise<string> {
  try {
    const commentsRef = ref(rtdb, 'comments');
    const docRef = await withFirestoreTimeout(push(commentsRef));
    await withFirestoreTimeout(
      set(docRef, {
        ...cleanForRtdb(comment),
        createdAtServer: Date.now(),
      })
    );
    return docRef.key as string;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'comments');
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    await withFirestoreTimeout(remove(ref(rtdb, `comments/${safeKey(commentId)}`)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
  }
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
      const list = all.filter(m => m?.sender === userEmail || m?.receiver === userEmail);
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
export async function saveFirestoreDoc(coll: string, id: string, data: any): Promise<void> {
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
  } catch (error) {
    // Do NOT call handleFirestoreError here — it throws (return type never),
    // which would propagate up and break button handlers that expect a
    // fire-and-forget void return. Log instead.
    console.warn(`[Firebase] saveFirestoreDoc ${coll}/${id} failed:`, error);
  }
}

export async function deleteFirestoreDoc(coll: string, id: string): Promise<void> {
  try {
    await withFirestoreTimeout(remove(ref(rtdb, `${coll}/${safeKey(id)}`)));
  } catch (error) {
    console.warn(`[Firebase] deleteFirestoreDoc ${coll}/${id} failed:`, error);
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