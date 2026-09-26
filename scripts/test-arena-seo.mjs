// Verifies the prerendered league hubs are genuine, crawlable HTML.
import { readFileSync, readdirSync } from 'node:fs';

const strip = (s) =>
  s
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Tokens that indicate a corrupted string: mojibake sequences and the
 * CJK/word-salad fragments that slipped into the hand-written French copy
 * during editing. Guarding these explicitly is cheaper than re-reading every
 * paragraph by eye, because the failure is invisible to `tsc` and to the
 * linter — the file is valid UTF-8, just the wrong words.
 */
const JUNK = /Ã[\x80-\xBF]|â€|æ[\x80-\xBF]{2}|[一-鿿]|draftingNBA|parait|paraitent|disrespectful|concerned|报送|written depuis/i;

let fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail++;
};

const hubs = readdirSync('dist/arena');
console.log(`League hubs generated: ${hubs.length}\n`);

check('four hub pages exist', hubs.length === 4, hubs.join(', '));

for (const hub of hubs) {
  const h = readFileSync(`dist/arena/${hub}/index.html`, 'utf8');
  const words = strip(h).split(' ').filter((w) => /[a-zA-Zà-ÿ]/.test(w)).length;
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const canon = (h.match(/rel="canonical" href="([^"]*)"/) || [])[1] || '';
  const h1 = (h.match(/<h1[^>]*>([^<]*)<\/h1>/) || [])[1] || '';

  console.log(`\n[${hub}]`);
  check('has real indexable text', words > 200, `${words} words`);
  check('has its own title', title.length > 20, title);
  check('canonical is self-referencing', canon === `https://senperspective.com/arena/${hub}`, canon);
  check('has exactly one h1', (h.match(/<h1/g) || []).length === 1, h1);
  check('root is pre-filled for crawlers', /<div id="root">\s*<div id="sp-prerender"/.test(h));
  check('collection JSON-LD present', /"@type":"CollectionPage"/.test(h));
  check('description meta present', /name="description" content="[^"]{40,}"/.test(h));
  check('AdSense script preserved', /adsbygoogle\.js\?client=ca-pub-4506276456281253/.test(h));
  check('no mojibake', !/â€|Ã[\x80-\xBF]/.test(h));
  const junk = h.match(JUNK);
  check('no corrupted words in the copy', !junk, junk ? junk.join(', ') : '');
}

const sm = readFileSync('dist/sitemap.xml', 'utf8');
console.log('');
check('all four hubs are in the sitemap', hubs.every((x) => sm.includes(`/arena/${x}<`)));
check('sitemap total grew past articles-only', (sm.match(/<loc>/g) || []).length > 360);

console.log(`\n${fail === 0 ? '=== ALL CHECKS PASSED ===' : `=== ${fail} FAILED ===`}`);
process.exit(fail === 0 ? 0 : 1);
