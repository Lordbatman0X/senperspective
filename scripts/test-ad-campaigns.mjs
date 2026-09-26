/**
 * Campaign scheduling tests.
 *
 * These run the real module against fixed dates so the rules are pinned:
 * backward compatibility, the schedule window, pause, and the inventory view.
 * No database and no network involved.
 *
 * Run: node scripts/test-ad-campaigns.mjs
 */
import {
  getCampaignStatus,
  isAdPubliclyVisible,
  visibleAds,
  buildInventory,
  ctr,
  toDateKey,
  formatCampaignWindow,
} from '../src/lib/adCampaign.ts';

let pass = 0;
let fail = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}`);
    console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const NOW = new Date('2026-09-25T12:00:00Z');

console.log('\nBackward compatibility (existing /ads records)\n');
// The exact shape of a pre-upgrade record.
check('active:true with no dates is ACTIVE', getCampaignStatus({ active: true }, NOW), 'active');
check('active:false with no dates is PAUSED', getCampaignStatus({ active: false }, NOW), 'paused');
check('active:true with no dates is publicly visible', isAdPubliclyVisible({ active: true }, NOW), true);
check('extra unknown fields do not break it', getCampaignStatus({ active: true, tag: 'X', width: 300 }, NOW), 'active');

console.log('\nScheduling\n');
check('future start is SCHEDULED', getCampaignStatus({ active: true, startDate: '2026-10-01' }, NOW), 'scheduled');
check('future start is hidden', isAdPubliclyVisible({ active: true, startDate: '2026-10-01' }, NOW), false);
check('inside window is ACTIVE', getCampaignStatus({ active: true, startDate: '2026-09-20', endDate: '2026-09-30' }, NOW), 'active');
check('end date is inclusive (today == end)', getCampaignStatus({ active: true, endDate: '2026-09-25' }, NOW), 'active');
check('day after end is EXPIRED', getCampaignStatus({ active: true, endDate: '2026-09-24' }, NOW), 'expired');
check('expired campaign is hidden', isAdPubliclyVisible({ active: true, endDate: '2026-09-24' }, NOW), false);
check('start today is ACTIVE', getCampaignStatus({ active: true, startDate: '2026-09-25' }, NOW), 'active');

console.log('\nExplicit status\n');
check('draft never shows', isAdPubliclyVisible({ active: true, status: 'draft' }, NOW), false);
check('archived never shows', isAdPubliclyVisible({ active: true, status: 'archived' }, NOW), false);
check('paused never shows', isAdPubliclyVisible({ active: true, status: 'paused' }, NOW), false);
check('paused wins over a valid window', getCampaignStatus({ active: true, status: 'paused', startDate: '2026-09-20', endDate: '2026-09-30' }, NOW), 'paused');
check('archived beats everything', getCampaignStatus({ active: true, status: 'archived', endDate: '2026-12-01' }, NOW), 'archived');
check('active:false still pauses when status says active', getCampaignStatus({ active: false, status: 'active' }, NOW), 'paused');

console.log('\nDakar timezone (UTC+0, no DST)\n');
check('late-evening UTC is still the same Dakar day', getCampaignStatus({ active: true, endDate: '2026-09-25' }, new Date('2026-09-25T23:30:00Z')), 'active');
check('timestamp values are accepted', getCampaignStatus({ active: true, endDate: '2026-09-25T23:59:59Z' }, NOW), 'active');
check('toDateKey trims to the date part', toDateKey('2026-09-25T18:30:00Z'), '2026-09-25');
check('toDateKey rejects junk', toDateKey('not-a-date'), null);

console.log('\nFiltering\n');
const mixed = [
  { id: 'live', active: true },
  { id: 'paused', active: false },
  { id: 'future', active: true, startDate: '2026-12-01' },
  { id: 'over', active: true, endDate: '2026-01-01' },
];
check('visibleAds keeps only live campaigns', visibleAds(mixed, NOW).map(a => a.id), ['live']);

console.log('\nInventory\n');
const inv = buildInventory([
  { id: 'h1', position: 'header', active: true, name: 'Header Co' },
  { id: 's1', position: 'sidebar', active: true, startDate: '2026-12-01' },
], NOW);
check('every existing placement gets a row', inv.length, 8);
check('a live campaign marks the slot active', inv.find(r => r.placement.id === 'header').state, 'active');
check('a future campaign marks the slot scheduled', inv.find(r => r.placement.id === 'sidebar').state, 'scheduled');
check('an unoccupied placement is available', inv.find(r => r.placement.id === 'far-left').state, 'available');
check('available count', inv.filter(r => r.state === 'available').length, 6);
check('expired returns the slot to mockup', buildInventory([
  { id: 'x', position: 'header', active: true, endDate: '2026-01-01' },
], NOW)[0].state, 'available');
check('active campaign beats a scheduled one', buildInventory([
  { id: 'a', position: 'header', active: true, startDate: '2026-12-01' },
  { id: 'b', position: 'header', active: true },
], NOW)[0].campaign.id, 'b');

console.log('\nMetrics\n');
check('CTR of 100/500', ctr(500, 100), 20);
check('CTR is 0 with no impressions (not NaN)', ctr(0, 5), 0);
check('CTR is 0 with no data at all', ctr(undefined, undefined), 0);
check('window includes the year', formatCampaignWindow({ startDate: '2026-09-20', endDate: '2026-09-30' }, true).includes('2026'), true);
check('undated window is a dash', formatCampaignWindow({}, true), '—');

console.log(`\n${fail === 0 ? '=== ALL CHECKS PASSED ===' : '=== FAILURES ==='}  (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
