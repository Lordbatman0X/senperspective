/**
 * The default set of cards for a mode.
 *
 * Single mode is one cover card. Carousel mode is cover + one brief per detected
 * section + closing, capped so the result never exceeds what a platform will
 * accept. A body with no headings degrades to cover + closing rather than
 * inventing sections to fill the middle.
 */
export function buildInitialCards(
  templateId: SocialCard['templateId'],
  opts: TemplateOptions,
  mode: 'single' | 'carousel',
  maxCards: number,
): SocialCard[] {
  if (mode === 'single') {
    return [buildCard(templateId, opts)];
  }

  const sectionCount = Math.min(opts.content.sections.length, Math.max(0, maxCards - 2));
  const cards: SocialCard[] = [buildCard('cover', opts)];
  for (let i = 0; i < sectionCount; i++) {
    cards.push(buildCard('brief', opts));
  }
  cards.push(buildCard('closing', opts));
  return cards.slice(0, Math.max(1, maxCards));
}

/**
 * Rebuild the dot indicators after the card count changes.
 *
 * Dots are real shape layers so they can be dragged and restyled, which means
 * they must be resynced explicitly rather than drawn implicitly by the
 * renderer. Cards whose dots are switched off are left untouched.
 */
export function syncDots(card: SocialCard, format: SocialFormat, total: number, active: number): SocialCard {
  if (card.meta.dots === 'none') return card;

  const kept = card.layers.filter(l => !(l.kind === 'shape' && DOT_NAME_RE.test(l.name)));

  if (total <= 1) {
    return { ...card, meta: { ...card.meta, dots: 'none' }, layers: kept };
  }
  return { ...card, layers: [...kept, ...progressDots(format, { count: total, active })] };
}

/** Give every card in a set the right number of dots and the right highlight. */
export function syncAllDots(cards: SocialCard[], format: SocialFormat): SocialCard[] {
  return cards.map((card, i) => syncDots(card, format, cards.length, i));
}
/**
 * CLÔTURE — closing card.
 *
 * Full-bleed photo pushed toward the brand terracotta, a pull-quote, the
 * byline, the follow line and the five-platform row from the carousel.
 */
export function buildClosingCard(opts: TemplateOptions, dots: DotState = { count: 1, active: 0 }): SocialCard {
  const { format, content } = opts;
  const copy = templateCopy('closing', content);

  const quote = createText({
    name: 'Citation',
    text: copy.headline,
    binding: { field: 'excerpt' },
    fontFamily: 'Playfair Display',
    fontStyle: 'italic',
    fontWeight: 700,
    fontSize: fh(format, 0.036),
    lineHeight: 1.2,
    color: PALETTE.white,
    x: left(format),
    y: fh(format, 0.3),
    w: contentWidth(format),
    h: fh(format, 0.2),
    autoFit: { enabled: true, min: 18, max: fh(format, 0.036) },
    valign: 'center',
  });

  const byline = createText({
    name: 'Signature',
    text: copy.byline,
    binding: { field: 'author' },
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: fh(format, 0.0165),
    color: PALETTE.white,
    opacity: 0.8,
    x: left(format),
    y: fh(format, 0.525),
    w: contentWidth(format),
    h: fh(format, 0.026),
    autoFit: { enabled: false, min: 9, max: 40 },
  });

  const cta = createText({
    name: 'Appel',
    text: copy.cta,
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: fh(format, 0.0175),
    lineHeight: 1.45,
    color: PALETTE.white,
    opacity: 0.85,
    x: left(format),
    y: fh(format, 0.66),
    w: contentWidth(format),
    h: fh(format, 0.08),
    autoFit: { enabled: true, min: 11, max: fh(format, 0.0175) },
  });

  // Five platform chips standing in for the icon row.
  const chipSize = fw(format, 0.062);
  const chipGap = fw(format, 0.018);
  const chipCount = 5;

  const chips = ['Site', 'YouTube', 'TikTok', 'Facebook', 'Instagram'].map((label, i) =>
    createText({
      name: label,
      text: label,
      fontFamily: 'Inter',
      fontWeight: 700,
      fontSize: fh(format, 0.0125),
      color: PALETTE.white,
      align: 'center',
      x: left(format) + i * (chipSize + chipGap),
      y: fh(format, 0.79) + Math.round(chipSize * 0.34),
      w: chipSize,
      h: Math.round(chipSize * 0.4),
      autoFit: { enabled: false, min: 7, max: 30 },
    }),
  );

  return {
    id: uid('c'),
    templateId: 'closing',
    meta: { showDate: false, showReadingTime: false, dots: dots.count > 1 ? 'dots' : 'none' },
    layers: [
      createBackground({
        name: 'Photo de clôture',
        x: 0, y: 0, w: format.width, h: format.height,
        fill: PALETTE.accentDeep,
        src: content.image || undefined,
        fit: 'cover',
        // The terracotta wash is what makes this card recognisable.
        effects: [
          { id: uid('e'), kind: 'duotone', value: 0.68, color: PALETTE.accentDeep, color2: '#F6D5C4', enabled: true },
          { id: uid('e'), kind: 'vignette', value: 0.45, enabled: true },
        ],
      }),
      createShape({
        name: 'Voile',
        x: 0, y: 0, w: format.width, h: format.height,
        fill: PALETTE.ink,
        opacity: 0.32,
      }),
      quote,
      byline,
      cta,
      createShape({
        name: 'Réseaux',
        shape: 'rect',
        x: left(format),
        y: fh(format, 0.79),
        w: chipCount * chipSize + (chipCount - 1) * chipGap,
        h: chipSize,
        fill: PALETTE.white,
        opacity: 0.12,
        radius: Math.round(chipSize * 0.5),
      }),
      ...chips,
      wordmark(opts, 0.945),
      ...progressDots(format, dots),
    ],
  };
}

