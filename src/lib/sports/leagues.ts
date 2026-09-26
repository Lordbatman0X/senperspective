/**
 * L'Arène league registry.
 *
 * Every provider id and URL in this file was verified live against the public
 * endpoints before being written down:
 *
 *   - TheSportsDB `api/v1/json/3` answers with `Access-Control-Allow-Origin: *`
 *     and needs no key. League ids below were confirmed with `lookupleague.php`.
 *   - OpenLigaDB answers with `Access-Control-Allow-Origin: *` and needs no key.
 *   - ESPN's `site.api.espn.com` returns 403, and `sports.core.api.espn.com`
 *     returns `$ref` stubs requiring N+1 follow-up calls, so neither is used.
 *   - TheSportsDB's free `livescore.php` returns an empty `events` array, so
 *     live state is derived from fixture dates instead. See scoreSource.ts.
 *
 * The free key `3` is a shared public test key with undocumented rate limits,
 * so the fetch layer stays deliberately conservative and degrades quietly.
 */

export type ArenaSport = "football" | "basketball" | "mma" | "wrestling";

export type ArenaSourceKind = "api" | "news";

export interface ArenaLeague {
  /** Stable slug used in the UI and in `/arena/:leagueId` routes. */
  id: string;
  sport: ArenaSport;
  label: { fr: string; en: string };
  flag?: string;
  /** Rendered above the board; also the SEO intro copy. */
  blurb: { fr: string; en: string };
  source: ArenaSourceKind;
  /**
   * TheSportsDB numeric league id. Only meaningful when `source === "api"`.
   * Verified via lookupleague.php.
   */
  tsdbLeagueId?: number;
  /** OpenLigaDB short name, e.g. "bl1". */
  openLigaShortcut?: string;
  /**
   * Google News RSS query for leagues no structured provider covers.
   * Used from Phase 2 onward; declared now so this file stays the single
   * source of truth for the whole feature.
   */
  newsQuery?: string;
  /** Ordering on the Arena board: lower renders first. */
  priority: number;
  /**
   * Whether a structured API can be expected to return rows. The Senegalese
   * competitions have no free coverage, so the UI must not imply otherwise.
   */
  hasStructuredCoverage: boolean;
}

