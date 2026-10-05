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
  DEFAULT_ACCENT,
  emptyDraft,
  extractParagraphs,
  firstSentence,
  formatCardDate,
  formatReadTime,
  normalizeDraft,
} from '../src/lib/carousel/draft';
import { CAROUSEL_SIZE, MAX_CAROUSEL_PARAGRAPHS } from '../src/lib/carousel/types';
import { collectDraftImages, logoImageKey } from '../src/lib/carousel/images';
import { G } from '../src/lib/carousel/layout';

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

// Changing the article must not wipe the editor's brand assets: the logos and
// the closing photo belong to the publication, not to the article. The cover
// photo DOES change, because it comes from the article.
const rebranded = buildDraftFromArticle(
  { ...article, id: 'a2', featuredImage: 'https://example.com/other.jpg' },
  undefined,
  {
    logoUrls: {
      cover: 'https://example.com/logo-cover.png',
      closing: 'https://example.com/logo-closing.png',
    },
    closingImage: 'https://example.com/closing.jpg',
  },
);
assert.equal(rebranded.logoUrls?.cover, 'https://example.com/logo-cover.png');
assert.equal(rebranded.logoUrls?.closing, 'https://example.com/logo-closing.png');
assert.equal(rebranded.logoUrls?.body, undefined, 'a card with no upload of its own stays empty');
assert.equal(rebranded.closingImage, 'https://example.com/closing.jpg');
assert.equal(rebranded.coverImage, 'https://example.com/other.jpg');
ok('switching articles keeps every per-card logo and the closing photo, refreshes the cover photo');

console.log('\n- per-card logos -');
// Drafts written by the previous build have one global `logoUrl`. It must reach
// all three cards rather than being dropped, or the editor's logo silently
// disappears from every published card the first time the tab is opened.
const legacy = normalizeDraft({
  articleId: 'a1',
  title: 'Titre',
  logoUrl: 'https://example.com/legacy-logo.png',
});
assert.equal(legacy.logoUrls?.cover, 'https://example.com/legacy-logo.png');
assert.equal(legacy.logoUrls?.body, 'https://example.com/legacy-logo.png');
assert.equal(legacy.logoUrls?.closing, 'https://example.com/legacy-logo.png');
ok('a legacy global logo migrates onto all three cards');

// ...and that migration must not overwrite a per-card choice made since.
const mixed = normalizeDraft({
  articleId: 'a1',
  title: 'Titre',
  logoUrl: 'https://example.com/legacy-logo.png',
  logoUrls: { body: 'https://example.com/new-body-logo.png' },
});
assert.equal(mixed.logoUrls?.body, 'https://example.com/new-body-logo.png', 'newer per-card logo wins');
assert.equal(mixed.logoUrls?.cover, 'https://example.com/legacy-logo.png');
ok('legacy migration never overwrites an existing per-card logo');

const cleared = normalizeDraft({
  articleId: 'a1',
  title: 'Titre',
  logoUrls: { cover: '   ' },
});
assert.equal(cleared.logoUrls?.cover, undefined, 'a blank logo falls back to the drawn wordmark');
ok('a blank logo URL is normalised away');

console.log('\n- logo image keys -');
// The renderer, the preview and the exporter must agree on the key a card's
// logo is stored under, or a logo shows in one and not the other.
assert.equal(logoImageKey('cover'), 'logo:cover');
assert.equal(logoImageKey('body'), 'logo:body');
assert.equal(logoImageKey('closing'), 'logo:closing');
assert.notEqual(logoImageKey('cover'), logoImageKey('body'), 'each card gets its own key');
ok('per-card logo image keys are distinct and stable');

const keyed = collectDraftImages({
  ...normalizeDraft({ articleId: 'a1', title: 'T' }),
  logoUrls: { cover: 'https://example.com/c.png', body: 'https://example.com/b.png' },
});
const keys = keyed.map(([key]) => key);
assert.ok(keys.includes('logo:cover') && keys.includes('logo:body'));
assert.ok(!keys.includes('logo:closing'), 'a card with no logo is not requested');
ok('image collection requests exactly the logos the draft has');

