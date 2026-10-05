/**
 * Card geometry — the single source of truth for BOTH the canvas renderer and
 * the in-place editor overlay.
 *
 * This module exists because the editor is direct-manipulation: the editor
 * draws clickable/editable regions on top of the preview. If those regions were
 * positioned by a second, hand-written copy of the coordinates, they would
 * slowly drift away from what the canvas draws, and the editor would end up
 * editing the wrong pixels. So layout is COMPUTED here once, and both the
 * renderer and the overlay consume the result.
 *
 * The overlay renders inside a 1080×1080 element scaled with a CSS transform,
 * which is why every number here is in card pixels: one overlay pixel is one
 * canvas pixel, at any preview size.
 */

import { CarouselCardKind, CarouselDraft, CarouselLogoPlacement, CAROUSEL_SIZE } from './types';

/** Font stacks. Shared so the overlay's CSS matches the canvas exactly. */
export const SERIF = '"Playfair Display", Georgia, serif';
export const SANS = 'Inter, system-ui, sans-serif';
export const BG = '#0b0b0b';
export const MUTED = '#cfcfcf';

/**
 * Fixed geometry, in card pixels. Mirrors the approved design 1:1.
 *
 * These were re-measured against the reference cards: the cover photo ends at
 * ~690px (not 750) and the accent rule above the headline sits at ~708, which
 * is where the fold between photo and text block falls. `coverBodyTop` is
 * therefore the COVER's text-block top only — it must never be reused to clamp
 * card 2's paragraphs, which is exactly the coupling that previously pushed
 * card 2's body text down into the footer.
 */
export const G = {
  margin: 58,
  photoHeight: 690,
  /** Accent-rule y and top of the cover's text block. */
  coverBodyTop: 708,
  /**
   * Distance from the card's bottom edge up to the BOTTOM of the brief.
   *
   * The brief is bottom-anchored rather than stacked under the headline so it
   * keeps the reference's position whatever the headline length.
   */
  coverBottomPad: 96,
  coverTitleSize: 52,
  coverTitleLead: 58,
  ledeSize: 27,
  ledeLead: 38,
  ledeWidth: 900,
  /** Accent-rule y on card 2, above the body heading. */
  ruleY: 196,
  bodyTitleSize: 66,
  bodyTitleLead: 74,
  bodyHeadingTop: 236,
  /** First body paragraph's y, independent of the cover's fold. */
  bodyTextTop: 316,
  paraSize: 29,
  paraLead: 43,
  paraGap: 34,
  endPad: 78,
  endTop: 88,
  quoteSize: 42,
  quoteLead: 55,
  bySize: 26,
  byGap: 30,
  taglineSize: 33,
  taglineLead: 45,
  taglineGap: 64,
  taglineInset: 120,
  followSize: 28,
  followGap: 52,
  iconSize: 62,
  footerSize: 21,
  logoSize: 56,
  endLogoSize: 70,
};

/** Where the wordmark sits on each card until the editor drags it. */
const DEFAULT_LOGO: Record<CarouselCardKind, Required<CarouselLogoPlacement>> = {
  cover: { cx: G.margin + 130, top: 46, size: G.logoSize },
  body: { cx: G.margin + 130, top: 46, size: G.logoSize },
  closing: { cx: CAROUSEL_SIZE / 2, top: 928, size: G.endLogoSize },
};

/* ------------------------------------------------------------------ *
 * Per-block typography overrides
 *
 * The editor may resize a text block (the artifact's size slider), but the
 * APPROVED size remains the default and every override is clamped to a sane
 * range for that block — so a slider can fine-tune a headline without ever
 * publishing a 2px or 900px one. `layout.ts` owns the ranges because it owns
 * the design; the renderer, the overlay and `normalizeDraft` all read them here.
 * ------------------------------------------------------------------ */

/** Absolute floor/ceiling for any block size override, in card pixels. */
export const TEXT_SIZE_MIN = 14;
export const TEXT_SIZE_MAX = 160;

/** The approved font size (px) of one field id, taken from `G`. */
export function defaultFontSize(id: string): number {
  switch (id.replace(/-\d+$/, '')) {
    case 'title': return G.coverTitleSize;
    case 'lede': return G.ledeSize;
    case 'bodyHeading': return G.bodyTitleSize;
    case 'paragraph': return G.paraSize;
    case 'quote': return G.quoteSize;
    case 'quoteAttribution': return G.bySize;
    case 'tagline': return G.taglineSize;
    case 'socialHeading': return G.followSize;
    default: return G.paraSize;
  }
}

/** Slider bounds for one field: 60%–160% of the approved size. */
export function textSizeRange(id: string): { min: number; max: number } {
  const def = defaultFontSize(id);
  return {
    min: Math.max(TEXT_SIZE_MIN, Math.round(def * 0.6)),
    max: Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN + 8, Math.round(def * 1.6))),
  };
}

/** Field ids that may carry an override — exactly the editable runs of the template. */
const TEXT_SIZE_ID =
  /^(title|lede|bodyHeading|paragraph-\d+|quote|quoteAttribution|tagline|socialHeading)$/;

