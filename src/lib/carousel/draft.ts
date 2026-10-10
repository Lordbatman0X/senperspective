import {
  CarouselAiCopy,
  CarouselCardKind,
  CarouselDraft,
  CarouselSocialLink,
  CAROUSEL_SIZE,
  DEFAULT_CAROUSEL_SOCIALS,
  MAX_CAROUSEL_PARAGRAPHS,
  CarouselAiCopyLang,
} from './types';
import type { Article } from '../../types';
import { sanitizeTextSizes } from './layout';
import { stripHtmlTags } from '../utils';

/**
 * The Perspective accent, as used by the approved design.
 *
 * `#E8490F` is the ember of the reference cards' rule, cover wordmark and
 * active pagination dot. The `#B8471F` that used to live here was a duller
 * brick — never editor-chosen (there is no colour picker), just a hard-coded
 * value that made every card read colder than the design; `normalizeDraft`
 * migrates it so already-saved drafts pick up the right colour too.
 */
export const DEFAULT_ACCENT = '#E8490F';

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
 * Cleans AI-written card copy so a sloppy model response cannot break a card.
 *
 * Everything is coerced to trimmed strings, guillemets are stripped from the
 * quote (the renderer adds them, so keeping the model's would double them), and
 * paragraphs are capped and filtered. A model returning `null`, numbers, or
 * twelve paragraphs yields an empty/short object rather than a broken card.
 */
export function sanitizeAiCopy(input: unknown): { fr: Required<Omit<CarouselAiCopyLang, 'paragraphs'>> & { paragraphs: string[] }; en: Required<Omit<CarouselAiCopyLang, 'paragraphs'>> & { paragraphs: string[] } } {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  // Legacy flat shape (pre-bilingual): treat as the French block.
  const hasLangBlocks = src.fr && typeof src.fr === 'object' || src.en && typeof src.en === 'object';
  const frSrc = (hasLangBlocks ? (src.fr as Record<string, unknown>) : src) || {};
  // `|| {}` on BOTH branches: a model that returns only the `fr` block (or only
  // `en`) still sets `hasLangBlocks` true, so the other language is `undefined`
  // here. Without the guard `one(undefined)` throws on `block[key]` — which
  // crashed the whole newsroom cycle on a French-only AI response instead of
  // simply falling back to empty (and letting the builder fill the gap).
  const enSrc = (hasLangBlocks ? (src.en as Record<string, unknown>) : {}) || {};
  const one = (block: Record<string, unknown>): Required<Omit<CarouselAiCopyLang, 'paragraphs'>> & { paragraphs: string[] } => {
    const text = (key: string): string => {
      const value = block[key];
      if (typeof value === 'string') return stripHtmlTags(value).replace(/\s+/g, ' ').trim();
      // Models sometimes wrap a single value in a `{ fr, en }` pair; take French.
      if (value && typeof value === 'object') {
        const fr = (value as { fr?: unknown }).fr;
        if (typeof fr === 'string') return stripHtmlTags(fr).replace(/\s+/g, ' ').trim();
      }
      return '';
    };
    const quote = text('quote').replace(/^«\s*/, '').replace(/\s*»$/, '').trim();
    const paragraphs = Array.isArray(block.paragraphs)
      ? block.paragraphs
        .filter((p): p is string => typeof p === 'string')
        .map(p => stripHtmlTags(p).replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 0)
        .slice(0, MAX_CAROUSEL_PARAGRAPHS)
      : [];
    return {
      category: text('category'),
      title: text('title'),
      lede: text('lede'),
      bodyHeading: text('bodyHeading'),
      quote,
      quoteAttribution: text('quoteAttribution'),
      paragraphs,
    };
  };
  return { fr: one(frSrc), en: one(enSrc) };
}

/**
 * Resolves the photo that represents an article.
 *
 * Checked in order of editorial preference and, importantly, with whitespace
 * stripped at each step: articles imported from RSS/AI often carry
 * `featuredImage: " "` (a placeholder that is non-empty but useless), which made
 * the cover card render its empty grey box even though `imageUrl` held a real
 * photo. A `trim()`-ed check treats that as absent and moves on.
 */
export function pickArticleImage(article: Partial<Article> | undefined): string | undefined {
  const candidates = [article?.featuredImage, article?.imageUrl, article?.seoOgImage];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

/**
 * Builds a carousel draft from an article.
 *
 * This is the whole point of the workflow: the copy already exists in the CMS —
 * and, since the editorial AI now writes `carouselCopy` in the same pass as the
 * article body, so does the social text — so the editor picks an article and
 * gets a complete, correctly-punctuated carousel instead of retyping
 * everything, which is how social copy and article copy used to drift apart.
 */
export function buildDraftFromArticle(
  article: Article,
  socials: CarouselSocialLink[] = DEFAULT_CAROUSEL_SOCIALS,
  /**
   * Brand assets chosen by the editor, carried across an article change.
   *
   * The logos and the closing photo belong to the publication, not to the
   * article, so picking a new article must not wipe them — that is the kind of
   * silent reset that makes an editor re-upload the same file. The cover photo
   * is deliberately NOT carried over: it comes from the article itself.
   */
  keep: { logoUrls?: CarouselDraft['logoUrls']; closingImage?: string } = {},
  /**
   * Language of the card copy. One article yields both the FR and the EN
   * carousel: every text field resolves in this language first and falls back
   * to the other language, so an English-only article still builds a complete
   * draft and vice versa.
   */
  lang: 'fr' | 'en' = 'fr',
): CarouselDraft {
  const other = lang === 'fr' ? 'en' : 'fr';
  const pickLang = (v: unknown): string => {
    if (typeof v === 'string') return stripHtmlTags(v);
    if (v && typeof v === 'object') {
      const b = v as { fr?: unknown; en?: unknown };
      const a = typeof b[lang] === 'string' ? stripHtmlTags(b[lang] as string) : '';
      if (a.trim()) return a;
      const c = typeof b[other] === 'string' ? stripHtmlTags(b[other] as string) : '';
      return c;
    }
    return '';
  };
  const title = pickLang(article.title);
  const excerpt = pickLang(article.excerpt);
  const body = pickLang(article.body);

  /**
   * AI-written card copy wins over the mechanical fallbacks, field by field.
   *
   * Deliberately per-field rather than all-or-nothing: a model that returns a
   * good lede but no paragraphs should still get its lede used, with the
   * paragraphs falling back to the article's own text.
   */
  const copy = sanitizeAiCopy(article.carouselCopy);
  /**
   * Per-field language resolution: use the requested language's wording when it
   * exists, otherwise borrow the other language's field rather than dropping it.
   * `copy[lang]`/`copy[other]` are always complete shapes (sanitizeAiCopy
   * guarantees strings), so a French-only model still fills every EN slot.
   */
  const ai = {
    category: copy[lang].category || copy[other].category,
    title: copy[lang].title || copy[other].title,
    lede: copy[lang].lede || copy[other].lede,
    bodyHeading: copy[lang].bodyHeading || copy[other].bodyHeading,
    paragraphs: copy[lang].paragraphs.length ? copy[lang].paragraphs : copy[other].paragraphs,
    quote: copy[lang].quote || copy[other].quote,
    quoteAttribution: copy[lang].quoteAttribution || copy[other].quoteAttribution,
  };

  // Prefer the article's own lede; fall back to the opening of the body so a
  // thin excerpt still yields a sensible cover line.
  const lede = ai.lede || excerpt || firstSentence(body);
  const paragraphs = ai.paragraphs.length
    ? ai.paragraphs
    : extractParagraphs(body || excerpt || title);

  return {
    articleId: article.id,
    articleSlug: article.slug,
    // Self-describing language, so a stored draft knows which version it is
    // without the studio re-deriving it from the article every time.
    lang,
    category: ai.category || article.category || PLACEHOLDER.category,
    title: ai.title || title || PLACEHOLDER.title,
    lede: lede || PLACEHOLDER.lede,
    bodyHeading: ai.bodyHeading || PLACEHOLDER.bodyHeading,
    paragraphs: paragraphs.length ? paragraphs : [PLACEHOLDER.lede],
    // With no AI copy the quote is editorial, so it is never invented from the
    // body — the draft starts on the placeholder and the editor writes the real
    // line. An explicit AI quote is the editor's own approved wording, so it is
    // honoured.
    quote: ai.quote || PLACEHOLDER.quote,
    quoteAttribution: ai.quoteAttribution || PLACEHOLDER.quoteAttribution,
    tagline: PLACEHOLDER.tagline,
    socialHeading: PLACEHOLDER.socialHeading,
    socials,
    date: formatCardDate(article.date),
    readingTime: formatReadTime(article),
    coverImage: pickArticleImage(article),
    logoUrls: keep.logoUrls,
    closingImage: keep.closingImage,
    closingTint: 0.85,
    accentColor: DEFAULT_ACCENT,
  };
}

/**
 * Both language versions of one article's carousel, built in a single pass.
 *
 * The whole point of the newsroom workflow is that a story ships ready to post
 * in FR *and* EN. `buildDraftFromArticle` already resolves every text field in
 * one language and falls back to the other, so calling it twice — once per
 * language — yields two complete, self-describing drafts from the same article
 * and the same brand assets. Storing both means the Carousel Studio opens the
 * finished French cards OR the finished English cards without the editor
 * retyping anything.
 *
 * `keep` (logos, closing photo) is shared: those belong to the publication, not
 * to a language, so both versions carry the same brand marks.
 */
export function buildBilingualDraftFromArticle(
  article: Article,
  socials: CarouselSocialLink[] = DEFAULT_CAROUSEL_SOCIALS,
  keep: { logoUrls?: CarouselDraft['logoUrls']; closingImage?: string } = {},
): { fr: CarouselDraft; en: CarouselDraft } {
  return {
    fr: buildDraftFromArticle(article, socials, keep, 'fr'),
    en: buildDraftFromArticle(article, socials, keep, 'en'),
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
    ? input.socials
        .filter(s => s && typeof s.label === 'string' && s.label.trim().length > 0 && typeof s.url === 'string')
        .map(s => {
          // Per-row uploaded icon: trimmed when a usable string, dropped
          // otherwise, so a hand-edited draft can never hand the renderer a
          // non-string or a whitespace-only URL.
          const { iconImage, ...rest } = s;
          const iconUrl = typeof iconImage === 'string' ? iconImage.trim() : '';
          if (!iconUrl) return rest;
          // The row's size override, clamped like every other stored number: a
          // stray 0 would erase the icon and a huge one would blow it past its
          // neighbours. A missing or unusable value means the full badge box.
          const raw = (s as { iconScale?: unknown }).iconScale;
          const n = typeof raw === 'number' ? raw : Number(raw);
          const iconScale = Number.isFinite(n)
            ? Math.min(1.4, Math.max(0.4, Math.round(n * 100) / 100))
            : 1;
          return { ...rest, iconImage: iconUrl, iconScale };
        })
    : [];
  const socials = filteredSocials.length ? filteredSocials : base.socials;

  /**
   * Logo placement is normalized rather than trusted.
   *
   * A drag writes raw pointer arithmetic, so a bad or partial write could store
   * `size: 0` or `NaN`. Either would silently render a missing logo on the card
   * the editor believes they positioned, so every axis is clamped here — the
   * editor and the exporter read the same sanitized numbers.
   */
  const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };
  const logos = input.logos
    ? Object.fromEntries(
        (['cover', 'body', 'closing'] as const)
          .filter(kind => input.logos?.[kind])
          .map(kind => {
            const at = input.logos![kind]!;
            return [kind, {
              cx: clamp(at.cx, 0, CAROUSEL_SIZE, CAROUSEL_SIZE / 2),
              top: clamp(at.top, 0, CAROUSEL_SIZE - 40, 46),
              size: clamp(at.size, 32, 220, 84),
            }];
          }),
      ) as CarouselDraft['logos']
    : undefined;

  /**
   * Per-card logo sources, with a one-way migration off the old global field.
   *
   * Drafts saved by the previous build carry a single `logoUrl` that applied to
   * all three cards. Dropping it would silently strip the editor's logo from
   * every published card on first load, so it is copied onto all three cards
   * once and then forgotten.
   */
  const legacyRaw = (input as Record<string, unknown>).logoUrl;
  const legacyLogo = typeof legacyRaw === 'string' && legacyRaw.trim()
    ? legacyRaw.trim()
    : undefined;
  const logoKinds: CarouselCardKind[] = ['cover', 'body', 'closing'];
  const logoUrls = Object.fromEntries(
    logoKinds
      .map(kind => {
        const candidate = input.logoUrls?.[kind] ?? legacyLogo;
        return typeof candidate === 'string' && candidate.trim()
          ? [kind, candidate.trim()]
          : null;
      })
      .filter(Boolean),
  ) as CarouselDraft['logoUrls'];
  const hasLogoUrls = Object.keys(logoUrls || {}).length > 0;

  /**
   * Per-block font sizes and photo fit modes.
   *
   * Slider output and hand-edited Firestore docs are untrusted input: every
   * size is re-clamped to its own field's range by `sanitizeTextSizes`, and a
   * fit value that is not exactly `'cover'`/`'contain'` becomes "unset" (the
   * approved default), never an arbitrary string reaching `drawImage`.
   */
  const textSizes = sanitizeTextSizes(input.textSizes);
  const fitOf = (v: unknown): CarouselDraft['coverImageFit'] =>
    v === 'contain' || v === 'cover' ? v : undefined;

  /**
   * Accent: blank falls back to the default; the previous generation's brick
   * `#B8471F` migrates to the reference ember. It was never editor-chosen, so
   * a stored copy must not keep every already-saved card looking cold — while
   * any genuinely custom colour a hand-edited doc carries is left alone.
   */
  const accentRaw = typeof input.accentColor === 'string' ? input.accentColor.trim() : '';
  const accentColor = /^#b8471f$/i.test(accentRaw)
    ? DEFAULT_ACCENT
    : accentRaw || base.accentColor;

  return {
    ...base,
    ...input,
    logos,
    // Assigned after the spread so the legacy field cannot win over the
    // normalized per-card map.
    logoUrls: hasLogoUrls ? logoUrls : undefined,
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
    accentColor,
    // Assigned after the spread: the sanitized forms must win over whatever
    // raw values arrived in `input`.
    textSizes,
    coverImageFit: fitOf(input.coverImageFit),
    closingImageFit: fitOf(input.closingImageFit),
  };
}