import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass } from 'lucide-react';
import { useStore } from '../../store';
import { Article } from '../../types';
import { getSafeImageUrl } from '../../lib/imageUtils';
import { formatRelativeDate } from '../../lib/utils';

interface DecryptagesSectionProps {
  articles: Article[];
}

export const DecryptagesSection: React.FC<DecryptagesSectionProps> = ({ articles }) => {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings);
  const { toggleSavedArticle, savedArticles } = useStore();
  const accentColor = siteSettings?.accentColor || '#E85D42';

  // Filter specifically for analytical pieces or politics/economy deep dives
  const decryptages = articles.filter(a => 
    a.category?.toLowerCase() === 'decryptages' || 
    a.category?.toLowerCase() === 'décryptages' ||
    (a as any).type === 'Analysis' ||
    (a as any).type === 'Deep Dive' ||
    (a as any).type === 'Explainer'
  );

  const displayList = decryptages.length >= 3 
    ? decryptages.slice(0, 3) 
    : [
        ...decryptages,
        ...articles.filter(a => !decryptages.some(d => d.id === a.id) && (a.category === 'Politique' || a.category === 'Économie'))
      ].slice(0, 3);

  if (displayList.length === 0) return null;

  return (
    <section 
      id="section-decryptages" 
      aria-labelledby="heading-decryptages" 
      className="mb-12 pt-2"
    >
      <div className="border-b-4 border-brand-dark dark:border-zinc-800 pb-3 flex justify-between items-end mb-6">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 inline-block shrink-0" style={{ backgroundColor: accentColor }} />
          <h2 
            id="heading-decryptages" 
            className="text-xl md:text-2xl font-black uppercase tracking-wider text-brand-dark dark:text-zinc-100"
          >
            {language === 'fr' ? 'Décryptages & Analyses' : 'Analysis & Insights'}
          </h2>
        </div>
        <Link 
          to="/category/decryptages" 
          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider hover:underline transition-colors"
          style={{ color: accentColor }}
        >
          <span>{language === 'fr' ? 'Voir tout' : 'View all'}</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayList.map((art) => {
          const title = art.title?.[language] || art.title?.fr || 'Sans titre';
          const excerpt = art.excerpt?.[language] || art.excerpt?.fr || '';
          const imgUrl = getSafeImageUrl(art.featuredImage || art.imageUrl);
          const isSaved = savedArticles?.includes(art.id) || false;

          return (
            <div 
              key={art.id} 
              className="square-card group flex flex-col h-full bg-white dark:bg-zinc-900 border border-brand-border dark:border-zinc-800 shadow-sm relative overflow-hidden transition-all duration-300 hover:border-brand-primary"
            >
              <Link 
                to={`/article/${art.slug || art.id}`}
                className="block relative h-48 sm:h-52 overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800"
              >
                <div 
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${imgUrl})` }}
                />
                <div 
                  className="absolute top-3 left-3 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 shadow-md z-10"
                  style={{ backgroundColor: accentColor }}
                >
                  {language === 'fr' ? 'ANALYSE' : 'ANALYSIS'}
                </div>
              </Link>

              <div className="p-5 flex flex-col flex-grow justify-between">
                <div className="flex-grow space-y-2 mb-4">
                  <Link to={`/article/${art.slug || art.id}`}>
                    <h3 className="font-black text-base sm:text-lg md:text-xl text-brand-dark dark:text-zinc-100 group-hover:text-brand-primary transition-colors leading-snug line-clamp-2 mb-2">
                      {title}
                    </h3>
                  </Link>
                  <p className="text-xs sm:text-sm text-brand-muted dark:text-zinc-400 font-medium leading-relaxed line-clamp-3">
                    {excerpt}
                  </p>
                </div>

                <div className="border-t border-brand-border dark:border-zinc-800 pt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-brand-muted dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <span className="truncate">{art.author || 'Rédaction'}</span>
                    <span>•</span>
                    <span>{formatRelativeDate(art.date, language)}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 shrink-0 font-bold" style={{ color: accentColor }}>
                      <Hourglass size={11} className="shrink-0 stroke-[2.2]" />
                      <span>{art.readingTime || 5} MIN</span>
                    </span>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSavedArticle(art.id);
                    }}
                    className={`p-1.5 -mr-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-brand-dark dark:text-zinc-300 hover:text-brand-primary transition-all shrink-0 ${isSaved ? 'text-brand-primary dark:text-brand-primary' : ''}`}
                    title={isSaved ? "Article sauvegardé" : "Sauvegarder l'article"}
                    aria-label="Save article"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