/** A bare card: one background and nothing else, for building by hand. */
export function buildBlankCard(format: SocialFormat): SocialCard {
  return {
    id: uid('c'),
    templateId: 'blank',
    meta: { showDate: true, showReadingTime: true, dots: 'none' },
    layers: [
      createBackground({ name: 'Fond', x: 0, y: 0, w: format.width, h: format.height, fill: PALETTE.ink }),
    ],
  };
}

export function buildCard(
  templateId: SocialCard['templateId'],
  opts: TemplateOptions,
  dots?: DotState,
): SocialCard {
  switch (templateId) {
    case 'cover': return buildCoverCard(opts, dots);
    case 'brief': return buildBriefCard(opts, dots);
    case 'closing': return buildClosingCard(opts, dots);
    case 'blank':
    default: return buildBlankCard(opts.format);
  }
}
/**
 * LE BRIEF — text-only detail card.
 *
 * Solid ink base with a faint duotone wash, serif-italic title, two body
 * paragraphs. Used for the middle slides, where a photo would compete with the
 * text rather than support it.
 */
export function buildBriefCard(opts: TemplateOptions, dots: DotState = { count: 1, active: 0 }): SocialCard {
  const { format, content } = opts;
  const copy = templateCopy('brief', content);
  const [pillShape, pillText] = eyebrowPill(format, 0.048);
  pillText.binding = { field: 'category' };

  const headline = createText({
    name: 'Titre',
    text: copy.headline,
    binding: { field: 'title' },
    fontFamily: 'Playfair Display',
    fontStyle: 'italic',
    fontWeight: 800,
    fontSize: fh(format, 0.042),
    lineHeight: 1.12,
    color: PALETTE.white,
    x: left(format),
    y: fh(format, 0.115),
    w: contentWidth(format),
    h: fh(format, 0.17),
    autoFit: { enabled: true, min: 18, max: fh(format, 0.042) },
  });

  const body1 = createText({
    name: 'Paragraphe 1',
    text: copy.body1,
    binding: { field: 'sectionBody', index: 0 },
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: fh(format, 0.0185),
    lineHeight: 1.5,
    color: PALETTE.white,
    opacity: 0.88,
    x: left(format),
    y: fh(format, 0.345),
    w: contentWidth(format),
    h: fh(format, 0.24),
    autoFit: { enabled: true, min: 11, max: fh(format, 0.0185) },
  });

  const body2 = createText({
    name: 'Paragraphe 2',
    text: copy.body2,
    binding: { field: 'sectionBody', index: 1 },
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: fh(format, 0.0185),
    lineHeight: 1.5,
    color: PALETTE.white,
    opacity: 0.72,
    x: left(format),
    y: fh(format, 0.615),
    w: contentWidth(format),
    h: fh(format, 0.24),
    autoFit: { enabled: true, min: 11, max: fh(format, 0.0185) },
  });

  return {
    id: uid('c'),
    templateId: 'brief',
    meta: { showDate: true, showReadingTime: true, dots: dots.count > 1 ? 'dots' : 'none' },
    layers: [
      createBackground({
        name: 'Fond',
        x: 0, y: 0, w: format.width, h: format.height,
        fill: PALETTE.ink,
        // A faint warm wash keeps the flat card from reading as a blank slate.
        effects: [
          { id: uid('e'), kind: 'duotone', value: 0.22, color: PALETTE.inkSoft, color2: PALETTE.accentDeep, enabled: true },
          { id: uid('e'), kind: 'vignette', value: 0.4, enabled: true },
        ],
      }),
      accentRule(format, 0.098),
      wordmark(opts, 0.048),
      pillShape,
      pillText,
      headline,
      createShape({
        name: 'Filet',
        x: left(format),
        y: fh(format, 0.305),
        w: fw(format, 0.12),
        h: Math.max(3, fh(format, 0.0035)),
        fill: PALETTE.accent,
      }),
      body1,
      body2,
      metaBar(format, 0.945),
      ...progressDots(format, dots),
    ],
  };
}
// ---------------------------------------------------------------------------
// The templates themselves.
// ---------------------------------------------------------------------------

