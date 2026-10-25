import { ref, onValue } from 'firebase/database';
import { rtdb } from '../config';
import { toList } from './helpers';
import { handleFirestoreError, OperationType } from '../errors';
import type { Unsubscribe } from 'firebase/database';

/**
 * Live subscription to the `notifications` collection. Every reader device
 * with this open receives pushed updates the moment any device (or the
 * server-side fan-out) writes a notification — no polling delay.
 * Consumers filter to their own email (case-insensitive) in the callback.
 */
export function subscribeToNotifications(
  callback: (rows: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const notifRef = ref(rtdb, 'notifications');
  return onValue(
    notifRef,
    (snap) => {
      callback(toList(snap.val()));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'notifications');
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}