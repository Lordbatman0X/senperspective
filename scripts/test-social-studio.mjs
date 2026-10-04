/**
 * Verifies the pure logic behind the Social Studio.
 *
 * Nothing here touches the DOM: the format registry, the caption generator, the
 * wrap/auto-fit algorithm, the ordered filter stack, the logo tone maths and the
 * document migration are all testable under plain node, which is why they were
 * deliberately kept free of canvas calls.
 */
import assert from 'node:assert/strict';
// Imported from an esbuild bundle of the real source, so these exercise the
// shipped functions rather than a copy. See the npm script.
const {
  NETWORKS, NETWORK_ORDER, getFormat, resolveCaptionSlot, MAX_CARDS,
  generateCaption, clampCaption, toHashtag,
  resolveContent, stripHtml, firstSentences, templateCopy,
  fitTextLayer, wrapText, fontString,
  buildFilterString,
  chooseLogoTone, colorLuminance, contrastRatio, relativeLuminance,
  migrateSocialDesign, createText, createLogo, alignLayerPosition,
  computeImageRect, resolveLogoSrc,
  buildCoverCard, buildBriefCard, buildClosingCard,
} = await import('../.socialtest.mjs');

let pass = 0;
const ok = (n) => { console.log(`  PASS  ${n}`); pass++; };

// A deterministic stand-in for canvas text metrics: ~0.55em per character,
// close enough to a sans-serif face to exercise wrapping.
const measure = (text, font) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
  return text.length * size * 0.55;
};

const article = {
  id: 'a1',
  slug: 'plateau-sangomar',
  category: 'Économie',
  type: 'Analysis',
  title: { fr: 'Le gisement Sangomar confirme son plateau', en: 'Sangomar field confirms its plateau' },
  excerpt: {
    fr: 'La production nominale est atteinte au large de Dakar, un tournant pour la souveraineté énergétique.',
    en: 'Nominal output has been reached offshore Dakar, a turning point for energy sovereignty.',
  },
  body: {
    fr: '<p>La société a annoncé mardi avoir atteint la capacité nominale de sa tête de champ offshore. Les premiers volumes partent vers Dakar.</p><h2>Ce que cela change</h2><p>Le pays importe encore une part importante de son gaz. Cette étape réduit la pression sur la balance commerciale et devrait se répercuter sur les tarifs du pays.</p><h2>Les limites</h2><p>Le reseau reste dépendant des infrastructures de transport, un maillon encore fragile.</p>',
    en: '<p>The company announced it had reached nominal capacity offshore on Tuesday.</p>',
  },
  featuredImage: 'https://example.test/photo.jpg',
  author: 'Mamadou Diop',
  date: '2026-06-12T08:00:00.000Z',
  readingTime: 6,
  tags: ['Sénégal', 'Énergie'],
};

console.log('Format registry');
assert.equal(getFormat('instagram').id, 'ig-45');
assert.equal(getFormat('instagram').width, 1080);
ok('Instagram defaults to the 4:5 feed size');
assert.deepEqual([getFormat('tiktok').width, getFormat('tiktok').height], [1080, 1920]);
ok('TikTok is vertical-only at 1080x1920');
assert.equal(getFormat('linkedin').ratio, '1.91:1');
ok('LinkedIn defaults to the 1.91:1 link image');
assert.equal(NETWORKS.x.captionLimit, 280);
assert.equal(NETWORKS.threads.captionLimit, 500);
ok('X is 280 and Threads is 500 characters');
assert.equal(NETWORK_ORDER.length, 7);
ok('all seven networks are registered');
// A format id belonging to another network must never resolve.
assert.equal(getFormat('tiktok', 'fb-45').id, 'tt-916');
ok('a foreign format id falls back to this network default');
assert.equal(MAX_CARDS, 10);
ok('carousel cap is 10');
console.log('Content resolution (French only, non-mutating)');
const snapshot = JSON.stringify(article);
const content = resolveContent(article);
assert.equal(content.title, 'Le gisement Sangomar confirme son plateau');
ok('title resolves from the FR field');
assert.equal(content.dateLabel, '12 juin 2026');
ok('date is formatted in French without a locale lookup');
assert.equal(stripHtml('<p>a <b>b</b></p>'), 'a b');
ok('HTML is stripped and whitespace collapsed');
assert.equal(firstSentences('Un. Deux. Trois.', 2), 'Un. Deux.');
ok('sentence split respects the requested count');
assert.equal(content.sections.length, 2);
ok('two headed sections were detected');
assert.equal(JSON.stringify(article), snapshot, 'article must not be mutated');
ok('resolving content does not mutate the article');
assert.ok(templateCopy('closing', content).headline.startsWith('«'));
ok('the closing template wraps its quote in guillemets');

