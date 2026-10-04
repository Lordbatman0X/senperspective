/**
 * Verifies the carousel draft builder.
 *
 * Run via `npm run test:carousel`, which bundles this file with esbuild first
 * (the same approach as test:header-nav). The draft builder pulls in the shared
 * `utils` module, whose own imports are extensionless, so Node's ESM resolver
 * cannot load it directly.
 *
 * The properties that matter:
 *  1. BACKWARD-SAFE NORMALISATION - a partial or malformed draft loaded from
 *     Firestore must still render, never show "undefined" on a published card.
 *  2. NO INVENTED QUOTE - the closing card's quote is editorial, so the builder
 *     must never fabricate one from the article body.
 *  3. THE TEMPLATE IS FIXED - at most three body paragraphs, and markdown
 *     headings/lists are dropped rather than rendered as cards.
 *  4. HTML AND BILINGUAL FALLBACKS - copy is stripped of markup, and an
 *     English-only article still produces a complete draft.
 */
import assert from 'node:assert/strict';
import {
  buildDraftFromArticle,
  emptyDraft,
  extractParagraphs,
  firstSentence,
  formatCardDate,
  formatReadTime,
  normalizeDraft,
} from '../src/lib/carousel/draft';
import { MAX_CAROUSEL_PARAGRAPHS } from '../src/lib/carousel/types';

let pass = 0;
const ok = (n) => { console.log(`  PASS  ${n}`); pass++; };

const article = {
  id: 'a1',
  slug: 'pape-cheikh-diallo',
  category: 'Politique',
  type: 'News',
  title: { fr: 'Pape Cheikh Diallo : contrairement aux rumeurs, il reste detenu', en: 'Pape Cheikh Diallo remains detained' },
  excerpt: { fr: 'La demande de liberation provisoire a ete rejetee par la Chambre d\'accusation.', en: 'The bail request was rejected.' },
  body: {
    fr: [
      'La Chambre d\'accusation de la Cour d\'appel de Dakar a examine les recours deposes par la defense et a confirme le maintien en detention des trois mis en cause.',
      '',
      'Selon les avocats, la decision sera portee devant une instance superieure dans les prochains jours.',
      '',
      '## Contexte',
      'Ce paragraphe suit un titre Markdown et ne doit pas apparaitre sur la carte.',
    ].join('\n'),
    en: '',
  },
  featuredImage: 'https://example.com/cover.jpg',
  date: '2026-09-20',
  readingTime: 3,
  tags: [],
  isPublished: true,
  isFeatured: false,
};

console.log('\n- date & reading time -');
assert.equal(formatCardDate('2026-09-20'), '20 Septembre 2026');
assert.equal(formatCardDate(new Date(2026, 0, 5)), '5 Janvier 2026');
assert.equal(formatCardDate(undefined), '');
assert.equal(formatCardDate('not-a-date'), '');
ok('date formats with a capitalised French month');

assert.equal(formatReadTime(article), '3 min');
assert.equal(formatReadTime({ body: { fr: 'a'.repeat(400) } }), '1 min');
assert.equal(formatReadTime({ body: { fr: '' } }), '1 min');
ok('reading time uses the curated value, else counts words');

console.log('\n- first sentence -');
assert.equal(firstSentence('Premier fait. Second fait.'), 'Premier fait.');
assert.equal(firstSentence('Pas de point final ici'), 'Pas de point final ici');
assert.equal(firstSentence(''), '');
assert.equal(firstSentence('<p>Bonjour.</p><p>Suite.</p>'), 'Bonjour.');
ok('first sentence strips markup and stops at the first full stop');
console.log('\n- paragraphs -');
const paras = extractParagraphs(article.body.fr);
assert.ok(paras.length <= MAX_CAROUSEL_PARAGRAPHS, 'never exceeds the template capacity');
assert.ok(!paras.some(p => p.startsWith('##')), 'markdown headings are dropped');
assert.ok(
  !paras.some(p => p.includes('ne doit pas apparaitre')),
  'text after a heading is not silently merged into a card',
);
ok('at most 3 paragraphs, headings dropped');

