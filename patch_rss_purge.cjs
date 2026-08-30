const fs = require('fs');

let content = fs.readFileSync('src/components/admin/RssAutomationTab.tsx', 'utf-8');

const purgePattern = /const handlePurgeDrafts = \(\) => \{[\s\S]*?showStatus\(isFr \? 'File des brouillons purgée\.' : 'Draft queue purged\.'\);\s*\};/m;

const newPurge = `const handlePurgeDrafts = async () => {
    if (!window.confirm(isFr ? "Supprimer TOUS les brouillons en attente de validation ?" : "Purge ALL pending drafts?")) return;
    
    try {
      showStatus(isFr ? 'Purge en cours...' : 'Purging drafts...');
      const { ok, data, error } = await safeFetchJson('/api/articles/purge', { method: 'POST' });
      if (ok && data?.success) {
        await syncFromFirestore();
        showStatus(isFr ? 'File des brouillons purgée.' : 'Draft queue purged.');
      } else {
        throw new Error(error || data?.error || 'Failed to purge drafts');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  };`;

content = content.replace(purgePattern, newPurge);

fs.writeFileSync('src/components/admin/RssAutomationTab.tsx', content, 'utf-8');
console.log('Patched RssAutomationTab.tsx purge function');