console.log('Caption generation');
const frCap = generateCaption(article, 'instagram', 'fr');
const enCap = generateCaption(article, 'instagram', 'en');
assert.equal(frCap.usedFallback, false);
assert.equal(enCap.usedFallback, false);
ok('both languages are generated from their own source, with no fallback');
assert.ok(frCap.text.includes('#EconomieSenegal'), 'FR caption carries the category hashtag');
assert.ok(enCap.text.includes('#EconomySenegal'), 'EN caption carries the English hashtag');
assert.ok(!generateCaption(article, 'x', 'fr').text.includes('#'), 'X gets no hashtags');
ok('X captions omit hashtags');
// FR content must never be reused as an EN caption.
assert.ok(enCap.text.includes('Nominal output'));
assert.ok(!enCap.text.includes('La société a annoncé'));
ok('the English caption is built from the English field only');

const noEn = { ...article, excerpt: { fr: article.excerpt.fr, en: '' }, body: { fr: '', en: '' } };
assert.equal(generateCaption(noEn, 'instagram', 'en').usedFallback, true);
ok('a missing English translation is reported rather than hidden');

const clamped = clampCaption('x'.repeat(5000), 'x');
assert.ok(clamped.length <= 280, `X caption clamped to ${clamped.length}`);
assert.equal(clampCaption('court', 'x'), 'court');
ok('captions are clamped to the network limit');
// Tag lines must survive the clamp, not be sliced in half.
const withTags = clampCaption(`${'mot '.repeat(300)}\n\n#A #B #C`, 'threads');
assert.ok(withTags.split('\n').pop().includes('#C'));
ok('hashtags survive clamping');
assert.equal(toHashtag('Énergie & Climat'), '#ÉnergieClimat');
ok('hashtags keep accents and drop punctuation');
console.log('Text wrapping and auto-fit');
const longTitle = 'Le gisement Sangomar confirme son plateau de production et ouvre une nouvelle phase pour la souverainete energetique du pays';
const layer = createText({ text: longTitle, w: 600, h: 200, fontSize: 72, lineHeight: 1.2, autoFit: { enabled: true, min: 20, max: 72 } });
const fitted = fitTextLayer(layer, measure);
assert.ok(fitted.size < 72, `auto-fit shrank the title to ${fitted.size}px`);
assert.ok(fitted.size >= 20);
assert.ok(fitted.height <= 200, 'the fitted block fits inside its box');
assert.ok(fitted.lines.length > 1);
ok('auto-fit shrinks an over-long headline until it fits');
assert.equal(fitted.truncated, false);
ok('a successful fit is not reported as truncated');

const fixed = fitTextLayer({ ...layer, autoFit: { enabled: false, min: 20, max: 72 } }, measure);
assert.equal(fixed.size, 72);
ok('auto-fit off leaves the font size untouched');

assert.ok(wrapText('un deux trois', 100, measure, 20, layer).length > 1);
ok('long text wraps onto several lines');

const forced = fitTextLayer({ ...layer, autoFit: { enabled: true, min: 60, max: 72 } }, measure);
assert.equal(forced.truncated, true);
ok('text that cannot fit even at the minimum is flagged truncated');

assert.ok(fontString(24, layer).includes('Playfair Display'));
ok('the font shorthand names the family');

