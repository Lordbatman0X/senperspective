sed -i '/const handlePublishSingleDraft = async/i\
  const handlePurgeDrafts = async () => {\
    if (!window.confirm(isFr ? "Êtes-vous sûr de vouloir supprimer tous les brouillons ? Cette action est irréversible." : "Are you sure you want to delete all drafts? This cannot be undone.")) return;\
    try {\
      let deletedCount = 0;\
      for (const draft of draftArticles) {\
        deleteArticle(draft.id);\
        deletedCount++;\
      }\
      showStatus(isFr ? `Purge terminée : ${deletedCount} brouillons supprimés.` : `Purged ${deletedCount} drafts.`);\
      if (onRefreshArticles) onRefreshArticles();\
    } catch (e: any) {\
      showStatus(e.message || "Error during drafts purge", "error");\
    }\
  };\
' src/components/admin/DraftGenerationTab.tsx
