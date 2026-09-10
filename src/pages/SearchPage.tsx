import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { getSafeImageUrl } from '../lib/imageUtils';
import { formatCategory } from '../lib/utils';
import { User, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const { articles, language } = useStore();
  const { allUsers } = useAuth();
  const [articleResults, setArticleResults] = useState(articles);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) setRecentSearches(safeJsonParse<string[]>(stored, []));
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

    if (lowerQ) {
      const filteredArticles = articles.filter(a => 
        (a.title?.[language] || a.title?.fr || '').toLowerCase().includes(lowerQ) ||
        (a.excerpt?.[language] || a.excerpt?.fr || '').toLowerCase().includes(lowerQ) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(lowerQ))) ||
        (a.category && a.category.toLowerCase().includes(lowerQ))
      );
      setArticleResults(filteredArticles);

      const filteredUsers = (allUsers || []).filter(u => 
        (u.name || '').toLowerCase().includes(lowerQ) ||
        (u.email || '').toLowerCase().includes(lowerQ) ||
        (u.role || '').toLowerCase().includes(lowerQ) ||
        (u.bio || '').toLowerCase().includes(lowerQ)
      );
      setUserResults(filteredUsers);
    } else {
      setArticleResults(articles);
      setUserResults([]);
    }
  }, [query, articles, allUsers, language]);

  const handleRecentSearch = (searchQuery: string) => {
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const totalResults = articleResults.length + userResults.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col lg:flex-row gap-12 font-sans">
      <div className="flex-1 min-w-0">
        <header className="mb-10 border-b-4 border-brand-dark pb-6">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-brand-dark dark:text-white mb-2">
            {language === 'fr' ? 'Recherche' : 'Search'}
          </h1>
          <p className="text-brand-muted dark:text-zinc-400 font-semibold text-base">
            {totalResults} {language === 'fr' ? 'résultat(s) pour' : 'result(s) for'} <span className="text-brand-dark dark:text-white font-bold">"{query}"</span>
          </p>
        </header>

        {/* Section 1: Network Users Matching Query */}
        {userResults.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <User size={18} className="text-[#E85D42]" />
              <h2 className="text-lg font-serif font-black uppercase tracking-widest text-brand-dark dark:text-white">
                {language === 'fr' ? `Membres du Réseau (${userResults.length})` : `Network Members (${userResults.length})`}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userResults.map((usr) => (
                <div key={usr.email} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-xs hover:border-[#E85D42] transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-[#E85D42] text-white font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {(usr.name || usr.email || "U").substring(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/profile/${encodeURIComponent(usr.email)}`} className="font-serif font-extrabold text-sm text-brand-dark dark:text-zinc-100 hover:text-[#E85D42] truncate block">
                        {usr.name || (usr.email ?? '').split('@')[0]}
                      </Link>
                      <p className="text-xs text-zinc-500 font-mono truncate">{usr.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#E85D42]/10 text-[#E85D42] border border-[#E85D42]/20 rounded-xs">
                        {usr.role || 'Membre'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/profile/${encodeURIComponent(usr.email)}`}
                      className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-[#E85D42] hover:text-white text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-1"
                    >
                      <span>{language === 'fr' ? 'Profil' : 'Profile'}</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 2: Articles Matching Query */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h2 className="text-lg font-serif font-black uppercase tracking-widest text-brand-dark dark:text-white">
              {language === 'fr' ? `Articles (${articleResults.length})` : `Articles (${articleResults.length})`}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 max-w-4xl">
            {articleResults.map((article, idx) => (
              <div key={`${article.id}-${idx}`} className="square-card group flex flex-col md:flex-row h-full md:h-48 overflow-hidden border border-brand-border hover:border-[#E85D42] transition-colors">
                <Link to={`/article/${article.slug || article.id}`} className="block relative md:w-64 h-48 md:h-full flex-shrink-0 border-b md:border-b-0 md:border-r border-brand-border">
                  <div 
                    className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
                  />
                </Link>
                <div className="p-5 flex flex-col flex-grow bg-brand-white dark:bg-zinc-900 text-brand-dark dark:text-zinc-100">
                  <Link to={`/article/${article.slug || article.id}`} className="flex-grow">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#E85D42] mb-2">{formatCategory(article.category, language)}</div>
                    <h3 className="font-bold text-lg text-brand-dark dark:text-zinc-100 mb-2 leading-tight group-hover:text-[#E85D42] transition-colors">
                      {article.title?.[language] || article.title?.fr || 'Untitled'}
                    </h3>
                    <p className="text-sm text-brand-muted dark:text-zinc-400 line-clamp-2">
                      {article.excerpt?.[language] || article.excerpt?.fr || ''}
                    </p>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="lg:w-72 lg:shrink-0 hidden lg:block">
        <div className="sticky top-24">
          <div className="glass bg-brand-white/80 dark:bg-zinc-900/80 p-5 border-t-4 border-brand-dark">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-brand-border">
              <h2 className="font-black uppercase tracking-widest text-brand-dark dark:text-white">
                {language === 'fr' ? 'Recherches Récentes' : 'Recent Searches'}
              </h2>
            </div>
            
            {recentSearches.length > 0 ? (
              <div className="space-y-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentSearch(term)}
                    className="w-full text-left px-3 py-2 text-sm text-brand-dark dark:text-zinc-200 hover:text-[#E85D42] hover:bg-brand-soft border border-transparent hover:border-[#E85D42]/20 transition-all truncate"
                  >
                    {term}
                  </button>
                ))}
                <button
                  onClick={clearRecentSearches}
                  className="w-full mt-4 text-xs font-bold uppercase tracking-widest text-brand-muted hover:text-brand-dark dark:hover:text-white transition-colors py-2 border border-brand-border hover:bg-brand-soft"
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
        <div className="glass bg-brand-white/80 dark:bg-zinc-900/80 p-5 border-t-4 border-brand-dark">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-brand-border">
            <h2 className="font-black uppercase tracking-widest text-brand-dark dark:text-white">
              {language === 'fr' ? 'Recherches Récentes' : 'Recent Searches'}
            </h2>
          </div>
          
          {recentSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  onClick={() => handleRecentSearch(term)}
                  className="px-3 py-1.5 text-xs text-brand-dark dark:text-zinc-200 bg-brand-soft hover:bg-brand-white border border-brand-border hover:border-[#E85D42] transition-colors whitespace-nowrap"
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