export const ARENA_LEAGUES: ArenaLeague[] = [
  // ---------------------------------------------------------------------
  // Senegalese / West African competitions. No free API covers these, so
  // they arrive via Google News RSS (Phase 2) and are labelled as such.
  // ---------------------------------------------------------------------
  {
    id: "lutte",
    sport: "wrestling",
    label: { fr: "Lutte avec Frappe (Lamb)", en: "Senegalese Wrestling" },
    flag: "🇸🇳",
    blurb: {
      fr: "L'Arène nationale sénégalaise : les affiches de la saison, les résultats des assauts et les dispositifs de sécurité mobilisés pour chaque grande rencontre.",
      en: "The Senegalese national arena: the season's cards, bout-by-bout results, and the security arrangements around each major clash.",
    },
    source: "news",
    newsQuery: "lutte avec frappe Sénégal",
    priority: 1,
    hasStructuredCoverage: false,
  },
  {
    id: "navetane",
    sport: "football",
    label: { fr: "Championnats Navétanes", en: "Navetane Championship" },
    flag: "🇸🇳",
    blurb: {
      fr: "Le football de quartier qui nourrit le football professionnel : finales de zone, licences et état des stades de Dakar.",
      en: "The grassroots football that feeds the professional game: zone finals, licensing, and the state of Dakar's pitches.",
    },
    source: "news",
    newsQuery: "Navétanes Sénégal championnat",
    priority: 2,
    hasStructuredCoverage: false,
  },
  {
    id: "d1-basket",
    sport: "basketball",
    label: { fr: "D1 Basket Sénégal", en: "Senegal D1 Basketball" },
    flag: "🇸🇳",
    blurb: {
      fr: "La première division sénégalaise de basket-ball, qui fournit ses joueurs aux grands clubs européens.",
      en: "Senegal's top basketball division, which feeds its players to Europe's biggest clubs.",
    },
    source: "news",
    newsQuery: "D1 basket Sénégal résultat",
    priority: 3,
    hasStructuredCoverage: false,
  },
  {
    id: "bal",
    sport: "basketball",
    label: { fr: "Basketball Africa League", en: "Basketball Africa League" },
    flag: "🌍",
    blurb: {
      fr: "La BAL, vitrine continentale du basket africain et porte d'entrée des clubs africains vers la NBA.",
      en: "The BAL, the continental showcase for African basketball and the gateway from its clubs to the NBA.",
    },
    source: "news",
    newsQuery: "Basketball Africa League résultat",
    priority: 4,
    hasStructuredCoverage: false,
  },

  // ---------------------------------------------------------------------
  // International football.
  // ---------------------------------------------------------------------
  {
    id: "champions-league",
    sport: "football",
    label: { fr: "Champions League", en: "Champions League" },
    flag: "🇪🇺",
    blurb: {
      fr: "La plus grande compétition clubique d'Europe, et le fil de la représentation africaine que SenPerspective suit depuis Dakar.",
      en: "Europe's premier club competition, and the thread of African representation that SenPerspective follows from Dakar.",
    },
    source: "news",
    newsQuery: "Champions League résultat",
    priority: 5,
    hasStructuredCoverage: false,
  },
  {
    id: "ligue1",
    sport: "football",
    label: { fr: "Ligue 1 (France)", en: "Ligue 1 (France)" },
    flag: "🇫🇷",
    blurb: {
      fr: "Le championnat de France de football, suivi résultat par résultat.",
      en: "France's top football championship, followed result by result.",
    },
    source: "api",
    tsdbLeagueId: 4334, // verified: "French Ligue 1"
    priority: 6,
    hasStructuredCoverage: true,
  },
  {
    id: "premier-league",
    sport: "football",
    label: { fr: "Premier League (Angleterre)", en: "Premier League (England)" },
    flag: "🏴",
    blurb: {
      fr: "La Premier League anglaise, première ligue au monde en termes d'audience.",
      en: "The English Premier League, the world's most-watched football league.",
    },
    source: "api",
    tsdbLeagueId: 4328, // verified: "English Premier League"
    priority: 7,
    hasStructuredCoverage: true,
  },
  {
    id: "bundesliga",
    sport: "football",
    label: { fr: "Bundesliga (Allemagne)", en: "Bundesliga (Germany)" },
    flag: "🇩🇪",
    blurb: {
      fr: "La Bundesliga allemande, avec le détail des buts, des auteurs et des minutes.",
      en: "The German Bundesliga, down to the scorers and the minutes they scored.",
    },
    source: "api",
    tsdbLeagueId: 4331, // verified: "German Bundesliga"
    openLigaShortcut: "bl1",
    priority: 8,
    hasStructuredCoverage: true,
  },
  // ---------------------------------------------------------------------
  // Basketball.
  // ---------------------------------------------------------------------
  {
    id: "nba",
    sport: "basketball",
    label: { fr: "NBA", en: "NBA" },
    flag: "🇺🇸",
    blurb: {
      fr: "La NBA, avec une attention particulière portée aux Sénégalais et au continent africain.",
      en: "The NBA, with particular attention on Senegalese players and the African continent.",
    },
    source: "api",
    tsdbLeagueId: 4387, // verified: "NBA"
    priority: 9,
    hasStructuredCoverage: true,
  },
  {
    id: "wnba",
    sport: "basketball",
    label: { fr: "WNBA", en: "WNBA" },
    flag: "🇺🇸",
    blurb: {
      fr: "La ligue féminine américaine, où les joueuses internationales fixent de plus en plus le tempo.",
      en: "The American women's league, where international players increasingly set the pace.",
    },
    source: "api",
    tsdbLeagueId: 4516, // verified: "WNBA"
    priority: 10,
    hasStructuredCoverage: true,
  },

  // ---------------------------------------------------------------------
  // MMA. The league exists at TheSportsDB (4727) but returns no event rows on
  // the free tier, so it is sourced from news and badged accordingly.
  // ---------------------------------------------------------------------
  {
    id: "ufc",
    sport: "mma",
    label: { fr: "MMA / UFC", en: "MMA / UFC" },
    flag: "🥊",
    blurb: {
      fr: "UFC, PFL et le MMA ouest-africain : les résultats, les combats de titre et la carrière des combattants sénégalais.",
      en: "UFC, PFL and West African MMA: results, title fights, and the careers of Senegalese fighters.",
    },
    source: "news",
    tsdbLeagueId: 4727, // verified: "Mixed Martial Arts" — no free rows
    newsQuery: "UFC résultat",
    priority: 11,
    hasStructuredCoverage: false,
  },
];

