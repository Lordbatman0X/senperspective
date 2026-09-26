import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Trophy, ArrowRight, Radio, ChevronRight } from "lucide-react";
import { useStore } from "../store";
import { useArenaScores } from "../lib/sports/useArenaScores";
import { apiLeagues } from "../lib/sports/leagues";
import { withoutDemoMatches } from "../lib/sports/demoMatches";
import { matchAnchor } from "../lib/navigation";

/**
 * L'Arene - a single, simple live scoreboard for the sports category.
 *
 * This replaces a four-quadrant layout ("A la une", "Prochain", "Resultat",
 * "Article") whose zones were each populated from `matches`. That design had
 * two problems:
 *
 *   1. It read straight from the store, which is seeded with 14 INVENTED
 *      fixtures - "Real Madrid 2 - 3 PSG", a Navetane match pinned at "88'"
 *      with a 1-1 score. Those were rendered to readers as real results.
 *   2. Each zone re-sorted and re-labelled the same small set of matches, so
 *      the same fixture could appear twice, with decorative eyebrow labels
 *      ("A LA UNE / EVENEMENT MAJEUR") implying editorial weight that was
 *      never real.
 *
 * There is now one board, fed by the verified providers (TheSportsDB,
 * OpenLigaDB), with demo rows filtered out at the merge point. Rows are plain:
 * league, teams, score, time. No commentary, no surrounding description.
 */
