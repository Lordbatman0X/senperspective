/**
 * Social carousel — card data.
 *
 * The carousel is ONE approved design repeated with different content, so the
 * only things stored here are what an editor genuinely chooses: which article,
 * which photo, which logo, the copy, and where the logo sits. All typography
 * and spacing live in `layout.ts`, which both the renderer and the editor read.
 */

/** The three approved card formats. There is no fourth and no free-form mode. */
export type CarouselCardKind = 'cover' | 'body' | 'closing';

/**
 * How a background photo fills its card box.
 *
 * Mirrors CSS `object-fit`: `'cover'` crops the photo to fill the box without
 * distortion (the default, and what the reference design uses), `'contain'`
 * letterboxes the whole photo instead — the escape hatch for a source image
 * whose important subject sits off-centre or in a very wide format.
 */
export type CarouselImageFit = 'cover' | 'contain';

/** One social link rendered as a circle on the closing card. */
export interface CarouselSocialLink {
  /** Short label shown under the icon, e.g. "@SenPerspective". */
  label: string;
  /** Full URL the label points at. */
  url: string;
  /**
   * Icon key understood by the renderer. Deliberately a closed union: the
   * closing card has a fixed set of circles, so an unknown icon would render as
   * a blank circle and look like a bug.
   *
   * Only used when `iconImage` is absent — the drawn glyph is the fallback
   * for rows the editor has not supplied artwork for.
   */
  icon: 'globe' | 'youtube' | 'x' | 'tiktok' | 'facebook' | 'instagram';
  /**
   * Editor-supplied icon image for this row, which REPLACES the drawn glyph
   * (outline included) on the closing card. Transparent PNG/WebP cut-outs are
   * the intended input — the upload path inspects the file and re-encodes to
   * PNG whenever any pixel is transparent, so a background-less logo stays
   * background-less. Absent/blank means "draw the reference glyph".
   */
  iconImage?: string;
}

/**
 * Where the logo sits on one card.
 *
 * Per-card and per-axis on purpose: the approved design puts the wordmark top-left
 * on cards 1 and 2 but centred at the bottom on card 3, so a single global
 * position cannot express the design.
 */
export interface CarouselLogoPlacement {
  /** Horizontal centre, in card pixels. */
  cx: number;
  /** Top edge, in card pixels. */
  top: number;
  /** Wordmark size, in card pixels. */
  size: number;
}

/**
 * The editable content of one carousel.
 *
 * Every field is plain text or an image URL — never a React node or a style
 * object — so the whole draft survives a JSON round-trip through Firestore.
 */
export interface CarouselDraft {
  /** Article this carousel promotes, when it was built from one. */
  articleId?: string;
  articleSlug?: string;
  /**
   * Language of the visible copy. Rebuilding from the same article in the
   * other language swaps every text field to that language's version, so one
   * article yields both the FR and the EN carousel without retyping.
   */
  lang?: 'fr' | 'en';

  /** Category pill on cards 1 and 2, e.g. "POLITIQUE". */
  category: string;
  /** Headline on the cover card. */
  title: string;
  /** Sub-headline under the headline on the cover card. */
  lede: string;
  /** Heading of the body card, e.g. "Ce qu'il faut retenir". */
  bodyHeading: string;
  /** Up to 3 paragraphs on the body card. Extra paragraphs are dropped. */
  paragraphs: string[];
  /** Pull-quote on the closing card. */
  quote: string;
  /** Attribution under the quote, e.g. "La rédaction". */
  quoteAttribution: string;
  /** Bold italic line above the social row. */
  tagline: string;
  /** "Suivez Nous sur" label above the social row. */
  socialHeading: string;
  socials: CarouselSocialLink[];

  /** Date line in the footer, e.g. "20 Septembre 2026". */
  date: string;
  /** Read-time line in the footer, e.g. "1 min". */
  readingTime: string;

