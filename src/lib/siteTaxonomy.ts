import { useStore } from '../store';

/**
 * THE taxonomy for the whole application.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Three surfaces each carried their own copy of the category list, with a
 * different fallback:
 *   - Admin -> Categories (TaxonomyTab)  : 10 entries, the canonical one
 *   - Admin -> Article editor             : ARTICLE_CATEGORIES
 *   - Admin -> RSS generator             : RSS_CATEGORIES (11 entries, and it
 *                                          carried labels like "Meteo & Maritime"
 *                                          that no category page exists for)
 * When the admin renames or adds a section in Admin -> Categories, the other two
 * kept offering the old value, so an article could be filed under a section that
 * does not exist — invisible on the public /category pages.
 *
 * `siteSettings.categories` (edited in Admin -> Categories) is now the single
 * source of truth. Every admin surface derives from it, live, so a taxonomy
 * change is reflected immediately everywhere without a redeploy.
 *
 * Nothing here writes: this is read-only glue, so it cannot corrupt the taxonomy.
 */

export interface TaxonomyItem {
  id: string;
  fr: string;
  en: string;
  icon?: string;
}

/**
 * Used ONLY when the site has no categories configured yet, so a fresh install
 * still has something to show. Once Admin -> Categories is saved, the stored
 * list wins entirely.
 */
export const FALLBACK_TAXONOMY: TaxonomyItem[] = [
  { id: 'politique', fr: 'Politique', en: 'Politics', icon: 'Landmark' },
  { id: 'economie', fr: 'Économie', en: 'Economics', icon: 'TrendingUp' },
  { id: 'societe', fr: 'Société', en: 'Society', icon: 'Users' },
  { id: 'international', fr: 'International', en: 'International', icon: 'Globe' },
  { id: 'tech', fr: 'Tech', en: 'Tech', icon: 'Cpu' },
  { id: 'sante', fr: 'Santé', en: 'Health', icon: 'HeartPulse' },
  { id: 'sports', fr: 'Sports', en: 'Sports', icon: 'Trophy' },
  { id: 'people', fr: 'People', en: 'People', icon: 'Smile' },
  { id: 'gouvernance', fr: 'Gouvernance', en: 'Governance', icon: 'ShieldCheck' },
  // Dossier is a first-class section, not a synonym of Décryptages: it is the
  // long-running investigation file an article belongs to. It is listed here so it
  // stays selectable in the editor even on a site whose stored taxonomy predates it.
  { id: 'dossier', fr: 'Dossier', en: 'Dossier', icon: 'FolderOpen' },
  { id: 'decryptages', fr: 'Décryptages', en: 'Decryptions', icon: 'BookOpen' },
];

const norm = (s: any) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * The live taxonomy, always. Reads straight from the store so an edit in
 * Admin -> Categories is reflected in every consumer on the next render — there
 * is no cached copy to go stale.
 */
export function useTaxonomy(): TaxonomyItem[] {
  const stored = useStore((s: any) => s.siteSettings?.categories);
  return stored && Array.isArray(stored) && stored.length > 0 ? stored : FALLBACK_TAXONOMY;
}

/** Non-hook form, for code outside React (prerender, plain helpers). */
export function resolveTaxonomy(stored: any): TaxonomyItem[] {
  return stored && Array.isArray(stored) && stored.length > 0 ? stored : FALLBACK_TAXONOMY;
}

/** The French labels, which is what articles and feeds store. */
export function taxonomyLabels(items: TaxonomyItem[]): string[] {
  return items.map((c) => c.fr).filter(Boolean);
}

/**
 * The live taxonomy UNION the fallback, deduped.
 *
 * Used by the admin selectors. The live list is authoritative and comes first, so
 * a renamed section shows its new label; the fallback is appended only to fill
 * gaps, so a section added in code (Dossier) stays selectable on a site whose
 * stored taxonomy has not been re-saved yet. Without this, adding a section here
 * would be invisible until someone re-saved Admin -> Categories.
 */
export function taxonomyOptions(stored: any): TaxonomyItem[] {
  const live = resolveTaxonomy(stored);
  const seen = new Set<string>();
  const out: TaxonomyItem[] = [];
  for (const c of [...live, ...FALLBACK_TAXONOMY]) {
    const key = norm(c.fr);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Maps any incoming category label onto the live taxonomy.
 *
 * An RSS source or an old article may carry a legacy or finer-grained label
 * ("Dossiers", "Afrique", "Tech & Innovation"). Filing under a label the site does
 * not use produces an article that appears in no category page, so those are
 * mapped onto a real section, and anything unknown falls back to the first real
 * category rather than inventing a new one.
 */
export function matchTaxonomyCategory(
  raw: string | undefined | null,
  items: TaxonomyItem[]
): string {
  const labels = taxonomyLabels(items);
  const target = String(raw ?? '').trim();
  if (!target || !labels.length) return labels[0] || 'Politique';

  const t = norm(target);
  const exact = labels.find((c) => norm(c) === t);
  if (exact) return exact;

  // Legacy and finer-grained labels that predate the current taxonomy.
  const aliases: Record<string, string> = {
    dossiers: 'Décryptages',
    decryptage: 'Décryptages',
    decryptages: 'Décryptages',
    'meteo-maritime': 'International',
    'chaloupe-transports': 'Économie',
    'culture-people': 'People',
    'tech-innovation': 'Tech',
    afrique: 'International',
    monde: 'International',
    diplomatie: 'International',
    justice: 'Gouvernance',
    business: 'Économie',
    education: 'Société',
    religion: 'Société',
    flash: 'Politique',
  };
  const aliased = aliases[t];
  if (aliased) {
    const match = labels.find((c) => norm(c) === norm(aliased));
    if (match) return match;
  }
  const partial = labels.find((c) => t.includes(norm(c)) || norm(c).includes(t));
  return partial || labels[0] || 'Politique';
}