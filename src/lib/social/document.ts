/**
 * Normalising a design document.
 *
 * Everything read from Firestore passes through `migrateSocialDesign`. It is
 * total: any input — `undefined`, a half-written draft, or a document written by
 * an older build — comes back as a complete `SocialDesign`. That is what lets
 * the rest of the Studio skip defensive checks at every layer.
 */

import {
  SOCIAL_DESIGN_VERSION,
  SOCIAL_FONTS,
  type BackgroundLayer,
  type DotsStyle,
  type EffectEntry,
  type FilterEntry,
  type ImageLayer,
  type LayerBlend,
  type LogoLayer,
  type LogoTone,
  type ShapeLayer,
  type SocialCard,
  type SocialDesign,
  type SocialFont,
  type SocialLayer,
  type SocialMode,
  type SocialNetwork,
  type TextBinding,
  type TextLayer,
} from '../../types/social';
import { DEFAULT_FORMAT_ID, getFormat, getNetwork, NETWORK_ORDER } from './networks';

let counter = 0;
/** Monotonic ids. Not random, so undo/redo and tests stay deterministic. */
export function uid(prefix = 'l'): string {
  counter += 1;
  return `${prefix}_${counter.toString(36)}`;
}

export function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export function str<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/** The template palette. Cards are dark by default, which is the brand. */
export const PALETTE = {
  ink: '#0B0B0C',
  inkSoft: '#1A1A1C',
  paper: '#F4EFE9',
  white: '#FFFFFF',
  accent: '#E85D42',
  accentDeep: '#B23A2B',
  mute: '#8B8B90',
} as const;

/** Build a filter stack from a compact map, preserving key order. */
export function makeFilters(pairs: Partial<Record<FilterEntry['kind'], number>> = {}): FilterEntry[] {
  return (Object.entries(pairs) as Array<[FilterEntry['kind'], number]>).map(([kind, value], i) => ({
    id: `f${i}`,
    kind,
    value,
    enabled: true,
  }));
}

const BLEND_MODES: readonly LayerBlend[] = [
  'source-over', 'multiply', 'screen', 'overlay', 'color', 'luminosity',
];

export const IMAGE_FITS = ['cover', 'contain', 'fill', 'original'] as const;
export const DOTS_STYLES: readonly DotsStyle[] = ['none', 'dots', 'numbered'];
const TEXT_BINDINGS: readonly TextBinding[] = [
  'title', 'excerpt', 'category', 'author', 'date', 'readingTime',
  'sectionHeading', 'sectionBody',
];

function baseFields(name: string, x: number, y: number, w: number, h: number) {
  return {
    id: uid(),
    name,
    x, y, w, h,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blend: 'source-over' as LayerBlend,
    filters: [] as FilterEntry[],
    effects: [] as EffectEntry[],
  };
}

export function createBackground(partial: Partial<BackgroundLayer> = {}): BackgroundLayer {
  return {
    ...baseFields('Fond', 0, 0, 1080, 1350),
    kind: 'background',
    fill: PALETTE.ink,
    fit: 'cover',
    focalX: 0.5,
    focalY: 0.5,
    ...partial,
  };
}

export function createText(partial: Partial<TextLayer> & { text: string }): TextLayer {
  return {
    ...baseFields(partial.name || 'Texte', 60, 60, 960, 200),
    kind: 'text',
    fontFamily: 'Playfair Display',
    fontSize: 64,
    fontWeight: 700,
    fontStyle: 'normal',
    letterSpacing: 0,
    lineHeight: 1.2,
    align: 'left',
    color: PALETTE.white,
    transform: 'none',
    autoFit: { enabled: true, min: 18, max: 96 },
    valign: 'top',
    ...partial,
  };
}

export function createLogo(partial: Partial<LogoLayer> = {}): LogoLayer {
  return {
    ...baseFields('Logo', 64, 64, 220, 64),
    kind: 'logo',
    src: '',
    tone: 'auto',
    lockAspect: true,
    padding: 0,
    ...partial,
  };
}

export function createShape(partial: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    ...baseFields('Forme', 0, 0, 200, 8),
    kind: 'shape',
    shape: 'rect',
    fill: PALETTE.accent,
    radius: 0,
    ...partial,
  };
}

