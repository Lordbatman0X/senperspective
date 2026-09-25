/**
 * TTL cache for provider responses.
 *
 * Deliberately local-first. The app has no backend (static Firebase Hosting),
 * so every visitor polls providers independently; the cache is what keeps that
 * from becoming a rate-limit problem. Firestore is used opportunistically to
 * share a warm cache between visitors, but every read is optional — a Firestore
 * failure must never break the board, it just means this visitor fetches.
 *
 * Keys are namespaced so a league can be evicted independently.
 */

const NS = "arena_cache_v1";
const MEM = new Map<string, { at: number; data: any }>();

/** Firestore is polled at most this often, regardless of local TTL. */
const SHARED_MIN_INTERVAL_MS = 60_000;

function memoryKey(scope: string) {
  return `${NS}:${scope}`;
}

function readLocal<T>(scope: string, ttlMs: number): { value: T; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(memoryKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    if (!parsed || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > ttlMs) return null;
    return { value: parsed.data, at: parsed.at };
  } catch {
    return null;
  }
}

function writeLocal(scope: string, data: any) {
  if (typeof window === "undefined") return;
  try {
    // Bounded: only a handful of scopes are ever written.
    window.localStorage.setItem(memoryKey(scope), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota or private mode — the in-memory tier still works */
  }
}

/**
 * Returns a fresh cached value, or null when the entry is missing or stale.
 * Never throws: this is on the render path.
 */
export function getCached<T = any>(scope: string, ttlMs: number): T | null {
  const mem = MEM.get(memoryKey(scope));
  if (mem && Date.now() - mem.at <= ttlMs) return mem.data as T;

  const local = readLocal<T>(scope, ttlMs);
  if (local) {
    MEM.set(memoryKey(scope), { at: local.at, data: local.value });
    return local.value;
  }
  return null;
}

/** Reads even if stale. Used to render something immediately while refreshing. */
export function getStale<T = any>(scope: string): { value: T; at: number } | null {
  const mem = MEM.get(memoryKey(scope));
  if (mem) return { value: mem.data as T, at: mem.at };
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(memoryKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    return parsed && typeof parsed.at === "number" ? { value: parsed.data, at: parsed.at } : null;
  } catch {
    return null;
  }
}

export function setCached(scope: string, data: any) {
  const key = memoryKey(scope);
  MEM.set(key, { at: Date.now(), data });
  writeLocal(scope, data);
  void shareToFirestore(scope, data);
}

export function clearCache() {
  MEM.clear();
  if (typeof window === "undefined") return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(NS)) doomed.push(k);
    }
    doomed.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Optional shared cache (Firestore).
//
// Dynamic `import()` keeps Firestore out of the initial chunk for visitors who
// never open L'Arène, and guarantees a Firestore problem can never break the
// board: every call here resolves to null/void on any failure.
// ---------------------------------------------------------------------------

function firestoreDocId(scope: string) {
  return scope.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

async function shareToFirestore(scope: string, data: any): Promise<void> {
  try {
    const { saveFirestoreDoc } = await import("../../firebase/db");
    await saveFirestoreDoc("arenaCache", firestoreDocId(scope), { at: Date.now(), data });
  } catch {
    /* best-effort only */
  }
}

/**
 * Attempts to warm from a shared cache written by an earlier visitor.
 * Returns the data only when it is newer than our local copy and fresh.
 */
export async function readShared<T = any>(scope: string, ttlMs: number): Promise<T | null> {
  try {
    const { fetchFirestoreCollection } = await import("../../firebase/db");
    const rows = await fetchFirestoreCollection("arenaCache");
    if (!Array.isArray(rows)) return null;
    const row = rows.find((r: any) => r?.id === firestoreDocId(scope));
    const at = Number(row?.at);
    if (!Number.isFinite(at) || Date.now() - at > ttlMs) return null;
    if (Date.now() - at < SHARED_MIN_INTERVAL_MS) return null;
    const local = getStale<T>(scope);
    if (local && local.at >= at) return null;
    return (row?.data ?? null) as T | null;
  } catch {
    return null;
  }
}
