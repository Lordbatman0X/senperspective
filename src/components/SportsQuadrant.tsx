import React from "react";
import { Link } from "react-router-dom";
import { Trophy, MessageSquare, ArrowRight, FileText, MapPin, Clock } from "lucide-react";
import { useStore } from "../store";
import { Match, Article } from "../types";

export function SportsQuadrant() {
  const { language, matches = [], articles = [], siteSettings } = useStore();

  const accentColor = siteSettings?.accentColor || "#E85D42";

  const getDakarTimeStr = (gmtStr: string) => {
    if (!gmtStr) return "Heure de Dakar";
    return gmtStr.replace("GMT", "DKR");
  };

  // Prioritization helper for matches
  const getPrioritizedMatches = (allMatches: Match[]) => {
    return [...allMatches].sort((a, b) => {
      const isWrestLiveA = a.league === "wrestling" && a.status === "live";
      const isWrestLiveB = b.league === "wrestling" && b.status === "live";
      if (isWrestLiveA && !isWrestLiveB) return -1;
      if (!isWrestLiveA && isWrestLiveB) return 1;

      const hasSenegalA = a.teamA.name.includes("🇸🇳") || a.teamB.name.includes("🇸🇳") || a.league === "wrestling" || a.league === "navetane";
      const hasSenegalB = b.teamA.name.includes("🇸🇳") || b.teamB.name.includes("🇸🇳") || b.league === "wrestling" || b.league === "navetane";

      const isLiveSenegalA = hasSenegalA && a.status === "live";
      const isLiveSenegalB = hasSenegalB && b.status === "live";
      if (isLiveSenegalA && !isLiveSenegalB) return -1;
      if (!isLiveSenegalA && isLiveSenegalB) return 1;

      const isUpSenegalA = hasSenegalA && a.status === "upcoming";
      const isUpSenegalB = hasSenegalB && b.status === "upcoming";
      if (isUpSenegalA && !isUpSenegalB) return -1;
      if (!isUpSenegalA && isUpSenegalB) return 1;

      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;

      return 0;
    });
  };

  const sortedMatches = getPrioritizedMatches(matches);

  const resolveZone = (zoneNum: 1 | 2 | 3 | 4) => {
    const selection = siteSettings?.sportsQuadrantSelection;
    const zoneId = selection?.[`zone${zoneNum}Id` as keyof typeof selection];
    const zoneType = selection?.[`zone${zoneNum}Type` as keyof typeof selection];

    if (zoneId && zoneType) {
      if (zoneType === "article") {
        const art = articles.find((a) => a.id === zoneId);
        if (art) return { type: "article" as const, data: art };
      } else {
        const match = matches.find((m) => m.id === zoneId);
        if (match) return { type: "match" as const, data: match };
      }
    }

    if (zoneNum === 1) {
      const mainEvent = sortedMatches[0];
      if (mainEvent) return { type: "match" as const, data: mainEvent };
    } else if (zoneNum === 2) {
      const upcoming = sortedMatches.find((m) => m.status === "upcoming") || sortedMatches[1];
      if (upcoming) return { type: "match" as const, data: upcoming };
    } else if (zoneNum === 3) {
      const completed = sortedMatches.find((m) => m.status === "finished") || sortedMatches[2];
      if (completed) return { type: "match" as const, data: completed };
    } else if (zoneNum === 4) {
      const sportsArticle = articles.find((a) => a.category === "Sports" && a.isPublished) || articles.find((a) => a.isPublished);
      if (sportsArticle) return { type: "article" as const, data: sportsArticle };
      if (sortedMatches[3]) return { type: "match" as const, data: sortedMatches[3] };
    }

    return null;
  };

  const zone1 = resolveZone(1);
  const zone2 = resolveZone(2);
  const zone3 = resolveZone(3);
  const zone4 = resolveZone(4);

  const handleAskAbdelAboutMatch = (match: Match) => {
    const prompt = language === "fr"
      ? `Bonjour Abdel, peux-tu me décrypter les enjeux politiques et sportifs de la rencontre suivante : ${match.teamA.name} contre ${match.teamB.name} (${match.leagueLabel.fr}) ? Donne-moi un résumé clair et factuel.`
      : `Hi Abdel, can you break down the political and sporting context of this match: ${match.teamA.name} vs ${match.teamB.name} (${match.leagueLabel.en})? Include key facts and background.`;

    localStorage.setItem("abdel_prefilled_prompt", prompt);
    window.dispatchEvent(new CustomEvent("trigger_abdel_chat", { detail: { prompt } }));
  };

  const renderFlagBadge = (name: string) => {
    const cleanName = name.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "").trim();

    if (cleanName.toLowerCase().includes("sénégal") || cleanName.toLowerCase().includes("senegal")) {
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-5 h-5 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-700 shadow-xs flex shrink-0">
            <div className="w-1/3 bg-[#00853F]" />
            <div className="w-1/3 bg-[#FDEF42] flex items-center justify-center relative">
              <span className="text-[5px] text-[#00853F] absolute font-black">★</span>
            </div>
            <div className="w-1/3 bg-[#E31B23]" />
          </div>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{cleanName}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-5 h-5 rounded-full bg-[#E85D42]/10 border border-[#E85D42]/20 flex items-center justify-center text-[8.5px] font-black text-[#E85D42] shrink-0 uppercase">
          {cleanName.substring(0, 2)}
        </div>
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{cleanName}</span>
      </div>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-[#E85D42] p-5 sm:p-7 md:p-8 font-sans relative overflow-hidden my-6 shadow-xs">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#E85D42]/10 flex items-center justify-center">
            <Trophy size={14} className="text-[#E85D42]" style={{ color: accentColor }} />
          </div>
          <div>
            <Link
              to="/larene"
              className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:text-[#E85D42] transition-colors flex items-center gap-2"
            >
              <span>L’ARÈNE SPORTIVE</span>
              <ArrowRight size={13} className="text-[#E85D42]" />
            </Link>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
              {language === "fr" ? "Actualités, résultats et analyses sportives" : "Sports news, scores and analysis"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-[9px] font-black text-red-600 dark:text-red-400 tracking-wider">
              {matches.filter((m) => m.status === "live").length} EN DIRECT
            </span>
          </div>
          <div className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 flex items-center gap-1 border border-zinc-200 dark:border-zinc-700">
            <Clock size={11} />
            <span>DKR: {new Date().toLocaleTimeString("en-US", { timeZone: "Africa/Dakar", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
          </div>
        </div>
      </div>

      {/* 4-Zone Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* ZONE 1: MAIN LIVE OR PRIORITY EVENT */}
        <div className="col-span-1 md:col-span-6 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 p-5 relative overflow-hidden group transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 bg-[#E85D42] h-full" style={{ backgroundColor: accentColor }} />
          
          {zone1 ? (
            <div className="flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#E85D42] bg-[#E85D42]/10 border border-[#E85D42]/20 px-2 py-0.5" style={{ color: accentColor, borderColor: accentColor + '33', backgroundColor: accentColor + '1a' }}>
                      À LA UNE • ÉVÉNEMENT MAJEUR
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {zone1.type === "match" ? (zone1.data as Match).leagueLabel[language] : (zone1.data as Article).category}
                    </span>
                  </div>

                  {zone1.type === "match" && (zone1.data as Match).status === "live" ? (
                    <span className="bg-red-600 text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                      {(zone1.data as Match).time || "LIVE"}
                    </span>
                  ) : zone1.type === "match" && (zone1.data as Match).status === "finished" ? (
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                      {language === "fr" ? "FINI" : "ENDED"}
                    </span>
                  ) : (
                    <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                      {language === "fr" ? "À VENIR" : "UPCOMING"}
                    </span>
                  )}
                </div>

                {zone1.type === "match" ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-serif font-black text-zinc-900 dark:text-zinc-100 leading-tight">
                      {language === "fr" ? "Grande Affiche de L'Arène" : "Featured Arena Match"}
                    </h3>
                    
                    <div className="bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex justify-between items-center gap-2">
                        {renderFlagBadge((zone1.data as Match).teamA.name)}
                        {(zone1.data as Match).status !== "upcoming" && (
                          <span className="text-sm font-black px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono">
                            {(zone1.data as Match).teamA.score ?? 0}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        {renderFlagBadge((zone1.data as Match).teamB.name)}
                        {(zone1.data as Match).status !== "upcoming" && (
                          <span className="text-sm font-black px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono">
                            {(zone1.data as Match).teamB.score ?? 0}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 italic border-l-2 border-[#E85D42] pl-3">
                      {language === "fr" ? (zone1.data as Match).contextInfo?.fr : (zone1.data as Match).contextInfo?.en}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-lg font-serif font-black text-zinc-900 dark:text-zinc-100 leading-snug hover:text-[#E85D42] transition-colors">
                      <Link to={`/article/${(zone1.data as Article).slug}`}>
                        {(zone1.data as Article).title[language]}
                      </Link>
                    </h3>
                    <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-3">
                      {(zone1.data as Article).excerpt[language]}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-2.5 items-center justify-between">
                <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                  <MapPin size={11} className="text-[#E85D42]" />
                  <span className="truncate max-w-[150px]">
                    {zone1.type === "match" ? (zone1.data as Match).arena : "Dakar"}
                  </span>
                </div>
                
                {zone1.type === "match" ? (
                  <button
                    onClick={() => handleAskAbdelAboutMatch(zone1.data as Match)}
                    className="bg-[#E85D42]/10 hover:bg-[#E85D42] text-[#E85D42] hover:text-white border border-[#E85D42]/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare size={10} />
                    <span>{language === "fr" ? "Décrypter avec Abdel" : "Analyze via Abdel"}</span>
                  </button>
                ) : (
                  <Link
                    to={`/article/${(zone1.data as Article).slug}`}
                    className="bg-[#E85D42]/10 hover:bg-[#E85D42] text-[#E85D42] hover:text-white border border-[#E85D42]/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5"
                  >
                    <FileText size={10} />
                    <span>{language === "fr" ? "Lire l'Analyse" : "Read Analysis"}</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs italic">
              {language === "fr" ? "Aucune rencontre disponible" : "No event available"}
            </div>
          )}
        </div>

        {/* RIGHT ZONES: 2, 3, 4 */}
        <div className="col-span-1 md:col-span-6 flex flex-col justify-between gap-4">
          
          {/* ZONE 2 */}
          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between">
            {zone2 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#E85D42] bg-[#E85D42]/10 border border-[#E85D42]/20 px-1.5 py-0.5">
                    À VENIR
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    {zone2.type === "match" ? getDakarTimeStr((zone2.data as Match).date || (zone2.data as Match).time || "") : ""}
                  </span>
                </div>

                {zone2.type === "match" ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-[9px] font-bold uppercase text-zinc-400">
                        {(zone2.data as Match).leagueLabel[language]}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="truncate">{(zone2.data as Match).teamA.name}</span>
                        <span className="text-[10px] text-zinc-400 font-bold">vs</span>
                        <span className="truncate">{(zone2.data as Match).teamB.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAskAbdelAboutMatch(zone2.data as Match)}
                      className="bg-zinc-200 dark:bg-zinc-800 hover:bg-[#E85D42] text-zinc-800 dark:text-zinc-200 hover:text-white px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest transition-colors cursor-pointer shrink-0"
                    >
                      Abdel AI
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-[9px] font-bold uppercase text-zinc-400">{(zone2.data as Article).category}</div>
                    <Link to={`/article/${(zone2.data as Article).slug}`} className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-[#E85D42] transition-colors line-clamp-1">
                      {(zone2.data as Article).title[language]}
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* ZONE 3 */}
          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between">
            {zone3 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5">
                    RÉSULTAT
                  </span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">
                    {zone3.type === "match" ? ((zone3.data as Match).time || "FINI") : ""}
                  </span>
                </div>

                {zone3.type === "match" ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-[9px] font-bold uppercase text-zinc-400">
                        {(zone3.data as Match).leagueLabel[language]}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="truncate">{(zone3.data as Match).teamA.name}</span>
                        <span className="text-xs font-mono font-black text-[#E85D42]">{(zone3.data as Match).teamA.score ?? 0}</span>
                        <span className="text-zinc-400">-</span>
                        <span className="text-xs font-mono font-black text-[#E85D42]">{(zone3.data as Match).teamB.score ?? 0}</span>
                        <span className="truncate">{(zone3.data as Match).teamB.name}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[9px] font-bold uppercase text-zinc-400">{(zone3.data as Article).category}</div>
                    <Link to={`/article/${(zone3.data as Article).slug}`} className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-[#E85D42] transition-colors line-clamp-1">
                      {(zone3.data as Article).title[language]}
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* ZONE 4 */}
          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between">
            {zone4 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#E85D42] bg-[#E85D42]/10 border border-[#E85D42]/20 px-1.5 py-0.5">
                    CHRONIQUE
                  </span>
                </div>

                {zone4.type === "article" ? (
                  <div className="space-y-1">
                    <Link
                      to={`/article/${(zone4.data as Article).slug}`}
                      className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-[#E85D42] transition-colors block leading-tight line-clamp-1"
                    >
                      {(zone4.data as Article).title[language]}
                    </Link>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {(zone4.data as Article).excerpt[language]}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {(zone4.data as Match).teamA.name} vs {(zone4.data as Match).teamB.name}
                  </div>
                )}
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}
