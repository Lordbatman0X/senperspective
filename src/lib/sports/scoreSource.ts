/**
 * Tier 1 — structured score provider.
 *
 * Two keyless, CORS-enabled public endpoints, both verified live:
 *   - TheSportsDB  https://www.thesportsdb.com/api/v1/json/3   (CORS: *)
 *   - OpenLigaDB   https://api.openligadb.de                    (CORS: *)
 *
 * Rejected during evaluation, with reasons, so nobody re-adds them:
 *   - ESPN `site.api.espn.com`  → 403 Forbidden.
 *   - ESPN `sports.core.api`    → items are `$ref` stubs; N+1 calls required.
 *   - Sofascore                 → 403 Forbidden.
 *   - TheSportsDB `livescore.php` → returns an empty `events` array on the
 *     free tier, so "is it live right now" is derived from the fixture date
 *     instead. That derivation is intentionally conservative: we only claim
 *     LIVE inside a window around kickoff, and we prefer the provider's own
 *     status whenever it gives us one.
 *
 * TheSportsDB key `3` is a shared public test key with undocumented rate
 * limits, so this module is deliberately conservative: one request per league
 * per TTL, a global circuit breaker, and total failure is silent (the board
 * keeps showing its last known state).
 */

import type { Match } from "../../types";
import type { ArenaLeague } from "./leagues";
import { getCached, setCached } from "./cache";
import { withoutDemoMatches } from "./demoMatches";

const TSDB = "https://www.thesportsdb.com/api/v1/json/3";
const OPENLIGA = "https://api.openligadb.de";
const TSDB_KEY = "3";

/** Poll cadence. Fast while something is live, lazy otherwise. */
export const TTL_LIVE_MS = 45_000;
export const TTL_IDLE_MS = 5 * 60_000;

/** A fixture is only treated as live inside this window around kickoff. */
const LIVE_WINDOW_MS = 3.5 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Circuit breaker: stop hammering a provider that is failing or throttling.
// ---------------------------------------------------------------------------

const breaker = new Map<string, { failures: number; openUntil: number }>();
const BREAKER_THRESHOLD = 4;
const BREAKER_COOLDOWN_MS = 5 * 60_000;

function breakerOpen(source: string): boolean {
  const s = breaker.get(source);
  if (!s) return false;
  if (s.openUntil > Date.now()) return true;
  if (s.openUntil && s.openUntil <= Date.now()) breaker.delete(source);
  return false;
}

function recordFailure(source: string) {
  const s = breaker.get(source) || { failures: 0, openUntil: 0 };
  s.failures += 1;
  if (s.failures >= BREAKER_THRESHOLD) {
    s.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    s.failures = 0;
  }
  breaker.set(source, s);
}

function recordSuccess(source: string) {
  breaker.delete(source);
}

