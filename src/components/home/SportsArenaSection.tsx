import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass } from 'lucide-react';
import { useStore } from '../../store';
import { Article } from '../../types';
import { getSafeImageUrl } from '../../lib/imageUtils';

interface SportsArenaSectionProps {
  articles: Article[];
}

export const SportsArenaSection: React.FC<SportsArenaSectionProps> = ({ articles }) => {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings);
  const { toggleSavedArticle, savedArticles } = useStore();
  const accentColor = siteSettings?.accentColor || '#E85D42';

  // Gather real sports articles
  const sportsArticles = articles.filter(a => {
    const cat = (a.category || '').toLowerCase();
    return (
      cat === 'sports' || 
      cat.includes('sport') || 
      cat.includes('arène') ||
      cat.includes('arene') ||
      cat.includes('lutte')
    );
  });

  // 4 curated, punchy items for the balanced 4-column row (NO sidebars!)
  const displayItems = [
    {
      id: 'combat-royal-modou-lo',
      slug: 'modou-lo-vs-siteu-choc-royal-arene-nationale',
      tag: language === 'fr' ? 'LUTTE LAMB' : 'WRESTLING',
      title: language === 'fr' ? 'Modou Lô vs Siteu : Choc royal à l’Arène Nationale' : 'Modou Lô vs Siteu: Royal Clash at the National Arena',
      desc: language === 'fr' ? 'Analyse tactique et ferveur populaire avant le duel au sommet de Pikine.' : 'Tactical preview and fan excitement ahead of the pinnacle bout in Pikine.',
      link: '/larene',
      readingTime: 4,
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'ligue-1-jaraaf-teungueth',
      slug: 'asc-jaraaf-vs-teungueth-fc-sommet-ligue-1',
      tag: 'LIGUE 1',
      title: language === 'fr' ? 'ASC Jaraaf vs Teungueth FC : Bataille pour le trône' : 'ASC Jaraaf vs Teungueth FC: Battle for the Crown',
      desc: language === 'fr' ? 'Duel décisif entre deux cadors pour le titre de champion du Sénégal.' : 'High-stakes clash between two title contenders for national supremacy.',
      link: '/larene',
      readingTime: 3,
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80'
    },
    ...(sportsArticles.slice(0, 2).map((art, idx) => ({
      id: art.id || `sport-${idx}`,
      slug: art.slug || art.id,
      tag: art.category?.toUpperCase() || 'SPORTS',
      title: art.title?.[language] || art.title?.fr || 'Sport Sénégal',
      desc: art.excerpt?.[language] || art.excerpt?.fr || '',
      link: `/article/${art.slug || art.id}`,
      readingTime: art.readingTime || 4,
      imageUrl: getSafeImageUrl(art.featuredImage || art.imageUrl)
    })))
  ].slice(0, 4);

  return (
    <section 
      id="section-sports" 
      aria-labelledby="heading-sports" 
      className="mb-12 pt-2"
    >
      <div className="border-b-4 border-brand-dark dark:border-zinc-800 pb-3 flex justify-between items-end mb-6">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 inline-block shrink-0" style={{ backgroundColor: accentColor }} />
          <h2 
            id="heading-sports" 
            className="text-xl md:text-2xl font-black uppercase tracking-wider text-brand-dark dark:text-zinc-100"
          >
            {language === 'fr' ? "L'Arène & Sports" : 'Sports & Arena'}
          </h2>
        </div>
        <Link 
          to="/larene" 
          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider hover:underline transition-colors"
          style={{ color: accentColor }}
        >
          <span>{language === 'fr' ? 'Voir tout' : 'View all'}</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Clean full-width 4-column grid matching upper page layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayItems.map((item) => {
          const isSaved = savedArticles?.includes(item.id) || false;

          return (
            <div 
              key={item.id}
              className="square-card group flex flex-col h-full bg-white dark:bg-zinc-900 border border-brand-border dark:border-zinc-800 shadow-sm relative overflow-hidden transition-all duration-300 hover:border-brand-primary"
            >
              <Link 
                to={item.link}
                className="block relative h-44 sm:h-48 overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800"
              >
                <div 
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${item.imageUrl})` }}
                />
                <div 
                  className="absolute top-3 left-3 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 shadow-md z-10"
                  style={{ backgroundColor: accentColor }}
                >
                  {item.tag}
                </div>
              </Link>

              <div className="p-5 flex flex-col flex-grow justify-between">
                <div className="flex-grow space-y-2 mb-4">
                  <Link to={item.link}>
                    <h3 className="font-black text-base sm:text-lg text-brand-dark dark:text-zinc-100 group-hover:text-brand-primary transition-colors leading-snug line-clamp-2 mb-2">
                      {item.title}
                    </h3>
                  </Link>
                  <p className="text-xs sm:text-sm text-brand-muted dark:text-zinc-400 font-medium leading-relaxed line-clamp-3">
                    {item.desc}
                  </p>
                </div>

                <div className="border-t border-brand-border dark:border-zinc-800 pt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-brand-muted dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1 font-bold" style={{ color: accentColor }}>
                    <Hourglass size={11} className="shrink-0 stroke-[2.2]" />
                    <span>{item.readingTime} MIN</span>
                  </span>

                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSavedArticle(item.id);
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
