/**
 * Canvas 2D card renderer.
 *
 * One deterministic function, `renderCard`, paints a card into any 2D context.
 * The live preview and the PNG export both call it with the same arguments, so
 * what an editor sees on screen is exactly what they export.
 *
 * Layer order: `card.layers` is stored bottom -> top and painted in that order.
 *
 * Filters are applied per layer by setting `ctx.filter` while that layer paints,
 * which is what makes "filter just the photo, leave the type crisp" work. Canvas
 * 2D supports the CSS filter primitives natively, so no shader library and no
 * html-to-canvas conversion is needed.
 */

import type {
  BackgroundLayer,
  ImageLayer,
  LogoLayer,
  LogoTone,
  ShapeLayer,
  SocialCard,
  SocialLayer,
  TextLayer,
} from '../../types/social';
import { activeEffects, buildFilterString, EFFECT_DEF_BY_KIND } from './filters';
import { fitTextLayer, fontString } from './fit';
import { peekImage } from './imageLoader';
import { resolveBoundText, type ResolvedContent } from './content';
import { chooseLogoTone, colorLuminance, meanLuminance } from './logoTone';
import type { SocialFormat } from './networks';

export interface RenderContext {
  content: ResolvedContent;
  /**
   * Pre-sampled luminance under each logo layer, keyed by layer id. The stage
   * computes this once before painting; sampling mid-draw would force a
   * synchronous canvas flush on every animation frame.
   */
  logoLuminance?: Record<string, number>;
}

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * Where an image lands inside its box for a given fit mode.
 *
 * `cover` honours the focal point rather than centring, so an editor can steer
 * the crop to keep a face or a headline inside the frame.
 */
