import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Radio, ArrowRight, RefreshCw } from "lucide-react";
import type { Match } from "../../types";
import { useArenaScores } from "../../lib/sports/useArenaScores";
import {
  apiLeagues,
  getLeague,
  ARENA_SPORTS,
  type ArenaSport,
} from "../../lib/sports/leagues";
import { withoutDemoMatches } from "../../lib/sports/demoMatches";

interface ArenaGroupedScoresProps {
  editorialMatches: Match[];
  language: "fr" | "en";
}

/** Display order of the sport sections. Senegalese competitions lead. */
const SPORT_ORDER: ArenaSport[] = ["wrestling", "basketball", "football", "mma"];

/** Status order within a league: live first, then kickoff, then results. */
const STATUS_RANK: Record<string, number> = { live: 0, upcoming: 1, finished: 2 };

/**
 * The top of L'Arene: live scores and results, grouped by sport and then by
 * league.
 *
 * Why grouping rather than one flat list: the flat board ran an NBA game and a
 * Bundesliga fixture together in a single alphabetical pass, so a reader
 * scanning for Senegalese wrestling had no way to isolate it. Sport headings
 * plus league sub-headings make the board scannable and give the page a real
 * hierarchy without inventing editorial weight.
 *
 * Rows carry no tags or badges. Provenance still exists on the data and is
 * shown on the full /larene board, but on the category page the only thing a
 * reader needs is the scoreline.
 */
export function ArenaGroupedScores({ editorialMatches, language }: ArenaGroupedScoresProps) {
  const isFr = language === "fr";

  const editorial = useMemo(() => withoutDemoMatches(editorialMatches), [editorialMatches]);
  const { matches, loading, updatedAt, refresh } = useArenaScores(editorial, apiLeagues());

  const liveCount = matches.filter((m) => String(m.status) === "live").length;

  /**
   * Bucket rows into sport -> league. The sport is resolved from the league
   * registry, so a provider row inherits the same taxonomy as a curated one.
   * Anything unregistered falls back to the sport implied by its league slug.
   */
  const grouped = useMemo(() => {
    const bySport = new Map<string, Map<string, Match[]>>();

    for (const m of matches) {
      const leagueId = m.league || "";
      const league = getLeague(leagueId);
      const sport: string =
        league?.sport ||
        (leagueId.includes("wrestl") || leagueId.includes("lutte")
          ? "wrestling"
          : leagueId.includes("basket") || leagueId.includes("nba")
            ? "basketball"
            : leagueId.includes("ufc") || leagueId.includes("mma")
              ? "mma"
              : "football");

      if (!bySport.has(sport)) bySport.set(sport, new Map());
      const leagues = bySport.get(sport)!;
      const label = m.leagueLabel?.[language] || leagueId || sport;
      if (!leagues.has(label)) leagues.set(label, []);
      leagues.get(label)!.push(m);
    }

    const rank = (s: string) => {
      const i = SPORT_ORDER.indexOf(s as ArenaSport);
      return i === -1 ? SPORT_ORDER.length : i;
    };

    return [...bySport.entries()]
      .sort((a, b) => rank(a[0]) - rank(b[0]))
      .map(([sport, leagues]) => ({
        sport,
        title: ARENA_SPORTS.find((s) => s.id === sport)?.label[language] || sport,
        leagues: [...leagues.entries()]
          .map(([league, rows]) => ({
            league,
            rows: rows.sort((a, b) => {
              const r =
                (STATUS_RANK[String(a.status)] ?? 3) - (STATUS_RANK[String(b.status)] ?? 3);
              if (r !== 0) return r;
              // Within a status: soonest kickoff first, most recent result first.
              const at = a.date ? Date.parse(a.date) : 0;
              const bt = b.date ? Date.parse(b.date) : 0;
              return String(a.status) === "upcoming" ? at - bt : bt - at;
            }),
          }))
          .sort((a, b) => b.rows.length - a.rows.length),
      }))
      .filter((s) => s.leagues.length > 0);
  }, [matches, language]);

  const lastSync = updatedAt
    ? new Date(updatedAt).toLocaleTimeString(isFr ? "fr-FR" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const scoreOf = (m: Match, side: "A" | "B") => {
    const v = side === "A" ? m.teamA.score : m.teamB.score;
    return v === undefined || v === null ? null : v;
  };

  const when = (m: Match) => {
    if (m.clock) return m.clock;
    if (!m.date) return m.time || null;
    const d = new Date(m.date);
    if (Number.isNaN(d.getTime())) return m.time || null;
    return d.toLocaleString(isFr ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section aria-label={isFr ? "Scores et résultats" : "Scores and results"}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-zinc-900 dark:border-zinc-100 pb-3 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <Radio
            size={16}
            className={
              liveCount > 0
                ? "text-red-500 animate-pulse shrink-0"
                : "text-zinc-400 shrink-0"
            }
          />
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 truncate">
            {isFr ? "Scores & résultats" : "Scores & results"}
          </h2>
          {liveCount > 0 && (
            <span className="shrink-0 text-[9px] font-mono font-black uppercase tracking-widest bg-red-600 text-white px-1.5 py-0.5">
              {liveCount} {isFr ? "direct" : "live"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {isFr ? "Mis à jour" : "Updated"} {lastSync}
            </span>
          )}
          <button
            onClick={refresh}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shrink-0"
            aria-label={isFr ? "Actualiser" : "Refresh"}
            title={isFr ? "Actualiser" : "Refresh"}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && matches.length === 0 ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
          {isFr
            ? "Aucune rencontre disponible pour le moment."
            : "No fixtures available right now."}
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map((sport) => (
            <div key={sport.sport}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E85D42] mb-3">
                {sport.title}
              </h3>

              <div className="space-y-4">
                {sport.leagues.map((lg) => (
                  <div key={lg.league}>
                    <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 mb-1.5">
                      {lg.league}
                    </h4>

                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border-t border-zinc-100 dark:border-zinc-800/60">
                      {lg.rows.map((m) => {
                        const sa = scoreOf(m, "A");
                        const sb = scoreOf(m, "B");
                        // An unplayed fixture has no score. Showing "0" invents one.
                        const played = sa !== null || sb !== null;
                        const isLive = String(m.status) === "live";
                        return (
                          <li key={m.id} className="py-2.5 flex items-center justify-between gap-3">
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

                            <span className="w-24 sm:w-28 shrink-0 text-right text-[9px] font-mono uppercase tracking-wider">
                              {isLive ? (
                                <span className="text-red-600 dark:text-red-400 font-black">
                                  {m.clock || (isFr ? "Direct" : "Live")}
                                </span>
                              ) : when(m) ? (
                                <span className="text-zinc-500 dark:text-zinc-400">{when(m)}</span>
                              ) : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Link
            to="/larene"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:opacity-70 transition-opacity pt-2"
          >
            {isFr ? "Tout l'arène" : "The full arena"}
            <ArrowRight size={12} className="text-[#E85D42]" />
          </Link>
        </div>
      )}
    </section>
  );
}
