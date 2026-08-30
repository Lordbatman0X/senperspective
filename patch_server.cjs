const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// Replace syncArticleToFirestore
const syncArticlePattern = /const syncArticleToFirestore = async \(article: any\) => \{[\s\S]*?console\.error\("\[FIRESTORE SYNC ERROR\]", err\);\s*\}\s*\};/m;
content = content.replace(syncArticlePattern, `const syncArticleToFirestore = async (article: any) => {
    try {
      // Exclusively Sync to MongoDB database
      await saveDocument("articles", article.id, article, false);
      console.log(\`[MONGODB SYNC SUCCESS] Synced article "\${article.id}" directly to MongoDB.\`);
    } catch (err) {
      console.error("[MONGODB SYNC ERROR]", err);
    }
  };`);

// Replace deleteArticleFromFirestore
const deleteArticlePattern = /const deleteArticleFromFirestore = async \(articleId: string\) => \{[\s\S]*?console\.error\("\[FIRESTORE DELETE ERROR\]", err\);\s*\}\s*\};/m;
content = content.replace(deleteArticlePattern, `const deleteArticleFromFirestore = async (articleId: string) => {
    try {
      // Exclusively delete from MongoDB database
      await deleteDocument("articles", articleId);
      console.log(\`[MONGODB DELETE SUCCESS] Deleted article "\${articleId}" from MongoDB.\`);
    } catch (err) {
      console.error("[MONGODB DELETE ERROR]", err);
    }
  };`);

// Replace purgeAllFirestoreRssArticles
const purgeAllPattern = /const purgeAllFirestoreRssArticles = async \(\) => \{[\s\S]*?return 0;\s*\};/m;
content = content.replace(purgeAllPattern, `const purgeAllFirestoreRssArticles = async () => {
    try {
      // Exclusively purge from MongoDB database
      const deletedCount = await wipeCollection("articles");
      console.log(\`[MONGODB PURGE SUCCESS] Successfully purged \${deletedCount} documents from MongoDB articles collection.\`);
      return deletedCount;
    } catch (err) {
      console.error("[MONGODB PURGE ERROR]", err);
    }
    return 0;
  };`);

fs.writeFileSync('server.ts', content, 'utf-8');
console.log('Patched server.ts MongoDB sync logic');