export function computeImageRect(
  natural: { w: number; h: number },
  box: Rect,
  fit: 'cover' | 'contain' | 'fill' | 'original',
  focalX = 0.5,
  focalY = 0.5,
): Rect {
  if (fit === 'fill') return { ...box };
  if (fit === 'original') return { x: box.x, y: box.y, w: natural.w, h: natural.h };
  if (!natural.w || !natural.h) return { ...box };

  const scale = fit === 'cover'
    ? Math.max(box.w / natural.w, box.h / natural.h)
    : Math.min(box.w / natural.w, box.h / natural.h);

  const w = natural.w * scale;
  const h = natural.h * scale;
  const x = fit === 'cover' ? box.x + box.w * focalX - w * focalX : box.x + (box.w - w) / 2;
  const y = fit === 'cover' ? box.y + box.h * focalY - h * focalY : box.y + (box.h - h) / 2;
  return { x, y, w, h };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  if (radius <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Draw text char by char when letter-spacing is non-zero. */
function fillSpacedText(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  spacing: number,
  align: TextLayer['align'],
): void {
  if (spacing === 0) {
    ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
    ctx.fillText(line, x, y);
    return;
  }

  const chars = Array.from(line);
  const total = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, 0) - spacing;
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}
// ---------------------------------------------------------------------------
// Per-layer painters
// ---------------------------------------------------------------------------

function paintImageInto(
  ctx: CanvasRenderingContext2D,
  src: string,
  box: Rect,
  fit: ImageLayer['fit'],
  focalX: number,
  focalY: number,
  radius: number,
): boolean {
  const img = peekImage(src);
  if (!img) return false;

  // An SVG with only a `viewBox` and no width/height attributes reports
  // naturalWidth/naturalWidth of 0, so it was being rejected here and the logo
  // silently never drew — which is exactly what an uploaded vector logo hits.
  // Fall back to the layout size so the image is still painted, at its
  // intrinsic aspect ratio when one is available.
  const nw = img.naturalWidth || img.width || 0;
  const nh = img.naturalHeight || img.height || 0;
  const ratioOk = nw > 0 && nh > 0;
  const natural = ratioOk ? { w: nw, h: nh } : { w: box.w, h: box.h };

  const rect = computeImageRect(natural, box, ratioOk ? fit : 'fill', focalX, focalY);
  ctx.save();
  if (radius > 0) {
    roundRectPath(ctx, box.x, box.y, box.w, box.h, radius);
    ctx.clip();
  }
  try {
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
  } catch {
    // A decode that succeeded can still fail at draw time (truncated file,
    // unsupported format). Treat it as a failure rather than throwing.
    ctx.restore();
    return false;
  }
  ctx.restore();
  return true;
}

function paintBackground(ctx: CanvasRenderingContext2D, layer: BackgroundLayer, box: Rect): void {
  ctx.fillStyle = layer.fill;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // A background image that failed to load simply leaves the fill colour
  // visible: a flat card beats an exception mid-render.
  if (layer.src) paintImageInto(ctx, layer.src, box, layer.fit, layer.focalX, layer.focalY, 0);
}

function paintShape(ctx: CanvasRenderingContext2D, layer: ShapeLayer, box: Rect): void {
  ctx.save();
  if (layer.shape === 'line') {
    ctx.fillStyle = layer.fill;
    ctx.fillRect(box.x, box.y, box.w, Math.max(1, box.h));
  } else {
    const radius = layer.shape === 'pill' ? Math.min(box.w, box.h) / 2 : layer.radius;
    roundRectPath(ctx, box.x, box.y, box.w, box.h, radius);
    ctx.fillStyle = layer.fill;
    ctx.fill();
    if (layer.strokeColor && layer.strokeWidth) {
      ctx.lineWidth = layer.strokeWidth;
      ctx.strokeStyle = layer.strokeColor;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function paintText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  box: Rect,
  displayText: string,
): void {
  if (!displayText) return;

  const fitted = fitTextLayer({ ...layer, text: displayText }, (text, font) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  });
  if (!fitted.lines.length) return;

  ctx.save();
  ctx.font = fontString(fitted.size, layer);
  ctx.fillStyle = layer.color;
  ctx.textBaseline = 'alphabetic';
  const lineHeight = fitted.size * layer.lineHeight;
  // Baseline of the first line, dropped by roughly the cap height so the block
  // starts inside the box rather than above it.
  const ascent = fitted.size * 0.78;

  const blockHeight = fitted.lines.length * lineHeight;
  const topOffset = layer.valign === 'center'
    ? (box.h - blockHeight) / 2
    : layer.valign === 'bottom'
      ? box.h - blockHeight
      : 0;

  const anchorX = layer.align === 'center'
    ? box.x + box.w / 2
    : layer.align === 'right'
      ? box.x + box.w
      : box.x;

  fitted.lines.forEach((line, i) => {
    const baseline = box.y + topOffset + i * lineHeight + ascent;
    fillSpacedText(ctx, line, anchorX, baseline, layer.letterSpacing, layer.align);
  });
  ctx.restore();
}
/**
 * Colour-washing effects.
 *
 * Composite passes rather than CSS filters, applied in the order the editor
 * arranged them.
 */
function applyEffects(ctx: CanvasRenderingContext2D, layer: SocialLayer, box: Rect): void {
  for (const effect of activeEffects(layer.effects)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();

    switch (effect.kind) {
      case 'tint':
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = effect.value;
        ctx.fillStyle = effect.color || '#E85D42';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        break;

      case 'duotone':
        // Push darks toward `color`, lift highlights toward `color2`.
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = effect.value;
        ctx.fillStyle = effect.color || '#2B2B2B';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = effect.color2 || '#F6D5C4';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        break;

      case 'vignette': {
        const r = Math.max(box.w, box.h) * 0.75;
        const grad = ctx.createRadialGradient(
          box.x + box.w / 2, box.y + box.h / 2, r * 0.35,
          box.x + box.w / 2, box.y + box.h / 2, r,
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${effect.value})`);
        ctx.fillStyle = grad;
        ctx.fillRect(box.x, box.y, box.w, box.h);
        break;
      }

      case 'shadow':
        // An offset band at the base of the layer — what reads as "the photo
        // fading into the panel below" on the cover template.
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = effect.value;
        ctx.shadowColor = effect.color || '#000000';
        ctx.shadowBlur = (effect.aux ?? 6) * 2.5;
        ctx.fillStyle = effect.color || '#000000';
        ctx.fillRect(box.x, box.y, box.w, Math.max(2, Math.round(box.h * 0.06)));
        break;

      case 'stroke':
        ctx.globalAlpha = effect.value;
        ctx.lineWidth = Math.max(1, effect.aux ?? 3);
        ctx.strokeStyle = effect.color || '#000000';
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        break;
    }
    ctx.restore();
  }
}

/**
 * Resolve which logo asset to draw.
 *
 * `auto` consults the luminance sampled under the logo box and takes the better
 * contrast. A manual tone always wins — the escape hatch for a card where the
 * sample is wrong, a busy photo edge being the usual reason.
 */
export function resolveLogoSrc(
  layer: LogoLayer,
  sampledLuminance: number | undefined,
): { src: string; tone: LogoTone } {
  const light = layer.toneSrc?.light || layer.src;
  const dark = layer.toneSrc?.dark || layer.src;
  const hasBoth = Boolean(layer.toneSrc?.light && layer.toneSrc?.dark);

  if (layer.tone === 'auto' && sampledLuminance !== undefined && hasBoth) {
    const tone = chooseLogoTone(
      sampledLuminance,
      colorLuminance('#FFFFFF'),
      colorLuminance('#0B0B0C'),
      true,
    );
    return tone === 'light' ? { src: light, tone: 'light' } : { src: dark, tone: 'dark' };
  }
  if (layer.tone === 'light' || layer.tone === 'dark') {
    return { src: layer.tone === 'light' ? light : dark, tone: layer.tone };
  }
  return { src: layer.src, tone: 'custom' };
}

function paintLogo(
  ctx: CanvasRenderingContext2D,
  layer: LogoLayer,
  box: Rect,
  sampledLuminance: number | undefined,
): void {
  const { src } = resolveLogoSrc(layer, sampledLuminance);
  if (!src) return;

  // Padding insets the artwork inside its box without changing the box, so the
  // logo keeps a safe area when dragged near an edge.
  const padded: Rect = layer.padding > 0
    ? {
        x: box.x + layer.padding,
        y: box.y + layer.padding,
        w: Math.max(1, box.w - layer.padding * 2),
        h: Math.max(1, box.h - layer.padding * 2),
      }
    : box;

  if (!src) {
    drawMissingAsset(ctx, padded, 'LOGO');
    return;
  }

  const painted = paintImageInto(ctx, src, padded, layer.lockAspect ? 'contain' : 'fill', 0.5, 0.5, 0);
  if (!painted) {
    // Without this the layer is simply absent and the editor has no way to know
    // their upload failed. A visible placeholder turns "the logo doesn't appear"
    // into an actionable state.
    drawMissingAsset(ctx, padded, 'LOGO ?');
  }
}

/** A visible marker for an asset that is absent or failed to paint. */
function drawMissingAsset(ctx: CanvasRenderingContext2D, box: Rect, label: string): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 24px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2);
  ctx.restore();
}
/**
 * Paint one card into a 2D context.
 *
 * `logoLuminance` is optional and keyed by logo layer id. When supplied, `auto`
 * logo tone adapts to the sampled background.
 */
export function renderCard(
  ctx: CanvasRenderingContext2D,
  card: SocialCard,
  format: SocialFormat,
  rctx: RenderContext,
): void {
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  for (const layer of card.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;

    const box: Rect = { x: layer.x, y: layer.y, w: layer.w, h: layer.h };
    const filter = buildFilterString(layer.filters);

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    if (layer.blend !== 'source-over') ctx.globalCompositeOperation = layer.blend;

    if (layer.rotation !== 0) {
      // Rotate about the layer's own centre so dragging stays predictable.
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (filter) ctx.filter = filter;

    switch (layer.kind) {
      case 'background':
        paintBackground(ctx, layer, box);
        break;

      case 'image':
        if (!paintImageInto(ctx, layer.src, box, layer.fit, layer.focalX, layer.focalY, layer.radius)) {
          // Dashed placeholder, so an editor can still see and grab a layer whose
          // image failed to load.
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(box.x, box.y, box.w, box.h);
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.setLineDash([8, 8]);
          ctx.strokeRect(box.x, box.y, box.w, box.h);
          ctx.setLineDash([]);
        }
        break;

      case 'shape':
        paintShape(ctx, layer, box);
        break;

      case 'logo':
        paintLogo(ctx, layer, box, rctx.logoLuminance?.[layer.id]);
        break;

      case 'text': {
        const bound = resolveBoundText(layer.binding?.field, rctx.content, layer.binding?.index);
        paintText(ctx, layer, box, bound ?? layer.text);
        break;
      }
    }

    ctx.filter = 'none';
    applyEffects(ctx, layer, box);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Sample the mean luminance under each logo layer.
 *
 * Renders the card with logos omitted, then reads back just the logo boxes. That
 * gives the true local background — including any photo or tint above the base —
 * instead of guessing from the card's overall tone.
 */
export function sampleLogoLuminances(
  canvas: HTMLCanvasElement,
  card: SocialCard,
  format: SocialFormat,
  rctx: RenderContext,
): Record<string, number> {
  const logos = card.layers.filter(
    (l): l is LogoLayer => l.kind === 'logo' && l.visible && Boolean(resolveLogoSrc(l, undefined).src),
  );
  if (!logos.length) return {};

  const ctx = canvas.getContext('2d');
  if (!ctx) return {};

  const withoutLogos: SocialCard = { ...card, layers: card.layers.filter(l => l.kind !== 'logo') };
  ctx.save();
  ctx.filter = 'none';
  ctx.clearRect(0, 0, format.width, format.height);
  renderCard(ctx, withoutLogos, format, { ...rctx, logoLuminance: {} });
  ctx.restore();

  const out: Record<string, number> = {};
  for (const logo of logos) {
    const box = logo.padding > 0
      ? {
          x: logo.x + logo.padding,
          y: logo.y + logo.padding,
          w: Math.max(1, logo.w - logo.padding * 2),
          h: Math.max(1, logo.h - logo.padding * 2),
        }
      : { x: logo.x, y: logo.y, w: logo.w, h: logo.h };
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const w = Math.max(1, Math.min(Math.round(box.w), format.width - x));
    const h = Math.max(1, Math.min(Math.round(box.h), format.height - y));
    try {
      const data = ctx.getImageData(x, y, w, h).data;
      out[logo.id] = meanLuminance(data, w, h, { x: 0, y: 0, w, h });
    } catch {
      // A tainted canvas (a cross-origin asset served without CORS headers)
      // makes getImageData throw. Fall back to no sample, so the logo uses its
      // default asset rather than failing the whole render.
      out[logo.id] = 0;
    }
  }
  return out;
}
/**
 * Render a card to a fresh canvas at the format's native size.
 *
 * This is the export path. It differs from the live preview only in which canvas
 * it draws to — the same `renderCard` call produces both, so the export cannot
 * drift from the preview.
 */
export async function renderCardToCanvas(
  card: SocialCard,
  format: SocialFormat,
  rctx: RenderContext,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = format.width;
  canvas.height = format.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible dans ce navigateur.');

  const logoLuminance = sampleLogoLuminances(canvas, card, format, rctx);
  ctx.clearRect(0, 0, format.width, format.height);
  renderCard(ctx, card, format, { ...rctx, logoLuminance });

  return canvas;
}

/**
 * Download a canvas as a PNG.
 *
 * `toBlob` with an explicit `image/png` is used rather than `toDataURL`: it
 * avoids a multi-megabyte base64 string on the main thread for a 1080x1920 card.
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Export impossible : le canevas est vide.'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoked on a later tick so the download has definitely started.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}

/** Filesystem-safe slug for export names. */
export function exportFilename(slug: string, network: string, index: number, total: number): string {
  const base = (slug || 'card')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'card';
  const suffix = total > 1 ? `-${index + 1}-sur-${total}` : '';
  return `${base}-${network}${suffix}`;
}

/** Trigger a plain-text download, used for the caption text file. */
export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}