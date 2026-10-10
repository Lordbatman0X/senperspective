import {
  clientFetchRssFeed,
  clientRewriteArticle,
  getEditorialFallbackImage,
} from './clientAiEngine';
import { uniqueArticleSlug } from './slugify';
import { buildBilingualDraftFromArticle } from './carousel/draft';
import { matchTaxonomyCategory } from './siteTaxonomy';
import { safeJsonParse } from './apiUtils';
import { saveFirestoreDoc } from '../firebase/db';

/**
 * The newsroom writing cycle: how many stories get drafted from each wire, and
 * when.
 *
 * WHY THIS EXISTS
 * ---------------
 * The auto-scheduler used to live ENTIRELY on the Express backend
 * (/api/rss-automation/*). The site is served statically from Firebase
 * Hosting with no backend configured, so every scheduler call returned the
 * SPA's own index.html: the config never loaded, saving it threw "Save
 * failed", and no cycle ever ran. This module runs the same cycle in the
 * browser (while the admin console is open), reading and writing the SAME
 * config keys the admin UI already uses.
 *
 * EDITORIAL QUOTA — the rule the newsroom asked for:
 *   - Every Senegalese press agency (feed.pack === 'senegal') yields
 *     DEFAULT_QUOTA_SENEGAL (5) articles per cycle.
 *   - Every other feed (Africa, world, sports wires) yields
 *     DEFAULT_QUOTA_OTHER (2) articles per cycle.
 * Both remain configurable in Admin -> Flux RSS -> Planificateur.
 *
 * Every article produced here is written with the direct browser AI engine
 * (same providers as the Studio) and ships with READY social carousels in both
 * French and English: the AI writes `carouselCopy` (fr + en) in the same pass
 * as the body, and complete `carouselDraft` sets (1080x1080 cards) are
 * pre-built onto the article for each language, so the Carousel Studio opens
 * the finished French OR English cards instead of blank.
 */

/** Articles drafted per cycle from each Senegalese press agency. */
export const DEFAULT_QUOTA_SENEGAL = 5;
/** Articles drafted per cycle from every other (non-Senegal) feed. */
export const DEFAULT_QUOTA_OTHER = 2;

/** localStorage key — shared with the admin scheduler UI. */
export const SCHEDULE_CONFIG_KEY = 'perspective_rss_schedule_cfg';
/** localStorage key — shared with the RSS feed lists of both tabs. */
export const FEEDS_STORAGE_KEY = 'perspective_rss_feeds';
/** localStorage key remembering which designated time slots already ran. */
export const LAST_SLOT_KEY = 'perspective_rss_last_cycle_slot';

/**
 * How late a designated time slot may still fire. The cycle only runs while
 * the admin console is open, so a slot that came due while the browser was
 * closed is honoured as long as it is not older than this; anything stale is
 * skipped rather than flooding the desk with yesterday's quota.
 */
export const SLOT_GRACE_MINUTES = 120;

export interface NewsroomScheduleConfig {
  enabled: boolean;
  /** Fallback cadence when no designated times are configured. */
  intervalMinutes: number;
  /** 'all' or a feed pack id ('senegal' | 'africa' | 'world' | 'sports'). */
  targetPack: string;
  /** Legacy per-cycle cap; the per-pack quotas below take precedence. */
  maxArticlesPerCycle: number;
  autoPublish: boolean;
  preferredEngine?: string;
  customPrompt?: string;
  /** Designated daily run times, "HH:MM" in Africa/Dakar time. */
  times?: string[];
  /** Per-cycle quota for Senegalese agencies. */
  quotaSenegal?: number;
  /** Per-cycle quota for every other feed. */
  quotaOther?: number;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  status?: 'idle' | 'running' | 'error';
  totalDraftsCreated?: number;
  logs?: Array<{ id: string; timestamp: string; type: 'info' | 'success' | 'warning' | 'error'; message: string }>;
}

export const DEFAULT_SCHEDULE_CONFIG: NewsroomScheduleConfig = {
  enabled: false,
  intervalMinutes: 60,
  targetPack: 'all',
  maxArticlesPerCycle: 2,
  autoPublish: false,
  preferredEngine: 'auto',
  customPrompt: '',
  times: [],
  quotaSenegal: DEFAULT_QUOTA_SENEGAL,
  quotaOther: DEFAULT_QUOTA_OTHER,
  lastRunAt: null,
  nextRunAt: null,
  status: 'idle',
  totalDraftsCreated: 0,
  logs: [],
};

/** Reads the saved scheduler config (the same blob the admin UI writes). */
export function loadScheduleConfig(): NewsroomScheduleConfig {
  let stored: any = null;
  try {
    stored = safeJsonParse<any>(localStorage.getItem(SCHEDULE_CONFIG_KEY), null);
  } catch {
    stored = null;
  }
  return { ...DEFAULT_SCHEDULE_CONFIG, ...(stored || {}) };
}