/** Test hook + admin "retry now" affordance. */
export function resetBreakers() {
  breaker.clear();
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchJson(url: string, source: string, timeoutMs = 9000): Promise<any | null> {
  if (breakerOpen(source)) return null;
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
    return null;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) {
      recordFailure(source);
      return null;
    }
    const data = await res.json();
    recordSuccess(source);
    return data;
  } catch {
    recordFailure(source);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

const FINISHED_RE = /\b(ft|aet|pen|full\s*time|finished|final|terminé|terminée)\b/i;
const LIVE_RE = /\b(\d{1,2}['’]\b|in[- ]progress|half\s*time|ht|live|en cours|2e\s*mi[- ]temps|1re\s*mi[- ]temps)/i;
const POSTPONED_RE = /\b(postponed|postpon|suspend|reporte|annulé|annulee|cancelled)\b/i;
/** TheSportsDB's "not started" code. Without this it fell through to the
 *  kickoff-window heuristic, so a fixture hours away could show as live. */
const NOT_STARTED_RE = /^(ns|none|scheduled|not\s*started)$/i;

function deriveStatus(
  providerStatus: string | undefined,
  kickoff: Date | null,
  now = Date.now()
): Match["status"] {
  const raw = (providerStatus || "").trim();

  if (POSTPONED_RE.test(raw)) return "finished"; // rendered with the postponed flag
  if (FINISHED_RE.test(raw)) return "finished";

  // Trust an explicit live signal from the provider.
  if (LIVE_RE.test(raw)) return "live";

  // An explicit "not started" from the provider always wins over our
  // heuristic. This is the difference between showing a 19:00 kickoff as a
  // fixture at 09:00 and showing it as live.
  if (NOT_STARTED_RE.test(raw)) return "upcoming";

  if (kickoff) {
    const diff = now - kickoff.getTime();
    // Long past kickoff with no final signal: treat as done rather than
    // showing a match as live forever.
    if (diff > LIVE_WINDOW_MS) return "finished";
    // Only claim live in the window that begins just before kickoff. The
    // 15 minute pre-kickoff grace is what stops a fixture later today from
    // flipping to live the moment the page loads.
    if (diff > -15 * 60_000) return "live";
  }
  return "upcoming";
}

function parseKickoff(raw: any): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // "2026-09-20T19:30:00" carries no zone; OpenLigaDB's matchDateTimeUTC is
  // genuinely UTC, and theSportsDB returns a full ISO string, so `new Date`
  // is correct for both once the UTC variant is preferred by the caller.
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}

/**
 * Resolves a kickoff instant from a TheSportsDB event.
 *
 * Field order matters and was previously wrong. TheSportsDB returns:
 *   - `dateEvent`    "2026-09-20"          -> DATE ONLY, no time, no zone
 *   - `strTimestamp` "2026-10-03T23:00:00" -> full local kickoff, real time
 *   - `strTimeLocal` "19:00:00"           -> time only
 *
 * `dateEvent` used to be checked first, so every kickoff was parsed as
 * "2026-09-20T00:00:00Z" — UTC midnight. In Dakar (UTC+0) that rendered as
 * 00:00 instead of the actual evening kickoff, which is up to an 8 hour
 * error in the US/Europe leagues and mislabelled fixtures as live/finished.
 *
 * `strTimestamp` is the only field carrying both a date and a real kickoff
 * time, so it wins. `dateEvent` is used only as a last resort, and when it is
 * the fallback we anchor it to 00:00 local rather than UTC so a date-only
 * value can never shift a fixture across a day boundary.
 */
function parseSportsDBKickoff(e: any): Date | null {
  const withTime = parseKickoff(e?.strTimestamp);
  if (withTime) return withTime;

  const dateOnly = String(e?.dateEvent ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    // No clock time available: treat as a noon placeholder so the row sorts
    // and renders as a fixture, never as something happening right now.
    const d = new Date(`${dateOnly}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return parseKickoff(dateOnly) || null;
}

function toNumber(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function arenaFor(venue: string | undefined, city: string | undefined, country: string | undefined) {
  const parts = [venue, city].filter(Boolean) as string[];
  if (parts.length) return parts.join(", ");
  return country || undefined;
}

/** Stable neutral gradient so cards render consistently across reloads. */
const CARD_GRADIENT = "from-zinc-700 to-zinc-900";

// ---------------------------------------------------------------------------
// TheSportsDB normalizer
// ---------------------------------------------------------------------------

export function normalizeSportsDBEvent(e: any, league: ArenaLeague): Match | null {
  const home = (e?.strHomeTeam || "").trim();
  const away = (e?.strAwayTeam || "").trim();
  if (!home || !away) return null;

  const kickoff = parseSportsDBKickoff(e);
  const status = deriveStatus(e.strStatus || e.strPostponed, kickoff);

  const postponed = POSTPONED_RE.test(String(e.strPostponed || e.strStatus || ""));
  const externalId = String(e.idEvent || "").trim();

  // A score only exists once the match has actually been played. Rendering
  // "0 - 0" for a fixture two days out is the single most misleading thing
  // this board can do, so an unplayed row carries no score at all.
  const played = status !== "upcoming";
  const homeScore = played ? toNumber(e.intHomeScore) : undefined;
  const awayScore = played ? toNumber(e.intAwayScore) : undefined;

  return {
    id: `tsdb-${league.id}-${externalId || `${home}-${away}`.toLowerCase().replace(/\s+/g, "-")}`,
    league: league.id,
    leagueLabel: league.label,
    teamA: { name: home, score: homeScore, color: CARD_GRADIENT },
    teamB: { name: away, score: awayScore, color: CARD_GRADIENT },
    status,
    date: kickoff ? kickoff.toISOString() : undefined,
    time: e.strTimeLocal || e.strTime || undefined,
    arena: arenaFor(e.strVenue, e.strCity, e.strCountry),
    source: "thesportsdb",
    sourceUrl: externalId ? `https://www.thesportsdb.com/event/${externalId}` : undefined,
    externalId: externalId || undefined,
    period: e.intRound ? `Round ${e.intRound}` : undefined,
    provenance: "api",
    // A structured API row is authoritative, so it clears the bar directly.
    // An unplayed fixture has no scoreline to verify yet.
    verification: status === "upcoming" ? "unverified" : "verified",
    updatedAt: new Date().toISOString(),
    teamALogo: e.strHomeTeamBadge || undefined,
    teamBLogo: e.strAwayTeamBadge || undefined,
    postponed: postponed || undefined,
  };
}

// ---------------------------------------------------------------------------
// OpenLigaDB normalizer
// ---------------------------------------------------------------------------

export function normalizeOpenLigaMatch(m: any, league: ArenaLeague): Match | null {
  const home = (m?.team1?.teamName || "").trim();
  const away = (m?.team2?.teamName || "").trim();
  if (!home || !away) return null;

  const kickoff = parseKickoff(m.matchDateTimeUTC || m.matchDateTime);
  const status = deriveStatus(m.matchIsFinished ? "FT" : undefined, kickoff);

  const results = Array.isArray(m.matchResults) ? m.matchResults : [];
  const final =
    results.find((r: any) => r?.resultTypeKind === "After90Minutes") || results[results.length - 1];

  const goalCount = Array.isArray(m.goals) ? m.goals.length : 0;

  return {
    id: `openliga-${league.id}-${m.matchID}`,
    league: league.id,
    leagueLabel: league.label,
    teamA: { name: home, score: toNumber(final?.pointsTeam1), color: CARD_GRADIENT },
    teamB: { name: away, score: toNumber(final?.pointsTeam2), color: CARD_GRADIENT },
    status,
    date: kickoff ? kickoff.toISOString() : undefined,
    arena: arenaFor(m.location?.stadium, m.location?.city, undefined),
    source: "openligadb",
    sourceUrl: `https://www.openligadb.de/getmatchdetails/${league.openLigaShortcut}/${m.matchID}`,
    externalId: String(m.matchID),
    period: m.group?.groupName || undefined,
    clock: goalCount ? `${goalCount} but${goalCount > 1 ? "s" : ""}` : undefined,
    provenance: "api",
    verification: status === "upcoming" ? "unverified" : "verified",
    updatedAt: new Date().toISOString(),
    teamALogo: m.team1?.teamIconUrl || undefined,
    teamBLogo: m.team2?.teamIconUrl || undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function scopeFor(league: ArenaLeague) {
  return `league:${league.id}`;
}

async function loadLeague(league: ArenaLeague): Promise<Match[]> {
  // OpenLigaDB is the richer source for the Bundesliga (scorers, minutes), so
  // it is preferred there; TheSportsDB covers everything else.
  if (league.openLigaShortcut) {
    const rows = await fetchJson(
      `${OPENLIGA}/getmatchdata/${league.openLigaShortcut}`,
      "openligadb"
    );
    if (Array.isArray(rows) && rows.length) {
      const mapped = rows
        .map((m) => normalizeOpenLigaMatch(m, league))
        .filter((m): m is Match => !!m);
      if (mapped.length) return mapped;
    }
  }

  if (!league.tsdbLeagueId) return [];

  // eventsnextleague is a single cheap call; pastseason fills in recent
  // results. `eventslast.php` is intentionally avoided — it is heavier and
  // the news tier covers "what happened" better than a bulk history dump.
  const [next, past] = await Promise.all([
    fetchJson(`${TSDB}/eventsnextleague.php?id=${league.tsdbLeagueId}&key=${TSDB_KEY}`, "thesportsdb"),
    fetchJson(`${TSDB}/eventspastleague.php?id=${league.tsdbLeagueId}&key=${TSDB_KEY}`, "thesportsdb"),
  ]);

  const out: Match[] = [];
  const seen = new Set<string>();

  for (const bucket of [next, past]) {
    const events = Array.isArray(bucket?.events) ? bucket.events : [];
    for (const e of events) {
      const m = normalizeSportsDBEvent(e, league);
      if (!m) continue;
      const key = m.externalId || m.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
  }
  return out;
}

const STATUS_RANK: Record<string, number> = { live: 0, upcoming: 1, finished: 2 };

function sortForBoard(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const ra = STATUS_RANK[String(a.status)] ?? 3;
    const rb = STATUS_RANK[String(b.status)] ?? 3;
    if (ra !== rb) return ra - rb;
    // Within a status, soonest kickoff first for upcoming/live, newest for finished.
    const ta = a.date ? Date.parse(a.date) : Number.MAX_SAFE_INTEGER;
    const tb = b.date ? Date.parse(b.date) : Number.MAX_SAFE_INTEGER;
    return String(b.status) === "finished" ? tb - ta : ta - tb;
  });
}

export interface ArenaScoresResult {
  matches: Match[];
  /** True when at least one provider responded (fresh or cached). */
  ok: boolean;
  /** True when this call served from cache rather than the network. */
  fromCache: boolean;
  /** Populated when every provider failed; the board shows last-known data. */
  error?: string;
}

/**
 * Loads scores for the given leagues.
 *
 * Cached rows short-circuit the network. A provider outage therefore degrades
 * to "stale but rendered" rather than an empty board, which is the behaviour we
 * want for a live scores surface: never blank it out.
 */
export async function loadArenaScores(
  leagues: ArenaLeague[],
  opts?: { force?: boolean; ttlMs?: number }
): Promise<ArenaScoresResult> {
  if (!leagues.length) return { matches: [], ok: true, fromCache: false };

  const ttl = opts?.ttlMs ?? TTL_IDLE_MS;
  const out: Match[] = [];
  let anyOk = false;
  let fromCache = false;
  let anyNetworkAttempt = false;

  for (const league of leagues) {
    const scope = scopeFor(league);

    if (!opts?.force) {
      const cached = getCached<Match[]>(scope, ttl);
      if (cached) {
        out.push(...cached);
        anyOk = true;
        fromCache = true;
        continue;
      }
    }

    anyNetworkAttempt = true;
    // eslint-disable-next-line no-await-in-loop -- sequential on purpose: it
    // keeps us under the shared key's rate limit and lets the breaker trip
    // before the remaining leagues are attempted.
    const rows = await loadLeague(league);
    if (rows.length) {
      setCached(scope, rows);
      out.push(...rows);
      anyOk = true;
    }
  }

  // Last resort: render stale rows rather than nothing.
  if (!anyOk && anyNetworkAttempt) {
    for (const league of leagues) {
      try {
        const { getStale } = await import("./cache");
        const stale = getStale<Match[]>(scopeFor(league));
        if (stale?.value?.length) {
          out.push(...stale.value);
          anyOk = true;
          fromCache = true;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return {
    matches: sortForBoard(out),
    ok: anyOk,
    fromCache,
    error: anyOk ? undefined : "live_score_unavailable",
  };
}

/** Poll cadence for the current board contents. */
export function cadenceFor(matches: Match[]): number {
  return matches.some((m) => String(m.status) === "live") ? TTL_LIVE_MS : TTL_IDLE_MS;
}

/**
 * Merges provider rows with editor/seeded matches.
 *
 * Editorial rows always win: a score typed in the admin panel is never
 * silently replaced by a provider row. Provider rows only fill the gaps.
 */
export function mergeWithEditorial(editorial: Match[], provider: Match[]): Match[] {
  const byKey = new Map<string, Match>();
  const keyOf = (m: Match) => m.externalId || `${m.league}:${m.id}`;

  // Demo fixtures are dropped here, at the single merge point shared by every
  // live surface (the board, the sidebar and the category page). Filtering
  // once means no consumer can forget to do it and leak a fabricated score.
  provider.forEach((m) => byKey.set(keyOf(m), m));

  const merged = withoutDemoMatches(editorial).map((e) => {
    if (e.provenance && e.provenance !== "manual") return e;
    const incoming = byKey.get(keyOf(e));
    if (!incoming) return e;
    byKey.delete(keyOf(e));
    // Keep the editorial row, enrich it with provider metadata.
    return {
      ...e,
      source: e.source ?? incoming.source,
      sourceUrl: e.sourceUrl ?? incoming.sourceUrl,
      externalId: e.externalId ?? incoming.externalId,
      updatedAt: incoming.updatedAt,
    } satisfies Match;
  });

  return sortForBoard([...merged, ...byKey.values()]);
}

