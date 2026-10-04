import {
  CarouselDraft,
  CarouselSocialLink,
  DEFAULT_CAROUSEL_SOCIALS,
  MAX_CAROUSEL_PARAGRAPHS,
} from './types';
import type { Article } from '../../types';
import { stripHtmlTags } from '../utils';

/** The Perspective accent, as used by the approved design. */
export const DEFAULT_ACCENT = '#FF4B1F';

/** Fallback copy so a carousel is never published half-empty. */
const PLACEHOLDER = {
  category: 'Actualité',
  title: 'Titre de l’article',
  lede: 'Le résumé de l’article apparaîtra ici.',
  bodyHeading: 'Ce qu’il faut retenir',
  quote: 'La citation de la rédaction apparaîtra ici.',
  quoteAttribution: 'La rédaction',
  tagline: 'pour plus d’analyses, de décryptages et d’actualités sur le Sénégal, l’Afrique et le monde.',
  socialHeading: 'Suivez Nous sur',
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Formats a date as the card footer shows it: "20 Septembre 2026".
 *
 * French convention capitalises the month, which is what makes this a
 * formatter rather than a `toLocaleDateString` call.
 */
export function formatCardDate(input: string | Date | undefined): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Reading time as the footer shows it: "1 min".
 *
 * Uses the article's own `readingTime` when present (the newsroom has already
 * curated it) and only falls back to counting words.
 */
export function formatReadTime(article: Partial<Article> | undefined): string {
  const explicit = article?.readingTime;
  if (typeof explicit === 'number' && explicit > 0) return `${Math.round(explicit)} min`;
  const body = stripHtmlTags(article?.body);
  const words = body ? body.trim().split(/\s+/).filter(Boolean).length : 0;
  return `${words > 0 ? Math.max(1, Math.round(words / 200)) : 1} min`;
}

/**
 * Picks the first sentence of `text`, as the cover lede needs one line.
 * Falls back to the whole string when it has no sentence break.
 */
