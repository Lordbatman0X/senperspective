import React, { useState, useEffect } from 'react';
import { 
  Bot, Newspaper, Sparkles, Filter, Search, Check, Trash2, CheckCircle, 
  ExternalLink, Edit2, Play, AlertCircle, CheckCircle2, ShieldCheck, 
  Award, Heart, Sliders, HelpCircle, Save, Loader2, ListCollapse, ListStart
} from 'lucide-react';
import { useStore } from '../../store';
import { safeFetchJson } from '../../lib/apiUtils';
import { getArticleSourceInfo } from './RssAutomationTab';

interface DraftGenerationTabProps {
  onEditArticle: (article: any) => void;
  onRefreshArticles?: () => void;
}

const RSS_CATEGORIES = ['Politique', 'Économie', 'Société', 'Sports', 'International', 'Dossiers', 'Culture'];

export function DraftGenerationTab({ onEditArticle, onRefreshArticles }: DraftGenerationTabProps) {
  const { articles, addArticle, updateArticle, deleteArticle, language } = useStore();
  const isFr = language === 'fr';

  // Sub tab inside Draft Generation
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'writer' | 'guidelines'>('queue');

  // Interactive States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<'all' | 'News' | 'Analysis' | 'Deep Dive'>('all');
  const [selectedEngineFilter, setSelectedEngineFilter] = useState<'all' | 'gemini' | 'openai' | 'groq' | 'openrouter'>('all');
  const [inspectDraft, setInspectDraft] = useState<any | null>(null);
  const [inspectLanguage, setInspectLanguage] = useState<'fr' | 'en'>('fr');

  // Writer form states
  const [manualPrompt, setManualPrompt] = useState('');
  const [manualCategory, setManualCategory] = useState('Économie');
  const [manualStyleType, setManualStyleType] = useState<'News' | 'Analysis' | 'Deep Dive'>('News');
  const [manualPreferredEngine, setManualPreferredEngine] = useState<'auto' | 'gemini' | 'groq' | 'openrouter' | 'openai'>('auto');
  const [promptLoading, setPromptLoading] = useState(false);

  // Guidelines States
  const [guidelinesLoading, setGuidelinesLoading] = useState(false);
  const [savingGuidelines, setSavingGuidelines] = useState(false);
  const [testingGuidelines, setTestingGuidelines] = useState(false);
  const [editorialGuidelines, setEditorialGuidelines] = useState<{
    customDirectives: string;
    editorialComments: string;
    forbiddenPhrases: string[];
    preferredTone: 'analytical' | 'investigative' | 'diplomatic' | 'dynamic' | 'custom';
    exemplaryExample: {
      titleFr: string;
      excerptFr: string;
      bodyFr: string;
      titleEn?: string;
      excerptEn?: string;
      bodyEn?: string;
    };
    updatedAt?: string;
  }>({
    customDirectives: '',
    editorialComments: '',
    forbiddenPhrases: [],
    preferredTone: 'analytical',
    exemplaryExample: {
      titleFr: '',
      excerptFr: '',
      bodyFr: '',
      titleEn: '',
      excerptEn: '',
      bodyEn: ''
    }
  });

  const [testPrompt, setTestPrompt] = useState('Projet de ligne de chemin de fer Dakar-Bamako : enjeux de désenclavement et financement régional');
  const [testResult, setTestResult] = useState<any>(null);
  const [newForbiddenTag, setNewForbiddenTag] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 6000);
  };

  // Fetch Guidelines on Mount
  const fetchGuidelines = async () => {
    setGuidelinesLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/editorial-guidelines');
      if (ok && data?.success && data.guidelines) {
        setEditorialGuidelines(data.guidelines);
      }
    } catch (e) {
      console.warn("Could not retrieve guidelines:", e);
    } finally {
      setGuidelinesLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidelines();
  }, []);

  // Filter drafts
  const draftArticles = (articles || []).filter(a => !a.isPublished);

  const filteredDrafts = draftArticles.filter(draft => {
    const matchesCat = selectedCategory === 'all' || draft.category === selectedCategory;
    const matchesStyle = selectedStyleFilter === 'all' || (draft.type || 'News') === selectedStyleFilter;
    const matchesEngine = selectedEngineFilter === 'all' || 
      (selectedEngineFilter === 'gemini' && (draft as any).engineUsed?.toLowerCase().includes('gemini')) ||
      (selectedEngineFilter === 'groq' && (draft as any).engineUsed?.toLowerCase().includes('groq')) ||
      (selectedEngineFilter === 'openrouter' && (draft as any).engineUsed?.toLowerCase().includes('openrouter')) ||
      (selectedEngineFilter === 'openai' && (draft as any).engineUsed?.toLowerCase().includes('openai'));

    const titleStr = (draft.title?.[language] || draft.title?.fr || '').toLowerCase();
    const excerptStr = (draft.excerpt?.[language] || draft.excerpt?.fr || '').toLowerCase();
    const sourceStr = (draft.sourceName || '').toLowerCase();
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch = titleStr.includes(searchLower) || 
                          excerptStr.includes(searchLower) || 
                          sourceStr.includes(searchLower);

    return matchesCat && matchesStyle && matchesEngine && matchesSearch;
  });

  // Action: Publish all drafts
  const handlePublishAllDrafts = async () => {
    if (!window.confirm(isFr ? 'Voulez-vous publier TOUS les articles brouillons actuellement filtrés ?' : 'Do you want to publish ALL filtered draft articles?')) return;
    
    try {
      let publishedCount = 0;
      for (const draft of filteredDrafts) {
        const updated = { ...draft, isPublished: true };
        
        // Sync to Firestore & Mongo first via general API endpoint or manually trigger store update
        const res = await fetch(`/api/articles/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: true })
        });
        
        if (res.ok) {
          updateArticle(updated);
          publishedCount++;
        }
      }
      showStatus(isFr ? `Publication réussie : ${publishedCount} articles mis en ligne !` : `Successfully published ${publishedCount} stories live!`);
      if (onRefreshArticles) onRefreshArticles();
    } catch (e: any) {
      showStatus(e.message || 'Error occurred during batch publication', 'error');
    }
  };

  // Action: Purge all drafts
  const handlePurgeDrafts = async () => {
    if (!window.confirm(isFr ? 'Êtes-vous sûr de vouloir supprimer tous les brouillons ? Cette action est irréversible.' : 'Are you sure you want to delete all drafts? This cannot be undone.')) return;
    
    try {
      let deletedCount = 0;
      for (const draft of draftArticles) {
        const res = await fetch(`/api/articles/${draft.id}`, { method: 'DELETE' });
        if (res.ok) {
          deleteArticle(draft.id);
          deletedCount++;
        }
      }
      showStatus(isFr ? `Purge terminée : ${deletedCount} brouillons supprimés.` : `Purged ${deletedCount} drafts.`);
      if (onRefreshArticles) onRefreshArticles();
    } catch (e: any) {
      showStatus(e.message || 'Error during drafts purge', 'error');
    }
  };

  // Action: Publish a single draft
  const handlePublishSingleDraft = async (draft: any) => {
    try {
      const updated = { ...draft, isPublished: true };
      const res = await fetch(`/api/articles/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: true })
      });
      if (res.ok) {
        updateArticle(updated);
        setInspectDraft(null);
        showStatus(isFr ? `L’article "${draft.title?.fr || draft.title?.en}" est désormais en ligne !` : `Article published live!`);
        if (onRefreshArticles) onRefreshArticles();
      } else {
        throw new Error("Publishing request returned failure status");
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  };

  // Action: Delete a single draft
  const handleDeleteSingleDraft = async (id: string) => {
    if (!window.confirm(isFr ? 'Supprimer définitivement ce brouillon de l’Atelier ?' : 'Permanently delete this draft?')) return;
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        deleteArticle(id);
        showStatus(isFr ? "Brouillon supprimé." : "Draft deleted successfully.");
        if (onRefreshArticles) onRefreshArticles();
      } else {
        throw new Error("Deletion failed");
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  };

  // Submission form manual AI Storyteller
  const handleGenerateManualArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPrompt.trim()) return;

    setPromptLoading(true);
    try {
      const { ok, data, error } = await safeFetchJson('/api/generate-rss-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: manualPrompt, 
          category: manualCategory, 
          type: manualStyleType,
          preferredEngine: manualPreferredEngine,
          autoPublish: false 
        })
      });

      if (!ok || !data?.success) {
        throw new Error(error || data?.error || 'Failed to generate article from prompt');
      }

      if (data.article) {
        addArticle(data.article);
      }

      setManualPrompt('');
      showStatus(
        isFr 
          ? `Article narratif généré (${data.engineUsed || 'IA Dual'}) et ajouté à la file des brouillons !` 
          : `Story generated (${data.engineUsed || 'AI'}) and saved in drafts queue!`
      );
      setActiveSubTab('queue');
      if (onRefreshArticles) onRefreshArticles();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setPromptLoading(false);
    }
  };

  // Editorial guidelines actions
  const handleSaveGuidelines = async () => {
    setSavingGuidelines(true);
    try {
      const { ok, data, error } = await safeFetchJson('/api/editorial-guidelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editorialGuidelines)
      });
      if (ok && data?.success) {
        setEditorialGuidelines(data.guidelines);
        showStatus(isFr ? 'Charte éditoriale et directives IA enregistrées !' : 'Editorial guidelines and AI style saved!');
      } else {
        throw new Error(error || data?.error || 'Failed to save guidelines');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setSavingGuidelines(false);
    }
  };

  const handleResetGuidelines = async () => {
    if (!window.confirm(isFr ? 'Réinitialiser la charte éditoriale aux paramètres par défaut ?' : 'Reset guidelines to default?')) return;
    setSavingGuidelines(true);
    try {
      const { ok, data, error } = await safeFetchJson('/api/editorial-guidelines/reset', { method: 'POST' });
      if (ok && data?.success) {
        setEditorialGuidelines(data.guidelines);
        showStatus(isFr ? 'Charte éditoriale réinitialisée aux standards par défaut.' : 'Guidelines reset to default.');
      } else {
        throw new Error(error || data?.error || 'Reset failed');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setSavingGuidelines(false);
    }
  };

  const handleTestGuidelines = async () => {
    if (!testPrompt.trim()) return;
    setTestingGuidelines(true);
    try {
      const { ok, data, error } = await safeFetchJson('/api/editorial-guidelines/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPrompt,
          customGuidelines: editorialGuidelines,
          category: 'Économie',
          type: 'News'
        })
      });
      if (ok && data?.success) {
        setTestResult(data.testResult);
        showStatus(isFr ? 'Test de génération de la charte terminé !' : 'Guidelines generation test complete!');
      } else {
        throw new Error(error || data?.error || 'Guidelines testing failed');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setTestingGuidelines(false);
    }
  };

  const handleAddForbiddenPhrase = () => {
    if (!newForbiddenTag.trim()) return;
    const trimmed = newForbiddenTag.trim();
    if (editorialGuidelines.forbiddenPhrases.includes(trimmed)) return;
    
    setEditorialGuidelines(prev => ({
      ...prev,
      forbiddenPhrases: [...prev.forbiddenPhrases, trimmed]
    }));
    setNewForbiddenTag('');
  };

  const handleRemoveForbiddenPhrase = (phrase: string) => {
    setEditorialGuidelines(prev => ({
      ...prev,
      forbiddenPhrases: prev.forbiddenPhrases.filter(p => p !== phrase)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Subtab Header Navigation */}
      <div className="flex border-b border-zinc-800 pb-px">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`pb-4 px-6 font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'queue'
              ? 'border-[#E85D42] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bot size={14} />
          <span>{isFr ? 'File des Brouillons' : 'Drafts Queue'}</span>
          <span className="bg-amber-500 text-black px-2 py-0.5 rounded-full font-mono text-[9px] font-black">
            {draftArticles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('writer')}
          className={`pb-4 px-6 font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'writer'
              ? 'border-[#E85D42] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles size={14} />
          <span>{isFr ? 'Atelier Storytelling' : 'AI Writer'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('guidelines')}
          className={`pb-4 px-6 font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'guidelines'
              ? 'border-[#E85D42] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Award size={14} />
          <span>{isFr ? 'Charte & Prompts' : 'Editorial Charter'}</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border font-mono text-xs font-semibold flex items-center gap-2.5 shadow-md ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
            : 'bg-red-950/40 border-red-800 text-red-300'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ==================== DRAFTS QUEUE ==================== */}
      {activeSubTab === 'queue' && (
        <div className="space-y-6">
          {/* Filters Suite */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={15} className="absolute left-3.5 top-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder={isFr ? "Rechercher par titre, source ou mot-clé..." : "Search by headline, source or keyword..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-9 pr-3.5 py-2.5 rounded-xl outline-none focus:border-orange-500 transition-colors placeholder-zinc-500 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono px-3 py-2 rounded-xl outline-none focus:border-orange-500"
              >
                <option value="all">{isFr ? 'Toutes Rubriques' : 'All Categories'}</option>
                {RSS_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedStyleFilter}
                onChange={(e) => setSelectedStyleFilter(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono px-3 py-2 rounded-xl outline-none focus:border-orange-500"
              >
                <option value="all">{isFr ? 'Tous Formats' : 'All Story Formats'}</option>
                <option value="News">⚡ News Récit (~400 mots)</option>
                <option value="Analysis">🔍 Analyse Stratégique (~1000 mots)</option>
                <option value="Deep Dive">📜 Grand Angle / Dossier (1200+ mots)</option>
              </select>

              {draftArticles.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handlePublishAllDrafts}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle size={14} />
                    <span>{isFr ? 'Tout Publier' : 'Publish All'}</span>
                  </button>

                  <button
                    onClick={handlePurgeDrafts}
                    className="p-2 bg-zinc-950 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-xl transition-all cursor-pointer"
                    title={isFr ? "Purger la file des brouillons" : "Purge draft queue"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Drafts Grid */}
          {filteredDrafts.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 bg-zinc-800/80 rounded-2xl flex items-center justify-center mx-auto text-zinc-500">
                <Newspaper size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  {isFr ? 'Aucun brouillon en attente de validation' : 'No pending drafts in review queue'}
                </h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  {isFr 
                    ? 'Découvrez vos sources RSS ou utilisez l’Atelier Storytelling IA pour rédiger un article d’actualité.'
                    : 'Configure your RSS Feeds or write custom stories using our interactive AI Newsroom Writer.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDrafts.map((draft) => {
                const src = getArticleSourceInfo(draft);
                const engineFootprint = (draft as any).engineUsed || 'Dual-Engine Auto';
                const hasBrief = !!draft.perspectiveBrief;
                const hasTimeline = Array.isArray(draft.timeline) && draft.timeline.length > 0;
                
                return (
                  <div 
                    key={draft.id}
                    className="bg-zinc-900/90 border border-zinc-800/90 hover:border-orange-500/50 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 uppercase tracking-widest font-black">
                          <span>{src.originFlag}</span>
                          <span className="text-zinc-300 truncate max-w-xs">{src.sourceName}</span>
                          <span>•</span>
                          <span className="text-orange-400">{draft.category}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] font-mono text-zinc-400">
                          {draft.type || 'News'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-white leading-snug group-hover:text-orange-400 transition-colors">
                          {draft.title?.[language] || draft.title?.fr}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {draft.excerpt?.[language] || draft.excerpt?.fr}
                        </p>
                      </div>

                      {/* Technical Footprint tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 bg-zinc-950 text-amber-400 font-mono text-[9px] font-black rounded-md border border-amber-950">
                          🤖 {engineFootprint}
                        </span>
                        {hasBrief && (
                          <span className="px-2 py-0.5 bg-[#E85D42]/10 text-[#E85D42] font-mono text-[9px] font-bold rounded-md border border-[#E85D42]/20">
                            ✓ Perspective Brief
                          </span>
                        )}
                        {hasTimeline && (
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-300 font-mono text-[9px] font-bold rounded-md border border-blue-900">
                            ⏲ Chronologie
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(draft.date).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setInspectDraft(draft);
                            setInspectLanguage(language);
                          }}
                          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white font-bold text-[10px] uppercase tracking-wide cursor-pointer"
                        >
                          {isFr ? 'Relire & Prévisualiser' : 'Preview'}
                        </button>

                        <button
                          onClick={() => handlePublishSingleDraft(draft)}
                          className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-lg border border-emerald-900/40 hover:border-emerald-500 transition-colors cursor-pointer"
                          title={isFr ? "Publier immédiatement" : "Publish live"}
                        >
                          <Check size={14} />
                        </button>

                        <button
                          onClick={() => handleDeleteSingleDraft(draft.id)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                          title={isFr ? "Supprimer de l’Atelier" : "Delete draft"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== AI WRITER ==================== */}
      {activeSubTab === 'writer' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xl max-w-4xl mx-auto">
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="text-orange-500" size={16} />
              {isFr ? 'Atelier Storytelling IA Newsroom' : 'Interactive Storyteller AI Writer'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              {isFr 
                ? 'Rédigez à la demande un article structuré d’analyse politique, sportive ou économique à partir de simples mots-clés ou dépêches.' 
                : 'Instantly generate robust bilingual press articles based on custom prompts or wire snippets.'}
            </p>
          </div>

          <form onSubmit={handleGenerateManualArticle} className="space-y-6 font-mono text-xs text-zinc-300">
            {/* Input Prompt Box */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase text-orange-400 block">
                {isFr ? 'Sujet ou dépêche brute de l’actualité :' : 'Enter prompt, subject or raw wire snippet:'}
              </label>
              <textarea
                value={manualPrompt}
                onChange={e => setManualPrompt(e.target.value)}
                placeholder={isFr 
                  ? "ex: Le Sénégal inaugure son nouveau terminal portuaire à Ndayane pour fluidifier le commerce ouest-africain avec la CEDEAO..."
                  : "e.g., Senegal inaugurates the new deepwater port in Ndayane to accelerate West African trade dynamics..."}
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 text-white p-4 rounded-xl text-xs leading-relaxed outline-none focus:border-orange-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Selector */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-orange-400 block">
                  {isFr ? 'Rubrique' : 'Category'}
                </label>
                <select
                  value={manualCategory}
                  onChange={e => setManualCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-lg p-2.5 outline-none focus:border-orange-500"
                >
                  {RSS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Storytelling Format Selector */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-orange-400 block">
                  {isFr ? 'Format du Récit' : 'Format / Depth'}
                </label>
                <select
                  value={manualStyleType}
                  onChange={e => setManualStyleType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-lg p-2.5 outline-none focus:border-orange-500"
                >
                  <option value="News">⚡ News Récit (~400 mots)</option>
                  <option value="Analysis">🔍 Analyse Stratégique (~1000 mots)</option>
                  <option value="Deep Dive">📜 Grand Angle / Dossier (1200+ mots)</option>
                </select>
              </div>

              {/* Engine Preference */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-orange-400 block">
                  {isFr ? 'Moteur d’Écriture' : 'Preferred AI Engine'}
                </label>
                <select
                  value={manualPreferredEngine}
                  onChange={e => setManualPreferredEngine(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-lg p-2.5 outline-none focus:border-orange-500"
                >
                  <option value="auto">🤖 Dual-Engine Auto Fallback</option>
                  <option value="gemini">Google Gemini 3.7 Flash</option>
                  <option value="groq">Groq Llama 3.3</option>
                  <option value="openrouter">OpenRouter Claude</option>
                  <option value="openai">OpenAI GPT-4o-mini</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                type="submit"
                disabled={promptLoading || !manualPrompt.trim()}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xl flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} className={promptLoading ? 'animate-spin' : ''} />
                <span>{promptLoading ? (isFr ? 'Rédaction IA...' : 'Writing Draft...') : (isFr ? 'Générer le Brouillon' : 'Write AI Draft')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== CHARTER & GUIDELINES ==================== */}
      {activeSubTab === 'guidelines' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-zinc-900 via-amber-950/30 to-zinc-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 text-xs font-mono font-bold px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
                    <Award size={14} />
                    {isFr ? 'Charte Éditoriale & Studio Moteur IA' : 'Editorial Charter & AI Style Guidelines'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider">
                  {isFr ? 'Garantir la Qualité Journalistique' : 'Preserve Journalistic Authority'}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {isFr 
                    ? 'Définissez la ligne éditoriale que chaque modèle d’intelligence artificielle doit scrupuleusement suivre.'
                    : 'Customize how our AI engines script viewpoints, frame economic analysis, and output tone.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guidelines Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-2">
                  {isFr ? '1. Directives d’Écriture & Consignes IA' : '1. Write Directives & Instructions'}
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">{isFr ? 'Directives Spécifiques :' : 'Custom AI Directives:'}</label>
                    <textarea
                      value={editorialGuidelines.customDirectives}
                      onChange={e => setEditorialGuidelines(prev => ({ ...prev, customDirectives: e.target.value }))}
                      rows={5}
                      placeholder={isFr ? "ex: Toujours apporter un éclairage d'économie politique locale. Favoriser la souveraineté ouest-africaine." : "e.g., Focus on regional monetary sovereignty, write balanced political pieces..."}
                      className="w-full bg-zinc-950 border border-zinc-850 text-white p-3 rounded-xl text-xs leading-relaxed outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">{isFr ? 'Commentaires du Rédacteur en Chef :' : 'Editor-in-Chief Comments:'}</label>
                    <textarea
                      value={editorialGuidelines.editorialComments}
                      onChange={e => setEditorialGuidelines(prev => ({ ...prev, editorialComments: e.target.value }))}
                      rows={3}
                      placeholder={isFr ? "ex: Pas d'exagération. Utiliser un vocabulaire technique correct pour l'économie régionale." : "Avoid generic marketing hype."}
                      className="w-full bg-zinc-950 border border-zinc-850 text-white p-3 rounded-xl text-xs leading-relaxed outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Side tools: Tone & forbidden tags */}
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-2">
                  {isFr ? '2. Ton & Clichés Interdits' : '2. Tone & Proscribed Terms'}
                </h3>

                {/* Tone select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">{isFr ? 'Ton Principal :' : 'Default Tone:'}</label>
                  <select
                    value={editorialGuidelines.preferredTone}
                    onChange={e => setEditorialGuidelines(prev => ({ ...prev, preferredTone: e.target.value as any }))}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs font-mono rounded-lg p-2 outline-none focus:border-amber-500"
                  >
                    <option value="analytical">🔍 {isFr ? 'Analytique & Factuel' : 'Analytical'}</option>
                    <option value="investigative">🕵 {isFr ? 'Enquêteur & Pointu' : 'Investigative'}</option>
                    <option value="diplomatic">🤝 {isFr ? 'Diplomatique & Nuancé' : 'Diplomatic'}</option>
                    <option value="dynamic">⚡ {isFr ? 'Dynamique & Moderne' : 'Dynamic'}</option>
                  </select>
                </div>

                {/* Banned Phrases */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">{isFr ? 'Termes & Mots Clichés Interdits :' : 'Banned Jargon & Clichés:'}</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newForbiddenTag}
                      onChange={(e) => setNewForbiddenTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddForbiddenPhrase())}
                      placeholder={isFr ? "Ajouter un mot (ex: game-changer)..." : "Add word..."}
                      className="flex-1 bg-zinc-950 border border-zinc-850 text-zinc-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddForbiddenPhrase}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
                    {editorialGuidelines.forbiddenPhrases.map((phrase) => (
                      <span
                        key={phrase}
                        className="bg-red-950/40 text-red-300 text-[10px] font-mono px-2 py-0.5 rounded border border-red-900/50 flex items-center gap-1 group"
                      >
                        <span>"{phrase}"</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveForbiddenPhrase(phrase)}
                          className="text-red-400 hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              onClick={handleResetGuidelines}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-zinc-850"
            >
              {isFr ? 'Réinitialiser' : 'Reset Defaults'}
            </button>
            <button
              onClick={handleSaveGuidelines}
              disabled={savingGuidelines}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-950/20"
            >
              {savingGuidelines ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{savingGuidelines ? (isFr ? 'Enregistrement...' : 'Saving...') : (isFr ? 'Enregistrer la Charte' : 'Save Editorial Charter')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Inspect Draft Modal overlay */}
      {inspectDraft && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <div className="flex items-center gap-2.5">
                <Bot className="text-orange-500" size={20} />
                <div>
                  <h3 className="font-extrabold text-white uppercase tracking-widest text-xs">
                    {isFr ? 'Atelier de relecture IA Perspective' : 'AI Re-Reading Studio'}
                  </h3>
                  <div className="flex gap-2 text-[9px] text-zinc-500 font-mono mt-0.5 uppercase font-bold">
                    <span>ID: {inspectDraft.id}</span>
                    <span>•</span>
                    <span>Category: {inspectDraft.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-zinc-950 p-0.5 border border-zinc-800 text-[9px] font-bold rounded-lg font-mono">
                  <button 
                    onClick={() => setInspectLanguage('fr')} 
                    className={`px-2 py-1 transition-all uppercase rounded-md cursor-pointer ${inspectLanguage === 'fr' ? 'bg-orange-600 text-white font-extrabold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Version FR
                  </button>
                  <button 
                    onClick={() => setInspectLanguage('en')} 
                    className={`px-2 py-1 transition-all uppercase rounded-md cursor-pointer ${inspectLanguage === 'en' ? 'bg-orange-600 text-white font-extrabold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Version EN
                  </button>
                </div>
                
                <button 
                  onClick={() => setInspectDraft(null)}
                  className="text-zinc-400 hover:text-white font-mono font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 font-sans text-sm leading-relaxed text-zinc-300">
              {/* Draft details */}
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-white leading-tight">
                  {inspectLanguage === 'fr' 
                    ? (inspectDraft.title?.fr || inspectDraft.title?.en) 
                    : (inspectDraft.title?.en || inspectDraft.title?.fr)}
                </h3>
                <p className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-serif italic">
                  {inspectLanguage === 'fr' 
                    ? (inspectDraft.excerpt?.fr || inspectDraft.excerpt?.en) 
                    : (inspectDraft.excerpt?.en || inspectDraft.excerpt?.fr)}
                </p>
              </div>

              {/* Perspective Brief */}
              {inspectDraft.perspectiveBrief && (
                <div className="bg-zinc-950 border border-zinc-800 border-t-4 border-t-[#E85D42] p-4 space-y-3 font-mono text-xs">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#E85D42] flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                    <Sparkles size={13} />
                    <span>Brief Perspective (L’Essentiel)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-zinc-900/80 p-3 rounded border border-zinc-800">
                      <strong className="text-white block mb-1 text-[10px]">📌 CE QU'IL S'EST PASSÉ :</strong>
                      <p className="leading-relaxed text-zinc-300">
                        {inspectLanguage === 'fr' 
                          ? (inspectDraft.perspectiveBrief.whatHappened?.fr || inspectDraft.perspectiveBrief.whatHappened?.en) 
                          : (inspectDraft.perspectiveBrief.whatHappened?.en || inspectDraft.perspectiveBrief.whatHappened?.fr)}
                      </p>
                    </div>
                    <div className="bg-zinc-900/80 p-3 rounded border border-zinc-800">
                      <strong className="text-white block mb-1 text-[10px]">⚡ POURQUOI CELA COMPTE :</strong>
                      <p className="leading-relaxed text-zinc-300">
                        {inspectLanguage === 'fr' 
                          ? (inspectDraft.perspectiveBrief.whyItMatters?.fr || inspectDraft.perspectiveBrief.whyItMatters?.en) 
                          : (inspectDraft.perspectiveBrief.whyItMatters?.en || inspectDraft.perspectiveBrief.whyItMatters?.fr)}
                      </p>
                    </div>
                    <div className="bg-zinc-900/80 p-3 rounded border border-zinc-800">
                      <strong className="text-white block mb-1 text-[10px]">🔍 À SURVEILLER ENSUITE :</strong>
                      <p className="leading-relaxed text-zinc-300">
                        {inspectLanguage === 'fr' 
                          ? (inspectDraft.perspectiveBrief.whatToWatchNext?.fr || inspectDraft.perspectiveBrief.whatToWatchNext?.en) 
                          : (inspectDraft.perspectiveBrief.whatToWatchNext?.en || inspectDraft.perspectiveBrief.whatToWatchNext?.fr)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Milestones if available */}
              {Array.isArray(inspectDraft.timeline) && inspectDraft.timeline.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 border-t-4 border-t-[#E85D42] p-4 space-y-3 font-mono text-xs">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#E85D42] flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span>Chronologie des Événements</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{inspectDraft.timeline.length} REPÈRES</span>
                  </h4>
                  <div className="space-y-2">
                    {inspectDraft.timeline.map((t, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                        <span className="font-mono text-[#E85D42] font-bold shrink-0">{t.date}</span>
                        <span className="text-zinc-300">
                          {inspectLanguage === 'fr' ? (t.description?.fr || t.description?.en) : (t.description?.en || t.description?.fr)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Actors if available */}
              {Array.isArray(inspectDraft.keyActors) && inspectDraft.keyActors.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 border-t-4 border-t-[#E85D42] p-4 space-y-3 font-mono text-xs">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#E85D42] flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span>Acteurs Clés & Positionnement</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{inspectDraft.keyActors.length} PROTAGONISTES</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {inspectDraft.keyActors.map((actor, idx) => (
                      <div key={idx} className="bg-zinc-900/80 p-3 rounded border border-zinc-800">
                        <div className="font-bold text-white flex items-center justify-between">
                          <span>{actor.name}</span>
                          <span className="text-[10px] text-[#E85D42] font-mono uppercase">{actor.role}</span>
                        </div>
                        <div className="text-zinc-300 mt-1.5 text-[11px] leading-relaxed">
                          {inspectLanguage === 'fr' ? (actor.significance?.fr || actor.significance?.en) : (actor.significance?.en || actor.significance?.fr)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-xl font-mono text-xs whitespace-pre-line leading-relaxed max-h-80 overflow-y-auto space-y-1">
                <strong className="text-zinc-100 block mb-3 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-800 pb-2">
                  Corps de l'article :
                </strong>
                {inspectLanguage === 'fr' 
                  ? (inspectDraft.body?.fr || inspectDraft.body?.en) 
                  : (inspectDraft.body?.en || inspectDraft.body?.fr)}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900">
              <button
                onClick={() => {
                  onEditArticle(inspectDraft);
                  setInspectDraft(null);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {isFr ? 'Modifier l’article' : 'Edit in Full Editor'}
              </button>

              <button
                onClick={() => handlePublishSingleDraft(inspectDraft)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>{isFr ? 'Publier en Direct' : 'Publish Live'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
