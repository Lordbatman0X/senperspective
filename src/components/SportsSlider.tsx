import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Trophy, Calendar, Activity, MessageSquare, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "../store";
import { Match } from "../types";

export function SportsSlider() {
  const { language, matches = [] } = useStore();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Category filter configurations
  const categories = [
    { id: "all", label: { fr: "Tout", en: "All" } },
    { id: "champions-league", label: { fr: "Champions League", en: "Champions League" } },
    { id: "world-cup", label: { fr: "Mondial", en: "World Cup" } },
    { id: "nba-bal", label: { fr: "BAL", en: "BAL" } },
    { id: "d1-basket", label: { fr: "D1", en: "D1" } },
    { id: "wrestling", label: { fr: "Lutte", en: "Wrestle" } },
    { id: "navetane", label: { fr: "Navétanes", en: "Navétane" } },
  ];

  const filteredMatches = activeCategory === "all" 
    ? matches 
    : matches.filter(m => m.league === activeCategory);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-reset index if filter changes
  useEffect(() => {
    setCurrentIndex(0);
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
  }, [activeCategory]);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.offsetWidth;
    if (width === 0) return;
    const idx = Math.round(scrollLeft / width);
    if (idx !== currentIndex && idx >= 0 && idx < filteredMatches.length) {
      setCurrentIndex(idx);
    }
  };

  const scrollTo = (idx: number) => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.offsetWidth;
    carouselRef.current.scrollTo({ left: width * idx, behavior: "smooth" });
    setCurrentIndex(idx);
  };

  const handlePrev = () => {
    const nextIdx = currentIndex === 0 ? filteredMatches.length - 1 : currentIndex - 1;
    scrollTo(nextIdx);
  };

  const handleNext = () => {
    const nextIdx = currentIndex === filteredMatches.length - 1 ? 0 : currentIndex + 1;
    scrollTo(nextIdx);
  };

  // Helper to trigger Abdel AI with the matchup prompt
  const handleAskAbdelAboutMatch = (match: Match) => {
    const prompt = language === "fr" 
      ? `Bonjour Abdel, peux-tu me décrypter les enjeux politiques et sportifs de la rencontre suivante : ${match.teamA.name} contre ${match.teamB.name} (${match.leagueLabel.fr}) ? S'il y a des détails historiques ou sociétaux, explique-les.`
      : `Hi Abdel, can you break down the political and sporting context of this match: ${match.teamA.name} vs ${match.teamB.name} (${match.leagueLabel.en})? Include any cultural or societal background.`;
    
    localStorage.setItem("abdel_prefilled_prompt", prompt);
    window.dispatchEvent(new CustomEvent("trigger_abdel_chat", { detail: { prompt } }));
  };

  // Renders a flag using high-fidelity inline custom HTML/CSS for national teams
  const renderFlag = (name: string) => {
    const cleanName = name.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "").trim();
    
    if (cleanName.toLowerCase().includes("sénégal") || cleanName.toLowerCase().includes("senegal")) {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-4.5 h-4.5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex shrink-0">
            <div className="w-1/3 bg-[#00853F]" />
            <div className="w-1/3 bg-[#FDEF42] flex items-center justify-center relative">
              <span className="text-[5px] text-[#00853F] absolute font-black">★</span>
            </div>
            <div className="w-1/3 bg-[#E31B23]" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{cleanName}</span>
        </div>
      );
    }
    if (cleanName.toLowerCase().includes("pays-bas") || cleanName.toLowerCase().includes("netherlands")) {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-4.5 h-4.5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col shrink-0">
            <div className="h-1/3 bg-[#AE1C28]" />
            <div className="h-1/3 bg-[#FFFFFF]" />
            <div className="h-1/3 bg-[#21468B]" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{cleanName}</span>
        </div>
      );
    }
    if (cleanName.toLowerCase().includes("argentine") || cleanName.toLowerCase().includes("argentina")) {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-4.5 h-4.5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col shrink-0 bg-white">
            <div className="h-1/3 bg-[#74ACDF]" />
            <div className="h-1/3 bg-[#FFFFFF] flex items-center justify-center relative">
              <div className="w-1 h-1 rounded-full bg-[#F1A80A] absolute" />
            </div>
            <div className="h-1/3 bg-[#74ACDF]" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{cleanName}</span>
        </div>
      );
    }
    if (cleanName.toLowerCase().includes("france")) {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-4.5 h-4.5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex shrink-0">
            <div className="w-1/3 bg-[#002395]" />
            <div className="w-1/3 bg-[#FFFFFF]" />
            <div className="w-1/3 bg-[#ED2939]" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{cleanName}</span>
        </div>
      );
    }
    if (cleanName.toLowerCase().includes("brésil") || cleanName.toLowerCase().includes("brazil")) {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-4.5 h-4.5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center bg-[#009C3B] shrink-0">
            <div className="w-3.2 h-2.2 bg-[#FFDF00] rotate-45 flex items-center justify-center overflow-hidden">
              <div className="w-1.2 h-1.2 rounded-full bg-[#002776] -rotate-45" />
            </div>
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{cleanName}</span>
        </div>
      );
    }

    // Default badge fallback with initials
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-4.5 h-4.5 rounded-full bg-[#E85D42]/10 border border-[#E85D42]/20 flex items-center justify-center text-[7.5px] font-black text-[#E85D42] shrink-0">
          {cleanName.substring(0, 2).toUpperCase()}
        </div>
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{cleanName}</span>
      </div>
    );
  };

  return (
    <div 
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          handlePrev();
        } else if (e.key === "ArrowRight") {
          handleNext();
        }
      }}
      className="glass p-5 border-t-4 border-t-[#E85D42] bg-brand-white/40 dark:bg-zinc-900/40 backdrop-blur-md font-sans shadow-sm rounded-none relative overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D42]/50"
    >
      
      {/* Header of Sidebar Widget */}
      <div className="flex items-center justify-between mb-4 border-b border-zinc-200/20 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#E85D42]/10 flex items-center justify-center">
            <Trophy size={11} className="text-[#E85D42]" />
          </div>
          <Link to="/larene" className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:text-[#E85D42] transition-colors flex items-center gap-1.5">
            <span>PERSPECTIVE ARENA</span>
            <ArrowRight size={11} className="text-[#E85D42]" />
          </Link>
        </div>

        {/* Live Pulse Count */}
        <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-[8px] font-black text-red-500 tracking-wider">
            {matches.filter(m => m.status === "live").length} LIVE
          </span>
        </div>
      </div>

      {/* Sport Category Filter Chips - Sleek Underlined Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none mb-4 border-b border-zinc-200/10 dark:border-zinc-800/20">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`pb-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 shrink-0 border-b-2 relative ${
                isSelected
                  ? "text-[#E85D42] border-[#E85D42]"
                  : "text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {language === "fr" ? cat.label.fr : cat.label.en}
            </button>
          );
        })}
      </div>

      {/* Matchup Card Space */}
      <div className="relative overflow-hidden w-full py-1">
        {filteredMatches.length > 0 ? (
          <div className="w-full">
            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
            >
              {filteredMatches.map((match) => (
                <div 
                  key={match.id} 
                  className="w-full flex-shrink-0 snap-start px-1" 
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/40 p-3 border border-zinc-200/50 dark:border-zinc-800/60 rounded-lg flex flex-col justify-between select-none relative cursor-pointer hover:border-[#E85D42]/30 dark:hover:border-[#E85D42]/30 transition-colors duration-300">
                    {/* Header Row of individual Match */}
                    <div className="flex justify-between items-center mb-2 pb-1 border-b border-zinc-200/10 dark:border-zinc-800/10 pointer-events-none">
                      <span className="text-[7.5px] font-black uppercase tracking-widest text-[#E85D42] bg-[#E85D42]/10 dark:bg-[#E85D42]/20 px-1.5 py-0.5 rounded">
                        {language === "fr" ? match.leagueLabel.fr : match.leagueLabel.en}
                      </span>

                      {/* Individual Status */}
                      {match.status === "live" && (
                        <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                          <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                          {match.time || "LIVE"}
                        </span>
                      )}
                      {match.status === "finished" && (
                        <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider">
                          {language === "fr" ? "FINI" : "ENDED"}
                        </span>
                      )}
                      {match.status === "upcoming" && (
                        <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider">
                          {language === "fr" ? "Bientôt" : "UPCOMING"}
                        </span>
                      )}
                    </div>

                    {/* Teams / Scores Rows */}
                    <div className="bg-zinc-100/30 dark:bg-zinc-950/20 p-2 rounded-md space-y-2 pointer-events-none border border-zinc-200/10 dark:border-zinc-800/10">
                      <div className="flex justify-between items-center gap-2 min-w-0">
                        {renderFlag(match.teamA.name)}
                        {match.status !== "upcoming" && (
                          match.league === "wrestling" ? (
                            <span className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                              match.teamA.score === 1
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                : match.teamA.score === 0 && match.teamB.score === 1
                                ? "text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20"
                                : "text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                            }`}>
                              {language === "fr" 
                                ? (match.teamA.score === 1 ? "Vainqueur" : match.teamA.score === 0 && match.teamB.score === 1 ? "Battu" : "Nul")
                                : (match.teamA.score === 1 ? "Winner" : match.teamA.score === 0 && match.teamB.score === 1 ? "Defeated" : "Draw")
                              }
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 min-w-5 text-center shrink-0">{match.teamA.score}</span>
                          )
                        )}
                      </div>
                      <div className="flex justify-between items-center gap-2 min-w-0">
                        {renderFlag(match.teamB.name)}
                        {match.status !== "upcoming" && (
                          match.league === "wrestling" ? (
                            <span className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                              match.teamB.score === 1
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                : match.teamB.score === 0 && match.teamA.score === 1
                                ? "text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20"
                                : "text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                            }`}>
                              {language === "fr" 
                                ? (match.teamB.score === 1 ? "Vainqueur" : match.teamB.score === 0 && match.teamA.score === 1 ? "Battu" : "Nul")
                                : (match.teamB.score === 1 ? "Winner" : match.teamB.score === 0 && match.teamA.score === 1 ? "Defeated" : "Draw")
                              }
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 min-w-5 text-center shrink-0">{match.teamB.score}</span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Arena or Date Context */}
                    <div className="mt-2 text-[8px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between border-t border-zinc-200/10 dark:border-zinc-800/10 pt-1.5 pointer-events-none">
                      <span className="truncate max-w-[140px] font-semibold flex items-center gap-1">
                        <Activity size={8} className="text-[#E85D42]/70" />
                        {match.arena}
                      </span>
                      <span className="font-mono text-[7.5px]">
                        {match.date || match.time || "Today"}
                      </span>
                    </div>

                    {/* Brief Analyst Commentary */}
                    <p className="mt-1.5 text-[8.5px] leading-snug text-zinc-500 dark:text-zinc-400 border-l-2 border-[#E85D42]/50 pl-2 font-medium italic pointer-events-none">
                      {language === "fr" ? match.contextInfo?.fr : match.contextInfo?.en}
                    </p>

                    {/* Interactive Abdel Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAskAbdelAboutMatch(match);
                      }}
                      className="mt-2.5 w-full py-2 rounded-lg bg-[#E85D42]/10 hover:bg-[#E85D42] text-[#E85D42] hover:text-white text-[8.5px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1 shadow-sm border border-[#E85D42]/20 hover:border-transparent"
                    >
                      <MessageSquare size={9} />
                      <span>{language === "fr" ? "Décrypter : Abdel" : "Analyze via Abdel"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Swipe Guidance Helper Text */}
            <div className="mt-2.5 text-[8px] text-center text-zinc-400/80 pointer-events-none">
              {language === "fr" ? "← Glissez sur la carte pour naviguer →" : "← Swipe card to navigate →"}
            </div>

            {/* Card Carousel Controls (Highly accessible, high contrast, large targets) */}
            {filteredMatches.length > 1 && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-200/10 dark:border-zinc-800/10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="h-10 w-10 rounded-full bg-zinc-200/70 hover:bg-[#E85D42] dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 hover:text-white dark:hover:text-white transition-all duration-300 shadow-md flex items-center justify-center border border-zinc-300/40 dark:border-zinc-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D42] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 hover:scale-105 active:scale-95"
                  title={language === "fr" ? "Match précédent" : "Previous matchup"}
                  aria-label="Previous matchup"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
                
                <div className="flex items-center gap-2">
                  {filteredMatches.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollTo(i);
                      }}
                      className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D42] ${
                        i === currentIndex ? "bg-[#E85D42] w-4" : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-500 w-2"
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="h-10 w-10 rounded-full bg-zinc-200/70 hover:bg-[#E85D42] dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 hover:text-white dark:hover:text-white transition-all duration-300 shadow-md flex items-center justify-center border border-zinc-300/40 dark:border-zinc-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D42] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 hover:scale-105 active:scale-95"
                  title={language === "fr" ? "Match suivant" : "Next matchup"}
                  aria-label="Next matchup"
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-[10px] text-zinc-400 italic">
            {language === "fr" ? "Aucune rencontre disponible" : "No matches active"}
          </div>
        )}
      </div>

    </div>
  );
}
