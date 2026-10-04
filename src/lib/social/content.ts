export interface ResolvedContent {
  /** French only. */
  title: string;
  excerpt: string;
  category: string;
  author: string;
  dateLabel: string;
  readingTime: number;
  image: string;
  tags: string[];
  url: string;
  slug: string;
  /** Body split into short blocks, for the "Le Brief" template. */
  paragraphs: string[];
  /** Sections detected in the body, for detail cards. */
  sections: Array<{ heading: string; body: string }>;
}

export const SITE_ORIGIN = 'https://senperspective.com';

/**
 * The nearest sections that carry text underneath.
 *
 * Headings whose section is empty are skipped: a body whose only H2 is
 * "Conclusion" should produce one card section, not two empty ones.
 */
function extractSections(body: string, limit: number): Array<{ heading: string; body: string }> {
  const clean = body || '';
  const headingRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const matches: Array<{ heading: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(clean))) {
    matches.push({ heading: stripHtml(m[2]), start: m.index, end: m.index + m[0].length });
  }
  if (matches.length === 0) return [];

  const out: Array<{ heading: string; body: string }> = [];
  for (let i = 0; i < matches.length && out.length < limit; i++) {
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].start : clean.length;
    const bodyText = stripHtml(clean.slice(matches[i].end, bodyEnd));
    if (!matches[i].heading || !bodyText) continue;
    out.push({ heading: matches[i].heading, body: bodyText });
  }
  return out;
}

export function resolveContent(source: SocialSource): ResolvedContent {
  // FR is preferred, with EN as a deliberate fallback: a card must never be
  // blank just because the French translation has not been written yet.
  const titleFr = stripHtml(source.title?.fr) || stripHtml(source.title?.en) || '';
  const excerptFr = stripHtml(source.excerpt?.fr) || stripHtml(source.excerpt?.en) || '';
  const bodyFr = source.body?.fr || source.body?.en || '';
  const slug = source.slug || '';

  const paragraphs = bodyFr
    .split(/<\/p>/i)
    .map(p => stripHtml(p))
    .filter(p => p.length > 40);

  return {
    title: titleFr,
    excerpt: excerptFr || firstSentences(bodyFr, 2),
    category: source.category || '',
    author: source.author || 'La rédaction',
    dateLabel: formatDateFr(source.date),
    readingTime: source.readingTime || 0,
    image: source.featuredImage || '',
    tags: (source.tags || []).filter(Boolean),
    slug,
    url: slug ? `${SITE_ORIGIN}/${slug}` : SITE_ORIGIN,
    paragraphs: paragraphs.length ? paragraphs : (excerptFr ? [excerptFr] : []),
    sections: extractSections(bodyFr, 3),
  };
}

/**
 * The French text each template slot should start with.
 *
 * Templates receive these as INITIAL text only. Once the editor edits a text
 * layer, that literal becomes part of the saved document and is never
 * regenerated — otherwise typing would be undone the next time it opens.
 */
export function templateCopy(
  templateId: 'cover' | 'brief' | 'closing' | 'blank',
  content: ResolvedContent,
): Record<string, string> {
  const head = content.title || content.excerpt;
  switch (templateId) {
    case 'cover':
      return {
        eyebrow: content.category.toUpperCase(),
        headline: head,
        excerpt: truncate(content.excerpt, 180),
        byline: content.author,
      };
    case 'brief':
      return {
        eyebrow: content.category.toUpperCase(),
        headline: head,
        body1: content.paragraphs[0] || content.excerpt,
        body2: content.paragraphs[1] || content.sections[0]?.body || '',
      };
    case 'closing':
      return {
        headline: content.excerpt ? `« ${truncate(content.excerpt, 140)} »` : head,
        byline: `— ${content.author}`,
        cta: 'Pour plus d’analyses, de décryptages et de regards sur l’actualité ouest-africaine :',
      };
    case 'blank':
    default:
      return { headline: head };
  }
}

/**
 * Resolve the text a bound layer should display.
 *
 * Runs at RENDER time, not at design time. This is the mechanism behind "the
 * card follows the article": a layer bound to `title` shows whatever the title
 * is right now, with no stored copy to go stale.
 */
export function resolveBoundText(
  binding: TextBinding | undefined,
  content: ResolvedContent,
  index: number | undefined,
): string | null {
  if (!binding) return null;
  const i = index ?? 0;
  switch (binding) {
    case 'title': return content.title;
    case 'excerpt': return content.excerpt;
    case 'category': return content.category;
    case 'author': return content.author;
    case 'date': return content.dateLabel;
    case 'readingTime': return content.readingTime ? `${content.readingTime} min` : '';
    case 'sectionHeading': return content.sections[i]?.heading ?? '';
    case 'sectionBody': return content.sections[i]?.body ?? '';
    default: return null;
  }
}

/** Every text layer in a card, in painting order. */
export function textLayers(layers: Array<{ kind: string }>): TextLayer[] {
  return layers.filter((l): l is TextLayer => l.kind === 'text');
}
/**
 * Resolves the source content an editor picked — a saved Article, or an ad hoc
 * scratch object — into the exact strings a card renders.
 *
 * Card artwork is FRENCH ONLY (a deliberate product decision), so every function
 * here returns the FR string without a language switch. Captions, which are
 * bilingual, live in `captions.ts`.
 *
 * IMPORTANT: this module never mutates the Article it is given. The design
 * document stores overrides only, so a card always shows the article's CURRENT
 * title rather than a copy frozen at design time.
 */

import type { AdHocSource, TextBinding, TextLayer } from '../../types/social';
import type { Article } from '../../types';

export type SocialSource = Article | AdHocSource;

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Strip HTML tags and collapse whitespace. Article bodies are rich text. */
export function stripHtml(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** First N sentences of a plain-text body, without cutting a word in half. */
export function firstSentences(text: string, count: number): string {
  const clean = stripHtml(text);
  if (!clean) return '';
  const parts = clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g);
  if (!parts) return clean;
  // Each match carries the whitespace that preceded it but not the whitespace
  // that follows, so trim per part and re-join with a single space. Joining
  // raw would produce "Un.  Deux.".
  return parts.map(p => p.trim()).filter(Boolean).slice(0, count).join(' ');
}

/** Trim to a hard character ceiling on a word boundary, adding an ellipsis. */
export function truncate(text: string, maxChars: number): string {
  const clean = stripHtml(text);
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${base.replace(/[\s,;:.—-]+$/, '')}…`;
}

/** "12 juin 2026" — no locale lookup, so output never depends on the machine. */
export function formatDateFr(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}