export function createImage(partial: Partial<ImageLayer> & { src: string }): ImageLayer {
  return {
    ...baseFields('Image', 0, 0, 1080, 1080),
    kind: 'image',
    fit: 'cover',
    focalX: 0.5,
    focalY: 0.5,
    radius: 0,
    ...partial,
  };
}
/** Clamp any incoming layer back into a known shape. */
function normalizeLayer(raw: any): SocialLayer | null {
  if (!raw || typeof raw !== 'object' || typeof raw.kind !== 'string') return null;

  const shared = {
    ...baseFields(
      String(raw.name ?? 'Calque'),
      num(raw.x, 0), num(raw.y, 0),
      Math.max(1, num(raw.w, 100)), Math.max(1, num(raw.h, 100)),
    ),
    rotation: num(raw.rotation, 0),
    opacity: Math.min(1, Math.max(0, num(raw.opacity, 1))),
    visible: bool(raw.visible, true),
    locked: bool(raw.locked, false),
    blend: str(raw.blend, BLEND_MODES, 'source-over'),
    filters: Array.isArray(raw.filters)
      ? raw.filters
          .filter((f: any) => f && typeof f.kind === 'string')
          .map((f: any, i: number) => ({
            id: String(f.id ?? `f${i}`),
            kind: f.kind,
            value: num(f.value, 100),
            enabled: bool(f.enabled, true),
          }))
      : [],
    effects: Array.isArray(raw.effects)
      ? raw.effects
          .filter((e: any) => e && typeof e.kind === 'string')
          .map((e: any, i: number) => ({
            id: String(e.id ?? `e${i}`),
            kind: e.kind,
            value: num(e.value, 0),
            color: typeof e.color === 'string' ? e.color : undefined,
            color2: typeof e.color2 === 'string' ? e.color2 : undefined,
            aux: typeof e.aux === 'number' ? e.aux : undefined,
            enabled: bool(e.enabled, true),
          }))
      : [],
  };

  switch (raw.kind) {
    case 'background':
      return {
        ...shared, kind: 'background',
        fill: HEX.test(String(raw.fill)) ? String(raw.fill) : PALETTE.ink,
        src: typeof raw.src === 'string' ? raw.src : undefined,
        fit: str(raw.fit, IMAGE_FITS, 'cover'),
        focalX: num(raw.focalX, 0.5),
        focalY: num(raw.focalY, 0.5),
      };

    case 'logo':
      return {
        ...shared, kind: 'logo',
        src: typeof raw.src === 'string' ? raw.src : '',
        tone: str<LogoTone>(raw.tone, ['auto', 'light', 'dark', 'custom'], 'auto'),
        toneSrc: raw.toneSrc && typeof raw.toneSrc === 'object'
          ? {
              light: typeof raw.toneSrc.light === 'string' ? raw.toneSrc.light : undefined,
              dark: typeof raw.toneSrc.dark === 'string' ? raw.toneSrc.dark : undefined,
            }
          : undefined,
        lockAspect: bool(raw.lockAspect, true),
        padding: Math.max(0, num(raw.padding, 0)),
      };

    case 'text':
      return {
        ...shared, kind: 'text',
        text: String(raw.text ?? ''),
        binding: raw.binding && typeof raw.binding === 'object'
          ? {
              field: str<TextBinding>(raw.binding.field, TEXT_BINDINGS, 'title'),
              index: typeof raw.binding.index === 'number' ? raw.binding.index : undefined,
            }
          : undefined,
        fontFamily: str<SocialFont>(raw.fontFamily, SOCIAL_FONTS, 'Playfair Display'),
        fontSize: Math.max(4, num(raw.fontSize, 48)),
        fontWeight: num(raw.fontWeight, 700),
        fontStyle: str(raw.fontStyle, ['normal', 'italic'] as const, 'normal'),
        letterSpacing: num(raw.letterSpacing, 0),
        lineHeight: Math.max(0.5, num(raw.lineHeight, 1.2)),
        align: str(raw.align, ['left', 'center', 'right'] as const, 'left'),
        color: HEX.test(String(raw.color)) ? String(raw.color) : PALETTE.white,
        transform: str(raw.transform, ['none', 'uppercase'] as const, 'none'),
        autoFit: {
          enabled: bool(raw.autoFit?.enabled, true),
          min: Math.max(4, num(raw.autoFit?.min, 18)),
          max: Math.max(4, num(raw.autoFit?.max, 96)),
        },
        valign: str(raw.valign, ['top', 'center', 'bottom'] as const, 'top'),
      };

    case 'shape':
      return {
        ...shared, kind: 'shape',
        shape: str(raw.shape, ['rect', 'line', 'pill'] as const, 'rect'),
        fill: HEX.test(String(raw.fill)) ? String(raw.fill) : PALETTE.accent,
        strokeColor: typeof raw.strokeColor === 'string' ? raw.strokeColor : undefined,
        strokeWidth: typeof raw.strokeWidth === 'number' ? raw.strokeWidth : undefined,
        radius: Math.max(0, num(raw.radius, 0)),
      };

    case 'image':
      return {
        ...shared, kind: 'image',
        src: typeof raw.src === 'string' ? raw.src : '',
        fit: str(raw.fit, IMAGE_FITS, 'cover'),
        focalX: num(raw.focalX, 0.5),
        focalY: num(raw.focalY, 0.5),
        radius: Math.max(0, num(raw.radius, 0)),
      };

    default:
      return null;
  }
}
export function normalizeCard(raw: any): SocialCard {
  const layers = Array.isArray(raw?.layers)
    ? raw.layers.map(normalizeLayer).filter((l: SocialLayer | null): l is SocialLayer => l !== null)
    : [];
  return {
    id: String(raw?.id ?? uid('c')),
    templateId: str(raw?.templateId, ['cover', 'brief', 'closing', 'blank'] as const, 'blank'),
    layers,
    meta: {
      showDate: bool(raw?.meta?.showDate, true),
      showReadingTime: bool(raw?.meta?.showReadingTime, true),
      dots: str(raw?.meta?.dots, DOTS_STYLES, 'none'),
    },
  };
}

