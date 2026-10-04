/**
 * Per-network export presets.
 *
 * These are the platform's OWN native sizes, not "ratios we happen to offer", so
 * a card exported from here is already valid for that network. The Format picker
 * shows only the entries belonging to the selected network, which is what stops
 * an editor from quietly producing a 16:9 file for Instagram.
 */

import type { CaptionSlot, SocialNetwork } from '../../types/social';

export interface SocialFormat {
  id: string;
  label: string;
  /** Aspect label shown in the picker, e.g. "4:5". */
  ratio: string;
  width: number;
  height: number;
  /**
   * Regions the platform's own UI covers. Drawn as a dashed overlay. Values are
   * fractions of width / height so they survive a change of export size.
   */
  safeZones?: Array<{
    side: 'top' | 'bottom' | 'left' | 'right';
    size: number;
    label?: string;
  }>;
}

export interface NetworkSpec {
  id: SocialNetwork;
  label: string;
  /** Short brand mark used in the network picker. */
  glyph: string;
  accent: string;
  formats: SocialFormat[];
  /** Hard platform limit. */
  captionLimit: number;
  /**
   * A practical limit for this network, warned about before the hard one:
   * 60 000 characters is technically valid on Facebook and practically useless.
   */
  captionWarnAt: number;
  /** Platforms where the caption must open with the most important sentence. */
  invertedPriority: boolean;
  /** Whether hashtags are expected at all. */
  hashtags: boolean;
}

export const NETWORKS: Record<SocialNetwork, NetworkSpec> = {
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    glyph: 'f',
    accent: '#1877F2',
    formats: [
      { id: 'fb-45', label: 'Portrait 4:5', ratio: '4:5', width: 1080, height: 1350 },
      { id: 'fb-sq', label: 'Carré', ratio: '1:1', width: 1080, height: 1080 },
      { id: 'fb-link', label: 'Lien 1.91:1', ratio: '1.91:1', width: 1200, height: 628 },
    ],
    captionLimit: 63206,
    captionWarnAt: 5000,
    invertedPriority: false,
    hashtags: true,
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    glyph: 'IG',
    accent: '#E4405F',
    formats: [
      {
        id: 'ig-45',
        label: 'Portrait 4:5',
        ratio: '4:5',
        width: 1080,
        height: 1350,
        // Feed UI covers the right rail and the caption block.
        safeZones: [
          { side: 'right', size: 0.06 },
          { side: 'bottom', size: 0.18, label: 'légende' },
        ],
      },
      { id: 'ig-sq', label: 'Carré', ratio: '1:1', width: 1080, height: 1080 },
      {
        id: 'ig-story',
        label: 'Story / Reels',
        ratio: '9:16',
        width: 1080,
        height: 1920,
        safeZones: [
          { side: 'top', size: 0.14, label: 'profil' },
          { side: 'bottom', size: 0.2, label: 'CTA' },
        ],
      },
    ],
    captionLimit: 2200,
    captionWarnAt: 2200,
    invertedPriority: false,
    hashtags: true,
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    glyph: 'TT',
    accent: '#111111',
    formats: [
      {
        id: 'tt-916',
        label: 'Vertical 9:16',
        ratio: '9:16',
        width: 1080,
        height: 1920,
        safeZones: [
          { side: 'top', size: 0.1 },
          { side: 'bottom', size: 0.18, label: 'légende' },
          { side: 'right', size: 0.16, label: 'actions' },
        ],
      },
    ],
    captionLimit: 4000,
    captionWarnAt: 2200,
    invertedPriority: false,
    hashtags: true,
  },
x: {
    id: 'x',
    label: 'X',
    glyph: 'X',
    accent: '#000000',
    formats: [
      { id: 'x-169', label: 'Paysage 16:9', ratio: '16:9', width: 1600, height: 900 },
      { id: 'x-sq', label: 'Carré', ratio: '1:1', width: 1080, height: 1080 },
      { id: 'x-32', label: 'Large 1.91:1', ratio: '1.91:1', width: 1200, height: 628 },
    ],
    captionLimit: 280,
    captionWarnAt: 280,
    invertedPriority: true,
    hashtags: false,
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    glyph: 'in',
    accent: '#0A66C2',
    formats: [
      { id: 'li-link', label: 'Lien 1.91:1', ratio: '1.91:1', width: 1200, height: 628 },
      { id: 'li-sq', label: 'Carré', ratio: '1:1', width: 1080, height: 1080 },
      { id: 'li-45', label: 'Portrait 4:5', ratio: '4:5', width: 1080, height: 1350 },
    ],
    captionLimit: 3000,
    captionWarnAt: 3000,
    invertedPriority: false,
    hashtags: true,
  },
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    glyph: 'WA',
    accent: '#25D366',
    formats: [
      { id: 'wa-sq', label: 'Carré', ratio: '1:1', width: 1080, height: 1080 },
      {
        id: 'wa-status',
        label: 'Statut 9:16',
        ratio: '9:16',
        width: 1080,
        height: 1920,
        safeZones: [{ side: 'top', size: 0.08 }],
      },
    ],
    captionLimit: 4096,
    captionWarnAt: 1000,
    invertedPriority: true,
    hashtags: false,
  },
  threads: {
    id: 'threads',
    label: 'Threads',
    glyph: '@',
    accent: '#8A8A8A',
    formats: [
      { id: 'th-45', label: 'Portrait 4:5', ratio: '4:5', width: 1080, height: 1350 },
      { id: 'th-sq', label: 'Carré', ratio: '1:1', width: 1080, height: 1080 },
    ],
    captionLimit: 500,
    captionWarnAt: 500,
    invertedPriority: false,
    hashtags: true,
  },
};

export const NETWORK_ORDER: SocialNetwork[] = [
  'facebook', 'instagram', 'tiktok', 'x', 'linkedin', 'whatsapp', 'threads',
];

/** The format a card starts on when the network changes. */
export const DEFAULT_FORMAT_ID: Record<SocialNetwork, string> = {
  facebook: 'fb-45',
  instagram: 'ig-45',
  tiktok: 'tt-916',
  x: 'x-169',
  linkedin: 'li-link',
  whatsapp: 'wa-sq',
  threads: 'th-45',
};

export function getNetwork(id: SocialNetwork): NetworkSpec {
  return NETWORKS[id] ?? NETWORKS.instagram;
}

export function getFormat(network: SocialNetwork, formatId?: string): SocialFormat {
  const spec = getNetwork(network);
  return (
    spec.formats.find(f => f.id === formatId) ??
    spec.formats.find(f => f.id === DEFAULT_FORMAT_ID[network]) ??
    spec.formats[0]
  );
}

/** Caption slot a network reads: its own, else the universal one. */
export function resolveCaptionSlot(
  captions: Partial<Record<CaptionSlot, { fr: string; en: string }>>,
  network: SocialNetwork,
): { fr: string; en: string } {
  const own = captions[network];
  if (own && (own.fr?.trim() || own.en?.trim())) return own;
  return captions.universal ?? { fr: '', en: '' };
}

/** Carousels are capped by the platform; past that the file stops being one. */
export const MAX_CARDS = 10;