/**
 * Builds a clean, keyword-bearing article slug.
 *
 * WHY THIS EXISTS
 * ---------------
 * Slugs were previously generated inline as:
 *     'wire-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now()
 * which produced URLs like:
 *     /article/wire--activit-s-p-troli-res-et-gazi-res-woods-1789997729096
 *
 * Four separate problems, all of which hurt how a URL reads in results:
 *
 *  1. Accents were DELETED, not transliterated. The regex runs AFTER
 *     toLowerCase(), so "é" never matches a transliteration rule and is simply
 *     dropped: "activité" became "activit", "sécurité" became "scurit". Every
 *     accented keyword was silently lost from the URL.
 *  2. `.slice(0, 40)` cut mid-word, leaving fragments like "gaz-res-woods".
 *  3. The literal "wire-" prefix added a meaningless segment.
 *  4. A 14-digit timestamp was appended to every URL.
 *
 * This transliterates accents properly (NFD + diacritic strip), collapses
 * separators, drops trailing noise, and appends a short numeric suffix ONLY when
 * needed to keep the slug unique.
 */
export function slugify(input: string, maxLength = 72): string {
  const raw = String(input || '').normalize('NFD');
  // Strip the combining diacritical marks left behind by NFD, so "é"->"e".
  const ascii = raw.replace(/[\u0300-\u036f]/g, '');
  return ascii
    .replace(/['’]/g, '')            // l'arme -> larme, not l-arme
    // ASCII-only on purpose. A permissive \p{L} class would also admit CJK,
    // Cyrillic and Arabic, which then get percent-encoded into the URL. Keeping
    // the result to [a-z0-9] means every generated slug is a plain ASCII path
    // that survives copy/paste, email and sharing unchanged.
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, maxLength)
    // Never end on a half word.
    .replace(/-[^-]*$/, '')
    .replace(/^-+|-+$/g, '');
}

/**
 * A unique slug for a new article.
 *
 * `existing` is the set of slugs already in use. A suffix is appended only on
 * collision, so a headline that is already unique keeps a clean URL with no
 * numeric noise.
 */
export function uniqueArticleSlug(
  title: string,
  existing: Iterable<string> = []
): string {
  const base = slugify(title) || 'article';
  const taken = new Set<string>();
  for (const s of existing) if (s) taken.add(String(s).toLowerCase());

  if (!taken.has(base)) return base;

  // Try short numeric suffixes before falling back to a timestamp.
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}