export function emptyDesign(network: SocialNetwork = 'instagram'): SocialDesign {
  return {
    version: SOCIAL_DESIGN_VERSION,
    mode: 'single',
    network,
    formatId: DEFAULT_FORMAT_ID[network] ?? 'ig-45',
    cards: [],
    captions: {},
  };
}

/**
 * Bring any stored value up to the current schema.
 *
 * `network` is validated against the registry and `formatId` re-resolved against
 * that network, so a document saved for one platform cannot leave an impossible
 * format reference behind after switching to another.
 */
export function migrateSocialDesign(raw: any, fallbackNetwork: SocialNetwork = 'instagram'): SocialDesign {
  if (!raw || typeof raw !== 'object') return emptyDesign(fallbackNetwork);

  const network = str<SocialNetwork>(raw.network, NETWORK_ORDER, fallbackNetwork);
  const base = emptyDesign(network);

  const cards = Array.isArray(raw.cards) ? raw.cards.map(normalizeCard) : [];

  const captions: SocialDesign['captions'] = {};
  for (const key of [...NETWORK_ORDER, 'universal'] as const) {
    const c = (raw.captions as any)?.[key];
    if (c && typeof c === 'object') {
      captions[key] = {
        fr: typeof c.fr === 'string' ? c.fr : '',
        en: typeof c.en === 'string' ? c.en : '',
      };
    }
  }

  const mode: SocialMode = raw.mode === 'carousel' ? 'carousel' : 'single';

  return {
    version: SOCIAL_DESIGN_VERSION,
    mode,
    network,
    formatId: getNetwork(network).formats.some(f => f.id === raw.formatId)
      ? String(raw.formatId)
      : base.formatId,
    // Single mode is structurally one card.
    cards: mode === 'single' ? cards.slice(0, 1) : cards,
    captions,
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : undefined,
  };
}

/**
 * Move a layer to a frame-relative position.
 *
 * Kept pure and here rather than in the component so the geometry is unit
 * tested — alignment is the most-used control in the editor and "align centre"
 * being off by the gutter would be very visible.
 *
 * `gutter*` snaps to the same 6.2% inner margin the templates use, which is what
 * makes a hand-placed element line up with a templated one.
 */
export type AlignMode =
  | 'left' | 'centerH' | 'right'
  | 'top' | 'centerV' | 'bottom'
  | 'gutterH' | 'gutterV';

/** The templates' inner margin, as a fraction of the card. */
export const GUTTER_RATIO = 0.062;

export function alignLayerPosition(
  layer: { x: number; y: number; w: number; h: number },
  mode: AlignMode,
  format: { width: number; height: number },
): { x?: number; y?: number } {
  const gx = Math.round(format.width * GUTTER_RATIO);
  const gy = Math.round(format.height * GUTTER_RATIO);

  switch (mode) {
    case 'left': return { x: 0 };
    case 'centerH': return { x: (format.width - layer.w) / 2 };
    case 'right': return { x: format.width - layer.w };
    case 'top': return { y: 0 };
    case 'centerV': return { y: (format.height - layer.h) / 2 };
    case 'bottom': return { y: format.height - layer.h };
    case 'gutterH': return { x: gx };
    case 'gutterV': return { y: gy };
  }
}

/** Human summary line for the studio header. */
export function describeDesign(design: SocialDesign): string {
  const fmt = getFormat(design.network, design.formatId);
  const count = design.cards.length;
  return `${getNetwork(design.network).label} · ${fmt.width}×${fmt.height} · ${count} carte${count > 1 ? 's' : ''}`;
}