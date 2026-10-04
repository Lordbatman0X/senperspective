// ---------------------------------------------------------------------------
// Layers. Every layer is an absolutely-positioned rect in card space, where the
// card is `format.width` x `format.height` pixels. Using real px (rather than
// percentages) keeps resize math exact and the renderer trivial to reason
// about; the UI converts to % only for its measurement readouts.
// ---------------------------------------------------------------------------

export type LayerBlend =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'color'
  | 'luminosity';

export interface LayerBase {
  id: string;
  name: string;
  kind: LayerKind;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blend: LayerBlend;
  filters: FilterEntry[];
  effects: EffectEntry[];
}

export type ImageFit = 'cover' | 'contain' | 'fill' | 'original';

export interface BackgroundLayer extends LayerBase {
  kind: 'background';
  fill: string;
  src?: string;
  fit: ImageFit;
  /** 0..1 focal point used by `cover` so cropping can be steered by hand. */
  focalX: number;
  focalY: number;
}

export type LogoTone = 'auto' | 'light' | 'dark' | 'custom';

export interface LogoLayer extends LayerBase {
  kind: 'logo';
  /** The `custom` asset; also the fallback for `light`/`dark` when absent. */
  src: string;
  tone: LogoTone;
  /** Optional light/dark variants for `auto`; falls back to `src`. */
  toneSrc?: { light?: string; dark?: string };
  lockAspect: boolean;
  /** Inner padding in px, so a logo can sit in a safe area without shrinking. */
  padding: number;
}

/**
 * Which piece of live article content a text layer mirrors.
 *
 * The design document stores overrides only, so a bound layer resolves its text
 * at RENDER time from the current Article. That is why renaming an article
 * updates its cards. The moment an editor types in a bound layer, the binding is
 * cleared (see `InspectorPanel`) and the typed text becomes authoritative —
 * so the binding can never silently overwrite real copy.
 */
export type TextBinding =
  | 'title'
  | 'excerpt'
  | 'category'
  | 'author'
  | 'date'
  | 'readingTime'
  | 'sectionHeading'
  | 'sectionBody';

export interface TextLayer extends LayerBase {
  kind: 'text';
  text: string;
  /**
   * Set while the layer still mirrors live content. For the `section*`
   * bindings this is the zero-based index into `ResolvedContent.sections`.
   */
  binding?: { field: TextBinding; index?: number };
  fontFamily: SocialFont;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  letterSpacing: number;
  lineHeight: number;
  align: 'left' | 'center' | 'right';
  color: string;
  transform: 'none' | 'uppercase';
  autoFit: { enabled: boolean; min: number; max: number };
  /** Vertical placement when the text is shorter than its box. */
  valign: 'top' | 'center' | 'bottom';
}

export interface ShapeLayer extends LayerBase {
  kind: 'shape';
  shape: 'rect' | 'line' | 'pill';
  fill: string;
  strokeColor?: string;
  strokeWidth?: number;
  radius: number;
}

export interface ImageLayer extends LayerBase {
  kind: 'image';
  src: string;
  fit: ImageFit;
  focalX: number;
  focalY: number;
  radius: number;
}

export type SocialLayer =
  | BackgroundLayer
  | LogoLayer
  | TextLayer
  | ShapeLayer
  | ImageLayer;

export type TemplateId = 'cover' | 'brief' | 'closing' | 'blank';

/** Slides / dots indicator rendered by the template as a shape layer. */
export type DotsStyle = 'none' | 'dots' | 'numbered';

export interface SocialCard {
  id: string;
  templateId: TemplateId;
  /** Ordered bottom -> top. The last entry paints on top. */
  layers: SocialLayer[];
  /** Convenience toggles the templates honour; fully overridable per card. */
  meta: {
    showDate: boolean;
    showReadingTime: boolean;
    dots: DotsStyle;
  };
}

export interface SocialCaption {
  fr: string;
  en: string;
}

export interface SocialDesign {
  /** Bumped whenever the shape changes; `migrateSocialDesign` reads it. */
  version: number;
  mode: SocialMode;
  network: SocialNetwork;
  formatId: string;
  cards: SocialCard[];
  /** Keyed per network, so switching platform keeps its own caption. */
  captions: Partial<Record<CaptionSlot, SocialCaption>>;
  /** ISO timestamp of the last explicit caption generation. */
  generatedAt?: string;
}

/** Current schema version written by this build. */
export const SOCIAL_DESIGN_VERSION = 1;

/**
 * Scratch content for "ad hoc" mode — designing a card for something that is
 * not (yet) an article. Same field shapes as Article so the renderer and the
 * caption generator can be shared without special-casing.
 */
export interface AdHocSource {
  title: { fr: string; en: string };
  excerpt: { fr: string; en: string };
  body?: { fr: string; en: string };
  featuredImage?: string;
  category?: string;
  tags?: string[];
  date?: string;
  readingTime?: number;
  author?: string;
  slug?: string;
}
/**
 * Social Studio document model.
 *
 * Everything here is stored on `Article.social` and is therefore persisted to
 * Firestore through the normal `updateArticle` path. The rules that keep that
 * safe:
 *
 *  1. The document holds DESIGN + CAPTION OVERRIDES ONLY. Titles, excerpts,
 *     dates and reading times are read live from the Article at render time, so
 *     editing an article can never leave a card showing stale copy.
 *  2. Every field is defaulted through `migrateSocialDesign`, so a document
 *     written by an older build of the Studio still opens.
 *  3. `Article.social` itself is optional: an article with no design behaves
 *     exactly as it did before this feature existed.
 */

export type SocialNetwork =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'linkedin'
  | 'whatsapp'
  | 'threads';

export type SocialMode = 'single' | 'carousel';

/** Identifies which caption slot is being read/written. */
export type CaptionSlot = SocialNetwork | 'universal';

export type CaptionLanguage = 'fr' | 'en';

/** Only these are loaded in index.html, so canvas can render them. */
export type SocialFont =
  | 'Playfair Display'
  | 'Lora'
  | 'Inter'
  | 'Montserrat';

export const SOCIAL_FONTS: readonly SocialFont[] = [
  'Playfair Display',
  'Lora',
  'Inter',
  'Montserrat',
];

export type LayerKind = 'background' | 'image' | 'logo' | 'text' | 'shape';

// ---------------------------------------------------------------------------
// Filters and effects: an ORDERED stack, not a fixed object.
//
// The order matters and is user-editable, because that is how real creative
// tools behave: applying "warm" then "contrast" is not the same as the reverse.
// Each entry carries its own `enabled` flag so an effect can be bypassed
// without losing its position in the chain.
// ---------------------------------------------------------------------------

export type FilterKind =
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'blur'
  | 'grayscale'
  | 'sepia'
  | 'hueRotate'
  | 'invert';

export interface FilterEntry {
  id: string;
  kind: FilterKind;
  /** Raw value in the unit documented by `FILTER_DEFS`. */
  value: number;
  enabled: boolean;
}

export type EffectKind = 'tint' | 'shadow' | 'stroke' | 'duotone' | 'vignette';

export interface EffectEntry {
  id: string;
  kind: EffectKind;
  /** 0..1 unless the effect documents another range. */
  value: number;
  color?: string;
  color2?: string;
  /** Offset for `shadow`, corner radius for `stroke`. */
  aux?: number;
  enabled: boolean;
}