/**
 * Clamps a stored override map into this card's legal ranges.
 *
 * Shared by `normalizeDraft` (so nothing invalid reaches the canvas) and the
 * tests. Unknown ids, NaN and non-numbers are dropped rather than guessed at;
 * every kept value lands inside its own field's slider range.
 */
export function sanitizeTextSizes(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!TEXT_SIZE_ID.test(id)) continue;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) continue;
    const { min, max } = textSizeRange(id);
    out[id] = Math.min(max, Math.max(min, Math.round(n)));
  }
  return Object.keys(out).length ? out : undefined;
}

/** The effective size of one block: a valid stored override, else the approved default. */
export function fieldFontSize(draft: CarouselDraft, id: string): number {
  const stored = draft.textSizes?.[id];
  if (typeof stored === 'number' && Number.isFinite(stored)) {
    const { min, max } = textSizeRange(id);
    return Math.min(max, Math.max(min, Math.round(stored)));
  }
  return defaultFontSize(id);
}

/**
 * One editable text run.
 *
 * `lines` is pre-wrapped rather than left to the renderer so the overlay knows
 * the block's exact height, and so the editor can draw a hit-region matching the
 * glyphs the canvas produced.
 */
export interface EditableField {
  /** Stable id; also the React key and the draft field this run edits. */
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  lines: string[];
  lineHeight: number;
  font: string;
  align: 'left' | 'center';
  color: string;
  height: number;
}

/** Everything needed to place the editor's handles for one card. */
export interface CardLayout {
  fields: EditableField[];
  logo: Required<CarouselLogoPlacement>;
  /** Top of the social circles on the closing card. */
  socialRowY: number;
}

/**
 * An offscreen 2D context used only to measure text.
 *
 * Measuring has to happen in canvas because that is what decides where a line
 * breaks; asking the DOM instead would break differently and reintroduce the
 * exact drift this module exists to prevent.
 */
let measuringCtx: CanvasRenderingContext2D | null | undefined;

