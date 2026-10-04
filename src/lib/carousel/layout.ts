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
    const title = field(ctx, {
      id: 'title',
      text: draft.title,
      x: G.margin,
      y: G.coverBodyTop + 47,
      width: gutter,
      lineHeight: G.coverTitleLead,
      font: `italic 700 ${G.coverTitleSize}px ${SERIF}`,
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
    const ledeLines = wrapText(ctx, draft.lede, ledeWidth);
    const ledeBlockHeight = ledeLines.length * G.ledeLead;

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
      lineHeight: G.ledeLead,
      font: `${G.ledeSize}px ${SANS}`,
      align: 'left',
      color: MUTED,
    }));
    return { fields, logo, socialRowY: 0 };
  }

  if (kind === 'body') {
    const heading = field(ctx, {
      id: 'bodyHeading',
      text: draft.bodyHeading,
      x: G.margin,
      y: G.bodyHeadingTop,
      width: gutter,
      lineHeight: G.bodyTitleLead,
      font: `italic 700 ${G.bodyTitleSize}px ${SERIF}`,
      align: 'left',
      color: '#ffffff',
    });
    fields.push(heading);

    // Anchored to the body card's OWN first-paragraph line, not the cover's
    // text-block top. Clamping to `coverBodyTop` (708) pushed card 2's text
    // into the footer; the heading's own flow still wins when it is taller
    // than one line, so a long heading pushes the paragraphs down correctly.
    let y = Math.max(G.bodyTextTop, heading.y + heading.height + 40);
    draft.paragraphs.forEach((para, i) => {
      const p = field(ctx, {
        id: `paragraph-${i}`,
        text: para,
        x: G.margin,
        y,
        width: gutter,
        lineHeight: G.paraLead,
        font: `${G.paraSize}px ${SANS}`,
        align: 'left',
        color: '#d6d6d6',
      });
      fields.push(p);
      y = p.y + p.height + G.paraGap;
    });
    return { fields, logo, socialRowY: 0 };
  }

  // Closing: quote, attribution, tagline and the social label all flow downward.
  const quoteWidth = CAROUSEL_SIZE - G.endPad * 2;
  const quote = field(ctx, {
    id: 'quote',
    text: `« ${draft.quote} »`,
    x: G.endPad,
    y: G.endTop,
    width: quoteWidth,
    lineHeight: G.quoteLead,
    font: `italic 600 ${G.quoteSize}px ${SERIF}`,
    align: 'left',
    color: '#ffffff',
  });
  fields.push(quote);

  const by = field(ctx, {
    id: 'quoteAttribution',
    text: draft.quoteAttribution,
    x: G.endPad + 4,
    y: quote.y + quote.height + G.byGap,
    width: quoteWidth,
    lineHeight: G.bySize,
    font: `italic ${G.bySize}px ${SERIF}`,
    align: 'left',
    color: 'rgba(255,255,255,0.92)',
  });
  fields.push(by);

  const tagline = field(ctx, {
    id: 'tagline',
    text: draft.tagline,
    x: CAROUSEL_SIZE / 2,
    y: by.y + by.height + 60,
    width: CAROUSEL_SIZE - G.taglineInset * 2,
    lineHeight: G.taglineLead,
    font: `italic 700 ${G.taglineSize}px ${SERIF}`,
    align: 'center',
    color: '#ffffff',
  });
  fields.push(tagline);

  const follow = field(ctx, {
    id: 'socialHeading',
    text: draft.socialHeading,
    x: CAROUSEL_SIZE / 2,
    y: tagline.y + tagline.height + G.taglineGap,
    width: gutter,
    lineHeight: G.followSize,
    font: `italic ${G.followSize}px ${SERIF}`,
    align: 'center',
    color: '#ffffff',
  });
  fields.push(follow);

  return { fields, logo, socialRowY: follow.y + G.followGap };
}
