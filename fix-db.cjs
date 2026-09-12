const fs = require('fs');
const p = 'src/firebase/db.ts';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('export async function saveArticle');
const b = s.indexOf('// -------------------------------------------------------------', a);
const NL = String.fromCharCode(13, 10);
const L = [
  'export async function saveArticle(article: Article): Promise<void> {',
  '  const articleId = article.id;',
  '  try {',
  '    await withFirestoreTimeout(',
  "      set(ref(rtdb, 'articles/' + safeKey(articleId)), Object.assign({}, cleanForRtdb(article), { id: articleId, updatedAtServer: Date.now() }))",
  '    );',
  '  } catch (error) {',
  "    handleFirestoreError(error, OperationType.WRITE, 'articles/' + articleId);",
  '  }',
  '}',
  'export const saveArticleToFirestore = saveArticle;',
  '',
  'export async function deleteArticle(articleId: string): Promise<void> {',
  '  try {',
  "    await withFirestoreTimeout(remove(ref(rtdb, 'articles/' + safeKey(articleId))));",
  '  } catch (error) {',
  "    handleFirestoreError(error, OperationType.DELETE, 'articles/' + articleId);",
  '  }',
  '}',
  'export const deleteArticleFromFirestore = deleteArticle;',
  '',
  ''
].join(NL);
s = s.slice(0, a) + L + s.slice(b);
fs.writeFileSync(p, s);
console.log('fixed len=' + s.length);
