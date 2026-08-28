import React, { useState } from 'react';
import { useStore } from '../../store';
import { Trash2, Edit2, CheckCircle, Newspaper } from 'lucide-react';

interface DraftGenerationTabProps {
  onEditArticle: (article: any) => void;
  onRefreshArticles?: () => void;
}

export function DraftGenerationTab({ onEditArticle, onRefreshArticles }: DraftGenerationTabProps) {
  const { articles, deleteArticle, language } = useStore();
  const isFr = language === 'fr';
  
  const draftArticles = articles.filter(a => !a.isPublished);

  const handleDeleteSingleDraft = (id: string) => {
    if (!window.confirm(isFr ? 'Supprimer ce brouillon ?' : 'Delete this draft?')) return;
    deleteArticle(id);
    if (onRefreshArticles) onRefreshArticles();
  };

  const handlePurgeDrafts = () => {
    if (!window.confirm(isFr ? 'Supprimer tous les brouillons ?' : 'Delete all drafts?')) return;
    draftArticles.forEach(a => deleteArticle(a.id));
    if (onRefreshArticles) onRefreshArticles();
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
          <Newspaper />
          {isFr ? 'Brouillons & Génération' : 'Drafts & Generation'}
        </h2>
        {draftArticles.length > 0 && (
          <button
            onClick={handlePurgeDrafts}
            className="p-2 bg-red-950/40 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
            title={isFr ? "Purger tous les brouillons" : "Purge all drafts"}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {draftArticles.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">
            {isFr ? 'Aucun brouillon.' : 'No drafts.'}
          </p>
        ) : (
          draftArticles.map(draft => (
            <div key={draft.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold">{draft.title?.fr || draft.title?.en || 'Sans titre'}</h3>
                <p className="text-zinc-500 text-xs">{draft.category}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEditArticle(draft)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteSingleDraft(draft.id)}
                  className="p-2 text-red-400 hover:text-white bg-red-950/40 hover:bg-red-500 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
