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

/**
 * The reference palette, sampled from the approved cards.
 *
 * `BG` is the card field — a WARM near-black brown, not neutral black; the
 * `#0b0b0b` that used to live here was the single biggest reason built cards
 * read colder than the reference. `ember` is the bright orange of the accent
 * rule, the cover wordmark and the active dot; `rust` the brick-red wash of
 * the closing card; `bone`/`dim` the two text tiers (headline tier vs
 * secondary paragraphs); `muted` the lede/footer grey.
 */
export const BG = '#17120f';
export const EMBER = '#e8490f';
export const RUST = '#a23c14';
export const BONE = '#f5ede4';
export const DIM = '#b5a99d';
export const MUTED = '#c6bcb0';

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
   * keeps the reference's position whatever the headline length. Re-measured
   * from the reference card: its two-line brief ends ~168px above the bottom
   * edge — the 96 that used to live here sat the brief a full 70px too low,
   * almost on top of the footer rule.
   */
  coverBottomPad: 168,
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
  iconSize: 88,
  footerSize: 21,
  /** Footer hairline y and text-centre y, shared with the renderer. */
  footerRuleY: CAROUSEL_SIZE - 86,
  footerTextY: CAROUSEL_SIZE - 46,
  /** Category pill geometry (cards 1 & 2), matching the reference's tag. */
  pillY: 56,
  pillH: 40,
  pillSize: 18,
  logoSize: 84,
  endLogoSize: 128,
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
  /** Rendered size after auto-fit (equals requested size when it fit). */
  fontSize: number;
  /** True when auto-fit shrank the block to stay inside its frame. */
  fitted?: boolean;
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
  spec: Omit<EditableField, 'lines' | 'height' | 'fontSize' | 'fitted'> & { fontSize: number; maxHeight?: number },
): EditableField {
  void ctx;
  const attempt = (size: number) => {
    const lead = Math.max(10, Math.round(spec.lineHeight * size / spec.fontSize));
    const font = spec.font.replace(/(\d+)px/, String(size) + 'px');
    const lines = measure(font, spec.text, spec.width);
    return { font, lead, lines, height: Math.max(lines.length * lead, lead) };
  };
  const maxH = spec.maxHeight || 0;
  let size = spec.fontSize;
  let r = attempt(size);
  if (maxH > 0 && r.height > maxH) {
    const floor = Math.max(12, Math.round(spec.fontSize * 0.45));
    while (size > floor) {
      size -= 1;
      r = attempt(size);
      if (r.height <= maxH) break;
    }
  }
  return {
    id: spec.id, text: spec.text, x: spec.x, y: spec.y, width: spec.width,
    lines: r.lines, lineHeight: r.lead, font: r.font, align: spec.align,
    color: spec.color, height: r.height, fontSize: size, fitted: size < spec.fontSize,
  };
}

/** Per-block text-box width scale (1 = full gutter). Clamped 0.5-1. */
export function fieldWidthScale(draft: CarouselDraft, id: string): number {
  const v = (draft as { textWidths?: Record<string, unknown> }).textWidths?.[id];
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0.5, Math.round(n * 100) / 100));
}

/**
 * The logo's snap guides, as axis + position pairs (card px).
 *
 * Vertical anchors are the columns the reference aligns to: the 78/1002
 * gutters and the card centre. Horizontal anchors are the rows: 46 (the
 * approved default top), `pillY` (the category pill's top line — aligning an
 * uploaded logo's row with this is exactly how you line the two up) and 928
 * (the closing card's bottom wordmark). The preview draws whichever are
 * within 14px while the logo is being handled. Guides never move the logo;
 * they only make the alignment visible.
 */
