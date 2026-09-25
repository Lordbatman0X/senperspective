/**
 * Phase 1 verification: exercises the real normalizer logic against live
 * provider payloads.  Run:  node scripts/test-arena-scores.mjs
 *
 * Duplicates the parsing logic rather than importing the TS module so it runs
 * under plain node with no bundler.
 */

const TSDB = "https://www.thesportsdb.com/api/v1/json/3";
const OPENLIGA = "https://api.openligadb.de";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36" };

const FINISHED_RE = /\b(ft|aet|pen|full\s*time|finished|final|terminé|terminée)\b/i;
const LIVE_RE = /\b(\d{1,2}['’]\b|in[- ]progress|half\s*time|ht|live|en cours|2e\s*mi[- ]temps|1re\s*mi[- ]temps)/i;
const POSTPONED_RE = /\b(postponed|postpon|suspend|reporte|annulé|annulee|cancelled)\b/i;
const LIVE_WINDOW_MS = 3.5 * 60 * 60 * 1000;

const NOT_STARTED_RE = /^(ns|none|scheduled|not\s*started)$/i;

function deriveStatus(providerStatus, kickoff, now = Date.now()) {
  const raw = (providerStatus || "").trim();
  if (POSTPONED_RE.test(raw)) return "finished";
  if (FINISHED_RE.test(raw)) return "finished";
  if (LIVE_RE.test(raw)) return "live";
  if (NOT_STARTED_RE.test(raw)) return "upcoming";
  if (kickoff) {
    const diff = now - kickoff.getTime();
    if (diff > LIVE_WINDOW_MS) return "finished";
    if (diff > -15 * 60_000) return "live";
  }
  return "upcoming";
}

function parseKickoff(raw) {
  if (!raw) return null;
  const d = new Date(String(raw).trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** strTimestamp (real kickoff time) must win over dateEvent (date only). */
function parseSportsDBKickoff(e) {
  const withTime = parseKickoff(e?.strTimestamp);
  if (withTime) return withTime;
  const dateOnly = String(e?.dateEvent ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const d = new Date(`${dateOnly}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return parseKickoff(dateOnly);
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeSportsDBEvent(e, league) {
  const home = (e?.strHomeTeam || "").trim();
  const away = (e?.strAwayTeam || "").trim();
  if (!home || !away) return null;
  const kickoff = parseSportsDBKickoff(e);
  const status = deriveStatus(e.strStatus || e.strPostponed, kickoff);
  const externalId = String(e.idEvent || "").trim();
  // An unplayed fixture must never display a 0-0 scoreline.
  const played = status !== "upcoming";
  return {
    id: `tsdb-${league.id}-${externalId}`,
    status,
    home,
    away,
    scoreA: played ? toNumber(e.intHomeScore) : undefined,
    scoreB: played ? toNumber(e.intAwayScore) : undefined,
    date: kickoff ? kickoff.toISOString() : undefined,
    verification: status === "upcoming" ? "unverified" : "verified",
  };
}

function normalizeOpenLigaMatch(m, league) {
  const home = (m?.team1?.teamName || "").trim();
  const away = (m?.team2?.teamName || "").trim();
  if (!home || !away) return null;
  const kickoff = parseKickoff(m.matchDateTimeUTC || m.matchDateTime);
  const status = deriveStatus(m.matchIsFinished ? "FT" : undefined, kickoff);
  const results = Array.isArray(m.matchResults) ? m.matchResults : [];
  const final =
    results.find((r) => r?.resultTypeKind === "After90Minutes") || results[results.length - 1];
  return {
    id: `openliga-${league.id}-${m.matchID}`,
    status,
    home,
    away,
    scoreA: toNumber(final?.pointsTeam1),
    scoreB: toNumber(final?.pointsTeam2),
    date: kickoff ? kickoff.toISOString() : undefined,
    verification: status === "upcoming" ? "unverified" : "verified",
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

let failures = 0;
function check(label, cond, detail = "") {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label} ${detail}`);
  }
}

async function testOpenLiga() {
  console.log("\nOpenLigaDB bl1 (Bundesliga)");
  const raw = await getJson(`${OPENLIGA}/getmatchdata/bl1`);
  check("returns an array", Array.isArray(raw), `got ${typeof raw}`);
  const rows = raw
    .map((m) => normalizeOpenLigaMatch(m, { id: "bundesliga", openLigaShortcut: "bl1" }))
    .filter(Boolean);
  check("normalizes every row", rows.length === raw.length, `${rows.length}/${raw.length}`);
  check("at least one row carries a score", rows.some((r) => r.scoreA !== undefined));
  check("all statuses valid", rows.every((r) => ["live", "upcoming", "finished"].includes(r.status)));
  const first = rows[0];
  if (first) {
    console.log(`  sample: ${first.home} ${first.scoreA ?? "-"} - ${first.scoreB ?? "-"} ${first.away} [${first.status}]`);
  }
}

async function testSportsDB(leagueId) {
  console.log(`\nTheSportsDB league ${leagueId}`);
  const [next, past] = await Promise.all([
    getJson(`${TSDB}/eventsnextleague.php?id=${leagueId}&key=3`),
    getJson(`${TSDB}/eventspastleague.php?id=${leagueId}&key=3`),
  ]);
  const events = [...(next?.events || []), ...(past?.events || [])];
  console.log(`  raw events: ${events.length}`);
  const rows = events.map((e) => normalizeSportsDBEvent(e, { id: leagueId })).filter(Boolean);
  check("produces normalized rows", rows.length > 0, `got ${rows.length}`);
  check("all statuses valid", rows.every((r) => ["live", "upcoming", "finished"].includes(r.status)));
  check("no row lacks an id", rows.every((r) => !!r.id));
  check("no row lacks a kickoff date", rows.every((r) => !!r.date));
  const withScore = rows.filter((r) => r.scoreA !== undefined);
  console.log(`  rows with a scoreline: ${withScore.length}/${rows.length}`);
  const first = withScore[0] || rows[0];
  if (first) {
    console.log(`  sample: ${first.home} ${first.scoreA ?? "-"} - ${first.scoreB ?? "-"} ${first.away} [${first.status}]`);
  }
}

async function testMmaCoverage() {
  console.log("\nMMA coverage (documented gap: expect zero free rows)");
  const j = await getJson(`${TSDB}/eventsnextleague.php?id=4727&key=3`);
  const n = Array.isArray(j?.events) ? j.events.length : 0;
  console.log(`  events returned: ${n}`);
  check("confirmed absent, so the UI badges MMA as news-sourced", n === 0, `got ${n}`);
}

/**
 * Regression tests for the accuracy bugs found in production review.
 * These are pure-function checks, so they are deterministic and offline.
 */
function testAccuracyRegressions() {
  console.log("\nAccuracy regressions");

  // BUG 1: `dateEvent` is date-only ("2026-09-20") but was preferred over
  // `strTimestamp` ("2026-09-20T19:30:00"), so kickoffs parsed as UTC midnight
  // and rendered up to 8 hours early.
  const e1 = { strTimestamp: "2026-09-20T19:30:00", dateEvent: "2026-09-20" };
  const k1 = parseSportsDBKickoff(e1);
  const hhmm = k1 ? k1.toISOString().slice(11, 16) : "";
  check(
    "kickoff uses the real clock time, not midnight",
    hhmm === "19:30",
    `got ${hhmm || "null"} from ${k1?.toISOString()}`
  );

  // Date-only payload with no timestamp must not resolve to midnight either.
  const k2 = parseSportsDBKickoff({ dateEvent: "2026-09-20" });
  check(
    "date-only fallback avoids 00:00 (would misclassify as live)",
    k2 ? k2.getHours() !== 0 : false,
    `got ${k2?.toISOString()}`
  );

  // BUG 2: TheSportsDB returns "NS" for a not-yet-kicked-off fixture. It was
  // not recognised, so it fell through to the kickoff-window heuristic.
  const now = Date.parse("2026-09-20T09:00:00Z");
  check(
    'status "NS" is upcoming even 1h before kickoff',
    deriveStatus("NS", new Date("2026-09-20T10:00:00Z"), now) === "upcoming"
  );
  check(
    'status "NS" is upcoming even just before kickoff',
    deriveStatus("NS", new Date("2026-09-20T09:05:00Z"), now) === "upcoming"
  );
  check('status "FT" stays finished', deriveStatus("FT", null, now) === "finished");

  // BUG 3: an unplayed fixture rendered "0 - 0", implying a result that
  // does not exist.
  const future = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 19);
  const upcoming = normalizeSportsDBEvent(
    { strHomeTeam: "A", strAwayTeam: "B", strStatus: "NS", strTimestamp: future, intHomeScore: null, intAwayScore: null },
    { id: "x" }
  );
  check(
    "upcoming fixture shows no score",
    upcoming?.scoreA === undefined && upcoming?.scoreB === undefined,
    `got ${upcoming?.scoreA}/${upcoming?.scoreB}`
  );

  // A played match must still carry its real scoreline.
  const playedRow = normalizeSportsDBEvent(
    { strHomeTeam: "A", strAwayTeam: "B", strStatus: "FT", strTimestamp: "2026-09-20T19:30:00", intHomeScore: "2", intAwayScore: "1" },
    { id: "x" }
  );
  check(
    "finished match keeps its scoreline",
    playedRow?.scoreA === 2 && playedRow?.scoreB === 1,
    `got ${playedRow?.scoreA}/${playedRow?.scoreB}`
  );
}

function testSorting() {
  console.log("\nBoard ordering");
  const RANK = { live: 0, upcoming: 1, finished: 2 };
  const sortForBoard = (ms) =>
    [...ms].sort((a, b) => {
      const ra = RANK[a.status] ?? 3;
      const rb = RANK[b.status] ?? 3;
      if (ra !== rb) return ra - rb;
      const ta = a.date ? Date.parse(a.date) : Number.MAX_SAFE_INTEGER;
      const tb = b.date ? Date.parse(b.date) : Number.MAX_SAFE_INTEGER;
      return b.status === "finished" ? tb - ta : ta - tb;
    });
  const sorted = sortForBoard([
    { id: "f", status: "finished", date: "2026-09-20T10:00:00Z" },
    { id: "l", status: "live", date: "2026-09-20T10:00:00Z" },
    { id: "u", status: "upcoming", date: "2026-09-30T10:00:00Z" },
  ]);
  const order = sorted.map((s) => s.id).join(",");
  check(`order is live,upcoming,finished (got ${order})`, order === "l,u,f");
}

(async () => {
  console.log("=== Arena score layer verification ===");
  await testOpenLiga();
  await testSportsDB(4328);
  await testSportsDB(4387);
  await testMmaCoverage();
  testAccuracyRegressions();
  testSorting();
  console.log(`\n=== ${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"} ===`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
