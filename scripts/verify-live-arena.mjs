// Verifies the deployed league hub pages over HTTP.
import https from 'node:https';

const get = (path, redirects = 0) =>
  new Promise((resolve, reject) => {
    https
      .get(
        { host: 'senperspective.com', path, headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } },
        (r) => {
          const loc = r.headers.location;
          if (r.statusCode >= 300 && r.statusCode < 400 && loc && redirects < 5) {
            r.resume();
            return resolve(get(loc.startsWith('http') ? new URL(loc).pathname + new URL(loc).search : loc, redirects + 1));
          }
          let d = '';
          r.on('data', (c) => (d += c));
          r.on('end', () => resolve({ status: r.statusCode, html: d, redirects }));
        }
      )
      .on('error', reject);
  });

const strip = (s) =>
  s
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

let fail = 0;
const check = (n, ok, x = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
  if (!ok) fail++;
};

for (const p of ['/arena/lutte', '/arena/navetane', '/arena/d1-basket', '/arena/bal']) {
  const r = await get(p);
  const words = strip(r.html).split(' ').filter((w) => /[a-zA-Zà-ÿ]/.test(w)).length;
  const title = (r.html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const canon = (r.html.match(/rel="canonical" href="([^"]*)"/) || [])[1] || '';
  console.log(`\n${p}`);
  check('200', r.status === 200, String(r.status));
  check('prerendered text present', words > 200, `${words} words`);
  check('unique title', title.includes('/arena/') === false && title.length > 25, title);
  check('canonical correct', canon === `https://senperspective.com${p}`, canon);
  check('single h1', (r.html.match(/<h1/g) || []).length === 1, String((r.html.match(/<h1/g) || []).length));
  check('CollectionPage JSON-LD', /"@type":"CollectionPage"/.test(r.html));
  check('AdSense present once', (r.html.match(/adsbygoogle\.js\?client=ca-pub-4506276456281253/g) || []).length === 1);
}

// The sitemap must list all four.
const sm = await get('/sitemap.xml');
console.log('');
for (const p of ['/arena/lutte', '/arena/navetane', '/arena/d1-basket', '/arena/bal']) {
  check(`sitemap lists ${p}`, sm.html.includes(`<loc>https://senperspective.com${p}</loc>`));
}

console.log(`\n${fail === 0 ? '=== ALL LIVE CHECKS PASSED ===' : `=== ${fail} FAILED ===`}`);
process.exit(fail === 0 ? 0 : 1);
