import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { Trophy, Activity, MessageSquare, ChevronLeft, Calendar, HelpCircle, ShieldAlert, Star, Award, MapPin, Newspaper, Clock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Match, Article } from "../types";
import { useSEO } from "../hooks/useSEO";
import { formatRelativeDate, formatCategory } from "../lib/utils";
import { getSafeImageUrl, DEFAULT_FALLBACK_IMAGE } from "../lib/imageUtils";

export function LArenePage() {
  const { language, articles = [], matches = [] } = useStore();
  
  useSEO({
    title: language === 'fr' ? "Sports & L'Arène - Actualités, Analyses & Directs | The Perspective Group" : "Sports & L'Arène - News, Analysis & Live Scores | The Perspective Group",
    description: language === 'fr'
      ? "Toutes les actualités et analyses sportives au Sénégal, ainsi que les directs de la Lutte avec Frappe (Lamb), BAL, D1 Basket et Navétanes."
      : "All sports news and analysis in Senegal, plus live coverage of Senegalese Wrestling (Lamb), BAL, D1 Basketball, and Navetanes."
  });

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<"all" | "live" | "upcoming" | "finished">("all");

  // Get ONLY sports articles - strictly no non-sports fallback
  const displayedArticles = articles.filter(
    (a) => a.isPublished !== false && (a as any).status !== 'draft' && (
      a.category?.toLowerCase() === "sports" ||
      a.category?.toLowerCase() === "sport" ||
      a.tags?.some(t => t.toLowerCase().includes("sport") || t.toLowerCase().includes("lutte") || t.toLowerCase().includes("basket") || t.toLowerCase().includes("football"))
    )
  );

  const categories = [
    { id: "all", label: { fr: "Tous les sports", en: "All Sports" } },
    { id: "wrestling", label: { fr: "Lutte avec Frappe (Lamb)", en: "Senegalese Wrestling" }, priority: true },
    { id: "nba-bal", label: { fr: "Basketball BAL & Afrique", en: "BAL & Africa Basketball" }, priority: true },
    { id: "d1-basket", label: { fr: "D1 Basket Sénégal", en: "Senegal D1 Basketball" }, priority: true },
    { id: "navetane", label: { fr: "Championnats Navétanes", en: "Navetane League" }, priority: true },
    { id: "world-cup", label: { fr: "Coupe du Monde", en: "World Cup" } },
    { id: "champions-league", label: { fr: "Champions League", en: "Champions League" } },
  ];

  // Prioritize Senegalese & African competitions first in rendering
  const getPriorityScore = (match: Match) => {
    const isWrestling = match.league === "wrestling";
    const isBAL = match.league === "nba-bal";
    const isNavetane = match.league === "navetane";
    const isD1 = match.league === "d1-basket";
    const includesSenegal = match.teamA.name.includes("🇸🇳") || match.teamB.name.includes("🇸🇳") || match.teamA.name.includes("Sénégal") || match.teamB.name.includes("Senegal");

    if (isWrestling) return 10;
    if (isNavetane) return 9;
    if (isBAL) return 8;
    if (isD1) return 7;
    if (includesSenegal) return 6;
    return 1;
  };

  const filteredMatches = matches
    .filter((m) => {
      const matchCat = activeCategory === "all" || m.league === activeCategory;
      const matchStat = activeStatus === "all" || m.status === activeStatus;
      return matchCat && matchStat;
    })
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

  const renderFlag = (name: string) => {
    const cleanName = name.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "").trim();
    const isWrestling = !name.includes("🇪🇸") && !name.includes("🏴󠁧󠁢󠁥󠁮󠁧󠁿") && !name.includes("🇫🇷") && !name.includes("🇩🇪") && !name.includes("🇳🇱") && !name.includes("🇦🇷") && !name.includes("🇧🇷") && !name.includes("🇪🇬") && !name.includes("🇹🇳") && !name.includes("🇦🇴");

    if (isWrestling) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#C69B52]/20 border border-[#C69B52]/40 flex items-center justify-center text-[9px] font-black text-[#C69B52]">
            🤼
          </div>
          <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{cleanName}</span>
        </div>
      );
    }

    if (name.includes("🇸🇳") || name.toLowerCase().includes("sénégal") || name.toLowerCase().includes("senegal")) {
      return (
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex shrink-0">
            <div className="w-1/3 bg-[#00853F]" />
            <div className="w-1/3 bg-[#FDEF42] flex items-center justify-center relative">
              <span className="text-[6px] text-[#00853F] absolute font-black">★</span>
            </div>
            <div className="w-1/3 bg-[#E31B23]" />
          </div>
          <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{cleanName}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-[8px] font-black text-brand-primary shrink-0">
          {cleanName.substring(0, 2).toUpperCase()}
        </div>
        <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{cleanName}</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 select-none space-y-16">
      
      {/* Main Page Title Header */}
      <header className="mb-12 border-b-4 border-brand-dark dark:border-brand-white pb-6">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-[#172033] dark:text-[#f2f4f5] flex items-center gap-3">
          Sports
        </h1>
        <p className="mt-4 text-brand-muted font-semibold text-base md:text-lg max-w-3xl">
          {language === 'fr' ? 'Tous les articles de la catégorie Sports' : 'All articles in Sports'}
        </p>
      </header>

      {/* TOP SECTION: SPORTS ARTICLES CARDS */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b-2 border-zinc-900 dark:border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="text-[#E85D42]" size={20} />
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
              {language === "fr" ? "Derniers Articles & Analyses Sportives" : "Latest Sports Articles & Analysis"}
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">
            {displayedArticles.length} {language === "fr" ? "Articles" : "Stories"}
          </span>
        </div>

        {displayedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedArticles.map((article, idx) => (
              <div 
                key={`${article.id}-${idx}`} 
                className="group flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#E85D42] dark:hover:border-[#E85D42] transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden"
              >
                <Link to={`/article/${article.slug || article.id}`} className="block relative h-52 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={getSafeImageUrl(article.featuredImage || article.imageUrl)}
                    alt={article.title[language] || article.title.fr}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-[#E85D42] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 shadow-sm">
                    {formatCategory(article.category, language) || "Sports"}
                  </div>
                  {article.type && (
                    <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 border border-white/20">
                      {article.type}
                    </div>
                  )}
                </Link>

                <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
                  <div className="space-y-2.5">
                    <Link to={`/article/${article.slug || article.id}`}>
                      <h3 className="font-serif font-black text-xl text-zinc-900 dark:text-zinc-100 leading-tight group-hover:text-[#E85D42] transition-colors">
                        {article.title[language] || article.title.fr}
                      </h3>
                    </Link>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed font-medium">
                      {article.excerpt[language] || article.excerpt.fr}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-[#E85D42]" />
                      {formatRelativeDate(article.date, language)} • {article.readingTime} MIN
                    </span>
                    <Link 
                      to={`/article/${article.slug || article.id}`}
                      className="text-[#E85D42] flex items-center gap-1 hover:underline font-black"
                    >
                      <span>{language === "fr" ? "Lire" : "Read"}</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-zinc-500 italic border border-dashed border-zinc-300 dark:border-zinc-800">
            {language === "fr" ? "Aucun article de sport disponible pour le moment." : "No sports articles available at this time."}
          </div>
        )}
      </section>

      {/* BOTTOM SECTION: L'ARÈNE MATCH CENTER */}
      <section className="pt-10 border-t-4 border-[#C69B52] space-y-8" id="larene-center">
        
        {/* Section Banner */}
        <div className="bg-zinc-950 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border border-[#C69B52]/40 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C69B52]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 bg-[#C69B52] text-zinc-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest">
              <Trophy size={12} />
              <span>{language === "fr" ? "L'Arène - Centre de Matchs" : "L'Arène Live Arena"}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-white">
              L’ARÈNE : DIRECTS & RÉSULTATS
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 max-w-2xl font-medium">
              {language === "fr"
                ? "Suivez les scores en direct, les résultats officiels et l'analyse socio-politique des grandes confrontations (Lamb, BAL, D1 Sénégal, Navétanes)."
                : "Live scores, official results, and socio-political analysis of key clashes (Wrestling, BAL, Senegal D1, Navetanes)."}
            </p>
          </div>
        </div>

        {/* Bento Grid layout for L'Arène Filters + Matches */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar Filters */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-5 border border-brand-border/20 rounded-none bg-brand-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-950 dark:text-zinc-100 mb-4 pb-2 border-b border-brand-border/20">
                {language === "fr" ? "FILTRER PAR SPORT" : "FILTER BY SPORT"}
              </h3>
              <div className="flex flex-col gap-2">
                {categories.map((cat) => {
                  const isSelected = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center justify-between text-left px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                        isSelected
                          ? "bg-[#E85D42] border-[#E85D42] text-white"
                          : "bg-transparent border-zinc-200/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:border-[#E85D42]/40 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      <span>
                        {language === "fr" ? cat.label.fr : cat.label.en}
                      </span>
                      {cat.priority && (
                        <span className={`text-[7px] px-1 py-0.5 rounded font-black uppercase shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-[#E85D42]/10 text-[#E85D42]'}`}>
                          {language === "fr" ? "Prioritaire" : "Local"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass p-5 border border-brand-border/20 rounded-none bg-brand-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-950 dark:text-zinc-100 mb-4 pb-2 border-b border-brand-border/20">
                {language === "fr" ? "STATUT DES MATCHS" : "MATCH STATUS"}
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { id: "all", label: { fr: "Tous les statuts", en: "All Matches" } },
                  { id: "live", label: { fr: "En direct (Live)", en: "Live Only" }, count: matches.filter(m => m.status === "live").length },
                  { id: "upcoming", label: { fr: "À venir", en: "Upcoming" } },
                  { id: "finished", label: { fr: "Résultats passés", en: "Finished" } }
                ].map((stat) => {
                  const isSelected = activeStatus === stat.id;
                  return (
                    <button
                      key={stat.id}
                      onClick={() => setActiveStatus(stat.id as any)}
                      className={`flex items-center justify-between text-left px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                        isSelected
                          ? "border-[#C69B52] bg-[#C69B52]/10 text-[#C69B52]"
                          : "bg-transparent border-zinc-200/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:border-[#C69B52]/40 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      <span>{language === "fr" ? stat.label.fr : stat.label.en}</span>
                      {stat.count !== undefined && stat.count > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center/Right Content Main Matchup Hub */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Main Dashboard Panel */}
            <div className="glass p-6 md:p-8 border border-brand-border/20 rounded-none bg-brand-white/60 dark:bg-zinc-950/20 backdrop-blur-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-200/20 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-[#E85D42]" />
                  <h3 className="text-xl font-serif font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-50">
                    {language === "fr" ? "Centre d'Analyse des Rencontres" : "Matchup Analytics Center"}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-200/30 dark:bg-zinc-800/30 px-2 py-1 uppercase tracking-widest font-bold">
                  {filteredMatches.length} {language === "fr" ? "Rencontres" : "Matches"}
                </span>
              </div>

              {/* Grid of Matches */}
              {filteredMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredMatches.map((match, idx) => {
                      const isPriority = getPriorityScore(match) >= 7;
                      return (
                        <motion.div
                          layout
                          key={match.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className={`group relative flex flex-col justify-between p-5 border transition-all duration-300 bg-brand-white/80 dark:bg-zinc-900/50 hover:-translate-y-1 ${
                            isPriority
                              ? "border-[#C69B52]/40 hover:border-[#C69B52] shadow-[0_10px_25px_-12px_rgba(198,155,82,0.15)]"
                              : "border-zinc-200/50 dark:border-zinc-800/50 hover:border-[#E85D42]"
                          }`}
                        >
                          {/* Priority Gold Crown Badge for Local/Traditional Sports */}
                          {isPriority && (
                            <div className="absolute -top-3 left-4 flex items-center gap-1.5 bg-[#C69B52] text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-md">
                              <Star size={8} className="fill-white" />
                              <span>{language === "fr" ? "Élite Locale" : "Local Elite"}</span>
                            </div>
                          )}

                          {/* Top Metadata Row */}
                          <div className="flex items-center justify-between mb-4 border-b border-zinc-200/10 dark:border-zinc-800/10 pb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#E85D42]">
                              {language === "fr" ? match.leagueLabel.fr : match.leagueLabel.en}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {match.status === "live" && (
                                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  {match.time || "LIVE"}
                                </span>
                              )}
                              {match.status === "finished" && (
                                <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                  {language === "fr" ? "FINI" : "ENDED"}
                                </span>
                              )}
                              {match.status === "upcoming" && (
                                <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                  {language === "fr" ? "À venir" : "UPCOMING"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Teams & Score Rows */}
                          <div className="space-y-4 py-2">
                            <div className="flex justify-between items-center gap-3">
                              {renderFlag(match.teamA.name)}
                              {match.status !== "upcoming" && (
                                match.league === "wrestling" ? (
                                  <span
                                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ${
                                    match.teamA.score === 1
                                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                      : "text-zinc-400 dark:text-zinc-500 bg-zinc-500/10 border-zinc-200 dark:border-zinc-800"
                                  }`}>
                                    {language === "fr" ? (match.teamA.score === 1 ? "VAINQUEUR" : "BATTU") : (match.teamA.score === 1 ? "WINNER" : "DEFEATED")}
                                  </span>
                                ) : (
                                  <span className="text-sm font-extrabold px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 min-w-8 text-center shrink-0 font-mono">
                                    {match.teamA.score}
                                  </span>
                                )
                              )}
                            </div>

                            <div className="flex justify-between items-center gap-3">
                              {renderFlag(match.teamB.name)}
                              {match.status !== "upcoming" && (
                                match.league === "wrestling" ? (
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ${
                                    match.teamB.score === 1
                                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                      : "text-zinc-400 dark:text-zinc-500 bg-zinc-500/10 border-zinc-200 dark:border-zinc-800"
                                  }`}>
                                    {language === "fr" ? (match.teamB.score === 1 ? "VAINQUEUR" : "BATTU") : (match.teamB.score === 1 ? "WINNER" : "DEFEATED")}
                                  </span>
                                ) : (
                                  <span className="text-sm font-extrabold px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 min-w-8 text-center shrink-0 font-mono">
                                    {match.teamB.score}
                                  </span>
                                )
                              )}
                            </div>
                          </div>

                          {/* Location Details */}
                          <div className="mt-3.5 pt-3.5 border-t border-zinc-200/10 dark:border-zinc-800/10 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                            <span className="flex items-center gap-1 truncate max-w-[170px]">
                              <MapPin size={9} className="text-[#C69B52]" />
                              {match.arena}
                            </span>
                            <span className="font-mono text-[8.5px]">
                              {match.date || match.time || "Dakar"}
                            </span>
                          </div>

                          {/* Socio-political analytical commentary paragraph */}
                          <div className="mt-4 p-3 bg-zinc-100/30 dark:bg-zinc-950/20 border-l-4 border-[#C69B52] text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium italic">
                            {language === "fr" ? match.contextInfo?.fr : match.contextInfo?.en}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400 italic text-xs">
                  {language === "fr" 
                    ? "Aucune rencontre ne correspond à vos filtres actuels." 
                    : "No matches matching the selected criteria."}
                </div>
              )}
            </div>
            
            {/* Traditional Wrestling Editorial Card */}
            <div className="glass p-6 border border-[#C69B52]/30 rounded-none bg-zinc-950/20 backdrop-blur-md relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 font-sans font-black text-9xl text-[#C69B52] -mr-10 -mb-10 pointer-events-none select-none">
                LAMB
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#C69B52] mb-2 flex items-center gap-1">
                <Award size={12} />
                <span>{language === "fr" ? "CHRONIQUES DE LA LUTTE SÉNÉGALAISE" : "THE TRADITIONAL LAMB IN FOCUS"}</span>
              </h3>
              <h4 className="text-lg font-serif font-black text-brand-dark dark:text-zinc-50 mb-3">
                {language === "fr" 
                  ? "Pourquoi le Lamb est bien plus qu'un sport national" 
                  : "Why traditional Wrestling is far more than a sport"}
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                {language === "fr"
                  ? "Au Sénégal, la lutte avec frappe unifie des quartiers entiers de Dakar, de Thiaroye à Guédiawaye. Au-delà de l'affrontement athlétique, elle représente un ascenseur social puissant pour la jeunesse de la banlieue, mobilisant des capitaux importants issus de sponsors locaux et se connectant étroitement aux rituels mystiques traditionnels sénégalais."
                  : "In Senegal, traditional wrestling with strikes unites entire neighborhoods of Dakar, from Thiaroye to Guédiawaye. Beyond the athletic contest, it is a powerful vehicle of social climbing for suburban youth, pooling massive local sponsorship budgets and closely weaving into mystical ancestral rites."}
              </p>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}

