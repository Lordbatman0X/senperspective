/**
 * Choosing which variant of a logo reads on a given background.
 *
 * The requirement is "the logo colour adapts". Deciding that from a global
 * average would be wrong: a card can be black at the top-left and terracotta at
 * the bottom-right. So this samples the pixels actually UNDER the logo box and
 * picks the variant with the highest contrast against them.
 *
 * Everything here is pure maths on an RGBA buffer, so it is unit-testable
 * without a browser.
 */

export type LogoToneChoice = 'light' | 'dark';

/** Rec. 709 relative luminance of an sRGB triple, 0..1. */
export function relativeLuminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two luminances, 1..21. */
export function contrastRatio(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/** Mean luminance of a sub-rectangle, skipping fully transparent pixels. */
export function meanLuminance(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  box: { x: number; y: number; w: number; h: number },
): number {
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(width, Math.ceil(box.x + box.w));
  const y1 = Math.min(height, Math.ceil(box.y + box.h));
  if (x1 <= x0 || y1 <= y0) return 0;

  let sum = 0;
  let n = 0;
  // Stride the sampling: a logo box can be ~200x60 px and we only need the gist.
  const stepX = Math.max(1, Math.floor((x1 - x0) / 32));
  const stepY = Math.max(1, Math.floor((y1 - y0) / 32));
  for (let y = y0; y < y1; y += stepY) {
    for (let x = x0; x < x1; x += stepX) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 8) continue;
      sum += relativeLuminance(data[i], data[i + 1], data[i + 2]);
      n++;
    }
  }
  return n ? sum / n : 0;
}

/** Mean luminance of a uniform colour string, used for flat logo variants. */
export function colorLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return 1;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return relativeLuminance(r, g, b);
}

/**
 * Pick the variant that stands out most against the sampled background.
 *
 * `lightLuminance` / `darkLuminance` are the mean luminances of the two candidate
 * logos. When only one variant exists, its tone is returned as-is — there is
 * nothing to choose between, and guessing would hide a missing asset.
 */
export function chooseLogoTone(
  backgroundLuminance: number,
  lightLuminance: number,
  darkLuminance: number,
  hasBoth: boolean,
): LogoToneChoice {
  if (!hasBoth) return lightLuminance >= darkLuminance ? 'light' : 'dark';

  const withLight = contrastRatio(backgroundLuminance, lightLuminance);
  const withDark = contrastRatio(backgroundLuminance, darkLuminance);
  // Ties go to the light variant: on this brand's dark covers it is the default,
  // and a tie means the background is mid-grey either way.
  return withLight >= withDark ? 'light' : 'dark';
}