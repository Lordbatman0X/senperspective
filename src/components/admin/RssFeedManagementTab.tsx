import React, { useState, useEffect } from 'react';
import { 
  Zap, Copy, Check, Send, Sparkles, Globe, Terminal, FileCode2, 
  CheckCircle2, AlertCircle, RefreshCw, ExternalLink, ShieldCheck, 
  Layers, BookOpen, Bot, Trash2, Clock, Search, Plus, Play, ShieldAlert, Wifi, Sliders,
  ListStart, FileText, CheckCircle, Edit3, X, ChevronRight, Newspaper, ArrowRight, Eye
} from 'lucide-react';
import { useStore } from '../../store';
import { safeFetchJson } from '../../lib/apiUtils';
import { ALL_RELIABLE_RSS_FEEDS, ensureValidUrl, normalizeRssFeedUrl } from './RssAutomationTab';

interface RssFeedManagementTabProps {
  onRefreshArticles?: () => void;
  onEditArticle?: (article: any) => void;
}

interface FeedHealthRecord {
  lastChecked: string;
  status: 'healthy' | 'error';
  errorDetail?: string;
  itemCount: number;
}

export function RssFeedManagementTab({ onRefreshArticles, onEditArticle }: RssFeedManagementTabProps) {
  const { language, addArticle } = useStore();
  const isFr = language === 'fr';

  // State for Feeds list
  const [rssFeeds, setRssFeeds] = useState<any[]>(() => {
    const saved = localStorage.getItem('perspective_rss_feeds');
    const parsed = saved ? JSON.parse(saved) : ALL_RELIABLE_RSS_FEEDS.slice(0, 14);
    const uniqueIds = new Set<string>();
    return parsed.filter((f: any) => {
      if (!f || !f.id) return false;
      if (uniqueIds.has(f.id)) return false;
      uniqueIds.add(f.id);
      return true;
    });
  });

  // Health Map State
  const [feedHealthMap, setFeedHealthMap] = useState<Record<string, FeedHealthRecord>>(() => {
    const saved = localStorage.getItem('perspective_rss_health');
    return saved ? JSON.parse(saved) : {};
  });

  // Scheduler State
  const [autoSchedule, setAutoSchedule] = useState<{
    enabled: boolean;
    intervalMinutes: number;
    targetPack: string;
    maxArticlesPerCycle: number;
    autoPublish: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
    status: 'idle' | 'running' | 'error';
    totalDraftsCreated: number;
    logs: Array<{ id: string; timestamp: string; type: 'info' | 'success' | 'warning' | 'error'; message: string }>;
  }>({
    enabled: false,
    intervalMinutes: 60,
    targetPack: 'all',
    maxArticlesPerCycle: 2,
    autoPublish: false,
    lastRunAt: null,
    nextRunAt: null,
    status: 'idle',
    totalDraftsCreated: 0,
    logs: []
  });

  // Active sub-tab inside Feed Management
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'scheduler' | 'webhook'>('monitor');

  // UI Interactive States
  const [healthChecking, setHealthChecking] = useState(false);
  const [testingFeedUrl, setTestingFeedUrl] = useState<string | null>(null);
  const [processingFeedId, setProcessingFeedId] = useState<string | null>(null);
  const [quickDraftingFeedId, setQuickDraftingFeedId] = useState<string | null>(null);
  const [runningAllPipeline, setRunningAllPipeline] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Single-Article Inspector & Generator states (Option to generate 1 by 1)
  const [inspectFeed, setInspectFeed] = useState<any | null>(null);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loadingFeedItems, setLoadingFeedItems] = useState(false);
  const [feedItemsError, setFeedItemsError] = useState<string | null>(null);
  const [generatingItemKey, setGeneratingItemKey] = useState<string | null>(null);
  const [generatedResults, setGeneratedResults] = useState<Record<string, any>>({});
  const [itemConfig, setItemConfig] = useState<Record<string, { category: string; type: string; engine: string; customPrompt: string }>>({});
  const [feedItemSearch, setFeedItemSearch] = useState('');

  // Filters for feed monitor
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPack, setSelectedPack] = useState<string>('all');

  // New Feed Form
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('Politique');
  const [newFeedPack, setNewFeedPack] = useState('senegal');
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);

  // Edit Feed Form State
  const [editingFeed, setEditingFeed] = useState<any | null>(null);
  const [editFeedName, setEditFeedName] = useState('');
  const [editFeedUrl, setEditFeedUrl] = useState('');
  const [editFeedCategory, setEditFeedCategory] = useState('Politique');
  const [editFeedPack, setEditFeedPack] = useState('senegal');
  const [editFeedFlag, setEditFeedFlag] = useState('🇸🇳');

  // Webhook Testing States
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [promptMode, setPromptMode] = useState<'simple' | 'full'>('simple');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ success: boolean; message: string; permalink?: string; article?: any } | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookEndpoint = `${origin}/api/webhooks/incoming-rss`;

  // Fetch Schedule Config from Server
  const fetchScheduleConfig = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/rss-automation/config');
      if (ok && data?.success && data.config) {
        setAutoSchedule(data.config);
      }
    } catch (e) {
      console.warn("Could not retrieve scheduler configuration:", e);
    }
  };

  useEffect(() => {
    fetchScheduleConfig();
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 6000);
  };

  // Inspect wire feed items for 1-by-1 generation
  const handleInspectFeed = async (feed: any) => {
    setInspectFeed(feed);
    setFeedItems([]);
    setFeedItemsError(null);
    setLoadingFeedItems(true);
    setFeedItemSearch('');

    try {
      const { ok, data, error } = await safeFetchJson('/api/rss/preview-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl: feed.url, feedName: feed.name })
      });

      if (ok && data?.success && Array.isArray(data.items)) {
        setFeedItems(data.items);
      } else {
        throw new Error(error || data?.error || (isFr ? 'Impossible de récupérer les articles du flux.' : 'Failed to fetch wire articles.'));
      }
    } catch (err: any) {
      setFeedItemsError(err?.message || (isFr ? 'Erreur de connexion au flux RSS' : 'Error connecting to wire feed'));
    } finally {
      setLoadingFeedItems(false);
    }
  };

  // Generate a single article from a specific RSS item
  const handleGenerateSingleItem = async (item: any, index: number) => {
    const itemKey = `${inspectFeed?.id || 'feed'}-${index}-${(item.title || '').slice(0, 25)}`;
    const cfg = itemConfig[itemKey] || {
      category: inspectFeed?.category || 'Économie',
      type: 'News',
      engine: 'auto',
      customPrompt: ''
    };

    setGeneratingItemKey(itemKey);
    try {
      showStatus(isFr ? `Rédaction IA en cours pour : "${item.title?.slice(0, 45)}..."` : `AI writing story: "${item.title?.slice(0, 45)}..."`);

      const { ok, data, error } = await safeFetchJson('/api/rss/generate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rssItem: item,
          feedUrl: inspectFeed?.url,
          feedName: inspectFeed?.name,
          category: cfg.category,
          type: cfg.type,
          preferredEngine: cfg.engine,
          customPrompt: cfg.customPrompt,
          autoPublish: false
        })
      });

      if (ok && data?.success && data.article) {
        setGeneratedResults(prev => ({ ...prev, [itemKey]: data.article }));
        addArticle(data.article);
        if (onRefreshArticles) onRefreshArticles();
        showStatus(isFr ? `Article rédigé avec succès via ${data.engineUsed || 'l\'IA'} !` : `Article successfully scripted via ${data.engineUsed || 'AI'}!`);
      } else {
        throw new Error(error || data?.error || 'Échec de la rédaction');
      }
    } catch (err: any) {
      showStatus(err?.message || 'Erreur lors de la génération', 'error');
    } finally {
      setGeneratingItemKey(null);
    }
  };

  // Quick 1-article generator from feed table row
  const handleQuickGenerateOneFromFeed = async (feedObj: any) => {
    setQuickDraftingFeedId(feedObj.id);
    try {
      showStatus(isFr ? `Génération d'1 article unique depuis "${feedObj.name}"...` : `Drafting 1 single story from "${feedObj.name}"...`);

      const { ok, data, error } = await safeFetchJson('/api/rss/fetch-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedUrl: feedObj.url,
          feedName: feedObj.name,
          category: feedObj.category || 'Économie',
          maxItems: 1,
          autoPublish: false,
          preferredEngine: 'auto'
        })
      });

      if (ok && data?.success) {
        showStatus(isFr ? `1 article rédigé avec succès depuis "${feedObj.name}" !` : `1 story successfully scripted from "${feedObj.name}"!`);
        if (onRefreshArticles) onRefreshArticles();
      } else {
        throw new Error(error || data?.error || 'Erreur lors de la génération');
      }
    } catch (err: any) {
      showStatus(err?.message || 'Erreur lors de la génération', 'error');
    } finally {
      setQuickDraftingFeedId(null);
    }
  };
  // Add custom feed source
  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;

    const validatedUrl = ensureValidUrl(newFeedUrl);
    if (!validatedUrl) {
      showStatus(isFr ? "URL du flux RSS invalide." : "Invalid RSS URL.", 'error');
      return;
    }

    const newFeed = {
      id: `custom_${Date.now()}`,
      name: newFeedName.trim(),
      url: validatedUrl,
      category: newFeedCategory,
      pack: newFeedPack,
      originCountry: newFeedPack === 'senegal' ? 'Sénégal' : newFeedPack === 'africa' ? 'Panafricain' : 'International',
      originFlag: newFeedPack === 'senegal' ? '🇸🇳' : newFeedPack === 'africa' ? '🌍' : '🌐',
      active: true
    };

    const updated = [...rssFeeds, newFeed];
    setRssFeeds(updated);
    localStorage.setItem('perspective_rss_feeds', JSON.stringify(updated));
    
    // Clear Form
    setNewFeedName('');
    setNewFeedUrl('');
    setShowAddFeedModal(false);
    showStatus(isFr ? `Flux "${newFeed.name}" ajouté avec succès !` : `Feed "${newFeed.name}" added successfully!`);
  };

  // Open Edit Feed Modal
  const handleOpenEditFeed = (feed: any) => {
    setEditingFeed(feed);
    setEditFeedName(feed.name || '');
    setEditFeedUrl(feed.url || '');
    setEditFeedCategory(feed.category || 'Politique');
    setEditFeedPack(feed.pack || 'senegal');
    setEditFeedFlag(feed.originFlag || (feed.pack === 'senegal' ? '🇸🇳' : feed.pack === 'africa' ? '🌍' : '🌐'));
  };

  // Save edited feed
  const handleSaveEditedFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeed || !editFeedName.trim() || !editFeedUrl.trim()) return;

    const validatedUrl = ensureValidUrl(editFeedUrl);
    if (!validatedUrl) {
      showStatus(isFr ? "URL du flux RSS invalide." : "Invalid RSS URL.", 'error');
      return;
    }

    const updatedFeeds = rssFeeds.map(f => {
      if (f.id === editingFeed.id) {
        return {
          ...f,
          name: editFeedName.trim(),
          url: validatedUrl,
          category: editFeedCategory,
          pack: editFeedPack,
          originFlag: editFeedFlag,
          originCountry: editFeedPack === 'senegal' ? 'Sénégal' : editFeedPack === 'africa' ? 'Panafricain' : 'International'
        };
      }
      return f;
    });

    setRssFeeds(updatedFeeds);
    localStorage.setItem('perspective_rss_feeds', JSON.stringify(updatedFeeds));
    setEditingFeed(null);
    showStatus(isFr ? `Source "${editFeedName}" mise à jour avec succès !` : `Media source "${editFeedName}" updated!`);
  };

  // Remove a feed
  const handleRemoveFeed = (id: string) => {
    if (!window.confirm(isFr ? 'Voulez-vous vraiment supprimer cette source RSS ?' : 'Are you sure you want to delete this RSS source?')) return;
    const updated = rssFeeds.filter(f => f.id !== id);
    setRssFeeds(updated);
    localStorage.setItem('perspective_rss_feeds', JSON.stringify(updated));
    showStatus(isFr ? "Source RSS retirée de votre régie." : "RSS Source removed.");
  };

  // Reset feeds to default list
  const handleResetFeedsToDefault = () => {
    if (!window.confirm(isFr ? 'Réinitialiser toutes les sources aux valeurs par défaut de la régie ?' : 'Reset all feeds to default?')) return;
    localStorage.removeItem('perspective_rss_feeds');
    localStorage.removeItem('perspective_rss_health');
    setRssFeeds(ALL_RELIABLE_RSS_FEEDS.slice(0, 14));
    setFeedHealthMap({});
    showStatus(isFr ? "Sources réinitialisées aux standards ouest-africains." : "Feeds reset to standards.");
  };

  // Load a complete thematic pack
  const handleLoadPack = (packKey: string) => {
    let feedsToLoad = [];
    if (packKey === 'all') {
      feedsToLoad = ALL_RELIABLE_RSS_FEEDS;
    } else {
      feedsToLoad = ALL_RELIABLE_RSS_FEEDS.filter(f => f.pack === packKey);
    }

    const existingUrls = new Set(rssFeeds.map(f => f.url));
    const newFeeds = feedsToLoad.filter(f => !existingUrls.has(f.url));
    const updated = [...rssFeeds, ...newFeeds];
    setRssFeeds(updated);
    localStorage.setItem('perspective_rss_feeds', JSON.stringify(updated));
    showStatus(isFr ? `Mise à jour réussie : +${newFeeds.length} nouvelles sources indexées !` : `Indexed +${newFeeds.length} new thematic sources!`);
  };

  // Toggle feed active state
  const handleToggleFeed = (id: string) => {
    const updated = rssFeeds.map(f => f.id === id ? { ...f, active: !f.active } : f);
    setRssFeeds(updated);
    localStorage.setItem('perspective_rss_feeds', JSON.stringify(updated));
  };

  // Run health check on a specific feed
  const handleCheckFeedHealth = async (feed: any) => {
    setTestingFeedUrl(feed.url);
    try {
      const { ok, data, status } = await safeFetchJson(`/api/rss/fetch?url=${encodeURIComponent(feed.url)}`);
      
      const newHealth: FeedHealthRecord = {
        lastChecked: new Date().toISOString(),
        status: (ok && data?.success) ? 'healthy' : 'error',
        itemCount: data?.items?.length || 0,
        errorDetail: (ok && data?.success) ? undefined : (data?.error || `HTTP ${status}`)
      };

      const updatedMap = { ...feedHealthMap, [feed.url]: newHealth };
      setFeedHealthMap(updatedMap);
      localStorage.setItem('perspective_rss_health', JSON.stringify(updatedMap));
    } catch (e: any) {
      const errorMap = {
        ...feedHealthMap,
        [feed.url]: {
          lastChecked: new Date().toISOString(),
          status: 'error' as const,
          itemCount: 0,
          errorDetail: e?.message || 'Network Timeout'
        }
      };
      setFeedHealthMap(errorMap);
      localStorage.setItem('perspective_rss_health', JSON.stringify(errorMap));
    } finally {
      setTestingFeedUrl(null);
    }
  };

  // Run full health scanning cycle
  const handleRunAllHealthCheck = async () => {
    setHealthChecking(true);
    const activeFeeds = rssFeeds.filter(f => f.active);
    for (const feed of activeFeeds) {
      await handleCheckFeedHealth(feed);
    }
    setHealthChecking(false);
    showStatus(isFr ? "Audit de santé de la régie terminé !" : "Wire health audit completed!");
  };

  // Trigger manual content process for a single feed (Dynamic Fallback Ready!)
  const handleProcessFeed = async (feedObj: any) => {
    const feedUrl = feedObj.url;
    const cat = feedObj.category || 'Économie';
    setProcessingFeedId(feedObj.id);
    
    try {
      showStatus(isFr ? `Traitement IA du flux "${feedObj.name}" démarré...` : `AI parsing started for "${feedObj.name}"...`);
      
      const res = await fetch('/api/rss/fetch-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feedUrl, 
          feedName: feedObj.name,
          category: cat, 
          maxItems: 2, 
          autoPublish: false
        })
      });

      const result = await res.json();
      if (res.ok && result?.success) {
        showStatus(isFr ? `Traitement terminé : ${result.draftsCreated} brouillons rédigés !` : `Finished! ${result.draftsCreated} drafts scripted.`);
        if (onRefreshArticles) onRefreshArticles();
      } else {
        throw new Error(result?.error || 'Failed processing feed');
      }
    } catch (err: any) {
      showStatus(err.message || 'Error occurred', 'error');
    } finally {
      setProcessingFeedId(null);
    }
  };

  // Trigger full pipeline scan (Single Item Cycle)
  const handleRunFullPipeline = async () => {
    if (!window.confirm(isFr ? 'Démarrer une passe de scan exhaustive de l’ensemble de vos flux actifs ?' : 'Launch an exhaustive processing scan over all active sources?')) return;
    setRunningAllPipeline(true);
    
    try {
      const activeFeeds = rssFeeds.filter(f => f.active);
      let totalCreated = 0;
      showStatus(isFr ? `Pipeline global initié sur ${activeFeeds.length} flux...` : `Global pipeline initiated on ${activeFeeds.length} wires...`);
      
      for (const feed of activeFeeds) {
        try {
          const res = await fetch('/api/rss/fetch-and-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              feedUrl: feed.url, 
              feedName: feed.name,
              category: feed.category || 'Économie', 
              maxItems: 1, 
              autoPublish: false,
              preferredEngine: 'auto'
            })
          });
          const r = await res.json();
          if (res.ok && r?.success) {
            totalCreated += r.draftsCreated || 0;
          }
        } catch (e) {
          console.warn(`Pipeline skip for ${feed.name}:`, e);
        }
      }
      
      showStatus(isFr ? `Pipeline terminé ! +${totalCreated} brouillons d'actualité ajoutés à l'Atelier.` : `Pipeline finished! Created +${totalCreated} story drafts.`);
      if (onRefreshArticles) onRefreshArticles();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setRunningAllPipeline(false);
    }
  };

  // Save Scheduler configurations
  const handleSaveScheduler = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleLoading(true);
    try {
      const { ok, data, error } = await safeFetchJson('/api/rss-automation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoSchedule)
      });
      if (ok && data?.success) {
        setAutoSchedule(data.config);
        showStatus(isFr ? 'Planificateur automatique configuré avec succès !' : 'Auto-scheduler config persisted successfully!');
      } else {
        throw new Error(error || data?.error || 'Save failed');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setScheduleLoading(false);
    }
  };

  // Trigger manual webhook test dispatch
  const handleSendTestWebhook = async () => {
    setWebhookLoading(true);
    setWebhookResult(null);
    try {
      const payload = {
        title: {
          fr: "Transition Économique au Sénégal : Bilan des Nouvelles Réformes Structurelles",
          en: "Economic Transition in Senegal: Review of New Structural Reforms"
        },
        excerpt: {
          fr: "Une analyse approfondie sur les orientations stratégiques du gouvernement sénégalais et leur impact sur la compétitivité régionale.",
          en: "An in-depth analysis of the Senegalese government's strategic guidelines and their impact on regional competitiveness."
        },
        body: {
          fr: "## Une Vision Stratégique Renouvelée\n\nLe paysage économique sénégalais traverse une phase décisive de transformation. Face aux défis mondiaux, les autorités de Dakar ont engagé une série de réformes visant à renforcer l'attractivité des investissements et la résilience budgétaire.",
          en: "## A Renewed Strategic Vision\n\nThe Senegalese economic landscape is undergoing a decisive phase of transformation. In response to global challenges, authorities in Dakar have launched a series of structural reforms."
        },
        category: "Économie",
        type: "Analysis",
        author: "Grand Reporter Perspective",
        imageUrl: "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&q=80&w=1200",
        readingTime: 6,
        isPublished: false, // Save as draft
        isFeatured: false,
        isTrending: true,
        tags: ["Sénégal", "Économie", "Réformes"],
        sourceUrl: "https://senperspective.com/articles/reformes-economiques-2026"
      };

      const res = await fetch(webhookEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWebhookResult({
          success: true,
          message: isFr ? "Webhook reçu ! Brouillon créé directement." : "Webhook received! Draft created directly.",
          article: data.article
        });
        showStatus(isFr ? "Webhook simulé avec succès !" : "Webhook simulated successfully!");
        if (onRefreshArticles) onRefreshArticles();
      } else {
        throw new Error(data.error || "Simulation failure");
      }
    } catch (err: any) {
      setWebhookResult({
        success: false,
        message: err.message || "Network issue during webhook dispatch"
      });
      showStatus(err.message, 'error');
    } finally {
      setWebhookLoading(false);
    }
  };

  // Purge test drafts
  const handlePurgeTestArticles = async () => {
    setPurgeLoading(true);
    try {
      const res = await fetch('/api/webhooks/make-rss', { method: 'DELETE' });
      if (res.ok) {
        showStatus(isFr ? "Brouillons tests et cache temporaire purgés." : "Test drafts and server caches purged.");
        if (onRefreshArticles) onRefreshArticles();
      } else {
        throw new Error("Purge endpoint returned failure status");
      }
    } catch (e: any) {
      showStatus(e.message, 'error');
    } finally {
      setPurgeLoading(false);
    }
  };

  // Filter logic
  const filteredFeeds = rssFeeds.filter(feed => {
    const matchesSearch = feed.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          feed.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPack = selectedPack === 'all' || feed.pack === selectedPack;
    return matchesSearch && matchesPack;
  });

  return (
    <div className="space-y-6">
      {/* Tab Header Navigation */}
      <div className="flex border-b border-zinc-800 pb-px">
        <button
          onClick={() => setActiveSubTab('monitor')}
          className={`pb-4 px-6 font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'monitor'
              ? 'border-[#E85D42] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Wifi size={14} />
          <span>{isFr ? 'Régie & Monitor de Flux' : 'Feed Monitor'}</span>
          <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono text-[9px]">
            {rssFeeds.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('scheduler')}
          className={`pb-4 px-6 font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'scheduler'
              ? 'border-[#E85D42] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock size={14} />
          <span>{isFr ? 'Planification Auto' : 'Scheduler Tuning'}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${autoSchedule.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
        </button>

        <button
          onClick={() => setActiveSubTab('webhook')}
          className={`pb-4 px-6 font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'webhook'
              ? 'border-[#E85D42] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap size={14} />
          <span>{isFr ? 'Webhook Inbound' : 'Inbound Webhook'}</span>
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

      {/* ==================== MONITOR TAB ==================== */}
      {activeSubTab === 'monitor' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/60 p-5 border border-zinc-800 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {isFr ? 'Flux RSS & Sources de Presse Régionales' : 'Press Wires & RSS Feeds'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isFr 
                  ? 'Indexation, supervision et déclencheurs de rédaction instantanés pour la presse panafricaine.' 
                  : 'Manage active feeds, trigger immediate AI story generations, or audit connection health.'}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRunAllHealthCheck}
                disabled={healthChecking}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-xs font-mono font-bold uppercase rounded-xl border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} className={healthChecking ? 'animate-spin' : ''} />
                <span>{healthChecking ? (isFr ? 'Audit en cours...' : 'Auditing...') : (isFr ? 'Tester la Santé' : 'Audit Health')}</span>
              </button>

              {/* NEW: Dedicated Button to trigger 1-by-1 RSS generation */}
              <button
                onClick={() => {
                  const firstActive = rssFeeds.find(f => f.active) || rssFeeds[0];
                  if (firstActive) handleInspectFeed(firstActive);
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-orange-400 hover:text-orange-300 text-xs font-mono font-bold uppercase rounded-xl border border-orange-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ListStart size={14} />
                <span>{isFr ? 'Rédiger 1 par 1 (Studio RSS)' : 'Write 1-by-1 (RSS Studio)'}</span>
              </button>

              <button
                onClick={handleRunFullPipeline}
                disabled={runningAllPipeline}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Play size={14} className={runningAllPipeline ? 'animate-spin' : ''} />
                <span>{runningAllPipeline ? (isFr ? 'Pipeline Actif...' : 'Pipeline Scanning...') : (isFr ? 'Scan Global' : 'Batch Scan')}</span>
              </button>

              <button
                onClick={() => setShowAddFeedModal(true)}
                className="px-4 py-2 bg-[#E85D42] hover:bg-[#d45037] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>{isFr ? 'Ajouter un Flux' : 'Add Feed'}</span>
              </button>
            </div>
          </div>

          {/* Quick Pack Loaders */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-black p-4 border border-zinc-800 rounded-xl">
            <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1">
              <Layers size={14} />
              {isFr ? 'Packs de Sources de Presse :' : 'Load Theme Packs:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'senegal', label: '🇸🇳 Sénégal Wire' },
                { key: 'africa', label: '🌍 Regional Africa' },
                { key: 'world', label: '🌐 Int\'l News' },
                { key: 'sports', label: '⚽ Sports & Football' },
                { key: 'all', label: '⚡ Exporter Tout' }
              ].map(pack => (
                <button
                  key={pack.key}
                  onClick={() => handleLoadPack(pack.key)}
                  className="px-3 py-1 bg-zinc-900 hover:bg-[#E85D42] text-[10px] font-mono font-bold uppercase text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-zinc-800/80"
                >
                  {pack.label}
                </button>
              ))}
              <button
                onClick={handleResetFeedsToDefault}
                className="px-3 py-1 bg-zinc-950 hover:bg-red-950/40 text-red-400 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer border border-red-900/30 ml-auto"
              >
                {isFr ? 'Réinitialiser' : 'Reset Default'}
              </button>
            </div>
          </div>

          {/* Search and Filters toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input 
                type="text"
                placeholder={isFr ? "Rechercher une source par nom, URL..." : "Search feeds by name, URL..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-semibold"
              />
            </div>

            <div className="flex gap-1.5 w-full sm:w-auto">
              {['all', 'senegal', 'africa', 'world', 'sports'].map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPack(p)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase rounded-lg border transition-all cursor-pointer ${
                    selectedPack === p
                      ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-orange-500'
                  }`}
                >
                  {p === 'all' ? (isFr ? 'TOUS' : 'ALL') : p}
                </button>
              ))}
            </div>
          </div>

          {/* Feeds Table list */}
          <div className="bg-black border border-zinc-800 rounded-2xl overflow-x-auto shadow-xl scrollbar-thin scrollbar-thumb-zinc-700">
            <table className="w-full min-w-[980px] text-left text-xs whitespace-nowrap text-zinc-300 font-mono">
              <thead className="bg-zinc-900 border-b border-zinc-800 uppercase tracking-widest text-orange-400 font-black">
                <tr>
                  <th className="px-6 py-4">{isFr ? 'Agence / Organe de presse' : 'Media / Source Name'}</th>
                  <th className="px-6 py-4">{isFr ? 'Rubrique standard' : 'Default Category'}</th>
                  <th className="px-6 py-4">{isFr ? 'Vérification de Santé' : 'Health Audit'}</th>
                  <th className="px-6 py-4 text-center">{isFr ? 'Statut' : 'Active'}</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeds.map((feed, index) => {
                  const health = feedHealthMap[feed.url];
                  return (
                    <tr key={`${feed.id}-${index}`} className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl shrink-0">{feed.originFlag || '📰'}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditFeed(feed)}
                                className="font-extrabold text-white text-xs hover:text-orange-400 text-left transition-colors cursor-pointer group flex items-center gap-1.5"
                                title={isFr ? "Cliquer pour modifier le nom ou l'URL" : "Click to edit source details"}
                              >
                                <span className="underline decoration-dotted decoration-zinc-600 group-hover:decoration-orange-400">{feed.name}</span>
                                <Edit3 size={11} className="text-zinc-500 group-hover:text-orange-400 shrink-0" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-zinc-500 font-mono max-w-xs truncate block">{feed.url}</span>
                              <a
                                href={feed.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-600 hover:text-orange-400 transition-colors"
                                title={isFr ? "Ouvrir le flux RSS original" : "Open original RSS stream"}
                              >
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md font-bold uppercase text-[9px]">
                          {feed.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {health ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                            <span className={health.status === 'healthy' ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                              {health.status === 'healthy' ? `OK (${health.itemCount} ${isFr ? 'articles' : 'stories'})` : 'FAIL'}
                            </span>
                            {health.errorDetail && (
                              <span className="text-[10px] text-zinc-500 max-w-xs truncate block" title={health.errorDetail}>
                                - {health.errorDetail}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic">{isFr ? 'Jamais vérifié' : 'Never audited'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleFeed(feed.id)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${feed.active ? 'bg-orange-600' : 'bg-zinc-800'}`}
                        >
                          <span className={`w-4 h-4 bg-white rounded-full block shadow transition-transform ${feed.active ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {/* Button to open articles 1-by-1 inspector for this feed */}
                          <button
                            onClick={() => handleInspectFeed(feed)}
                            className="px-2.5 py-1.5 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-500/60 rounded-lg transition-all font-bold text-[10px] flex items-center gap-1.5 cursor-pointer"
                            title={isFr ? "Explorer les articles et rédiger 1 par 1" : "Inspect articles and generate 1-by-1"}
                          >
                            <ListStart size={12} />
                            <span>{isFr ? 'Articles (1 par 1)' : 'Stories (1-by-1)'}</span>
                          </button>

                          {/* Quick 1-story generator */}
                          <button
                            onClick={() => handleQuickGenerateOneFromFeed(feed)}
                            disabled={quickDraftingFeedId === feed.id}
                            className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-all font-bold text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title={isFr ? "Rédiger le dernier article immédiatement" : "Draft latest story immediately"}
                          >
                            <Sparkles size={11} className={quickDraftingFeedId === feed.id ? 'animate-spin' : ''} />
                            <span>{quickDraftingFeedId === feed.id ? '...' : (isFr ? '1 Art.' : '1 Story')}</span>
                          </button>

                          {/* Edit Source Button */}
                          <button
                            onClick={() => handleOpenEditFeed(feed)}
                            className="p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-orange-950/20 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title={isFr ? "Modifier les détails de la source" : "Edit media source details"}
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            onClick={() => handleCheckFeedHealth(feed)}
                            disabled={testingFeedUrl === feed.url}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title={isFr ? "Vérifier la connexion" : "Check connection"}
                          >
                            <RefreshCw size={13} className={testingFeedUrl === feed.url ? 'animate-spin' : ''} />
                          </button>

                          <button
                            onClick={() => handleProcessFeed(feed)}
                            disabled={processingFeedId === feed.id}
                            className="px-2.5 py-1.5 bg-zinc-950 hover:bg-orange-950/20 text-orange-400 hover:text-orange-300 border border-zinc-800 hover:border-orange-900 rounded-lg transition-all font-bold text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Play size={11} className={processingFeedId === feed.id ? 'animate-spin' : ''} />
                            <span>{processingFeedId === feed.id ? (isFr ? 'IA...' : 'AI...') : (isFr ? 'Auto (2 art.)' : 'Auto (2 art.)')}</span>
                          </button>

                          <button
                            onClick={() => handleRemoveFeed(feed.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/50 rounded-lg transition-colors cursor-pointer"
                            title={isFr ? "Supprimer la source" : "Delete wire"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SCHEDULER TUNING ==================== */}
      {activeSubTab === 'scheduler' && (
        <form onSubmit={handleSaveScheduler} className="space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="border-b border-zinc-800 pb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Clock size={16} className="text-orange-500" />
                {isFr ? 'Tuning du Planificateur Automatique' : 'Scheduler Intervals & Auto-Ingestion'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {isFr 
                  ? 'Gérez la fréquence d’ingestion automatique et configurez les déclencheurs asynchrones de rédaction IA.' 
                  : 'Configure how frequently our server processes wire agencies in the background.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enabled State */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono font-bold uppercase text-orange-400">
                    {isFr ? 'Statut du Planificateur' : 'Scheduler Status'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-extrabold border transition-all cursor-pointer ${
                      autoSchedule.enabled 
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {autoSchedule.enabled ? (isFr ? 'ACTIF' : 'ACTIVE') : (isFr ? 'INACTIF' : 'INACTIVE')}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                  {isFr 
                    ? 'Permet au serveur de lancer régulièrement les scans asynchrones des agences de presse de manière entièrement autonome.' 
                    : 'Enables our background scheduler service to automatically parse wires and script articles.'}
                </p>
              </div>

              {/* Interval Tuning */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <label className="text-xs font-mono font-bold uppercase text-orange-400 block">
                  {isFr ? 'Fréquence d\'Ingestion' : 'Ingestion Frequency'}
                </label>
                <select
                  value={autoSchedule.intervalMinutes}
                  onChange={e => setAutoSchedule(prev => ({ ...prev, intervalMinutes: parseInt(e.target.value) }))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-lg p-2 outline-none focus:border-orange-500"
                >
                  <option value={15}>{isFr ? 'Toutes les 15 minutes' : 'Every 15 minutes'}</option>
                  <option value={30}>{isFr ? 'Toutes les 30 minutes' : 'Every 30 minutes'}</option>
                  <option value={60}>{isFr ? 'Toutes les heures' : 'Every hour'}</option>
                  <option value={180}>{isFr ? 'Toutes les 3 heures' : 'Every 3 hours'}</option>
                  <option value={360}>{isFr ? 'Toutes les 6 heures' : 'Every 6 hours'}</option>
                  <option value={720}>{isFr ? 'Deux fois par jour (12h)' : 'Twice daily (12h)'}</option>
                </select>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {isFr ? 'Intervalle temporel minimum requis entre deux cycles de scans.' : 'Minimum elapsed window between background scan cycles.'}
                </p>
              </div>

              {/* Pack selection */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <label className="text-xs font-mono font-bold uppercase text-orange-400 block">
                  {isFr ? 'Cible des Scans' : 'Target Scan Pack'}
                </label>
                <select
                  value={autoSchedule.targetPack}
                  onChange={e => setAutoSchedule(prev => ({ ...prev, targetPack: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-lg p-2 outline-none focus:border-orange-500"
                >
                  <option value="all">{isFr ? 'Tous les flux actifs' : 'All active feeds'}</option>
                  <option value="senegal">Sénégal Wire Only</option>
                  <option value="africa">Afrique Wire Only</option>
                  <option value="world">World News Only</option>
                  <option value="sports">Sports & Football Only</option>
                </select>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {isFr ? 'Sous-ensemble thématique sur lequel le planificateur effectuera sa passe.' : 'The specific subset targeted by background cron tasks.'}
                </p>
              </div>

              {/* Limit items */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <label className="text-xs font-mono font-bold uppercase text-orange-400 block">
                  {isFr ? 'Limite d\'Articles rédigés par Cycle' : 'Max Drafts created per Feed'}
                </label>
                <select
                  value={autoSchedule.maxArticlesPerCycle}
                  onChange={e => setAutoSchedule(prev => ({ ...prev, maxArticlesPerCycle: parseInt(e.target.value) }))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-lg p-2 outline-none focus:border-orange-500"
                >
                  <option value={1}>1 {isFr ? 'article par flux' : 'article per feed'}</option>
                  <option value={2}>2 {isFr ? 'articles par flux' : 'articles per feed'}</option>
                  <option value={3}>3 {isFr ? 'articles par flux' : 'articles per feed'}</option>
                  <option value={5}>5 {isFr ? 'articles par flux' : 'articles per feed'}</option>
                </select>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {isFr ? 'Régule la quantité de brouillons créés à chaque passage pour préserver vos jetons API.' : 'Protects your LLM tokens by bounding drafting cycles.'}
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2 border-t border-zinc-800/60">
              <button
                type="submit"
                disabled={scheduleLoading}
                className="px-6 py-3 bg-[#E85D42] hover:bg-[#d45037] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sliders size={15} />
                <span>{scheduleLoading ? (isFr ? 'Persistance...' : 'Saving Config...') : (isFr ? 'Sauvegarder la Planification' : 'Save Scheduler Settings')}</span>
              </button>
            </div>
          </div>

          {/* Scheduler Execution Log Streaming */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Terminal size={14} />
                <span>{isFr ? 'Logs de Diagnostic du Planificateur' : 'Scheduler Logs & Diagnostics'}</span>
              </h3>
              <div className="flex gap-2 text-[10px] font-mono text-zinc-500">
                <span>Created: <strong>{autoSchedule.totalDraftsCreated}</strong> drafts</span>
                <span>•</span>
                <span>Last Run: <strong>{autoSchedule.lastRunAt ? new Date(autoSchedule.lastRunAt).toLocaleTimeString() : '--'}</strong></span>
              </div>
            </div>

            <div className="bg-black border border-zinc-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto space-y-1.5">
              {autoSchedule.logs && autoSchedule.logs.length > 0 ? (
                autoSchedule.logs.map((log, index) => (
                  <div key={log.id || index} className="flex items-start gap-2.5">
                    <span className="text-zinc-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-bold px-1 rounded-sm uppercase shrink-0 text-[9px] ${
                      log.type === 'success' ? 'bg-emerald-950 text-emerald-400' :
                      log.type === 'error' ? 'bg-red-950 text-red-400' :
                      log.type === 'warning' ? 'bg-amber-950 text-amber-400' :
                      'bg-zinc-900 text-zinc-400'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-zinc-300">{log.message}</span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 italic text-center py-6">
                  {isFr ? 'Aucun log d’exécution disponible pour le moment.' : 'No background cron execution logs available yet.'}
                </p>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ==================== WEBHOOK INBOUND ==================== */}
      {activeSubTab === 'webhook' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="border-b border-zinc-800 pb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Zap size={16} className="text-orange-500" />
                {isFr ? 'Pipeline d’Intégration Webhook Inbound' : 'Inbound Webhook API Pipeline'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {isFr 
                  ? 'Connectez vos pipelines d’actualités n8n, Make, Zapier ou vos scripts Python directement à l’API Perspective.' 
                  : 'Receive structured bilingual drafts seamlessly from third-party workflow triggers.'}
              </p>
            </div>

            {/* Target Endpoint */}
            <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-bold uppercase text-[#E85D42]">
                  {isFr ? 'Point de Terminaison d\'API (Endpoint)' : 'POST Webhook Endpoint'}
                </label>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookEndpoint);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono font-bold text-zinc-300 hover:text-white rounded-lg border border-zinc-700 transition-all flex items-center gap-1 cursor-pointer"
                >
                  {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedUrl ? (isFr ? 'Copié !' : 'Copied!') : (isFr ? 'Copier' : 'Copy')}</span>
                </button>
              </div>

              <div className="bg-black/80 px-4 py-3 rounded-xl border border-zinc-900 font-mono text-xs text-orange-400 font-bold select-all break-all">
                {webhookEndpoint}
              </div>
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                {isFr 
                  ? 'Envoyez des requêtes HTTP POST avec le schéma JSON Perspective pour générer ou publier des articles en direct.' 
                  : 'Post structured payloads to immediately append new content nodes directly to Perspective portal.'}
              </p>
            </div>

            {/* Simulation controls */}
            <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase text-zinc-400">
                {isFr ? 'Console de Test du Pipeline Inbound' : 'Inbound Pipeline Simulation Console'}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isFr 
                  ? 'Simulez un appel webhook Make / Zapier entrant pour injecter immédiatement un brouillon d\'analyse économique test.' 
                  : 'Trigger an instantaneous mock payload request to verify endpoint integrity and pipeline stability.'}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSendTestWebhook}
                  disabled={webhookLoading}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-[#E85D42] hover:text-orange-400 rounded-xl border border-orange-900/50 hover:border-orange-500 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send size={14} className={webhookLoading ? 'animate-spin' : ''} />
                  <span>{webhookLoading ? (isFr ? 'Envoi...' : 'Dispatching...') : (isFr ? 'Simuler l\'Appel Webhook' : 'Simulate Webhook Call')}</span>
                </button>

                <button
                  onClick={handlePurgeTestArticles}
                  disabled={purgeLoading}
                  className="px-5 py-2.5 bg-zinc-950 hover:bg-red-950/20 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-red-400 rounded-xl border border-red-900/30 hover:border-red-500 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{purgeLoading ? (isFr ? 'Purge...' : 'Purging...') : (isFr ? 'Purger Brouillons Tests' : 'Purge Simulated Drafts')}</span>
                </button>
              </div>

              {webhookResult && (
                <div className={`p-4 rounded-xl border font-mono text-xs ${
                  webhookResult.success ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' : 'bg-red-950/40 border-red-800/80 text-red-300'
                }`}>
                  <div className="font-bold mb-1">{webhookResult.success ? 'SUCCESS ✓' : 'ERROR ✕'}</div>
                  <p>{webhookResult.message}</p>
                  {webhookResult.article && (
                    <div className="mt-2 text-[10px] text-zinc-400 bg-black/60 p-2.5 rounded-lg border border-zinc-900/60 overflow-x-auto max-h-24">
                      Created Node ID: <strong>{webhookResult.article.id}</strong><br />
                      Title (FR): {webhookResult.article.title?.fr}<br />
                      Status: {webhookResult.article.isPublished ? "Published" : "Draft"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Feed */}
      {showAddFeedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-6">
            <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
              <h3 className="font-black text-white text-base uppercase tracking-widest flex items-center gap-2">
                <Plus size={18} className="text-[#E85D42]" />
                {isFr ? 'Nouvelle Source de Presse' : 'Index Custom Feed Source'}
              </h3>
              <button 
                onClick={() => setShowAddFeedModal(false)}
                className="text-zinc-400 hover:text-white font-mono text-sm uppercase font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFeed} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">{isFr ? 'Nom de la source' : 'Feed / Publisher Name'}</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: AIP Côte d'Ivoire, Le Soleil SN..."
                  value={newFeedName}
                  onChange={e => setNewFeedName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">{isFr ? 'URL du Flux RSS' : 'RSS XML / Atom URL'}</label>
                <input 
                  type="text" 
                  required
                  placeholder="https://example.com/rss"
                  value={newFeedUrl}
                  onChange={e => setNewFeedUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">{isFr ? 'Rubrique standard' : 'Category'}</label>
                  <select
                    value={newFeedCategory}
                    onChange={e => setNewFeedCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs font-mono rounded-xl p-2.5 outline-none focus:border-orange-500"
                  >
                    {['Politique', 'Économie', 'Société', 'Sports', 'International', 'Dossiers', 'Culture'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">{isFr ? 'Pack Thématique' : 'Target Pack'}</label>
                  <select
                    value={newFeedPack}
                    onChange={e => setNewFeedPack(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs font-mono rounded-xl p-2.5 outline-none focus:border-orange-500"
                  >
                    <option value="senegal">🇸🇳 Sénégal Wire</option>
                    <option value="africa">🌍 Regional Africa</option>
                    <option value="world">🌐 International</option>
                    <option value="sports">⚽ Sports</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddFeedModal(false)}
                  className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E85D42] hover:bg-[#d45037] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-orange-950/20"
                >
                  {isFr ? 'Ajouter la source' : 'Index Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Feed */}
      {editingFeed && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
              <h3 className="font-black text-white text-base uppercase tracking-widest flex items-center gap-2">
                <Edit3 size={18} className="text-orange-500" />
                {isFr ? 'Modifier la Source / Organe de presse' : 'Edit Media / Source Name'}
              </h3>
              <button 
                onClick={() => setEditingFeed(null)}
                className="text-zinc-400 hover:text-white font-mono text-sm uppercase font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedFeed} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-orange-400 block">
                  {isFr ? 'Nom du Média / Organe de presse' : 'Media / Source Name'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: APS Sénégal, Reuters, Jeune Afrique..."
                  value={editFeedName}
                  onChange={e => setEditFeedName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                  {isFr ? 'URL du Flux RSS' : 'RSS XML / Atom URL'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="https://example.com/rss"
                  value={editFeedUrl}
                  onChange={e => setEditFeedUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                    {isFr ? 'Rubrique standard' : 'Default Category'}
                  </label>
                  <select
                    value={editFeedCategory}
                    onChange={e => setEditFeedCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs font-mono rounded-xl p-2.5 outline-none focus:border-orange-500"
                  >
                    {['Politique', 'Économie', 'Société', 'Sports', 'International', 'Dossiers', 'Culture'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                    {isFr ? 'Pack / Région' : 'Pack / Region'}
                  </label>
                  <select
                    value={editFeedPack}
                    onChange={e => {
                      const p = e.target.value;
                      setEditFeedPack(p);
                      setEditFeedFlag(p === 'senegal' ? '🇸🇳' : p === 'africa' ? '🌍' : p === 'sports' ? '⚽' : '🌐');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs font-mono rounded-xl p-2.5 outline-none focus:border-orange-500"
                  >
                    <option value="senegal">🇸🇳 Sénégal Wire</option>
                    <option value="africa">🌍 Regional Africa</option>
                    <option value="world">🌐 International</option>
                    <option value="sports">⚽ Sports</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveFeed(editingFeed.id);
                    setEditingFeed(null);
                  }}
                  className="px-3 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>{isFr ? 'Supprimer' : 'Delete'}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFeed(null)}
                    className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {isFr ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-orange-950/20"
                  >
                    {isFr ? 'Enregistrer' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SINGLE-ARTICLE RSS STUDIO MODAL (Generate 1-by-1) ==================== */}
      {inspectFeed && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-zinc-900/90 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black">
                  <ListStart size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
                      <span>{inspectFeed.originFlag || '📰'}</span>
                      <span>{inspectFeed.name}</span>
                    </h3>
                    <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded font-mono text-[10px] font-bold">
                      {isFr ? 'Génération 1 par 1' : '1-by-1 Studio'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate max-w-md font-mono mt-0.5">
                    {inspectFeed.url}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Switch feed selector */}
                <select
                  value={inspectFeed.id}
                  onChange={(e) => {
                    const found = rssFeeds.find(f => f.id === e.target.value);
                    if (found) handleInspectFeed(found);
                  }}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 outline-none font-mono focus:border-orange-500"
                >
                  {rssFeeds.map((f, i) => (
                    <option key={`${f.id}-${i}`} value={f.id}>
                      {f.originFlag} {f.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleInspectFeed(inspectFeed)}
                  disabled={loadingFeedItems}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-700 transition-colors cursor-pointer"
                  title={isFr ? 'Recharger le flux' : 'Reload feed'}
                >
                  <RefreshCw size={14} className={loadingFeedItems ? 'animate-spin text-orange-400' : ''} />
                </button>

                <button
                  onClick={() => setInspectFeed(null)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Sub-header with search and info */}
            <div className="px-5 py-3 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-400 w-full sm:w-auto">
                <span className="font-mono text-zinc-500">
                  {loadingFeedItems ? (isFr ? 'Scan du flux RSS...' : 'Reading RSS feed...') : `${feedItems.length} ${isFr ? 'articles disponibles' : 'stories found'}`}
                </span>
              </div>

              <div className="relative w-full sm:w-72">
                <Search size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder={isFr ? "Filtrer les titres du flux..." : "Filter feed items..."}
                  value={feedItemSearch}
                  onChange={(e) => setFeedItemSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            {/* Modal Body: Feed Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingFeedItems ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw size={32} className="animate-spin text-orange-500 mx-auto" />
                  <p className="text-sm text-zinc-300 font-bold">
                    {isFr ? 'Connexion à l\'agence de presse et extraction des dépêches...' : 'Connecting to wire feed and retrieving articles...'}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">{inspectFeed.url}</p>
                </div>
              ) : feedItemsError ? (
                <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-2xl text-center space-y-3">
                  <AlertCircle size={28} className="text-red-400 mx-auto" />
                  <p className="text-sm font-bold text-red-300">{feedItemsError}</p>
                  <button
                    onClick={() => handleInspectFeed(inspectFeed)}
                    className="px-4 py-2 bg-red-900/40 hover:bg-red-900/70 text-red-200 text-xs font-bold rounded-xl border border-red-800 cursor-pointer"
                  >
                    {isFr ? 'Réessayer la connexion' : 'Retry connection'}
                  </button>
                </div>
              ) : feedItems.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  {isFr ? 'Aucun article trouvé dans ce flux pour le moment.' : 'No articles found in this feed currently.'}
                </div>
              ) : (
                feedItems
                  .filter(item => {
                    if (!feedItemSearch) return true;
                    const q = feedItemSearch.toLowerCase();
                    return (item.title || '').toLowerCase().includes(q) || (item.snippet || '').toLowerCase().includes(q);
                  })
                  .map((item, idx) => {
                    const itemKey = `${inspectFeed.id}-${idx}-${(item.title || '').slice(0, 25)}`;
                    const isGenerating = generatingItemKey === itemKey;
                    const generatedArticle = generatedResults[itemKey];
                    const cfg = itemConfig[itemKey] || {
                      category: inspectFeed.category || 'Économie',
                      type: 'News',
                      engine: 'auto',
                      customPrompt: ''
                    };

                    const updateCfg = (updates: Partial<typeof cfg>) => {
                      setItemConfig(prev => ({
                        ...prev,
                        [itemKey]: { ...cfg, ...updates }
                      }));
                    };

                    return (
                      <div
                        key={itemKey}
                        className={`p-5 rounded-2xl border transition-all ${
                          generatedArticle
                            ? 'bg-emerald-950/10 border-emerald-800/40 shadow-lg shadow-emerald-950/10'
                            : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          {/* Item Content Preview */}
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 bg-zinc-800 text-orange-400 rounded font-mono text-[10px] font-bold">
                                #{idx + 1}
                              </span>
                              {item.pubDate && (
                                <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                                  <Clock size={11} />
                                  {new Date(item.pubDate).toLocaleDateString()} {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {item.author && (
                                <span className="text-[11px] text-zinc-500 font-mono">
                                  • {item.author}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                              {item.title}
                            </h4>

                            {item.snippet && (
                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                {item.snippet}
                              </p>
                            )}

                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-orange-400/80 hover:text-orange-400 hover:underline font-mono"
                              >
                                <ExternalLink size={10} />
                                <span>{isFr ? 'Consulter la source originale' : 'View original source'}</span>
                              </a>
                            )}
                          </div>

                          {/* 1-by-1 Tuning Controls & Trigger */}
                          <div className="bg-black/60 p-4 border border-zinc-800/80 rounded-xl space-y-3 lg:w-80 flex-shrink-0">
                            <div className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider">
                              {isFr ? 'Options de Rédaction IA' : 'AI Story Configuration'}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                                  {isFr ? 'Rubrique' : 'Category'}
                                </label>
                                <select
                                  value={cfg.category}
                                  onChange={(e) => updateCfg({ category: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-1.5 font-mono outline-none focus:border-orange-500"
                                >
                                  {['Politique', 'Économie', 'Société', 'Sports', 'International', 'Tech & Innovation', 'Culture', 'Dossiers'].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                                  {isFr ? 'Format' : 'Style'}
                                </label>
                                <select
                                  value={cfg.type}
                                  onChange={(e) => updateCfg({ type: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-1.5 font-mono outline-none focus:border-orange-500"
                                >
                                  <option value="News">{isFr ? 'Actualité (News)' : 'News'}</option>
                                  <option value="Analysis">{isFr ? 'Analyse de fond' : 'Analysis'}</option>
                                  <option value="Deep Dive">{isFr ? 'Grand Dossier' : 'Deep Dive'}</option>
                                  <option value="Explainer">{isFr ? 'Décryptage' : 'Explainer'}</option>
                                  <option value="Opinion">{isFr ? 'Tribune' : 'Opinion'}</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                                {isFr ? 'Moteur IA' : 'AI Engine'}
                              </label>
                              <select
                                value={cfg.engine}
                                onChange={(e) => updateCfg({ engine: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-1.5 font-mono outline-none focus:border-orange-500"
                              >
                                <option value="auto">⚡ Auto-Orchestrator (Railway / Env)</option>
                                <option value="gemini">✨ Gemini 2.0 Flash / Pro</option>
                                <option value="groq">⚡ Groq (Llama 3.3 70B Fast)</option>
                                <option value="openrouter">🌐 OpenRouter (Multi-Model)</option>
                                <option value="openai">🤖 OpenAI (GPT-4o)</option>
                              </select>
                            </div>

                            {/* Trigger Button */}
                            <button
                              onClick={() => handleGenerateSingleItem(item, idx)}
                              disabled={isGenerating}
                              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                                generatedArticle
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white'
                              } disabled:opacity-50`}
                            >
                              {isGenerating ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" />
                                  <span>{isFr ? 'Rédaction IA en cours...' : 'Writing Article...'}</span>
                                </>
                              ) : generatedArticle ? (
                                <>
                                  <RefreshCw size={13} />
                                  <span>{isFr ? 'Regénérer cet article' : 'Re-generate Article'}</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={13} />
                                  <span>{isFr ? '⚡ Rédiger cet article (1 par 1)' : '⚡ Generate This Story'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Generated Result Card Preview */}
                        {generatedArticle && (
                          <div className="mt-4 pt-4 border-t border-emerald-800/30 bg-emerald-950/20 p-4 rounded-xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                  {isFr ? 'Article Rédigé avec succès' : 'Story Drafted Successfully'}
                                </span>
                                {generatedArticle.aiGenerated && (
                                  <span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 rounded font-mono text-[9px] font-bold">
                                    {generatedArticle.aiModelUsed || 'AI Orchestrated'}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {onEditArticle && (
                                  <button
                                    onClick={() => {
                                      onEditArticle(generatedArticle);
                                      setInspectFeed(null);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                                  >
                                    <Edit3 size={13} />
                                    <span>{isFr ? "Ouvrir dans l'Éditeur" : 'Open in Editor'}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h5 className="font-bold text-white text-sm">
                                🇫🇷 {generatedArticle.title?.fr || generatedArticle.title}
                              </h5>
                              {generatedArticle.title?.en && (
                                <p className="text-xs text-zinc-400 italic">
                                  🇬🇧 {generatedArticle.title.en}
                                </p>
                              )}
                            </div>

                            {generatedArticle.excerpt?.fr && (
                              <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                                {generatedArticle.excerpt.fr}
                              </p>
                            )}

                            <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                              <span>⏱️ {generatedArticle.readingTime || 4} min read</span>
                              <span>📁 {generatedArticle.category}</span>
                              <span>✍️ {generatedArticle.author}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-400">
              <span className="font-mono">
                {isFr ? 'Sélectionnez un article pour le rédiger individuellement via votre IA configurée.' : 'Select an article to script it individually via your configured AI.'}
              </span>
              <button
                onClick={() => setInspectFeed(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl cursor-pointer"
              >
                {isFr ? 'Fermer le Studio' : 'Close Studio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
