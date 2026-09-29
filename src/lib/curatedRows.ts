/**
 * Resolves curated ticker / sidebar rows for the "select an existing article"
 * workflow.
 *
 * WHY: the Live Ticker and the Le Monde / Global Briefs boxes used to be typed
 * from scratch in the admin — title, excerpt and body all re-entered by hand
 * for every row, duplicating articles that already existed. The admin now picks
 * an existing article instead, so the row stores a reference (`articleId`) and
 * the display text is derived from the article at render time.
 *
 * Every field stays OPTIONAL and overridable. A row that was typed by hand
 * (no `articleId`) renders exactly as it always has, which is what keeps the
 * existing data in /site_settings valid without a migration. An override wins
 * over the article's own text so the admin can still write a punchier ticker
 * line for a given story.
 *
 * `articleUrl` is what the public renderers use to make a row clickable. Rows
 * with no article and no explicit link stay unlinked, as before.
 */

export interface CuratedArticle {
  id?: string;
  slug?: string;
  title?: { fr?: string; en?: string } | string | any;
  excerpt?: { fr?: string; en?: string } | string | any;
  category?: string;
  readingTime?: number;
}

export interface CuratedRow {
  id?: string;
  time?: string;
  level?: string;
  tagFr?: string;
  tagEn?: string;
  titleFr?: string;
  titleEn?: string;
  excerptFr?: string;
  excerptEn?: string;
  contentFr?: string;
  contentEn?: string;
  /** NEW: reference to the article this row was built from. */
  articleId?: string;
  slug?: string;
  link?: string;
}

export type ResolvedRow = {
  text: string;
  badge: string;
  tag: string;
  time: string;
  /** Secondary line (a brief's excerpt). Empty when there is none. */
  excerpt: string;
  url?: string;
  /** True when the row is backed by a real article, so the UI can link it. */
  linked: boolean;
  hasOverride: boolean;
};

/** Reads `{ fr, en }` or a plain string, honouring the active language. */
function pickLang(field: any, language: 'fr' | 'en'): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return String(field[language] ?? field.fr ?? field.en ?? '');
}

/**
 * Find the article a row points at. Matches on id first, then slug, so a row
 * keeps resolving even if the stored reference was a slug.
 */
export function findCuratedArticle(
  row: CuratedRow,
  articles: CuratedArticle[] | null | undefined
): CuratedArticle | null {
  if (!row?.articleId || !articles?.length) return null;
  const ref = String(row.articleId).trim();
  if (!ref) return null;
  return (
    articles.find((a) => a?.id === ref) ||
    articles.find((a) => a?.slug === ref) ||
    null
  );
}

/**
 * Resolve one curated row into the fields the public renderers display.
 *
 * Precedence is override > linked article > whatever was typed by hand. That
 * ordering is deliberate: an explicit admin edit is always the strongest
 * signal, and a legacy hand-typed row keeps rendering as it did.
 */
export function resolveCuratedRow(
  row: CuratedRow,
  articles: CuratedArticle[] | null | undefined,
  language: 'fr' | 'en',
  opts: { kind: 'ticker' | 'brief' } = { kind: 'brief' }
): ResolvedRow {
  const art = findCuratedArticle(row, articles);

  const artTitle = pickLang(art?.title, language);
  const artExcerpt = pickLang(art?.excerpt, language);

  // Ticker rows and briefs both lead with the article's TITLE. The ticker used
  // to lead with the excerpt because hand-typed flashes carried a body-like
  // string in contentFr/contentEn; when a row is built from an article the
  // headline is the right thing for a one-line ticker, and the excerpt is long
  // for that slot.
  const artBody = artTitle || artExcerpt;

  const handTyped = opts.kind === 'ticker'
    ? String(row.contentFr || row.contentEn || '').trim()
    : String(row.titleFr || row.titleEn || '').trim();

  const override = opts.kind === 'ticker'
    ? String((language === 'fr' ? row.contentFr : row.contentEn) || '').trim()
    : String((language === 'fr' ? row.titleFr : row.titleEn) || '').trim();

  const text = override || handTyped || artBody || '';

  // Secondary line: briefs show an excerpt, tickers do not.
  const excerpt =
    opts.kind === 'brief'
      ? String(
          (language === 'fr' ? row.excerptFr : row.excerptEn) ||
          (artExcerpt && artExcerpt !== text ? artExcerpt : '') ||
          ''
        ).trim()
      : '';

  const tag = language === 'fr'
    ? String(row.tagFr || art?.category || '')
    : String(row.tagEn || art?.category || '');

  const url =
    row.link ||
    (art?.slug ? `/article/${art.slug}` : art?.id ? `/article/${art.id}` : undefined);

  return {
    text,
    badge: String(row.time || '').trim(),
    tag,
    time: String(row.time || '').trim(),
    excerpt,
    url,
    linked: !!art,
    hasOverride: !!override && override !== (artBody || ''),
  };
}
