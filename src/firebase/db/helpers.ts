// TIMEOUT GUARD
// Every network read/write races a short timeout so a slow or
// unreachable backend can never freeze the first paint or login.
export function withFirestoreTimeout<T>(promise: PromiseLike<T>, ms = 7000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Database timeout after ${ms}ms`)), ms);
    Promise.resolve(promise).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); }
    );
  });
}

// HELPERS
/** RTDB rejects `undefined` values — strip them via a JSON round-trip. */
export function cleanForRtdb<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

/** Convert an RTDB object node ({key: value}) into an array with `id`. */
export function toList(val: any): any[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val).map(([id, data]: [string, any]) => ({ id, ...data }));
}

export function safeKey(id: string): string {
  return String(id).replace(/[.#$[\]]/g, '_');
}

export function rtdbPathSegment(id: string): string {
  return String(id == null ? '' : id).trim().replace(/[.#$[\]]/g, '_');
}

export function isPermissionError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('permission_denied') || msg.includes('permission denied') || msg.includes('unauthorized');
}

// Subscription helper for testing/placeholder
export const subscribeToMessages = () => ({ unsubscribe: () => {} });