/** Persists the scheduler config where both the UI and the runner read it. */
export function saveScheduleConfig(cfg: NewsroomScheduleConfig): NewsroomScheduleConfig {
  const next = { ...DEFAULT_SCHEDULE_CONFIG, ...cfg };
  try {
    localStorage.setItem(SCHEDULE_CONFIG_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the cycle still runs from the in-memory copy */
  }
  // Best-effort cross-device sync; never blocks the local save.
  try {
    saveFirestoreDoc('system_config', 'rss_schedule', next as any);
  } catch {
    /* Firestore unavailable */
  }
  return next;
}

/** The active feed list, shared with the RSS Studio tabs via localStorage. */
export function loadConfiguredFeeds(): any[] {
  let saved: any[] = [];
  try {
    saved = safeJsonParse<any[]>(localStorage.getItem(FEEDS_STORAGE_KEY), []);
  } catch {
    saved = [];
  }
  if (!Array.isArray(saved) || saved.length === 0) return [];
  const seen = new Set<string>();
  return saved.filter((f: any) => {
    if (!f || !f.id || seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
}

/** The per-feed quota: 5 for Senegalese agencies, 2 for everything else. */
export function quotaForFeed(feed: any, cfg: NewsroomScheduleConfig): number {
  const senegal = Number(cfg.quotaSenegal) > 0 ? Number(cfg.quotaSenegal) : DEFAULT_QUOTA_SENEGAL;
  const other = Number(cfg.quotaOther) > 0 ? Number(cfg.quotaOther) : DEFAULT_QUOTA_OTHER;
  return feed?.pack === 'senegal' ? senegal : other;
}

// ---------------------------------------------------------------------------
// Africa/Dakar time helpers
// ---------------------------------------------------------------------------
//
// Senegal keeps UTC+0 all year (no daylight saving), so a Dakar wall-clock
// time maps 1:1 onto UTC. Slot maths is therefore plain Date.UTC arithmetic —
// no offset tables that rot.

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Current Africa/Dakar wall-clock parts. */
export function dakarNow(now: Date = new Date()): {
  year: number; month: number; day: number; hours: number; minutes: number; minutesOfDay: number; dayKey: string;
} {
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hours,
    minutes,
    minutesOfDay: hours * 60 + minutes,
    dayKey: `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`,
  };
}

/** Accepts "7:5", "07:05", " 19h30 "... and returns "07:05" or null. */
export function normalizeTimeInput(raw: string): string | null {
  const m = String(raw || '').trim().match(/^(\d{1,2})\s*[:hH.]\s*(\d{1,2})$/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (hh > 23 || mm > 59) return null;
  return `${pad(hh)}:${pad(mm)}`;
}

/** Parses a comma/space separated list of designated times. */
export function parseTimesInput(input: string): string[] {
  const out = new Set<string>();
  for (const part of String(input || '').split(/[,;\n]+/)) {
    const t = normalizeTimeInput(part);
    if (t) out.add(t);
  }
  return [...out].sort();
}

/** "07:00" -> minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [hh, mm] = String(t || '').split(':').map((n) => parseInt(n, 10));
  return (hh || 0) * 60 + (mm || 0);
}

/** ISO timestamp of the next designated slot (Dakar time), or null when no times. */
export function nextRunFromTimes(times: string[], now: Date = new Date()): string | null {
  const clean = (times || []).map(normalizeTimeInput).filter(Boolean) as string[];
  if (clean.length === 0) return null;
  const sorted = [...clean].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  const nowMin = dakarNow(now).minutesOfDay;
  const pick = sorted.find((t) => timeToMinutes(t) > nowMin);
  const [hh, mm] = (pick || sorted[0]).split(':').map(Number);
  // No pick means the next slot is tomorrow's first one.
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayOffset = pick ? 0 : 24 * 60 * 60 * 1000;
  return new Date(base + hh * 3600_000 + mm * 60_000 + dayOffset).toISOString();
}

/**
 * Returns the slot key ("YYYY-MM-DD@HH:MM") when a designated time is due
 * right now and has not run yet — or null.
 */
export function dueSlotKey(times: string[], now: Date = new Date()): string | null {
  const clean = (times || []).map(normalizeTimeInput).filter(Boolean) as string[];
  if (clean.length === 0) return null;
  const { minutesOfDay, dayKey } = dakarNow(now);
  let last = '';
  try {
    last = localStorage.getItem(LAST_SLOT_KEY) || '';
  } catch {
    last = '';
  }
  // The latest slot that has already passed today.
  const passed = [...clean]
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
    .filter((t) => timeToMinutes(t) <= minutesOfDay);
  if (passed.length === 0) return null;
  const slot = `${dayKey}@${passed[passed.length - 1]}`;
  if (last === slot) return null;
  // Grace window: how late we are against the slot itself.
  const lateMinutes = minutesOfDay - timeToMinutes(passed[passed.length - 1]);
  if (lateMinutes > SLOT_GRACE_MINUTES) {
    // Too late (e.g. the console just opened after a long break): remember the
    // slot without running it, so it does not fire later today.
    try {
      localStorage.setItem(LAST_SLOT_KEY, slot);
    } catch { /* ignore */ }
    return null;
  }
  return slot;
}

/** Remembers a slot so it fires exactly once per day. */
export function markSlotRun(slot: string): void {
  try {
    localStorage.setItem(LAST_SLOT_KEY, slot);
  } catch { /* ignore */ }
}

/** Interval fallback due? (Used only when no designated times are set.) */
export function intervalDue(cfg: NewsroomScheduleConfig, now: Date = new Date()): boolean {
  const every = Number(cfg.intervalMinutes) > 0 ? Number(cfg.intervalMinutes) : 60;
  if (!cfg.lastRunAt) return true;
  const last = new Date(cfg.lastRunAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= every * 60_000;
}


// ---------------------------------------------------------------------------
// The cycle itself
// ---------------------------------------------------------------------------

export interface NewsroomCycleResult {
  success: boolean;
  created: number;
  generatedCount: number;
  engineUsed: string;
  feedsProcessed: number;
  feedsFailed: number;
  error?: string;
  logs: Array<{ id: string; timestamp: string; type: 'info' | 'success' | 'warning' | 'error'; message: string }>;
}

const normTitle = (t: any) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs one full writing cycle over the configured feeds.
 *
 * For every active feed — filtered by the configured target pack — the cycle
 * drafts up to the feed's quota (5 for Senegalese agencies, 2 for the rest)
 * of the newest wire items that have NOT already been drafted. Each article
 * is filed under a real site category, gets a clean slug, a themed image and
 * a READY 1080x1080 social carousel (`carouselDraft`), and is handed to
 * `addArticle` exactly like a manual Studio generation.
 */
export async function runNewsroomCycle(options: {
  config?: NewsroomScheduleConfig;
  feeds?: any[];
  existingArticles?: any[];
  siteCategories?: any[];
  isFr?: boolean;
  onProgress?: (message: string) => void;
  addArticle: (article: any) => any | Promise<any>;
}): Promise<NewsroomCycleResult> {
  const {
    config,
    feeds,
    existingArticles = [],
    siteCategories = [],
    isFr = true,
    onProgress,
    addArticle,
  } = options;

  const cfg = config || loadScheduleConfig();
  const log: NewsroomCycleResult['logs'] = [];
  const say = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    log.push({ id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: new Date().toISOString(), type, message });
    if (onProgress) onProgress(message);
  };

  const source =
    Array.isArray(feeds) && feeds.length > 0 ? feeds : loadConfiguredFeeds();
  const targets = source.filter((f: any) => {
    if (!f || f.active === false) return false;
    if (cfg.targetPack && cfg.targetPack !== 'all' && f.pack !== cfg.targetPack) return false;
    return true;
  });

  if (targets.length === 0) {
    return {
      success: false,
      created: 0,
      generatedCount: 0,
      engineUsed: '',
      feedsProcessed: 0,
      feedsFailed: 0,
      error: isFr ? 'Aucune source active à traiter.' : 'No active feed to process.',
      logs: log,
    };
  }

  // Dedupe against what the newsroom already has: same source URL or same
  // headline means the wire item was already drafted on a previous run.
  const usedUrls = new Set<string>();
  const usedTitles = new Set<string>();
  const usedSlugs = new Set<string>();
  for (const a of existingArticles || []) {
    if (a?.sourceUrl) usedUrls.add(String(a.sourceUrl));
    if (a?.slug) usedSlugs.add(String(a.slug));
    usedTitles.add(normTitle(a?.title?.fr || a?.title?.en));
  }

  let created = 0;
  let feedsFailed = 0;
  let lastEngineUsed = '';

  say(
    isFr
      ? `Cycle démarré : ${targets.length} source(s) — quotas ${quotaForFeed({ pack: 'senegal' }, cfg)} (Sénégal) / ${quotaForFeed({}, cfg)} (autres).`
      : `Cycle started: ${targets.length} source(s) — quotas ${quotaForFeed({ pack: 'senegal' }, cfg)} (Senegal) / ${quotaForFeed({}, cfg)} (others).`
  );


  for (const feed of targets) {
    const quota = quotaForFeed(feed, cfg);
    try {
      const feedResult = await clientFetchRssFeed(feed.url, feed.name);
      const items: any[] = Array.isArray(feedResult?.items) ? feedResult.items : [];
      if (items.length === 0) {
        say(`${feed.name}: ${isFr ? 'flux injoignable ou vide.' : 'feed unreachable or empty.'}`, 'warning');
        feedsFailed++;
        continue;
      }

      const fresh = items
        .filter((it: any) => {
          const link = String(it.link || '').trim();
          const title = normTitle(it.title);
          if (link && usedUrls.has(link)) return false;
          if (title && usedTitles.has(title)) return false;
          return true;
        })
        .slice(0, quota);

      if (fresh.length === 0) {
        say(`${feed.name}: ${isFr ? 'aucune dépêche nouvelle (tout est déjà rédigé).' : 'no new wire item (everything already drafted).'}`, 'info');
        continue;
      }

      const category = matchTaxonomyCategory(feed.category, siteCategories as any);

      for (const item of fresh) {
        try {
          const rewriteRes = await clientRewriteArticle({
            article: item,
            prompt:
              cfg.customPrompt ||
              `Rédige un article d'actualité rigoureux et complet à partir de cette dépêche de presse : "${item.title}". Source : ${feed.name || 'Dépêche'}.`,
            category,
            type: 'News',
            preferredEngine: cfg.preferredEngine || 'auto',
          });

          if (!rewriteRes.success || !rewriteRes.article) {
            say(`${feed.name}: ${isFr ? 'réécriture IA échouée.' : 'AI rewrite failed.'}`, 'warning');
            continue;
          }

          lastEngineUsed = rewriteRes.engineUsed || lastEngineUsed;

          const newArt: any = {
            ...rewriteRes.article,
            id: 'art-wire-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
            publishedAt: new Date().toISOString(),
            isPublished: !!cfg.autoPublish,
            category,
            type: 'News',
            sourceFeed: feed.url,
            sourceName: feed.name,
            sourceUrl: item.link || feed.url,
            author: 'Perspective Newsroom',
            aiGenerated: true,
            aiModelUsed: rewriteRes.engineUsed,
          };
          newArt.slug = uniqueArticleSlug(
            newArt.title?.fr || newArt.title?.en || item.title || 'article',
            [...usedSlugs]
          );


          // Themed image: wire photo first, else the editorial fallback.
          const assignedImg =
            item.imageUrl ||
            item.image ||
            item.enclosure?.url ||
            rewriteRes.article?.featuredImage ||
            getEditorialFallbackImage(category, newArt.title?.fr || item.title || '');
          if (assignedImg) {
            newArt.featuredImage = assignedImg;
            newArt.imageUrl = assignedImg;
          }

          if (!newArt.readingTime) {
            const words = String(newArt.body?.fr || newArt.body?.en || '')
              .split(/\s+/)
              .filter(Boolean).length;
            newArt.readingTime = words > 0 ? Math.max(1, Math.round(words / 200)) : 4;
          }

          // READY bilingual social carousel: complete 1080x1080 card sets in
          // BOTH languages, pre-built from the article's own AI-written
          // carouselCopy (the AI writes the fr and en blocks in the same pass
          // as the body). The Carousel Studio opens the finished French OR
          // English cards instead of blank. `carouselDraft` stays the French
          // copy for backward compatibility with earlier drafts.
          try {
            const drafts = buildBilingualDraftFromArticle(newArt as any);
            newArt.carouselDrafts = drafts;
            newArt.carouselDraft = drafts.fr;
          } catch {
            /* the studio can still rebuild drafts from the article later */
          }

          await addArticle(newArt);
          usedSlugs.add(newArt.slug);
          if (newArt.sourceUrl) usedUrls.add(String(newArt.sourceUrl));
          usedTitles.add(normTitle(newArt.title?.fr || newArt.title?.en));
          created++;
          say(`${feed.name} → "${String(newArt.title?.fr || '').slice(0, 60)}…"`, 'success');
          // Gentle pacing so a 5-story run does not trip provider rate limits.
          await sleep(800);
        } catch (err: any) {
          say(`${feed.name}: ${err?.message || err}`, 'error');
        }
      }
    } catch (err: any) {
      feedsFailed++;
      say(`${feed.name}: ${err?.message || err}`, 'error');
    }
  }

  say(
    isFr
      ? `Cycle terminé : ${created} article(s) rédigé(s), ${feedsFailed} source(s) en échec.`
      : `Cycle complete: ${created} article(s) drafted, ${feedsFailed} feed(s) failed.`,
    created > 0 ? 'success' : 'warning'
  );

  return {
    success: created > 0,
    created,
    generatedCount: created,
    engineUsed: lastEngineUsed || 'IA Client',
    feedsProcessed: targets.length,
    feedsFailed,
    logs: log,
  };
}

