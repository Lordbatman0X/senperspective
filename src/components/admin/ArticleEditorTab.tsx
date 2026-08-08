import React, { useState, useEffect } from 'react';
import { Article, BilingualText, KeyActor, TimelineEvent, PerspectiveBrief, StructuralForces } from '../../types';
import { useStore } from '../../store';
import { Save, ArrowLeft, Eye, Edit, Trash2, Plus, ImageIcon, Sparkles, FileText, Check, Upload, HelpCircle, HelpCircle as HelpIcon, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ARTICLE_CATEGORIES } from '../../constants';

interface ArticleEditorTabProps {
  article: Article | null;
  allArticles: Article[];
  onSave: (article: Article) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  openMediaSelector: (onSelect: (url: string) => void) => void;
  language: 'fr' | 'en';
}

export function ArticleEditorTab({
  article,
  allArticles,
  onSave,
  onCancel,
  onDelete,
  openMediaSelector,
  language,
}: ArticleEditorTabProps) {
  // Toggle split pane preview vs single edit view
  const [splitView, setSplitView] = useState<boolean>(true);
  const [activeLangTab, setActiveLangTab] = useState<'fr' | 'en'>('fr');

  // Form states matching types.ts schema properties
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<string>(ARTICLE_CATEGORIES[0].fr);
  const [type, setType] = useState<'News' | 'Analysis' | 'Deep Dive' | 'Explainer' | 'Opinion'>('Analysis');
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [authorName, setAuthorName] = useState('Perspective Staff');
  const [youtubeId, setYoutubeId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Bilingual strings
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [excerptFr, setExcerptFr] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [bodyFr, setBodyFr] = useState('');
  const [bodyEn, setBodyEn] = useState('');

  // Structured forms state
  const [whatHappenedFr, setWhatHappenedFr] = useState('');
  const [whatHappenedEn, setWhatHappenedEn] = useState('');
  const [whyItMattersFr, setWhyItMattersFr] = useState('');
  const [whyItMattersEn, setWhyItMattersEn] = useState('');
  const [whatToWatchNextFr, setWhatToWatchNextFr] = useState('');
  const [whatToWatchNextEn, setWhatToWatchNextEn] = useState('');

  // Key Actors form builder
  const [keyActors, setKeyActors] = useState<KeyActor[]>([]);
  // Timeline form builder
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  // Structural Forces states
  const [forcePolFr, setForcePolFr] = useState('');
  const [forcePolEn, setForcePolEn] = useState('');
  const [forceEcoFr, setForceEcoFr] = useState('');
  const [forceEcoEn, setForceEcoEn] = useState('');
  const [forceSocFr, setForceSocFr] = useState('');
  const [forceSocEn, setForceSocEn] = useState('');
  const [forceIntFr, setForceIntFr] = useState('');
  const [forceIntEn, setForceIntEn] = useState('');

  // Relations list state
  const [relatedIds, setRelatedIds] = useState<string[]>([]);

  // Word & read time estimates
  const [wordCount, setWordCount] = useState({ fr: 0, en: 0 });

  // Custom Ad Link bindings
  const [adImageUrlState, setAdImageUrlState] = useState('');
  const [adLinkState, setAdLinkState] = useState('');

  useEffect(() => {
    if (article) {
      setSlug(article.slug || article.id);
      setCategory(article.category as any);
      setType(article.type as any);
      setIsPublished(!!article.isPublished);
      setIsFeatured(!!article.isFeatured);
      setCommentsEnabled(article.commentsEnabled !== false);
      setImageUrl(article.featuredImage || '');
      setAuthorName(article.author || 'Perspective Staff');
      setYoutubeId(article.youtubeVideoId || '');
      setTags(article.tags || []);
      setAdImageUrlState(article.adImageUrl || '');
      setAdLinkState(article.adLink || '');
      
      setTitleFr(article.title?.fr || '');
      setTitleEn(article.title?.en || '');
      setExcerptFr(article.excerpt?.fr || '');
      setExcerptEn(article.excerpt?.en || '');
      setBodyFr(article.body?.fr || '');
      setBodyEn(article.body?.en || '');

      const pb = article.perspectiveBrief;
      setWhatHappenedFr(pb?.whatHappened?.fr || '');
      setWhatHappenedEn(pb?.whatHappened?.en || '');
      setWhyItMattersFr(pb?.whyItMatters?.fr || '');
      setWhyItMattersEn(pb?.whyItMatters?.en || '');
      setWhatToWatchNextFr(pb?.whatToWatchNext?.fr || '');
      setWhatToWatchNextEn(pb?.whatToWatchNext?.en || '');

      setKeyActors(article.keyActors || []);
      setTimeline(article.timeline || []);

      const sf = article.structuralForces;
      setForcePolFr(sf?.political?.fr || '');
      setForcePolEn(sf?.political?.en || '');
      setForceEcoFr(sf?.economic?.fr || '');
      setForceEcoEn(sf?.economic?.en || '');
      setForceSocFr(sf?.social?.fr || '');
      setForceSocEn(sf?.social?.en || '');
      setForceIntFr(sf?.international?.fr || '');
      setForceIntEn(sf?.international?.en || '');

      setRelatedIds(article.relatedArticleIds || []);
    } else {
      // Create defaults
      const autoId = 'art-' + Date.now().toString();
      setSlug(autoId);
      setCategory('Politique');
      setType('Analysis');
      setIsPublished(false);
      setIsFeatured(false);
      setCommentsEnabled(true);
      setImageUrl('');
      setAuthorName('Perspective Staff');
      setYoutubeId('');
      setTags([]);
      setAdImageUrlState('');
      setAdLinkState('');
      
      setTitleFr('');
      setTitleEn('');
      setExcerptFr('');
      setExcerptEn('');
      setBodyFr('');
      setBodyEn('');

      setWhatHappenedFr('');
      setWhatHappenedEn('');
      setWhyItMattersFr('');
      setWhyItMattersEn('');
      setWhatToWatchNextFr('');
      setWhatToWatchNextEn('');

      setKeyActors([]);
      setTimeline([]);

      setForcePolFr('');
      setForcePolEn('');
      setForceEcoFr('');
      setForceEcoEn('');
      setForceSocFr('');
      setForceSocEn('');
      setForceIntFr('');
      setForceIntEn('');

      setRelatedIds([]);
    }
  }, [article]);

  useEffect(() => {
    const splitCount = (text: string) => text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    setWordCount({
      fr: splitCount(bodyFr),
      en: splitCount(bodyEn)
    });
  }, [bodyFr, bodyEn]);

  const handleDeviceImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          if (data.title) {
            setTitleFr(data.title.fr || data.title || titleFr);
            setTitleEn(data.title.en || titleEn);
          }
          if (data.body) {
            setBodyFr(data.body.fr || data.body || bodyFr);
            setBodyEn(data.body.en || bodyEn);
          }
          if (data.excerpt) {
            setExcerptFr(data.excerpt.fr || data.excerpt || excerptFr);
            setExcerptEn(data.excerpt.en || excerptEn);
          }
          if (data.category) setCategory(data.category);
          if (data.type) setType(data.type);
          if (data.imageUrl) setImageUrl(data.imageUrl);
          if (data.tags) setTags(data.tags);
        } else if (file.name.endsWith('.md')) {
          // Assume markdown is the body of the current editor language tab
          if (activeLangTab === 'fr') {
            setBodyFr(text);
          } else {
            setBodyEn(text);
          }
        }
      } catch (err) {
        alert('Could not parse imported content file. Ensure correct Markdown (.md) or structure Schema (.json) format.');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFr.trim() && !titleEn.trim()) {
      alert('Please fill out at least a French or English Title for this journal entry!');
      return;
    }

    const compiled: Article = {
      id: article?.id || slug || 'art-' + Date.now().toString(),
      slug: slug || article?.slug || 'art-' + Date.now().toString(),
      date: article?.date || new Date().toISOString(),
      category: category as any,
      type,
      isPublished,
      isFeatured,
      commentsEnabled,
      featuredImage: imageUrl,
      youtubeVideoId: youtubeId,
      author: authorName.trim() || 'Perspective Staff',
      readingTime: Math.max(1, Math.round(wordCount.fr / 200)),
      tags,
      title: { fr: titleFr || titleEn, en: titleEn || titleFr },
      excerpt: { fr: excerptFr || excerptEn, en: excerptEn || excerptFr },
      body: { fr: bodyFr || bodyEn, en: bodyEn || bodyFr },
      perspectiveBrief: {
        whatHappened: { fr: whatHappenedFr || whatHappenedEn, en: whatHappenedEn || whatHappenedFr },
        whyItMatters: { fr: whyItMattersFr || whyItMattersEn, en: whyItMattersEn || whyItMattersFr },
        whatToWatchNext: { fr: whatToWatchNextFr || whatToWatchNextEn, en: whatToWatchNextEn || whatToWatchNextFr }
      },
      keyActors,
      timeline,
      structuralForces: {
        political: { fr: forcePolFr || forcePolEn, en: forcePolEn || forcePolFr },
        economic: { fr: forceEcoFr || forceEcoEn, en: forceEcoEn || forceEcoFr },
        social: { fr: forceSocFr || forceEcoFr, en: forceSocEn || forceEcoEn },
        international: { fr: forceIntFr || forceIntEn, en: forceIntEn || forceIntFr }
      },
      relatedArticleIds: relatedIds,
      adImageUrl: adImageUrlState || undefined,
      adLink: adLinkState || undefined
    };

    onSave(compiled);
  };

  // Tag list managers
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Form List Builders for Key Actors
  const handleAddActor = () => {
    const newActor: KeyActor = {
      name: '',
      role: '',
      significance: { fr: '', en: '' }
    };
    setKeyActors([...keyActors, newActor]);
  };

  const handleUpdateActor = (index: number, field: keyof KeyActor, val: any, subfield?: 'fr' | 'en') => {
    const draft = [...keyActors];
    if (subfield) {
      draft[index] = {
        ...draft[index],
        significance: {
          ...draft[index].significance,
          [subfield]: val
        }
      };
    } else {
      draft[index] = {
        ...draft[index],
        [field]: val
      } as any;
    }
    setKeyActors(draft);
  };

  const handleRemoveActor = (index: number) => {
    setKeyActors(keyActors.filter((_, i) => i !== index));
  };

  // Form List Builders for Timeline Events
  const handleAddTimeline = () => {
    const newEvent: TimelineEvent = {
      date: '',
      description: { fr: '', en: '' }
    };
    setTimeline([...timeline, newEvent]);
  };

  const handleUpdateTimeline = (index: number, field: string, val: any, subfield?: 'fr' | 'en') => {
    const draft = [...timeline];
    if (field === 'date') {
      draft[index] = { ...draft[index], date: val };
    } else if (field === 'description' && subfield) {
      draft[index] = {
        ...draft[index],
        description: {
          ...draft[index].description,
          [subfield]: val
        }
      };
    }
    setTimeline(draft);
  };

  const handleRemoveTimeline = (index: number) => {
    setTimeline(timeline.filter((_, i) => i !== index));
  };

  // Select Ad relations
  const toggleRelation = (id: string) => {
    if (relatedIds.includes(id)) {
      setRelatedIds(relatedIds.filter(r => r !== id));
    } else {
      setRelatedIds([...relatedIds, id]);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Editorial Menu Bar */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4 bg-zinc-900/90 backdrop-blur-md p-4 shadow-xl rounded-lg">
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={onCancel}
            className="p-2 border border-zinc-700 hover:border-zinc-500 bg-zinc-950 text-zinc-300 hover:text-white transition-colors rounded-md"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-[#E85D42]">
              {article ? 'Edit Journal Frame' : 'New Journal Frame'}
            </h2>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">DUAL-PANE PREVIEW PUBLISHER ENGINE</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {article && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(article.id)}
              className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/50 px-3 py-2 text-xs font-bold uppercase rounded-md transition-all cursor-pointer"
              title="Delete this article permanently"
            >
              <Trash2 size={14} /> {language === 'fr' ? 'Supprimer' : 'Delete'}
            </button>
          )}

          <label className="flex items-center gap-1.5 bg-zinc-950 text-zinc-100 border border-zinc-700/80 px-3 py-2 text-xs font-bold uppercase cursor-pointer hover:border-[#E85D42] rounded-md transition-all">
            <Upload size={14} className="text-[#E85D42]" /> {language === 'fr' ? 'Fichier .md/.json' : 'MD/JSON Import'}
            <input 
              type="file" 
              accept=".md,.json" 
              onChange={handleDeviceImport} 
              className="hidden" 
            />
          </label>

          <button
            type="button"
            onClick={() => setSplitView(!splitView)}
            className="flex items-center gap-1 bg-zinc-950 text-zinc-200 border border-zinc-700/80 px-3 py-2 text-xs font-bold uppercase hover:bg-zinc-800 rounded-md transition-all"
          >
            <Eye size={14} /> {splitView ? (language === 'fr' ? 'Aperçu Direct' : 'Live Preview') : (language === 'fr' ? 'Double Aperçu' : 'Side-by-side')}
          </button>

          <button
            onClick={handleSave}
            type="button"
            className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] text-white px-5 py-2.5 text-xs font-black uppercase tracking-widest leading-none shadow-md transition-all cursor-pointer rounded-xs"
          >
            <Save size={14} /> {language === 'fr' ? 'Enregistrer' : 'Save Frame'}
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${splitView ? 'lg:grid-cols-2' : ''} gap-8`}>
        {/* Left Side: Rich Form Input Pane */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Metadata Section */}
          <div className="bg-zinc-900/80 backdrop-blur-md p-6 border border-zinc-800 shadow-xl space-y-4 rounded-lg">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#E85D42] border-b border-zinc-800 pb-2 flex items-center gap-1.5">
              <FileText size={14} /> Frame Metadata & Router Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">Article Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-semibold focus:outline-none focus:border-[#E85D42] rounded-md"
                >
                  {ARTICLE_CATEGORIES.map(c => (
                    <option key={c.id} value={c.fr}>{c.fr} / {c.en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">
                  Journal Type & Niveau d'Accès Paywall
                </label>
                <select 
                  value={type} 
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-semibold focus:outline-none focus:border-[#E85D42] rounded-md"
                >
                  <option value="News">News — 🟢 Accès Libre (Gratuit, sans quota)</option>
                  <option value="Analysis">Analysis — 🟡 Paywall Compteur (Soft Metered)</option>
                  <option value="Explainer">Explainer — 🟡 Paywall Compteur (Soft Metered)</option>
                  <option value="Opinion">Opinion — 🟡 Paywall Compteur (Soft Metered)</option>
                  <option value="Deep Dive">Deep Dive — 🔒 Paywall Stricte (Membres Exclusif)</option>
                </select>

                {/* Dynamic Paywall Rule Rationalization Card */}
                <div className="mt-2 p-2.5 bg-zinc-900 border border-zinc-800 text-[10.5px] font-sans leading-snug rounded-md">
                  {type === 'News' && (
                    <p className="text-emerald-400 font-medium">
                      🟢 <strong>Accès Libre (Totalement Gratuit)</strong> : Les brèves et actualités instantanées sont ouvertes à 100% à tous les visiteurs et n'entament pas le quota de lecture.
                    </p>
                  )}
                  {(type === 'Analysis' || type === 'Explainer' || type === 'Opinion') && (
                    <p className="text-amber-400 font-medium">
                      🟡 <strong>Paywall Compteur (Soft Metered)</strong> : Gratuit jusqu'au quota mensuel (ex: 3 articles). Une fois le quota dépassé, une invitation à s'inscrire s'affiche.
                    </p>
                  )}
                  {type === 'Deep Dive' && (
                    <p className="text-rose-400 font-medium">
                      🔒 <strong>Paywall Stricte (Club Membres Exclusif)</strong> : Dossier d'investigation d'élite. Seuls les Membres connectés et Administrateurs ont accès au texte intégral.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">Auteur / Author Name</label>
                <input 
                  type="text" 
                  value={authorName} 
                  onChange={e => setAuthorName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-medium focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                  placeholder="Nom de l'auteur (ex: Cheikh Anta Diop)..." 
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">ID URL Slug</label>
                <input 
                  type="text" 
                  value={slug} 
                  required
                  onChange={e => setSlug(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-medium focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                  placeholder="l-economie-senegalaise..." 
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-200 select-none cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPublished} 
                  onChange={e => setIsPublished(e.target.checked)}
                  className="h-4 w-4 accent-[#E85D42]" 
                />
                Is Live / Published
              </label>
              <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-200 select-none cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isFeatured} 
                  onChange={e => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 accent-[#E85D42]" 
                />
                Featured Hero Frame
              </label>
              <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-200 select-none cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={commentsEnabled} 
                  onChange={e => setCommentsEnabled(e.target.checked)}
                  className="h-4 w-4 accent-[#E85D42]" 
                />
                Comments Enabled
              </label>
            </div>

            {/* Targeted Ad Selection */}
            <div className="border-t border-zinc-800 pt-4 mt-2">
              <label className="text-[10px] font-black text-[#E85D42] uppercase tracking-wider block mb-1.5">
                {language === 'fr' ? 'Campagne Publicitaire Dédiée (Liaison Directe)' : 'Targeted Advertisement (Direct Bind)'}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select
                    value={(() => {
                      const storeAds = useStore.getState().ads || [];
                      const matched = storeAds.find(a => a.imageUrl === adImageUrlState && a.targetUrl === adLinkState);
                      return matched ? matched.id : '';
                    })()}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setAdImageUrlState('');
                        setAdLinkState('');
                      } else {
                        const storeAds = useStore.getState().ads || [];
                        const matched = storeAds.find(a => a.id === selectedId);
                        if (matched) {
                          setAdImageUrlState(matched.imageUrl);
                          setAdLinkState(matched.targetUrl);
                        }
                      }
                    }}
                    className="w-full text-xs font-semibold bg-zinc-950 border border-zinc-700/80 p-2 focus:outline-none focus:border-[#E85D42] text-zinc-100 rounded-md"
                  >
                    <option value="">{language === 'fr' ? '-- Rotation de Campagnes Pub Normales --' : '-- Default / Random Ad Rotations --'}</option>
                    {(useStore.getState().ads || []).map(ad => (
                      <option key={ad.id} value={ad.id}>
                        {ad.name} ({ad.position.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {language === 'fr' 
                      ? 'Lier cet article à une campagne publicitaire spécifique pour forcer son affichage.' 
                      : 'Force-bind this article to an active campaign from your ad pool, overriding random rotations.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={adImageUrlState}
                    onChange={(e) => setAdImageUrlState(e.target.value)}
                    placeholder={language === 'fr' ? 'URL de l\'image de l\'annonce...' : 'Custom Ad Banner Image URL override...'}
                    className="w-full text-[11px] font-mono bg-zinc-950 border border-zinc-700/80 p-1.5 text-zinc-100 rounded-md"
                  />
                  <input
                    type="text"
                    value={adLinkState}
                    onChange={(e) => setAdLinkState(e.target.value)}
                    placeholder={language === 'fr' ? 'Lien de destination (URL)...' : 'Custom Ad Link override...'}
                    className="w-full text-[11px] font-mono bg-zinc-950 border border-zinc-700/80 p-1.5 text-zinc-100 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bilingual Tab selector for Main Content */}
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-xl overflow-hidden flex flex-col rounded-lg">
            <div className="bg-zinc-950 text-white flex justify-between items-center p-3 border-b border-zinc-800">
              <div className="flex gap-2">
                {(['fr', 'en'] as const).map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setActiveLangTab(l)}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-xs transition-colors cursor-pointer ${
                      activeLangTab === l
                        ? 'bg-[#E85D42] border-[#E85D42] text-white'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {l === 'fr' ? 'French Content (FR)' : 'English Content (EN)'}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest hidden sm:inline-block">SIAMESE ARTICLE TRANSLATOR</span>
            </div>

            <div className="p-6 space-y-4">
              {activeLangTab === 'fr' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">Titre (FR)</label>
                    <input 
                      type="text" 
                      value={titleFr}
                      onChange={e => setTitleFr(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-base font-extrabold focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      placeholder="Saisissez le titre en français" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">Extrait court (FR)</label>
                    <textarea 
                      value={excerptFr}
                      onChange={e => setExcerptFr(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs resize-none focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      placeholder="Une brève description résumant l'article" 
                      rows={2}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">Texte de l'article (Markdown FR)</label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-all">
                          <Upload size={12} className="text-[#E85D42]" />
                          <span>Insérer Image</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (typeof ev.target?.result === 'string') {
                                    setBodyFr(prev => prev + `\n\n![Image](${ev.target?.result})\n\n`);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                            className="hidden" 
                          />
                        </label>
                        <span className="text-[10px] text-zinc-400 font-mono">{wordCount.fr} mots • {Math.round(wordCount.fr / 200)} min</span>
                      </div>
                    </div>
                    <textarea 
                      value={bodyFr}
                      onChange={e => setBodyFr(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      placeholder="# Rédigez le corps du texte en Markdown..." 
                      rows={12}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">Title (EN)</label>
                    <input 
                      type="text" 
                      value={titleEn}
                      onChange={e => setTitleEn(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-base font-extrabold focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      placeholder="Enter title in English" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">Short Excerpt (EN)</label>
                    <textarea 
                      value={excerptEn}
                      onChange={e => setExcerptEn(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs resize-none focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      placeholder="A short description summarizing this article" 
                      rows={2}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">Article Body (Markdown EN)</label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-all">
                          <Upload size={12} className="text-[#E85D42]" />
                          <span>Insert Image</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (typeof ev.target?.result === 'string') {
                                    setBodyEn(prev => prev + `\n\n![Image](${ev.target?.result})\n\n`);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                            className="hidden" 
                          />
                        </label>
                        <span className="text-[10px] text-zinc-400 font-mono">{wordCount.en} words • {Math.round(wordCount.en / 200)} min</span>
                      </div>
                    </div>
                    <textarea 
                      value={bodyEn}
                      onChange={e => setBodyEn(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      placeholder="# Write the markdown body text in English..." 
                      rows={12}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Links Section */}
          <div className="bg-zinc-900/80 backdrop-blur-md p-6 border border-zinc-800 shadow-xl space-y-4 rounded-lg">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#E85D42] border-b border-zinc-800 pb-2 flex items-center gap-1.5">
              <ImageIcon size={14} /> Assets & Cover Imagery
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">
                  {language === 'fr' ? 'Image de Couverture (URL ou Fichier Appareil)' : 'Header Cover Image (URL or Device File)'}
                </label>
                <div className="flex flex-wrap gap-2">
                  <input 
                    type="text" 
                    value={imageUrl} 
                    onChange={e => setImageUrl(e.target.value)} 
                    className="flex-1 min-w-[180px] bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                    placeholder="https://example.com/banner.jpg" 
                  />
                  
                  {/* Direct device upload button */}
                  <label className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 px-3 py-2 text-xs font-bold uppercase rounded-md cursor-pointer transition-all shrink-0">
                    <Upload size={14} className="text-[#E85D42]" />
                    <span>{language === 'fr' ? 'Importer Fichier' : 'Upload File'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 8 * 1024 * 1024) {
                            alert(language === 'fr' ? 'Image trop lourde (Max 8Mo)' : 'Image too heavy (Max 8MB)');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (typeof ev.target?.result === 'string') {
                              setImageUrl(ev.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                      className="hidden" 
                    />
                  </label>

                  <button 
                    type="button" 
                    onClick={() => openMediaSelector(setImageUrl)}
                    className="border border-[#E85D42] text-[#E85D42] p-2 hover:bg-[#E85D42]/10 transition-colors rounded-md cursor-pointer shrink-0"
                    title="Médiathèque"
                  >
                    <ImageIcon size={15} />
                  </button>
                </div>

                {/* Cover Image Preview Thumbnail */}
                {imageUrl && (
                  <div className="mt-3 relative w-36 h-24 border border-zinc-700 rounded-md overflow-hidden bg-black/50 group">
                    <img src={imageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setImageUrl('')}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                      title="Supprimer l'image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">Embedded YouTube ID</label>
                <input 
                  type="text" 
                  value={youtubeId} 
                  onChange={e => setYoutubeId(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                  placeholder="e.g. jNQXAC9IVRw (ID only)" 
                />
              </div>
            </div>
          </div>

          {/* Perspective Brief Block Form (FR/EN) */}
          <div className="bg-zinc-900/80 backdrop-blur-md p-6 border border-zinc-800 shadow-xl space-y-4 rounded-lg">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#E85D42] border-b border-zinc-800 pb-2 flex items-center gap-1.5">
              <Sparkles size={14} /> Perspective Brief Blocks (Visual Highlight Frame)
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-300 font-bold uppercase block mb-1">What Happened (FR)</label>
                  <textarea rows={2} className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" value={whatHappenedFr} onChange={e => setWhatHappenedFr(e.target.value)} placeholder="Que s'est-il passé ?" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-300 font-bold uppercase block mb-1">What Happened (EN)</label>
                  <textarea rows={2} className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" value={whatHappenedEn} onChange={e => setWhatHappenedEn(e.target.value)} placeholder="What happened?" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-300 font-bold uppercase block mb-1">Why It Matters (FR)</label>
                  <textarea rows={2} className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" value={whyItMattersFr} onChange={e => setWhyItMattersFr(e.target.value)} placeholder="Pourquoi cela a-t-il de l'importance ?" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-300 font-bold uppercase block mb-1">Why It Matters (EN)</label>
                  <textarea rows={2} className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" value={whyItMattersEn} onChange={e => setWhyItMattersEn(e.target.value)} placeholder="Why does it matter?" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-300 font-bold uppercase block mb-1">What To Watch Next (FR)</label>
                  <textarea rows={2} className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" value={whatToWatchNextFr} onChange={e => setWhatToWatchNextFr(e.target.value)} placeholder="Que faut-il surveiller ?" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-300 font-bold uppercase block mb-1">What To Watch Next (EN)</label>
                  <textarea rows={2} className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" value={whatToWatchNextEn} onChange={e => setWhatToWatchNextEn(e.target.value)} placeholder="What to watch next?" />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Form Builder: Key Actors */}
          <div className="bg-zinc-900/80 backdrop-blur-md p-6 border border-zinc-800 shadow-xl space-y-4 rounded-lg">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#E85D42] flex items-center gap-1.5">
                <Sparkles size={14} /> Key Actors Form Builder (Context)
              </h3>
              <button 
                type="button" 
                onClick={handleAddActor} 
                className="text-[10px] bg-zinc-950 text-white font-bold px-3 py-1.5 uppercase hover:bg-[#E85D42] border border-zinc-700 transition-colors rounded-xs cursor-pointer"
              >
                + Add Actor
              </button>
            </div>

            <div className="space-y-4">
              {keyActors.map((actor, idx) => (
                <div key={idx} className="bg-zinc-950/80 p-4 border border-zinc-800 relative space-y-3 rounded-md">
                  <button 
                    type="button" 
                    onClick={() => handleRemoveActor(idx)}
                    className="absolute top-2 right-2 text-zinc-400 hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Actor Full Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                        value={actor.name} 
                        onChange={e => handleUpdateActor(idx, 'name', e.target.value)} 
                        placeholder="Amadou Diop" 
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Role / Position</label>
                      <input 
                        type="text" 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                        value={actor.role} 
                        onChange={e => handleUpdateActor(idx, 'role', e.target.value)} 
                        placeholder="Ministre de l'Agriculture" 
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Significance text (FR)</label>
                      <textarea 
                        rows={1.5} 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                        value={actor.significance?.fr} 
                        onChange={e => handleUpdateActor(idx, 'significance', e.target.value, 'fr')} 
                        placeholder="Exprime sa vision quant au projet..." 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Significance text (EN)</label>
                      <textarea 
                        rows={1.5} 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                        value={actor.significance?.en} 
                        onChange={e => handleUpdateActor(idx, 'significance', e.target.value, 'en')} 
                        placeholder="Expresses vision with respect to the project..." 
                      />
                    </div>
                  </div>
                </div>
              ))}
              {keyActors.length === 0 && (
                <p className="text-xs text-zinc-400 italic text-center py-4">No key actors catalogued yet. Click Add Actor to insert.</p>
              )}
            </div>
          </div>

          {/* Interactive Form Builder: Timeline events */}
          <div className="bg-zinc-900/80 backdrop-blur-md p-6 border border-zinc-800 shadow-xl space-y-4 rounded-lg">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#E85D42] flex items-center gap-1.5">
                <Sparkles size={14} /> Chronological Timeline Events
              </h3>
              <button 
                type="button" 
                onClick={handleAddTimeline} 
                className="text-[10px] bg-zinc-950 text-white font-bold px-3 py-1.5 uppercase hover:bg-[#E85D42] border border-zinc-700 transition-colors rounded-xs cursor-pointer"
              >
                + Add Event
              </button>
            </div>

            <div className="space-y-4">
              {timeline.map((event, idx) => (
                <div key={idx} className="bg-zinc-950/80 p-4 border border-zinc-800 relative space-y-3 rounded-md">
                  <button 
                    type="button" 
                    onClick={() => handleRemoveTimeline(idx)}
                    className="absolute top-2 right-2 text-zinc-400 hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Date / Time string</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      value={event.date} 
                      onChange={e => handleUpdateTimeline(idx, 'date', e.target.value)} 
                      placeholder="e.g. 15 Mars 2026" 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Description (FR)</label>
                      <textarea 
                        rows={1.5} 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                        value={event.description?.fr} 
                        onChange={e => handleUpdateTimeline(idx, 'description', e.target.value, 'fr')} 
                        placeholder="Création de l'incubateur technologique..." 
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Description (EN)</label>
                      <textarea 
                        rows={1.5} 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                        value={event.description?.en} 
                        onChange={e => handleUpdateTimeline(idx, 'description', e.target.value, 'en')} 
                        placeholder="Creation of the tech incubator..." 
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-xs text-zinc-400 italic text-center py-4">No timeline landmarks catalogued. Click Add Event.</p>
              )}
            </div>
          </div>

          {/* Structural Forces Grids Builder */}
          <div className="bg-zinc-900/80 backdrop-blur-md p-6 border border-zinc-800 shadow-xl space-y-4 rounded-lg">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#E85D42] border-b border-zinc-800 pb-2">
              Structural Forces Grids
            </h3>
            <div className="space-y-4">
              {/* Political */}
              <div className="border border-zinc-800 p-4 bg-zinc-950/60 rounded-md">
                <span className="text-[10px] font-mono text-zinc-400 block mb-2 uppercase">POLITICAL FORCES</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <textarea value={forcePolFr} onChange={e => setForcePolFr(e.target.value)} placeholder="Variables politiques (FR)" className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" rows={2} />
                  </div>
                  <div>
                    <textarea value={forcePolEn} onChange={e => setForcePolEn(e.target.value)} placeholder="Political variables (EN)" className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" rows={2} />
                  </div>
                </div>
              </div>

              {/* Economic */}
              <div className="border border-zinc-800 p-4 bg-zinc-950/60 rounded-md">
                <span className="text-[10px] font-mono text-zinc-400 block mb-2 uppercase">ECONOMIC FORCES</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <textarea value={forceEcoFr} onChange={e => setForceEcoFr(e.target.value)} placeholder="Facteurs économiques (FR)" className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" rows={2} />
                  </div>
                  <div>
                    <textarea value={forceEcoEn} onChange={e => setForceEcoEn(e.target.value)} placeholder="Economic factors (EN)" className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" rows={2} />
                  </div>
                </div>
              </div>

              {/* Social */}
              <div className="border border-zinc-800 p-4 bg-zinc-950/60 rounded-md">
                <span className="text-[10px] font-mono text-zinc-400 block mb-2 uppercase">SOCIAL FORCES</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <textarea value={forceSocFr} onChange={e => setForceSocFr(e.target.value)} placeholder="Influences sociales & démographiques (FR)" className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" rows={2} />
                  </div>
                  <div>
                    <textarea value={forceSocEn} onChange={e => setForceSocEn(e.target.value)} placeholder="Social & demographic drivers (EN)" className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" rows={2} />
                  </div>
                </div>
              </div>

              {/* International */}
              <div className="border border-zinc-800 p-4 bg-zinc-950/60 rounded-md">
                <span className="text-[10px] font-mono text-zinc-400 block mb-2 uppercase">INTERNATIONAL INFLUENCE</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <textarea value={forceIntFr} onChange={e => setForceIntFr(e.target.value)} placeholder="Géopolitique et contexte global (FR)" className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" rows={2} />
                  </div>
                  <div>
                    <textarea value={forceIntEn} onChange={e => setForceIntEn(e.target.value)} placeholder="Geopolitics and global context (EN)" className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" rows={2} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comma tags section and Related articles links */}
          <div className="bg-zinc-900/80 backdrop-blur-md p-6 border border-zinc-800 shadow-xl space-y-4 rounded-lg">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#E85D42] border-b border-zinc-800 pb-2">
              Cross-Relations & Keyword Tags
            </h3>

            {/* Tags builder */}
            <div>
              <label className="text-[10px] text-zinc-300 font-bold uppercase block mb-1">Keyword Tags</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={tagInput} 
                  onChange={e => setTagInput(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                  placeholder="e.g. Sénégal, Énergie, Réforme (press Enter)"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                />
                <button type="button" onClick={handleAddTag} className="bg-zinc-950 text-white border border-zinc-700 px-4 text-xs uppercase font-bold hover:bg-zinc-800 rounded-md cursor-pointer">Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map(t => (
                  <span key={t} className="bg-[#E85D42]/20 border border-[#E85D42]/40 text-[#E85D42] py-0.5 px-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 select-none rounded-xs">
                    {t} <X size={10} className="hover:text-white cursor-pointer" onClick={() => handleRemoveTag(t)} />
                  </span>
                ))}
                {tags.length === 0 && (
                  <span className="text-[10.5px] text-zinc-400 italic">No keyword tags assigned yet.</span>
                )}
              </div>
            </div>

            {/* Related articles relationships */}
            <div className="pt-2">
              <label className="text-[10px] text-zinc-300 font-bold uppercase block mb-2">Related Articles Connectivity</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-zinc-800 p-3 bg-zinc-950/80 rounded-md">
                {allArticles.filter(a => a.id !== article?.id).map(a => (
                  <label key={a.id} className="flex items-center gap-2 text-xs font-semibold text-zinc-200 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="accent-[#E85D42]"
                      checked={relatedIds.includes(a.id)} 
                      onChange={() => toggleRelation(a.id)}
                    />
                    <span className="truncate">{a.title?.fr || a.title?.en}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Right Side: Visual Markdown preview split pane */}
        {splitView && (
          <div className="hidden lg:block border border-zinc-800 bg-zinc-900/90 backdrop-blur-md p-8 h-fit lg:sticky lg:top-8 overflow-y-auto max-h-[90vh] shadow-2xl font-sans rounded-lg">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#E85D42] flex items-center gap-2">
                <Eye size={14} /> LIVE NEWSROOM VISUAL PREVIEW
              </h3>
              <span className="text-[9px] bg-[#E85D42] text-white px-2 py-0.5 font-bold uppercase font-mono tracking-wider rounded-xs">
                Active Lang: {activeLangTab.toUpperCase()}
              </span>
            </div>

            {/* Main Visual Preview wrapper */}
            <div className="space-y-6">
              {/* Category flag & type badge */}
              <div className="flex gap-2 items-center">
                <span className="text-xs text-[#E85D42] font-extrabold uppercase tracking-widest font-mono select-none">
                  {category}
                </span>
                <span className="h-1.5 w-1.5 bg-zinc-700 rounded-full" />
                <span className="text-[10px] bg-zinc-950 text-zinc-100 border border-zinc-700 px-2 py-0.5 font-bold tracking-widest uppercase rounded-xs">
                  {type}
                </span>
              </div>

              {/* Title heading */}
              <h1 className="text-2xl font-black uppercase text-white tracking-normal leading-tight">
                {activeLangTab === 'fr' ? titleFr || 'Sans Titre' : titleEn || 'Untitled Frame'}
              </h1>

              {/* Short Description */}
              <p className="text-sm font-semibold text-zinc-400 italic pl-3 border-l-2 border-[#E85D42]">
                {activeLangTab === 'fr' ? excerptFr || 'Aucun extrait...' : excerptEn || 'No excerpt yet...'}
              </p>

              {/* Cover visual placeholder */}
              {imageUrl ? (
                <div className="aspect-video w-full overflow-hidden border border-zinc-800 shadow-sm rounded-md">
                  <img src={imageUrl} alt="Frame visual" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-zinc-950 flex items-center justify-center text-zinc-500 italic text-xs border border-dashed border-zinc-800 rounded-md">
                  Cover visual placeholder (Paste imagery URL to render).
                </div>
              )}

              {/* Raw Markdown Rendered content */}
              <div className="prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed border-t border-zinc-800 pt-6 select-text markdown-body">
                <ReactMarkdown>
                  {activeLangTab === 'fr' ? bodyFr : bodyEn}
                </ReactMarkdown>
              </div>

              {/* Preview Brief */}
              <div className="border-t-4 border-[#E85D42] bg-zinc-950 p-6 space-y-4 shadow-sm border border-zinc-800 rounded-md">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#E85D42] border-b border-zinc-800 pb-1.5">PERSPECTIVE BRIEF FOCUS</h4>
                
                <div>
                  <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">What Happened</h5>
                  <p className="text-xs text-zinc-400 mt-1 italic">
                    {activeLangTab === 'fr' ? whatHappenedFr || 'TBD' : whatHappenedEn || 'TBD'}
                  </p>
                </div>
                <div>
                  <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">Why It Matters</h5>
                  <p className="text-xs text-zinc-400 mt-1 italic">
                    {activeLangTab === 'fr' ? whyItMattersFr || 'TBD' : whyItMattersEn || 'TBD'}
                  </p>
                </div>
                <div>
                  <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">What To Watch Next</h5>
                  <p className="text-xs text-zinc-400 mt-1 italic">
                    {activeLangTab === 'fr' ? whatToWatchNextFr || 'TBD' : whatToWatchNextEn || 'TBD'}
                  </p>
                </div>
              </div>

              {/* Key Actors layout items */}
              {keyActors.length > 0 && (
                <div className="border-t border-zinc-800 pt-6 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200 border-b border-zinc-800 pb-1">KEY ACTORS CONNECTIVITY</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {keyActors.map((actor, i) => (
                      <div key={i} className="bg-zinc-950 p-4 border border-zinc-800 rounded-md">
                        <h5 className="font-extrabold text-sm text-[#E85D42]">{actor.name}</h5>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">{actor.role}</p>
                        <p className="text-xs text-zinc-300 mt-2 italic border-t border-zinc-800 pt-2">
                          {activeLangTab === 'fr' ? actor.significance?.fr : actor.significance?.en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
