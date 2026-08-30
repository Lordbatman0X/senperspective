const fs = require('fs');

let content = fs.readFileSync('src/store.ts', 'utf-8');

const purgeAllPattern = /purgeAllArticles: async \(\) => \{[\s\S]*?await Promise\.all\(deletePromises\);\s*\}/m;

const newPurgeAll = `purgeAllArticles: async () => {
        set({ articles: [] });
        try {
          await fetch('/api/mongodb/collection/articles/wipe', { method: 'DELETE' });
        } catch (err) {
          console.error("Failed to wipe articles collection:", err);
        }
      }`;

content = content.replace(purgeAllPattern, newPurgeAll);

fs.writeFileSync('src/store.ts', content, 'utf-8');
console.log('Patched store.ts purgeAllArticles');
