import React, { useMemo, useState } from "react";
import { Radio, RefreshCw, WifiOff, AlertTriangle } from "lucide-react";
import type { Match } from "../../types";
import { ArenaMatchCard } from "./ArenaMatchCard";
import { useArenaScores } from "../../lib/sports/useArenaScores";
import { apiLeagues, type ArenaLeague } from "../../lib/sports/leagues";

interface ArenaLiveBoardProps {
  /** Editor/seeded matches. These always outrank provider rows. */
  editorialMatches: Match[];
  language: "fr" | "en";
  /** Narrow the board to specific leagues (used by the per-sport pages). */
  leagues?: ArenaLeague[];
  title?: string;
  /** Max cards rendered; the board is a summary, not a full archive. */
  limit?: number;
}

type Filter = "all" | "live" | "upcoming" | "finished";

/**
 * Live scores board for L'Arène.
 *
 * Deliberate choices:
 *  - Provider outages never blank the board. The hook keeps the last known
 *    rows on screen and this component only adds a notice.
 *  - Refresh is manual as well as automatic, so a reader who suspects a stale
 *    scoreline can force a re-read (which also resets the circuit breaker).
 */
export function ArenaLiveBoard({
  editorialMatches,
  language,
  leagues = apiLeagues(),
  title,
  limit = 24,
}: ArenaLiveBoardProps) {
  const isFr = language === "fr";
  const [filter, setFilter] = useState<Filter>("all");

  const { matches, loading, unavailable, updatedAt, refresh } = useArenaScores(
    editorialMatches,
    leagues
  );

  const counts = useMemo(() => {
    const c = { all: matches.length, live: 0, upcoming: 0, finished: 0 };
    matches.forEach((m) => {
      const s = String(m.status);
      if (s === "live") c.live += 1;
      else if (s === "upcoming") c.upcoming += 1;
      else if (s === "finished") c.finished += 1;
    });
    return c;
  }, [matches]);

  const visible = useMemo(() => {
    const rows = filter === "all" ? matches : matches.filter((m) => String(m.status) === filter);
    return rows.slice(0, limit);
  }, [matches, filter, limit]);

  const hasLive = counts.live > 0;
  const lastSync = updatedAt
    ? new Date(updatedAt).toLocaleTimeString(isFr ? "fr-FR" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const filters: Array<{ id: Filter; label: string; n: number }> = [
    { id: "all", label: isFr ? "Tous" : "All", n: counts.all },
    { id: "live", label: isFr ? "Direct" : "Live", n: counts.live },
    { id: "upcoming", label: isFr ? "À venir" : "Upcoming", n: counts.upcoming },
    { id: "finished", label: isFr ? "Résultats" : "Results", n: counts.finished },
  ];

  return (
    <section className="w-full" aria-label={title || (isFr ? "Scores en direct" : "Live scores")}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Radio
            size={18}
            className={hasLive ? "text-red-500 animate-pulse shrink-0" : "text-zinc-400 shrink-0"}
          />
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 truncate">
            {title || (isFr ? "Scores en direct" : "Live scores")}
          </h2>
          {hasLive && (
            <span className="shrink-0 text-[9px] font-mono font-black uppercase tracking-widest bg-red-600 text-white px-1.5 py-0.5">
              {counts.live} {isFr ? "direct" : "live"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lastSync && (
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
              {isFr ? "MAJ" : "UPD"} {lastSync}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-zinc-600 dark:text-zinc-300 hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
            {isFr ? "Actualiser" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`text-[9.5px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 border transition-colors ${
              filter === f.id
                ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-60 tabular-nums">{f.n}</span>
          </button>
        ))}
      </div>

      {unavailable && (
        <div className="mb-4 flex items-start gap-2 border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-[10px] text-amber-800 dark:text-amber-300">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>
            {isFr
              ? "Les scores en direct sont momentanément indisponibles. Les dernières informations connues restent affichées."
              : "Live scores are temporarily unavailable. The last known information is still shown."}
          </span>
        </div>
      )}

      {loading && visible.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[132px] border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center border border-dashed border-zinc-300 dark:border-zinc-700">
          <WifiOff size={20} className="text-zinc-400" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            {isFr
              ? "Aucune rencontre ne correspond à ce filtre pour le moment."
              : "No matches match this filter right now."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((m) => (
            <ArenaMatchCard key={m.id} match={m} language={language} />
          ))}
        </div>
      )}

      <p className="mt-4 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 leading-relaxed">
        {isFr
          ? "Scores fournis par TheSportsDB et OpenLigaDB. Les compétitions dépourvues de source structurée (lutte, Navétanes, D1, BAL, MMA) sont suivies via la presse et signalées comme telles."
          : "Scores provided by TheSportsDB and OpenLigaDB. Competitions without a structured feed (lutte, Navetanes, D1, BAL, MMA) are tracked via the press and labelled accordingly."}
      </p>
    </section>
  );
}
