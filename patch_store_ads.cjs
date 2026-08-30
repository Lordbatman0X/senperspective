const fs = require('fs');

let content = fs.readFileSync('src/store.ts', 'utf-8');

const syncPattern = /syncFromMongoDB: async \(\) => \{[\s\S]*?\},/m;

const newSync = `syncFromMongoDB: async () => {
        try {
          const snapshot = await getDocs(collection(db, "articles"));
          if (snapshot && !snapshot.empty) {
            const fetchedArticles: Article[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data) {
                fetchedArticles.push(data as Article);
              }
            });
            if (fetchedArticles.length > 0) {
              fetchedArticles.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
              set({ articles: fetchedArticles });
            }
          }

          // Fetch Ads from MongoDB
          const adsSnapshot = await getDocs(collection(db, "ads"));
          if (adsSnapshot && !adsSnapshot.empty) {
            const fetchedAds = [];
            adsSnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data) fetchedAds.push(data);
            });
            if (fetchedAds.length > 0) {
              set({ ads: fetchedAds });
            }
          }
        } catch (err) {
          console.error("Failed to sync from MongoDB:", err);
        }
      },`;

content = content.replace(syncPattern, newSync);

const deleteAdPattern = /deleteAd: \(id\) => set\(\{ ads: \(get\(\)\.ads \|\| \[\]\)\.filter\(a => a\.id !== id\) \}\),/m;

const newDeleteAd = `deleteAd: (id) => {
        set({ ads: (get().ads || []).filter(a => a.id !== id) });
        deleteDoc(doc(db, "ads", id)).catch(err => console.error("Error deleting ad from MongoDB:", err));
      },`;

content = content.replace(deleteAdPattern, newDeleteAd);

fs.writeFileSync('src/store.ts', content, 'utf-8');
console.log('Patched store.ts with ads sync and delete');
