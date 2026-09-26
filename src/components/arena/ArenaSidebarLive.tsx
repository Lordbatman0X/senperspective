import React from "react";
import { Link } from "react-router-dom";
import { Radio, Trophy } from "lucide-react";
import type { Match } from "../../types";
import { useArenaScores } from "../../lib/sports/useArenaScores";
import { apiLeagues } from "../../lib/sports/leagues";
import { ArenaMatchTile } from "./ArenaMatchTile";
import { matchAnchor } from "../../lib/navigation";

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
            {/* "DIRECT" is only shown when something is actually in play. A
                hardcoded LIVE label on a board of upcoming fixtures implies
                coverage that does not exist. */}
            {liveCount > 0
              ? isFr
                ? `L'ARÈNE · ${liveCount} DIRECT`
                : `THE ARENA · ${liveCount} LIVE`
              : isFr
                ? "L'ARÈNE · SCORES"
                : "THE ARENA · SCORES"}
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
          rows.map((m) => (
            <Link
              key={m.id}
              to={`/category/sports#${matchAnchor(m.id)}`}
              aria-label={
                isFr
                  ? `${m.teamA.name} contre ${m.teamB.name}`
                  : `${m.teamA.name} versus ${m.teamB.name}`
              }
              className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-current"
            >
              <ArenaMatchTile
                match={m}
                language={language}
                accentColor={accentColor}
                density="compact"
                leagueLabel={m.leagueLabel?.[language] || m.league}
              />
            </Link>
          ))
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
