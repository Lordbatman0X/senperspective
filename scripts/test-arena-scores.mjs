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

function deriveStatus(providerStatus, kickoff, now = Date.now()) {
  const raw = (providerStatus || "").trim();
  if (POSTPONED_RE.test(raw)) return "finished";
  if (FINISHED_RE.test(raw)) return "finished";
  if (LIVE_RE.test(raw)) return "live";
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

function toNumber(v) {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeSportsDBEvent(e, league) {
  const home = (e?.strHomeTeam || "").trim();
  const away = (e?.strAwayTeam || "").trim();
  if (!home || !away) return null;
  const kickoff = parseKickoff(e.dateEvent || e.strTimestamp || e.strTimeLocal);
  const status = deriveStatus(e.strStatus || e.strPostponed, kickoff);
  const externalId = String(e.idEvent || "").trim();
  return {
    id: `tsdb-${league.id}-${externalId}`,
    status,
    home,
    away,
    scoreA: toNumber(e.intHomeScore),
    scoreB: toNumber(e.intAwayScore),
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
  testSorting();
  console.log(`\n=== ${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"} ===`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