/**
 * COUVERTURE — photographic cover.
 *
 * Photo across the top, black base below, wordmark and rule, serif-italic
 * headline, excerpt, then the date · reading time bar and progress dots.
 */
export function buildCoverCard(opts: TemplateOptions, dots: DotState = { count: 1, active: 0 }): SocialCard {
  const { format, content } = opts;
  const metaY = 0.945;

  const headline = createText({
    name: 'Titre',
    text: templateCopy('cover', content).headline,
    binding: { field: 'title' },
    fontFamily: 'Playfair Display',
    fontStyle: 'italic',
    fontWeight: 800,
    fontSize: fh(format, 0.048),
    lineHeight: 1.1,
    color: PALETTE.white,
    x: left(format),
    y: fh(format, COVER_PHOTO + 0.07),
    w: contentWidth(format),
    // Roughly two headline lines at the natural size, then auto-fit shrinks.
    h: fh(format, 0.11),
    autoFit: { enabled: true, min: 20, max: fh(format, 0.048) },
  });

  const excerpt = createText({
    name: 'Chapô',
    text: templateCopy('cover', content).excerpt,
    binding: { field: 'excerpt' },
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: fh(format, 0.019),
    lineHeight: 1.45,
    color: PALETTE.white,
    opacity: 0.82,
    x: left(format),
    y: fh(format, COVER_PHOTO + 0.155),
    w: contentWidth(format),
    h: fh(format, 0.115),
    autoFit: { enabled: true, min: 11, max: fh(format, 0.019) },
  });

  const [pillShape, pillText] = eyebrowPill(format, 0.038);
  pillText.binding = { field: 'category' };

  return {
    id: uid('c'),
    templateId: 'cover',
    meta: { showDate: true, showReadingTime: true, dots: dots.count > 1 ? 'dots' : 'none' },
    layers: [
      createBackground({ name: 'Fond', x: 0, y: 0, w: format.width, h: format.height, fill: PALETTE.ink }),
      coverPhoto(format, content),
      accentRule(format, 0.098),
      wordmark(opts, 0.048),
      pillShape,
      pillText,
      headline,
      excerpt,
      metaBar(format, metaY),
      ...progressDots(format, dots),
    ],
  };
}
/**
 * Card templates.
 *
 * Three layouts modelled on the SenPerspective carousel: a photographic cover,
 * a text-only "Le Brief", and a duotoned closing card with the follow row.
 *
 * Two rules govern everything here:
 *
 *  1. Templates produce an ordinary layer stack. Once generated, a template
 *     card is indistinguishable from a hand-built one — the Studio never
 *     re-applies a template over an edit.
 *  2. Geometry is expressed as FRACTIONS of the format, not fixed pixels. The
 *     same cover template therefore produces a correct 4:5 and a correct 9:16
 *     without a second set of numbers, and changing the format in the UI
 *     reflows the whole card instead of letterboxing it.
 *
 * Card artwork is French only.
 */

import type {
  LogoLayer,
  ShapeLayer,
  SocialCard,
  TextLayer,
} from '../../types/social';
import type { SocialFormat } from './networks';
import {
  createBackground,
  createLogo,
  createShape,
  createText,
  makeFilters,
  PALETTE,
  uid,
} from './document';
import { templateCopy, type ResolvedContent } from './content';

/** Named vertical landmarks, as fractions of the card height. */
const GUTTER = 0.062;
/** The photo block on the cover occupies the top 55% of the card. */
const COVER_PHOTO = 0.55;

/** How many progress dots to draw, and which one is highlighted. */
export interface DotState {
  count: number;
  active: number;
}

/**
 * Dots are named layers, not anonymous shapes, so `syncDots` can find and
 * replace them later when the carousel length changes.
 */
export const DOT_NAME = (i: number) => `Pastille ${i + 1}`;
export const DOT_NAME_RE = /^Pastille \d+$/;

export interface TemplateOptions {
  format: SocialFormat;
  content: ResolvedContent;
  /** Brand logo URLs, from site settings. Empty is fine — the layer stays editable. */
  logoSrc?: string;
  logoLight?: string;
  logoDark?: string;
}

