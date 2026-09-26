/**
 * Advertising inventory + campaign logic.
 *
 * This is the single source of truth for "is this campaign live?". Public
 * render sites (Layout, HomePage, ArticlePage) and the admin Ad Manager all
 * call in here, so a placement can never show a campaign the admin considers
 * paused or expired.
 *
 * Design constraints this file honours:
 *
 *  - BACKWARD COMPATIBLE. An existing record such as
 *      { id, name, imageUrl, targetUrl, position, active: true }
 *    must keep behaving exactly as before. Every campaign field is optional
 *    and `active` alone still resolves to a real status.
 *
 *  - NO MIGRATION. Nothing here writes; it only interprets. Existing /ads data
 *    is never rewritten.
 *
 *  - AFRICA/DAKAR. Dakar is UTC+0 with no daylight saving, so a date-only
 *    comparison against UTC is exactly equivalent to Dakar local time. All
 *    date maths is centralised in `todayInDakar()` so that if the site ever
 *    serves a different market, this is the only place that changes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignStatus =
  | 'draft'      // never shown publicly
  | 'scheduled'  // start date in the future — reserved, not live yet
  | 'active'     // live now
  | 'paused'     // switched off by the administrator
  | 'expired'    // end date has passed — inventory returns to mockup
  | 'archived';  // historical record

export type CampaignType = 'display' | 'sponsored';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

/** Minimal shape this module needs; works with store AdItem or raw RTDB rows. */
export interface CampaignLike {
  active?: boolean;
  status?: string;
  startDate?: string;
  endDate?: string;
  position?: string;
}

// ---------------------------------------------------------------------------
// Placements — ids are NOT renamed, they match the public render sites
// ---------------------------------------------------------------------------

export interface PlacementMeta {
  id: string;
  label: { fr: string; en: string };
  dimensions: { fr: string; en: string };
}

export const AD_PLACEMENTS: PlacementMeta[] = [
  { id: 'header',           label: { fr: "Bannière d'en-tête",      en: 'Header Banner' },        dimensions: { fr: 'Leaderboard 728×90', en: 'Leaderboard 728×90' } },
  { id: 'in-article',       label: { fr: "Bannière d'article",      en: 'In-Article Banner' },    dimensions: { fr: 'Large 970×120',       en: 'Large 970×120' } },
  { id: 'sidebar',          label: { fr: 'Encart latéral',          en: 'Sidebar Square' },       dimensions: { fr: 'Carré 300×250',       en: 'Square 300×250' } },
  { id: 'far-left',         label: { fr: 'Bannière extrême gauche', en: 'Far Left Panel' },       dimensions: { fr: 'Skyscraper 160×600',  en: 'Skyscraper 160×600' } },
  { id: 'homepage-between', label: { fr: 'Entre-articles (accueil)', en: 'Homepage In-between' }, dimensions: { fr: 'Bandeau 970×120',     en: 'Banner 970×120' } },
  { id: 'sidebar-cafe',     label: { fr: 'Sponsor latéral #1',      en: 'Sidebar Sponsor #1' },   dimensions: { fr: 'Carré 300×250',       en: 'Square 300×250' } },
  { id: 'sidebar-ter',      label: { fr: 'Sponsor latéral #2',      en: 'Sidebar Sponsor #2' },   dimensions: { fr: 'Bandeau 300×120',     en: 'Banner 300×120' } },
  { id: 'announcement',     label: { fr: 'Annonce / bandeau',       en: 'Announcement Strip' },   dimensions: { fr: 'Bandeau 970×90',      en: 'Banner 970×90' } },
];

export const placementLabel = (id: string, isFr: boolean) =>
  AD_PLACEMENTS.find((p) => p.id === id)?.label[isFr ? 'fr' : 'en'] || id;

export const placementDimensions = (id: string, isFr: boolean) =>
  AD_PLACEMENTS.find((p) => p.id === id)?.dimensions[isFr ? 'fr' : 'en'] || '—';

