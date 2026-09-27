import { FALLBACK_TAXONOMY } from './lib/siteTaxonomy';
/**
 * The application taxonomy. This used to be a 4th private copy of the category
 * list, and it had drifted again: it carried entries the site has no section for
 * (Senegal, Monde, Diplomatie, Culture, "Dossiers & Enquetes") and was missing
 * ones the site does have.
 *
 * It now re-exports the single shared fallback from lib/siteTaxonomy, so every
 * surface (Admin -> Categories, the article editor, the RSS generator, the
 * header and footer) agrees. The LIVE taxonomy in siteSettings.categories still
 * wins wherever it is available; this is only the fresh-install default.
 */
export const ARTICLE_CATEGORIES = FALLBACK_TAXONOMY;
