import React from "react";
import { Clock, MapPin, ShieldCheck, Newspaper, Bot, AlertTriangle } from "lucide-react";
import type { Match } from "../../types";
import { getSafeImageUrl } from "../../lib/imageUtils";

interface ArenaMatchCardProps {
  match: Match;
  language: "fr" | "en";
}

/**
 * One fixture on the Arena board.
 *
 * The provenance badge is not decoration. A reader must be able to tell an
 * authoritative API scoreline apart from a news-derived or AI-derived one at a
 * glance — especially for the competitions (Senegalese leagues, MMA) where no
 * structured provider exists at all.
 */
export function ArenaMatchCard({ match, language }: ArenaMatchCardProps) {
  const isFr = language === "fr";

  const statusMeta: Record<string, { label: string; className: string }> = {
    live: { label: isFr ? "DIRECT" : "LIVE", className: "bg-red-600 text-white animate-pulse" },
    upcoming: {
      label: isFr ? "À VENIR" : "UPCOMING",
      className: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    },
    finished: {
      label: isFr ? "TERMINÉ" : "FINAL",
      className: "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    },
  };
  const status = statusMeta[String(match.status)] || {
    label: String(match.status).toUpperCase(),
    className: "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  };

  const isLive = String(match.status) === "live";
  const hasScore = match.teamA.score !== undefined || match.teamB.score !== undefined;

  const badge = (() => {
    const p = match.provenance || "manual";
    if (p === "api") {
      return {
        icon: ShieldCheck,
        label: isFr ? "Source officielle" : "Official source",
        className: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      };
    }
    if (p === "news") {
      return {
        icon: Newspaper,
        label: isFr ? "Presse" : "News wire",
        className: "text-amber-600 dark:text-amber-400 border-amber-500/30",
      };
    }
    if (p === "ai") {
      return {
        icon: Bot,
        label: isFr ? "Analyse IA" : "AI analysis",
        className: "text-violet-600 dark:text-violet-400 border-violet-500/30",
      };
    }
    return {
      icon: Newspaper,
      label: isFr ? "Rédaction" : "Newsroom",
      className: "text-zinc-500 dark:text-zinc-400 border-zinc-400/30",
    };
  })();
  const BadgeIcon = badge.icon;

  // `clock` is the in-play minute ("67'"), never a date and never a count of
  // goals. Providers do send free text in this field, so it is only rendered
  // when it actually looks like a match clock; anything else is dropped rather
  // than shown where a timestamp is expected.
  const liveClock = (() => {
    const c = (match.clock || "").trim();
    // "67'", "67", "90+3", "2e mi-temps", "MT", "HT"
    return /^\d{1,3}(\+\d{1,2})?'?$|^\d{1,3}\+{1,2}\d{0,2}$|^(mt|ht|mi-?temps?|halftime)$/i.test(c)
      ? c
      : null;
  })();

  const kickoff = (() => {
    if (!match.date) return match.time || null;
    const d = new Date(match.date);
    if (Number.isNaN(d.getTime())) return match.time || null;
    return d.toLocaleString(isFr ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  })();

  return (
    <article
      className={`glass p-4 border transition-colors ${
        isLive ? "border-red-500/50" : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 truncate">
            {match.leagueLabel?.[language] || match.league}
          </p>
          {(match.period || liveClock) && (
            <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
              {[match.period, liveClock].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 ${status.className}`}
        >
          {status.label}
        </span>
      </div>
      <div className="space-y-2">
        {[
          { team: match.teamA, logo: match.teamALogo },
          { team: match.teamB, logo: match.teamBLogo },
        ].map(({ team, logo }, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {logo ? (
                <img
                  src={getSafeImageUrl(logo, "")}
                  alt=""
                  loading="lazy"
                  className="w-5 h-5 object-contain shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
              ) : null}
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {team.name}
              </span>
            </div>
            <span className="shrink-0 text-sm font-black font-mono text-zinc-900 dark:text-zinc-50 tabular-nums">
              {team.score !== undefined ? team.score : hasScore ? "-" : ""}
            </span>
          </div>
        ))}
      </div>

      {(match.arena || kickoff) && (
        <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-2 text-[9px] text-zinc-500 dark:text-zinc-400">
          {match.arena && (
            <span className="flex items-center gap-1 truncate min-w-0">
              <MapPin size={9} className="shrink-0" />
              <span className="truncate">{match.arena}</span>
            </span>
          )}
          {kickoff && (
            <span className="flex items-center gap-1 shrink-0 font-mono">
              <Clock size={9} />
              {kickoff}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 text-[8.5px] font-mono font-bold uppercase tracking-wider border px-1.5 py-0.5 ${badge.className}`}
        >
          <BadgeIcon size={9} />
          {badge.label}
        </span>

        {match.postponed && (
          <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-bold uppercase tracking-wider border border-amber-500/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5">
            <AlertTriangle size={9} />
            {isFr ? "Reporté" : "Postponed"}
          </span>
        )}

        {match.verification === "unverified" && (
          <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-bold uppercase tracking-wider border border-zinc-400/30 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5">
            {isFr ? "À confirmer" : "Unconfirmed"}
          </span>
        )}

        {match.sourceUrl && (
          <a
            href={match.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8.5px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline"
          >
            {isFr ? "Source" : "Source"}
          </a>
        )}
      </div>
    </article>
  );
}
