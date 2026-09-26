// Verifies the newsletter box, the feeds, and the prerendered category pages.
import { readFileSync, readdirSync, existsSync } from 'node:fs';

let fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail++;
};
const strip = (s) =>
  s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
   .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const JUNK = /Ã[\x80-\xBF]|â€|æ[\x80-\xBF]{2}|[一-鿿]/;

console.log('=== 1. Newsletter box ===');
const nl = readFileSync('src/components/NewsletterSignup.tsx', 'utf8');
check('compact variant exists', /export const NewsletterInline/.test(nl));
check('it is actually rendered somewhere', /<NewsletterInline/.test(readFileSync('src/pages/HomePage.tsx', 'utf8') + readFileSync('src/pages/ArticlePage.tsx', 'utf8')));
check('invalid email is rejected visibly', /role="alert"/.test(nl) && /setError/.test(nl));
check('uses the existing store action', /addSubscriber/.test(nl));

console.log('\n=== 2. Feeds ===');
for (const f of ['dist/rss.xml', 'dist/atom.xml']) {
  check(`${f} exists`, existsSync(f));
  if (!existsSync(f)) continue;
  const x = readFileSync(f, 'utf8');
  const items = (x.match(/<(item|entry)\b/g) || []).length;
  check(`  ${f} has items`, items > 10, `${items} items`);
  check(`  ${f} has no mojibake`, !JUNK.test(x));
  check(`  ${f} links articles`, /\/article\//.test(x));
}
const idx = readFileSync('dist/index.html', 'utf8');
check('feed auto-discovery in <head>', /rel="alternate" type="application\/rss\+xml"/.test(idx) && /rel="alternate" type="application\/atom\+xml"/.test(idx));
const robots = readFileSync('public/robots.txt', 'utf8');
check('robots allows Googlebot-News', /User-agent: Googlebot-News/.test(robots));
check('robots still points at the sitemap', /Sitemap: https:\/\/senperspective\.com\/sitemap\.xml/.test(robots));

console.log('\n=== 3. Category hub pages ===');
const cats = existsSync('dist/category') ? readdirSync('dist/category') : [];
check('category pages generated', cats.length === 8, cats.join(', '));
for (const c of cats) {
  const h = readFileSync(`dist/category/${c}/index.html`, 'utf8');
  const words = strip(h).split(' ').filter((w) => /[a-zA-Zà-ÿ]/.test(w)).length;
  check(`  ${c}: indexable text`, words > 150, `${words} words`);
  check(`  ${c}: single h1`, (h.match(/<h1/g) || []).length === 1);
  check(`  ${c}: self-canonical`, (h.match(/rel="canonical" href="([^"]*)"/) || [])[1] === `https://senperspective.com/category/${c}`);
  check(`  ${c}: no junk in copy`, !JUNK.test(h));
  check(`  ${c}: AdSense preserved`, /adsbygoogle\.js\?client=ca-pub-4506276456281253/.test(h));
}

console.log('\n=== 4. Sitemap ===');
const sm = readFileSync('dist/sitemap.xml', 'utf8');
for (const c of cats) check(`sitemap lists /category/${c}`, sm.includes(`<loc>https://senperspective.com/category/${c}</loc>`));
check('feeds do not pollute the sitemap', !sm.includes('rss.xml'));

console.log(`\n${fail === 0 ? '=== ALL CHECKS PASSED ===' : `=== ${fail} FAILED ===`}`);
process.exit(fail === 0 ? 0 : 1);
