import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { Article } from '../types';

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

export function subscribeToArticles(
  callback: (articles: Article[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'articles'), orderBy('date', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const articles: Article[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        articles.push({
          ...(data as Article),
          id: docSnap.id,
        });
      });
      callback(articles);
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
    const q = query(collection(db, 'articles'), orderBy('date', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    const articles: Article[] = [];
    snapshot.forEach(docSnap => {
      articles.push({
        ...(docSnap.data() as Article),
        id: docSnap.id,
      });
    });
    return articles;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'articles');
  }
}

export async function saveArticle(article: Article): Promise<void> {
  const articleId = article.id || `art-${Date.now()}`;
  const docRef = doc(db, 'articles', articleId);
  try {
    await setDoc(docRef, {
      ...article,
      id: articleId,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `articles/${articleId}`);
  }
}
export const saveArticleToFirestore = saveArticle;

export async function deleteArticle(articleId: string): Promise<void> {
  const docRef = doc(db, 'articles', articleId);
  try {
    await deleteDoc(docRef);
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
  callback: (comments: FirestoreComment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'comments'),
    where('articleId', '==', articleId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FirestoreComment[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `comments?articleId=${articleId}`);
    }
  );
}

export async function addComment(comment: Omit<FirestoreComment, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'comments');
    const docRef = await addDoc(colRef, {
      ...comment,
      createdAtServer: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'comments');
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
  }
}

// -------------------------------------------------------------
// DISCUSSIONS (L'Arène / Forum)
// -------------------------------------------------------------

export function subscribeToDiscussions(
  callback: (discussions: FirestoreDiscussion[]) => void
): Unsubscribe {
  const q = query(collection(db, 'discussions'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FirestoreDiscussion[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'discussions');
    }
  );
}

export async function createDiscussion(discussion: Omit<FirestoreDiscussion, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'discussions');
    const docRef = await addDoc(colRef, {
      ...discussion,
      createdAtServer: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'discussions');
  }
}

export function subscribeToDiscussionReplies(
  discussionId: string,
  callback: (replies: FirestoreDiscussionReply[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'discussion_replies'),
    where('discussionId', '==', discussionId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FirestoreDiscussionReply[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `discussion_replies?discussionId=${discussionId}`);
    }
  );
}

export async function addDiscussionReply(reply: Omit<FirestoreDiscussionReply, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'discussion_replies');
    const docRef = await addDoc(colRef, {
      ...reply,
      createdAtServer: serverTimestamp(),
    });
    // Update replies count in discussion
    const discRef = doc(db, 'discussions', reply.discussionId);
    await setDoc(discRef, { lastActivity: new Date().toISOString() }, { merge: true }).catch(() => {});
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'discussion_replies');
  }
}

// -------------------------------------------------------------
// DIRECT MESSAGES / CHAT
// -------------------------------------------------------------

export function subscribeToMessages(
  userEmail: string,
  callback: (messages: FirestoreDirectMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FirestoreDirectMessage[] = [];
      snapshot.forEach(docSnap => {
        const msg = { id: docSnap.id, ...(docSnap.data() as any) };
        if (msg.sender === userEmail || msg.receiver === userEmail) {
          list.push(msg);
        }
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'messages');
    }
  );
}

export async function sendDirectMessage(msg: Omit<FirestoreDirectMessage, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'messages');
    const docRef = await addDoc(colRef, {
      ...msg,
      timestamp: msg.timestamp || Date.now(),
      createdAtServer: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'messages');
  }
}

// -------------------------------------------------------------
// SITE SETTINGS
// -------------------------------------------------------------

export async function fetchSiteSettings(): Promise<any> {
  try {
    const snap = await getDoc(doc(db, 'site_settings', 'global'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site_settings/global');
  }
}

export async function updateSiteSettings(settings: any): Promise<void> {
  try {
    await setDoc(doc(db, 'site_settings', 'global'), {
      ...settings,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'site_settings/global');
  }
}

// -------------------------------------------------------------
// SUBSCRIBERS
// -------------------------------------------------------------

export async function addSubscriberEmail(email: string): Promise<void> {
  try {
    const docRef = doc(db, 'subscribers', email.toLowerCase().trim());
    await setDoc(docRef, {
      email: email.toLowerCase().trim(),
      subscribedAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `subscribers/${email}`);
  }
}

// -------------------------------------------------------------
// GENERIC FIRESTORE HELPERS (Relations, Reports, Blocks, etc.)
// -------------------------------------------------------------

export async function saveFirestoreDoc(coll: string, id: string, data: any): Promise<void> {
  try {
    const safeId = id.replace(/\//g, '_');
    await setDoc(doc(db, coll, safeId), {
      ...data,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${coll}/${id}`);
  }
}

export async function deleteFirestoreDoc(coll: string, id: string): Promise<void> {
  try {
    const safeId = id.replace(/\//g, '_');
    await deleteDoc(doc(db, coll, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${coll}/${id}`);
  }
}

export async function fetchFirestoreCollection(coll: string): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, coll));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.warn(`[Firestore] fetchFirestoreCollection ${coll} error:`, error);
    return [];
  }
}