// ---------------------------------------------------------------------------
// Labels, via the existing FR/EN mechanism
// ---------------------------------------------------------------------------

export const campaignStatusLabel = (s: CampaignStatus, isFr: boolean): string => {
  const map: Record<CampaignStatus, [string, string]> = {
    draft:     ['Brouillon',  'Draft'],
    scheduled: ['Programmée', 'Scheduled'],
    active:    ['En ligne',   'Active'],
    paused:    ['Suspendue',  'Paused'],
    expired:   ['Expirée',    'Expired'],
    archived:  ['Archivée',   'Archived'],
  };
  return map[s] ? map[s][isFr ? 0 : 1] : s;
};

export const campaignTypeLabel = (t: CampaignType | undefined, isFr: boolean): string =>
  t === 'sponsored'
    ? (isFr ? 'Contenu sponsorisé' : 'Sponsored content')
    : (isFr ? 'Affichage' : 'Display');


// ---------------------------------------------------------------------------
// Dakar-time helpers
// ---------------------------------------------------------------------------

/**
 * Today's date as `YYYY-MM-DD` in Africa/Dakar.
 *
 * Dakar is permanently UTC+0 (no DST), so reading the UTC fields of "now" is
 * the same as reading Dakar wall-clock fields. Centralised here so that
 * assumption is written down exactly once.
 */
