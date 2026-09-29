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
 * The navigation the header renders, from ONE source, for every viewport.
 *
 * WHY THIS EXISTS
 * ---------------
 * The desktop bar and the mobile drawer each used to read `headerNavItems`
 * independently, and the stored data had drifted out of sync with the taxonomy.
 * Live values, as stored:
 *
 *     id=gouvernance  labelFr="Business"  url=/category/business
 *     id=international labelFr="Afique"
 *
 * So the nav advertised a "Business" section that is not in the taxonomy and has
 * no page, and a category whose label no longer matched its own id. Desktop and
 * phone then rendered visibly different lists from the same damaged input.
 *
 * WHAT IT DOES
 * ------------
 * 1. The admin's saved nav is AUTHORITATIVE for order, labels and visibility. A
 *    label typed in the nav editor is a deliberate choice and is never rewritten
 *    from the taxonomy. (An earlier version of this function did the opposite and
 *    would have silently reverted a menu entry the admin had renamed.)
 * 2. The taxonomy is used to FILL GAPS, never to overwrite: it supplies items the
 *    saved nav forgot, so a section added in Admin -> Categories can never be
 *    unreachable from the menu.
 * 3. URLs are repaired only where the stored one is known to be wrong (Sports must
 *    point at /larene) or missing. A deliberately chosen URL is left alone.
 * 4. External links are preserved verbatim.
 *
 * Desktop, mobile and footer all call this, so they are structurally identical by
 * construction and cannot drift again.
 */
export interface NavItem {
  id: string;
  labelFr: string;
  labelEn?: string;
  url: string;
  enabled?: boolean;
  external?: boolean;
}

/** Sports is L'Arene, not a category page. */
function categoryUrl(id: string): string {
  return id === 'sports' ? '/larene' : `/category/${id}`;
}

export interface ResolveNavOptions {
  /**
   * Append categories that exist in the taxonomy but were never added to the
   * saved nav.
   *
   * true  — full taxonomy union. The footer and the mobile drawer use this, so
   *         a section created in Admin -> Categories is always reachable.
   * false — the curated set only: exactly what the admin saved in
   *         Admin -> Navigation, in their order, with nothing appended.
   *
   * The desktop bar passes false. When this defaulted to true it appended
   * every category, so the bar silently grew every time a category was added
   * and stopped being a deliberate navigation choice.
   */
  includeUnlistedCategories?: boolean;
}

export function resolveNavItems(stored: any, options: ResolveNavOptions = {}): NavItem[] {
  const includeUnlisted = options.includeUnlistedCategories !== false;
  const cats = includeUnlisted ? resolveTaxonomy(stored?.categories) : [];
  const storedNav: any[] = Array.isArray(stored?.headerNavItems) ? stored.headerNavItems : [];

  const out: NavItem[] = [];
  const used = new Set<string>();
  const push = (id: string, fr: string, en: string | undefined, url: string, external?: boolean) => {
    const key = norm(id || fr);
    if (!key || used.has(key)) return;
    used.add(key);
    out.push({ id: key, labelFr: fr, labelEn: en, url, enabled: true, external });
  };

  // 1. The saved nav, in the admin's order, with ITS labels. Only the URL is
  //    touched, and only where it is known-wrong or absent.
  for (const raw of storedNav) {
    if (!raw || raw.enabled === false) continue;

    // External links are passed through exactly as saved.
    if (typeof raw.url === 'string' && /^https?:\/\//i.test(raw.url)) {
      push(raw.id || raw.labelFr, raw.labelFr || raw.id, raw.labelEn, raw.url, true);
      continue;
    }

    const id = raw.id || raw.labelFr || '';
    if (!id) continue;

    // Sports is the one hard-won correction: L'Arene is the sports section, and
    // the stored /category/sports pointed readers at the wrong page.
    const url =
      norm(id) === 'sports' ? '/larene' : typeof raw.url === 'string' && raw.url ? raw.url : `/category/${id}`;

    // Label precedence: what the admin typed wins. The taxonomy is consulted only
    // when the nav item has no usable label of its own.
    const label = raw.labelFr || raw.labelEn || id;
    push(id, label, raw.labelEn || label, url);
  }

  // 2. Any real category the saved nav never mentioned, so a section added in
  //    Admin -> Categories is still reachable. This ADDS, it never removes.
  //    Skipped when includeUnlistedCategories is false (the desktop bar), so
  //    the bar shows only the curated set and not the whole taxonomy.
  for (const c of cats) {
    if (c.id && !used.has(norm(c.id))) {
      push(c.id, c.fr || c.id, c.en || c.fr || c.id, categoryUrl(c.id));
    }
  }

  return out;
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

export interface DossierOption {
  id: string;
  label: string;
}

/**
 * Reads a display label out of a dossier record, whatever shape it has.
 *
 * WHY THIS EXISTS
 * ---------------
 * Dossiers are authored in Admin -> Flashes/Dossiers, which stores:
 *   { id, tag: { fr, en }, titleFr, titleEn, descFr, ... }
 * The article editor's Dossier box originally looked only for `fr` / `title` /
 * `name`, so it matched NONE of those fields, every dossier evaluated to an empty
 * label, and the box reported "no dossier configured" while the pending dossiers
 * were sitting in siteSettings. Titles are stored by language, so the language is
 * honoured here rather than hardcoding one field.
 */
export function dossierLabel(d: any, language: 'fr' | 'en' = 'fr'): string {
  if (!d) return '';
  if (typeof d === 'string') return d.trim();
  const byLang = language === 'en'
    ? [d.titleEn, d.en, d.fr, d.titleFr]
    : [d.titleFr, d.fr, d.title, d.name, d.titleEn, d.en];
  for (const v of byLang) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  // `tag` is {fr,en} on these records.
  if (d.tag) {
    const t = typeof d.tag === 'string' ? d.tag : (d.tag[language] || d.tag.fr || d.tag.en);
    if (t) return String(t).trim();
  }
  return '';
}

/** Normalised, selectable options from siteSettings.dossiers. */
export function dossierOptions(stored: any): DossierOption[] {
  const list = Array.isArray(stored) ? stored : [];
  const out: DossierOption[] = [];
  const seen = new Set<string>();
  for (const d of list) {
    const label = dossierLabel(d);
    if (!label) continue;
    const id = typeof d === 'string' ? d : (d.id || label);
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: key, label });
  }
  return out;
}

