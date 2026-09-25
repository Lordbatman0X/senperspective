import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { Newspaper, ArrowRight, Hourglass } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { formatRelativeDate, formatCategory } from "../lib/utils";
import { getSafeImageUrl, DEFAULT_FALLBACK_IMAGE } from "../lib/imageUtils";
import { ArenaGroupedScores } from "../components/arena/ArenaGroupedScores";
import { withoutDemoMatches } from "../lib/sports/demoMatches";

export function LArenePage() {
  const { language, articles = [], matches: rawMatches = [] } = useStore();

  // The store ships with 14 INVENTED demo fixtures (fabricated Champions
  // League / World Cup / BAL / D1 / Lutte / Navetane teamings and scores, one
  // of them pinned at "88'" with status "live"). They are stripped out before
  // anything is rendered, so a fabricated score can never reach a reader here.
  // Matches genuinely created in the admin panel have no `isDemo` flag and are
  // unaffected.
  const matches = withoutDemoMatches(rawMatches);
  
  useSEO({
    title: language === 'fr' 
      ? "L'Arène â€” Sports & Lutte Sénégalaise | SenPerspective" 
      : "L'Arène â€” Sports & Senegalese Wrestling | SenPerspective",
    description: language === 'fr'
      ? "Toutes les actualités et analyses sportives au Sénégal, ainsi que les directs de la Lutte avec Frappe (Lamb), BAL, D1 Basket et Navétanes sur SenPerspective."
      : "All sports news, wrestling lamb analysis and live match scores on SenPerspective.",
    canonical: "https://senperspective.com/larene",
    breadcrumbs: [
      { name: "Accueil", url: "https://senperspective.com/" },
      { name: "L'Arène â€” Sports", url: "https://senperspective.com/larene" }
    ]
  });

  // Sports reporting only. Strictly no non-sports fallback: a mis-tagged
  // article should not leak onto the sports category page.
  const displayedArticles = (articles ?? []).filter(
    (a) =>
      a.isPublished !== false &&
      (a as any).status !== "draft" &&
      (a.category?.toLowerCase() === "sports" ||
        a.category?.toLowerCase() === "sport" ||
        a.tags?.some(
          (t) =>
            t.toLowerCase().includes("sport") ||
            t.toLowerCase().includes("lutte") ||
            t.toLowerCase().includes("basket") ||
            t.toLowerCase().includes("football")
        ))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 select-none space-y-16">
      {/* Main Page Title Header */}
      <header className="border-b-4 border-brand-dark dark:border-brand-white pb-6">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-[#172033] dark:text-[#f2f4f5] flex items-center gap-3">
          Sports
        </h1>
        <p className="mt-4 text-brand-muted font-semibold text-base md:text-lg max-w-3xl">
          {language === 'fr' ? 'Scores en direct et résultats, par sport et par ligue.' : 'Live scores and results, by sport and by league.'}
        </p>
      </header>

      {/* TOP SECTION: LIVE SCORES, GROUPED BY SPORT THEN LEAGUE */}
      <ArenaGroupedScores
        editorialMatches={matches}
        language={language === "en" ? "en" : "fr"}
      />

      {/* NEWS: sports reporting sits under the scores, never above them. */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b-2 border-zinc-900 dark:border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="text-[#E85D42]" size={20} />
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
              {language === "fr" ? "Actualités" : "News"}
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
                      <span>{formatRelativeDate(article.date, language)}</span>
                      <span>â€¢</span>
                      <span className="inline-flex items-center gap-1 text-[#E85D42]">
                        <Hourglass size={11} className="shrink-0 stroke-[2.2]" />
                        <span>{article.readingTime} MIN</span>
                      </span>
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

    </div>
  );
}
