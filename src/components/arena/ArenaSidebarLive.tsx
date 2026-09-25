import React from "react";
import { Link } from "react-router-dom";
import { Radio, Trophy } from "lucide-react";
import type { Match } from "../../types";
import { useArenaScores } from "../../lib/sports/useArenaScores";
import { apiLeagues } from "../../lib/sports/leagues";

interface ArenaSidebarLiveProps {
  /** Editor/seeded matches (the Senegalese competitions) always outrank rows. */
  editorialMatches: Match[];
  language: "fr" | "en";
  accentColor?: string;
  /** Max rows rendered. The sidebar is a summary, not the full board. */
  limit?: number;
}

/**
 * Compact live-score widget for the homepage sidebar.
 *
 * Replaces the previous static L'Arène box, which rendered hardcoded fixtures
 * ("Modou Lô vs Siteu", "Jaraaf vs Teungueth") that were invented and went
 * stale — it could never show a real result. This reads the same verified
 * providers as the L'Arène board, so the sidebar and the arena page can never
 * disagree.
 *
 * Deliberately badge-free: in a narrow column a "Source officielle" / "Presse"
 * chip on every row is visual noise that pushes the score out of view.
 * Provenance is still carried on the data and shown on the full board.
 */
export function ArenaSidebarLive({
  editorialMatches,
  language,
  accentColor = "#E85D42",
  limit = 6,
}: ArenaSidebarLiveProps) {
  const isFr = language === "fr";

  const { matches, loading } = useArenaScores(editorialMatches, apiLeagues());

  // The hook already sorts live -> upcoming -> finished; this only caps it.
  const rows = matches.slice(0, limit);
  const liveCount = matches.filter((m) => String(m.status) === "live").length;

  const scoreOf = (m: Match, side: "A" | "B") => {
    const v = side === "A" ? m.teamA.score : m.teamB.score;
    return v === undefined || v === null ? null : v;
  };

  const kickoff = (m: Match) => {
    if (!m.date) return null;
    const d = new Date(m.date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(isFr ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="glass p-5 bg-white/95 dark:bg-zinc-900/80 border-t-4 text-left"
      style={{ borderTopColor: accentColor }}
    >
      <div className="flex items-center justify-between mb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
        <div className="flex items-center gap-1.5">
          <Radio
            size={14}
            className={liveCount > 0 ? "animate-pulse" : ""}
            style={{ color: accentColor }}
          />
          <span
            className="text-xs font-serif font-black uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            {isFr ? "L'ARÈNE · DIRECT" : "THE ARENA · LIVE"}
          </span>
        </div>
        <Link
          to="/larene"
          className="text-[9px] font-mono font-black uppercase tracking-widest hover:underline"
          style={{ color: accentColor }}
        >
          {isFr ? "TOUT →" : "ALL →"}
        </Link>
      </div>
      <div className="space-y-2 font-sans">
        {loading && rows.length === 0 ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-[11px] italic text-zinc-500 dark:text-zinc-400 py-2">
            {isFr
              ? "Aucune rencontre disponible pour le moment."
              : "No fixtures available right now."}
          </p>
        ) : (
          rows.map((m) => {
            const sa = scoreOf(m, "A");
            const sb = scoreOf(m, "B");
            const played = sa !== null || sb !== null;
            const isLive = String(m.status) === "live";
            const when = kickoff(m);

            return (
              <Link
                key={m.id}
                to="/larene"
                className="block p-2.5 bg-zinc-50/80 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/60 transition-colors hover:border-current"
              >
                <div className="flex justify-between items-center text-[8px] font-mono font-bold uppercase tracking-wider mb-1 gap-2">
                  <span className="truncate text-zinc-500 dark:text-zinc-400">
                    {m.leagueLabel?.[language] || m.league}
                  </span>
                  {isLive ? (
                    <span className="shrink-0 text-red-600 dark:text-red-400">
                      {isFr ? "DIRECT" : "LIVE"}
                    </span>
                  ) : when ? (
                    <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                      {when}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {m.teamA.name}
                  </span>
                  <span className="shrink-0 font-mono font-black text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                    {/* An unplayed fixture shows no score at all. Rendering "0"
                        would imply a result that does not exist. */}
                    {played ? `${sa ?? 0} - ${sb ?? 0}` : "vs"}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate text-right">
                    {m.teamB.name}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <p className="mt-3 text-[8.5px] font-mono text-zinc-400 dark:text-zinc-500 leading-relaxed flex items-start gap-1">
        <Trophy size={9} className="shrink-0 mt-0.5" />
        {isFr
          ? "Scores vérifiés (TheSportsDB, OpenLigaDB). La lutte, les Navétanes et la D1 sont suivis depuis la rédaction."
          : "Verified scores (TheSportsDB, OpenLigaDB). Lutte, Navetanes and D1 are tracked by the newsroom."}
      </p>
    </div>
  );
}
