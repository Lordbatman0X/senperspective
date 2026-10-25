import { useCallback, useEffect, useRef, useState } from "react";
import type { Match } from "../../types";
import type { ArenaLeague } from "./leagues";
import { apiLeagues } from "./leagues";
import { cadenceFor, loadArenaScores, mergeWithEditorial, resetBreakers } from "./scoreSource";
import { getStale } from "./cache";

export interface UseArenaScoresResult {
  matches: Match[];
  /** First load in flight, with nothing to show yet. */
  loading: boolean;
  /** True when the displayed data came from cache rather than a fresh fetch. */
  fromCache: boolean;
  /** Every provider failed and there is nothing cached to fall back on. */
  unavailable: boolean;
  /** Epoch ms of the last successful (or cached) read. */
  updatedAt: number | null;
  /** Manual refresh; also clears the circuit breaker. */
  refresh: () => void;
}

/**
 * Polls structured providers and returns a board-ready match list.
 *
 * Behaviour that matters:
 *  - Poll interval adapts: fast while a match is live, lazy otherwise.
 *  - Polling pauses while the tab is hidden and resumes (with an immediate
 *    refresh) when it becomes visible again, so a backgrounded tab costs
 *    nothing but never serves stale data on return.
 *  - Editorial matches always outrank provider rows.
 *  - Failures are non-fatal: the last known board stays on screen.
 */
export function useArenaScores(
  editorialMatches: Match[] = [],
  leagues: ArenaLeague[] = apiLeagues()
): UseArenaScoresResult {
  const [providerMatches, setProviderMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  // Leagues are a module-level constant array; keep a stable key so the effect
  // does not re-run on every render.
  const leaguesKey = leagues.map((l) => l.id).join(",");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const cadenceRef = useRef(cadenceFor([]));
  // Manual refresh must bypass the TTL cache: otherwise the refresh button
  // re-serves the same cached rows and the board looks frozen.
  const forceRef = useRef(false);

  const run = useCallback(
    async (force: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const list = leagues;
        const useForce = force || forceRef.current;
        forceRef.current = false;
        // Cache TTL sits 15s BELOW the poll cadence (floor 30s). TTL == cadence
        // meant each poll landed on a just-still-fresh entry and re-served
        // cache forever, so the board looked frozen between visits.
        const ttlMs = Math.max(30_000, cadenceRef.current - 15_000);
        const result = await loadArenaScores(list, { force: useForce, ttlMs });
        setProviderMatches(result.matches);
        setFromCache(result.fromCache);
        setUnavailable(!result.ok);
        // Never bump "last read" when serving cache: showing Date.now() for a
        // cached board is what made stale rows look freshly updated.
        if (result.ok && !result.fromCache) {
          setUpdatedAt(Date.now());
        } else if (result.fromCache) {
          setUpdatedAt((prev) => prev ?? getStale<Match[]>("league:" + list[0]?.id)?.at ?? null);
        } else {
          setUpdatedAt(getStale<Match[]>("league:" + list[0]?.id)?.at ?? null);
        }
        cadenceRef.current = cadenceFor(result.matches);
      } catch {
        // A thrown provider must never take the board down.
        setUnavailable(true);
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leaguesKey]
  );

  const refresh = useCallback(() => {
    resetBreakers();
    forceRef.current = true;
    setNonce((n) => n + 1);
  }, []);

  // Initial load + adaptive polling.
  useEffect(() => {
    let cancelled = false;

    const schedule = (delay: number) => {
      if (cancelled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void run(false).then(() => schedule(cadenceRef.current));
      }, delay);
    };

    void run(false).then(() => schedule(cadenceRef.current));

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [run, nonce]);

  // Pause polling while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void run(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [run]);

  const merged = mergeWithEditorial(editorialMatches, providerMatches);

  return { matches: merged, loading, fromCache, unavailable, updatedAt, refresh };
}