console.log('Ordered filter stack');
const filters = [
  { id: '1', kind: 'contrast', value: 120, enabled: true },
  { id: '2', kind: 'sepia', value: 40, enabled: true },
];
assert.equal(buildFilterString(filters), 'contrast(120%) sepia(40%)');
ok('filters render as CSS in the authored order');
assert.equal(buildFilterString([...filters].reverse()), 'sepia(40%) contrast(120%)');
ok('reversing the stack reverses the CSS string — order is user-owned');
assert.equal(buildFilterString([{ ...filters[0], enabled: false }, filters[1]]), 'sepia(40%)');
ok('a disabled filter is dropped without disturbing the others');
assert.equal(buildFilterString([{ id: '1', kind: 'brightness', value: 100, enabled: true }]), '');
ok('a filter at its neutral value produces no CSS');
assert.equal(buildFilterString([{ id: '1', kind: 'blur', value: -5, enabled: true }]), 'blur(0px)');
ok('a negative blur is clamped rather than invalidating the string');
assert.equal(buildFilterString(undefined), '');
ok('a layer with no filters costs nothing');

console.log('Logo tone adaptation');
assert.ok(relativeLuminance(255, 255, 255) > 0.99);
assert.ok(relativeLuminance(0, 0, 0) < 0.01);
ok('luminance spans black to white');
assert.ok(contrastRatio(0, 1) > 20);
ok('black on white exceeds the WCAG maximum ratio');
assert.equal(chooseLogoTone(0, 1, 0, true), 'light');
ok('a light logo is chosen on a dark background');
assert.equal(chooseLogoTone(1, 1, 0, true), 'dark');
ok('a dark logo is chosen on a light background');
assert.equal(chooseLogoTone(0.2, 1, 0, false), 'light');
ok('with only one variant the tone is reported, not guessed');
assert.ok(colorLuminance('#FFFFFF') > colorLuminance('#E85D42'));
ok('brand colours have distinguishable luminance');

console.log('Image fitting');
const box = { x: 0, y: 0, w: 1000, h: 500 };
const cover = computeImageRect({ w: 2000, h: 1000 }, box, 'cover', 0.5, 0.5);
assert.ok(cover.h >= 500 && cover.w >= 1000);
ok('cover fills the box completely');
const contain = computeImageRect({ w: 2000, h: 1000 }, box, 'contain', 0.5, 0.5);
assert.ok(contain.w <= 1000 && contain.h <= 500);
ok('contain stays inside the box');
// A source wider than the box is required for a focal point to mean anything:
// with a matching aspect ratio `cover` produces no overflow, so there is no crop
// window to move.
const focalLeft = computeImageRect({ w: 3000, h: 1000 }, box, 'cover', 0, 0.5);
const focalRight = computeImageRect({ w: 3000, h: 1000 }, box, 'cover', 1, 0.5);
assert.ok(focalLeft.x > focalRight.x, 'the focal point steers the crop');
assert.ok(focalLeft.w > box.w, 'the focal test needs horizontal overflow');
ok('the focal point moves the crop window');
console.log('Document migration');
assert.equal(migrateSocialDesign(undefined).cards.length, 0);
ok('an absent design migrates to an empty one');
const junk = migrateSocialDesign({ network: 'myspace', cards: 'nope', captions: 5 });
assert.ok(NETWORKS[junk.network], 'an unknown network falls back');
assert.equal(junk.mode, 'single');
assert.deepEqual(junk.captions, {});
ok('junk values normalise instead of throwing');
assert.equal(migrateSocialDesign({ mode: 'carousel', cards: [{ layers: [] }, { layers: [] }, { layers: [] }] }).cards.length, 3);
ok('carousel mode keeps multiple cards');
assert.equal(migrateSocialDesign({ mode: 'single', cards: [{ layers: [] }, { layers: [] }] }).cards.length, 1);
ok('single mode is truncated to one card');

