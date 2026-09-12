const fs = require('fs');
const path = 'src/store.ts';
let s = fs.readFileSync(path, 'utf8');
const NL = '\r\n';
function rep(hay, needle, repl) {
  const i = hay.indexOf(needle);
  if (i < 0) { console.log('MISS: ' + needle.slice(0, 80)); return hay; }
  return hay.slice(0, i) + repl + hay.slice(i + needle.length);
}
s = rep(s,
  'loadArticles: async () => {' + NL + '        set({ isLoadingArticles: true });',
  'loadArticles: async () => {' + NL
  + '        const preExisting = Array.isArray(get().articles) ? [...get().articles] : [];' + NL
  + '        const localBackup = loadArticlesFromLocalBackup();' + NL
  + '        if (preExisting.length === 0 && localBackup.length > 0) { set({ articles: localBackup }); }' + NL
  + '        set({ isLoadingArticles: true });'
);
while (s.includes('set({ articles: merged, isLoadingArticles: false });')) {
  s = rep(s,
    'set({ articles: merged, isLoadingArticles: false });',
    'set({ articles: dedupeArticles([...preExisting, ...localBackup, ...merged]), isLoadingArticles: false });'
  );
}
while (s.includes('const fallback = recovered.length > 0 ? [...recovered, ...seedArticles] : seedArticles;')) {
  s = rep(s,
    'const fallback = recovered.length > 0 ? [...recovered, ...seedArticles] : seedArticles;',
    'const fallback = dedupeArticles([...preExisting, ...localBackup, ...recovered, ...seedArticles]);'
  );
}
fs.writeFileSync(path, s);
console.log('part3 bytes=' + s.length);
