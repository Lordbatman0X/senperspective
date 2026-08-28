awk '/const handlePurgeDrafts = async \(\)/ {
  print "  const handlePurgeDrafts = async () => {"
  print "    if (!window.confirm(isFr ? \"Êtes-vous sûr de vouloir supprimer tous les brouillons ? Cette action est irréversible.\" : \"Are you sure you want to delete all drafts? This cannot be undone.\")) return;"
  print "    try {"
  print "      let deletedCount = 0;"
  print "      for (const draft of draftArticles) {"
  print "        deleteArticle(draft.id);"
  print "        deletedCount++;"
  print "      }"
  print "      showStatus(isFr ? `Purge terminée : ${deletedCount} brouillons supprimés.` : `Purged ${deletedCount} drafts.`);"
  print "      if (onRefreshArticles) onRefreshArticles();"
  print "    } catch (e: any) {"
  print "      showStatus(e.message || \"Error during drafts purge\", \"error\");"
  print "    }"
  print "  };"
  skip = 1;
  next;
}
skip && /^  \/\// { skip = 0; }
skip && /^\s*$/ { skip = 0; }
skip { next }
{print}' src/components/admin/DraftGenerationTab.tsx > temp.tsx && mv temp.tsx src/components/admin/DraftGenerationTab.tsx
