import { ref, get, set, push, remove, onValue } from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import { rtdb } from '../config';
import { handleFirestoreError, OperationType } from '../errors';
import { withFirestoreTimeout, safeKey } from './helpers';

export async function fetchAllAds(): Promise<any[]> {
  try {
    const snapshot = await withFirestoreTimeout(get(ref(rtdb, 'ads')), 15000);
    if (snapshot.exists()) {
      return toList(snapshot.val());
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'ads');
    return [];
  }
}

function toList(val: any): any[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val).map(([id, data]: [string, any]) => ({ id, ...data }));
}

export function subscribeToAds(onSuccess: (ads: any[]) => void, onError?: (error: any) => void): Unsubscribe {
  const adsRef = ref(rtdb, 'ads');
  return onValue(
    adsRef,
    (snapshot) => {
      try {
        if (snapshot.exists()) {
          onSuccess(toList(snapshot.val()));
        }
      } catch (err) {
        if (onError) onError(err);
      }
    },
    (err) => {
      console.warn('[Firebase] ads subscription notice:', err?.message);
      if (onError) onError(err);
    }
  );
}

export async function saveAdToRTDB(ad: any): Promise<boolean> {
  try {
    const key = ad.id || push(ref(rtdb, 'ads')).key;
    await set(ref(rtdb, `ads/${key}`), ad);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'ads');
    return false;
  }
}

export async function deleteAdFromRTDB(adId: string): Promise<boolean> {
  try {
    await remove(ref(rtdb, `ads/${adId}`));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `ads/${adId}`);
    return false;
  }
}

export async function incrementAdMetric(adId: string, metric: string, incrementBy = 1): Promise<boolean> {
  try {
    await update(ref(rtdb, `ads/${adId}`), {
      [metric]: incrementBy,
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `ads/${adId}`);
    return false;
  }
}