export function SportsQuadrant() {
  const { language, matches = [], siteSettings } = useStore();
  const { hash } = useLocation();

  const accentColor = siteSettings?.accentColor || "#E85D42";

  // Admin-created fixtures still outrank provider rows; demo seeds never do.
  const editorial = withoutDemoMatches(matches);
  const { matches: board, loading } = useArenaScores(editorial, apiLeagues());

  const liveCount = board.filter((m) => String(m.status) === "live").length;
  const rows = board.slice(0, 10);

  type Row = (typeof board)[number];

  const scoreOf = (m: Row, side: "A" | "B") => {
    const v = side === "A" ? m.teamA.score : m.teamB.score;
    return v === undefined || v === null ? null : v;
  };

  // Only a genuine in-play minute ("67'") may occupy this slot. Providers put
  // arbitrary text in `clock` (OpenLigaDB was carrying a goal tally), which
  // rendered as "4 buts" where a kickoff time belongs. Anything that is not a
  // match clock is ignored and the real date is shown instead.
  const isMatchClock = (v?: string) =>
    /^\d{1,3}(\+\d{1,2})?'?$|^\d{1,3}\+\d{0,2}$|^(mt|ht|mi-?temps?|halftime)$/i.test(
      (v || "").trim()
    );

  const when = (m: Row) => {
    if (isMatchClock(m.clock)) return m.clock!;
    if (!m.date) return m.time || null;
    const d = new Date(m.date);
    if (Number.isNaN(d.getTime())) return m.time || null;
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Grouped by sport, then by league, so a reader reaches their competition
  // without scanning a flat list. Group order follows the board's own
  // live-first ordering, so whichever sport is live is the one on top.
  const groups = useMemo(() => {
    const bySport = new Map<string, Map<string, Row[]>>();
    rows.forEach((m) => {
      const sport = m.sport || "other";
      if (!bySport.has(sport)) bySport.set(sport, new Map());
      const leagues = bySport.get(sport)!;
      const name = m.leagueLabel?.[language] || m.league || sport;
      if (!leagues.has(name)) leagues.set(name, []);
      leagues.get(name)!.push(m);
    });
    return Array.from(bySport.entries()).map(([sport, leagues]) => ({
      sport,
      leagues: Array.from(leagues.entries()).map(([name, rows]) => ({
        name,
        rows,
        live: rows.filter((m) => String(m.status) === "live").length,
      })),
    }));
  }, [rows, language]);

  const sportName = (id: string) =>
    (
      {
        football: "Football",
        basketball: language === "fr" ? "Basket" : "Basketball",
        mma: "MMA",
        wrestling: language === "fr" ? "Lutte" : "Wrestling",
        other: language === "fr" ? "Autres" : "Other",
      } as Record<string, string>
    )[id] || id;
  return (
    <div
      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-t-4 p-5 sm:p-6 font-sans my-6"
      style={{ borderTopColor: accentColor }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
        <Link
          to="/larene"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:opacity-70 transition-opacity"
        >
          <Trophy size={14} style={{ color: accentColor }} />
          <span>{language === "fr" ? "L'ARENE" : "THE ARENA"}</span>
          <ArrowRight size={13} style={{ color: accentColor }} />
        </Link>

        {liveCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-red-600 dark:text-red-400 tracking-wider">
            <Radio size={11} className="animate-pulse" />
            {liveCount} {language === "fr" ? "EN DIRECT" : "LIVE"}
          </span>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs italic text-zinc-500 dark:text-zinc-400 py-3">
          {language === "fr"
            ? "Aucune rencontre disponible pour le moment."
            : "No fixtures available right now."}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.sport}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                {sportName(g.sport)}
                {g.leagues.some((l) => l.live > 0) && (
                  <span className="text-[8px] font-black text-red-600 dark:text-red-400">LIVE</span>
                )}
              </h3>
              <div className="space-y-2">
                {g.leagues.map((l) => (
                  <div key={l.name}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                      {l.name}
                      {l.live > 0 && (
                        <span className="text-[8px] font-black text-red-600 dark:text-red-400">
                          {l.live}
                        </span>
                      )}
                    </p>
                    <ul className="space-y-1.5">
                      {l.rows.map((m) => {
                        const sa = scoreOf(m, "A");
                        const sb = scoreOf(m, "B");
                        // An unplayed fixture has no score. Showing "0" would invent one.
                        const played = sa !== null || sb !== null;
                        const isLive = String(m.status) === "live";
                        const whenText = when(m);
                        // Highlight the row the reader arrived from, so the jump
                        // back from the category page is reversible.
                        const isTarget = hash === `#${matchAnchor(m.id)}`;
                        return (
                          <li key={m.id}>
                            <Link
                              to={`/category/sports#${matchAnchor(m.id)}`}
                              aria-label={
                                language === "fr"
                                  ? `${m.teamA.name} contre ${m.teamB.name}`
                                  : `${m.teamA.name} versus ${m.teamB.name}`
                              }
                              className={[
                                "group flex items-center gap-3 rounded-lg border px-2.5 py-2 transition-all duration-200 ease-out",
                                "hover:-translate-y-px hover:shadow-md focus-visible:-translate-y-px focus-visible:shadow-md",
                                "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                                isTarget
                                  ? "border-transparent ring-2"
                                  : "border-zinc-200 dark:border-zinc-800",
                                "bg-white dark:bg-zinc-900/50",
                                isLive ? "ring-1 ring-red-500/30" : "",
                              ].join(" ")}
                              style={
                                isTarget
                                  ? ({ ["--tw-ring-color" as string]: accentColor } as React.CSSProperties)
                                  : undefined
                              }
                            >
                              <span className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                  {m.teamA.name}
                                </span>
                                <span className="shrink-0 font-mono font-black text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {played ? `${sa ?? 0} - ${sb ?? 0}` : "vs"}
                                </span>
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate text-right">
                                  {m.teamB.name}
                                </span>
                              </span>
                              <span className="w-20 sm:w-28 shrink-0 flex items-center justify-end gap-1 text-[9px] font-mono uppercase tracking-wider">
                                {isLive ? (
                                  <span className="text-red-600 dark:text-red-400 font-black flex items-center gap-1">
                                    <Radio size={9} className="animate-pulse" />
                                    LIVE
                                  </span>
                                ) : whenText ? (
                                  <span className="text-zinc-500 dark:text-zinc-400">{whenText}</span>
                                ) : null}
                                <ChevronRight
                                  size={11}
                                  className="text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shrink-0"
                                />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
