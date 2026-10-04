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
   */
  icon: 'globe' | 'youtube' | 'tiktok' | 'facebook' | 'instagram';
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
   * Logo override. When empty the renderer draws the Perspective Group
   * wordmark, which is the house style; set this only to swap in a partner or
   * campaign logo.
   */
  logoUrl?: string;
  /**
   * Per-card logo placement, set when the editor drags or resizes the logo.
   *
   * Absent means "use the approved default position", which is what keeps every
   * freshly built draft looking like the design without the editor touching it.
   */
  logos?: Partial<Record<CarouselCardKind, CarouselLogoPlacement>>;
  /** Accent colour used for the rule, the active dot and the closing tint. */
  accentColor: string;
}

/** How many body paragraphs the fixed template actually shows. */
export const MAX_CAROUSEL_PARAGRAPHS = 3;

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