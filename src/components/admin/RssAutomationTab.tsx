import React, { useState, useEffect } from 'react';
import { 
  Zap, Globe, RefreshCw, Plus, Trash2, CheckCircle2, Eye, Edit2, Sparkles, 
  Layers, Bot, ArrowRight, ExternalLink, AlertCircle, FileText, Check, ShieldCheck, Clock,
  Activity, AlertTriangle, Server, Wifi, Cpu, Play, Link as LinkIcon, GitBranch,
  LayoutGrid, ListFilter, ArrowDown, ChevronRight, Share2, CheckSquare, Sliders, Info
} from 'lucide-react';
import { useStore } from '../../store';
import { Article } from '../../types';

interface RssAutomationTabProps {
  onEditArticle?: (article: Article) => void;
  onRefreshArticles?: () => void;
}

export interface FeedHealthRecord {
  id?: string;
  url: string;
  name?: string;
  status: 'healthy' | 'degraded' | 'error' | 'unchecked';
  statusCode: number;
  itemCount: number;
  latencyMs: number;
  lastItemTitle?: string;
  lastFetch: string | null;
  errorMessage?: string | null;
}

export const RSS_CATEGORIES = [
  'Politique',
  'Économie',
  'Société',
  'International',
  "L'Arène",
  'Dossiers',
  'Flash Info',
  'Météo & Maritime',
  'Chaloupe & Transports',
  'Culture & People',
  'Tech & Innovation'
];

// Helper for safe client API calls preventing JSON parse errors on HTML responses
export async function safeFetchJson(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    
    if (!contentType.includes("application/json") && text.trim().startsWith("<")) {
      return { 
        ok: false, 
        status: res.status, 
        data: null, 
        error: `Le serveur a retourné une réponse HTML au lieu de JSON (HTTP ${res.status}). Vérifiez les routes API.` 
      };
    }
    
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { 
        ok: false, 
        status: res.status, 
        data: null, 
        error: `Structure de réponse JSON invalide reçue de ${url} (HTTP ${res.status}).` 
      };
    }
    
    return { ok: res.ok, status: res.status, data, error: data?.error || null };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err?.message || "Erreur de connexion réseau" };
  }
}