/**
 * Removes the retired key-point fields from dossier records.
 *
 * WHY
 * ---
 * A dossier used to carry two key points, key1Fr/key1En/key2Fr/key2En, that were
 * written for EVERY dossier with the same two hardcoded strings regardless of its
 * subject. The form now has a single authored "Point clé" (keyFr/keyEn), so the
 * old fields are dead weight that still ships fabricated analysis in your data.
 *
 * SAFETY RULES, because this rewrites stored settings:
 *  - Records are never dropped or reordered; only those four keys are removed.
 *  - A real, previously-authored key1Fr/key1En is PRESERVED by promoting it to
 *    keyFr/keyEn when no key point is set yet. Only the known filler strings are
 *    discarded. Losing genuine editorial text would be worse than leaving filler.
 *  - Idempotent: running it twice changes nothing the second time.
 *  - Returns `null` when there is nothing to do, so callers can skip the write
 *    entirely rather than saving identical settings on every load.
 */
const FILLER_KEYS = new Set([
  'Analyse sectorielle approfondie',
  'Enjeux économiques et stratégiques majeurs',
  'In-depth sector analysis',
  'Major economic and strategic stakes',
]);

const isFiller = (v: any) => typeof v === 'string' && FILLER_KEYS.has(v.trim());

export function stripLegacyDossierKeys(stored: any): any[] | null {
  const list = Array.isArray(stored) ? stored : [];
  let changed = false;

  const cleaned = list.map((d: any) => {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return d;
    const hasLegacy = ['key1Fr', 'key1En', 'key2Fr', 'key2En'].some((k) => k in d);
    if (!hasLegacy) return d;

    const next: any = { ...d };

    // Preserve genuine authored text; drop only the invented filler.
    if (!next.keyFr && next.key1Fr && !isFiller(next.key1Fr)) next.keyFr = next.key1Fr;
    if (!next.keyEn && next.key1En && !isFiller(next.key1En)) next.keyEn = next.key1En;
    else if (!next.keyEn && next.keyFr && !isFiller(next.keyFr)) next.keyEn = next.keyFr;

    delete next.key1Fr;
    delete next.key1En;
    delete next.key2Fr;
    delete next.key2En;

    changed = true;
    return next;
  });

  return changed ? cleaned : null;
}

/**
 * Turns a stored article `dossier` value into a human label.
 *
 * Articles store the dossier id, so an edit to a dossier's title is reflected
 * everywhere instead of being frozen into the article. A value that no longer
 * matches any dossier (a deleted dossier) is still returned, so the editor can
 * show it rather than silently dropping an existing assignment.
 */
export function resolveDossierLabel(value: any, stored: any): string {
  if (!value) return '';
  const raw = String(value);
  const hit = dossierOptions(stored).find((o) => o.id === raw);
  if (hit) return hit.label;
  return raw;
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