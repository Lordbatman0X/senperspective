const fs = require('fs');
const path = 'src/store.ts';
let s = fs.readFileSync(path, 'utf8');
const NL = '\r\n';
function rep(hay, needle, repl) {
  const i = hay.indexOf(needle);
  if (i < 0) { console.log('MISS: ' + needle.slice(0, 90)); return hay; }
  return hay.slice(0, i) + repl + hay.slice(i + needle.length);
}
s = rep(s,
  'addArticle: async (article) => {' + NL + '        set({ articles: [article,',
  'addArticle: async (article) => {' + NL + '        persistArticleLocally(article);' + NL + '        set({ articles: dedupeArticles([article,'
);
s = rep(s,
  'updateArticle: async (article) => {' + NL + '        set({ articles:',
  'updateArticle: async (article) => {' + NL + '        persistArticleLocally(article);' + NL + '        set({ articles:'
);
const w1 = 'await saveArticle({ ...article, ...clean });' + NL + '        } catch (err) {' + NL + '          console.error("[Firebase] Error writing article:", err);' + NL + '        }';
s = rep(s, w1,
  'await saveArticle({ ...article, ...clean });' + NL + '          return { success: true };' + NL + '        } catch (err) {' + NL + '          console.error("[Firebase] Error writing article:", err);' + NL + '          return { success: false };' + NL + '        }'
);
const w2 = 'await saveArticle({ ...article, ...clean });' + NL + '        } catch (err) {' + NL + '          console.error("[Firebase] Error updating article:", err);' + NL + '        }';
s = rep(s, w2,
  'await saveArticle({ ...article, ...clean });' + NL + '          return { success: true };' + NL + '        } catch (err) {' + NL + '          console.error("[Firebase] Error updating article:", err);' + NL + '          return { success: false };' + NL + '        }'
);
s = rep(s,
  'firestoreDeleteArticle(id).catch(err => {',
  'removeLocalArticleBackup(id);' + NL + '        firestoreDeleteArticle(id).catch(err => {'
);
fs.writeFileSync(path, s);
console.log('part4 bytes=' + s.length);