const BY_ID = new Map(ARENA_LEAGUES.map((l) => [l.id, l]));

export function getLeague(id: string | undefined | null): ArenaLeague | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

/** Leagues a structured provider can actually fill, in board order. */
export function apiLeagues(): ArenaLeague[] {
  return ARENA_LEAGUES.filter((l) => l.source === "api" && l.tsdbLeagueId).sort(
    (a, b) => a.priority - b.priority
  );
}

/**
 * The sidebar subset, FOOTBALL FIRST.
 *
 * Football dominates the Senegalese audience, so the narrow homepage column
 * must not fill itself with NBA/WNBA rows just because they were fetched in the
 * same batch. This returns the major football leagues in a deliberate order —
 * the competitions a Senegalese reader is most likely to care about — followed
 * by the other structured sports, so the top of the sidebar is always football.
 *
 * Senegalese competitions (Ligue 1, Navétanes, lutte) are `source: "news"` and
 * so are not here: they are supplied by `editorialMatches`, which always
 * outranks provider rows and is merged in by `useArenaScores`.
 */
export function sidebarLeagues(): ArenaLeague[] {
  const FOOTBALL_FIRST = ["premier-league", "ligue1", "bundesliga"];
  const api = apiLeagues();
  const ranked = new Map(FOOTBALL_FIRST.map((id, i) => [id, i]));

  return [...api].sort((a, b) => {
    const ra = ranked.has(a.id) ? (ranked.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
    const rb = ranked.has(b.id) ? (ranked.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    // Within a tier, keep the registry's own priority order.
    return a.priority - b.priority;
  });
}

/** Leagues that must be sourced from Google News RSS, in board order. */
export function newsLeagues(): ArenaLeague[] {
  return ARENA_LEAGUES.filter((l) => l.source === "news" && !!l.newsQuery).sort(
    (a, b) => a.priority - b.priority
  );
}

/** The four SEO surfaces: /arena/football, /arena/basketball, /arena/mma, /arena/lutte */
export const ARENA_SPORTS: Array<{
  id: ArenaSport;
  label: { fr: string; en: string };
  blurb: { fr: string; en: string };
}> = [
  {
    id: "football",
    label: { fr: "Football", en: "Football" },
    blurb: {
      fr: "Résultats, scores en direct et analyses des compétitions de football suivies par SenPerspective, des Navétanes aux grandes ligues européennes.",
      en: "Results, live scores and analysis across the football competitions SenPerspective follows, from the Navetanes to Europe's biggest leagues.",
    },
  },
  {
    id: "basketball",
    label: { fr: "Basket", en: "Basketball" },
    blurb: {
      fr: "De la D1 Basket sénégalaise à la NBA, en passant par la BAL : l'actualité du basket africain et mondial.",
      en: "From Senegal's D1 to the NBA via the BAL: African and global basketball, covered.",
    },
  },
  {
    id: "mma",
    label: { fr: "MMA / Arts martiaux", en: "MMA / Fighting" },
    blurb: {
      fr: "UFC, PFL et le MMA ouest-africain : les résultats, les combats de titre et la carrière de nos combattants.",
      en: "UFC, PFL and West African MMA: results, title fights, and the careers of our own fighters.",
    },
  },
  {
    id: "wrestling",
    label: { fr: "Lutte", en: "Wrestling" },
    blurb: {
      fr: "La lutte avec frappe, sport signature du Sénégal : arènes, calendrier, résultats et les histoires derrière les assauts.",
      en: "Lutte with frappe, Senegal's signature sport: arenas, calendars, results, and the stories behind the bouts.",
    },
  },
];

export function getSport(id: string | undefined | null) {
  if (!id) return undefined;
  return ARENA_SPORTS.find((s) => s.id === id);
}

export function leaguesForSport(sport: ArenaSport | string): ArenaLeague[] {
  return ARENA_LEAGUES.filter((l) => l.sport === sport).sort((a, b) => a.priority - b.priority);
}
