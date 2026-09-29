/**
 * Standalone smoke test for the build-time thumbnail pipeline.
 * Run: node scripts/test-thumbnail.mjs
 *
 * It builds a few synthetic images in-memory (no fixtures on disk), decodes
 * them the same way an uploaded article picture is stored, and asserts that
 * `makeThumb` produces a usable, small JPEG -- and that junk input is rejected
 * rather than silently producing a broken card image.
 */
import assert from 'node:assert/strict';
import { makeThumb, resolveCardImage, decodeDataUrl, isInlineImage } from './thumbnail.mjs';

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('sharp is not installed; run `npm install` first.');
  process.exit(1);
}

/** Build a noisy JPEG of the given size and return it as a data URL. */
async function makeSample(w, h) {
  // Deterministic RGB noise compresses poorly, which is the worst case for size.
  const channels = 3;
  const buf = Buffer.alloc(w * h * channels);
  let seed = 12345;
  for (let i = 0; i < buf.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    buf[i] = (seed >> 16) & 0xff;
  }
  const png = await sharp(buf, { raw: { width: w, height: h, channels } })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

const results = [];
const check = (name, fn) => results.push({ name, fn });

check('decodes a base64 data URL', () => {
  assert.ok(decodeDataUrl('data:image/png;base64,aGVsbG8=') instanceof Buffer);
});

check('rejects non-data URLs and junk', () => {
  assert.equal(decodeDataUrl('https://example.com/a.png'), null);
  assert.equal(decodeDataUrl('data:image/png;base64,####'), null);
  assert.equal(decodeDataUrl(null), null);
  assert.equal(isInlineImage('data:image/png;base64,x'), true);
  assert.equal(isInlineImage('https://example.com/a.png'), false);
});

check('shrinks a 1600x1000 photo to a card thumbnail', async () => {
  const src = await makeSample(1600, 1000);
  const out = await makeThumb(src);
  assert.ok(out, 'expected a thumbnail');
  assert.ok(out.startsWith('data:image/jpeg;base64,'), 'expected a JPEG data URL');
  const meta = await sharp(Buffer.from(out.split(',')[1], 'base64')).metadata();
  assert.equal(meta.width, 320, 'width should be capped at THUMB_MAX_W');
  assert.equal(meta.height, 200, 'aspect ratio should be preserved');
  const ratio = out.length / src.length;
  console.log(`    ${(src.length / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(1)}KB (${(ratio * 100).toFixed(1)}%)`);
  assert.ok(ratio < 0.25, `expected a big reduction, got ${(ratio * 100).toFixed(1)}%`);
});

check('never enlarges a small image', async () => {
  const out = await makeThumb(await makeSample(100, 80));
  const meta = await sharp(Buffer.from(out.split(',')[1], 'base64')).metadata();
  assert.equal(meta.width, 100);
});

check('flattens transparency onto white, not black', async () => {
  const transparent = await sharp({
    create: { width: 400, height: 300, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();
  const out = await makeThumb(`data:image/png;base64,${transparent.toString('base64')}`);
  const { data } = await sharp(Buffer.from(out.split(',')[1], 'base64'))
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 200, `expected a white background, got r=${data[0]}`);
});

check('returns null for corrupt base64 instead of throwing', async () => {
  assert.equal(await makeThumb('data:image/png;base64,bm90YXBuZw=='), null);
  assert.equal(await makeThumb(''), null);
  assert.equal(await makeThumb(undefined), null);
});

check('passes remote URLs through untouched', async () => {
  const r = await resolveCardImage('  https://cdn.example.com/a.jpg  ');
  assert.deepEqual(r, { url: 'https://cdn.example.com/a.jpg', thumbnailed: false });
  assert.equal(await resolveCardImage(null), null);
  assert.equal(await resolveCardImage('   '), null);
});

check('thumbnails inline data URLs', async () => {
  const r = await resolveCardImage(await makeSample(1200, 800));
  assert.ok(r && r.thumbnailed);
  assert.ok(r.url.startsWith('data:image/jpeg;base64,'));
});

let failed = 0;
for (const { name, fn } of results) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}
console.log(failed ? `\n${failed} failing` : `\nAll ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
