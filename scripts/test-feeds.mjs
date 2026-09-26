// Structural sanity check on the generated XML files.
// Not a full schema validation, but it catches the failures that actually
// break a feed reader: unbalanced elements and a missing XML declaration.
import { readFileSync } from 'node:fs';

let fail = 0;
const check = (n, ok, x = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
  if (!ok) fail++;
};

const balanced = (xml, tag) => {
  const o = (xml.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
  const c = (xml.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  return { o, c, ok: o === c && o > 0 };
};

for (const [file, itemTag, rootTag] of [
  ['dist/rss.xml', 'item', 'rss'],
  ['dist/atom.xml', 'entry', 'feed'],
  ['dist/sitemap.xml', 'url', 'urlset'],
]) {
  const x = readFileSync(file, 'utf8');
  console.log(`\n${file} (${x.length} bytes)`);
  check('XML declaration', x.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  check('root element', new RegExp(`<${rootTag}[ >]`).test(x));
  const b = balanced(x, itemTag);
  check(`${itemTag} elements balanced`, b.ok, `${b.o} open / ${b.c} close`);
  check('no unescaped raw ampersands', !/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(x));
}

const rss = readFileSync('dist/rss.xml', 'utf8');
check('rss has a channel title', /<title>SenPerspective<\/title>/.test(rss));
check('rss declares a self link', /rel="self"/.test(rss));
check('rss has a build date', /<lastBuildDate>/.test(rss));
check('rss items are sorted newest first', (() => {
  const d = [...rss.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => new Date(m[1]).getTime());
  return d.length > 1 && d.every((v, i) => i === 0 || d[i - 1] >= v);
})());

console.log(`\n${fail === 0 ? '=== ALL CHECKS PASSED ===' : `=== ${fail} FAILED ===`}`);
process.exit(fail === 0 ? 0 : 1);