console.log('\n- geometry -');
// Card 2's paragraphs must start on the body card's own baseline. They used to
// be clamped to the cover's text-block top, which pushed them into the footer.
assert.ok(G.bodyTextTop < G.coverBodyTop, 'body text starts well above the cover fold');
assert.ok(G.bodyTextTop > G.bodyHeadingTop, 'body text starts below the body heading');
assert.ok(G.photoHeight < CAROUSEL_SIZE, 'the cover photo leaves room for the text block');
assert.ok(G.coverBodyTop > G.photoHeight, 'the cover text block sits below the photo');
ok('cover and body geometry are decoupled and both fit the card');

console.log('\n- cover brief is bottom-anchored -');
// The reference puts the brief in the bottom band of the cover. It used to flow
// off the headline instead, so a short headline left the brief stranded high up
// with dead space beneath it.
assert.ok(G.coverBottomPad > 0 && G.coverBottomPad < CAROUSEL_SIZE / 3, 'the brief sits near the bottom');
// ...and it must not be pulled up into the headline by that anchoring. When
// the headline IS two lines, the brief slides down below its anchor (the
// reference does the same) — so the property that matters is that the pair
// still clears the footer hairline instead of overlapping or sinking under it.
assert.ok(
  G.coverBodyTop + 47 + G.coverTitleLead * 2 + 26 + G.ledeLead * 2 <= G.footerRuleY,
  'a two-line headline and a two-line brief still fit above the footer hairline',
);
ok('the brief keeps its bottom position without colliding with the headline');

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

console.log('\n- logo placement -');
const withLogo = normalizeDraft({ logos: { cover: { cx: 300, top: 90, size: 80 } } });
assert.equal(withLogo.logos?.cover.cx, 300);
assert.equal(withLogo.logos?.cover.size, 80);
ok('a stored logo position is preserved');

// A drag writes raw pointer math, so hostile numbers must not reach the canvas:
// size 0 would render an invisible logo the editor thinks they placed.
const clamped = normalizeDraft({
  logos: {
    cover: { cx: 99999, top: -400, size: 0 },
    body: { cx: Number.NaN, top: 10, size: 10000 },
  },
});
assert.equal(clamped.logos?.cover.cx, CAROUSEL_SIZE);
assert.equal(clamped.logos?.cover.top, 0);
assert.equal(clamped.logos?.cover.size, 32);
assert.equal(clamped.logos?.body.cx, CAROUSEL_SIZE / 2);
assert.equal(clamped.logos?.body.size, 220);
ok('out-of-range and NaN logo values are clamped into the card');

assert.equal(normalizeDraft({}).logos, undefined);
ok('a draft with no dragged logo keeps the approved default position');

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

console.log('\n- accent migration -');
// The ember is the reference's rule/wordmark/dot colour. The old brick value
// was hard-coded (there is no colour picker), so a draft saved with it must
// migrate on load instead of keeping every card cold — while a genuinely
// custom colour from a hand-edited doc must survive untouched.
assert.equal(DEFAULT_ACCENT, '#E8490F', 'the default accent is the reference ember');
assert.equal(normalizeDraft({ accentColor: '#B8471F' }).accentColor, DEFAULT_ACCENT);
assert.equal(normalizeDraft({ accentColor: '#b8471f' }).accentColor, DEFAULT_ACCENT, 'case-insensitive');
assert.equal(normalizeDraft({ accentColor: '#123456' }).accentColor, '#123456', 'custom accents are preserved');
assert.equal(normalizeDraft({}).accentColor, DEFAULT_ACCENT, 'a missing accent falls back to the default');
ok('legacy brick accent migrates to the ember, custom colours survive');

console.log(`\n${pass} passed\n`);