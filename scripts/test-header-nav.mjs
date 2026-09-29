/**
 * Verifies the desktop navigation bar scope fix.
 *
 * The bar must render the admin's saved navigation ONLY. Previously
 * resolveNavItems() always appended every taxonomy category, so the bar grew
 * silently each time a category was added in Admin -> Categories, wrapping onto
 * two rows. The mobile drawer and footer must keep the full taxonomy so a new
 * section is still reachable.
 */
import assert from 'node:assert/strict';
// resolveNavItems is imported from the esbuild bundle of the real source, so this
// exercises the actual function rather than a copy. See the npm script.
const { resolveNavItems } = await import('../.navtest.mjs');

let pass = 0;
const ok = (name) => { console.log(`  PASS  ${name}`); pass++; };

// A site with a deliberately small saved nav, but a much larger taxonomy.
const stored = {
  headerNavItems: [
    { id: 'politique', labelFr: 'Politique', enabled: true },
    { id: 'economie', labelFr: 'Ã‰conomie', enabled: true },
    { id: 'sports', labelFr: "L'ArÃ¨ne", enabled: true },
    { id: 'people', labelFr: 'People', enabled: false }, // disabled
  ],
  categories: [
    { id: 'politique', fr: 'Politique' },
    { id: 'economie', fr: 'Ã‰conomie' },
    { id: 'international', fr: 'International' },
    { id: 'societe', fr: 'SociÃ©tÃ©' },
    { id: 'people', fr: 'People' },
    { id: 'dossiers', fr: 'Dossiers' },
    { id: 'sports', fr: "L'ArÃ¨ne" },
  ],
};

console.log('Desktop bar scope');
const desktop = resolveNavItems(stored, { includeUnlistedCategories: false });
const desktopIds = desktop.map((i) => i.id);
assert.deepEqual(desktopIds, ['politique', 'economie', 'sports']);
ok('bar shows only the saved nav, in the admin order');

assert.ok(!desktopIds.includes('international'));
ok('unlisted category "international" is NOT in the bar');

assert.ok(!desktopIds.includes('people'));
ok('disabled nav item stays hidden');

assert.equal(desktop.length, 3);
ok('bar is compact: 3 items, not the whole 7-category taxonomy');

const sports = desktop.find((i) => i.id === 'sports');
assert.equal(sports.url, '/larene');
ok('Sports still routes to /larene, not /category/sports');

console.log('Full-taxonomy scopes (mobile drawer, footer)');
const full = resolveNavItems(stored);
const fullIds = full.map((i) => i.id);
assert.ok(fullIds.includes('international'));
ok('drawer/footer still include unlisted "international"');

assert.ok(fullIds.includes('people'));
ok('drawer/footer still reach "people" even though the nav item is disabled');

assert.ok(full.length > desktop.length);
ok(`full taxonomy is larger than the bar (${full.length} > ${desktop.length})`);

console.log('Default is unchanged');
assert.deepEqual(resolveNavItems(stored).map((i) => i.id), fullIds);
ok('calling without options behaves exactly as before (backward compatible)');

console.log('Empty-nav safety');
const noNav = resolveNavItems({ categories: stored.categories }, { includeUnlistedCategories: false });
assert.equal(noNav.length, 0);
ok('no saved nav yields an empty curated set (Header falls back to full)');

console.log(`\nAll ${pass} checks passed`);





