/**
 * Demo-fixture guard.
 *
 * The app ships with 14 hardcoded placeholder matches (Champions League,
 * World Cup, BAL, D1, Lutte, Navétanes). Their teamings and scores are
 * INVENTED — e.g. "Real Madrid 2 - 3 PSG", and a Navétane fixture pinned at
 * "88'" with a 1-1 score, flagged `status: "live"`.
 *
 * Those rows are useful as layout filler while building, but showing them to
 * readers as results is misinformation. Every arena surface runs its rows
 * through `isRealMatch` so only genuine provider data or admin-created
 * fixtures are ever displayed.
 *
 * A match created in the admin panel has an auto id and no entry here, so
 * real editorial fixtures continue to work untouched.
 */
export const SEED_MATCH_IDS: readonly string[] = [
  "cl-1", "cl-2", "cl-3",
  "wc-1", "wc-2", "wc-3",
  "bal-1", "bal-2",
  "d1b-1", "d1b-2",
  "wrest-1", "wrest-2",
  "nav-1", "nav-2",
];

const SEED_IDS = new Set(SEED_MATCH_IDS);

/** True when the row is safe to present to readers as a real fixture. */
export function isRealMatch(m: unknown): m is { id: string } {
  if (!m || typeof m !== "object") return false;
  const id = (m as { id?: unknown }).id;
  if (typeof id !== "string" || !id) return false;
  if ((m as { isDemo?: unknown }).isDemo === true) return false;
  return !SEED_IDS.has(id);
}

/** Convenience wrapper: drops every demo row from a list. */
export function withoutDemoMatches<T>(list: T[] | undefined | null): T[] {
  return Array.isArray(list) ? list.filter((m) => isRealMatch(m)) : [];
}
