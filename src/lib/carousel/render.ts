import { CarouselCardKind, CarouselDraft, CarouselSocialLink, CAROUSEL_SIZE } from './types';
import { DEFAULT_ACCENT } from './draft';

/**
 * Draws the three approved cards onto a canvas.
 *
 * This is canvas code rather than DOM on purpose. The deliverable is a PNG for
 * Instagram, so the same code that previews the card must produce the file —
 * a DOM screenshot would need html-to-image, and any drift between "looks
 * right in preview" and "looks right in the download" is exactly the bug we
 * already paid for once with the old studio.
 *
 * Every coordinate below is in 1080×1080 space, matching the approved design.
 */

/** Geometry, in card pixels. Mirrors the approved design 1:1. */
const G = {
  margin: 58,
  photoHeight: 750,      // cover card photo
  bodyTop: 752,          // cover card text block top
  coverTitleSize: 52,
  ledeSize: 27,
  textRuleY: 196,
  bodyTitleSize: 66,
  coverBodyTop: 360,
  paraSize: 29,
  endPad: 78,
  endTop: 88,
  quoteSize: 42,
  bySize: 26,
  taglineSize: 33,
  followSize: 28,
  rowTop: 570,
  iconSize: 62,
  footerSize: 21,
  logoSize: 56,
  endLogoSize: 70,
};

const SERIF = '"Playfair Display", Georgia, serif';
const SANS = 'Inter, system-ui, sans-serif';
const BG = '#0b0b0b';
const MUTED = '#cfcfcf';

export interface RenderOptions {
  kind: CarouselCardKind;
  draft: CarouselDraft;
  /** Pre-loaded images, keyed by the draft field that references them. */
  images?: Record<string, CanvasImageSource>;
}