console.log('\n- draft from article -');
const draft = buildDraftFromArticle(article);
assert.equal(draft.category, 'Politique');
assert.equal(draft.title, 'Pape Cheikh Diallo : contrairement aux rumeurs, il reste detenu');
assert.equal(draft.date, '20 Septembre 2026');
assert.equal(draft.readingTime, '3 min');
assert.equal(draft.coverImage, 'https://example.com/cover.jpg');
assert.equal(draft.articleId, 'a1');
assert.ok(draft.paragraphs.length > 0, 'has at least one paragraph');
assert.ok(!draft.title.includes('<'), 'no markup leaks into the title');
ok('draft carries the article content, date, read time and cover photo');

// The closing quote is editorial: the builder must not invent one.
assert.ok(
  draft.quote.length > 0 && !draft.quote.includes('Dakar'),
  'quote stays a placeholder rather than being invented from the body',
);
assert.equal(draft.quoteAttribution, 'La r' + String.fromCharCode(233) + 'daction');
ok('quote is a placeholder, never fabricated from the article body');

// Changing the article must not wipe the editor's brand assets: the logo and
// the closing photo belong to the publication, not to the article. The cover
// photo DOES change, because it comes from the article.
const rebranded = buildDraftFromArticle(
  { ...article, id: 'a2', featuredImage: 'https://example.com/other.jpg' },
  undefined,
  { logoUrl: 'https://example.com/logo.png', closingImage: 'https://example.com/closing.jpg' },
);
assert.equal(rebranded.logoUrl, 'https://example.com/logo.png');
assert.equal(rebranded.closingImage, 'https://example.com/closing.jpg');
assert.equal(rebranded.coverImage, 'https://example.com/other.jpg');
ok('switching articles keeps the logo and closing photo, refreshes the cover photo');

console.log('\n- thin & bilingual articles -');
const thin = buildDraftFromArticle({ ...article, excerpt: { fr: '', en: '' }, body: { fr: '', en: '' } });
assert.ok(thin.title.length > 0 && thin.lede.length > 0 && thin.paragraphs.length > 0);
ok('an article with no excerpt/body still yields a complete draft');

const englishOnly = buildDraftFromArticle({
  ...article,
  body: { fr: '', en: 'An English only body that is long enough to be used.' },
});
assert.ok(englishOnly.paragraphs[0].startsWith('An English only body'));
ok('falls back to the English body when French is empty');

console.log('\n- normalisation of stored drafts -');
assert.equal(normalizeDraft(null).title, emptyDraft().title);
assert.equal(normalizeDraft(undefined).category, emptyDraft().category);

const partial = normalizeDraft({ title: '   ', category: '', paragraphs: [] });
assert.equal(partial.title, emptyDraft().title, 'blank title falls back');
assert.equal(partial.category, emptyDraft().category, 'blank category falls back');
assert.ok(partial.paragraphs.length > 0, 'empty paragraphs fall back');
ok('blank fields fall back to placeholders instead of rendering empty');

const tooMany = normalizeDraft({ paragraphs: ['un', 'deux', 'trois', 'quatre'] });
assert.equal(tooMany.paragraphs.length, MAX_CAROUSEL_PARAGRAPHS);
ok('stored drafts are capped at the template paragraph count');

const badSocials = normalizeDraft({ socials: [null, { label: 5 }] });
assert.ok(badSocials.socials.length > 0, 'malformed socials fall back to the defaults');
ok('malformed social rows fall back to the defaults');

const full = normalizeDraft({
  title: 'Titre', category: 'Economie', quote: 'Citation',
  paragraphs: ['Un seul paragraphe'], socials: [{ label: 'x', url: 'https://x.com' }],
});
assert.equal(full.title, 'Titre');
assert.equal(full.paragraphs.length, 1, 'a valid stored draft is not overwritten by defaults');
assert.equal(full.socials.length, 1);
ok('a valid stored draft is preserved as-is');

console.log(`\n${pass} passed\n`);