  /** Photo on the cover card. */
  coverImage?: string;
  /** Photo behind the closing card (shown through the orange tint). */
  closingImage?: string;
  /**
   * Fit mode for the cover photo. Absent means `'cover'` (crop to fill).
   */
  coverImageFit?: CarouselImageFit;
  /**
   * Fit mode for the closing photo. Absent means `'cover'` (crop to fill).
   */
  closingImageFit?: CarouselImageFit;
  /**
   * Per-block font sizes, in card pixels, keyed by layout field id
   * (`title`, `lede`, `bodyHeading`, `paragraph-0`…, `quote`,
   * `quoteAttribution`, `tagline`, `socialHeading`).
   *
   * Absent means "use the approved size from `layout.ts`", which is what keeps
   * a freshly built draft looking like the design. Values are clamped by
   * `normalizeDraft`, so raw slider output can never shrink a headline to 1px
   * or blow it off the card.
   *
   * The layout ALSO auto-shrinks a block when its text is too long for its
   * band (see `fitFieldToHeight` in layout.ts): the slider sets the *desired*
   * size, the auto-fit guarantees it never paints outside the frame.
   */
  textSizes?: Record<string, number>;
  /**
   * Per-block text-box width scale, keyed by layout field id (same keys as
   * `textSizes`). `1` (absent) means the approved full gutter width;
   * `0.6` narrows the box to 60% so a long text wraps earlier instead of
   * colliding with the card edge. Clamped to 0.5–1.0 by `normalizeDraft`.
   */
  textWidths?: Record<string, number>;
  /**
   * Closing-card red wash intensity, 0–1 (default 0.85).
   *
   * The reference closing card is an almost full brick-red wash with the
   * photo ghosting through underneath; the default lands exactly on that
   * look. 0 leaves the photo untouched, 1 pushes the full opaque brand wash.
   * Stored so the editor's choice survives a reload and the PNG export
   * matches the preview.
   */
  closingTint?: number;

  /**
   * Per-card logo image, keyed by card.
   *
   * Per-card and per-format on purpose: a partner or campaign lockup is often
   * only valid on one card (a sponsor logo on the closing card, the house
   * wordmark on the cover). A single global `logoUrl` could not express that, so
   * each card carries its own source. Absent means "draw the Perspective Group
   * wordmark", which is the house style.
   */
  logoUrls?: Partial<Record<CarouselCardKind, string>>;
  /**
   * Per-card logo placement, set when the editor drags or resizes the logo.
   *
   * Absent means "use the approved default position", which is what keeps every
   * freshly built draft looking like the design without the editor touching it.
   */
  logos?: Partial<Record<CarouselCardKind, CarouselLogoPlacement>>;
  /** Accent colour used for the rule, the cover wordmark and the active dot. */
  accentColor: string;
}

/** How many body paragraphs the fixed template actually shows. */
export const MAX_CAROUSEL_PARAGRAPHS = 3;

/**
 * Card copy produced by the editorial AI.
 *
 * Stored on the ARTICLE, not on the draft, so the copy is written once when the
 * article is written and every carousel built from that article starts with
 * finished, correctly-toned social text. Each language block is optional: a
 * model that returns only French still improves the draft, and anything missing
 * falls back to the article's own excerpt and body in that language.
 */
export interface CarouselAiCopy {
  fr?: CarouselAiCopyLang;
  en?: CarouselAiCopyLang;
  /**
   * Legacy flat shape (fields directly on the object, French-only). Read for
   * backward compatibility with articles saved before the bilingual pass, and
   * treated as the French block.
   */
  category?: string;
  title?: string;
  lede?: string;
  bodyHeading?: string;
  paragraphs?: string[];
  quote?: string;
  quoteAttribution?: string;
}

/** One language's worth of AI-written card copy. */
export interface CarouselAiCopyLang {
  /** Short uppercase category pill, e.g. "POLITIQUE". */
  category?: string;
  /** Cover headline. Punchy, may be uppercased by the model. */
  title?: string;
  /** One-sentence cover sub-headline (the card's "lede"). */
  lede?: string;
  /** Body card heading, e.g. "Le Brief" or "Ce qu'il faut retenir". */
  bodyHeading?: string;
  /** Up to `MAX_CAROUSEL_PARAGRAPHS` key-point paragraphs. */
  paragraphs?: string[];
  /** Closing pull-quote. */
  quote?: string;
  /** Attribution under the quote. */
  quoteAttribution?: string;
}

/** The Perspective Group defaults, as they appear on the closing card. */
export const DEFAULT_CAROUSEL_SOCIALS: CarouselSocialLink[] = [
  { label: 'senperspective.com', url: 'https://senperspective.com', icon: 'globe' },
  { label: '@BCPerspectiveGroup', url: 'https://x.com/BCPerspectiveGroup', icon: 'youtube' },
  { label: '@SenPerspective', url: 'https://tiktok.com/@SenPerspective', icon: 'tiktok' },
  { label: 'Perspective Group', url: 'https://facebook.com/PerspectiveGroup', icon: 'facebook' },
  { label: '@perspectivegroupsn', url: 'https://instagram.com/perspectivegroupsn', icon: 'instagram' },
];

/** Card output size, matching the approved design. */
export const CAROUSEL_SIZE = 1080;