import { CarouselCardKind, CarouselDraft, CarouselLogoPlacement, CarouselSocialLink, CAROUSEL_SIZE } from './types';
import { BG, G, MUTED, SANS, SERIF, computeCardLayout, wrapText, type EditableField } from './layout';
import { DEFAULT_ACCENT } from './draft';
import { logoImageKey } from './images';

/**
 * Draws the three approved cards onto a canvas.
 *
 * This is canvas code rather than DOM on purpose. The deliverable is a PNG for
 * Instagram, so the same code that previews the card must produce the file —
 * a DOM screenshot would need html-to-image, and any drift between "looks
 * right in preview" and "looks right in the download" is exactly the bug we
 * already paid for once with the old studio.
 *
 * Every coordinate comes from `layout.ts`, which the editor overlay also reads.
 * That shared module is why an editable region can sit exactly on top of the
 * glyphs it edits: there is only one set of numbers.
 *
 * All coordinates are in 1080×1080 space, matching the approved design.
 */

export interface RenderOptions {
  kind: CarouselCardKind;
  draft: CarouselDraft;
  /** Pre-loaded images, keyed by the draft field that references them. */
  images?: Record<string, CanvasImageSource>;
}

/**
 * `#RRGGBB` (or `#RGB`) plus an alpha → an `rgba()` string for gradients.
 *
 * Non-hex values pass through unchanged so a hand-edited `accentColor` can
 * never make the tint throw and blank the whole card.
 */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const parts = m[1].length === 3
    ? [...m[1]].map(ch => parseInt(ch + ch, 16))
    : [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

/**
 * Draws one pre-laid-out field at exactly the position the editor overlay uses.
 *
 * The overlay draws its hit-region from the same `EditableField` this receives,
 * which is what keeps "click the text" and "the text" in agreement.
 */
function drawField(ctx: CanvasRenderingContext2D, f: EditableField): void {
  ctx.font = f.font;
  ctx.textAlign = f.align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = f.color;
  f.lines.forEach((line, i) => ctx.fillText(line, f.x, f.y + i * f.lineHeight));
}

/** Draws `text` wrapped, returning the y just past the last line. */
function drawParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = wrapText(ctx, text, maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

/**
 * Intrinsic pixel size of a drawable image source, best effort.
 *
 * HTMLImageElement exposes `naturalWidth`, ImageBitmap/canvas expose `width`;
 * a source that reports nothing returns zeros and the caller falls back to the
 * legacy fixed-box behaviour rather than dividing by zero.
 */
function imageSize(image: CanvasImageSource): { w: number; h: number } {
  const probe = image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  const w = probe.naturalWidth || probe.width || 0;
  const h = probe.naturalHeight || probe.height || 0;
  return { w: w > 0 ? w : 0, h: h > 0 ? h : 0 };
}

/**
 * Draws `image` inside the box `(x, y, w, h)` with CSS `object-fit` semantics.
 *
 * `'cover'` fills the box by cropping the overflow — no distortion and no
 * gaps; `'contain'` letterboxes the whole image, centred. Both preserve the
 * source aspect ratio, which is the whole point: the previous code handed
 * `drawImage` the box dimensions directly, silently stretching any photo or
 * logo whose aspect differed from the box.
 */
function drawImageFitted(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: 'cover' | 'contain',
): void {
  const nat = imageSize(image);
  if (!nat.w || !nat.h) {
    ctx.drawImage(image, x, y, w, h);
    return;
  }
  const scale = fit === 'cover'
    ? Math.max(w / nat.w, h / nat.h)
    : Math.min(w / nat.w, h / nat.h);
  const dw = nat.w * scale;
  const dh = nat.h * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/**
 * The placement box a logo occupies, in card coordinates.
 *
 * `size` scales both axes: the box keeps the reference wordmark's 3.2:1.2
 * proportion, so the size slider resizes logos predictably whatever their
 * artwork's shape.
 */
const LOGO_BOX_W = 4.6;
const LOGO_BOX_H = 1.6;

/**
 * The box a custom logo image is ACTUALLY drawn into: its own aspect ratio
 * contain-fitted inside the placement box, centred.
 *
 * The editor's drag handle and size readouts use this, so what the editor
 * measures is the logo's real bounds — grabbing the logo means grabbing the
 * logo, not an approximation of it. Without an image (the drawn wordmark, or
 * a source still loading) the full placement box is returned.
 */
export function logoImageRect(
  at: Required<CarouselLogoPlacement>,
  image?: CanvasImageSource,
): { left: number; top: number; width: number; height: number } {
  const boxW = at.size * LOGO_BOX_W;
  const boxH = at.size * LOGO_BOX_H;
  const box = { left: at.cx - boxW / 2, top: at.top, width: boxW, height: boxH };
  if (!image) return box;
  const nat = imageSize(image);
  if (!nat.w || !nat.h) return box;
  const scale = Math.min(boxW / nat.w, boxH / nat.h);
  const w = nat.w * scale;
  const h = nat.h * scale;
  return { left: at.cx - w / 2, top: at.top + (boxH - h) / 2, width: w, height: h };
}

/** Draws the Perspective wordmark, or a custom logo image when one is set. */
function drawLogo(
  ctx: CanvasRenderingContext2D,
  at: Required<CarouselLogoPlacement>,
  color: string,
  image?: CanvasImageSource,
): void {
  const { cx, top, size } = at;
  if (image) {
    // Contain-fit inside the placement box — the image keeps its own aspect
    // ratio, so a wide wordmark and a square badge both land undistorted.
    const rect = logoImageRect(at, image);
    ctx.drawImage(image, rect.left, rect.top, rect.width, rect.height);
    return;
  }
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `800 ${size}px ${SANS}`;
  ctx.fillText('Perspective', cx, top);
  ctx.font = `800 ${Math.round(size * 0.2)}px ${SANS}`;
  ctx.letterSpacing = `${Math.round(size * 0.06)}px`;
  ctx.fillText('GROUP', cx, top + size * 0.92);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

/** The category pill, top-right. */
function drawPill(ctx: CanvasRenderingContext2D, text: string, accent: string): void {
  ctx.save();
  ctx.font = `800 14px ${SANS}`;
  const w = ctx.measureText(text.toUpperCase()).width + 32;
  const h = 34;
  const x = CAROUSEL_SIZE - G.margin - w;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, 60, w, h, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), x + 16, 60 + h / 2 + 1);
  ctx.restore();
}

/** The short orange rule above a headline. */
function drawRule(ctx: CanvasRenderingContext2D, y: number, accent: string): void {
  ctx.save();
  ctx.fillStyle = accent;
  ctx.fillRect(G.margin, y, 64, 5);
  ctx.restore();
}

/** The date · reading-time footer plus the three pagination dots. */
function drawFooter(ctx: CanvasRenderingContext2D, draft: CarouselDraft, accent: string, activeDot: number): void {
  const y = CAROUSEL_SIZE - 46;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(G.margin, y - 40);
  ctx.lineTo(CAROUSEL_SIZE - G.margin, y - 40);
  ctx.stroke();

  ctx.fillStyle = '#e9e9e9';
  ctx.font = `500 ${G.footerSize}px ${SANS}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(`${draft.date}   ·   ${draft.readingTime}`, G.margin, y);

  // Dots, right-aligned; `activeDot` marks which card is being drawn.
  const dotR = 4;
  const gap = 10;
  const rightX = CAROUSEL_SIZE - G.margin;
  for (let i = 0; i < 3; i++) {
    const cx = rightX - (2 - i) * (dotR * 2 + gap);
    ctx.beginPath();
    ctx.arc(cx, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i === activeDot ? accent : '#4a4a4a';
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Card 1 — Couverture.
 *
 * The photo occupies the top ~70% and the headline sits on a scrim so it stays
 * legible over any image. Text is laid out in flow (measured, then drawn) so a
 * two-line headline pushes the lede down instead of colliding with it — the
 * same property the approved preview was fixed for.
 */
function drawCover(ctx: CanvasRenderingContext2D, draft: CarouselDraft, images: Record<string, CanvasImageSource>): void {
  const accent = draft.accentColor || DEFAULT_ACCENT;
  const layout = computeCardLayout('cover', draft);
  const photo = images.coverImage;

  // Fill the photo box first so a `'contain'` fit letterboxes onto the card's
  // own dark field instead of the flat background showing through.
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(0, 0, CAROUSEL_SIZE, G.photoHeight);
  if (photo) {
    drawImageFitted(ctx, photo, 0, 0, CAROUSEL_SIZE, G.photoHeight, draft.coverImageFit ?? 'cover');
  }

  // Scrim: dark at the top for the logo, and fading to solid at the fold so
  // the text block below sits on the flat background, not on the image. The
  // gradient is anchored to the photo's real bottom edge, so it stays correct
  // if the photo height ever changes again.
  const scrim = ctx.createLinearGradient(0, G.photoHeight - 330, 0, G.photoHeight + 18);
  scrim.addColorStop(0, 'rgba(11,11,11,0)');
  scrim.addColorStop(0.62, 'rgba(11,11,11,0.72)');
  scrim.addColorStop(1, BG);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, G.photoHeight - 330, CAROUSEL_SIZE, CAROUSEL_SIZE - G.photoHeight + 330);

  const topScrim = ctx.createLinearGradient(0, 0, 0, 260);
  topScrim.addColorStop(0, 'rgba(11,11,11,0.75)');
  topScrim.addColorStop(1, 'rgba(11,11,11,0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, CAROUSEL_SIZE, 260);

  drawLogo(ctx, layout.logo, accent, images[logoImageKey('cover')]);
  drawPill(ctx, draft.category, accent);

  drawRule(ctx, G.coverBodyTop, accent);

  // Painted from the shared layout so the editor's hit-regions land exactly on
  // these glyphs, and so the lede sits below the title however the title wraps.
  for (const f of layout.fields) drawField(ctx, f);

  drawFooter(ctx, draft, accent, 0);
}

/**
 * Card 2 — Développement.
 *
 * No photo: a black field carrying the key points, so the eye alternates
 * between photographic and typographic cards when the carousel is swiped.
 */
function drawBody(ctx: CanvasRenderingContext2D, draft: CarouselDraft, images: Record<string, CanvasImageSource>): void {
  const accent = draft.accentColor || DEFAULT_ACCENT;
  const layout = computeCardLayout('body', draft);

  drawLogo(ctx, layout.logo, '#fff', images[logoImageKey('body')]);
  drawPill(ctx, draft.category, accent);

  drawRule(ctx, G.ruleY, accent);

  for (const f of layout.fields) drawField(ctx, f);

  drawFooter(ctx, draft, accent, 1);
}

/**
 * Card 3 — Clôture.
 *
 * The quote and the social row flow downward from the top, so a longer quote
 * pushes the row rather than overlapping it. The centred logo is pinned to the
 * bottom, matching the approved design.
 */
function drawClosing(ctx: CanvasRenderingContext2D, draft: CarouselDraft, images: Record<string, CanvasImageSource>): void {
  const accent = draft.accentColor || DEFAULT_ACCENT;
  const layout = computeCardLayout('closing', draft);
  const photo = images.closingImage;

  ctx.fillStyle = '#2a2320';
  ctx.fillRect(0, 0, CAROUSEL_SIZE, CAROUSEL_SIZE);
  if (photo) {
    drawImageFitted(ctx, photo, 0, 0, CAROUSEL_SIZE, CAROUSEL_SIZE, draft.closingImageFit ?? 'cover');
  }

  // Tint strength is editor-controlled (0 = photo untouched, 1 = full brand wash),
  // defaulting to the reference's strong terracotta. Scaled from the three
  // reference stops so lighter settings still keep the edge-dense shape.
  const strength = typeof draft.closingTint === 'number' && Number.isFinite(draft.closingTint)
    ? Math.min(1, Math.max(0, draft.closingTint))
    : 0.85;
  ctx.save();
  const tint = ctx.createLinearGradient(0, 0, 0, CAROUSEL_SIZE);
  tint.addColorStop(0, withAlpha(accent, 0.62 * strength + 0.08));
  tint.addColorStop(0.4, withAlpha(accent, 0.36 * strength + 0.05));
  tint.addColorStop(1, withAlpha(accent, 0.72 * strength + 0.08));
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, CAROUSEL_SIZE, CAROUSEL_SIZE);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (const f of layout.fields) drawField(ctx, f);

  drawSocialRow(ctx, draft.socials, layout.socialRowY);

  drawLogo(ctx, layout.logo, '#fff', images[logoImageKey('closing')]);
}

/**
 * The social links on the closing card.
 *
 * Geometry mirrors the reference's `.c-end .row`: 78px gutters, 168px cells
 * fanned edge-to-edge (`justify-content: space-between`), so the first and
 * last icons sit exactly under the quote's own margins however many links the
 * draft carries. The outer shape is drawn by `drawSocialGlyph` — the reference
 * uses a circle for most icons but a screen (YouTube) and a rounded square
 * (Instagram) for two of them.
 */
function drawSocialRow(ctx: CanvasRenderingContext2D, socials: CarouselSocialLink[], y: number): void {
  if (!socials.length) return;
  const pad = 78;
  const cell = 168;
  const step = socials.length > 1 ? (CAROUSEL_SIZE - pad * 2 - cell) / (socials.length - 1) : 0;
  // 88px icons mirror the reference's large outlined badges; labels sit below.
  const r = 44;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  socials.forEach((social, i) => {
    const cx = socials.length > 1 ? pad + cell / 2 + step * i : CAROUSEL_SIZE / 2;
    const cy = y + r;

    drawSocialGlyph(ctx, social.icon, cx, cy);

    ctx.fillStyle = '#fff';
    ctx.font = `700 19px ${SANS}`;
    ctx.fillText(social.label, cx, cy + r + 26, cell + 20);
  });
  ctx.restore();
}

/**
 * One social icon — outer shape plus glyph — inside a 62px box centred on (cx, cy).
 *
 * Every path is the reference's own SVG geometry drawn 1:1 at 3px white stroke:
 *
 * - globe: outer circle r29, glyph circle r10 with a straight cross (`M31 21v20
 *   M21 31h20`);
 * - youtube: outer rounded SCREEN (42×38, r10), not a circle — the old code drew
 *   a circle for every icon, which is why this one looked wrong — plus the play
 *   tail and a solid play triangle;
 * - tiktok: outer circle r29, the note's stem curling under via the large-arc
 *   from `M37 20v20a6 6 0 1 1-6-6`, plus the top flag;
 * - facebook: outer circle r29, the reference's f-shaped path;
 * - instagram: outer rounded SQUARE (50×50, r12), not a circle, with the inner
 *   rounded square and dot.
 */
function drawSocialGlyph(ctx: CanvasRenderingContext2D, icon: string, cx: number, cy: number): void {
  ctx.save();
  // Scale the reference's 62-box geometry up to the 88px badges (≈1.42x).
  ctx.translate(cx, cy);
  ctx.scale(1.42, 1.42);
  ctx.translate(-cx, -cy);
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const circle = (r: number): void => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  switch (icon) {
    case 'youtube':
      // Screen frame: ref `rect x4 y12 42×38 rx10` in the 62-box.
      ctx.beginPath();
      ctx.roundRect(cx - 27, cy - 19, 42, 38, 10);
      ctx.stroke();
      // Play tail: ref `M43 24l14-6v26L43 38`.
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy - 7);
      ctx.lineTo(cx + 26, cy - 13);
      ctx.lineTo(cx + 26, cy + 13);
      ctx.lineTo(cx + 12, cy + 7);
      ctx.stroke();
      // Solid play: ref `M24 27l11 5-11 5z`.
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy - 4);
      ctx.lineTo(cx + 4, cy + 1);
      ctx.lineTo(cx - 7, cy + 6);
      ctx.closePath();
      ctx.fill();
      break;
    case 'tiktok':
      circle(G.iconSize / 2 - 2);
      // Stem down, then the note's bottom curl: `v20 a6 6 0 1 1 -6 -6`. The arc
      // runs 270° (0 → 1.5π) about (cx, cy+9) so the tail sweeps under and back
      // up — the previous 0 → 0.5π sweep looped the long way and drew a lump.
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy - 11);
      ctx.lineTo(cx + 6, cy + 9);
      ctx.arc(cx, cy + 9, 6, 0, Math.PI * 1.5);
      ctx.stroke();
      // Top flag: ref `M37 20c0 5 3 8 8 8`.
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy - 11);
      ctx.bezierCurveTo(cx + 6, cy - 6, cx + 9, cy - 3, cx + 14, cy - 3);
      ctx.stroke();
      break;
    case 'facebook':
      circle(G.iconSize / 2 - 2);
      // The f: ref `M40 21H27c-3.5 0-6 2.5-6 6v14c0 3.5 2.5 6 6 6h13`.
      ctx.beginPath();
      ctx.moveTo(cx + 9, cy - 10);
      ctx.lineTo(cx - 4, cy - 10);
      ctx.bezierCurveTo(cx - 7.5, cy - 10, cx - 10, cy - 7.5, cx - 10, cy - 4);
      ctx.lineTo(cx - 10, cy + 10);
      ctx.bezierCurveTo(cx - 10, cy + 13.5, cx - 7.5, cy + 16, cx - 4, cy + 16);
      ctx.lineTo(cx + 9, cy + 16);
      ctx.stroke();
      // Inner stem: ref `M29 27v14`.
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 4);
      ctx.lineTo(cx - 2, cy + 10);
      ctx.stroke();
      break;
    case 'instagram':
      // Outer rounded square: ref `rect x6 y6 50×50 rx12`.
      ctx.beginPath();
      ctx.roundRect(cx - 25, cy - 25, 50, 50, 12);
      ctx.stroke();
      // Inner rounded square + dot: ref `rect x20 y20 22×22 rx6` and `circle
      // 41.5 20.5 r1.5 fill`.
      ctx.beginPath();
      ctx.roundRect(cx - 11, cy - 11, 22, 22, 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 10.5, cy - 10.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    default: // globe
      circle(G.iconSize / 2 - 2);
      // Glyph circle + straight cross: ref `circle 31 31 r10`, `M31 21v20`,
      // `M21 31h20`.
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx, cy + 10);
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.stroke();
  }
  ctx.restore();
}

/** The three cards, in carousel order. */
export const CARD_KINDS: CarouselCardKind[] = ['cover', 'body', 'closing'];

/**
 * Paints one card onto `ctx`.
 *
 * The caller owns the canvas and any image loading; this function only draws,
 * so the same code runs for the on-screen preview and for the PNG download.
 */
export function renderCard(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
): void {
  const { kind, draft, images = {} } = options;
  ctx.save();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CAROUSEL_SIZE, CAROUSEL_SIZE);
  ctx.textBaseline = 'top';

  if (kind === 'cover') drawCover(ctx, draft, images);
  else if (kind === 'body') drawBody(ctx, draft, images);
  else drawClosing(ctx, draft, images);

  ctx.restore();
}

/** Renders a card to a data URL, used for the PNG download. */
export function renderCardToDataUrl(
  kind: CarouselCardKind,
  draft: CarouselDraft,
  images: Record<string, CanvasImageSource> = {},
): string {
  const canvas = document.createElement('canvas');
  canvas.width = CAROUSEL_SIZE;
  canvas.height = CAROUSEL_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  renderCard(ctx, { kind, draft, images });
  return canvas.toDataURL('image/png');
}