import { ref, set, remove, onValue } from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import { rtdb } from '../config';
import { handleFirestoreError, OperationType } from '../errors';
import { withFirestoreTimeout, safeKey, isPermissionError } from './helpers';

export function subscribeToUsers(onSuccess: (users: any[]) => void, onError?: (error: any) => void): Unsubscribe {
  const usersRef = ref(rtdb, 'users');
  return onValue(
    usersRef,
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
      console.warn('[Firebase] users subscription notice:', err?.message);
      if (onError) onError(err);
    }
  );
}

function toList(val: any): any[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val).map(([id, data]) => ({ id, ...data }));
}

export async function addSubscriberEmail(email: string): Promise<void> {
  try {
    const key = safeKey(email.toLowerCase().trim());
    await set(ref(rtdb, `subscribers/${key}`), {
      email: email.toLowerCase().trim(),
      subscribedAt: new Date().toISOString(),
      createdAt: Date.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `subscribers/${email}`);
  }
}

export async function removeSubscriberEmail(email: string): Promise<void> {
  try {
    const key = safeKey(email.toLowerCase().trim());
    await remove(ref(rtdb, `subscribers/${key}`));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `subscribers/${email}`);
  }
}

export async function updateSiteSettings(settings: any): Promise<void> {
  try {
    await set(ref(rtdb, 'site_settings/global'), {
      ...cleanForRtdb(settings),
      updatedAtServer: Date.now(),
    });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/global');
    }
    console.warn('[Firebase] updateSiteSettings notice:', error);
  }
}

export async function fetchSiteSettings(): Promise<any> {
  try {
    const snapshot = await withFirestoreTimeout(get(ref(rtdb, 'site_settings/global')), 20000);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, 'site_settings/global');
    }
    console.warn('[Firebase] fetchSiteSettings notice:', error);
    return null;
  }
}

export function subscribeToSiteSettings(
  onSuccess: (data: any) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const settingsRef = ref(rtdb, 'site_settings/global');
  return onValue(
    settingsRef,
    (snapshot) => {
      try {
        if (snapshot.exists()) {
          onSuccess(snapshot.val());
        }
      } catch (err) {
        if (onError) onError(err);
      }
    },
    (err) => {
      console.warn('[Firebase] site_settings subscription notice:', err?.message);
      if (onError) onError(err);
    }
  );
}

function cleanForRtdb<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}