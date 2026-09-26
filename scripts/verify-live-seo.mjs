// Verifies the deployed feeds, robots.txt, feed auto-discovery and category
// pages over HTTP.
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
            const u = loc.startsWith('http') ? new URL(loc) : null;
            return resolve(get(u ? u.pathname + u.search : loc, redirects + 1));
          }
          let d = '';
          r.on('data', (c) => (d += c));
          r.on('end', () => resolve({ status: r.statusCode, html: d, type: r.headers['content-type'] || '' }));
        }
      )
      .on('error', reject);
  });

const strip = (s) =>
  s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
   .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

let fail = 0;
const check = (n, ok, x = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
  if (!ok) fail++;
};

for (const [p, needle] of [['/rss.xml', 'application/rss+xml'], ['/atom.xml', 'application/atom+xml']]) {
  const r = await get(p);
  const n = (r.html.match(/<(item|entry)\b/g) || []).length;
  console.log(`\n${p}`);
  check('200', r.status === 200, String(r.status));
  check('correct content-type', r.type.includes(needle), r.type);
  check('has items', n > 10, `${n} items`);
}

const robots = await get('/robots.txt');
console.log('\n/robots.txt');
check('200', robots.status === 200);
check('allows Googlebot-News', /User-agent: Googlebot-News/.test(robots.html));
check('declares the sitemap', /Sitemap: https:\/\/senperspective\.com\/sitemap\.xml/.test(robots.html));

// Auto-discovery must be in the served HTML, not injected by React.
const home = await get('/');
console.log('\n/ (head)');
check('rss alternate link', /rel="alternate" type="application\/rss\+xml"/.test(home.html));
check('atom alternate link', /rel="alternate" type="application\/atom\+xml"/.test(home.html));

for (const c of ['politique', 'economie', 'international', 'decryptages']) {
  const r = await get(`/category/${c}`);
  const words = strip(r.html).split(' ').filter((w) => /[a-zA-Zà-ÿ]/.test(w)).length;
  console.log(`\n/category/${c}`);
  check('200', r.status === 200, String(r.status));
  check('prerendered text', words > 150, `${words} words`);
  check('single h1', (r.html.match(/<h1/g) || []).length === 1);
  check('self-canonical', (r.html.match(/rel="canonical" href="([^"]*)"/) || [])[1] === `https://senperspective.com/category/${c}`);
}

console.log(`\n${fail === 0 ? '=== ALL LIVE CHECKS PASSED ===' : `=== ${fail} FAILED ===`}`);
process.exit(fail === 0 ? 0 : 1);