export function logoSnapGuides(at: Required<CarouselLogoPlacement>): { axis: 'x' | 'y'; pos: number; label: string }[] {
  const guides: { axis: 'x' | 'y'; pos: number; label: string }[] = [];
  const columns = [G.margin, CAROUSEL_SIZE / 2, CAROUSEL_SIZE - G.margin];
  for (const ax of columns) {
    if (Math.abs(at.cx - ax) <= 14) guides.push({ axis: 'x', pos: ax, label: `x ${Math.round(ax)}` });
  }
  const rows = [46, G.pillY, 928];
  for (const ay of rows) {
    if (Math.abs(at.top - ay) <= 14) guides.push({ axis: 'y', pos: ay, label: `y ${Math.round(ay)}` });
  }
  return guides;
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
    const titleW = Math.round(gutter * fieldWidthScale(draft, 'title'));
    const title = field(ctx, {
      id: 'title',
      text: draft.title,
      x: G.margin,
      y: G.coverBodyTop + 47,
      width: titleW,
      lineHeight: titleLead,
      font: `italic 700 ${titleSize}px ${SERIF}`,
      align: 'left',
      color: BONE,
      fontSize: titleSize,
      // Two full lines at the approved lead, plus slack. The reference
      // headline is set LARGE; the old 80px ceiling silently auto-shrank
      // every two-line title to ~36px, which is nothing like the design.
      maxHeight: Math.max(80, G.coverTitleLead * 2 + 20),
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
    const ledeW = Math.round(ledeWidth * fieldWidthScale(draft, 'lede'));
    const ledeLines = wrapText(ctx, draft.lede, ledeW);
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
      width: ledeW,
      lineHeight: ledeLead,
      font: `${ledeSize}px ${SANS}`,
      align: 'left',
      color: MUTED,
      fontSize: ledeSize,
      // The real floor is the footer hairline: a long headline may push the
      // brief below its anchor, and it must then sit on top of the rule
      // rather than being shrunk against the (higher) anchor.
      maxHeight: Math.max(60, G.footerRuleY - ledeTop),
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
      width: Math.round(gutter * fieldWidthScale(draft, 'bodyHeading')),
      lineHeight: headingLead,
      font: `italic 700 ${headingSize}px ${SERIF}`,
      align: 'left',
      color: BONE,
      fontSize: headingSize,
      maxHeight: 220,
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
        width: Math.round(gutter * fieldWidthScale(draft, `paragraph-${i}`)),
        lineHeight: pLead,
        font: `${pSize}px ${SANS}`,
        align: 'left',
        // The reference's two text tiers: the key point in cream, the
        // secondary paragraphs a dimmer warm grey — never one flat grey.
        color: i === 0 ? BONE : DIM,
        fontSize: pSize,
        maxHeight: Math.max(60, CAROUSEL_SIZE - 130 - y),
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
    width: Math.round(quoteWidth * fieldWidthScale(draft, 'quote')),
    lineHeight: quoteLead,
    font: `italic 600 ${quoteSize}px ${SERIF}`,
    align: 'left',
    color: '#ffffff',
    fontSize: quoteSize,
    maxHeight: 330,
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
    fontSize: bySize,
  });
  fields.push(by);

  const tagSize = fieldFontSize(draft, 'tagline');
  const tagLead = Math.round(tagSize * G.taglineLead / G.taglineSize);
  const tagline = field(ctx, {
    id: 'tagline',
    text: draft.tagline,
    x: CAROUSEL_SIZE / 2,
    y: by.y + by.height + 56,
    width: Math.round((CAROUSEL_SIZE - G.taglineInset * 2) * fieldWidthScale(draft, 'tagline')),
    lineHeight: tagLead,
    font: `italic 700 ${tagSize}px ${SERIF}`,
    align: 'center',
    color: '#ffffff',
    fontSize: tagSize,
    maxHeight: 150,
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
    fontSize: followSize,
  });
  fields.push(follow);

  // The reference's `.row` sits 46px below the follow line's own height: it is
  // a block margin in the flow, not a distance measured from the text's top.
  return { fields, logo, socialRowY: follow.y + follow.height + 46 };
}
