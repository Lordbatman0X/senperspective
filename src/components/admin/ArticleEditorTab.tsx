import React, { useState, useEffect } from 'react';
import { Article, BilingualText, KeyActor, TimelineEvent, PerspectiveBrief, StructuralForces } from '../../types';
import { useStore } from '../../store';
import { Save, ArrowLeft, Eye, Edit, Trash2, Plus, ImageIcon, Sparkles, FileText, Check, Upload, HelpCircle, HelpCircle as HelpIcon, X, Loader2, Film, Link as LinkIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ARTICLE_CATEGORIES } from '../../constants';
import { compressImageFile } from '../../lib/imageUtils';
import { stripHtmlTags, extractYoutubeId } from '../../lib/utils';

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
  const siteSettings = useStore(s => s.siteSettings);
  const storeAds = useStore(s => s.ads) || [];
  const categoriesList = (siteSettings?.categories && siteSettings.categories.length > 0)
    ? siteSettings.categories
    : ARTICLE_CATEGORIES;

  // Toggle split pane preview vs single edit view
  const [splitView, setSplitView] = useState<boolean>(true);
  const [activeLangTab, setActiveLangTab] = useState<'fr' | 'en'>('fr');
  const [isSaving, setIsSaving] = useState(false);

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

  // AI Article Rewriter State
  const [showAiRewriteModal, setShowAiRewriteModal] = useState(false);
  const [isRewritingWithAi, setIsRewritingWithAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPreferredEngine, setAiPreferredEngine] = useState<'auto' | 'gemini' | 'groq' | 'openrouter' | 'openai'>('groq');
  const [aiTargetType, setAiTargetType] = useState<'News' | 'Analysis' | 'Deep Dive' | 'Explainer' | 'Opinion'>('Analysis');
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);

  const handleGenerateAiCoverImage = async () => {
    const activeTitle = titleFr || titleEn || '';
    const activeExcerpt = excerptFr || excerptEn || '';
    if (!activeTitle.trim()) {
      alert(language === 'fr' ? 'Veuillez renseigner le titre de l\'article pour guider la génération de l\'image.' : 'Please enter an article title to guide AI image generation.');
      return;
    }

    setIsGeneratingAiImage(true);
    try {
      const res = await fetch('/api/ai/generate-article-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeTitle,
          excerpt: activeExcerpt,
          category: category || 'Économie',
          tags: tags || []
        })
      });

      const data = await res.json();
      if (res.ok && data?.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        throw new Error(data?.error || 'Échec de génération');
      }
    } catch (err: any) {
      console.error('Image AI Gen Error:', err);
      alert((language === 'fr' ? 'Erreur de génération d\'image IA : ' : 'AI Image generation failed: ') + (err.message || ''));
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  useEffect(() => {
    if (article) {
      setSlug(article.slug || article.id);
      setCategory(article.category as any);
      setType(article.type as any);
      setIsPublished(!!article.isPublished);
      setIsFeatured(!!article.isFeatured);
      setCommentsEnabled(article.commentsEnabled !== false);
      setImageUrl(article.featuredImage || article.imageUrl || '');
      setAuthorName(article.author || 'Perspective Staff');
      setYoutubeId(article.youtubeVideoId || '');
      setTags(article.tags || []);
      setAdImageUrlState(article.adImageUrl || '');
      setAdLinkState(article.adLink || '');
      
      setTitleFr(stripHtmlTags(article.title?.fr || ''));
      setTitleEn(stripHtmlTags(article.title?.en || ''));
      setExcerptFr(stripHtmlTags(article.excerpt?.fr || ''));
      setExcerptEn(stripHtmlTags(article.excerpt?.en || ''));
      setBodyFr(stripHtmlTags(article.body?.fr || ''));
      setBodyEn(stripHtmlTags(article.body?.en || ''));

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

  // Helper to insert markdown image into active body
  const insertImageIntoActiveBody = (url: string, altText = "Illustration") => {
    if (!url) return;
    const markdownImg = `\n\n![${altText}](${url})\n\n`;
    if (activeLangTab === 'fr') {
      setBodyFr(prev => prev ? prev + markdownImg : markdownImg.trim());
    } else {
      setBodyEn(prev => prev ? prev + markdownImg : markdownImg.trim());
    }
  };

  const handleInArticleDeviceUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert(language === 'fr' ? 'Image trop lourde (Max 15Mo)' : 'Image too large (Max 15MB)');
      return;
    }
    try {
      const cleanName = file.name.replace(/\.[^/.]+$/, "") || "Illustration";
      const compressed = await compressImageFile(file, 1200, 800, 0.72);
      insertImageIntoActiveBody(compressed, cleanName);
    } catch (e) {
      console.error("Failed to compress in-article image:", e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!titleFr.trim() && !titleEn.trim()) {
      alert('Please fill out at least a French or English Title for this journal entry!');
      return;
    }

    setIsSaving(true);
    try {
      const compiled: Article = {
        id: article?.id || slug || 'art-' + Date.now().toString(),
        slug: slug || article?.slug || 'art-' + Date.now().toString(),
        date: article?.date || new Date().toISOString(),
        category: category as any,
        type,
        isPublished,
        isFeatured,
        commentsEnabled,
        featuredImage: imageUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        youtubeVideoId: extractYoutubeId(youtubeId) || undefined,
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

      await onSave(compiled);
    } catch (err) {
      console.error("Save error:", err);
      alert("Erreur lors de l'enregistrement: " + ((err as Error).message || "Veuillez réessayer"));
    } finally {
      setIsSaving(false);
    }
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

  const handleAiRewrite = async () => {
    setIsRewritingWithAi(true);
    setAiStatusMsg(null);

    try {
      const currentDraftPayload = {
        id: article?.id || slug || 'art-draft-' + Date.now(),
        category,
        type: aiTargetType || type,
        title: { fr: titleFr, en: titleEn },
        excerpt: { fr: excerptFr, en: excerptEn },
        body: { fr: bodyFr, en: bodyEn },
        perspectiveBrief: {
          whatHappened: { fr: whatHappenedFr, en: whatHappenedEn },
          whyItMatters: { fr: whyItMattersFr, en: whyItMattersEn },
          whatToWatchNext: { fr: whatToWatchNextFr, en: whatToWatchNextEn },
        },
        keyActors,
        timeline,
        structuralForces: {
          political: { fr: forcePolFr, en: forcePolEn },
          economic: { fr: forceEcoFr, en: forceEcoEn },
          social: { fr: forceSocFr, en: forceSocEn },
          international: { fr: forceIntFr, en: forceIntEn },
        },
        tags
      };

      const res = await fetch('/api/ai/rewrite-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: currentDraftPayload,
          prompt: aiPrompt,
          category,
          type: aiTargetType || type,
          preferredEngine: aiPreferredEngine
        })
      });

      const data = await res.json();
      if (!data.success || !data.article) {
        throw new Error(data.error || 'Erreur lors de la réécriture.');
      }

      const rewritten = data.article;

      // Apply rewritten fields
      if (rewritten.title) {
        if (rewritten.title.fr) setTitleFr(stripHtmlTags(rewritten.title.fr));
        if (rewritten.title.en) setTitleEn(stripHtmlTags(rewritten.title.en));
      }
      if (rewritten.excerpt) {
        if (rewritten.excerpt.fr) setExcerptFr(stripHtmlTags(rewritten.excerpt.fr));
        if (rewritten.excerpt.en) setExcerptEn(stripHtmlTags(rewritten.excerpt.en));
      }
      if (rewritten.body) {
        if (rewritten.body.fr) setBodyFr(rewritten.body.fr);
        if (rewritten.body.en) setBodyEn(rewritten.body.en);
      }

      if (rewritten.category) setCategory(rewritten.category);
      if (rewritten.type) setType(rewritten.type);

      const pb = rewritten.perspectiveBrief;
      if (pb) {
        if (pb.whatHappened) {
          setWhatHappenedFr(pb.whatHappened.fr || '');
          setWhatHappenedEn(pb.whatHappened.en || '');
        }
        if (pb.whyItMatters) {
          setWhyItMattersFr(pb.whyItMatters.fr || '');
          setWhyItMattersEn(pb.whyItMatters.en || '');
        }
        if (pb.whatToWatchNext) {
          setWhatToWatchNextFr(pb.whatToWatchNext.fr || '');
          setWhatToWatchNextEn(pb.whatToWatchNext.en || '');
        }
      }

      if (Array.isArray(rewritten.keyActors) && rewritten.keyActors.length > 0) {
        setKeyActors(rewritten.keyActors);
      }

      if (Array.isArray(rewritten.timeline) && rewritten.timeline.length > 0) {
        setTimeline(rewritten.timeline);
      }

      const sf = rewritten.structuralForces;
      if (sf) {
        if (sf.political) {
          setForcePolFr(sf.political.fr || '');
          setForcePolEn(sf.political.en || '');
        }
        if (sf.economic) {
          setForceEcoFr(sf.economic.fr || '');
          setForceEcoEn(sf.economic.en || '');
        }
        if (sf.social) {
          setForceSocFr(sf.social.fr || '');
          setForceSocEn(sf.social.en || '');
        }
        if (sf.international) {
          setForceIntFr(sf.international.fr || '');
          setForceIntEn(sf.international.en || '');
        }
      }

      if (Array.isArray(rewritten.tags) && rewritten.tags.length > 0) {
        setTags(rewritten.tags);
      }

      setAiStatusMsg(`✨ Réécriture réussie via ${data.engineUsed || 'IA Dual-Engine'}${data.failoverTriggered ? ' (Basculement actif)' : ''} ! Les champs de l'éditeur ont été mis à jour.`);
      setTimeout(() => setShowAiRewriteModal(false), 2000);
    } catch (err: any) {
      console.error('AI Rewrite error:', err);
      alert('Erreur réécriture IA: ' + (err.message || 'Problème de connexion au serveur IA.'));
    } finally {
      setIsRewritingWithAi(false);
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

          <button
            type="button"
            onClick={() => setShowAiRewriteModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black px-3.5 py-2 text-xs uppercase rounded-md shadow-md transition-all cursor-pointer border border-amber-400/30"
            title="Réécrire et sublimer l'article avec Gemini ou OpenAI"
          >
            <Sparkles size={14} className="text-amber-200 animate-pulse" />
            <span>{language === 'fr' ? 'Réécrire par IA' : 'AI Rewrite'}</span>
          </button>

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
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] disabled:opacity-50 text-white px-5 py-2.5 text-xs font-black uppercase tracking-widest leading-none shadow-md transition-all cursor-pointer rounded-xs"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
            {isSaving 
              ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
              : (language === 'fr' ? 'Enregistrer' : 'Save Frame')
            }
          </button>
        </div>
      </div>

      {/* Validation Report Banner */}
      {article?.validationReport && (
        <div className={`p-4 rounded-lg border ${
          article.validationReport.passed 
            ? 'bg-emerald-950/20 border-emerald-500/20' 
            : 'bg-amber-950/20 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {article.validationReport.passed ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="text-amber-400" />
            )}
            <h4 className={`text-sm font-bold uppercase tracking-widest ${
              article.validationReport.passed ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              AI Editorial Validation Report
            </h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {article.validationReport.checks?.map((check, idx) => (
              <div key={idx} className="flex items-center justify-between bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-300 font-mono uppercase tracking-wider">{check.label}</span>
                {check.status === 'passed' && <Check size={12} className="text-emerald-400" />}
                {check.status === 'warning' && <AlertCircle size={12} className="text-amber-400" />}
                {check.status === 'failed' && <X size={12} className="text-red-400" />}
              </div>
            ))}
          </div>
        </div>
      )}

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
                  {categoriesList.map(c => (
                    <option key={c.id} value={c.fr}>{c.fr}{c.en ? ` / ${c.en}` : ''}</option>
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
                      const matched = storeAds.find(a => a.imageUrl === adImageUrlState && a.targetUrl === adLinkState);
                      return matched ? matched.id : '';
                    })()}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setAdImageUrlState('');
                        setAdLinkState('');
                      } else {
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
                    {storeAds.map(ad => (
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
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                      <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">Texte de l'article (Markdown FR)</label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Device Upload */}
                        <label className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-all">
                          <Upload size={12} className="text-[#E85D42]" />
                          <span>Appareil</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleInArticleDeviceUpload(file);
                              e.target.value = '';
                            }} 
                            className="hidden" 
                          />
                        </label>

                        {/* Mediatheque Selector */}
                        <button
                          type="button"
                          onClick={() => openMediaSelector((url) => insertImageIntoActiveBody(url, 'Illustration Médiathèque'))}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-all"
                        >
                          <ImageIcon size={12} className="text-[#E85D42]" />
                          <span>Médiathèque</span>
                        </button>

                        {/* URL prompt */}
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt("Entrez l'URL de l'image :");
                            if (url && url.trim()) {
                              insertImageIntoActiveBody(url.trim(), 'Image');
                            }
                          }}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-all"
                        >
                          <LinkIcon size={12} className="text-[#E85D42]" />
                          <span>Lien URL</span>
                        </button>

                        <span className="text-[10px] text-zinc-400 font-mono ml-2">{wordCount.fr} mots • {Math.round(wordCount.fr / 200)} min</span>
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
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                      <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">Article Body (Markdown EN)</label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Device Upload */}
                        <label className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-all">
                          <Upload size={12} className="text-[#E85D42]" />
                          <span>Device</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleInArticleDeviceUpload(file);
                              e.target.value = '';
                            }} 
                            className="hidden" 
                          />
                        </label>

                        {/* Mediatheque Selector */}
                        <button
                          type="button"
                          onClick={() => openMediaSelector((url) => insertImageIntoActiveBody(url, 'Media Library Illustration'))}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-all"
                        >
                          <ImageIcon size={12} className="text-[#E85D42]" />
                          <span>Médiathèque</span>
                        </button>

                        {/* URL prompt */}
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt("Enter image URL:");
                            if (url && url.trim()) {
                              insertImageIntoActiveBody(url.trim(), 'Image');
                            }
                          }}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-all"
                        >
                          <LinkIcon size={12} className="text-[#E85D42]" />
                          <span>Image URL</span>
                        </button>

                        <span className="text-[10px] text-zinc-400 font-mono ml-2">{wordCount.en} words • {Math.round(wordCount.en / 200)} min</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <span>{language === 'fr' ? 'Importer' : 'Upload'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 15 * 1024 * 1024) {
                            alert(language === 'fr' ? 'Image trop lourde (Max 15Mo)' : 'Image too heavy (Max 15MB)');
                            return;
                          }
                          try {
                            const compressed = await compressImageFile(file, 1200, 800, 0.72);
                            setImageUrl(compressed);
                          } catch (err) {
                            console.error("Compression error:", err);
                          }
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

                  {/* Generate with AI Button */}
                  <button
                    type="button"
                    onClick={handleGenerateAiCoverImage}
                    disabled={isGeneratingAiImage}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-3 py-2 text-xs font-bold uppercase rounded-md cursor-pointer transition-all shadow-md shrink-0 disabled:opacity-50"
                    title={language === 'fr' ? "Générer une illustration éditoriale via IA (Gemini / DALL-E)" : "Generate editorial visual using AI"}
                  >
                    {isGeneratingAiImage ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-white" />
                        <span>{language === 'fr' ? 'Génération...' : 'Generating...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-amber-200" />
                        <span>{language === 'fr' ? 'Générer IA' : 'AI Generate'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Cover Image Preview Thumbnail */}
                {imageUrl && (
                  <div className="mt-3 relative w-36 h-24 border border-zinc-700 rounded-md overflow-hidden bg-black/50 group">
                    <img src={imageUrl} alt="Cover Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
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
                <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block mb-1">
                  {language === 'fr' ? 'Vidéo YouTube Intégrée (Lien URL ou ID)' : 'Embedded YouTube Video (URL or ID)'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Film size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
                    <input 
                      type="text" 
                      value={youtubeId} 
                      onChange={e => setYoutubeId(e.target.value)} 
                      className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      placeholder="https://www.youtube.com/watch?v=... ou ID" 
                    />
                  </div>
                  {youtubeId && (
                    <button
                      type="button"
                      onClick={() => setYoutubeId('')}
                      className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs transition-colors"
                      title="Effacer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Live YouTube Preview in Admin */}
                {(() => {
                  const cleanYt = extractYoutubeId(youtubeId);
                  if (!cleanYt) return (
                    <p className="text-[10px] text-zinc-500 mt-1 italic">
                      {language === 'fr' ? 'Collez un lien YouTube standard, un lien court (youtu.be) ou un identifiant vidéo.' : 'Paste a standard YouTube URL, short link (youtu.be), or video ID.'}
                    </p>
                  );
                  return (
                    <div className="mt-3 bg-black border border-zinc-800 p-2 rounded-md space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span className="text-[#E85D42] font-bold flex items-center gap-1">
                          <Film size={12} /> ID: {cleanYt}
                        </span>
                        <span className="text-emerald-400">Prêt pour diffusion</span>
                      </div>
                      <div className="relative aspect-video w-full overflow-hidden rounded bg-zinc-900 border border-zinc-800">
                        <iframe 
                          src={`https://www.youtube.com/embed/${cleanYt}`} 
                          title="YouTube Preview" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen 
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                    </div>
                  );
                })()}
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
                      <label className="text-[9px] uppercase font-bold text-zinc-200 block mb-0.5">Actor Full Name</label>
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
                      <label className="text-[9px] uppercase font-bold text-zinc-200 block mb-0.5">Role / Position</label>
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
                      <label className="text-[9px] uppercase font-bold text-zinc-200 block mb-0.5">Significance text (FR)</label>
                      <textarea 
                        rows={1.5} 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                        value={actor.significance?.fr} 
                        onChange={e => handleUpdateActor(idx, 'significance', e.target.value, 'fr')} 
                        placeholder="Exprime sa vision quant au projet..." 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-200 block mb-0.5">Significance text (EN)</label>
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
                    <label className="text-[9px] uppercase font-bold text-zinc-200 block mb-0.5">Date / Time string</label>
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
                      <label className="text-[9px] uppercase font-bold text-zinc-200 block mb-0.5">Description (FR)</label>
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
                      <label className="text-[9px] uppercase font-bold text-zinc-200 block mb-0.5">Description (EN)</label>
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
                <span className="text-[10px] font-mono text-zinc-200 block mb-2 uppercase">POLITICAL FORCES</span>
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
                <span className="text-[10px] font-mono text-zinc-200 block mb-2 uppercase">ECONOMIC FORCES</span>
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
                <span className="text-[10px] font-mono text-zinc-200 block mb-2 uppercase">SOCIAL FORCES</span>
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
                <span className="text-[10px] font-mono text-zinc-200 block mb-2 uppercase">INTERNATIONAL INFLUENCE</span>
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

              {/* Preset Tag Suggestions from Taxonomy */}
              {siteSettings?.tags && siteSettings.tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="text-[9px] text-zinc-400 font-mono uppercase self-center mr-1">Suggestions:</span>
                  {siteSettings.tags.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        if (!tags.includes(st.fr)) setTags([...tags, st.fr]);
                      }}
                      className={`text-[9px] px-2 py-0.5 border rounded-full font-mono cursor-pointer transition-all ${
                        tags.includes(st.fr)
                          ? 'bg-[#E85D42] text-white border-[#E85D42]'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      + {st.fr}
                    </button>
                  ))}
                </div>
              )}
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

              {/* YouTube Video Preview in Live Split Pane */}
              {(() => {
                const previewYtId = extractYoutubeId(youtubeId);
                if (!previewYtId) return null;
                return (
                  <div className="border border-zinc-800 bg-black p-3 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span className="text-[#E85D42] font-bold flex items-center gap-1.5">
                        <Film size={13} /> VIDÉO ASSOCIÉE
                      </span>
                      <span>1080p • YouTube</span>
                    </div>
                    <div className="relative aspect-video w-full overflow-hidden rounded bg-zinc-950 border border-zinc-800">
                      <iframe 
                        src={`https://www.youtube.com/embed/${previewYtId}`} 
                        title="YouTube Preview" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Preview Brief */}
              {(() => {
                const wh = (activeLangTab === 'fr' ? whatHappenedFr || whatHappenedEn : whatHappenedEn || whatHappenedFr).trim();
                const wm = (activeLangTab === 'fr' ? whyItMattersFr || whyItMattersEn : whyItMattersEn || whyItMattersFr).trim();
                const wn = (activeLangTab === 'fr' ? whatToWatchNextFr || whatToWatchNextEn : whatToWatchNextEn || whatToWatchNextFr).trim();

                if (!wh && !wm && !wn) return null;

                return (
                  <div className="border-t-4 border-[#E85D42] bg-zinc-950 p-6 space-y-4 shadow-sm border border-zinc-800 rounded-md">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#E85D42] border-b border-zinc-800 pb-1.5">PERSPECTIVE BRIEF FOCUS</h4>
                    
                    {wh !== '' && (
                      <div>
                        <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">What Happened</h5>
                        <p className="text-xs text-zinc-400 mt-1 italic">
                          {wh}
                        </p>
                      </div>
                    )}
                    {wm !== '' && (
                      <div>
                        <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">Why It Matters</h5>
                        <p className="text-xs text-zinc-400 mt-1 italic">
                          {wm}
                        </p>
                      </div>
                    )}
                    {wn !== '' && (
                      <div>
                        <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">What To Watch Next</h5>
                        <p className="text-xs text-zinc-400 mt-1 italic">
                          {wn}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

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

      {/* AI Article Rewrite & Polish Modal */}
      {showAiRewriteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setShowAiRewriteModal(false);
                setAiStatusMsg(null);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg text-amber-400">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  {language === 'fr' ? "Réécriture & Sublimation Éditoriale par l'IA" : "AI Article Rewrite & Polish"}
                </h3>
                <p className="text-xs text-zinc-400">
                  {language === 'fr' 
                    ? "Sublimez votre brouillon avec Gemini ou OpenAI en respectant la charte Perspective"
                    : "Polish your draft using Gemini or OpenAI following Perspective editorial standards"}
                </p>
              </div>
            </div>

            {aiStatusMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-medium flex items-center justify-between">
                <span>{aiStatusMsg}</span>
                <button 
                  onClick={() => setAiStatusMsg(null)}
                  className="text-emerald-400 hover:text-emerald-200 text-xs font-bold underline cursor-pointer ml-2"
                >
                  Fermer
                </button>
              </div>
            )}

            <div className="space-y-4">
              {/* Engine Selector */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Moteur IA Privilégié (Dual-Engine)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiPreferredEngine('groq')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      aiPreferredEngine === 'groq'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-mono text-sm">Groq Llama 3.3</span>
                    <span className="text-[10px] opacity-75">Vitesse Éclair (70B)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiPreferredEngine('openrouter')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      aiPreferredEngine === 'openrouter'
                        ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-mono text-sm">OpenRouter</span>
                    <span className="text-[10px] opacity-75">Claude / DeepSeek</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiPreferredEngine('gemini')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      aiPreferredEngine === 'gemini'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-mono text-sm">Gemini 2.5</span>
                    <span className="text-[10px] opacity-75">Ultra-Rapide & Structuré</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiPreferredEngine('openai')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      aiPreferredEngine === 'openai'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-mono text-sm">OpenAI GPT-4o</span>
                    <span className="text-[10px] opacity-75">Haute Précision</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiPreferredEngine('auto')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      aiPreferredEngine === 'auto'
                        ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-mono text-sm">Auto Cascade</span>
                    <span className="text-[10px] opacity-75">Basculement Auto</span>
                  </button>
                </div>
              </div>

              {/* Format Target */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Format Éditorial Cible
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'News', label: 'Flash News', desc: 'Récit fluide 2-3 paragraphes' },
                    { id: 'Analysis', label: 'Analyse', desc: 'Décryptage standard' },
                    { id: 'Deep Dive', label: 'Grand Angle', desc: 'Intertitres, citations & grille' },
                    { id: 'Explainer', label: 'Explainer', desc: 'Pédagogique & synthétique' }
                  ].map(fmt => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setAiTargetType(fmt.id as any)}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        aiTargetType === fmt.id
                          ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{fmt.label}</div>
                      <div className="text-[9px] opacity-70 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt presets */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Directives Rapides de Réécriture
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    "Perfectionner le bilinguisme FR/EN (Style Financial Times pour l'anglais)",
                    "Appliquer la charte zéro-cliché et renforcer l'ancrage géographique",
                    "Enrichir la perspective brief (Ce qu'il s'est passé, Enjeux, À surveiller)",
                    "Transformer en dossier Grand Angle avec citations et forces structurelles"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAiPrompt(preset)}
                      className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-[11px] font-medium transition-colors cursor-pointer text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Instructions spécifiques pour l'IA (ex: Insister sur les retombées économiques au Sénégal, corriger le style, affiner les acteurs clés...)"
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#E85D42] text-zinc-100 p-3 rounded-lg text-xs outline-none transition-colors"
                />
              </div>

              {/* Guidelines Active Indicator */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider">
                  <Check size={12} />
                  <span>Directives Éditoriales Master Intégrées</span>
                </div>
                <p>
                  Toutes les règles administratives configurées (Mots Bannis Zéro-Cliché, Directives de Rédaction, et Exemple Référence) seront automatiquement appliquées par la réécriture.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAiRewriteModal(false);
                  setAiStatusMsg(null);
                }}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={handleAiRewrite}
                disabled={isRewritingWithAi}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                {isRewritingWithAi ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Réécriture IA en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Lancer la Réécriture IA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
