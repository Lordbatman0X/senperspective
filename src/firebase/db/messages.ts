import { ref, onValue } from 'firebase/database';
import { rtdb } from '../config';
import { toList } from './helpers';
import { handleFirestoreError, OperationType } from '../errors';
import type { Unsubscribe } from 'firebase/database';

export interface FirestoreDirectMessage {
  id?: string;
  sender?: string;
  receiver?: string;
  text?: string;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Live subscription to direct messages. Filters messages for the given
 * userEmail (case-insensitive) and returns them in chronological order.
 */
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
      const target = String(userEmail || '').toLowerCase().trim();
      const list = all.filter((m) => {
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