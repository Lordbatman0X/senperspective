import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Hourglass, FolderOpen } from 'lucide-react';
import { useStore } from '../../store';
import { getSafeText, formatCategory } from '../../lib/utils';
import { resolveDossierLabel } from '../../lib/siteTaxonomy';

interface DossiersSectionProps {
  /**
   * @deprecated No longer used. Dossiers are now real articles, so a card
   * navigates to its own page. The prop was kept as optional for call-site
   * compatibility and is ignored.
   */
  onSelectDossier?: (dossier: any) => void;
}

export const DossiersSection: React.FC<DossiersSectionProps> = () => {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings);
  const accentColor = siteSettings?.accentColor || '#E85D42';

  /*
   * Dossiers come from real, published articles, never a hardcoded list.
   *
   * WHY: this block previously declared three hand-written dossiers (offshore gas,
   * Dakar real estate, UEMOA freight corridors) with invented statistics. Nothing
   * published them and they could never change. The section now reads the same
   * article store the rest of the site uses, so a dossier appears the moment an
   * editor files an article under "Dossier".
   *
   * An article qualifies when it is published and either:
   *   - its category is Dossier / Dossiers / Decryptages, or
   *   - it carries a `dossier` value (set in the editor's Dossier box).
   * Both the legacy "Dossiers" label and the current "Dossier" are accepted so
   * existing records keep appearing.
   */
  const articles = useStore((s) => s.articles) || [];
  const dossiers = useMemo(() => {
    const byDate = (a: any) => {
      const d = a.publishedAt || a.date || a.updatedAtServer || 0;
      return typeof d === 'number' ? d : new Date(d).getTime() || 0;
    };

    return articles
      .filter((a: any) => {
        if (a.isPublished === false) return false;
        const cat = String(a.category || '').trim().toLowerCase();
        const catOk = /dossier|enqu.t|decryptage/.test(cat);
        return catOk || !!a.dossier;
      })
      .sort((a: any, b: any) => byDate(b) - byDate(a))
      .slice(0, 3);
  }, [articles]);

  return (
    <section 
      id="section-dossiers" 
      aria-labelledby="heading-dossiers" 
      className="mb-12 pt-2"
    >
      <div className="border-b-4 border-brand-dark dark:border-zinc-800 pb-3 flex justify-between items-end mb-6">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 inline-block shrink-0" style={{ backgroundColor: accentColor }} />
          <h2 
            id="heading-dossiers" 
            className="text-xl md:text-2xl font-black uppercase tracking-wider text-brand-dark dark:text-zinc-100"
          >
            {language === 'fr' ? 'Grands Dossiers & Enquêtes' : 'Special Reports & Investigations'}
          </h2>
        </div>
        <Link 
          to="/category/dossiers" 
          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider hover:underline transition-colors"
          style={{ color: accentColor }}
        >
          <span>{language === 'fr' ? 'Voir tout' : 'View all'}</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/*
        Empty state. Previously the three cards were hardcoded, so this could
        never be empty; now it genuinely can be, and a blank grid would look
        like a bug. The section header is hidden with it so the page does not
        advertise an empty block.
      */}
      {dossiers.length === 0 ? (
        <div className="border border-dashed border-brand-border dark:border-zinc-800 p-8 text-center">
          <FolderOpen size={22} className="mx-auto mb-2 text-zinc-400" style={{ color: accentColor }} />
          <p className="text-sm font-bold text-brand-dark dark:text-zinc-200">
            {language === 'fr' ? 'Aucun dossier pour le moment' : 'No dossier yet'}
          </p>
          <p className="text-xs text-brand-muted dark:text-zinc-400 mt-1">
            {language === 'fr'
              ? "Classez un article sous la rubrique « Dossier » dans l'éditeur pour le publier ici."
              : 'File an article under the Dossier section in the editor to feature it here.'}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dossiers.map((dossier: any, idx: number) => {
          const title = getSafeText(dossier.title, language) || 'Sans titre';
          const desc = getSafeText(dossier.excerpt, language) || '';
          // Reading time is derived from the real body length when the record does
          // not carry one, so the figure tracks the article instead of being fixed.
          const readTime = dossier.readingTime
            ? `${dossier.readingTime} MIN`
            : `${Math.max(1, Math.round(String(dossier.body?.fr || '').split(/\s+/).filter(Boolean).length / 200))} MIN`;

          return (
            <Link
              key={dossier.id}
              to={`/article/${dossier.slug || dossier.id}`}
              className="square-card group flex flex-col justify-between bg-white dark:bg-zinc-900 border border-brand-border dark:border-zinc-800 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:border-brand-primary cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span className="text-2xl font-mono font-black" style={{ color: accentColor }}>
                    0{idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5">
                      {/* The article stores the dossier id, so resolve it to the current
                          title. Renaming a dossier then updates every article's badge
                          instead of freezing the old text into each record. */}
                      {resolveDossierLabel(dossier.dossier, siteSettings?.dossiers)
                        || formatCategory(dossier.category, language)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-muted dark:text-zinc-400">
                      <Hourglass size={10} className="shrink-0" style={{ color: accentColor }} />
                      <span>{readTime}</span>
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-base sm:text-lg text-brand-dark dark:text-zinc-100 leading-snug group-hover:text-brand-primary transition-colors mb-2 line-clamp-2">
                  {title}
                </h3>

                <p className="text-xs sm:text-sm text-brand-muted dark:text-zinc-400 font-medium leading-relaxed line-clamp-3 mb-4">
                  {desc}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-border dark:border-zinc-800 flex items-center justify-between mt-auto">
                <span 
                  className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider group-hover:underline transition-colors"
                  style={{ color: accentColor }}
                >
                  <span>{language === 'fr' ? 'Consulter le dossier' : 'Read dossier'}</span>
                  <ChevronRight size={13} />
                </span>
                <FolderOpen size={14} className="text-zinc-400 group-hover:text-brand-primary transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
      )}
    </section>
  );
};

