import React from "react";
import type { Match } from "../../types";

/**
 * The one row renderer for every arena score surface (sidebar, category board,
 * arena board). Centralised on purpose:
 *
 *   - The "is this a real match clock?" guard lives here once. A previous build
 *     let OpenLigaDB write a goal tally ("4 buts") into `clock`, which rendered
 *     in the slot where a kickoff date belongs. The guard rejects anything that
 *     is not a genuine clock and falls back to the real date.
 *   - The "an unplayed fixture shows no score" rule lives here once. Printing
 *     "0 - 0" for a match that has not been played invents a result.
 *
 * Two densities: `compact` for the narrow homepage sidebar, `detailed` for the
 * category board, where there is room for venue, group and kickoff context.
 */

type Density = "compact" | "detailed";

/** A genuine in-play clock: "67'", "45+2", "HT". Anything else is not a clock. */
export const isMatchClock = (v?: string) =>
  /^\d{1,3}(\+\d{1,2})?'?$|^\d{1,3}\+\d{0,2}$|^(mt|ht|mi-?temps?|halftime)$/i.test(
    (v || "").trim()
  );

const scoreOf = (m: Match, side: "A" | "B") => {
  const v = side === "A" ? m.teamA.score : m.teamB.score;
  return v === undefined || v === null ? null : v;
};

const kickoffDate = (m: Match) => {
  if (!m.date) return null;
  const d = new Date(m.date);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Aujourd'hui 18:30" / "Demain 20:00" / "12 oct. 18:30". */
const kickoffLabel = (m: Match, isFr: boolean) => {
  const d = kickoffDate(m);
  if (!d) return null;
  const time = d.toLocaleTimeString(isFr ? "fr-FR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const now = new Date();
  const days = Math.round((startOf(d) - startOf(now)) / 86400000);
  if (days === 0) return isFr ? `Aujourd'hui ${time}` : `Today ${time}`;
  if (days === 1) return isFr ? `Demain ${time}` : `Tomorrow ${time}`;
  return d.toLocaleString(isFr ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const dayLabel = (m: Match, isFr: boolean) => {
  const d = kickoffDate(m);
  if (!d) return null;
  return d.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { weekday: "short" });
};


interface ArenaMatchTileProps {
  match: Match;
  language: "fr" | "en";
  accentColor?: string;
  density?: Density;
  /** Overrides the league label in the compact density. */
  leagueLabel?: string;
}

export function ArenaMatchTile({
  match: m,
  language,
  accentColor = "#E85D42",
  density = "compact",
  leagueLabel,
}: ArenaMatchTileProps) {
  const isFr = language === "fr";
  const detailed = density === "detailed";

  const sa = scoreOf(m, "A");
  const sb = scoreOf(m, "B");
  // An unplayed fixture has no score. Showing "0" would invent one.
  const played = sa !== null || sb !== null;
  const isLive = String(m.status) === "live";
  const isFinished = String(m.status) === "finished";

  // A finished match with a real score has a winner; emphasising it is honest
  // information, not editorial spin.
  const winnerA = isFinished && played && (sa ?? 0) > (sb ?? 0);
  const winnerB = isFinished && played && (sb ?? 0) > (sa ?? 0);

  const league = leagueLabel || m.leagueLabel?.[language] || m.league || "";
  const clock = isMatchClock(m.clock) ? m.clock : null;
  const kickoff = kickoffLabel(m, isFr);
  const day = detailed ? dayLabel(m, isFr) : null;

  return (
    <div
      data-arena-tile={density}
      className={[
        "group relative overflow-hidden rounded-lg border",
        "bg-white dark:bg-zinc-900",
        "border-zinc-200 dark:border-zinc-800",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-lg",
        "hover:border-zinc-300 dark:hover:border-zinc-700",
        "focus-within:-translate-y-0.5 focus-within:shadow-lg",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        isLive ? "ring-1 ring-red-500/30" : "",
        detailed ? "p-3.5" : "p-2.5",
      ].join(" ")}
    >
      {/* Accent rail that wipes down on hover. Decorative, so hidden from
          assistive tech; live state is already conveyed by text and ring. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 transition-transform duration-200 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="min-w-0 truncate text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {day ? <span className="text-zinc-400 dark:text-zinc-500">{day} · </span> : null}
          {league}
        </span>

        {isLive ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[8px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            {clock || (isFr ? "Direct" : "Live")}
          </span>
        ) : kickoff ? (
          <span className="shrink-0 text-[8px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {detailed ? kickoff : kickoff.replace(/^(Aujourd'hui |Demain |Today |Tomorrow )/, "")}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <TeamRow name={m.teamA.name} logo={m.teamALogo} score={sa} played={played} won={winnerA} align="left" detailed={detailed} />
        <TeamRow name={m.teamB.name} logo={m.teamBLogo} score={sb} played={played} won={winnerB} align="right" detailed={detailed} />
      </div>

      {detailed && (m.arena || m.period) ? (
        <div className="mt-2 flex items-center gap-2 truncate text-[8px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {m.arena ? <span className="truncate">{m.arena}</span> : null}
          {m.arena && m.period ? <span aria-hidden="true">·</span> : null}
          {m.period ? <span className="shrink-0">{m.period}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function TeamRow({
  name,
  logo,
  score,
  played,
  won,
  align,
  detailed,
}: {
  name: string;
  logo?: string;
  score: number | null;
  played: boolean;
  won: boolean;
  align: "left" | "right";
  detailed: boolean;
}) {
  return (
    <div className={["flex items-center gap-2", align === "right" ? "flex-row-reverse" : ""].join(" ")}>
      {detailed && logo ? (
        <img
          src={logo}
          alt=""
          loading="lazy"
          className="h-4 w-4 shrink-0 object-contain opacity-80"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}

      <span
        className={[
          "min-w-0 flex-1 truncate font-bold",
          "text-zinc-900 dark:text-zinc-100",
          detailed ? "text-xs" : "text-[11px]",
          // A finished result dims the loser so the outcome reads at a glance.
          won ? "" : played ? "opacity-55" : "",
        ].join(" ")}
        style={align === "right" ? { textAlign: "right" } : undefined}
      >
        {name}
      </span>

      <span
        className={[
          "shrink-0 font-mono font-black tabular-nums",
          "text-zinc-900 dark:text-zinc-50",
          detailed ? "text-sm" : "text-[12px]",
        ].join(" ")}
      >
        {score === null ? <span className="text-zinc-400 dark:text-zinc-600">&ndash;</span> : score}
      </span>
    </div>
  );
}
