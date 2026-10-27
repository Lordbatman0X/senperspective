import { ref, get, set, push, remove, onValue, query, limitToFirst } from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import { rtdb } from '../config';
import { handleFirestoreError, OperationType } from '../errors';
import { Article } from '../../types';
import { withFirestoreTimeout, isPermissionError } from './helpers';

export function subscribeToArticles(
  callback: (articles: Article[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const articlesRef = ref(rtdb, 'articles');
  return onValue(
    articlesRef,
    (snapshot) => {
      try {
        if (snapshot.exists()) {
          const articles = toList(snapshot.val());
          callback(articles as Article[]);
        } else {
          callback([]);
        }
      } catch (err) {
        if (onError) onError(err as Error);
      }
    },
    (err) => {
      console.warn('[Firebase] articles subscription notice:', err?.message);
      if (onError) onError(err as Error);
    }
  );
}

export function subscribeToAllComments(
  callback: (comments: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const commentsRef = ref(rtdb, 'comments');
  return onValue(
    commentsRef,
    (snapshot) => {
      try {
        if (snapshot.exists()) {
          callback(toList(snapshot.val()));
        } else {
          callback([]);
        }
      } catch (err) {
        if (onError) onError(err as Error);
      }
    },
    (err) => {
      console.warn('[Firebase] comments subscription notice:', err?.message);
      if (onError) onError(err as Error);
    }
  );
}

function toList(val: any): any[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val).map(([id, data]) => ({ id, ...data }));
}

export interface FetchAllArticlesOptions {
  /** If true, bypasses any local index and always re-reads from the cloud. */
  forceFresh?: boolean;
  /** If provided, called with the fresh cloud results so the caller can merge them without blocking the UI. */
  onBackgroundFresh?: (fresh: Article[]) => void;
  /** Max number of articles to return (applied after sorting by date desc). */
  limit?: number;
}

export async function fetchAllArticles(
  opts: FetchAllArticlesOptions = {}
): Promise<Article[]> {
  const { forceFresh, onBackgroundFresh, limit } = opts;
  try {
    const articlesRef = ref(rtdb, 'articles');
    const q = limit && limit > 0
      ? query(articlesRef, limitToFirst(limit))
      : articlesRef;
    const snapshot = await withFirestoreTimeout(get(q), 8000);

    if (!snapshot.exists()) {
      return [];
    }

    const articles = toList(snapshot.val()).map((item: any) => ({
      ...item,
      id: item.id || item.key,
    }));

    // Sort newest first by date (fallback to updatedAt / createdAt)
    articles.sort((a, b) => {
      const da = new Date((a as any).date || (a as any).updatedAt || 0).getTime();
      const db = new Date((b as any).date || (b as any).updatedAt || 0).getTime();
      return db - da;
    });

    // Notify the background-refresh callback so callers can merge non-blocking
    if (onBackgroundFresh && articles.length > 0) {
      try { onBackgroundFresh(articles as Article[]); } catch { /* best effort */ }
    }

    return articles as Article[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'articles');
    return [];
  }
}

export async function saveArticle(article: Partial<Article>): Promise<boolean> {
  try {
    const key = article.id || push(ref(rtdb, 'articles')).key;
    const articleData = {
      ...article,
      updatedAt: Date.now(),
    };
    await set(ref(rtdb, `articles/${key}`), cleanForRtdb(articleData));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'articles');
    return false;
  }
}

export async function deleteArticle(articleId: string): Promise<boolean> {
  try {
    await remove(ref(rtdb, `articles/${articleId}`));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `articles/${articleId}`);
    return false;
  }
}

function cleanForRtdb<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

export async function fetchArticleById(id: string): Promise<any> {
  try {
    const snapshot = await withFirestoreTimeout(get(ref(rtdb, `articles/${id}`)), 8000);
    if (snapshot.exists()) {
      return {
        ...snapshot.val(),
        id: snapshot.key,
      };
    }
    return null;
  } catch (error) {
    console.warn('[Firebase] fetchArticleById error:', error);
    return null;
  }
}