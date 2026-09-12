const fs = require('fs');
const path = 'src/store.ts';
let s = fs.readFileSync(path, 'utf8');
const NL = '\r\n';
function rep(hay, needle, repl) {
  const i = hay.indexOf(needle);
  if (i < 0) { console.log('MISS: ' + needle.slice(0, 70)); return hay; }
  return hay.slice(0, i) + repl + hay.slice(i + needle.length);
}
if (!s.includes('function dedupeArticles')) {
  const dd = 'function dedupeArticles(list) {' + NL
    + '  const seen = new Set();' + NL
    + '  const out = [];' + NL
    + '  for (const a of list) {' + NL
    + '    const id = String(a && a.id || "");' + NL
    + '    if (!id || seen.has(id)) continue;' + NL
    + '    seen.add(id); out.push(a);' + NL
    + '  }' + NL
    + '  return out;' + NL
    + '}' + NL;
  s = rep(s, 'const cloudSave =', dd + 'const cloudSave =');
}
if (!s.includes('LOCAL_ARTICLES_KEY')) {
  const hb = 'const LOCAL_ARTICLES_KEY = "senperspective-local-articles-v1";' + NL
    + 'function persistArticleLocally(a) {' + NL
    + '  try {' + NL
    + '    const raw = localStorage.getItem(LOCAL_ARTICLES_KEY);' + NL
    + '    const arr = raw ? JSON.parse(raw) : [];' + NL
    + '    const list = Array.isArray(arr) ? arr : [];' + NL
    + '    const idx = list.findIndex(function(x){ return String(x && x.id) === String(a && a.id); });' + NL
    + '    if (idx >= 0) list[idx] = a; else list.unshift(a);' + NL
    + '    localStorage.setItem(LOCAL_ARTICLES_KEY, JSON.stringify(list.slice(0, 200)));' + NL
    + '  } catch (e) {}' + NL
    + '}' + NL;
  s = rep(s, 'const supabase: any = null;', hb + 'const supabase: any = null;');
}
fs.writeFileSync(path, s);
console.log('part1 done bytes=' + s.length);
