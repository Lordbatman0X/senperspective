import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getSafeImageUrl } from '../lib/imageUtils';
import { formatCategory } from '../lib/utils';

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const { articles, language } = useStore();
  const [results, setResults] = useState(articles);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const lowerQ = query.trim().toLowerCase();
    
    // Add to recent searches if not empty
    if (lowerQ) {
      setRecentSearches(prev => {
        const filtered = prev.filter(q => q.toLowerCase() !== lowerQ);
        const newRecent = [query.trim(), ...filtered].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
        return newRecent;
      });
    }

    const filtered = articles.filter(a => 
      (a.title?.[language] || '').toLowerCase().includes(lowerQ) ||
      (a.excerpt?.[language] || '').toLowerCase().includes(lowerQ) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(lowerQ)))
    );
    setResults(filtered);
  }, [query, articles, language]);

  const handleRecentSearch = (searchQuery: string) => {
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col lg:flex-row gap-12">
      <div className="flex-1">
        <header className="mb-12 border-b-4 border-brand-dark pb-6">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-brand-dark mb-4">
            {language === 'fr' ? 'Recherche' : 'Search'}
          </h1>
          <p className="text-brand-muted font-semibold text-lg">
            {results.length} {language === 'fr' ? 'résultat(s) pour' : 'result(s) for'} <span className="text-brand-dark font-bold">"{query}"</span>
          </p>
        </header>

        {/* Abdel Suggestion Bar */}
        <div className="mb-12 border border-brand-primary bg-brand-soft p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-brand-dark font-bold text-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            {language === 'fr' 
              ? `Vous voulez approfondir ce sujet ? Demandez à Abdel de vous faire un résumé complet.`
              : `Want to go deeper into this topic? Ask Abdel to build a reading list.`}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-4xl">
          {results.map((article, idx) => (
            <div key={`${article.id}-${idx}`} className="square-card group flex flex-col md:flex-row h-full md:h-48 overflow-hidden border border-brand-border hover:border-brand-primary transition-colors">
              <Link to={`/article/${article.slug}`} className="block relative md:w-64 h-48 md:h-full flex-shrink-0 border-b md:border-b-0 md:border-r border-brand-border">
                <div 
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
                />
              </Link>
              <div className="p-5 flex flex-col flex-grow bg-brand-white">
                <Link to={`/article/${article.slug}`} className="flex-grow">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-2">{formatCategory(article.category, language)}</div>
                  <h3 className="font-bold text-lg text-brand-dark mb-2 leading-tight group-hover:text-brand-primary transition-colors">
                    {article.title?.[language] || 'Untitled'}
                  </h3>
                  <p className="text-sm text-brand-muted line-clamp-2">
                    {article.excerpt?.[language] || ''}
                  </p>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:w-72 lg:shrink-0 hidden lg:block">
        <div className="sticky top-24">
          <div className="glass bg-brand-white/80 p-5 border-t-4 border-brand-dark">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-brand-border">
              <h2 className="font-black uppercase tracking-widest text-brand-dark">
                {language === 'fr' ? 'Recherches Récentes' : 'Recent Searches'}
              </h2>
            </div>
            
            {recentSearches.length > 0 ? (
              <div className="space-y-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentSearch(term)}
                    className="w-full text-left px-3 py-2 text-sm text-brand-dark hover:text-brand-primary hover:bg-brand-soft border border-transparent hover:border-brand-primary/20 transition-all truncate"
                  >
                    {term}
                  </button>
                ))}
                <button
                  onClick={clearRecentSearches}
                  className="w-full mt-4 text-xs font-bold uppercase tracking-widest text-brand-muted hover:text-brand-dark transition-colors py-2 border border-brand-border hover:bg-brand-soft"
                >
                  {language === 'fr' ? 'Effacer l\'historique' : 'Clear History'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-brand-muted italic">
                {language === 'fr' ? 'Aucune recherche récente' : 'No recent searches'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Recent Searches */}
      <div className="lg:hidden w-full order-first mb-8">
        <div className="glass bg-brand-white/80 p-5 border-t-4 border-brand-dark">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-brand-border">
            <h2 className="font-black uppercase tracking-widest text-brand-dark">
              {language === 'fr' ? 'Recherches Récentes' : 'Recent Searches'}
            </h2>
          </div>
          
          {recentSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  onClick={() => handleRecentSearch(term)}
                  className="px-3 py-1.5 text-xs text-brand-dark bg-brand-soft hover:bg-brand-white border border-brand-border hover:border-brand-primary transition-colors whitespace-nowrap"
                >
                  {term}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-muted italic">
              {language === 'fr' ? 'Aucune recherche' : 'No searches'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
