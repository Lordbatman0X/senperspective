/**
 * Text layout for Canvas 2D.
 *
 * All of this is deliberately DOM-free and takes an injected `measure`
 * function, so the wrapping and auto-shrink behaviour is unit-testable under
 * node without a canvas. The renderer passes `ctx.measureText`.
 */

import type { TextLayer } from '../../types/social';

export interface MeasureFn {
  (text: string, font: string): number;
}

/** Builds a CSS font shorthand matching what the layer describes. */
export function fontString(size: number, layer: Pick<TextLayer, 'fontFamily' | 'fontWeight' | 'fontStyle'>): string {
  const quoted = layer.fontFamily.includes(' ') ? `"${layer.fontFamily}"` : layer.fontFamily;
  return `${layer.fontStyle} ${layer.fontWeight} ${size}px ${quoted}, sans-serif`;
}

export function applyTransform(text: string, transform: TextLayer['transform']): string {
  return transform === 'uppercase' ? text.toUpperCase() : text;
}

/**
 * Greedy word wrap.
 *
 * Words are never split on whitespace, so hyphenated and apostrophised French
 * ("qu Reactor", "n'est-ce pas") stay whole. A word that is genuinely wider
 * than the box is hard-broken separately, in `breakLongWord`.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: MeasureFn,
  size: number,
  layer: Pick<TextLayer, 'fontFamily' | 'fontWeight' | 'fontStyle' | 'letterSpacing'>,
): string[] {
  const font = fontString(size, layer);
  const widthOf = (s: string) => measure(s, font) + (s.length * layer.letterSpacing);

  const lines: string[] = [];
  // Paragraph-aware: an explicit newline always forces a break.
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && widthOf(candidate) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Hard-break a single word that is wider than the box on its own. */
function breakLongWord(
  word: string,
  maxWidth: number,
  widthOf: (s: string) => number,
): string[] {
  const out: string[] = [];
  let current = '';
  for (const ch of word) {
    const candidate = current + ch;
    if (current && widthOf(candidate) > maxWidth) {
      out.push(current);
      current = ch;
    } else {
      current = candidate;
    }
  }
  if (current) out.push(current);
  return out;
}

export interface FittedText {
  lines: string[];
  /** Font size actually used after auto-fit. */
  size: number;
  /** Height of the rendered block, in px. */
  height: number;
  /** True when even `min` could not fit everything and lines were dropped. */
  truncated: boolean;
}

/**
 * Lay a text layer out inside its box.
 *
 * When `autoFit` is on, the size is searched downward from `max` to `min` until
 * the wrapped block fits both the width and the height of the box. The search is
 * a linear scan at `size - step` granularity rather than a binary search: the
 * useful range is ~40 values and a linear scan makes the result deterministic
 * and easy to explain when an editor asks "why is this 62 px?".
 */
export function fitTextLayer(
  layer: TextLayer,
  measure: MeasureFn,
): FittedText {
  const raw = applyTransform(layer.text ?? '', layer.transform);
  const maxWidth = Math.max(1, layer.w);
  const maxHeight = Math.max(1, layer.h);
  const minSize = Math.max(4, Math.min(layer.autoFit.min, layer.autoFit.max));
  const maxSize = Math.max(minSize, layer.autoFit.max);

  const layoutAt = (size: number) => {
    let lines = wrapText(raw, maxWidth, measure, size, layer);
    lines = lines.flatMap(line => {
      const font = fontString(size, layer);
      const widthOf = (s: string) => measure(s, font) + (s.length * layer.letterSpacing);
      // A single word can still exceed the box (a long hashtag, a URL).
      return widthOf(line) > maxWidth ? breakLongWord(line, maxWidth, widthOf) : [line];
    });
    const height = lines.length * size * layer.lineHeight;
    return { lines, height };
  };

  if (!layer.autoFit.enabled) {
    const { lines, height } = layoutAt(layer.fontSize);
    return {
      lines,
      size: layer.fontSize,
      height,
      truncated: height > maxHeight + 0.5,
    };
  }

  for (let size = maxSize; size >= minSize; size -= 1) {
    const { lines, height } = layoutAt(size);
    if (height <= maxHeight) {
      return { lines, size, height, truncated: false };
    }
  }

  // Nothing fits: use the floor and accept clipping rather than lying about it.
  const { lines, height } = layoutAt(minSize);
  return { lines, size: minSize, height, truncated: true };
}

/**
 * Resize a layer's box to hug its text, keeping the top-left anchor and the
 * current horizontal alignment. Used by the inspector's "ajuster au texte"
 * action so an editor can grow a box without retyping a font size.
 */
export function hugTextBox(layer: TextLayer, measure: MeasureFn): { w: number; h: number } {
  const font = fontString(layer.fontSize, layer);
  const raw = applyTransform(layer.text ?? '', layer.transform);
  const words = raw.split(/\s+/).filter(Boolean);
  let widest = 0;
  for (const word of words) {
    widest = Math.max(widest, measure(word, font) + word.length * layer.letterSpacing);
  }
  return {
    w: Math.ceil(widest) + 2,
    h: Math.ceil(layer.fontSize * layer.lineHeight * Math.max(1, words.length)),
  };
}