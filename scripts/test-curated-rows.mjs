/**
 * Verifies the article-reference workflow for the Live Ticker and the Le Monde
 * / Global Briefs boxes.
 *
 * The critical property is BACKWARD COMPATIBILITY: a row typed by hand before
 * this change (no `articleId`) must render byte-for-byte as it always did, or
 * every existing row in /site_settings would silently change on deploy.
 */
import assert from 'node:assert/strict';
import { resolveCuratedRow, findCuratedArticle } from '../src/lib/curatedRows.ts';

let pass = 0;
const ok = (n) => { console.log(`  PASS  ${n}`); pass++; };

const articles = [
  {
    id: 'a1',
    slug: 'sangomar-production',
    title: { fr: 'Le gisement Sangomar confirme son plateau', en: 'Sangomar field confirms output plateau' },
    excerpt: { fr: 'Production nominale atteinte au large de Dakar.', en: 'Nominal output reached offshore Dakar.' },
    category: 'Économie',
  },
  {
    id: 'a2',
    slug: 'sommet-cedeao',
    title: { fr: 'Négociations commerciales ouest-africaines', en: 'West African trade talks' },
    excerpt: { fr: 'Les ministres réunis à Abuja.', en: 'Ministers convened in Abuja.' },
    category: 'International',
  },
];

console.log('Legacy hand-typed rows (must be unchanged)');
const legacyTicker = { id: 'disp-1', time: '16:00 DKR', contentFr: 'Tensions levées.', contentEn: 'Tensions cleared.', level: 'standard' };
const t1 = resolveCuratedRow(legacyTicker, articles, 'fr', { kind: 'ticker' });
assert.equal(t1.text, 'Tensions levées.');
ok('ticker FR still shows the typed text');
const t2 = resolveCuratedRow(legacyTicker, articles, 'en', { kind: 'ticker' });
assert.equal(t2.text, 'Tensions cleared.');
ok('ticker EN still shows the typed text');
assert.equal(t1.linked, false);
ok('legacy row is not reported as linked');
assert.equal(t1.url, undefined);
ok('legacy row stays unlinked (no invented URL)');

const legacyBrief = { id: 'lm-1', time: '14:00 GMT', tagFr: 'Sommet CEDEAO', tagEn: 'ECOWAS Summit', titleFr: ' titre main', titleEn: 'main title', excerptFr: 'sous-titre', excerptEn: 'subtitle' };
const b1 = resolveCuratedRow(legacyBrief, articles, 'fr', { kind: 'brief' });
assert.equal(b1.text, 'titre main');
ok('brief still shows the typed title');
assert.equal(b1.tag, 'Sommet CEDEAO');
ok('brief still shows the typed tag');
assert.equal(b1.excerpt, 'sous-titre');
ok('brief still shows the typed excerpt');

console.log('Rows built from a selected article');
const linked = { id: 'disp-2', time: '17:00 DKR', articleId: 'a1', level: 'pulse' };
const l1 = resolveCuratedRow(linked, articles, 'fr', { kind: 'ticker' });
assert.equal(l1.text, 'Le gisement Sangomar confirme son plateau');
ok('ticker derives FR text from the article');
assert.equal(l1.linked, true);
ok('ticker reports the row as linked');
assert.equal(l1.url, '/article/sangomar-production');
ok('ticker links to the article by slug');

const l2 = resolveCuratedRow(linked, articles, 'en', { kind: 'ticker' });
assert.equal(l2.text, 'Sangomar field confirms output plateau');
ok('ticker derives EN text from the article');

console.log('Reference by slug also resolves');
const bySlug = { id: 'disp-3', articleId: 'sangomar-production' };
assert.equal(findCuratedArticle(bySlug, articles)?.id, 'a1');
ok('a row referencing a slug still finds its article');

console.log('Override beats the article');
const overridden = { id: 'lm-2', articleId: 'a2', titleFr: 'Chapeau plus court', titleEn: 'Shorter lede' };
const o1 = resolveCuratedRow(overridden, articles, 'fr', { kind: 'brief' });
assert.equal(o1.text, 'Chapeau plus court');
ok('custom title wins over the article title');
assert.equal(o1.hasOverride, true);
ok('override is reported so the admin can see it');
assert.equal(o1.url, '/article/sommet-cedeao');
ok('an overridden brief still links to its article');

console.log('Tag falls back to the article category');
const noTag = { id: 'lm-3', articleId: 'a2' };
assert.equal(resolveCuratedRow(noTag, articles, 'fr', { kind: 'brief' }).tag, 'International');
ok('missing tag falls back to the article category');

console.log('Broken / missing references degrade safely');
const dangling = { id: 'lm-4', articleId: 'does-not-exist' };
const d1 = resolveCuratedRow(dangling, articles, 'fr', { kind: 'brief' });
assert.equal(d1.text, '');
ok('a dangling reference yields empty text rather than throwing');
assert.equal(d1.url, undefined);
ok('a dangling reference produces no link');
const noArticles = resolveCuratedRow(linked, [], 'fr', { kind: 'ticker' });
assert.equal(noArticles.text, '');
ok('works with an empty article list');

console.log('Excerpt does not duplicate the title');
const same = { id: 'lm-5', articleId: 'a1', titleFr: 'Le gisement Sangomar confirme son plateau' };
assert.equal(resolveCuratedRow(same, articles, 'fr', { kind: 'brief' }).excerpt, 'Production nominale atteinte au large de Dakar.');
ok('brief keeps a distinct excerpt');

console.log(`\nAll ${pass} checks passed`);