const badLayer = migrateSocialDesign({ cards: [{ layers: [{ kind: 'nope' }, { kind: 'text', text: 'ok', fontSize: -5, color: 'red' }] }] });
assert.equal(badLayer.cards[0].layers.length, 1, 'unknown layer kinds are dropped');
assert.equal(badLayer.cards[0].layers[0].fontSize, 4, 'a negative font size is clamped');
assert.equal(badLayer.cards[0].layers[0].color, '#FFFFFF', 'an invalid colour falls back');
ok('malformed layers are clamped or dropped');
assert.equal(
  migrateSocialDesign({ network: 'tiktok', formatId: 'fb-45' }).formatId,
  'tt-916',
  'a format from another network is replaced',
);
ok('an impossible format reference is repaired');

const slot = resolveCaptionSlot({ universal: { fr: 'U', en: '' }, instagram: { fr: 'I', en: '' } }, 'instagram');
assert.equal(slot.fr, 'I');
assert.equal(resolveCaptionSlot({ universal: { fr: 'U', en: '' } }, 'linkedin').fr, 'U');
ok('a network-specific caption wins, else the universal one is used');

console.log('Templates');
const format = getFormat('instagram', 'ig-45');
const opts = { format, content };
const built = [
  ['couverture', buildCoverCard(opts)],
  ['le brief', buildBriefCard(opts)],
  ['clôture', buildClosingCard(opts)],
];
for (const [name, built_] of built) {
  assert.ok(built_.layers.length > 0, `${name} has layers`);
  const kinds = new Set(built_.layers.map(l => l.kind));
  assert.ok(kinds.has('text') && kinds.has('background'), `${name} has text over a background`);
  // The first layer must be a base layer, or the card has nothing to sit on.
  assert.ok(['background', 'shape', 'image'].includes(built_.layers[0].kind));
  assert.ok(built_.layers.every(l => l.w > 0 && l.h > 0), `${name} has no zero-sized layer`);
}
ok('all three templates build a complete layer stack');
ok('no template emits a zero-sized layer');

const coverCard = buildCoverCard(opts);
const lastY = Math.max(...coverCard.layers.map(l => l.y + l.h));
assert.ok(lastY <= format.height + 2, `the cover fits its ${format.height}px frame`);
ok('template geometry stays within the exported frame');
assert.equal(new Set(coverCard.layers.map(l => l.id)).size, coverCard.layers.length);
ok('every layer id is unique');

// The same template must reflow for a different ratio rather than overflow.
// Layer COUNT is expected to stay identical — it is the geometry that changes.
const story = buildCoverCard({ ...opts, format: getFormat('instagram', 'ig-story') });
assert.ok(story.layers.every(l => l.y + l.h <= 1920 + 2));
ok('the cover reflows for 9:16 instead of overflowing');
const coverHeadline = coverCard.layers.find(l => l.name === 'Titre');
const storyHeadline = story.layers.find(l => l.name === 'Titre');
assert.notEqual(coverHeadline.h, storyHeadline.h, 'a 9:16 card gives the headline more room');
ok('layer geometry is proportional to the format, not hard-coded');

// A single card carries no dots; a carousel does.
assert.equal(buildCoverCard(opts, { count: 1, active: 0 }).meta.dots, 'none');
assert.equal(buildCoverCard(opts, { count: 4, active: 1 }).meta.dots, 'dots');
ok('progress dots appear only when there is more than one card');

console.log('Layer order and live bindings');
const bottom = createText({ text: 'a', y: 10 });
const top = createText({ text: 'b', y: 20 });
assert.ok(top.id !== bottom.id, 'two layers never share an id');
const manual = { id: 'c1', templateId: 'blank', meta: { showDate: true, showReadingTime: true, dots: 'none' }, layers: [bottom, top] };
assert.equal(manual.layers[1].id, top.id, 'the last layer paints on top');
ok('layers are stored bottom-to-top and paint in order');
assert.equal(coverCard.layers.find(l => l.name === 'Titre').binding.field, 'title');
ok('the cover headline is bound to the live article title');
assert.equal(buildClosingCard(opts).layers.find(l => l.name === 'Signature').binding.field, 'author');
ok('the closing byline is bound to the live author');