function getMeasuringCtx(): CanvasRenderingContext2D | null {
  if (measuringCtx !== undefined) return measuringCtx;
  // Guarded for the prerender/SSR pass, where there is no DOM at all.
  if (typeof document === 'undefined') {
    measuringCtx = null;
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = CAROUSEL_SIZE;
  canvas.height = CAROUSEL_SIZE;
  measuringCtx = canvas.getContext('2d');
  return measuringCtx;
}

/** Wraps `text` to `maxWidth`, returning the lines. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Wraps using the shared measuring context; empty when there is no DOM. */
function measure(font: string, text: string, maxWidth: number): string[] {
  const ctx = getMeasuringCtx();
  if (!ctx) {
    // Static-build path: no measurable geometry, but a usable fallback so
    // nothing here can throw during a prerender.
    return text ? [text] : [];
  }
  ctx.font = font;
  return wrapText(ctx, text, maxWidth);
}

function field(
  ctx: CanvasRenderingContext2D,
  spec: Omit<EditableField, 'lines' | 'height'>,
): EditableField {
  const lines = measure(spec.font, spec.text, spec.width);
  return {
    ...spec,
    lines,
    height: Math.max(lines.length * spec.lineHeight, spec.lineHeight),
  };
}

/**
 * Computes the editable layout of one card.
 *
 * Blocks stack in flow: a longer headline pushes the paragraph below it rather
 * than colliding with it, which is the property the approved design relies on.
 */
export function computeCardLayout(
  kind: CarouselCardKind,
  draft: CarouselDraft,
): CardLayout {
  const ctx = getMeasuringCtx();
  if (!ctx) {
    // Static-build path: no measurable geometry, but a usable empty layout so
    // callers never have to special-case a missing DOM.
    return { fields: [], logo: DEFAULT_LOGO[kind], socialRowY: 0 };
  }

  const logo = { ...DEFAULT_LOGO[kind], ...(draft.logos?.[kind] || {}) };
  const fields: EditableField[] = [];
  const gutter = CAROUSEL_SIZE - G.margin * 2;

  if (kind === 'cover') {
    const titleSize = fieldFontSize(draft, 'title');
    const titleLead = Math.round(titleSize * G.coverTitleLead / G.coverTitleSize);
    const title = field(ctx, {
      id: 'title',
      text: draft.title,
      x: G.margin,
      y: G.coverBodyTop + 47,
      width: gutter,
      lineHeight: titleLead,
      font: `italic 700 ${titleSize}px ${SERIF}`,
      align: 'left',
      color: '#ffffff',
    });
    fields.push(title);

    /**
     * The lede is bottom-anchored to the card, not stacked under the title.
     *
     * In the reference the brief sits in the bottom band of the cover, a fixed
     * distance above the footer line. Flowing it off the title instead meant a
     * short headline left the brief floating high with dead space beneath it, and
     * a long one pushed it off the card entirely. Anchoring the block's BOTTOM
     * edge keeps the last line of copy at the same height whatever the headline
     * length, which is what the reference shows.
     */
    const ledeWidth = Math.min(G.ledeWidth, gutter);
    const ledeSize = fieldFontSize(draft, 'lede');
    const ledeLead = Math.round(ledeSize * G.ledeLead / G.ledeSize);
    const ledeLines = wrapText(ctx, draft.lede, ledeWidth);
    const ledeBlockHeight = ledeLines.length * ledeLead;

    // Cap the offset so the title is never drawn on top of the brief when the
    // headline is very long; the title simply wins and the brief follows it.
    const ledeTop = Math.max(
      title.y + title.height + 26,
      CAROUSEL_SIZE - G.coverBottomPad - ledeBlockHeight,
    );

    fields.push(field(ctx, {
      id: 'lede',
      text: draft.lede,
      x: G.margin,
      y: ledeTop,
      width: ledeWidth,
      lineHeight: ledeLead,
      font: `${ledeSize}px ${SANS}`,
      align: 'left',
      color: MUTED,
    }));
    return { fields, logo, socialRowY: 0 };
  }

  if (kind === 'body') {
    const headingSize = fieldFontSize(draft, 'bodyHeading');
    const headingLead = Math.round(headingSize * G.bodyTitleLead / G.bodyTitleSize);
    const heading = field(ctx, {
      id: 'bodyHeading',
      text: draft.bodyHeading,
      x: G.margin,
      y: G.bodyHeadingTop,
      width: gutter,
      lineHeight: headingLead,
      font: `italic 700 ${headingSize}px ${SERIF}`,
      align: 'left',
      color: '#ffffff',
    });
    fields.push(heading);

    // Anchored to the body card's OWN first-paragraph line, not the cover's
    // text-block top. Clamping to `coverBodyTop` (708) pushed card 2's text
    // into the footer; the heading's own flow still wins when it is taller
    // than one line, so a long heading pushes the paragraphs down correctly.
    // The 50px lead matches the reference's `.c-text .body` top of 360 for a
    // one-line heading (236 + 74 + 50).
    let y = Math.max(G.bodyTextTop, heading.y + heading.height + 50);
    draft.paragraphs.forEach((para, i) => {
      const pSize = fieldFontSize(draft, `paragraph-${i}`);
      const pLead = Math.round(pSize * G.paraLead / G.paraSize);
      const p = field(ctx, {
        id: `paragraph-${i}`,
        text: para,
        x: G.margin,
        y,
        width: gutter,
        lineHeight: pLead,
        font: `${pSize}px ${SANS}`,
        align: 'left',
        color: '#d6d6d6',
      });
      fields.push(p);
      y = p.y + p.height + G.paraGap;
    });
    return { fields, logo, socialRowY: 0 };
  }

  // Closing: quote, attribution, tagline and the social label all flow downward.
  // Gaps mirror the reference's `.c-end` margins: quote top 88, by +30,
  // tagline +56, follow +64, social row +46 below the follow line's own height.
  const quoteWidth = CAROUSEL_SIZE - G.endPad * 2;
  const quoteSize = fieldFontSize(draft, 'quote');
  const quoteLead = Math.round(quoteSize * G.quoteLead / G.quoteSize);
  const quote = field(ctx, {
    id: 'quote',
    text: `« ${draft.quote} »`,
    x: G.endPad,
    y: G.endTop,
    width: quoteWidth,
    lineHeight: quoteLead,
    font: `italic 600 ${quoteSize}px ${SERIF}`,
    align: 'left',
    color: '#ffffff',
  });
  fields.push(quote);

  const bySize = fieldFontSize(draft, 'quoteAttribution');
  const by = field(ctx, {
    id: 'quoteAttribution',
    text: draft.quoteAttribution,
    x: G.endPad + 4,
    y: quote.y + quote.height + G.byGap,
    width: quoteWidth,
    lineHeight: bySize,
    font: `italic ${bySize}px ${SERIF}`,
    align: 'left',
    color: 'rgba(255,255,255,0.92)',
  });
  fields.push(by);

  const tagSize = fieldFontSize(draft, 'tagline');
  const tagLead = Math.round(tagSize * G.taglineLead / G.taglineSize);
  const tagline = field(ctx, {
    id: 'tagline',
    text: draft.tagline,
    x: CAROUSEL_SIZE / 2,
    y: by.y + by.height + 56,
    width: CAROUSEL_SIZE - G.taglineInset * 2,
    lineHeight: tagLead,
    font: `italic 700 ${tagSize}px ${SERIF}`,
    align: 'center',
    color: '#ffffff',
  });
  fields.push(tagline);

  const followSize = fieldFontSize(draft, 'socialHeading');
  const follow = field(ctx, {
    id: 'socialHeading',
    text: draft.socialHeading,
    x: CAROUSEL_SIZE / 2,
    y: tagline.y + tagline.height + G.taglineGap,
    width: gutter,
    lineHeight: followSize,
    font: `italic ${followSize}px ${SERIF}`,
    align: 'center',
    color: '#ffffff',
  });
  fields.push(follow);

  // The reference's `.row` sits 46px below the follow line's own height: it is
  // a block margin in the flow, not a distance measured from the text's top.
  return { fields, logo, socialRowY: follow.y + follow.height + 46 };
}