/** Wraps `text` to `maxWidth`, returning the lines. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

/** Draws the Perspective wordmark, or a custom logo image when one is set. */
function drawLogo(
  ctx: CanvasRenderingContext2D,
  draft: CarouselDraft,
  cx: number,
  top: number,
  size: number,
  color: string,
  image?: CanvasImageSource,
): void {
  if (image) {
    const scale = size / 260; // custom logos are laid out on a 260px reference width
    ctx.drawImage(image, cx - (260 * scale) / 2, top, 260 * scale, (120 * scale));
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
  const photo = images.coverImage;

  if (photo) {
    ctx.drawImage(photo, 0, 0, CAROUSEL_SIZE, G.photoHeight);
  } else {
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, CAROUSEL_SIZE, G.photoHeight);
  }

  // Scrim: dark at the top for the logo, and fading to solid at the fold so
  // the text block below sits on the flat background, not on the image.
  const scrim = ctx.createLinearGradient(0, 300, 0, G.coverBodyTop + 60);
  scrim.addColorStop(0, 'rgba(11,11,11,0)');
  scrim.addColorStop(0.55, 'rgba(11,11,11,0.55)');
  scrim.addColorStop(1, BG);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 300, CAROUSEL_SIZE, CAROUSEL_SIZE - 300);

  const topScrim = ctx.createLinearGradient(0, 0, 0, 260);
  topScrim.addColorStop(0, 'rgba(11,11,11,0.75)');
  topScrim.addColorStop(1, 'rgba(11,11,11,0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, CAROUSEL_SIZE, 260);

  drawLogo(ctx, draft, G.margin + 130, 46, G.logoSize, accent, images.logo);
  drawPill(ctx, draft.category, accent);

  let y = G.coverBodyTop;
  drawRule(ctx, y, accent);
  y += 47;

  ctx.fillStyle = '#fff';
  ctx.font = `italic 700 ${G.coverTitleSize}px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  y = drawParagraph(ctx, draft.title, G.margin, y, CAROUSEL_SIZE - G.margin * 2, 58) + 26;

  ctx.fillStyle = MUTED;
  ctx.font = `${G.ledeSize}px ${SANS}`;
  drawParagraph(ctx, draft.lede, G.margin, y, 900, 38);

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

  drawLogo(ctx, draft, G.margin + 130, 46, G.logoSize, '#fff', images.logo);
  drawPill(ctx, draft.category, accent);

  drawRule(ctx, G.textRuleY, accent);

  ctx.fillStyle = '#fff';
  ctx.font = `italic 700 ${G.bodyTitleSize}px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const headingBottom = drawParagraph(ctx, draft.bodyHeading, G.margin, 236, CAROUSEL_SIZE - G.margin * 2, 74);

  ctx.fillStyle = '#d6d6d6';
  ctx.font = `${G.paraSize}px ${SANS}`;
  let y = Math.max(G.coverBodyTop, headingBottom + 80);
  for (const para of draft.paragraphs) {
    y = drawParagraph(ctx, para, G.margin, y, CAROUSEL_SIZE - G.margin * 2, 43) + 34;
  }

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
  const photo = images.closingImage;

  if (photo) {
    ctx.drawImage(photo, 0, 0, CAROUSEL_SIZE, CAROUSEL_SIZE);
  } else {
    ctx.fillStyle = '#2a2320';
    ctx.fillRect(0, 0, CAROUSEL_SIZE, CAROUSEL_SIZE);
  }

  // The accent tint, as a translucent wash so the photo still reads through it.
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, CAROUSEL_SIZE, CAROUSEL_SIZE);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let y = G.endTop;

  ctx.fillStyle = '#fff';
  ctx.font = `italic 600 ${G.quoteSize}px ${SERIF}`;
  const quoted = `« ${draft.quote} »`;
  y = drawParagraph(ctx, quoted, G.endPad, y, CAROUSEL_SIZE - G.endPad * 2, 55) + 30;

  ctx.font = `italic ${G.bySize}px ${SERIF}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(draft.quoteAttribution, G.endPad + 4, y);
  y += G.bySize + 60;

  // Centred copy must be anchored at the card's centre, not at the left pad:
  // with `textAlign = 'center'`, x is where the MIDDLE of each line goes, so
  // passing the left margin centres the block half off the canvas.
  ctx.textAlign = 'center';
  ctx.font = `italic 700 ${G.taglineSize}px ${SERIF}`;
  ctx.fillStyle = '#fff';
  y = drawParagraph(ctx, draft.tagline, CAROUSEL_SIZE / 2, y, CAROUSEL_SIZE - 240, 45) + 64;

  ctx.font = `italic ${G.followSize}px ${SERIF}`;
  ctx.fillText(draft.socialHeading, CAROUSEL_SIZE / 2, y);
  y += 52;

  drawSocialRow(ctx, draft.socials, y);

  drawLogo(ctx, draft, CAROUSEL_SIZE / 2, 928, G.endLogoSize, '#fff', images.logo);
}

/** The five (or fewer) circular social links on the closing card. */
function drawSocialRow(ctx: CanvasRenderingContext2D, socials: CarouselSocialLink[], y: number): void {
  if (!socials.length) return;
  const pad = 96;
  const slot = (CAROUSEL_SIZE - pad * 2) / socials.length;
  const r = G.iconSize / 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  socials.forEach((social, i) => {
    const cx = pad + slot * i + slot / 2;
    const cy = y + r;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();

    drawSocialGlyph(ctx, social.icon, cx, cy);

    ctx.fillStyle = '#fff';
    ctx.font = `700 16px ${SANS}`;
    ctx.fillText(social.label, cx, cy + r + 24, slot - 8);
  });
  ctx.restore();
}

/** Minimal line glyphs, drawn to fit the circle above. */
function drawSocialGlyph(ctx: CanvasRenderingContext2D, icon: string, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = 15;
  ctx.beginPath();
  switch (icon) {
    case 'youtube':
      ctx.roundRect(cx - s, cy - s * 0.7, s * 1.6, s * 1.4, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s + 7, cy - s * 0.7);
      ctx.lineTo(cx - s + 7, cy + s * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s + 7, cy - s * 0.7);
      ctx.lineTo(cx + s + 8, cy - s * 0.7 - 3);
      ctx.lineTo(cx + s + 8, cy + s * 0.7 + 3);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'tiktok':
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - s);
      ctx.lineTo(cx - 2, cy + 2);
      ctx.arc(cx + 7, cy + 2, 9, Math.PI, Math.PI * 0.5, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - s);
      ctx.quadraticCurveTo(cx + 4, cy - s + 9, cx + 14, cy - s + 6);
      ctx.stroke();
      break;
    case 'facebook':
      ctx.beginPath();
      ctx.moveTo(cx - s, cy + s);
      ctx.lineTo(cx - s, cy + 2);
      ctx.quadraticCurveTo(cx - s, cy - 2, cx - 4, cy - 2);
      ctx.lineTo(cx + s, cy - 2);
      ctx.moveTo(cx + 2, cy - s);
      ctx.lineTo(cx + 2, cy + s);
      ctx.stroke();
      break;
    case 'instagram':
      ctx.roundRect(cx - s, cy - s, s * 2, s * 2, 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default: // globe
      ctx.arc(cx, cy, s * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.7, cy);
      ctx.lineTo(cx + s * 0.7, cy);
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.quadraticCurveTo(cx + s * 0.5, cy, cx, cy + s * 0.7);
      ctx.quadraticCurveTo(cx - s * 0.5, cy, cx, cy - s * 0.7);
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