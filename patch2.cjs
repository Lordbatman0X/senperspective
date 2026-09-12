const fs = require('fs');
const path = 'src/store.ts';
let s = fs.readFileSync(path, 'utf8');
function rep(hay, needle, repl) {
  const i = hay.indexOf(needle);
  if (i < 0) { console.log('MISS: ' + needle.slice(0, 70)); return hay; }
  return hay.slice(0, i) + repl + hay.slice(i + needle.length);
}
s = rep(s,
  'function removeLocalArticleBackup(id: string) {',
  'function removeLocalArticleBackupPLACEHOLDER(id: string) {'
);
const NL = '\r\n';
const more = 'function removeLocalArticleBackup(id) {' + NL
  + '  try {' + NL
  + '    const raw = localStorage.getItem(LOCAL_ARTICLES_KEY);' + NL
  + '    if (!raw) return;' + NL
  + '    const arr = JSON.parse(raw);' + NL
  + '    if (!Array.isArray(arr)) return;' + NL
  + '    localStorage.setItem(LOCAL_ARTICLES_KEY, JSON.stringify(arr.filter(function(x){ return String(x && x.id) !== String(id); })));' + NL
  + '  } catch (e) {}' + NL
  + '}' + NL
  + 'function loadArticlesFromLocalBackup() {' + NL
  + '  try {' + NL
  + '    const raw = localStorage.getItem(LOCAL_ARTICLES_KEY);' + NL
  + '    const arr = raw ? JSON.parse(raw) : [];' + NL
  + '    return Array.isArray(arr) ? arr : [];' + NL
  + '  } catch (e) { return []; }' + NL
  + '}' + NL;
s = rep(s, 'const supabase: any = null;', more + 'const supabase: any = null;');
s = rep(s,
  'addArticle: (article: Article) => void;',
  'addArticle: (article: Article) => Promise<{ success: boolean; error?: string }>;'
);
s = rep(s,
  'updateArticle: (article: Article) => void;',
  'updateArticle: (article: Article) => Promise<{ success: boolean; error?: string }>;'
);
fs.writeFileSync(path, s);
console.log('part2 done bytes=' + s.length);