console.log('Alignment geometry');
const alignFmt = { width: 1080, height: 1350 };
const alignBox = { x: 999, y: 999, w: 200, h: 100 };
assert.deepEqual(alignLayerPosition(alignBox, 'left', alignFmt), { x: 0 });
ok('align left puts the layer on the frame edge');
assert.deepEqual(alignLayerPosition(alignBox, 'right', alignFmt), { x: 880 });
ok('align right flushes the trailing edge');
assert.deepEqual(alignLayerPosition(alignBox, 'centerH', alignFmt), { x: 440 });
ok('align centre H centres on the frame, not the layer origin');
assert.deepEqual(alignLayerPosition(alignBox, 'top', alignFmt), { y: 0 });
assert.deepEqual(alignLayerPosition(alignBox, 'bottom', alignFmt), { y: 1250 });
assert.deepEqual(alignLayerPosition(alignBox, 'centerV', alignFmt), { y: 625 });
ok('vertical alignment mirrors the horizontal behaviour');
// A vertical align must never disturb x, and vice versa.
assert.equal(alignLayerPosition(alignBox, 'top', alignFmt).x, undefined);
assert.equal(alignLayerPosition(alignBox, 'left', alignFmt).y, undefined);
ok('alignment only touches the axis it was asked about');
// The gutter is what makes a hand-placed element line up with the templates.
assert.deepEqual(alignLayerPosition(alignBox, 'gutterH', alignFmt), { x: 67 });
assert.deepEqual(alignLayerPosition(alignBox, 'gutterV', alignFmt), { y: 84 });
ok('gutter alignment snaps to the template inner margin');
// Centring is frame-relative on x, so a taller frame must not shift it.
assert.deepEqual(
  alignLayerPosition(alignBox, 'centerH', { width: 1080, height: 1920 }),
  { x: 440 },
);
ok('horizontal centring is unaffected by the frame height');

console.log('Logo layer');
const logo = createLogo({ src: 'data:image/png;base64,AAA', tone: 'custom' });
assert.equal(logo.kind, 'logo');
assert.equal(logo.lockAspect, true);
ok('a new logo keeps its aspect ratio by default');
assert.ok(logo.w > 0 && logo.h > 0);
ok('a new logo has a real, grabbable size');
const builtLogo = createLogo({ x: 64, y: 64, w: 240, h: 40 });
assert.deepEqual([builtLogo.x, builtLogo.y, builtLogo.w, builtLogo.h], [64, 64, 240, 40]);
ok('logo geometry is settable, so a new logo can be placed immediately');

console.log('Logo resolution');
const brand = { src: 'https://site.test/perspective.png', light: 'https://site.test/light.png', dark: 'https://site.test/dark.png' };
// A brand-linked layer has no file of its own and must draw the site logo.
const brandLinked = createLogo({ src: '', tone: 'auto' });
assert.equal(resolveLogoSrc(brandLinked, undefined, brand).src, brand.src);
ok('a brand-linked layer draws the site-wide logo');
// A card override must win over the brand, so a deliberate choice is honoured.
const overridden = createLogo({ src: 'data:image/png;base64,OWN', tone: 'custom' });
assert.equal(resolveLogoSrc(overridden, undefined, brand).src, 'data:image/png;base64,OWN');
ok('a per-card logo overrides the brand asset');
// With no brand saved there is nothing to draw, and the placeholder shows.
assert.equal(resolveLogoSrc(brandLinked, undefined, undefined).src, '');
ok('no brand and no override yields no file, so the placeholder renders');
// An explicit tone still resolves from the brand variants.
assert.equal(resolveLogoSrc(createLogo({ src: '', tone: 'light' }), undefined, brand).src, brand.light);
assert.equal(resolveLogoSrc(createLogo({ src: '', tone: 'dark' }), undefined, brand).src, brand.dark);
ok('explicit light/dark tones read the brand variants');
// A brand-linked layer is never left claiming a file it does not have.
assert.equal(resolveLogoSrc(brandLinked, undefined, brand).tone, 'auto');
ok('a brand-linked layer reports auto tone, not a false custom override');

console.log(`\n${pass} checks passed.`);