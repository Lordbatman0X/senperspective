/** Category -> hashtag. Kept small and explicit rather than auto-slugified. */
const CATEGORY_TAGS: Record<string, string> = {
  'Politique': 'PolitiqueSenegal',
  'Économie': 'EconomieSenegal',
  'Société': 'Senegal',
  'International': 'Afrique',
  'Tech': 'TechSenegal',
  'Santé': 'SanteSenegal',
  'Sports': 'SportSenegal',
  'People': 'PeopleSenegal',
  'Gouvernance': 'Gouvernance',
  'Dossiers': 'Dossier',
  'Dossier': 'Dossier',
  'Flash Info': 'FlashInfo',
  'Flash': 'FlashInfo',
  'Météo & Maritime': 'MeteoMaritime',
  'Chaloupe & Transports': 'TransportsSenegal',
  'Culture & People': 'CultureSenegal',
  'Tech & Innovation': 'Innovation',
};

const BASE_TAGS = ['SenPerspective', 'PerspectiveGroup'];

/**
 * Turn a free tag into a hashtag.
 *
 * Accents are KEPT — `#Santé` is the spelling readers recognise, and Facebook
 * and Instagram both handle it. Ampersands and other symbols are dropped: `#A&B`
 * is not a usable tag on any of the target networks.
 */
export function toHashtag(tag: string): string {
  const cleaned = tag
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .replace(/\s+/g, '');
  return cleaned ? `#${cleaned}` : '';
}

export function buildHashtags(
  source: SocialSource,
  network: SocialNetwork,
  lang: CaptionLanguage,
): string[] {
  const spec = getNetwork(network);
  if (!spec.hashtags) return [];

  const tags: string[] = [];
  const push = (h: string) => { if (h && !tags.includes(h)) tags.push(h); };

  const mapped = source.category ? CATEGORY_TAGS[source.category] : undefined;
  if (mapped) push(toHashtag(mapped));

  for (const tag of (source.tags || []).slice(0, 4)) push(toHashtag(tag));
  for (const base of BASE_TAGS) {
    if (tags.length >= 8) break;
    push(base);
  }

  // An English caption keeps English hashtags on the same topics.
  if (lang === 'en') {
    const swap: Record<string, string> = {
      '#PolitiqueSenegal': '#PoliticsSenegal',
      '#EconomieSenegal': '#EconomySenegal',
      '#SanteSenegal': '#HealthSenegal',
      '#SportSenegal': '#SportsSenegal',
      '#Senegal': '#Senegal',
    };
    tags[0] = swap[tags[0]] ?? tags[0];
  }
  return tags.slice(0, 8);
}

/**
 * Trim a caption to the platform limit without producing an orphan hashtag.
 * Cutting mid-tag looks broken, so the body is clipped first and the tag lines
 * are appended afterwards.
 */
export function clampCaption(text: string, network: SocialNetwork): string {
  const spec = getNetwork(network);
  if (text.length <= spec.captionLimit) return text;

  const lines = text.split('\n');
  const tagLines = lines.filter(l => l.trim().startsWith('#'));
  const bodyRaw = lines.filter(l => !l.trim().startsWith('#')).join('\n').trim();

  const room = Math.max(0, spec.captionLimit - tagLines.join('\n').length - 1);
  const clipped = truncate(bodyRaw, room);
  return tagLines.length ? `${clipped}\n\n${tagLines.join('\n')}` : clipped;
}