export const ALL_RELIABLE_RSS_FEEDS = [
  // --- SÉNÉGAL PRESS & MEDIA ---
  { id: 'aps', name: 'APS (Agence de Presse Sénégalaise)', url: 'https://aps.sn/feed/', category: 'Politique', pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
  { id: 'lesoleil', name: 'Le Soleil (Journal National)', url: 'https://lesoleil.sn/feed/', category: 'Économie', pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
  { id: 'senenews', name: 'SeneNews Sénégal', url: 'https://www.senenews.com/feed', category: "L'Arène", pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
  { id: 'pressafrik', name: 'PressAfrik Sénégal', url: 'https://www.pressafrik.com/xml/syndication.rss', category: 'Politique', pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
  { id: 'seneweb', name: 'Seneweb Actualités Wire', url: 'https://news.google.com/rss/search?q=site:seneweb.com&hl=fr&gl=SN&ceid=SN:fr', category: 'Société', pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
  { id: 'allafrica-senegal', name: 'AllAfrica Sénégal (RDF)', url: 'https://allafrica.com/tools/headlines/rdf/senegal/headlines.rdf', category: 'Politique', pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
  { id: 'sudquotidien-gn', name: 'Sud Quotidien (Google Wire)', url: 'https://news.google.com/rss/search?q=Sud+Quotidien+Senegal', category: 'Dossiers', pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
  { id: 'lequotidien-gn', name: 'Le Quotidien Sénégal (Google Wire)', url: 'https://news.google.com/rss/search?q=Le+Quotidien+Senegal', category: 'Société', pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
  { id: 'rts-gn', name: 'RTS Sénégal (Google Wire)', url: 'https://news.google.com/rss/search?q=RTS+Senegal', category: 'Politique', pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },

  // --- AFRIQUE & REGIONAL WIRE ---
  { id: 'rfiafrique', name: 'RFI Afrique', url: 'https://www.rfi.fr/fr/afrique/rss', category: 'International', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'jeuneafrique', name: 'Jeune Afrique', url: 'https://www.jeuneafrique.com/feed/', category: 'Dossiers', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'bbcafrique', name: 'BBC Afrique (FR)', url: 'https://www.bbc.com/afrique/index.xml', category: 'International', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'bbcafrica-en', name: 'BBC Africa (EN)', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', category: 'International', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'france24-afrique-fr', name: 'France 24 Afrique (FR)', url: 'https://www.france24.com/fr/afrique/rss', category: 'International', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'france24-africa-en', name: 'France 24 Africa (EN)', url: 'https://www.france24.com/en/africa/rss', category: 'International', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'africanews', name: 'Africanews Wire', url: 'https://www.africanews.com/feed/rss', category: 'International', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'allafrica-latest', name: 'AllAfrica Latest (RDF)', url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', category: 'International', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'allafrica-westafrica', name: 'AllAfrica West Africa (RDF)', url: 'https://allafrica.com/tools/headlines/rdf/westafrica/headlines.rdf', category: 'International', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'afrikcom', name: 'Afrik.com (Google Wire)', url: 'https://news.google.com/rss/search?q=site:afrik.com&hl=fr&gl=SN&ceid=SN:fr', category: 'Société', pack: 'africa', originCountry: 'Panafricain', originFlag: '🌍', originRegion: 'Afrique & Sub-Saharienne', active: true },
  { id: 'aip-ci', name: 'AIP (Agence Ivoirienne de Presse)', url: 'https://news.google.com/rss/search?q=Agence+Ivoirienne+de+Presse&hl=fr&gl=SN&ceid=SN:fr', category: 'International', pack: 'africa', originCountry: "Côte d'Ivoire", originFlag: '🇨🇮', originRegion: 'Afrique & Sub-Saharienne', active: true },

  // --- INTERNATIONAL & WORLD PRESS ---
  { id: 'bbc-world', name: 'BBC World News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'International', pack: 'world', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: 'International & Global', active: true },
  { id: 'aljazeera', name: 'Al Jazeera English', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'International', pack: 'world', originCountry: 'Qatar', originFlag: '🇶🇦', originRegion: 'International & Global', active: true },
  { id: 'france24-en', name: 'France 24 English', url: 'https://www.france24.com/en/rss', category: 'International', pack: 'world', originCountry: 'France', originFlag: '🇫🇷', originRegion: 'International & Global', active: true },
  { id: 'france24-fr', name: 'France 24 Français', url: 'https://www.france24.com/fr/rss', category: 'International', pack: 'world', originCountry: 'France', originFlag: '🇫🇷', originRegion: 'International & Global', active: true },
  { id: 'bloomberg-mkts', name: 'Bloomberg Markets', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Économie', pack: 'world', originCountry: 'États-Unis', originFlag: '🇺🇸', originRegion: 'International & Global', active: true },
  { id: 'guardian-world', name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', category: 'International', pack: 'world', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: 'International & Global', active: true },
  { id: 'reuters-world', name: 'Reuters World (Google Wire)', url: 'https://news.google.com/rss/search?q=Reuters+World+News&hl=fr&gl=SN&ceid=SN:fr', category: 'International', pack: 'world', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: 'International & Global', active: true },
  { id: 'reuters-biz', name: 'Reuters Business (Google Wire)', url: 'https://news.google.com/rss/search?q=Reuters+Business+News&hl=fr&gl=SN&ceid=SN:fr', category: 'Économie', pack: 'world', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: 'International & Global', active: true },
  { id: 'cnn-world', name: 'CNN World (Google Wire)', url: 'https://news.google.com/rss/search?q=CNN+World+News&hl=fr&gl=SN&ceid=SN:fr', category: 'International', pack: 'world', originCountry: 'États-Unis', originFlag: '🇺🇸', originRegion: 'International & Global', active: true },
  { id: 'dw-world', name: 'Deutsche Welle (DW)', url: 'https://rss.dw.com/rdf/rss-en-all', category: 'International', pack: 'world', originCountry: 'Allemagne', originFlag: '🇩🇪', originRegion: 'International & Global', active: true },
  { id: 'cbc-top', name: 'CBC Top Stories', url: 'https://www.cbc.ca/webfeed/rss/rss-topstories', category: 'International', pack: 'world', originCountry: 'Canada', originFlag: '🇨🇦', originRegion: 'International & Global', active: true },
  { id: 'foxnews', name: 'Fox News Latest', url: 'https://feeds.foxnews.com/foxnews/latest', category: 'International', pack: 'world', originCountry: 'États-Unis', originFlag: '🇺🇸', originRegion: 'International & Global', active: true },

  // --- SPORTS & L'ARÈNE / FOOTBALL ---
  { id: 'bbc-football', name: 'BBC Football Wire', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', category: "L'Arène", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "L'Arène & Sports", active: true },
  { id: 'bbc-epl', name: 'BBC Premier League', url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml', category: "L'Arène", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "L'Arène & Sports", active: true },
  { id: 'bbc-ucl', name: 'BBC UEFA Champions League', url: 'https://feeds.bbci.co.uk/sport/football/champions-league/rss.xml', category: "L'Arène", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "L'Arène & Sports", active: true },
  { id: 'bbc-uel', name: 'BBC UEFA Europa League', url: 'https://feeds.bbci.co.uk/sport/football/europa-league/rss.xml', category: "L'Arène", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "L'Arène & Sports", active: true },
  { id: 'sky-sports-fb', name: 'Sky Sports Football', url: 'https://www.skysports.com/rss/12040', category: "L'Arène", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "L'Arène & Sports", active: true },
  { id: 'rmc-ligue1', name: 'RMC Sport Ligue 1 (France)', url: 'https://rmcsport.bfmtv.com/rss/football/ligue-1/', category: "L'Arène", pack: 'sports', originCountry: 'France', originFlag: '🇫🇷', originRegion: "L'Arène & Sports", active: true },
  { id: 'espn-fc', name: 'ESPN FC Soccer (Google Wire)', url: 'https://news.google.com/rss/search?q=site:espn.com+soccer&hl=fr&gl=SN&ceid=SN:fr', category: "L'Arène", pack: 'sports', originCountry: 'États-Unis', originFlag: '🇺🇸', originRegion: "L'Arène & Sports", active: true },
  { id: 'teranga-lions-gn', name: 'Équipe du Sénégal (Teranga Lions Wire)', url: 'https://news.google.com/rss/search?q=Teranga+Lions', category: "L'Arène", pack: 'sports', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: "L'Arène & Sports", active: true }
];

const DEFAULT_RSS_FEEDS = ALL_RELIABLE_RSS_FEEDS.slice(0, 12);

export function normalizeRssFeedUrl(url: string | undefined | null, feedName?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes('feeds.reuters.com') || lower.includes('reuters.com/rss')) {
    if (lower.includes('business') || (feedName && feedName.toLowerCase().includes('business'))) {
      return 'https://news.google.com/rss/search?q=site:reuters.com+business&hl=fr&gl=SN&ceid=SN:fr';
    }
    return 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=fr&gl=SN&ceid=SN:fr';
  }

  if (lower.includes('seneweb.com/rss') || lower.includes('seneweb.com/feed')) {
    return 'https://news.google.com/rss/search?q=site:seneweb.com&hl=fr&gl=SN&ceid=SN:fr';
  }

  if (lower.includes('rss.cnn.com')) {
    return 'https://news.google.com/rss/search?q=site:cnn.com+world&hl=fr&gl=SN&ceid=SN:fr';
  }

  if (lower.includes('nhk.or.jp')) {
    return 'https://news.google.com/rss/search?q=NHK+World+News&hl=fr&gl=SN&ceid=SN:fr';
  }

  if (lower.includes('espn.com/espn/rss') || (lower.includes('espn.com') && lower.includes('rss'))) {
    return 'https://news.google.com/rss/search?q=site:espn.com+soccer&hl=fr&gl=SN&ceid=SN:fr';
  }

  return trimmed;
}

export function ensureValidUrl(url: string | undefined | null, feedName?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'undefined' || trimmed === 'null') return null;
  trimmed = normalizeRssFeedUrl(trimmed, feedName);
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getArticleSourceInfo(draft: any, rssFeeds: any[] = ALL_RELIABLE_RSS_FEEDS) {
  let sourceName = draft.sourceName || "";
  let sourceDomain = draft.sourceDomain || "";
  let rawUrl = draft.originalUrl || draft.sourceUrl || "";
  let feedUrl = draft.feedUrl || "";
  let originCountry = draft.sourceCountry || draft.originCountry || "";
  let originFlag = draft.sourceFlag || draft.originFlag || "";

  let originalUrl = ensureValidUrl(rawUrl) || ensureValidUrl(feedUrl) || "";

  if (!sourceDomain && originalUrl) {
    try {
      sourceDomain = new URL(originalUrl).hostname.replace(/^www\./, "");
    } catch (e) {
      sourceDomain = "";
    }
  }

  if (!sourceDomain && feedUrl) {
    try {
      sourceDomain = new URL(feedUrl).hostname.replace(/^www\./, "");
    } catch (e) {
      sourceDomain = "";
    }
  }

  // Find matching feed definition
  const matchedFeed = rssFeeds.find((f: any) => 
    (f.url && feedUrl && f.url === feedUrl) || 
    (f.url && originalUrl && f.url === originalUrl) ||
    (f.id && draft.id && draft.id.includes(f.id)) ||
    (sourceDomain && f.url && f.url.includes(sourceDomain))
  );

  if (matchedFeed) {
    if (!sourceName) sourceName = matchedFeed.name;
    if (!originCountry) originCountry = matchedFeed.originCountry;
    if (!originFlag) originFlag = matchedFeed.originFlag;
  }

  // Fallback origin rules based on domain or name
  if (!originCountry) {
    const lower = (sourceName + " " + sourceDomain + " " + originalUrl).toLowerCase();
    if (lower.includes("senegal") || lower.includes("sénégal") || lower.includes(".sn") || lower.includes("aps") || lower.includes("lesoleil") || lower.includes("seneweb") || lower.includes("senenews") || lower.includes("pressafrik")) {
      originCountry = "Sénégal";
      originFlag = "🇸🇳";
    } else if (lower.includes("ivoir") || lower.includes("aip.ci") || lower.includes(".ci")) {
      originCountry = "Côte d'Ivoire";
      originFlag = "🇨🇮";
    } else if (lower.includes("rfi") || lower.includes("france24") || lower.includes("jeuneafrique") || lower.includes("afrik") || lower.includes("africanews") || lower.includes("allafrica")) {
      originCountry = "Panafricain";
      originFlag = "🌍";
    } else if (lower.includes("bbc") || lower.includes("guardian") || lower.includes("skysports") || lower.includes("reuters")) {
      originCountry = "Royaume-Uni";
      originFlag = "🇬🇧";
    } else if (lower.includes("aljazeera")) {
      originCountry = "Qatar";
      originFlag = "🇶🇦";
    } else if (lower.includes("rmc") || lower.includes("bfmtv")) {
      originCountry = "France";
      originFlag = "🇫🇷";
    } else if (lower.includes("dw") || lower.includes("deutsche")) {
      originCountry = "Allemagne";
      originFlag = "🇩🇪";
    } else if (lower.includes("cbc")) {
      originCountry = "Canada";
      originFlag = "🇨🇦";
    } else if (lower.includes("cnn") || lower.includes("fox") || lower.includes("npr") || lower.includes("politico") || lower.includes("espn")) {
      originCountry = "États-Unis";
      originFlag = "🇺🇸";
    } else {
      originCountry = "International";
      originFlag = "🌐";
    }
  }

  if (!sourceName) {
    sourceName = "Source RSS Fil d'Actualité";
  }

  return { sourceName, sourceDomain, originalUrl, feedUrl, originCountry, originFlag };
}

export function RssAutomationTab({ onEditArticle, onRefreshArticles }: RssAutomationTabProps) {
  const { language, articles, addArticle, updateArticle, deleteArticle } = useStore();
  const isFr = language === 'fr';

  // View Mode: 'n8n' workflow canvas vs 'list' detailed list view
  const [viewMode, setViewMode] = useState<'n8n' | 'list'>('n8n');

  // State for RSS feeds
  const [rssFeeds, setRssFeeds] = useState(() => {
    const saved = localStorage.getItem('perspective_rss_feeds');
    if (!saved) return DEFAULT_RSS_FEEDS;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((f: any) => ({
          ...f,
          url: normalizeRssFeedUrl(f.url, f.name)
        }));
      }
    } catch (_) {}
    return DEFAULT_RSS_FEEDS;
  });

  // Real-time Health Dashboard state
  const [feedHealthMap, setFeedHealthMap] = useState<Record<string, FeedHealthRecord>>(() => {
    const saved = localStorage.getItem('perspective_rss_health');
    return saved ? JSON.parse(saved) : {};
  });
  const [healthChecking, setHealthChecking] = useState(false);
  const [testingFeedUrl, setTestingFeedUrl] = useState<string | null>(null);
  const [lastGlobalScan, setLastGlobalScan] = useState<string | null>(() => {
    return localStorage.getItem('perspective_rss_last_scan') || null;
  });

  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('Économie');

  // Loading & Action states
  const [processingFeedId, setProcessingFeedId] = useState<string | null>(null);
  const [runningAllPipeline, setRunningAllPipeline] = useState(false);
  const [manualPrompt, setManualPrompt] = useState('');
  const [manualCategory, setManualCategory] = useState('Économie');
  const [promptLoading, setPromptLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Drafts Repository filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectDraft, setInspectDraft] = useState<Article | null>(null);
  const [purgeLoading, setPurgeLoading] = useState(false);

  // --- AUTOMATED SCHEDULING ENGINE STATE ---
  const [autoSchedule, setAutoSchedule] = useState<any>({
    enabled: true,
    intervalMinutes: 60,
    targetPack: 'all',
    maxArticlesPerCycle: 2,
    autoPublish: false,
    lastRunAt: null,
    nextRunAt: null,
    totalRuns: 0,
    totalDraftsCreated: 0,
    status: 'idle',
    lastLog: '',
    logs: []
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [countdownText, setCountdownText] = useState<string>('--');

  // Fetch Schedule Config from Server
  const fetchScheduleConfig = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/rss-automation/config');
      if (ok && data?.success && data?.config) {
        setAutoSchedule(data.config);
      }
    } catch (e) {
      console.warn("Schedule config fetch error:", e);
    }
  };

  useEffect(() => {
    fetchScheduleConfig();
    const interval = setInterval(fetchScheduleConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // Real-time countdown calculation
  useEffect(() => {
    const updateCountdown = () => {
      if (!autoSchedule.enabled || !autoSchedule.nextRunAt) {
        setCountdownText(isFr ? 'Pause' : 'Paused');
        return;
      }
      const now = Date.now();
      const target = new Date(autoSchedule.nextRunAt).getTime();
      const diffSec = Math.floor((target - now) / 1000);

      if (diffSec <= 0) {
        setCountdownText(isFr ? 'En cours...' : 'Running...');
      } else {
        const m = Math.floor(diffSec / 60);
        const s = diffSec % 60;
        setCountdownText(`${m}m ${s < 10 ? '0' : ''}${s}s`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [autoSchedule.enabled, autoSchedule.nextRunAt, isFr]);

  const handleSaveScheduleConfig = async (updatedFields: Partial<any>) => {
    setScheduleLoading(true);
    try {
      const payload = {
        enabled: updatedFields.enabled ?? autoSchedule.enabled,
        intervalMinutes: updatedFields.intervalMinutes ?? autoSchedule.intervalMinutes,
        targetPack: updatedFields.targetPack ?? autoSchedule.targetPack,
        maxArticlesPerCycle: updatedFields.maxArticlesPerCycle ?? autoSchedule.maxArticlesPerCycle,
        autoPublish: updatedFields.autoPublish ?? autoSchedule.autoPublish
      };

      const { ok, data, error } = await safeFetchJson('/api/rss-automation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (ok && data?.success) {
        setAutoSchedule(data.config);
        showStatus(isFr ? 'Planning d\'automatisation mis à jour !' : 'Automation schedule updated!');
      } else {
        throw new Error(error || data?.error || 'Failed to save schedule');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleTriggerScheduleNow = async () => {
    setScheduleLoading(true);
    try {
      const { ok, data, error } = await safeFetchJson('/api/rss-automation/trigger-now', { method: 'POST' });
      if (ok && data?.success) {
        showStatus(isFr ? 'Cycle d\'ingestion automatique lancé en arrière-plan !' : 'Automated drafting cycle initiated!');
        fetchScheduleConfig();
      } else {
        throw new Error(error || data?.error || 'Trigger failed');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setScheduleLoading(false);
    }
  };

  // Helper to show temporary toasts
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Sync rssFeeds to localStorage
  useEffect(() => {
    localStorage.setItem('perspective_rss_feeds', JSON.stringify(rssFeeds));
  }, [rssFeeds]);

  // Action: Load preset pack of feeds
  const handleLoadPresetPack = (packKey: string) => {
    let feedsToLoad: any[] = [];
    if (packKey === 'all') {
      feedsToLoad = ALL_RELIABLE_RSS_FEEDS;
    } else {
      feedsToLoad = ALL_RELIABLE_RSS_FEEDS.filter(f => f.pack === packKey);
    }

    setRssFeeds((prevFeeds: any[]) => {
      const existingUrls = new Set(prevFeeds.map((f: any) => f.url));
      const newFeeds = feedsToLoad.filter(f => !existingUrls.has(f.url));
      const updated = [...prevFeeds, ...newFeeds];
      localStorage.setItem('perspective_rss_feeds', JSON.stringify(updated));
      return updated;
    });

    showStatus(
      isFr 
        ? `Pack chargé ! (${feedsToLoad.length} sources d'actualité intégrées au monitoring)`
        : `Pack loaded! (${feedsToLoad.length} wire sources added)`
    );
  };

  // Run real-time health check
  const runHealthCheck = async (specificUrl?: string) => {
    if (specificUrl) {
      setTestingFeedUrl(specificUrl);
    } else {
      setHealthChecking(true);
    }

    try {
      const targetFeeds = specificUrl 
        ? rssFeeds.filter((f: any) => f.url === specificUrl)
        : rssFeeds;

      const { ok, data, error } = await safeFetchJson('/api/rss/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: targetFeeds })
      });

      if (ok && data?.success && Array.isArray(data.results)) {
        setFeedHealthMap(prev => {
          const next = { ...prev };
          data.results.forEach((r: any) => {
            next[r.url] = r;
          });
          localStorage.setItem('perspective_rss_health', JSON.stringify(next));
          return next;
        });

        const scanTime = new Date().toISOString();
        setLastGlobalScan(scanTime);
        localStorage.setItem('perspective_rss_last_scan', scanTime);

        if (!specificUrl) {
          showStatus(
            isFr 
              ? `Diagnostic n8n terminé : ${data.healthyCount}/${data.totalFeeds} flux opérationnels.` 
              : `n8n Health Diagnostic complete: ${data.healthyCount}/${data.totalFeeds} feeds operational.`
          );
        } else {
          const single = data.results[0];
          showStatus(
            isFr
              ? `Diagnostic ${single?.name || 'Flux'} : Statut ${single?.status === 'healthy' ? '200 OK' : single?.status}.`
              : `Diagnostic ${single?.name || 'Feed'}: Status ${single?.status}.`
          );
        }
      }
    } catch (err: any) {
      console.error('Health check error:', err);
      showStatus(err.message || 'Health check error', 'error');
    } finally {
      setHealthChecking(false);
      setTestingFeedUrl(null);
    }
  };

  // Run health check automatically on initial component mount
  useEffect(() => {
    runHealthCheck();
  }, []);

  // Draft articles: filter stored articles where isPublished === false
  const draftArticles = (articles || []).filter(a => !a.isPublished);

  // Filter drafts by category and search
  const filteredDrafts = draftArticles.filter(draft => {
    const matchesCat = selectedCategory === 'all' || draft.category === selectedCategory;
    const titleText = (draft.title?.fr || draft.title?.en || '').toLowerCase();
    const bodyText = (draft.body?.fr || draft.body?.en || '').toLowerCase();
    const sourceText = (draft.sourceName || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || titleText.includes(q) || bodyText.includes(q) || sourceText.includes(q);
    return matchesCat && matchesSearch;
  });

  // Action: Add new RSS feed source
  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl) return;

    const id = newFeedUrl.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(-10) || Date.now().toString();
    const name = newFeedName.trim() || newFeedUrl.replace(/^https?:\/\//, '').split('/')[0];

    const updated = [...rssFeeds, { id, name, url: newFeedUrl, category: newFeedCategory, active: true }];
    setRssFeeds(updated);
    setNewFeedName('');
    setNewFeedUrl('');
    showStatus(isFr ? 'Nouveau flux RSS enregistré !' : 'New RSS feed registered!');
    runHealthCheck(newFeedUrl);
  };

  // Action: Remove an RSS feed source
  const handleRemoveFeed = (id: string) => {
    const updated = rssFeeds.filter((f: any) => f.id !== id);
    setRssFeeds(updated);
    showStatus(isFr ? 'Flux RSS retiré.' : 'RSS feed removed.');
  };

  // Action: Trigger Ingestion & AI Generation for a single RSS feed
  const handleProcessFeed = async (feedUrl: string, feedId: string, feedCategory?: string) => {
    setProcessingFeedId(feedId);
    try {
      const feedObj = rssFeeds.find((f: any) => f.id === feedId || f.url === feedUrl);
      const cat = feedCategory || feedObj?.category || 'Économie';

      const { ok, data, error } = await safeFetchJson('/api/rss/fetch-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl, category: cat, maxItems: 3, autoPublish: false })
      });

      if (!ok || !data?.success) {
        throw new Error(error || data?.error || 'Failed to fetch and process RSS feed');
      }

      if (Array.isArray(data.articles) && data.articles.length > 0) {
        data.articles.forEach((art: Article) => {
          addArticle(art);
        });
      }

      setFeedHealthMap(prev => {
        const existing = prev[feedUrl] || { url: feedUrl, statusCode: 200, itemCount: 0, latencyMs: 0, lastFetch: null };
        const updated: FeedHealthRecord = {
          ...existing,
          status: 'healthy',
          statusCode: 200,
          itemCount: Array.isArray(data.articles) ? data.articles.length : existing.itemCount,
          lastFetch: new Date().toISOString(),
          errorMessage: null
        };
        const next = { ...prev, [feedUrl]: updated };
        localStorage.setItem('perspective_rss_health', JSON.stringify(next));
        return next;
      });

      if (onRefreshArticles) onRefreshArticles();
      showStatus(
        isFr 
          ? `${data.generatedCount || 0} dépêche(s) transformée(s) en brouillons Perspective (${cat}) !` 
          : `${data.generatedCount || 0} draft(s) generated in Perspective style (${cat})!`
      );
    } catch (err: any) {
      setFeedHealthMap(prev => {
        const existing = prev[feedUrl] || { url: feedUrl, statusCode: 500, itemCount: 0, latencyMs: 0, lastFetch: null };
        const updated: FeedHealthRecord = {
          ...existing,
          status: 'error',
          statusCode: 500,
          lastFetch: new Date().toISOString(),
          errorMessage: err.message || 'Ingestion failed'
        };
        const next = { ...prev, [feedUrl]: updated };
        localStorage.setItem('perspective_rss_health', JSON.stringify(next));
        return next;
      });
      showStatus(err.message || 'Error processing RSS feed', 'error');
    } finally {
      setProcessingFeedId(null);
    }
  };

  // Action: Trigger Full Pipeline execution across all active feeds
  const handleRunFullPipeline = async () => {
    setRunningAllPipeline(true);
    let totalGenerated = 0;
    try {
      for (const feed of rssFeeds) {
        if (feed.active !== false) {
          try {
            const { ok, data } = await safeFetchJson('/api/rss/fetch-and-generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedUrl: feed.url, category: feed.category || 'Économie', maxItems: 2, autoPublish: false })
            });
            if (ok && data?.success && Array.isArray(data.articles)) {
              data.articles.forEach((art: Article) => addArticle(art));
              totalGenerated += data.generatedCount || 0;
            }
          } catch (e) {
            console.warn(`Pipeline item error for ${feed.url}:`, e);
          }
        }
      }
      if (onRefreshArticles) onRefreshArticles();
      showStatus(
        isFr 
          ? `Pipeline n8n complété : ${totalGenerated} article(s) généré(s) avec attribution.` 
          : `n8n Pipeline complete: ${totalGenerated} draft(s) created with attribution.`
      );
    } catch (err: any) {
      showStatus(err.message || 'Pipeline execution failed', 'error');
    } finally {
      setRunningAllPipeline(false);
      runHealthCheck();
    }
  };

  // Action: Generate article from custom prompt / lead
  const handleGenerateFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPrompt) return;

    setPromptLoading(true);
    try {
      const { ok, data, error } = await safeFetchJson('/api/generate-rss-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: manualPrompt, category: manualCategory, autoPublish: false })
      });

      if (!ok || !data?.success) {
        throw new Error(error || data?.error || 'Failed to generate article from prompt');
      }

      if (data.article) {
        addArticle(data.article);
      }

      if (onRefreshArticles) onRefreshArticles();
      setManualPrompt('');
      showStatus(
        isFr 
          ? 'Brouillon rédigé par Gemini AI et enregistré dans la file d\'attente !' 
          : 'Article drafted by Gemini AI and saved to review queue!'
      );
    } catch (err: any) {
      showStatus(err.message || 'Error generating article', 'error');
    } finally {
      setPromptLoading(false);
    }
  };

  // Action: Publish a draft article
  const handlePublishDraft = async (draft: Article) => {
    try {
      const { ok, data, error } = await safeFetchJson('/api/rss/publish-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: draft.id })
      });

      if (!ok || !data?.success) {
        throw new Error(error || data?.error || 'Failed to publish draft');
      }

      updateArticle({ ...draft, isPublished: true });
      if (onRefreshArticles) onRefreshArticles();
      if (inspectDraft?.id === draft.id) setInspectDraft(null);

      showStatus(
        isFr 
          ? `Article "${draft.title.fr}" publié en direct !` 
          : `Article "${draft.title.fr || draft.title.en}" published live!`
      );
    } catch (err: any) {
      showStatus(err.message || 'Error publishing draft', 'error');
    }
  };

  // Action: Publish all drafts
  const handlePublishAllDrafts = async () => {
    if (!window.confirm(isFr ? "Publier tous les brouillons en direct ?" : "Publish all drafts live?")) return;

    let successCount = 0;
    for (const draft of draftArticles) {
      try {
        await handlePublishDraft(draft);
        successCount++;
      } catch (e) {
        console.error("Failed to publish draft:", draft.id);
      }
    }
    showStatus(isFr ? `${successCount} brouillons publiés en direct.` : `${successCount} drafts published live.`);
  };

  // Action: Purge all drafts
  const handlePurgeDrafts = () => {
    if (!window.confirm(isFr ? "Voulez-vous supprimer TOUS les brouillons de la file ?" : "Purge ALL draft articles from review queue?")) return;
    setPurgeLoading(true);
    draftArticles.forEach(d => deleteArticle(d.id));
    setPurgeLoading(false);
    showStatus(isFr ? 'File des brouillons purgée.' : 'Draft queue purged.');
  };

  // Metrics calculation
  const activeFeeds = rssFeeds.filter((f: any) => f.active !== false);
  const totalActiveFeeds = activeFeeds.length;
  const healthList = activeFeeds.map((f: any) => feedHealthMap[f.url]).filter(Boolean);
  const healthyCount = healthList.filter(h => h.status === 'healthy').length;
  const degradedCount = healthList.filter(h => h.status === 'degraded').length;
  const errorCount = healthList.filter(h => h.status === 'error').length;
  const latencies = healthList.map(h => h.latencyMs).filter(l => typeof l === 'number' && l > 0);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const totalItemsDetected = healthList.reduce((acc, curr) => acc + (curr.itemCount || 0), 0);
  const publishedArticlesCount = (articles || []).filter(a => a.isPublished).length;

  return (
    <div className="space-y-8 text-zinc-100 font-sans">
      {/* Toast Notification Alert */}
      {statusMsg && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-bold uppercase tracking-wider flex items-center gap-3 backdrop-blur-md transition-all ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50' 
            : 'bg-red-950/90 text-red-300 border-red-500/50 shadow-red-950/50'
        }`}>
          <Zap size={16} className={statusMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'} />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Top Header with n8n Canvas Controller */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-red-500/20 border border-orange-500/30 rounded-2xl text-orange-400 shadow-inner">
              <GitBranch size={26} className="text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>{isFr ? 'Automation RSS Perspective' : 'Perspective RSS Automation Engine'}</span>
                  <span className="text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 px-2.5 py-0.5 rounded-full border border-orange-500/30">
                    n8n Workflow Canvas
                  </span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isFr 
                  ? 'Flux d\'infrastructures interconnectés : Capture RSS en temps réel → Traitement IA Gemini 2.5 → Attributions de Source → File de Publication.'
                  : 'Interconnected workflow pipeline: Real-time RSS Capture → Gemini 2.5 AI Processing → Source Attribution → Draft Queue.'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setViewMode('n8n')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'n8n' 
                    ? 'bg-orange-600 text-white shadow' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <GitBranch size={13} />
                {isFr ? 'Carte n8n' : 'n8n Map'}
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-orange-600 text-white shadow' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ListFilter size={13} />
                {isFr ? 'Liste Détaillée' : 'Detailed List'}
              </button>
            </div>

            {/* Run Full Pipeline Button */}
            <button
              onClick={handleRunFullPipeline}
              disabled={runningAllPipeline}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-950/40 flex items-center gap-2 cursor-pointer border border-orange-400/20"
            >
              <Play size={14} className={runningAllPipeline ? 'animate-spin' : 'fill-current'} />
              {runningAllPipeline ? (isFr ? 'Pipeline en cours...' : 'Running Pipeline...') : (isFr ? 'Exécuter Tout le Pipeline' : 'Run Full Pipeline')}
            </button>

            {/* Refresh Diagnostics */}
            <button
              onClick={() => runHealthCheck()}
              disabled={healthChecking}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              title={isFr ? "Rafraîchir le statut de santé" : "Refresh status"}
            >
              <RefreshCw size={15} className={healthChecking ? "animate-spin text-orange-400" : ""} />
            </button>
          </div>
        </div>

        {/* Global Pipeline Health Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-950/90 border border-zinc-800 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs font-mono text-zinc-400 uppercase font-bold">{isFr ? 'Santé Sources' : 'Source Health'}</div>
              <div className="text-sm font-black text-white font-mono mt-0.5">
                {healthyCount}/{totalActiveFeeds} <span className="text-emerald-400 text-xs font-semibold">({totalActiveFeeds > 0 ? Math.round((healthyCount/totalActiveFeeds)*100) : 0}%)</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/90 border border-zinc-800 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <Wifi size={18} />
            </div>
            <div>
              <div className="text-xs font-mono text-zinc-400 uppercase font-bold">{isFr ? 'Latence Moyenne' : 'Avg Latency'}</div>
              <div className="text-sm font-black text-white font-mono mt-0.5">
                {avgLatency > 0 ? `${avgLatency} ms` : '--'}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/90 border border-zinc-800 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400">
              <Layers size={18} />
            </div>
            <div>
              <div className="text-xs font-mono text-zinc-400 uppercase font-bold">{isFr ? 'Brouillons en Attente' : 'Pending Drafts'}</div>
              <div className="text-sm font-black text-amber-400 font-mono mt-0.5">
                {draftArticles.length} {isFr ? 'brouillons' : 'drafts'}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/90 border border-zinc-800 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-xs font-mono text-zinc-400 uppercase font-bold">{isFr ? 'Articles Publiés' : 'Live Articles'}</div>
              <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                {publishedArticlesCount} {isFr ? 'en ligne' : 'live'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AUTOMATED SCHEDULING ENGINE (CHOOSEN TIMING & FREQUENCIES) */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-orange-500/30 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-2xl">
              <Clock size={22} className={autoSchedule.status === 'running' ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  {isFr ? 'Horloge & Planification Automatique des Brouillons' : 'Automated Drafting Schedule & Timings'}
                </h3>
                <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase border ${
                  autoSchedule.enabled 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {autoSchedule.enabled ? (isFr ? 'Planification Active' : 'Schedule Active') : (isFr ? 'En Pause' : 'Paused')}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isFr 
                  ? 'Générez automatiquement des brouillons adaptés aux standards de Perspective selon la fréquence choisie.'
                  : 'Automatically generate Perspective-standard article drafts at your chosen timing intervals.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveScheduleConfig({ enabled: !autoSchedule.enabled })}
              disabled={scheduleLoading}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border ${
                autoSchedule.enabled
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/80'
                  : 'bg-emerald-600 text-white border-emerald-500 shadow-lg hover:bg-emerald-500'
              }`}
            >
              <Bot size={14} />
              {autoSchedule.enabled 
                ? (isFr ? 'Mettre en Pause' : 'Pause Scheduler')
                : (isFr ? 'Activer le Robot' : 'Activate Scheduler')}
            </button>

            <button
              onClick={handleTriggerScheduleNow}
              disabled={scheduleLoading || autoSchedule.status === 'running'}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer border border-orange-400/30"
            >
              <Play size={13} className={autoSchedule.status === 'running' ? 'animate-spin' : ''} />
              {autoSchedule.status === 'running'
                ? (isFr ? 'Cycle en cours...' : 'Cycle running...')
                : (isFr ? 'Lancer un Cycle Maintenant' : 'Run Cycle Now')}
            </button>
          </div>
        </div>

        {/* Configuration Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Timing Interval Selector */}
          <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl space-y-2">
            <label className="text-[11px] font-mono uppercase font-bold text-orange-400 flex items-center gap-1.5">
              <Clock size={13} />
              {isFr ? 'Fréquence d\'Ingestion' : 'Ingestion Frequency'}
            </label>
            <select
              value={autoSchedule.intervalMinutes}
              onChange={(e) => handleSaveScheduleConfig({ intervalMinutes: Number(e.target.value) })}
              disabled={scheduleLoading}
              className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 focus:border-orange-500 outline-none cursor-pointer"
            >
              <option value={15}>⏱️ {isFr ? 'Toutes les 15 minutes (Fil de l\'Eau)' : 'Every 15 minutes (Real-time)'}</option>
              <option value={30}>⏱️ {isFr ? 'Toutes les 30 minutes (Haute Fréquence)' : 'Every 30 minutes (High Frequency)'}</option>
              <option value={60}>⏱️ {isFr ? 'Toutes les 1 heure (Standard Recommandé)' : 'Every 1 hour (Standard)'}</option>
              <option value={180}>⏱️ {isFr ? 'Toutes les 3 heures (Veille Périodique)' : 'Every 3 hours (Periodical)'}</option>
              <option value={360}>⏱️ {isFr ? 'Toutes les 6 heures (Demi-Journée)' : 'Every 6 hours (Half-Day)'}</option>
              <option value={720}>⏱️ {isFr ? 'Toutes les 12 heures (Bi-Quotidien)' : 'Every 12 hours (Twice Daily)'}</option>
              <option value={1440}>⏱️ {isFr ? 'Toutes les 24 heures (Revue Quotidienne)' : 'Every 24 hours (Daily)'}</option>
            </select>
            <p className="text-[10px] text-zinc-500 font-mono">
              {isFr ? 'Intervalle programmable d\'exécution automatique.' : 'Programmable timing interval for auto drafting.'}
            </p>
          </div>

          {/* Target Feed Pack Selector */}
          <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl space-y-2">
            <label className="text-[11px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1.5">
              <Globe size={13} />
              {isFr ? 'Pack de Flux Cible' : 'Target Feed Pack'}
            </label>
            <select
              value={autoSchedule.targetPack}
              onChange={(e) => handleSaveScheduleConfig({ targetPack: e.target.value })}
              disabled={scheduleLoading}
              className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="all">🌍 {isFr ? 'Tous les Flux Actifs' : 'All Active Feeds'}</option>
              <option value="senegal">🇸🇳 {isFr ? 'Presse & Médias Sénégal' : 'Senegal Media Pack'}</option>
              <option value="africa">🌍 {isFr ? 'Afrique & Régional' : 'Africa Regional Pack'}</option>
              <option value="world">🌐 {isFr ? 'International & World Press' : 'World Press Pack'}</option>
              <option value="sports">⚽ {isFr ? 'L\'Arène & Football' : 'Sports & Football Wire'}</option>
              <option value="maritime">⛵ {isFr ? 'Météo & Maritime' : 'Maritime & Transport'}</option>
            </select>
            <p className="text-[10px] text-zinc-500 font-mono">
              {isFr ? 'Ciblez un pack d\'actualité spécifique par cycle.' : 'Focus on a specific wire source pack per cycle.'}
            </p>
          </div>

          {/* Volume per Cycle */}
          <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl space-y-2">
            <label className="text-[11px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1.5">
              <Layers size={13} />
              {isFr ? 'Volume / Flux / Cycle' : 'Volume / Feed / Cycle'}
            </label>
            <select
              value={autoSchedule.maxArticlesPerCycle}
              onChange={(e) => handleSaveScheduleConfig({ maxArticlesPerCycle: Number(e.target.value) })}
              disabled={scheduleLoading}
              className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value={1}>1 {isFr ? 'Article par flux' : 'Article per feed'}</option>
              <option value={2}>2 {isFr ? 'Articles par flux (Recommandé)' : 'Articles per feed (Recommended)'}</option>
              <option value={3}>3 {isFr ? 'Articles par flux' : 'Articles per feed'}</option>
              <option value={5}>5 {isFr ? 'Articles par flux (Intensif)' : 'Articles per feed (Intensive)'}</option>
            </select>
            <p className="text-[10px] text-zinc-500 font-mono">
              {isFr ? 'Nombre d\'articles rédigés par source à chaque passe.' : 'Articles created per feed per cycle.'}
            </p>
          </div>

          {/* Status & Next Execution Countdown */}
          <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase font-bold text-zinc-400 flex items-center justify-between">
                <span>{isFr ? 'Prochaine Ingestion' : 'Next Ingestion'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                {countdownText}
              </div>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-800/80 pt-2">
              <span>{isFr ? 'Total Générés' : 'Total Drafted'}:</span>
              <span className="text-white font-bold">{autoSchedule.totalDraftsCreated || 0}</span>
            </div>
          </div>
        </div>

        {/* Live Execution Logs Terminal View */}
        {autoSchedule.logs && autoSchedule.logs.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-zinc-400">
                <Activity size={14} className="text-orange-400" />
                <span>{isFr ? 'Journal des Exécutions Automatiques' : 'Live Execution Logs'}</span>
              </div>
              <button
                onClick={async () => {
                  await fetch('/api/rss-automation/logs', { method: 'DELETE' });
                  fetchScheduleConfig();
                }}
                className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
              >
                {isFr ? 'Effacer le journal' : 'Clear log'}
              </button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
              {autoSchedule.logs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="text-zinc-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'error' ? 'text-red-400 font-bold' :
                    log.type === 'warning' ? 'text-amber-400' : 'text-zinc-300'
                  }>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: n8n Workflow Interactive Node Canvas View */}
      {viewMode === 'n8n' && (
        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-3xl p-6 shadow-2xl space-y-8 relative overflow-hidden bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
          {/* Node Map Title */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              {isFr ? 'n8n Visual Execution Pipeline Graph' : 'n8n Visual Execution Pipeline Graph'}
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {isFr ? '4 Nœuds Interconnectés' : '4 Interconnected Nodes'}
            </span>
          </div>

          {/* n8n Nodes Flow Architecture */}
          <div className="space-y-8">
            
            {/* NODE 1: Trigger / RSS Ingestion Sources Node */}
            <div className="bg-zinc-900 border-2 border-orange-500/40 rounded-2xl p-5 shadow-2xl relative space-y-4">
              {/* Output Connector Port */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-500 border-2 border-zinc-900 rounded-full flex items-center justify-center text-zinc-950 font-bold z-10 shadow-lg">
                ↓
              </div>

              {/* Node Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">
                        NODE 01 • TRIGGER
                      </span>
                      <h3 className="text-sm font-extrabold uppercase text-white tracking-wide">
                        {isFr ? 'Capture des Dépêches RSS (Sources Médias)' : 'RSS Wire Ingestion Trigger'}
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isFr 
                        ? 'Monitoring continu des agences de presse réelles d\'Afrique de l\'Ouest' 
                        : 'Continuous monitoring of validated West African news wires'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => runHealthCheck()}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-orange-600 text-zinc-200 hover:text-white text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 border border-zinc-700 cursor-pointer shrink-0"
                >
                  <RefreshCw size={12} className={healthChecking ? "animate-spin" : ""} />
                  {isFr ? 'Tester les Flux' : 'Ping Feeds'}
                </button>
              </div>

              {/* Preset Pack Quick Load Bar */}
              <div className="bg-zinc-950/90 p-3.5 rounded-xl border border-zinc-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30">
                    <Zap size={14} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {isFr ? 'Importation Rapide de Packs de Flux Réels' : 'Quick Load Wire Preset Packs'}
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      {isFr ? 'Cliquez pour importer des ensembles complets de flux d\'actualités réels' : 'Click to auto-import curated reliable feed packs'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  <button
                    onClick={() => handleLoadPresetPack('all')}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg font-mono text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap cursor-pointer shadow-md transition-all flex items-center gap-1 border border-orange-400/30"
                  >
                    <span>⚡</span>
                    <span>{isFr ? 'Charger les 45+ Flux' : 'Load All 45+ Feeds'}</span>
                  </button>
                  <button
                    onClick={() => handleLoadPresetPack('senegal')}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-orange-600 text-zinc-200 hover:text-white rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all border border-zinc-700"
                  >
                    🇸🇳 {isFr ? 'Sénégal (8)' : 'Senegal (8)'}
                  </button>
                  <button
                    onClick={() => handleLoadPresetPack('africa')}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-orange-600 text-zinc-200 hover:text-white rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all border border-zinc-700"
                  >
                    🌍 {isFr ? 'Afrique (12)' : 'Africa (12)'}
                  </button>
                  <button
                    onClick={() => handleLoadPresetPack('world')}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-orange-600 text-zinc-200 hover:text-white rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all border border-zinc-700"
                  >
                    🌐 {isFr ? 'Monde (17)' : 'World (17)'}
                  </button>
                  <button
                    onClick={() => handleLoadPresetPack('sports')}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-orange-600 text-zinc-200 hover:text-white rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all border border-zinc-700"
                  >
                    🏆 {isFr ? "L'Arène/Sports (14)" : 'Sports/Arena (14)'}
                  </button>
                </div>
              </div>

              {/* Notice Banner for Non-RSS Publishers */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
                <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold uppercase font-mono tracking-wider text-[10px] text-amber-400 block">
                    {isFr ? 'Avis Technique — Traitement des Médias sans flux direct RSS (ex: Sud Quotidien, Le Quotidien, RTS, AP, The Economist)' : 'Technical Note — Handling Non-RSS Publishers'}
                  </span>
                  <p className="text-[11px] leading-relaxed text-amber-200/80">
                    {isFr 
                      ? 'Les médias ne fournissant pas de flux XML direct sont automatiquement relayés via les passerelles Google News XML Wire de Perspective. Le système extrait les dépêches brutes en temps réel, conserve la citation d\'origine et attribue fidèlement les crédits à la source journalistique.' 
                      : 'Publishers without native XML feeds are automatically bridged via Perspective Google News RSS XML gateways, capturing original headlines and attributing exact publisher sources.'}
                  </p>
                </div>
              </div>

              {/* Sources Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rssFeeds.map((feed: any) => {
                  const health: FeedHealthRecord = feedHealthMap[feed.url] || {
                    url: feed.url,
                    name: feed.name,
                    status: 'unchecked',
                    statusCode: 0,
                    itemCount: 0,
                    latencyMs: 0,
                    lastFetch: null,
                    errorMessage: null
                  };

                  const isTesting = testingFeedUrl === feed.url;
                  const isIngesting = processingFeedId === feed.id;

                  return (
                    <div 
                      key={feed.id} 
                      className={`p-3.5 rounded-xl border transition-all ${
                        health.status === 'healthy' ? 'bg-zinc-950 border-emerald-500/30 hover:border-emerald-500/60' :
                        health.status === 'degraded' ? 'bg-amber-950/20 border-amber-500/40' :
                        health.status === 'error' ? 'bg-red-950/20 border-red-500/50' :
                        'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {health.status === 'healthy' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                200 OK
                              </span>
                            )}
                            {health.status === 'error' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                Error
                              </span>
                            )}
                            <h4 className="text-xs font-bold text-white truncate">{feed.name}</h4>
                          </div>
                          
                          <p className="text-[10px] font-mono text-zinc-400 truncate mt-1">{feed.url}</p>
                          
                          <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-zinc-500 flex-wrap">
                            <span>{health.latencyMs > 0 ? `${health.latencyMs}ms` : '--'}</span>
                            <span>•</span>
                            <span>{health.itemCount} {isFr ? 'dépêches' : 'items'}</span>
                            <span>•</span>
                            <span className="text-orange-400 flex items-center gap-1">
                              <Clock size={10} />
                              {health.lastFetch ? new Date(health.lastFetch).toLocaleTimeString() : 'Non testé'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleProcessFeed(feed.url, feed.id)}
                          disabled={isIngesting}
                          className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow shrink-0 flex items-center gap-1 cursor-pointer"
                          title={isFr ? "Ingérer ce flux" : "Ingest feed"}
                        >
                          <Sparkles size={11} className={isIngesting ? "animate-spin" : ""} />
                          {isIngesting ? '...' : (isFr ? 'Ingérer' : 'Ingest')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FLOW CONNECTOR CABLE 1 -> 2 */}
            <div className="flex flex-col items-center justify-center my-2">
              <div className="h-8 w-0.5 bg-gradient-to-b from-orange-500 via-amber-500 to-purple-500 animate-pulse" />
              <div className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-[10px] font-mono font-bold text-zinc-300 shadow flex items-center gap-1.5">
                <Zap size={12} className="text-orange-400" />
                <span>Payload XML RSS → Inférence IA Gemini</span>
              </div>
              <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500 to-purple-400 animate-pulse" />
            </div>

            {/* NODE 2: Gemini AI Processor Node */}
            <div className="bg-zinc-900 border-2 border-purple-500/40 rounded-2xl p-5 shadow-2xl relative space-y-4">
              {/* Output Connector Port */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-purple-500 border-2 border-zinc-900 rounded-full flex items-center justify-center text-zinc-950 font-bold z-10 shadow-lg">
                ↓
              </div>

              {/* Node Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                    <Bot size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
                        NODE 02 • AI TRANSFORMER
                      </span>
                      <h3 className="text-sm font-extrabold uppercase text-white tracking-wide">
                        {isFr ? 'Moteur Rédactionnel Gemini 2.5 Flash' : 'Gemini 2.5 Flash AI Editorial Writer'}
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isFr 
                        ? 'Structuration bilingue (FR/EN), Briefs Perspective, Chronologies & Attribution de Source' 
                        : 'Bilingual structuring (FR/EN), Perspective Briefs, Timelines & Source Attribution'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shrink-0">
                  ✓ Gemini API Active
                </span>
              </div>

              {/* On-Demand Lead / Topic Input Box Inside Node 2 */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <label className="block text-xs font-mono font-bold uppercase text-purple-400 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  {isFr ? 'Génération sur Dépêche / Sujet Spécifique :' : 'Draft Specific Lead / Topic:'}
                </label>
                <form onSubmit={handleGenerateFromPrompt} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder={isFr ? "Entrez un titre, dépêche ou sujet d'actualité..." : "Enter headline, wire summary, or topic..."}
                    value={manualPrompt}
                    onChange={e => setManualPrompt(e.target.value)}
                    className="md:col-span-3 bg-zinc-900 border border-zinc-700 text-zinc-100 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                    required
                  />
                  <select
                    value={manualCategory}
                    onChange={e => setManualCategory(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                  >
                    {RSS_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={promptLoading}
                    className="py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Bot size={13} className={promptLoading ? "animate-spin" : ""} />
                    {promptLoading ? '...' : (isFr ? 'Rédiger IA' : 'Draft AI')}
                  </button>
                </form>
              </div>
            </div>

            {/* FLOW CONNECTOR CABLE 2 -> 3 */}
            <div className="flex flex-col items-center justify-center my-2">
              <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500 via-pink-500 to-amber-500 animate-pulse" />
              <div className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-[10px] font-mono font-bold text-zinc-300 shadow flex items-center gap-1.5">
                <FileText size={12} className="text-amber-400" />
                <span>JSON Structuré → File des Brouillons avec Attribution</span>
              </div>
              <div className="h-8 w-0.5 bg-gradient-to-b from-amber-500 to-amber-400 animate-pulse" />
            </div>

            {/* NODE 3: Draft Review & Attribution Queue Node */}
            <div className="bg-zinc-900 border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl relative space-y-4">
              {/* Output Connector Port */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-amber-500 border-2 border-zinc-900 rounded-full flex items-center justify-center text-zinc-950 font-bold z-10 shadow-lg">
                ↓
              </div>

              {/* Node Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                        NODE 03 • REVIEW QUEUE
                      </span>
                      <h3 className="text-sm font-extrabold uppercase text-white tracking-wide">
                        {isFr ? 'File de Révision des Brouillons & Source Badges' : 'Drafts Review Queue & Source Badges'}
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isFr ? 'Validation des attributions de source et relecture éditoriale avant publication' : 'Source attribution verification and editorial review before going live'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 text-xs font-mono font-bold px-3 py-1 rounded-full border border-amber-500/30">
                    {draftArticles.length} {isFr ? 'brouillons' : 'drafts'}
                  </span>
                  {draftArticles.length > 0 && (
                    <button
                      onClick={handlePublishAllDrafts}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg transition-all shadow flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={13} />
                      {isFr ? 'Tout Publier' : 'Publish All'}
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <input
                  type="text"
                  placeholder={isFr ? "Filtrer par titre ou source (ex: APS, Le Soleil)..." : "Filter by title or source..."}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full sm:w-72 bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {['all', ...RSS_CATEGORIES].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? (isFr ? 'Toutes' : 'All') : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draft Cards Grid inside Node 3 with Prominent Source Attribution */}
              {filteredDrafts.length === 0 ? (
                <div className="text-center py-10 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl p-6">
                  <Bot size={32} className="text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 font-mono">
                    {isFr ? 'Aucun brouillon en attente dans ce nœud. Cliquez sur "Ingérer" sur Node 01.' : 'No drafts in Node 03 queue. Click "Ingest" on Node 01.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredDrafts.map((draft, idx) => {
                    const srcInfo = getArticleSourceInfo(draft, rssFeeds);

                    return (
                      <div 
                        key={`${draft.id}-${idx}`} 
                        className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-amber-500/40 transition-all shadow"
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <img
                            src={draft.featuredImage || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=300&q=80"}
                            alt="Cover"
                            className="w-20 h-20 rounded-xl object-cover border border-zinc-800 shrink-0"
                          />

                          <div className="min-w-0 flex-1 space-y-1">
                            {/* PROMINENT SOURCE VERIFICATION & ORIGIN BADGE */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                <Globe size={11} className="text-blue-400" />
                                <span>Source : {srcInfo.sourceName}</span>
                              </span>

                              {srcInfo.originCountry && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <span className="text-xs">{srcInfo.originFlag}</span>
                                  <span>Origine : {srcInfo.originCountry}</span>
                                </span>
                              )}

                              {srcInfo.sourceDomain && (
                                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                  {srcInfo.sourceDomain}
                                </span>
                              )}

                              {srcInfo.originalUrl && (
                                <a 
                                  href={srcInfo.originalUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 text-[10px] font-mono text-orange-400 hover:underline"
                                  title="Consulter l'article original sur le site source"
                                >
                                  <span>Dépêche Originale</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}

                              <span className="bg-amber-500/10 text-amber-400 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-amber-500/20">
                                {draft.category}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-white line-clamp-1">
                              {draft.title?.fr || draft.title?.en}
                            </h4>

                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {draft.excerpt?.fr || draft.excerpt?.en}
                            </p>

                            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 flex-wrap pt-0.5">
                              {draft.perspectiveBrief && <span className="text-emerald-400">✓ Brief Perspective</span>}
                              {draft.timeline?.length ? <span className="text-blue-400">✓ Chronologie</span> : null}
                              {draft.keyActors?.length ? <span className="text-purple-400">✓ Acteurs</span> : null}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => setInspectDraft(draft)}
                            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer border border-zinc-800"
                            title={isFr ? "Aperçu & Source" : "Inspect & Source"}
                          >
                            <Eye size={15} />
                          </button>

                          {onEditArticle && (
                            <button
                              onClick={() => onEditArticle(draft)}
                              className="p-2 bg-zinc-900 hover:bg-orange-600 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer border border-zinc-800"
                              title={isFr ? "Éditer" : "Edit"}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          <button
                            onClick={() => handlePublishDraft(draft)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={13} />
                            {isFr ? 'Publier' : 'Publish'}
                          </button>

                          <button
                            onClick={() => {
                              deleteArticle(draft.id);
                              showStatus(isFr ? 'Brouillon supprimé.' : 'Draft deleted.');
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FLOW CONNECTOR CABLE 3 -> 4 */}
            <div className="flex flex-col items-center justify-center my-2">
              <div className="h-8 w-0.5 bg-gradient-to-b from-amber-500 via-emerald-500 to-emerald-400 animate-pulse" />
              <div className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-[10px] font-mono font-bold text-zinc-300 shadow flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>Publication Live → Base de Données Cloud & Web Portal</span>
              </div>
              <div className="h-8 w-0.5 bg-gradient-to-b from-emerald-400 to-emerald-500 animate-pulse" />
            </div>

            {/* NODE 4: Live Distribution Node */}
            <div className="bg-zinc-900 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <Server size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                        NODE 04 • PUBLICATION TARGET
                      </span>
                      <h3 className="text-sm font-extrabold uppercase text-white tracking-wide">
                        {isFr ? 'Plateforme Perspective Live' : 'Live Perspective Platform'}
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isFr ? 'Distribution publique des articles authentifiés et traduits' : 'Public distribution of authenticated bilingual articles'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {publishedArticlesCount} {isFr ? 'Articles Publiés' : 'Live Articles'}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODE 2: Standard Detailed List View */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Section: Manage RSS Feed URLs */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Globe className="text-orange-500" size={18} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
                  {isFr ? 'Sources RSS Surveillées' : 'Monitored RSS Sources'}
                </h3>
              </div>
            </div>

            {/* Add Feed Form */}
            <form onSubmit={handleAddFeed} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  {isFr ? 'Nom de la Source' : 'Source Name'}
                </label>
                <input
                  type="text"
                  placeholder="ex: APS Sénégal"
                  value={newFeedName}
                  onChange={e => setNewFeedName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  {isFr ? 'URL du Flux RSS' : 'RSS Feed URL'} *
                </label>
                <input
                  type="url"
                  placeholder="https://aps.sn/feed/"
                  value={newFeedUrl}
                  onChange={e => setNewFeedUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  {isFr ? 'Rubrique' : 'Category'}
                </label>
                <select
                  value={newFeedCategory}
                  onChange={e => setNewFeedCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                >
                  {RSS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus size={14} />
                  {isFr ? 'Ajouter' : 'Add Feed'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rssFeeds.map((feed: any) => (
                <div key={feed.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-zinc-200 truncate">{feed.name}</h4>
                    <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">{feed.url}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleProcessFeed(feed.url, feed.id)}
                      disabled={processingFeedId === feed.id}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
                    >
                      {processingFeedId === feed.id ? '...' : 'Ingérer'}
                    </button>
                    <button onClick={() => handleRemoveFeed(feed.id)} className="p-1.5 text-zinc-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DRAFT INSPECTION MODAL WITH ENHANCED SOURCE ATTRIBUTION BOX */}
      {inspectDraft && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative text-zinc-100 font-sans">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="bg-red-500/20 text-red-400 text-xs font-mono font-bold px-2.5 py-1 rounded-full border border-red-500/30">
                  BROUILLON IA / DRAFT
                </span>
                <span className="bg-orange-500/10 text-orange-400 text-xs font-mono font-bold px-2.5 py-1 rounded-full border border-orange-500/20">
                  {inspectDraft.category}
                </span>
              </div>

              <button
                onClick={() => setInspectDraft(null)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                ✕ {isFr ? 'Fermer' : 'Close'}
              </button>
            </div>

            {/* DEDICATED SOURCE ATTRIBUTION HEADER BOX */}
            {(() => {
              const src = getArticleSourceInfo(inspectDraft, rssFeeds);
              return (
                <div className="bg-zinc-950 border-2 border-blue-500/40 p-4 rounded-2xl space-y-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-blue-400 flex items-center gap-1.5">
                      <Globe size={14} />
                      {isFr ? 'Attribution & Origine de la Source' : 'Source Attribution & Origin'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ✓ Authentifié par Ingestion RSS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 font-mono text-[10px] uppercase block">{isFr ? 'Nom du Média Source' : 'Source Media Name'} :</span>
                      <strong className="text-white text-sm">{src.sourceName}</strong>
                    </div>

                    <div>
                      <span className="text-zinc-500 font-mono text-[10px] uppercase block">{isFr ? 'Origine Géographique' : 'Geographic Origin'} :</span>
                      <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                        <span>{src.originFlag}</span>
                        <span>{src.originCountry}</span>
                      </span>
                    </div>

                    {src.sourceDomain && (
                      <div>
                        <span className="text-zinc-500 font-mono text-[10px] uppercase block">{isFr ? 'Domaine Officiel' : 'Official Domain'} :</span>
                        <span className="font-mono text-orange-400">{src.sourceDomain}</span>
                      </div>
                    )}
                  </div>

                  {src.originalUrl && (
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 text-[11px]">Consulter la dépêche originale :</span>
                      <a 
                        href={src.originalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-all"
                      >
                        <span>Article Source</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Title & Cover */}
            <div>
              <h3 className="text-xl font-black text-white leading-tight">
                {inspectDraft.title?.fr || inspectDraft.title?.en}
              </h3>
              {inspectDraft.title?.en && (
                <p className="text-xs text-orange-400 font-mono mt-1">
                  EN: {inspectDraft.title.en}
                </p>
              )}
            </div>

            {inspectDraft.featuredImage && (
              <img
                src={inspectDraft.featuredImage}
                alt="Cover"
                className="w-full h-48 object-cover rounded-2xl border border-zinc-800"
              />
            )}

            {/* Perspective Brief */}
            {inspectDraft.perspectiveBrief && (
              <div className="bg-zinc-950 border border-orange-500/30 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Brief Perspective
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-300">
                  <div>
                    <strong className="text-zinc-100 block mb-1">Ce qu'il s'est passé :</strong>
                    <p>{inspectDraft.perspectiveBrief.whatHappened?.fr || inspectDraft.perspectiveBrief.whatHappened?.en}</p>
                  </div>
                  <div>
                    <strong className="text-zinc-100 block mb-1">Pourquoi cela compte :</strong>
                    <p>{inspectDraft.perspectiveBrief.whyItMatters?.fr || inspectDraft.perspectiveBrief.whyItMatters?.en}</p>
                  </div>
                  <div>
                    <strong className="text-zinc-100 block mb-1">À surveiller ensuite :</strong>
                    <p>{inspectDraft.perspectiveBrief.whatToWatchNext?.fr || inspectDraft.perspectiveBrief.whatToWatchNext?.en}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Body preview */}
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-xs text-zinc-300 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
              <strong className="text-zinc-100 block mb-2 font-mono uppercase text-[10px] tracking-wider">Contenu (Markdown) :</strong>
              {inspectDraft.body?.fr || inspectDraft.body?.en}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
              <button
                onClick={() => {
                  handlePublishDraft(inspectDraft);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                {isFr ? 'Publier en Direct' : 'Publish Live'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
