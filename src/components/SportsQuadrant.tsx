import React from "react";
import { Link } from "react-router-dom";
import { Trophy, ArrowRight, Radio } from "lucide-react";
import { useStore } from "../store";
import { useArenaScores } from "../lib/sports/useArenaScores";
import { apiLeagues } from "../lib/sports/leagues";
import { withoutDemoMatches } from "../lib/sports/demoMatches";

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

  const when = (m: Row) => {
    if (m.clock) return m.clock;
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
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {rows.map((m) => {
            const sa = scoreOf(m, "A");
            const sb = scoreOf(m, "B");
            // An unplayed fixture has no score. Showing "0" would invent one.
            const played = sa !== null || sb !== null;
            const isLive = String(m.status) === "live";
            return (
              <li key={m.id} className="py-2.5 flex items-center gap-3">
                <span className="w-24 sm:w-32 shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                  {m.leagueLabel?.[language] || m.league}
                </span>

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

                <span className="w-20 sm:w-28 shrink-0 text-right text-[9px] font-mono uppercase tracking-wider">
                  {isLive ? (
                    <span className="text-red-600 dark:text-red-400 font-black">LIVE</span>
                  ) : when(m) ? (
                    <span className="text-zinc-500 dark:text-zinc-400">{when(m)}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
