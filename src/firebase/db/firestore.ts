import { ref, set, get, update, remove, onValue } from 'firebase/database';
import { rtdb } from '../config';
import { handleFirestoreError, OperationType } from '../errors';
import { withFirestoreTimeout, isPermissionError } from './helpers';

export async function saveFirestoreDoc(collection: string, id: string, data: any): Promise<boolean> {
  try {
    await set(ref(rtdb, `${collection}/${id}`), data);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collection}/${id}`);
    return false;
  }
}

export async function mergeFirestoreDoc(collection: string, id: string, data: any): Promise<boolean> {
  try {
    const docRef = ref(rtdb, `${collection}/${id}`);
    await update(docRef, data);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collection}/${id}`);
    return false;
  }
}

export async function deleteFirestoreDoc(collection: string, id: string): Promise<boolean> {
  try {
    await remove(ref(rtdb, `${collection}/${id}`));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collection}/${id}`);
    return false;
  }
}

export async function saveArticleToFirestore(article: any): Promise<boolean> {
  try {
    const key = article.id || push(ref(rtdb, 'articles')).key;
    const articleData = {
      ...article,
      updatedAt: Date.now(),
    };
    await set(ref(rtdb, `articles/${key}`), articleData);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'articles');
    return false;
  }
}

export async function deleteArticleFromFirestore(articleId: string): Promise<boolean> {
  try {
    await remove(ref(rtdb, `articles/${articleId}`));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `articles/${articleId}`);
    return false;
  }
}

export async function fetchFirestoreCollection(collection: string): Promise<any[]> {
  try {
    const snapshot = await withFirestoreTimeout(get(ref(rtdb, collection)), 15000);
    if (snapshot.exists()) {
      return toList(snapshot.val());
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collection);
    return [];
  }
}

function toList(val: any): any[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val).map(([id, data]: [string, any]) => ({ id, ...data }));
}