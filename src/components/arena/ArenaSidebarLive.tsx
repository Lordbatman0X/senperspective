import React from "react";
import { Link } from "react-router-dom";
import { Radio, Trophy, RefreshCw } from "lucide-react";
import type { Match } from "../../types";
import { useArenaScores } from "../../lib/sports/useArenaScores";
import { sidebarLeagues } from "../../lib/sports/leagues";
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

  // Football-first league set: the sidebar must lead with the sport that
  // dominates the Senegalese audience, not with whatever the provider happened
  // to return first. Polls adaptively — every 30s while a match is live, every
  // 3 min otherwise — and pauses while the tab is hidden.
  const { matches, loading, updatedAt, refresh } = useArenaScores(editorialMatches, sidebarLeagues());

  const rows = matches.slice(0, limit);
  const liveCount = matches.filter((m) => String(m.status) === "live").length;
  const footballCount = rows.filter((m) => String(m.sport || "").toLowerCase() === "football").length;

  return (
    <div
      className="glass bg-white/95 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 border-t-4 text-left overflow-hidden"
      style={{ borderTopColor: accentColor }}
    >
      <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex items-center justify-center shrink-0">
            <Radio size={14} className={liveCount > 0 ? "animate-pulse" : ""} style={{ color: accentColor }} />
            {liveCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full animate-ping"
                style={{ backgroundColor: accentColor }}
              />
            )}
          </span>
          <span
            className="text-[11px] font-serif font-black uppercase tracking-widest truncate"
            style={{ color: accentColor }}
          >
            {liveCount > 0
              ? isFr ? `L'ARÈNE · ${liveCount} EN DIRECT` : `THE ARENA · ${liveCount} LIVE`
              : isFr ? "L'ARÈNE · SCORES" : "THE ARENA · SCORES"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refresh}
            title={isFr ? 'Actualiser les scores' : 'Refresh scores'}
            aria-label={isFr ? 'Actualiser les scores' : 'Refresh scores'}
            className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw size={12} />
          </button>
          <Link
            to="/larene"
            className="text-[9px] font-mono font-black uppercase tracking-widest hover:underline whitespace-nowrap"
            style={{ color: accentColor }}
          >
            {isFr ? "TOUT →" : "ALL →"}
          </Link>
        </div>
      </div>

      <div className="px-5 py-4 space-y-1.5 font-sans">
        {loading && rows.length === 0 ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse rounded" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-[11px] italic text-zinc-500 dark:text-zinc-400 py-3 text-center">
            {isFr ? "Aucune rencontre disponible." : "No fixtures available."}
          </p>
        ) : (
          rows.map((m) => (
            <Link
              key={m.id}
              to={`/category/sports#${matchAnchor(m.id)}`}
              aria-label={
                isFr ? `${m.teamA.name} contre ${m.teamB.name}` : `${m.teamA.name} versus ${m.teamB.name}`
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

      <div className="px-5 pb-4 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <p className="text-[8.5px] font-mono text-zinc-400 dark:text-zinc-500 leading-relaxed flex items-start gap-1">
          <Trophy size={9} className="shrink-0 mt-0.5" />
          {isFr
            ? `Football en priorité · ${footballCount}/${rows.length} lignes. Mise à jour ${liveCount > 0 ? "toutes les 30 s" : "toutes les 3 min"}.`
            : `Football first · ${footballCount}/${rows.length} rows. Refresh ${liveCount > 0 ? "every 30s" : "every 3 min"}.`}
        </p>
        {updatedAt && (
          <p className="mt-1 text-[8px] font-mono text-zinc-400 dark:text-zinc-600">
            {isFr ? 'Dernière lecture : ' : 'Last read: '}
            {new Date(updatedAt).toLocaleTimeString(isFr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
