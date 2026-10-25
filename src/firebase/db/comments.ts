import { ref, get, set, push, remove, onValue } from 'firebase/database';
import { rtdb } from '../config';
import { handleFirestoreError, OperationType } from '../errors';
import { withFirestoreTimeout, isPermissionError, safeKey } from './helpers';

export interface Comment {
  id: string;
  articleId: string;
  authorEmail: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export async function fetchAllComments(): Promise<Comment[]> {
  try {
    const snapshot = await withFirestoreTimeout(get(ref(rtdb, 'comments')), 15000);
    if (snapshot.exists()) {
      return toList(snapshot.val()).map((item: any) => ({
        ...item,
        id: item.id || item.key,
      })) as Comment[];
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'comments');
    return [];
  }
}

function toList(val: any): any[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val).map(([id, data]) => ({ id, ...data }));
}

export async function addComment(comment: Partial<Comment>): Promise<boolean> {
  try {
    const key = comment.id || push(ref(rtdb, 'comments')).key;
    const commentData = {
      ...comment,
      createdAt: comment.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    await set(ref(rtdb, `comments/${key}`), commentData);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'comments');
    return false;
  }
}

export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    await remove(ref(rtdb, `comments/${commentId}`));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
    return false;
  }
}

export async function saveCommentToFirestore(comment: Partial<Comment>): Promise<boolean> {
  return addComment(comment);
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