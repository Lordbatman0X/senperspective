import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { useStore } from '../store';
import { formatRelativeDate } from '../lib/utils';
import { getSafeImageUrl } from '../lib/imageUtils';
import { ARTICLE_CATEGORIES } from '../constants';
import { LArenePage } from './LArenePage';
import { useSEO } from '../hooks/useSEO';

export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { articles, language, siteSettings } = useStore();
  const normalizedId = (categoryId || "").toLowerCase().trim();
  const accentColor = siteSettings?.accentColor || '#E85D42';
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [categoryId]);

  if (normalizedId === "sports" || normalizedId === "sport" || normalizedId === "larene" || normalizedId === "arene") {
    return <LArenePage />;
  }

  const categoriesList = (siteSettings?.categories && siteSettings.categories.length > 0) ? siteSettings.categories : ARTICLE_CATEGORIES;
  const targetCategory = categoriesList.find(c => c.id === normalizedId);

  const isDecryptages = normalizedId === 'decryptages' || normalizedId === 'décryptages';
  const isDossiers = normalizedId === 'dossiers' || normalizedId === 'dossier' || normalizedId === 'enquetes';
  const isSociete = normalizedId === 'societe' || normalizedId === 'société' || normalizedId === 'people';
  const isSenegal = normalizedId === 'senegal' || normalizedId === 'sénégal';
  const isMonde = normalizedId === 'monde' || normalizedId === 'international';

  const categoryArticles = (articles ?? []).filter(
    a => {
      if (!a.isPublished) return false;
      const catLower = (a.category || '').toLowerCase();
      
      if (isDecryptages) {
        return (
          catLower === 'decryptages' || 
          catLower === 'décryptages' ||
          a.type === 'Analysis' ||
          a.type === 'Deep Dive' ||
          a.type === 'Explainer'
        );
      }

      if (isDossiers) {
        return (
          catLower.includes('dossier') ||
          catLower.includes('enquête') ||
          catLower.includes('investigation') ||
          a.type === 'Deep Dive'
        );
      }

      if (isSociete) {
        return (
          catLower === 'societe' ||
          catLower === 'société' ||
          catLower === 'people' ||
          catLower === 'culture' ||
          catLower === 'art'
        );
      }

      if (isSenegal) {
        return (
          catLower === 'politique' ||
          catLower === 'economie' ||
          catLower === 'économie' ||
          catLower === 'societe' ||
          catLower === 'société' ||
          catLower === 'senegal' ||
          catLower === 'sénégal' ||
          catLower === 'gouvernance'
        );
      }

      if (isMonde) {
        return catLower === 'international' || catLower === 'monde' || catLower === 'world';
      }

      if (targetCategory) {
        return (
          catLower === targetCategory.id.toLowerCase() ||
          catLower === targetCategory.fr.toLowerCase() ||
          catLower === targetCategory.en.toLowerCase() ||
          a.category === targetCategory.fr ||
          a.category === targetCategory.en
        );
      }
      return catLower === normalizedId;
    }
  );

  let catName = '';
  let subTitle = '';

  if (isDecryptages) {
    catName = language === 'fr' ? 'Décryptages & Grand Angles' : 'Decryptions & Deep Dives';
    subTitle = language === 'fr' 
      ? 'Nos grandes analyses, enquêtes et décryptages stratégiques en profondeur sur les enjeux majeurs.' 
      : 'In-depth analyses, strategic decryptions, and exclusive investigative reports.';
  } else if (isDossiers) {
    catName = language === 'fr' ? 'Dossiers & Enquêtes' : 'Dossiers & Investigations';
    subTitle = language === 'fr'
      ? 'Grands formats, enquêtes de fond et investigations exclusives au Sénégal et dans la sous-région.'
      : 'Long-form investigative journalism and special reports in Senegal and West Africa.';
  } else if (isSociete) {
    catName = language === 'fr' ? 'Société & People' : 'Society & People';
    subTitle = language === 'fr'
      ? 'Tendances urbaines, culture, vie quotidienne, initiatives citoyennes et figures marquantes au Sénégal.'
      : 'Urban lifestyle, culture, daily life, grassroots initiatives, and prominent figures in Senegal.';
  } else if (isSenegal) {
    catName = language === 'fr' ? 'Sénégal' : 'Senegal';
    subTitle = language === 'fr'
      ? 'Toute l’actualité nationale du Sénégal : politique, réformes, économie et société.'
      : 'Comprehensive national news from Senegal: politics, governance, economy, and society.';
  } else if (isMonde) {
    catName = language === 'fr' ? 'Monde & International' : 'World & International';
    subTitle = language === 'fr'
      ? 'Actualités géopolitiques, diplomatie et grands enjeux internationaux avec un regard africain.'
      : 'Geopolitical developments, diplomacy, and global affairs through an African perspective.';
  } else if (targetCategory) {
    catName = language === 'fr' ? targetCategory.fr : targetCategory.en;
    subTitle = language === 'fr' ? `Tous les articles de la catégorie ${catName}` : `All articles in ${catName}`;
  } else {
    catName = categoryArticles[0]?.category || (normalizedId.charAt(0).toUpperCase() + normalizedId.slice(1));
    subTitle = language === 'fr' ? `Tous les articles de la catégorie ${catName}` : `All articles in ${catName}`;
  }

  const seoTitle = isDecryptages
    ? 'Décryptages & Grand Angles — Analyses | SenPerspective'
    : isDossiers
    ? 'Dossiers & Enquêtes — Grands Formats | SenPerspective'
    : isSociete
    ? 'Société & People — Actualités & Culture | SenPerspective'
    : `${catName} — Actualités | SenPerspective`;

  const canonicalUrl = `https://senperspective.com/category/${normalizedId}`;

  useSEO({
    title: seoTitle,
    description: subTitle,
    canonical: canonicalUrl,
    breadcrumbs: [
      { name: 'Accueil', url: 'https://senperspective.com/' },
      { name: catName, url: canonicalUrl }
    ]
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <header className="mb-12 border-b-4 border-brand-dark dark:border-zinc-800 pb-6">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-[#172033] dark:text-[#f2f4f5] flex items-center gap-3">
          {catName}
          {isDecryptages && (
            <span 
              className="text-xs text-white px-3 py-1 uppercase tracking-widest font-mono rounded-full font-bold"
              style={{ backgroundColor: accentColor }}
            >
              Exclusive
            </span>
          )}
        </h1>
        <p className="mt-4 text-brand-muted dark:text-zinc-400 font-semibold text-base md:text-lg max-w-3xl">
          {subTitle}
        </p>
      </header>

      {categoryArticles.length === 0 ? (
        <div className="py-20 text-center text-brand-muted dark:text-zinc-400">
          <p className="text-xl font-semibold mb-4">
            {language === 'fr' ? 'Aucun article trouvé dans cette rubrique.' : 'No articles found in this category.'}
          </p>
          <Link to="/" className="btn btn-primary">
            {language === 'fr' ? 'Retour à l\'accueil' : 'Back to Home'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categoryArticles.map((article, idx) => (
            <div key={`${article.id}-${idx}`} className="square-card group flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900 border border-brand-border dark:border-zinc-800 shadow-sm">
              <Link to={`/article/${article.slug || article.id}`} className="block relative h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <div 
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
                />
              </Link>
              <div className="p-5 flex flex-col flex-grow justify-between">
                <Link to={`/article/${article.slug || article.id}`} className="flex-grow">
                  <h3 className="font-bold text-lg text-brand-dark dark:text-zinc-100 mb-3 leading-tight group-hover:text-brand-primary transition-colors">
                    {article.title?.[language] || article.title?.fr || 'Untitled'}
                  </h3>
                  <p className="text-sm text-brand-muted dark:text-zinc-400 line-clamp-3">
                    {article.excerpt?.[language] || article.excerpt?.fr || ''}
                  </p>
                </Link>
                <div className="pt-4 mt-6 border-t border-brand-border dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-brand-muted dark:text-zinc-400 flex items-center justify-between">
                  <span>{formatRelativeDate(article.date, language)}</span>
                  <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: accentColor }}>
                    <Hourglass size={12} className="shrink-0 stroke-[2.2]" />
                    <span>{article.readingTime || 5} MIN</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