function fx(v: number): number { return Math.round(v); }
function fw(format: SocialFormat, v: number): number { return Math.round(format.width * v); }
function fh(format: SocialFormat, v: number): number { return Math.round(format.height * v); }

const left = (format: SocialFormat, extra = 0) => fw(format, GUTTER + extra);
const rightEdge = (format: SocialFormat, extra = 0) => fw(format, 1 - GUTTER - extra);
const contentWidth = (format: SocialFormat) => fw(format, 1 - GUTTER * 2);

/** The wordmark lockup, used on every template. */
function wordmark(opts: TemplateOptions, y: number): LogoLayer {
  const { format, logoSrc = '', logoLight, logoDark } = opts;
  return createLogo({
    name: 'Logo',
    x: left(format),
    y: fh(format, y),
    w: fw(format, 0.19),
    h: fh(format, 0.032),
    src: logoSrc,
    toneSrc: {
      light: logoLight || logoSrc || undefined,
      dark: logoDark || logoSrc || undefined,
    },
  });
}

/** The terracotta rule under the wordmark. */
function accentRule(format: SocialFormat, y: number): ShapeLayer {
  return createShape({
    name: 'Filet accentué',
    x: left(format),
    y: fh(format, y),
    w: fw(format, 0.075),
    h: Math.max(4, fh(format, 0.004)),
    fill: PALETTE.accent,
  });
}

/** "POLITIQUE" style pill, top-right. */
function eyebrowPill(format: SocialFormat, y: number, opacity = 1): [ShapeLayer, TextLayer] {
  const w = fw(format, 0.2);
  const h = fh(format, 0.026);
  const x = rightEdge(format) - w;
  const shape = createShape({
    name: 'Pastille',
    shape: 'rect',
    x, y: fh(format, y), w, h,
    fill: PALETTE.white,
    opacity: opacity * 0.14,
  });
  const text = createText({
    name: 'Rubrique',
    text: '',
    fontFamily: 'Montserrat',
    fontSize: fh(format, 0.014),
    fontWeight: 800,
    letterSpacing: 2,
    transform: 'uppercase',
    align: 'center',
    color: PALETTE.white,
    x, y: fh(format, y) + h * 0.22, w, h: h * 0.6,
    autoFit: { enabled: false, min: 8, max: 40 },
    opacity,
  });
  return [shape, text];
}

/** Date · reading time, bottom-left. */
function metaBar(format: SocialFormat, y: number): TextLayer {
  return createText({
    name: 'Méta',
    text: '',
    fontFamily: 'Inter',
    fontSize: fh(format, 0.0155),
    fontWeight: 600,
    color: PALETTE.white,
    opacity: 0.72,
    x: left(format),
    y: fh(format, y),
    w: fw(format, 0.5),
    h: fh(format, 0.022),
    autoFit: { enabled: false, min: 8, max: 40 },
  });
}

/**
 * Progress dots matching the carousel's bottom-right indicator.
 *
 * `count <= 1` yields nothing: a lone dot communicates nothing, and the
 * templates omit it rather than painting a stray mark.
 */
function progressDots(format: SocialFormat, dots: DotState): ShapeLayer[] {
  if (dots.count <= 1) return [];
  const r = Math.max(3, fw(format, 0.006));
  const gap = r * 2.6;
  const total = dots.count * r * 2 + (dots.count - 1) * (gap - r * 2);
  const startX = rightEdge(format) - total;
  return Array.from({ length: dots.count }, (_, i) =>
    createShape({
      name: DOT_NAME(i),
      shape: 'pill',
      x: startX + i * (r * 2 + (gap - r * 2)),
      y: fh(format, 0.952),
      w: r * 2,
      h: r * 2,
      radius: r,
      fill: i === dots.active ? PALETTE.accent : PALETTE.white,
      opacity: i === dots.active ? 1 : 0.35,
    }),
  );
}

/** Photo occupying the top `COVER_PHOTO` of the card, with a soft scrim. */
function coverPhoto(format: SocialFormat, content: ResolvedContent) {
  return createBackground({
    name: 'Photo de couverture',
    x: 0,
    y: 0,
    w: format.width,
    h: fh(format, COVER_PHOTO),
    fill: PALETTE.inkSoft,
    src: content.image || undefined,
    fit: 'cover',
    filters: makeFilters({ contrast: 106, saturate: 92 }),
    // A touch of shadow at the bottom edge so the type below stays legible.
    effects: [
      { id: uid('e'), kind: 'shadow', value: 0.55, color: PALETTE.ink, aux: 14, enabled: true },
    ],
  });
}