/** Body copy only, before hashtags. */
function buildBody(
  source: SocialSource,
  network: SocialNetwork,
  lang: CaptionLanguage,
  available: boolean,
): string {
  const spec = getNetwork(network);
  const pick = (fr: string | undefined, en: string | undefined) =>
    stripHtml(available ? (lang === 'fr' ? fr : en) : (lang === 'fr' ? en : fr));

  const sourceText = pick(source.excerpt?.fr, source.excerpt?.en)
    || firstSentences(pick(source.body?.fr, source.body?.en), spec.invertedPriority ? 1 : 2);

  const pieces: string[] = [];

  if (spec.invertedPriority) {
    // Lead with the payoff, not the lede: X and WhatsApp show about one line
    // before truncating.
    pieces.push(truncate(sourceText, network === 'x' ? 180 : 300));
  } else if (source.category) {
    pieces.push(`${lang === 'fr' ? 'Rubrique' : 'Category'} — ${source.category}`);
    pieces.push(sourceText);
  } else {
    pieces.push(sourceText);
  }

  if (!spec.invertedPriority && source.author) {
    pieces.push(`${lang === 'fr' ? 'Par' : 'By'} ${source.author}`);
  }

  const cta = (lang === 'fr' ? CTA_FR[network] : CTA_EN[network]) ?? '';
  if (cta) pieces.push(cta);
  if (source.slug) pieces.push(`https://senperspective.com/${source.slug}`);

  return pieces.filter(Boolean).join('\n\n');
}

export function generateCaption(
  source: SocialSource,
  network: SocialNetwork,
  lang: CaptionLanguage,
): CaptionDraft {
  const native = stripHtml(lang === 'fr' ? source.excerpt?.fr : source.excerpt?.en)
    || stripHtml(lang === 'fr' ? source.body?.fr : source.body?.en);
  const other = stripHtml(lang === 'fr' ? source.excerpt?.en : source.excerpt?.fr)
    || stripHtml(lang === 'fr' ? source.body?.en : source.body?.fr);
  const usedFallback = !native && Boolean(other);

  const body = buildBody(source, network, lang, !usedFallback);
  const hashtags = buildHashtags(source, network, lang);
  const text = hashtags.length ? `${body}\n\n${hashtags.join(' ')}` : body;

  return { text: clampCaption(text, network), usedFallback };
}

/** Both languages in one pass, so the panel can show a single timestamp. */
export function generateBothCaptions(
  source: SocialSource,
  network: SocialNetwork,
): { fr: CaptionDraft; en: CaptionDraft } {
  return {
    fr: generateCaption(source, network, 'fr'),
    en: generateCaption(source, network, 'en'),
  };
}
/**
 * FR / EN caption generation.
 *
 * Captions are generated ON DEMAND and then become editable text owned by the
 * design document. Nothing here is ever re-run silently: regenerating is an
 * explicit button, and the UI confirms before discarding manual edits.
 *
 * Each language is generated from that language's OWN article field. Falling
 * back FR -> EN would be worse than useless on a bilingual publication, because
 * a French caption under an English headline is a translation bug that ships.
 * Instead the draft carries a warning flag and the UI shows it.
 */

import type { CaptionLanguage, SocialNetwork } from '../../types/social';
import { getNetwork } from './networks';
import { firstSentences, stripHtml, truncate, type SocialSource } from './content';

export interface CaptionDraft {
  text: string;
  /**
   * True when the requested language had no usable source text and the other
   * language was borrowed. Surfaced as a warning badge, never hidden.
   */
  usedFallback: boolean;
}

const CTA_FR: Partial<Record<SocialNetwork, string>> = {
  facebook: 'Lisez la suite sur senperspective.com',
  instagram: 'Lisez la suite en ligne — lien en bio.',
  linkedin: 'Article complet sur senperspective.com',
  threads: 'La suite sur senperspective.com',
  tiktok: 'Lien en bio pour la suite.',
  x: '',
  whatsapp: 'Reach us on WhatsApp',
};

const CTA_EN: Partial<Record<SocialNetwork, string>> = {
  facebook: 'Read the full story on senperspective.com',
  instagram: 'Read the full story online — link in bio.',
  linkedin: 'Full article on senperspective.com',
  threads: 'The rest on senperspective.com',
  tiktok: 'Link in bio for the rest.',
  x: '',
  whatsapp: 'Reach us on WhatsApp',
};