export function firstSentence(text: string, maxChars = 220): string {
  const clean = stripHtmlTags(text).replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const match = clean.match(/^(.+?[.!?])(\s|$)/);
  const sentence = match ? match[1] : clean;
  if (sentence.length <= maxChars) return sentence;
  const cut = sentence.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * Splits an article body into card-ready paragraphs.
 *
 * The fixed template shows three, so this returns at most
 * `MAX_CAROUSEL_PARAGRAPHS`. Markdown headings and list bullets are dropped
 * rather than rendered: the template has no room for them, and a "## Section"
 * line on a card reads as a bug.
 */
export function extractParagraphs(body: unknown, limit = MAX_CAROUSEL_PARAGRAPHS): string[] {
  const raw = stripHtmlTags(body).replace(/\r\n/g, '\n');
  const blocks = raw
    .split(/\n\s*\n|\n(?=[-•*]\s)|\n(?=#{1,6}\s)/)
    .map(b => b.trim())
    .filter(Boolean)
    .filter(b => !/^#{1,6}\s/.test(b))
    .filter(b => !/^[-•*]\s/.test(b));

  const out: string[] = [];
  for (const block of blocks) {
    const text = block.replace(/\s+/g, ' ').trim();
    if (text.length >= 40) out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}
/**
 * Builds a carousel draft from an article.
 *
 * This is the whole point of the workflow: the copy already exists in the CMS,
 * so the editor picks an article and gets a complete, correctly-punctuated
 * carousel instead of retyping everything — which is how social copy and
 * article copy used to drift apart.
 */
export function buildDraftFromArticle(
  article: Article,
  socials: CarouselSocialLink[] = DEFAULT_CAROUSEL_SOCIALS,
  /**
   * Brand assets chosen by the editor, carried across an article change.
   *
   * The logo and the closing photo belong to the publication, not to the
   * article, so picking a new article must not wipe them — that is the kind of
   * silent reset that makes an editor re-upload the same file. The cover photo
   * is deliberately NOT carried over: it comes from the article itself.
   */
  keep: { logoUrl?: string; closingImage?: string } = {},
): CarouselDraft {
  const title = stripHtmlTags(article.title?.fr || article.title?.en);
  const excerpt = stripHtmlTags(article.excerpt?.fr || article.excerpt?.en);
  const body = stripHtmlTags(article.body?.fr || article.body?.en);

  // Prefer the article's own lede; fall back to the opening of the body so a
  // thin excerpt still yields a sensible cover line.
  const lede = excerpt || firstSentence(body);
  const paragraphs = extractParagraphs(article.body?.fr || article.body?.en);

  return {
    articleId: article.id,
    articleSlug: article.slug,
    category: article.category || PLACEHOLDER.category,
    title: title || PLACEHOLDER.title,
    lede: lede || PLACEHOLDER.lede,
    bodyHeading: PLACEHOLDER.bodyHeading,
    paragraphs: paragraphs.length ? paragraphs : [PLACEHOLDER.lede],
    // The quote is editorial, so it is never invented from the body — the
    // draft starts on the placeholder and the editor writes the real line.
    quote: PLACEHOLDER.quote,
    quoteAttribution: PLACEHOLDER.quoteAttribution,
    tagline: PLACEHOLDER.tagline,
    socialHeading: PLACEHOLDER.socialHeading,
    socials,
    date: formatCardDate(article.date),
    readingTime: formatReadTime(article),
    coverImage: article.featuredImage || article.imageUrl,
    logoUrl: keep.logoUrl,
    closingImage: keep.closingImage,
    accentColor: DEFAULT_ACCENT,
  };
}

/**
 * A blank draft, for starting a carousel without an article.
 * Uses the same placeholders so an empty card still looks like the template.
 */
export function emptyDraft(socials: CarouselSocialLink[] = DEFAULT_CAROUSEL_SOCIALS): CarouselDraft {
  return {
    category: PLACEHOLDER.category,
    title: PLACEHOLDER.title,
    lede: PLACEHOLDER.lede,
    bodyHeading: PLACEHOLDER.bodyHeading,
    paragraphs: [PLACEHOLDER.lede],
    quote: PLACEHOLDER.quote,
    quoteAttribution: PLACEHOLDER.quoteAttribution,
    tagline: PLACEHOLDER.tagline,
    socialHeading: PLACEHOLDER.socialHeading,
    socials,
    date: formatCardDate(new Date()),
    readingTime: '1 min',
    accentColor: DEFAULT_ACCENT,
  };
}

/**
 * Fills gaps in a draft loaded from Firestore.
 *
 * A draft saved by an older build, or by a partial write, must still render —
 * so every field falls back to the placeholder rather than showing "undefined"
 * on a published card.
 */
export function normalizeDraft(input: Partial<CarouselDraft> | null | undefined): CarouselDraft {
  const base = emptyDraft();
  if (!input) return base;

  const paragraphs = Array.isArray(input.paragraphs)
    ? input.paragraphs
        .filter(p => typeof p === 'string' && p.trim().length > 0)
        .slice(0, MAX_CAROUSEL_PARAGRAPHS)
    : [];

  // Filter first, THEN check for emptiness. Checking `input.socials.length`
  // first meant a list of entirely invalid rows yielded an empty social row on
  // the closing card instead of the house defaults — the exact "half-broken
  // card" this function exists to prevent.
  const filteredSocials = Array.isArray(input.socials)
    ? input.socials.filter(s => s && typeof s.label === 'string' && s.label.trim().length > 0 && typeof s.url === 'string')
    : [];
  const socials = filteredSocials.length ? filteredSocials : base.socials;

  return {
    ...base,
    ...input,
    category: input.category?.trim() || base.category,
    title: input.title?.trim() || base.title,
    lede: input.lede?.trim() || base.lede,
    bodyHeading: input.bodyHeading?.trim() || base.bodyHeading,
    paragraphs: paragraphs.length ? paragraphs : base.paragraphs,
    quote: input.quote?.trim() || base.quote,
    quoteAttribution: input.quoteAttribution?.trim() || base.quoteAttribution,
    tagline: input.tagline?.trim() || base.tagline,
    socialHeading: input.socialHeading?.trim() || base.socialHeading,
    socials,
    date: input.date?.trim() || base.date,
    readingTime: input.readingTime?.trim() || base.readingTime,
    accentColor: input.accentColor?.trim() || base.accentColor,
  };
}