import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { formatRelativeDate, formatCategory } from '../lib/utils';
import { getSafeImageUrl } from '../lib/imageUtils';

export function SavedPage() {
  const { articles, savedArticles, language, toggleSavedArticle } = useStore();
  
  const saved = articles.filter(a => savedArticles?.includes(a.id));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <header className="mb-12 border-b-4 border-brand-dark pb-6">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-brand-dark">
          {language === 'fr' ? 'Articles Sauvegardés' : 'Saved Articles'}
        </h1>
        <p className="mt-4 text-brand-muted font-semibold text-lg">
          {language === 'fr' ? `${saved.length} articles dans votre liste de lecture` : `${saved.length} articles in your reading list`}
        </p>
      </header>

      {saved.length === 0 ? (
        <div className="py-20 text-center border border-brand-border bg-brand-soft">
          <p className="text-lg font-semibold text-brand-muted mb-6">
            {language === 'fr' ? 'Vous n\'avez sauvegardé aucun article.' : 'You haven\'t saved any articles yet.'}
          </p>
          <Link to="/" className="btn btn-primary">{language === 'fr' ? 'Explorer' : 'Explore News'}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {saved.map((article, idx) => (
            <div key={`${article.id}-${idx}`} className="square-card group flex flex-col h-full overflow-hidden">
              <Link to={`/article/${article.slug}`} className="block relative h-48 overflow-hidden">
                <div 
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
                />
                <div className="absolute top-0 left-0 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 m-4">
                  {formatCategory(article.category, language)}
                </div>
              </Link>
              <div className="p-5 flex flex-col flex-grow">
                <Link to={`/article/${article.slug}`} className="flex-grow">
                  <h3 className="font-bold text-lg text-brand-dark mb-3 leading-tight group-hover:text-brand-primary transition-colors">
                    {article.title?.[language] || 'Untitled'}
                  </h3>
                  <p className="text-sm text-brand-muted line-clamp-3">
                    {article.excerpt?.[language] || ''}
                  </p>
                </Link>
                <div className="pt-4 mt-6 border-t border-brand-border flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                    {formatRelativeDate(article.date, language)}
                  </span>
                  <button 
                    onClick={() => toggleSavedArticle(article.id)}
                    className="text-xs font-bold uppercase text-brand-primary hover:text-brand-dark transition-colors"
                  >
                    {language === 'fr' ? 'Retirer' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