export function todayInDakar(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Normalises a stored date value to `YYYY-MM-DD`, or null if unusable. */
export function toDateKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Status resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a campaign's effective status.
 *
 * Backward compatibility is the important part:
 *   - `active: true`, no status, no dates  -> 'active'  (unchanged behaviour)
 *   - `active: false`, no status, no dates -> 'paused'  (the existing toggle)
 *   - `status: 'draft'` / `'archived'`     -> honoured verbatim
 *
 * Dates are then applied on top, so a campaign whose end date has passed
 * stops showing without the admin having to remember to toggle it off. An
 * explicit 'paused' always wins, because that is a deliberate human action.
 */
export function getCampaignStatus(ad: CampaignLike, now: Date = new Date()): CampaignStatus {
  const explicit = String(ad.status || '').toLowerCase() as CampaignStatus;

  if (explicit === 'archived') return 'archived';
  if (explicit === 'draft') return 'draft';
  if (explicit === 'paused') return 'paused';

  // The legacy on/off switch still governs anything that is not explicitly
  // active. Note this is checked even when `status` says 'active': `active` is
  // the field the existing public render sites and older exports read, so if it
  // is false the campaign must be treated as paused regardless.
  if (ad.active === false) return 'paused';

  const today = todayInDakar(now);
  const start = toDateKey(ad.startDate);
  const end = toDateKey(ad.endDate);

  // The end date is inclusive: a campaign running "20 Sep → 30 Sep" is still
  // live on 30 Sep and expires on 31 Sep.
  if (end && today > end) return 'expired';
  if (start && today < start) return 'scheduled';

  return 'active';
}

/**
 * The single gate every public ad render site must use.
 *
 * True only when the campaign is genuinely live: enabled, not paused, not
 * expired, and inside its schedule. Draft and archived never show.
 */

// ---------------------------------------------------------------------------
// Inventory — "what can I sell right now?"
// ---------------------------------------------------------------------------

export type InventoryState = 'available' | 'scheduled' | 'active' | 'occupied';

/**
 * One row per placement.
 *
 * Generic in `T` so the concrete ad type survives: when the caller passes
 * `AdItem[]`, `row.campaign` is an `AdItem`, not a bare `CampaignLike`. That is
 * what lets the admin table read `campaignName`, `advertiserName`, `imageUrl`
 * and friends without casting, while `CampaignLike` stays the minimal
 * structural contract this module actually needs.
 */
export interface InventoryRow<T extends CampaignLike = CampaignLike> {
  placement: PlacementMeta;
  /** The campaign holding the slot, if any. Active campaigns win. */
  campaign: T | null;
  status: CampaignStatus | null;
  state: InventoryState;
  /** Everything assigned to the placement, so conflicts stay visible. */
  campaigns: T[];
}

/** Lower weight wins the slot. */
function statusWeight(s: CampaignStatus): number {
  return { active: 0, scheduled: 1, paused: 2, expired: 3, draft: 4, archived: 5 }[s];
}

/**
 * One row per existing placement.
 *
 * A placement is AVAILABLE when nothing live or reserved occupies it, which is
 * when the public site should keep showing its mockup. A SCHEDULED campaign
 * marks the slot reserved-but-not-yet-live so the admin does not double-sell
 * inventory they have already promised.
 */
export function buildInventory<T extends CampaignLike>(
  ads: T[] | null | undefined,
  now?: Date
): InventoryRow<T>[] {
  const list = ads ?? [];
  return AD_PLACEMENTS.map((placement) => {
    const campaigns = list.filter((a) => a.position === placement.id);
    const ranked = [...campaigns].sort(
      (a, b) => statusWeight(getCampaignStatus(a, now)) - statusWeight(getCampaignStatus(b, now))
    );
    const top = ranked[0] ?? null;
    const status = top ? getCampaignStatus(top, now) : null;
    const freesSlot = status === 'expired' || status === 'draft' || status === 'archived';
    const state: InventoryState = !top || freesSlot
      ? 'available'
      : status === 'active'
        ? 'active'
        : status === 'scheduled'
          ? 'scheduled'
          : 'occupied';
    return { placement, campaign: freesSlot ? null : top, status, state, campaigns };
  });
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** CTR as a percentage; 0 rather than NaN/Infinity when nothing is measured. */
export function ctr(impressions?: number, clicks?: number): number {
  const imp = impressions ?? 0;
  if (imp <= 0) return 0;
  return ((clicks ?? 0) / imp) * 100;
}

/** "20 sept. → 30 sept. 2026", or a dash when the campaign is undated. */
export function formatCampaignWindow(ad: CampaignLike, isFr: boolean): string {
  const start = toDateKey(ad.startDate);
  const end = toDateKey(ad.endDate);
  const fmt = (key: string, withYear: boolean) =>
    new Date(`${key}T00:00:00Z`).toLocaleDateString(
      isFr ? 'fr-FR' : 'en-GB',
      withYear
        ? { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }
        : { day: '2-digit', month: 'short', timeZone: 'UTC' }
    );
  if (start && end) return `${fmt(start, false)} → ${fmt(end, true)}`;
  if (start) return isFr ? `à partir du ${fmt(start, true)}` : `from ${fmt(start, true)}`;
  if (end) return isFr ? `jusqu'au ${fmt(end, true)}` : `until ${fmt(end, true)}`;
  return '—';
}

export function isAdPubliclyVisible(ad: CampaignLike, now?: Date): boolean {
  return getCampaignStatus(ad, now) === 'active';
}

/** Filter helper so call sites read as a plain `ads.filter(...)`. */
export const visibleAds = <T extends CampaignLike>(ads: T[] | null | undefined, now?: Date): T[] =>
  (ads ?? []).filter((a) => isAdPubliclyVisible(a, now));

/** The first live campaign for a placement, or null. */
export function liveAdForPosition<T extends CampaignLike>(
  ads: T[] | null | undefined,
  position: string,
  now?: Date
): T | null {
  return (ads ?? []).find((a) => isAdPubliclyVisible(a, now) && a.position === position) ?? null;
}

export const paymentStatusLabel = (p: PaymentStatus | undefined, isFr: boolean): string => {
  const map: Record<PaymentStatus, [string, string]> = {
    pending:   ['En attente', 'Pending'],
    partial:   ['Partiel',    'Partial'],
    paid:      ['Payé',       'Paid'],
    overdue:   ['En retard',  'Overdue'],
    cancelled: ['Annulé',     'Cancelled'],
  };
  return map[p] ? map[p][isFr ? 0 : 1] : map.pending[isFr ? 0 : 1];
};
