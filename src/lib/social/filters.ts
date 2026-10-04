/**
 * Filter + effect definitions, and the translation of a layer's ordered stack
 * into the CSS `ctx.filter` string Canvas 2D understands.
 *
 * Canvas 2D supports the CSS filter primitives natively (Chrome/Safari/Firefox
 * all ship it), so the photographic stack needs no shader library and no
 * html-to-canvas conversion. Colour-washing effects (tint, duotone, vignette)
 * are composite passes instead, and live in the renderer.
 */

import type { EffectEntry, EffectKind, FilterEntry, FilterKind } from '../../types/social';

export interface FilterDef {
  kind: FilterKind;
  label: string;
  /** Slider bounds in the unit shown. */
  min: number;
  max: number;
  step: number;
  /** Neutral value: applying it changes nothing. */
  neutral: number;
  unit: string;
}

export const FILTER_DEFS: FilterDef[] = [
  { kind: 'brightness', label: 'Luminosité', min: 20, max: 200, step: 1, neutral: 100, unit: '%' },
  { kind: 'contrast', label: 'Contraste', min: 20, max: 200, step: 1, neutral: 100, unit: '%' },
  { kind: 'saturate', label: 'Saturation', min: 0, max: 300, step: 1, neutral: 100, unit: '%' },
  { kind: 'blur', label: 'Flou', min: 0, max: 40, step: 0.5, neutral: 0, unit: 'px' },
  { kind: 'grayscale', label: 'Niveaux de gris', min: 0, max: 100, step: 1, neutral: 0, unit: '%' },
  { kind: 'sepia', label: 'Sépia', min: 0, max: 100, step: 1, neutral: 0, unit: '%' },
  { kind: 'hueRotate', label: 'Teinte', min: -180, max: 180, step: 1, neutral: 0, unit: '°' },
  { kind: 'invert', label: 'Inversion', min: 0, max: 100, step: 1, neutral: 0, unit: '%' },
];

export const FILTER_DEF_BY_KIND: Record<FilterKind, FilterDef> = FILTER_DEFS.reduce(
  (acc, d) => { acc[d.kind] = d; return acc; },
  {} as Record<FilterKind, FilterDef>,
);

export interface EffectDef {
  kind: EffectKind;
  label: string;
  min: number;
  max: number;
  step: number;
  neutral: number;
  /** 'color' => one colour, 'twoColors' => colour + colour2. */
  colors: 'none' | 'color' | 'twoColors';
  /** Shown next to the strength slider. */
  auxLabel?: string;
  auxMin?: number;
  auxMax?: number;
  auxNeutral?: number;
}

export const EFFECT_DEFS: EffectDef[] = [
  { kind: 'tint', label: 'Teinte', min: 0, max: 1, step: 0.01, neutral: 0, colors: 'color' },
  { kind: 'duotone', label: 'Duotone', min: 0, max: 1, step: 0.01, neutral: 0, colors: 'twoColors' },
  { kind: 'vignette', label: 'Vignette', min: 0, max: 1, step: 0.01, neutral: 0, colors: 'none' },
  { kind: 'shadow', label: 'Ombre portée', min: 0, max: 1, step: 0.01, neutral: 0, colors: 'color', auxLabel: 'Décalage', auxMin: 0, auxMax: 60, auxNeutral: 6 },
  { kind: 'stroke', label: 'Contour', min: 0, max: 1, step: 0.01, neutral: 0, colors: 'color', auxLabel: 'Épaisseur', auxMin: 0, auxMax: 30, auxNeutral: 3 },
];

export const EFFECT_DEF_BY_KIND: Record<EffectKind, EffectDef> = EFFECT_DEFS.reduce(
  (acc, d) => { acc[d.kind] = d; return acc; },
  {} as Record<EffectKind, EffectDef>,
);

/**
 * Build the `ctx.filter` value for a layer's filter stack.
 *
 * Order is preserved exactly as authored. CSS filter functions compose left to
 * right, so this genuinely means "contrast, then sepia" reads differently from
 * "sepia, then contrast" — which is the behaviour the UI advertises when it
 * lets an editor reorder the stack.
 *
 * Disabled entries are dropped, and entries sitting at their neutral value are
 * dropped too, so an untouched layer produces an empty string and costs nothing.
 */
export function buildFilterString(filters: FilterEntry[] | undefined): string {
  if (!filters?.length) return '';
  const parts: string[] = [];
  for (const f of filters) {
    if (!f || !f.enabled) continue;
    const def = FILTER_DEF_BY_KIND[f.kind];
    if (!def) continue;
    const value = Number.isFinite(f.value) ? f.value : def.neutral;
    if (value === def.neutral) continue;
    switch (f.kind) {
      case 'brightness':
      case 'contrast':
      case 'saturate':
      case 'grayscale':
      case 'sepia':
      case 'invert':
        parts.push(`${f.kind}(${value}%)`);
        break;
      case 'blur':
        // Must stay non-negative; a negative blur radius invalidates the
        // whole string and silently drops every other filter with it.
        parts.push(`blur(${Math.max(0, value)}px)`);
        break;
      case 'hueRotate':
        parts.push(`hue-rotate(${value}deg)`);
        break;
    }
  }
  return parts.join(' ');
}

/** True when the layer actually changes pixels, so the renderer can skip work. */
export function hasActiveFilters(filters: FilterEntry[] | undefined): boolean {
  return buildFilterString(filters).length > 0;
}

/** The effect entries that actually need a composite pass, in stack order. */
export function activeEffects(effects: EffectEntry[] | undefined): EffectEntry[] {
  if (!effects?.length) return [];
  return effects.filter(e => {
    if (!e || !e.enabled) return false;
    const def = EFFECT_DEF_BY_KIND[e.kind];
    if (!def) return false;
    if (e.kind === 'shadow' || e.kind === 'stroke') return e.value > 0;
    return e.value > 0;
  });
}

/** A blank entry ready to be appended to a stack. */
export function makeFilterEntry(kind: FilterKind, id: string): FilterEntry {
  const def = FILTER_DEF_BY_KIND[kind];
  return { id, kind, value: def.neutral, enabled: true };
}

export function makeEffectEntry(kind: EffectKind, id: string): EffectEntry {
  const def = EFFECT_DEF_BY_KIND[kind];
  const base: EffectEntry = {
    id,
    kind,
    value: def.neutral,
    enabled: true,
  };
  if (def.colors !== 'none') {
    base.color = kind === 'duotone' ? '#2B2B2B' : '#E85D42';
  }
  if (kind === 'duotone') {
    base.color2 = '#F6D5C4';
  }
  if (def.auxNeutral !== undefined) base.aux = def.auxNeutral;
  return base;
}