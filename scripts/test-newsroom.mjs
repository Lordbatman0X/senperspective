// scripts/test-newsroom.mjs
// Verifies the newsroom writing-cycle rules: the 5/2 per-feed quota, the
// designated Africa/Dakar time slots, the once-per-slot guard, the interval
// fallback, and the schedule config round trip.
import assert from 'node:assert/strict';

// Minimal storage stub — newsroomCycle reads/writes localStorage lazily (no
// module-load access), so a static import above this line is still safe.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

import {
  DEFAULT_QUOTA_SENEGAL,
  DEFAULT_QUOTA_OTHER,
  quotaForFeed,
  normalizeTimeInput,
  parseTimesInput,
  nextRunFromTimes,
  dueSlotKey,
  markSlotRun,
  intervalDue,
  loadScheduleConfig,
  saveScheduleConfig,
  loadConfiguredFeeds,
  SCHEDULE_CONFIG_KEY,
  FEEDS_STORAGE_KEY,
  LAST_SLOT_KEY,
} from '../src/lib/newsroomCycle';

const ok = (m) => console.log(`ok - ${m}`);

// --- editorial quota -------------------------------------------------------
assert.equal(DEFAULT_QUOTA_SENEGAL, 5);
assert.equal(DEFAULT_QUOTA_OTHER, 2);
assert.equal(quotaForFeed({ pack: 'senegal' }, {}), 5);
assert.equal(quotaForFeed({ pack: 'africa' }, {}), 2);
assert.equal(quotaForFeed({ pack: 'world' }, {}), 2);
assert.equal(quotaForFeed({ pack: 'sports' }, {}), 2);
assert.equal(quotaForFeed({ pack: 'senegal' }, { quotaSenegal: 7 }), 7);
assert.equal(quotaForFeed({ pack: 'world' }, { quotaOther: 3 }), 3);
ok('Senegalese agencies get 5 articles per cycle, other feeds 2 (configurable)');

// --- designated time parsing ----------------------------------------------
assert.equal(normalizeTimeInput('7:5'), '07:05');
assert.equal(normalizeTimeInput('19h30 '), '19:30');
assert.equal(normalizeTimeInput('25:00'), null);
assert.equal(normalizeTimeInput('garbage'), null);
assert.deepEqual(parseTimesInput('7:00, 13h30 ;bad, 19:00'), ['07:00', '13:30', '19:00']);
ok('designated times parse, normalise and sort');

// --- next run resolution ---------------------------------------------------
// 10:00 Dakar (UTC+0) -> next slot is 13:30 the same day.
const t1 = nextRunFromTimes(['07:00', '13:30', '19:00'], new Date(Date.UTC(2026, 9, 9, 10, 0)));
assert.equal(new Date(t1).toISOString(), '2026-10-09T13:30:00.000Z');
// 20:00 -> tomorrow's first slot (07:00 on the 10th).
const t2 = nextRunFromTimes(['07:00', '13:30', '19:00'], new Date(Date.UTC(2026, 9, 9, 20, 0)));
assert.equal(new Date(t2).toISOString(), '2026-10-10T07:00:00.000Z');
assert.equal(nextRunFromTimes([], new Date()), null);
ok('next run resolves to the next designated Dakar slot');

// --- due-slot guard --------------------------------------------------------
const base = new Date(Date.UTC(2026, 9, 9, 13, 35)); // 5 minutes after 13:30
store.delete(LAST_SLOT_KEY);
assert.equal(dueSlotKey(['07:00', '13:30', '19:00'], base), '2026-10-09@13:30');
markSlotRun('2026-10-09@13:30');
assert.equal(dueSlotKey(['07:00', '13:30', '19:00'], base), null);
ok('a designated slot fires exactly once per day');

// A slot that came due while the browser was closed (> grace) is remembered
// but NOT run, so opening the console at 18:00 does not flood the desk.
store.delete(LAST_SLOT_KEY);
assert.equal(dueSlotKey(['13:30'], new Date(Date.UTC(2026, 9, 9, 18, 0))), null);
assert.equal(store.get(LAST_SLOT_KEY), '2026-10-09@13:30');
ok('a stale slot is marked without firing (grace window)');

// --- interval fallback -----------------------------------------------------
assert.equal(intervalDue({ intervalMinutes: 60, lastRunAt: null }), true);
assert.equal(
  intervalDue(
    { intervalMinutes: 60, lastRunAt: new Date(Date.UTC(2026, 9, 9, 9, 0)).toISOString() },
    new Date(Date.UTC(2026, 9, 9, 9, 30))
  ),
  false
);
assert.equal(
  intervalDue(
    { intervalMinutes: 60, lastRunAt: new Date(Date.UTC(2026, 9, 9, 9, 0)).toISOString() },
    new Date(Date.UTC(2026, 9, 9, 10, 1))
  ),
  true
);
ok('interval fallback honours the configured cadence');

// --- schedule config round trip -------------------------------------------
saveScheduleConfig({
  enabled: true,
  intervalMinutes: 30,
  targetPack: 'all',
  maxArticlesPerCycle: 2,
  autoPublish: false,
  times: ['08:00'],
  quotaSenegal: 5,
  quotaOther: 2,
});
const cfg = loadScheduleConfig();
assert.equal(cfg.enabled, true);
assert.equal(cfg.intervalMinutes, 30);
assert.deepEqual(cfg.times, ['08:00']);
assert.equal(cfg.quotaSenegal, 5);
assert.ok(store.has(SCHEDULE_CONFIG_KEY));
ok('schedule config round-trips through local storage');

// --- feed list -------------------------------------------------------------
store.set(FEEDS_STORAGE_KEY, JSON.stringify([
  { id: 'aps', name: 'APS', url: 'https://aps.sn/feed/', pack: 'senegal', active: true },
  { id: 'aps', name: 'duplicate id' },
  { id: 'reuters', name: 'Reuters', url: 'https://r.example/rss', pack: 'world', active: false },
]));
const feeds = loadConfiguredFeeds();
assert.equal(feeds.length, 2);
assert.equal(feeds[0].pack, 'senegal');
ok('feed list loads and dedupes by id (inactive kept for filtering at run time)');

console.log('\nnewsroom cycle checks passed');
// The bundled store/firebase modules register timers that keep Node alive;
// exit explicitly so the suite terminates once the checks are done.
process.exit(0);
