import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import {
  dueSlotKey,
  intervalDue,
  loadScheduleConfig,
  markSlotRun,
  nextRunFromTimes,
  runNewsroomCycle,
  saveScheduleConfig,
  type NewsroomScheduleConfig,
} from '../lib/newsroomCycle';
import { resolveTaxonomy } from '../lib/siteTaxonomy';

/**
 * A cycle may take many minutes (5 stories per Senegalese agency), and the
 * tick fires every minute — this flag makes the scheduler a singleton, so a
 * second React root or a StrictMode double-mount can never start two cycles
 * over the same feeds.
 */
let cycleInFlight = false;

const MAX_LOGS = 30;

/**
 * The in-browser newsroom scheduler.
 *
 * At each designated time (Admin -> Flux RSS -> Planificateur, Africa/Dakar)
 * — or, when no times are set, every `intervalMinutes` — this runs one full
 * writing cycle: 5 articles from each Senegalese press agency and 2 from
 * every other feed, each with its social carousel ready.
 *
 * It lives in the browser because the deployed site has no backend cron: the
 * cycle runs while the admin console is open and honours missed slots within
 * a grace window, so leaving the dashboard open overnight keeps the desk fed.
 * Run state (lastRunAt, nextRunAt, logs, totals) is written back into the
 * same saved config the Planificateur screen renders.
 */
export function useNewsroomScheduler(): void {
  const { articles, addArticle, siteSettings, language } = useStore();
  // The tick reads the freshest articles for dedupe without re-subscribing.
  const articlesRef = useRef(articles || []);
  useEffect(() => {
    articlesRef.current = articles || [];
  }, [articles]);

  useEffect(() => {
    let disposed = false;

    const run = async (cfg: NewsroomScheduleConfig, slot: string | null, isInterval: boolean) => {
      cycleInFlight = true;
      const startedAt = new Date().toISOString();
      // Remember the slot BEFORE generating: a mid-cycle crash must not
      // re-fire the same slot a minute later and duplicate the quota.
      if (slot) markSlotRun(slot);
      const running: NewsroomScheduleConfig = { ...cfg, status: 'running' };
      saveScheduleConfig(running);
      try {
        const result = await runNewsroomCycle({
          config: running,
          existingArticles: articlesRef.current,
          siteCategories: resolveTaxonomy((siteSettings as any)?.categories),
          isFr: language === 'fr',
          onProgress: (m) => console.info('[Newsroom]', m),
          addArticle,
        });
        if (disposed) return;
        const now = new Date();
        const times = cfg.times || [];
        const next: NewsroomScheduleConfig = {
          ...running,
          status: result.success ? 'idle' : 'error',
          lastRunAt: startedAt,
          nextRunAt: times.length
            ? nextRunFromTimes(times, now)
            : new Date(now.getTime() + (Number(cfg.intervalMinutes) || 60) * 60_000).toISOString(),
          totalDraftsCreated: (Number(cfg.totalDraftsCreated) || 0) + result.created,
          logs: [...result.logs, ...(cfg.logs || [])].slice(0, MAX_LOGS),
        };
        saveScheduleConfig(next);
        console.info('[Newsroom]', `cycle done: ${result.created} article(s)${isInterval ? ' (interval)' : ` (slot ${slot})`}`);
      } catch (err: any) {
        console.error('[Newsroom] cycle failed:', err);
        if (!disposed) {
          saveScheduleConfig({
            ...running,
            status: 'error',
            lastRunAt: startedAt,
            logs: [
              { id: `log-${Date.now()}`, timestamp: startedAt, type: 'error' as const, message: String(err?.message || err) },
              ...(cfg.logs || []),
            ].slice(0, MAX_LOGS),
          });
        }
      } finally {
        cycleInFlight = false;
      }
    };

    const tick = () => {
      if (cycleInFlight || disposed) return;
      let cfg: NewsroomScheduleConfig;
      try {
        cfg = loadScheduleConfig();
      } catch {
        return;
      }
      if (!cfg.enabled) return;

      const slot = dueSlotKey(cfg.times || []);
      if (slot) {
        run(cfg, slot, false);
        return;
      }
      // Interval fallback only when no designated times are configured.
      if ((!cfg.times || cfg.times.length === 0) && intervalDue(cfg)) {
        run(cfg, null, true);
      }
    };

    // One immediate check so enabling the scheduler takes effect right away,
    // then a steady minute cadence.
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      disposed = true;
      clearInterval(id);
    };
    // The scheduler is intentionally mount-scoped: config, feeds and articles
    // are all read at run time from storage/the store refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
