import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { formatRelativeDate } from '../lib/utils';
import { getSafeImageUrl } from '../lib/imageUtils';
import { ARTICLE_CATEGORIES } from '../constants';
import { LArenePage } from './LArenePage';

export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { articles, language } = useStore();
  
  if (categoryId === 'sports' || categoryId === 'sport' || categoryId === 'larene') {
    return <LArenePage />;
  }

  const targetCategory = ARTICLE_CATEGORIES.find(c => c.id === categoryId);

  const categoryArticles = articles.filter(
    a => {
      if (!a.isPublished) return false;
      if (categoryId === 'decryptages') {
        return (
          a.category?.toLowerCase() === 'decryptages' || 
          a.category?.toLowerCase() === 'décryptages' ||
          a.type === 'Analysis' ||
          a.type === 'Deep Dive' ||
          a.type === 'Explainer'
        );
      }
      if (targetCategory) {
        return a.category === targetCategory.fr || a.category === targetCategory.en;
      }
      return a.category?.toLowerCase() === categoryId?.toLowerCase();
    }
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [categoryId]);

  const isDecryptages = categoryId === 'decryptages';
  const catName = isDecryptages
    ? (language === 'fr' ? 'Décryptages & Grand Angles' : 'Decryptions & Deep Dives')
    : targetCategory ? (language === 'fr' ? targetCategory.fr : targetCategory.en) : (categoryArticles[0]?.category || categoryId);

  const subTitle = isDecryptages
    ? (language === 'fr' 
        ? 'Nos grandes analyses, enquêtes et décryptages stratégiques en profondeur sur les enjeux majeurs.' 
        : 'In-depth analyses, strategic decryptions, and exclusive investigative reports.')
    : (language === 'fr' ? `Tous les articles de la catégorie ${catName}` : `All articles in ${catName}`);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <header className="mb-12 border-b-4 border-brand-dark dark:border-brand-white pb-6">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-[#172033] dark:text-[#f2f4f5] flex items-center gap-3">
          {catName}
          {isDecryptages && (
            <span className="text-xs bg-[#E85D42] text-white px-3 py-1 uppercase tracking-widest font-mono rounded-full font-bold">
              Exclusive
            </span>
          )}
        </h1>
        <p className="mt-4 text-brand-muted font-semibold text-base md:text-lg max-w-3xl">
          {subTitle}
        </p>
      </header>

      {categoryArticles.length === 0 ? (
        <div className="py-20 text-center text-brand-muted">
          <p className="text-xl font-semibold mb-4">
            {language === 'fr' ? 'Aucun article trouvé.' : 'No articles found.'}
          </p>
          <Link to="/" className="btn btn-primary">{language === 'fr' ? 'Retour à l\'accueil' : 'Back to Home'}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categoryArticles.map(article => (
            <div key={article.id} className="square-card group flex flex-col h-full overflow-hidden">
              <Link to={`/article/${article.slug}`} className="block relative h-48 overflow-hidden">
                <div 
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage)})` }}
                />
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
                <div className="pt-4 mt-6 border-t border-brand-border text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  {formatRelativeDate(article.date, language)} • {article.readingTime} MIN
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
