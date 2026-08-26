import React, { useState, useEffect } from 'react';
import { 
  Zap, Globe, RefreshCw, Plus, Trash2, CheckCircle2, Eye, Edit2, Sparkles, 
  Layers, Bot, ArrowRight, ExternalLink, AlertCircle, FileText, Check, ShieldCheck, Clock,
  Activity, AlertTriangle, Server, Wifi, Cpu, Play, Link as LinkIcon,
  LayoutGrid, ListFilter, ArrowDown, ChevronRight, Share2, CheckSquare, Sliders, Info,
  Newspaper, Compass, BookOpen, Search, Filter, HelpCircle, CheckCircle, Database,
  Save, RotateCcw, Send, FileCode, Tag, MessageSquare, Award
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
  isFallbackBridge?: boolean;
}

export const RSS_CATEGORIES = [
  'Politique',
  'Économie',
  'Société',
  'International',
  'Sports',
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
    const mergedOptions = { ...options };
    const headers = { ...(mergedOptions.headers || {}) } as Record<string, string>;

    const gemini = localStorage.getItem('api_key_gemini');
    const openai = localStorage.getItem('api_key_openai');
    const groq = localStorage.getItem('api_key_groq');
    const openrouter = localStorage.getItem('api_key_openrouter');

    if (gemini) headers['x-gemini-key'] = gemini;
    if (openai) headers['x-openai-key'] = openai;
    if (groq) headers['x-groq-key'] = groq;
    if (openrouter) headers['x-openrouter-key'] = openrouter;

    mergedOptions.headers = headers;

    const res = await fetch(url, mergedOptions);
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    
    if (!contentType.includes("application/json") && text.trim().startsWith("<")) {
      return { 
        ok: false, 
        status: res.status, 
        data: null, 
        error: `Le serveur a retourné une réponse HTML au lieu de JSON (HTTP ${res.status}).` 
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
        error: `Structure de réponse JSON invalide (HTTP ${res.status}).` 
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
  { id: 'senenews', name: 'SeneNews Sénégal', url: 'https://www.senenews.com/feed', category: "Sports", pack: 'senegal', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: 'Sénégal & Ouest-Africain', active: true },
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

  // --- SPORTS & FOOTBALL ---
  { id: 'bbc-football', name: 'BBC Football Wire', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', category: "Sports", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "Sports", active: true },
  { id: 'bbc-epl', name: 'BBC Premier League', url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml', category: "Sports", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "Sports", active: true },
  { id: 'bbc-ucl', name: 'BBC UEFA Champions League', url: 'https://feeds.bbci.co.uk/sport/football/champions-league/rss.xml', category: "Sports", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "Sports", active: true },
  { id: 'sky-sports-fb', name: 'Sky Sports Football', url: 'https://www.skysports.com/rss/12040', category: "Sports", pack: 'sports', originCountry: 'Royaume-Uni', originFlag: '🇬🇧', originRegion: "Sports", active: true },
  { id: 'rmc-ligue1', name: 'RMC Sport Ligue 1 (France)', url: 'https://rmcsport.bfmtv.com/rss/football/ligue-1/', category: "Sports", pack: 'sports', originCountry: 'France', originFlag: '🇫🇷', originRegion: "Sports", active: true },
  { id: 'espn-fc', name: 'ESPN FC Soccer (Google Wire)', url: 'https://news.google.com/rss/search?q=site:espn.com+soccer&hl=fr&gl=SN&ceid=SN:fr', category: "Sports", pack: 'sports', originCountry: 'États-Unis', originFlag: '🇺🇸', originRegion: "Sports", active: true },
  { id: 'teranga-lions-gn', name: 'Équipe du Sénégal (Teranga Lions Wire)', url: 'https://news.google.com/rss/search?q=Teranga+Lions', category: "Sports", pack: 'sports', originCountry: 'Sénégal', originFlag: '🇸🇳', originRegion: "Sports", active: true }
];

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
    } else if (lower.includes("cnn") || lower.includes("fox") || lower.includes("bloomberg") || lower.includes("espn")) {
      originCountry = "États-Unis";
      originFlag = "🇺🇸";
    } else {
      originCountry = "International";
      originFlag = "🌐";
    }
  }

  if (!sourceName) {
    sourceName = "Rédaction Perspective Desk";
  }

  return { sourceName, sourceDomain, originalUrl, feedUrl, originCountry, originFlag };
}

export function RssAutomationTab({ onEditArticle, onRefreshArticles }: RssAutomationTabProps) {
  const { articles, addArticle, updateArticle, deleteArticle, syncFromFirestore, language } = useStore();
  const isFr = language === 'fr';

  // Active Newsroom Tab
  const [activeNewsroomTab, setActiveNewsroomTab] = useState<'drafts' | 'feeds' | 'writer' | 'scheduler' | 'guidelines'>('drafts');

  // RSS Feed Sources State
  const [rssFeeds, setRssFeeds] = useState(() => {
    const saved = localStorage.getItem('perspective_rss_feeds');
    return saved ? JSON.parse(saved) : ALL_RELIABLE_RSS_FEEDS.slice(0, 14);
  });

  // Health Map State
  const [feedHealthMap, setFeedHealthMap] = useState<Record<string, FeedHealthRecord>>(() => {
    const saved = localStorage.getItem('perspective_rss_health');
    return saved ? JSON.parse(saved) : {};
  });

  // Dual AI Engine Status
  const [aiEngineStatus, setAiEngineStatus] = useState<{
    gemini: { configured: boolean; status: string; models: string[] };
    openai: { configured: boolean; status: string; models: string[] };
    failoverActive: boolean;
  }>({
    gemini: { configured: true, status: 'ready', models: ['gemini-3.7-flash'] },
    openai: { configured: true, status: 'ready', models: ['gpt-4o-mini'] },
    failoverActive: true
  });

  // Scheduler State
  const [autoSchedule, setAutoSchedule] = useState<{
    enabled: boolean;
    intervalMinutes: number;
    targetPack: string;
    maxArticlesPerCycle: number;
    autoPublish: boolean;
    preferredEngine?: string;
    customPrompt?: string;
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

  // UI Interactive States
  const [healthChecking, setHealthChecking] = useState(false);
  const [testingFeedUrl, setTestingFeedUrl] = useState<string | null>(null);
  const [processingFeedId, setProcessingFeedId] = useState<string | null>(null);
  const [runningAllPipeline, setRunningAllPipeline] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [countdownText, setCountdownText] = useState<string>('--');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<'all' | 'News' | 'Analysis' | 'Deep Dive'>('all');
  const [selectedEngineFilter, setSelectedEngineFilter] = useState<'all' | 'gemini' | 'openai'>('all');
  const [inspectDraft, setInspectDraft] = useState<Article | null>(null);
  const [inspectLanguage, setInspectLanguage] = useState<'fr' | 'en'>('fr');

  // Manual Generator States
  const [manualPrompt, setManualPrompt] = useState('');
  const [manualCategory, setManualCategory] = useState('Économie');
  const [manualStyleType, setManualStyleType] = useState<'News' | 'Analysis' | 'Deep Dive'>('News');
  const [manualPreferredEngine, setManualPreferredEngine] = useState<'auto' | 'gemini' | 'groq' | 'openrouter' | 'openai'>('auto');
  const [promptLoading, setPromptLoading] = useState(false);

  // New Feed Input Form
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('Politique');
  const [newFeedPack, setNewFeedPack] = useState('senegal');
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);

  // Editorial Guidelines & AI Style Studio States
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

  // Fetch Editorial Guidelines from server
  const fetchEditorialGuidelines = async () => {
    setGuidelinesLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/editorial-guidelines');
      if (ok && data?.success && data.guidelines) {
        setEditorialGuidelines(data.guidelines);
      }
    } catch (err: any) {
      console.warn("Failed to fetch guidelines:", err);
    } finally {
      setGuidelinesLoading(false);
    }
  };

  // Save Editorial Guidelines to server
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

  // Reset Guidelines to Defaults
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

  // Test Guidelines in Live Studio
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
        setTestResult(data);
        showStatus(isFr ? 'Test de rédaction IA exécuté avec succès !' : 'AI generation test executed successfully!');
      } else {
        throw new Error(error || data?.error || 'Test failed');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setTestingGuidelines(false);
    }
  };

  const [savingTestToDrafts, setSavingTestToDrafts] = useState(false);

  // Send tested article directly to drafts queue
  const handleSendTestToDrafts = async () => {
    if (!testResult || !testResult.article) return;
    setSavingTestToDrafts(true);
    try {
      const testArt = testResult.article;
      const draftArt: any = {
        id: testArt.id || ('art-test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
        slug: testArt.slug || ((testArt.title?.fr || testArt.title?.en || 'article-test').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4)),
        category: testArt.category || 'Économie',
        type: testArt.type || 'News',
        title: testArt.title || { fr: 'Article Test', en: 'Test Article' },
        excerpt: testArt.excerpt || { fr: '', en: '' },
        body: testArt.body || { fr: '', en: '' },
        featuredImage: testArt.featuredImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
        author: testArt.author || 'Rédaction Perspective Desk',
        date: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        readingTime: testArt.readingTime || 4,
        tags: testArt.tags || ['Test', 'Perspective', 'IA'],
        isPublished: false,
        status: 'Draft',
        perspectiveBrief: testArt.perspectiveBrief || null,
        timeline: testArt.timeline || [],
        keyActors: testArt.keyActors || [],
        structuralForces: testArt.structuralForces || null,
        sourceName: testArt.sourceName || 'Testeur Charte Éditoriale IA',
        sourceDomain: 'perspective.sn',
        engineUsed: testResult.engineUsed || 'Dual Engine AI'
      };

      const { ok, data } = await safeFetchJson('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draftArt,
          isPublished: false
        })
      });

      await addArticle(data?.article || draftArt);
      if (onRefreshArticles) onRefreshArticles();

      showStatus(
        isFr 
          ? 'L\'article testé a été envoyé aux brouillons avec succès !' 
          : 'Tested article sent to drafts successfully!'
      );
      setActiveNewsroomTab('drafts');
    } catch (err: any) {
      showStatus(err.message || 'Erreur lors de l\'envoi aux brouillons', 'error');
    } finally {
      setSavingTestToDrafts(false);
    }
  };

  // Add Forbidden Phrase
  const handleAddForbiddenPhrase = () => {
    const trimmed = newForbiddenTag.trim().toLowerCase();
    if (!trimmed) return;
    if (editorialGuidelines.forbiddenPhrases.includes(trimmed)) {
      setNewForbiddenTag('');
      return;
    }
    setEditorialGuidelines({
      ...editorialGuidelines,
      forbiddenPhrases: [...editorialGuidelines.forbiddenPhrases, trimmed]
    });
    setNewForbiddenTag('');
  };

  // Remove Forbidden Phrase
  const handleRemoveForbiddenPhrase = (phraseToRemove: string) => {
    setEditorialGuidelines({
      ...editorialGuidelines,
      forbiddenPhrases: editorialGuidelines.forbiddenPhrases.filter(p => p !== phraseToRemove)
    });
  };

  // Load Canonical Example
  const handleLoadCanonicalExample = () => {
    setEditorialGuidelines({
      ...editorialGuidelines,
      exemplaryExample: {
        titleFr: "Port de Ndayane : Radiographie d'un mégaprojet logistique au cœur de l'ambition maritime ouest-africaine",
        excerptFr: "À 50 kilomètres au sud de Dakar, les engins de chantier dessinent les contours du futur poumon portuaire de l'Afrique de l'Ouest. Entre souveraineté logistique et retombées économiques, Perspective décrypte les enjeux d'un investissement de plus de 800 millions de dollars.",
        bodyFr: `## Une ambition logistique aux portes de Dakar\n\nSous le soleil zénithal de la Petite-Côte, le chantier du port en eau profonde de Ndayane s'impose comme le plus vaste projet d'infrastructures de la décennie au Sénégal. Conçu pour désengorger le Port Autonome de Dakar, ce complexe vise à accueillir les plus grands navires porte-conteneurs du commerce mondial.\n\n> « Ndayane n'est pas seulement un port commercial, c'est le levier stratégique qui repositionne la presqu'île du Cap-Vert au centre des flux Atlantique-Sahel. »\n\n## Impact économique et souveraineté sous-régionale\n\nL'engorgement récurrent des quais dakarois imposait une alternative industrielle d'envergure. En connectant Ndayane aux grands corridors de transport de l'UEMOA, les autorités sénégalaises entendent réduire de 30% les délais de transit des marchandises vers le Mali et la sous-région.\n\n## Ce qu'il faut surveiller\n\nLa livraison de la première phase opérationnelle est scrutée par les acteurs de la logistique internationale. Les prochains mois seront décisifs pour finaliser les raccordements autoroutiers et ferroviaires.`
      }
    });
    showStatus(isFr ? "Exemple canonique (Port de Ndayane) chargé !" : "Canonical example loaded!");
  };

  // Apply Preset Guidelines
  const applyPreset = (presetKey: 'dakar' | 'geopolitics' | 'investigative' | 'wire') => {
    if (presetKey === 'dakar') {
      setEditorialGuidelines({
        ...editorialGuidelines,
        preferredTone: 'analytical',
        customDirectives: `1. PRIVILÉGIER LE STORYTELLING INCARNÉ : Ouvrir les articles par une scène vivante, une situation humaine concrète ou une citation clé captée à Dakar ou dans les capitales régionales.
2. ANCRAGE SÉNÉGALAIS ET SOUS-RÉGIONAL : Toujours expliciter les impacts stratégiques pour le Sénégal (Dakar, Thiès, Saint-Louis, Casamance) et le bloc UEMOA/CEDEAO.
3. STRUCTURE JOURNALISTIQUE RIGOUREUSE : Utiliser des sous-titres analytiques (##), des citations attribuées (> ), des listes à puces si nécessaire et un bloc final sur les échéances à surveiller.
4. RÈGLE D'OR BILINGUE : Assurer une qualité littéraire égale en français et en anglais, sans calque syntaxique ni traduction automatique mot à mot.`
      });
    } else if (presetKey === 'geopolitics') {
      setEditorialGuidelines({
        ...editorialGuidelines,
        preferredTone: 'analytical',
        customDirectives: `1. ADAPTATION PAR RUBRIQUE : Identifier la rubrique réelle (Politique, Économie, Tech, Sports, Culture, Santé, Société) et adopter le ton, le vocabulaire et la structure spécifiques à ce secteur.
2. ÉTAYAGE FACTUEL & DONNÉES CLÉS : Inclure systématiquement des faits vérifiés, chiffres précis, citations ou données pour étayer chaque analyse.
3. SOUS-TITRES SPÉCIFIQUES DE RUBRIQUE : Remplacer les sous-titres génériques par des sous-titres évocateurs propres au secteur (ex: "Code & Souveraineté" pour la Tech, "Tactique & Stratégie" pour le Sport, "Patrimoine & Vision" pour la Culture).
4. PERSPECTIVES : Proposer en conclusion les enjeux clés à surveiller pour le secteur concerné.`
      });
    } else if (presetKey === 'investigative') {
      setEditorialGuidelines({
        ...editorialGuidelines,
        preferredTone: 'investigative',
        customDirectives: `1. NARRATION IMMERSIVE & INCIPIT VIVANT : Captiver le lecteur dès les trois premières lignes avec un détail visuel ou sonore capté sur le terrain.
2. PAROLE AUX ACTEURS DE TERRAIN : Intégrer des propos rapportés d'acteurs de la société civile, de commerçants, d'entrepreneurs ou d'experts locaux.
3. DÉCONSTRUCTION DES RUMURS & FACT-CHECKING : Distinguer avec clarté les annonces politiques officielles des réalités mesurées sur le terrain.
4. PROVENANCE BILINGUE : Raconter l'histoire avec la même profondeur poétique et journalistique en français et en anglais.`
      });
    } else if (presetKey === 'wire') {
      setEditorialGuidelines({
        ...editorialGuidelines,
        preferredTone: 'dynamic',
        customDirectives: `1. VÉLOCITÉ ET CONCISION SUR-MESURE : Traiter la dépêche d'actualité en 350-450 mots percutants. Allez droit aux faits.
2. LA RÈGLE DES 5W : Qui, Quoi, Où, Quand, Pourquoi dès les 20 premières secondes de lecture.
3. ZÉRO CLICHÉ NI REMPLISSAGE : Aucune phrase creuse ou généralité. Chaque mot doit apporter une information mesurable.
4. TITRE INCISIF : Titre informatif sans sensationnalisme.`
      });
    }
    showStatus(isFr ? `Preset "${presetKey.toUpperCase()}" appliqué !` : `Preset "${presetKey.toUpperCase()}" applied!`);
  };

  // Fetch AI engine status on mount
  const fetchAiEngineStatus = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/ai-engine/status');
      if (ok && data?.success) {
        setAiEngineStatus({
          gemini: data.gemini,
          openai: data.openai,
          failoverActive: data.failoverActive
        });
      }
    } catch (e) {
      console.warn("Could not retrieve AI engine status:", e);
    }
  };

  // Fetch Scheduler Configuration
  const fetchScheduleConfig = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/rss-automation/config');
      if (ok && data?.success && data.config) {
        setAutoSchedule(data.config);
      }
    } catch (err) {
      console.warn("Could not fetch automation schedule:", err);
    }
  };

  useEffect(() => {
    syncFromFirestore();
    fetchAiEngineStatus();
    fetchScheduleConfig();
    fetchEditorialGuidelines();
    const interval = setInterval(fetchScheduleConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update Countdown Timer
  useEffect(() => {
    const updateCountdown = () => {
      if (!autoSchedule.enabled || !autoSchedule.nextRunAt) {
        setCountdownText(isFr ? 'En Pause' : 'Paused');
        return;
      }
      const nextTime = new Date(autoSchedule.nextRunAt).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((nextTime - now) / 1000));

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

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Sync rssFeeds to localStorage
  useEffect(() => {
    localStorage.setItem('perspective_rss_feeds', JSON.stringify(rssFeeds));
  }, [rssFeeds]);

  // Run Health Check
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

        if (!specificUrl) {
          showStatus(
            isFr 
              ? `Diagnostic terminé : ${data.healthyCount}/${data.totalFeeds} flux opérationnels.` 
              : `Diagnostic complete: ${data.healthyCount}/${data.totalFeeds} wire sources operational.`
          );
        } else {
          const single = data.results[0];
          showStatus(
            isFr
              ? `Diagnostic ${single?.name || 'Flux'} : Statut ${single?.status === 'healthy' ? 'Opérationnel' : single?.status}.`
              : `Diagnostic ${single?.name || 'Feed'}: Status ${single?.status}.`
          );
        }
      }
    } catch (err: any) {
      showStatus(err.message || 'Health check error', 'error');
    } finally {
      setHealthChecking(false);
      setTestingFeedUrl(null);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

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
        ? `Pack activé (${feedsToLoad.length} sources d'actualité intégrées au desk).`
        : `Pack activated (${feedsToLoad.length} wire sources added).`
    );
  };

  // Action: Add new RSS feed source
  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl) return;

    const id = newFeedUrl.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(-10) || Date.now().toString();
    const name = newFeedName.trim() || newFeedUrl.replace(/^https?:\/\//, '').split('/')[0];

    const updated = [...rssFeeds, { id, name, url: newFeedUrl, category: newFeedCategory, pack: newFeedPack, active: true }];
    setRssFeeds(updated);
    setNewFeedName('');
    setNewFeedUrl('');
    setShowAddFeedModal(false);
    showStatus(isFr ? 'Nouvelle agence / source ajoutée au desk !' : 'New wire agency added to newsroom!');
    runHealthCheck(newFeedUrl);
  };

  // Action: Remove an RSS feed source
  const handleRemoveFeed = (id: string) => {
    const updated = rssFeeds.filter((f: any) => f.id !== id);
    setRssFeeds(updated);
    showStatus(isFr ? 'Source retirée du monitoring.' : 'Feed removed from monitoring.');
  };

  // Action: Trigger Ingestion & Dual-Engine Generation for a single feed
  const handleProcessFeed = async (feedUrl: string, feedId: string, feedCategory?: string, styleType: 'News' | 'Analysis' | 'Deep Dive' = 'News') => {
    setProcessingFeedId(feedId);
    try {
      const feedObj = rssFeeds.find((f: any) => f.id === feedId || f.url === feedUrl);
      const cat = feedCategory || feedObj?.category || 'Économie';

      const { ok, data, error } = await safeFetchJson('/api/rss/fetch-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feedUrl, 
          feedName: feedObj?.name,
          category: cat, 
          maxItems: 2, 
          autoPublish: false,
          preferredEngine: 'auto',
          type: styleType
        })
      });

      if (!ok || !data?.success) {
        throw new Error(error || data?.error || 'Failed to fetch and process RSS feed');
      }

      if (Array.isArray(data.articles) && data.articles.length > 0) {
        data.articles.forEach((art: Article) => {
          addArticle(art);
        });
      }

      if (onRefreshArticles) onRefreshArticles();
      showStatus(
        isFr 
          ? `${data.generatedCount || 0} dépêche(s) rédigée(s) en style ${styleType} avec narration structurée !` 
          : `${data.generatedCount || 0} story draft(s) created in ${styleType} format!`
      );
    } catch (err: any) {
      showStatus(err.message || 'Error processing RSS feed', 'error');
    } finally {
      setProcessingFeedId(null);
    }
  };

  // Action: Trigger Full Pipeline across all active feeds
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
              body: JSON.stringify({ 
                feedUrl: feed.url, 
                feedName: feed.name,
                category: feed.category || 'Économie', 
                maxItems: 1, 
                autoPublish: false,
                preferredEngine: 'auto',
                type: 'News'
              })
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
          ? `Veille globale complétée : ${totalGenerated} articles rédigés par l'IA double-moteur.` 
          : `Global scan complete: ${totalGenerated} drafts generated via Dual-Engine AI.`
      );
    } catch (err: any) {
      showStatus(err.message || 'Pipeline execution failed', 'error');
    } finally {
      setRunningAllPipeline(false);
      runHealthCheck();
    }
  };

  // Action: Manual Generate from custom prompt
  const handleGenerateFromPrompt = async (e: React.FormEvent) => {
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

      if (onRefreshArticles) onRefreshArticles();
      setManualPrompt('');
      showStatus(
        isFr 
          ? `Article narratif généré (${data.engineUsed || 'IA Dual'}) et ajouté à la file des brouillons !` 
          : `Article story created via ${data.engineUsed || 'Dual AI'} and placed in draft queue!`
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
          ? `Article "${draft.title.fr || draft.title.en}" publié en direct sur le portail !` 
          : `Article "${draft.title.en || draft.title.fr}" published live!`
      );
    } catch (err: any) {
      showStatus(err.message || 'Error publishing draft', 'error');
    }
  };

  // Action: Publish all drafts
  const handlePublishAllDrafts = async () => {
    if (!window.confirm(isFr ? "Publier tous les brouillons validés en direct ?" : "Publish all verified drafts live?")) return;

    let successCount = 0;
    for (const draft of draftArticles) {
      try {
        await handlePublishDraft(draft);
        successCount++;
      } catch (e) {
        console.error("Failed to publish draft:", draft.id);
      }
    }
    showStatus(isFr ? `${successCount} articles publiés en direct.` : `${successCount} drafts published live.`);
  };

  // Action: Purge all drafts
  const handlePurgeDrafts = () => {
    if (!window.confirm(isFr ? "Supprimer TOUS les brouillons en attente de validation ?" : "Purge ALL pending drafts?")) return;
    draftArticles.forEach(d => deleteArticle(d.id));
    showStatus(isFr ? 'File des brouillons purgée.' : 'Draft queue purged.');
  };

  const handleSaveScheduleConfig = async (updatedFields: Partial<any>) => {
    setScheduleLoading(true);
    try {
      const payload = {
        enabled: updatedFields.enabled ?? autoSchedule.enabled,
        intervalMinutes: updatedFields.intervalMinutes ?? autoSchedule.intervalMinutes,
        targetPack: updatedFields.targetPack ?? autoSchedule.targetPack,
        maxArticlesPerCycle: updatedFields.maxArticlesPerCycle ?? autoSchedule.maxArticlesPerCycle,
        autoPublish: updatedFields.autoPublish ?? autoSchedule.autoPublish,
        preferredEngine: updatedFields.preferredEngine ?? autoSchedule.preferredEngine ?? 'auto',
        customPrompt: updatedFields.customPrompt ?? autoSchedule.customPrompt ?? ''
      };

      const { ok, data, error } = await safeFetchJson('/api/rss-automation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (ok && data?.success) {
        setAutoSchedule(data.config);
        showStatus(isFr ? 'Planning de rédaction automatique mis à jour !' : 'Newsroom auto-schedule updated!');
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
        showStatus(isFr ? 'Cycle de rédaction automatisé lancé en arrière-plan !' : 'Automated drafting cycle started in background!');
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

  // Drafts filtering
  const draftArticles = (articles || []).filter(a => !a.isPublished);
  const filteredDrafts = draftArticles.filter(draft => {
    const matchesCat = selectedCategory === 'all' || draft.category === selectedCategory;
    const matchesStyle = selectedStyleFilter === 'all' || (draft.type || 'News') === selectedStyleFilter;
    const matchesEngine = selectedEngineFilter === 'all' || 
      (selectedEngineFilter === 'gemini' && (draft as any).engineUsed?.toLowerCase().includes('gemini')) ||
      (selectedEngineFilter === 'openai' && (draft as any).engineUsed?.toLowerCase().includes('openai'));
    
    const titleText = (draft.title?.fr || draft.title?.en || '').toLowerCase();
    const bodyText = (draft.body?.fr || draft.body?.en || '').toLowerCase();
    const sourceText = (draft.sourceName || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || titleText.includes(q) || bodyText.includes(q) || sourceText.includes(q);

    return matchesCat && matchesStyle && matchesEngine && matchesSearch;
  });

  // Metrics
  const activeFeeds = rssFeeds.filter((f: any) => f.active !== false);
  const totalActiveFeeds = activeFeeds.length;
  const healthList = activeFeeds.map((f: any) => feedHealthMap[f.url]).filter(Boolean);
  const healthyCount = healthList.filter(h => h.status === 'healthy').length;
  const latencies = healthList.map(h => h.latencyMs).filter(l => typeof l === 'number' && l > 0);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const publishedArticlesCount = (articles || []).filter(a => a.isPublished).length;

  return (
    <div className="space-y-6 text-zinc-100 font-sans" id="newsroom-hub-root">
      {/* Toast Notification */}
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

      {/* Top Operations Header: Digital Newsroom Desk */}
      
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                Newsroom Editorial Desk
              </h2>
            </div>
          </div>
        </div>
        
  {/* Clean Newsroom Tab Navigation Bar */}

        <div className="flex items-center gap-2 border-t border-zinc-800/80 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveNewsroomTab('drafts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNewsroomTab === 'drafts' ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/50 border border-orange-500/30'

                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Newspaper size={15} />
            <span>{isFr ? 'File des Dépêches & Brouillons' : 'Editorial Staging & Drafts'}</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] font-mono rounded-full bg-black/40 text-white">
              {draftArticles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveNewsroomTab('feeds')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNewsroomTab === 'feeds'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/50 border border-orange-500/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Globe size={15} />
            <span>{isFr ? 'Agences de Presse & Flux Wire' : 'Press Agencies & Wire Feeds'}</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] font-mono rounded-full bg-black/40 text-white">
              {rssFeeds.length}
            </span>
          </button>

          <button
            onClick={() => setActiveNewsroomTab('writer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNewsroomTab === 'writer'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/50 border border-orange-500/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Sparkles size={15} />
            <span>{isFr ? 'Atelier Storytelling IA' : 'AI Storytelling Writer'}</span>
          </button>

          <button
            onClick={() => setActiveNewsroomTab('scheduler')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNewsroomTab === 'scheduler'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/50 border border-orange-500/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Clock size={15} />
            <span>{isFr ? 'Planificateur Automatique' : 'Auto-Dispatcher'}</span>
            <span className={`ml-1 w-2 h-2 rounded-full ${autoSchedule.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          </button>

          <button
            onClick={() => setActiveNewsroomTab('guidelines')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNewsroomTab === 'guidelines'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/50 border border-orange-500/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <BookOpen size={15} />
            <span>{isFr ? 'Charte Édit. & Directives IA' : 'AI Style Guide & Guidelines'}</span>
            <span className="ml-1 w-2 h-2 rounded-full bg-amber-400" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: EDITORIAL STAGING & DRAFTS QUEUE
         ========================================================================= */}
      {activeNewsroomTab === 'drafts' && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder={isFr ? "Rechercher par titre, source ou mot-clé..." : "Search by headline, source or keyword..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-9 pr-3.5 py-2.5 rounded-xl outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Category, Style & Engine Filters */}
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

              <select
                value={selectedEngineFilter}
                onChange={(e) => setSelectedEngineFilter(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono px-3 py-2 rounded-xl outline-none focus:border-orange-500"
              >
                <option value="all">{isFr ? 'Tous Moteurs IA' : 'All AI Engines'}</option>
                <option value="gemini">Gemini 3.7 Flash</option>
                <option value="groq">Groq Llama 3.3</option>
                <option value="openrouter">OpenRouter / Claude</option>
                <option value="openai">OpenAI GPT-4o</option>
              </select>

              {draftArticles.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handlePublishAllDrafts}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
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
                    ? 'Lancez un scan de dépêches depuis l\'onglet Agences ou utilisez l\'Atelier Storytelling IA pour rédiger un article d\'actualité.'
                    : 'Run a wire scan from the Press Agencies tab or use the AI Storytelling Writer to draft an article.'}
                </p>
              </div>
              <button
                onClick={handleRunFullPipeline}
                disabled={runningAllPipeline}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <Play size={14} />
                <span>{isFr ? 'Scanner les flux maintenant' : 'Scan feeds now'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDrafts.map((draft) => {
                const src = getArticleSourceInfo(draft, rssFeeds);
                const engineFootprint = (draft as any).engineUsed || 'Dual-Engine Auto';
                const isFailover = (draft as any).failoverTriggered;
                const hasBrief = !!draft.perspectiveBrief;
                const hasTimeline = Array.isArray(draft.timeline) && draft.timeline.length > 0;
                const hasActors = Array.isArray(draft.keyActors) && draft.keyActors.length > 0;
                const hasForces = !!draft.structuralForces;

                return (
                  <div 
                    key={draft.id}
                    className="bg-zinc-900/90 border border-zinc-800/90 hover:border-orange-500/50 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges & Source Origin */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-200">
                            <span>{src.originFlag}</span>
                            <span className="truncate max-w-[130px]">{src.sourceName}</span>
                          </span>

                          <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-[10px] font-mono font-bold uppercase border border-orange-500/20">
                            {draft.category}
                          </span>

                          <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold uppercase border border-blue-500/20">
                            {draft.type === 'Deep Dive' ? '📜 Grand Angle' : draft.type === 'Analysis' ? '🔍 Analyse' : '⚡ News Récit'}
                          </span>
                        </div>

                        {/* AI Engine Footprint Badge */}
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          isFailover
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {engineFootprint} {isFailover ? '⚠️ (Failover)' : ''}
                        </span>
                      </div>

                      {/* Title Headline (Bilingual Display) */}
                      <div>
                        <h4 className="text-sm font-extrabold text-white leading-snug group-hover:text-orange-400 transition-colors">
                          {draft.title?.fr || draft.title?.en}
                        </h4>
                        {draft.title?.en && draft.title?.fr && (
                          <p className="text-[11px] text-zinc-400 font-mono mt-1 line-clamp-1">
                            🇬🇧 {draft.title.en}
                          </p>
                        )}
                      </div>

                      {/* Excerpt Lead */}
                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                        {draft.excerpt?.fr || draft.excerpt?.en}
                      </p>

                      {/* Coherence & Structural Health Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-zinc-800/80 text-[10px] font-mono">
                        <span className="text-zinc-500 uppercase font-bold mr-1">{isFr ? 'Cohérence' : 'Structure'}:</span>
                        <span className={`px-2 py-0.5 rounded ${hasBrief ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                          {hasBrief ? '✓ 3 Briefs' : '✕ Brief'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${hasTimeline ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                          {hasTimeline ? '✓ Chronologie' : '✕ Chrono'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${hasActors ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                          {hasActors ? '✓ Acteurs' : '✕ Acteurs'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${hasForces ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                          {hasForces ? '✓ Forces P.E.S.I' : '✕ Forces'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800/80">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setInspectDraft(draft);
                            setInspectLanguage('fr');
                          }}
                          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-zinc-800 transition-all cursor-pointer"
                          title={isFr ? "Examiner la cohérence éditoriale" : "Inspect editorial structure"}
                        >
                          <Eye size={13} />
                          <span>{isFr ? 'Examiner' : 'Inspect'}</span>
                        </button>

                        {onEditArticle && (
                          <button
                            onClick={() => onEditArticle(draft)}
                            className="p-2 bg-zinc-950 hover:bg-orange-600 text-zinc-300 hover:text-white rounded-xl text-xs border border-zinc-800 transition-all cursor-pointer"
                            title={isFr ? "Ouvrir dans l'éditeur complet" : "Open in main editor"}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePublishDraft(draft)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1 cursor-pointer"
                        >
                          <Check size={13} />
                          <span>{isFr ? 'Publier' : 'Publish'}</span>
                        </button>

                        <button
                          onClick={() => {
                            deleteArticle(draft.id);
                            showStatus(isFr ? 'Brouillon retiré.' : 'Draft removed.');
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                          title={isFr ? "Supprimer" : "Delete"}
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

      {/* =========================================================================
          TAB 2: PRESS AGENCIES & WIRE FEEDS MONITORING
         ========================================================================= */}
      {activeNewsroomTab === 'feeds' && (
        <div className="space-y-6">
          {/* Preset Packs & Feed Management Bar */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                  <Globe size={16} className="text-orange-400" />
                  <span>{isFr ? 'Packs d\'Agences de Presse Partenaires' : 'Partner Press Agency Packs'}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isFr ? 'Activez des bouquets de veille thématiques et régionaux en un clic.' : 'One-click activation of curated regional and topical wire packs.'}
                </p>
              </div>

              <button
                onClick={() => setShowAddFeedModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>{isFr ? 'Ajouter une Source RSS' : 'Add Wire Source'}</span>
              </button>
            </div>

            {/* Pack Selector Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleLoadPresetPack('senegal')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>🇸🇳</span>
                <span>{isFr ? 'Presse Sénégal (APS, Le Soleil, Seneweb...)' : 'Senegal Press Wire'}</span>
              </button>

              <button
                onClick={() => handleLoadPresetPack('africa')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>🌍</span>
                <span>{isFr ? 'Afrique & CEDEAO (RFI Afrique, Jeune Afrique...)' : 'Africa & ECOWAS Wire'}</span>
              </button>

              <button
                onClick={() => handleLoadPresetPack('world')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>🌐</span>
                <span>{isFr ? 'Agences Mondiales (Reuters, BBC, Bloomberg...)' : 'Global Wires'}</span>
              </button>

              <button
                onClick={() => handleLoadPresetPack('sports')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>⚽</span>
                <span>{isFr ? 'Sports & Football (RMC Sport, Sky Sports...)' : 'Sports & Football Wire'}</span>
              </button>

              <button
                onClick={() => handleLoadPresetPack('all')}
                className="px-3 py-1.5 bg-orange-600/20 text-orange-300 border border-orange-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
              >
                <Zap size={13} />
                <span>{isFr ? 'Charger Tous les Packs' : 'Load All Packs'}</span>
              </button>
            </div>
          </div>

          {/* Feed Sources Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rssFeeds.map((feed: any) => {
              const health = feedHealthMap[feed.url];
              const isHealthy = health?.status === 'healthy';
              const isTesting = testingFeedUrl === feed.url;
              const isProcessing = processingFeedId === feed.id;

              return (
                <div 
                  key={feed.id}
                  className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold bg-zinc-950 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                        <span>{feed.originFlag || '🌐'}</span>
                        <span>{feed.category || 'Actualités'}</span>
                      </span>

                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        isHealthy 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : health?.status === 'degraded'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : health?.status === 'error'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span>{health ? `${health.latencyMs || 0} ms` : 'Non testé'}</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white leading-snug">{feed.name}</h4>
                      <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">{feed.url}</p>
                    </div>

                    {health?.lastItemTitle && (
                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80">
                        <span className="text-[9px] font-mono uppercase text-zinc-500 block mb-0.5">{isFr ? 'Dernière dépêche' : 'Latest headline'} :</span>
                        <p className="text-[11px] text-zinc-300 line-clamp-1 italic">"{health.lastItemTitle}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions per feed */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                    <button
                      onClick={() => runHealthCheck(feed.url)}
                      disabled={isTesting}
                      className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-950 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
                      title={isFr ? "Tester la connexion" : "Test ping"}
                    >
                      <RefreshCw size={13} className={isTesting ? "animate-spin text-orange-400" : ""} />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleProcessFeed(feed.url, feed.id, feed.category, 'News')}
                        disabled={isProcessing}
                        className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Zap size={11} className={isProcessing ? "animate-spin" : ""} />
                        <span>{isProcessing ? '...' : (isFr ? 'Rédiger' : 'Draft')}</span>
                      </button>

                      <button
                        onClick={() => handleRemoveFeed(feed.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        title={isFr ? "Supprimer" : "Remove"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal for adding new feed */}
          {showAddFeedModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Plus size={16} className="text-orange-400" />
                    <span>{isFr ? 'Ajouter une Nouvelle Agence / Flux' : 'Add New Wire Source'}</span>
                  </h3>
                  <button onClick={() => setShowAddFeedModal(false)} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleAddFeed} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                      {isFr ? 'Nom de la Source' : 'Agency / Source Name'}
                    </label>
                    <input
                      type="text"
                      placeholder="ex: APS Sénégal ou RFI International"
                      value={newFeedName}
                      onChange={e => setNewFeedName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 text-white px-3.5 py-2 rounded-xl text-xs outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                      {isFr ? 'URL du Flux RSS' : 'RSS Feed URL'} *
                    </label>
                    <input
                      type="url"
                      placeholder="https://aps.sn/feed/ ou URL XML"
                      value={newFeedUrl}
                      onChange={e => setNewFeedUrl(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 text-white px-3.5 py-2 rounded-xl text-xs outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                        {isFr ? 'Rubrique' : 'Category'}
                      </label>
                      <select
                        value={newFeedCategory}
                        onChange={e => setNewFeedCategory(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-orange-500"
                      >
                        {RSS_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                        {isFr ? 'Pack Régional' : 'Region Pack'}
                      </label>
                      <select
                        value={newFeedPack}
                        onChange={e => setNewFeedPack(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-orange-500"
                      >
                        <option value="senegal">🇸🇳 Sénégal</option>
                        <option value="africa">🌍 Afrique & CEDEAO</option>
                        <option value="world">🌐 International</option>
                        <option value="sports">⚽ Sports</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowAddFeedModal(false)}
                      className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
                    >
                      {isFr ? 'Annuler' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase rounded-xl transition-all shadow"
                    >
                      {isFr ? 'Enregistrer la Source' : 'Save Source'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: AI STORYTELLING NEWSROOM WRITER
         ========================================================================= */}
      {activeNewsroomTab === 'writer' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/30">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  {isFr ? 'Atelier Storytelling & Rédaction Double Moteur' : 'Dual-Engine Storytelling & Newsroom Writer'}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isFr 
                    ? 'Rédigez des articles immersifs en français et anglais à partir d\'une dépêche brute, d\'un fait d\'actualité ou d\'un sujet stratégique.'
                    : 'Transform raw wire copy, breaking news leads or investigative topics into rich bilingual storytelling articles.'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerateFromPrompt} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-zinc-300 mb-2 flex items-center justify-between">
                <span>{isFr ? 'Sujet d\'actualité, Dépêche brute ou Piste d\'enquête' : 'Topic, Raw Wire Copy or Breaking News Lead'}</span>
                <span className="text-[10px] text-orange-400 font-mono">Bilingue FR + EN garanti</span>
              </label>
              <textarea
                value={manualPrompt}
                onChange={e => setManualPrompt(e.target.value)}
                placeholder={isFr 
                  ? "ex: Le Sénégal inaugure son nouveau terminal portuaire à Ndayane pour fluidifier le commerce ouest-africain avec la CEDEAO..."
                  : "e.g., Senegal inaugurates the new deepwater port in Ndayane to accelerate West African trade dynamics..."}
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-700 text-white p-4 rounded-2xl text-xs leading-relaxed outline-none focus:border-orange-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Storytelling Format Selector */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-orange-400 block">
                  {isFr ? 'Format & Profondeur de Récit' : 'Storytelling Depth'}
                </label>
                <select
                  value={manualStyleType}
                  onChange={e => setManualStyleType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 outline-none focus:border-orange-500"
                >
                  <option value="News">⚡ News Récit (350 - 550 mots)</option>
                  <option value="Analysis">🔍 Analyse Stratégique (800 - 1200 mots)</option>
                  <option value="Deep Dive">📜 Grand Angle / Dossier (1200+ mots)</option>
                </select>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {manualStyleType === 'News' && (isFr ? 'Récit concis, faits majeurs, citations institutionnelles.' : 'Concise narrative, major facts, key quotes.')}
                  {manualStyleType === 'Analysis' && (isFr ? 'Enjeux régionaux, forces socio-économiques, échiquier.' : 'Regional stakes, socio-economic dynamics.')}
                  {manualStyleType === 'Deep Dive' && (isFr ? 'Perspective historique, radiographie structurelle complète.' : 'Historical context, full structural radiography.')}
                </p>
              </div>

              {/* AI Engine Preference */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-emerald-400 block">
                  {isFr ? 'Moteur IA Privilégié' : 'Preferred AI Engine'}
                </label>
                <select
                  value={manualPreferredEngine}
                  onChange={e => setManualPreferredEngine(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 outline-none focus:border-emerald-500"
                >
                  <option value="auto">🤖 Multi-Engine Cascade Auto (Gemini ⇄ Groq ⇄ OpenRouter ⇄ OpenAI)</option>
                  <option value="groq">🚀 Groq Llama 3.3 70B (Vitesse Éclair)</option>
                  <option value="openrouter">🌐 OpenRouter (Claude 3.5 / DeepSeek R1)</option>
                  <option value="gemini">⚡ Gemini 3.7 Flash Principal</option>
                  <option value="openai">🧠 OpenAI GPT-4o-mini Principal</option>
                </select>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {isFr ? 'Bascule automatique en cas de quota dépassé ou de latence.' : 'Automatic switch when quota or rate-limit is hit.'}
                </p>
              </div>

              {/* Category */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-blue-400 block">
                  {isFr ? 'Rubrique Éditoriale' : 'Target Category'}
                </label>
                <select
                  value={manualCategory}
                  onChange={e => setManualCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 outline-none focus:border-blue-500"
                >
                  {RSS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {isFr ? 'Classification thématique sur le portail Perspective.' : 'Thematic routing on Perspective portal.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={promptLoading || !manualPrompt.trim()}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-orange-950/40 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} className={promptLoading ? 'animate-spin' : ''} />
                <span>{promptLoading ? (isFr ? 'Rédaction IA en cours...' : 'AI Storyteller Writing...') : (isFr ? 'Générer l\'Article Récit' : 'Generate Story Article')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 4: AUTO-SCHEDULER & EXECUTION LOGS
         ========================================================================= */}
      {activeNewsroomTab === 'guidelines' && (
        <div className="space-y-8">
          {/* Top Banner & Quick Presets */}
          <div className="bg-gradient-to-r from-zinc-900 via-amber-950/30 to-zinc-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 text-xs font-mono font-bold px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
                    <Award size={14} />
                    {isFr ? 'Charte Éditoriale & Studio Moteur IA' : 'Editorial Charter & AI Prompt Studio'}
                  </span>
                  {editorialGuidelines.updatedAt && (
                    <span className="text-[11px] font-mono text-zinc-400">
                      Modifié le {new Date(editorialGuidelines.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {isFr ? 'Directives Sur-Mesure & Calibrage du Ton Journalistique' : 'Custom Writing Guidelines & Journalistic Tone Studio'}
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {isFr
                    ? 'Définissez la ligne éditoriale de Perspective Group. Vos consignes, mots interdits et exemples de référence sont injectés directement dans le prompt système du moteur de rédaction IA dual-engine (Gemini / OpenAI).'
                    : 'Set Perspective Group\'s editorial guidelines. Directives, forbidden phrases, and canonical examples are injected into the master system prompt for dual-engine generation.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleResetGuidelines}
                  disabled={savingGuidelines}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono font-bold rounded-xl border border-zinc-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>{isFr ? 'Réinitialiser' : 'Reset Defaults'}</span>
                </button>

                <button
                  onClick={handleSaveGuidelines}
                  disabled={savingGuidelines}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingGuidelines ? (
                    <Cpu size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  <span>{isFr ? 'Enregistrer la Charte' : 'Save Guidelines'}</span>
                </button>
              </div>
            </div>

            {/* Presets Bar */}
            <div className="mt-6 pt-5 border-t border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <span className="text-xs font-mono text-amber-200/80 font-semibold flex items-center gap-1.5">
                <Sliders size={14} className="text-amber-400" />
                {isFr ? 'Presets de Ligne Éditoriale Rapides :' : 'Quick Style Presets:'}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyPreset('dakar')}
                  className="px-3 py-1.5 bg-zinc-950/80 hover:bg-amber-900/40 text-amber-200 text-xs font-mono rounded-lg border border-amber-500/30 transition-all cursor-pointer"
                >
                  🇸🇳 West-Africa Storytelling
                </button>
                <button
                  onClick={() => applyPreset('geopolitics')}
                  className="px-3 py-1.5 bg-zinc-950/80 hover:bg-amber-900/40 text-amber-200 text-xs font-mono rounded-lg border border-amber-500/30 transition-all cursor-pointer"
                >
                  🌐 Grand Format Multi-Rubriques
                </button>
                <button
                  onClick={() => applyPreset('investigative')}
                  className="px-3 py-1.5 bg-zinc-950/80 hover:bg-amber-900/40 text-amber-200 text-xs font-mono rounded-lg border border-amber-500/30 transition-all cursor-pointer"
                >
                  🔍 Grand Enquête & Terrain
                </button>
                <button
                  onClick={() => applyPreset('wire')}
                  className="px-3 py-1.5 bg-zinc-950/80 hover:bg-amber-900/40 text-amber-200 text-xs font-mono rounded-lg border border-amber-500/30 transition-all cursor-pointer"
                >
                  ⚡ Dépêche Incisive
                </button>
              </div>
            </div>
          </div>

          {/* Form Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Section 1: Tone & Custom Writing Directives */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileCode size={16} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {isFr ? '1. Directives Rédactionnelles & Style' : '1. Writing Rules & Style Directives'}
                  </h3>
                </div>
                <select
                  value={editorialGuidelines.preferredTone}
                  onChange={(e) => setEditorialGuidelines({ ...editorialGuidelines, preferredTone: e.target.value as any })}
                  className="bg-zinc-950 border border-zinc-800 text-amber-400 text-xs font-mono px-3 py-1.5 rounded-xl outline-none focus:border-amber-500"
                >
                  <option value="analytical">Tone: Analytique & Rigoureux</option>
                  <option value="investigative">Tone: Immersif & Enquête</option>
                  <option value="diplomatic">Tone: Diplomatique & Factuel</option>
                  <option value="dynamic">Tone: Dynamique & Percutant</option>
                  <option value="custom">Tone: Sur-mesure</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-2">
                  {isFr ? 'Consignes Spécifiques & Directives de Rédaction (Master Directives) :' : 'Master Directives & Instructions:'}
                </label>
                <textarea
                  rows={8}
                  value={editorialGuidelines.customDirectives}
                  onChange={(e) => setEditorialGuidelines({ ...editorialGuidelines, customDirectives: e.target.value })}
                  placeholder={isFr ? "Exemple :\n1. Toujours contextualiser l'impact économique sur le Sénégal et l'UEMOA.\n2. Ouvrir chaque article par une citation marquante ou une scène incarnée.\n3. Structurer avec des sous-titres analytiques (##)..." : "Enter guidelines here..."}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs p-3.5 rounded-xl font-mono leading-relaxed outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Section 2: Editor Feedback & Banned Clichés */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-orange-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {isFr ? '2. Notes de Correction & Mots Interdits' : '2. Quality Feedback & Banned Words'}
                  </h3>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-2">
                  {isFr ? 'Remarques du Rédacteur en Chef (Corrections à respecter) :' : 'Chief Editor Feedback Notes:'}
                </label>
                <textarea
                  rows={3}
                  value={editorialGuidelines.editorialComments}
                  onChange={(e) => setEditorialGuidelines({ ...editorialGuidelines, editorialComments: e.target.value })}
                  placeholder={isFr ? "Ex: Soigner particulièrement les chapeaux. Éviter d'utiliser des adjectifs hyperboliques..." : "Feedback notes..."}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs p-3 rounded-xl font-mono leading-relaxed outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Forbidden Phrases Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-mono text-zinc-400">
                  {isFr ? 'Expressions Proscrites & Clichés Bannis (Zero-Cliché Policy) :' : 'Banned Words & Rejected Clichés:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newForbiddenTag}
                    onChange={(e) => setNewForbiddenTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddForbiddenPhrase())}
                    placeholder={isFr ? "Ajouter un mot/cliché interdit (ex: game-changer)..." : "Add banned phrase..."}
                    className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    onClick={handleAddForbiddenPhrase}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    + {isFr ? 'Ajouter' : 'Add'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 max-h-28 overflow-y-auto">
                  {editorialGuidelines.forbiddenPhrases.map((phrase) => (
                    <span
                      key={phrase}
                      className="bg-red-950/60 text-red-300 text-xs font-mono px-2.5 py-1 rounded-lg border border-red-800/50 flex items-center gap-1.5 group"
                    >
                      <span>"{phrase}"</span>
                      <button
                        onClick={() => handleRemoveForbiddenPhrase(phrase)}
                        className="text-red-400 hover:text-white cursor-pointer ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {editorialGuidelines.forbiddenPhrases.length === 0 && (
                    <span className="text-zinc-500 text-xs italic font-mono">
                      {isFr ? 'Aucune expression proscrite.' : 'No banned phrases specified.'}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: Gold Standard Exemplary Reference Article */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {isFr ? '3. Article de Référence "Gold Standard" (Exemple Canonique)' : '3. Gold-Standard Canonical Reference Example'}
                </h3>
              </div>
              <button
                onClick={handleLoadCanonicalExample}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-amber-300 text-xs font-mono font-bold rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Tag size={13} />
                <span>{isFr ? 'Charger exemple (Port de Ndayane)' : 'Load Example'}</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-mono">
              {isFr
                ? 'Cet exemple canonique guide l\'IA sur la structure exacte des titres, chapeaux et corps d\'articles attendus sur Perspective.'
                : 'This canonical example serves as a reference for headline styling, excerpts, and body structures.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    {isFr ? 'Titre de Référence (FR) :' : 'Reference Title (FR):'}
                  </label>
                  <input
                    type="text"
                    value={editorialGuidelines.exemplaryExample?.titleFr || ''}
                    onChange={(e) => setEditorialGuidelines({
                      ...editorialGuidelines,
                      exemplaryExample: { ...editorialGuidelines.exemplaryExample, titleFr: e.target.value }
                    })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    {isFr ? 'Chapeau / Extrait (FR) :' : 'Reference Excerpt (FR):'}
                  </label>
                  <textarea
                    rows={2}
                    value={editorialGuidelines.exemplaryExample?.excerptFr || ''}
                    onChange={(e) => setEditorialGuidelines({
                      ...editorialGuidelines,
                      exemplaryExample: { ...editorialGuidelines.exemplaryExample, excerptFr: e.target.value }
                    })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs p-2.5 rounded-xl outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  {isFr ? 'Extrait du Corps (Markdown FR) :' : 'Reference Body Sample (FR):'}
                </label>
                <textarea
                  rows={5}
                  value={editorialGuidelines.exemplaryExample?.bodyFr || ''}
                  onChange={(e) => setEditorialGuidelines({
                    ...editorialGuidelines,
                    exemplaryExample: { ...editorialGuidelines.exemplaryExample, bodyFr: e.target.value }
                  })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs p-2.5 rounded-xl outline-none focus:border-amber-500 font-mono leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Live AI Writing Test Studio */}
          <div className="bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Play size={16} className="text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  {isFr ? '4. Studio de Test IA en Direct (Live Generation Sandbox)' : '4. Live AI Sandbox Testing'}
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Dual-Engine Active
              </span>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono text-zinc-300">
                {isFr ? 'Sujet / Prompt d\'actualité pour tester vos directives :' : 'Topic or headline prompt to test guidelines:'}
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder={isFr ? "Entrez un sujet d'actualité..." : "Enter a news topic..."}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-white text-xs px-4 py-3 rounded-xl outline-none focus:border-amber-500 font-mono"
                />
                <button
                  onClick={handleTestGuidelines}
                  disabled={testingGuidelines || !testPrompt.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {testingGuidelines ? (
                    <>
                      <Cpu size={16} className="animate-spin" />
                      <span>{isFr ? 'Génération IA...' : 'Generating...'}</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>{isFr ? 'Tester le Rendu' : 'Run Test'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Result Output Box */}
            {testResult && testResult.article && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs font-sans mt-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-2">
                    <CheckCircle size={15} />
                    {isFr ? 'Résultat de la Rédaction IA (Généré)' : 'Generated AI Test Article'}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Moteur : <strong className="text-white">{testResult.engineUsed || 'Dual Engine'}</strong>
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-black text-white leading-tight">
                    {testResult.article.title?.fr || testResult.article.title?.en}
                  </h4>
                  <p className="text-zinc-300 italic bg-zinc-950 p-3 rounded-xl border border-zinc-800 leading-relaxed">
                    {testResult.article.excerpt?.fr || testResult.article.excerpt?.en}
                  </p>
                </div>

                {testResult.article.perspectiveBrief && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-zinc-300 font-mono text-[11px] bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div>
                      <strong className="text-amber-400 block mb-1">📌 Ce qu'il s'est passé :</strong>
                      {testResult.article.perspectiveBrief.whatHappened?.fr || testResult.article.perspectiveBrief.whatHappened?.en}
                    </div>
                    <div>
                      <strong className="text-amber-400 block mb-1">⚡ Pourquoi cela compte :</strong>
                      {testResult.article.perspectiveBrief.whyItMatters?.fr || testResult.article.perspectiveBrief.whyItMatters?.en}
                    </div>
                    <div>
                      <strong className="text-amber-400 block mb-1">🔍 À surveiller :</strong>
                      {testResult.article.perspectiveBrief.whatToWatchNext?.fr || testResult.article.perspectiveBrief.whatToWatchNext?.en}
                    </div>
                  </div>
                )}

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 max-h-60 overflow-y-auto leading-relaxed text-zinc-300 whitespace-pre-line font-mono text-[11px]">
                  {testResult.article.body?.fr || testResult.article.body?.en}
                </div>

                {/* Send Tested Article to Drafts Queue Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>{isFr ? 'Article conforme à la charte de la rédaction' : 'Conforms to newsroom editorial guidelines'}</span>
                  </div>

                  <button
                    onClick={handleSendTestToDrafts}
                    disabled={savingTestToDrafts}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {savingTestToDrafts ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-white" />
                        <span>{isFr ? 'Transfert vers les Brouillons...' : 'Saving to Drafts...'}</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>{isFr ? 'Envoyer l\'Article Testé aux Brouillons' : 'Send Tested Article to Drafts'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAFT COHERENCE & EDITORIAL INSPECTION DRAWER / MODAL
         ========================================================================= */}
      {inspectDraft && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative text-zinc-100 font-sans">
            
            {/* Header with Language Switcher */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="bg-orange-500/20 text-orange-400 text-xs font-mono font-bold px-3 py-1 rounded-full border border-orange-500/30">
                  {inspectDraft.category}
                </span>
                <span className="bg-blue-500/20 text-blue-400 text-xs font-mono font-bold px-3 py-1 rounded-full border border-blue-500/30">
                  {inspectDraft.type === 'Deep Dive' ? '📜 Grand Angle' : inspectDraft.type === 'Analysis' ? '🔍 Analyse Stratégique' : '⚡ News Récit'}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  ⏱️ {inspectDraft.readingTime || 4} min lecture
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Switcher for Preview */}
                <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setInspectLanguage('fr')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      inspectLanguage === 'fr' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    🇫🇷 Français
                  </button>
                  <button
                    onClick={() => setInspectLanguage('en')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      inspectLanguage === 'en' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>

                <button
                  onClick={() => setInspectDraft(null)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Source Origin & AI Traceability Header */}
            {(() => {
              const src = getArticleSourceInfo(inspectDraft, rssFeeds);
              const engineFootprint = (inspectDraft as any).engineUsed || 'Dual-Engine Auto';
              const isFailover = (inspectDraft as any).failoverTriggered;

              return (
                <div className="bg-zinc-950 border border-blue-500/30 p-4 rounded-2xl space-y-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-blue-400 flex items-center gap-1.5">
                      <Globe size={14} />
                      {isFr ? 'Attribution & Origine de la Source' : 'Source Attribution & Origin'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Moteur: {engineFootprint} {isFailover ? '⚠️ (Failover basculé)' : '✓'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 font-mono text-[10px] uppercase block">{isFr ? 'Agence / Média' : 'Agency / Media'} :</span>
                      <strong className="text-white text-sm">{src.sourceName}</strong>
                    </div>

                    <div>
                      <span className="text-zinc-500 font-mono text-[10px] uppercase block">{isFr ? 'Zone Géographique' : 'Geographic Zone'} :</span>
                      <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                        <span>{src.originFlag}</span>
                        <span>{src.originCountry}</span>
                      </span>
                    </div>

                    {src.originalUrl && (
                      <div className="flex items-end">
                        <a 
                          href={src.originalUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-3 py-1 bg-zinc-900 hover:bg-orange-600 text-zinc-300 hover:text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-all border border-zinc-800"
                        >
                          <span>{isFr ? 'Consulter la source' : 'View wire source'}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Headline & Abstract */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white leading-tight">
                {inspectLanguage === 'fr' 
                  ? (inspectDraft.title?.fr || inspectDraft.title?.en) 
                  : (inspectDraft.title?.en || inspectDraft.title?.fr)}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                {inspectLanguage === 'fr' 
                  ? (inspectDraft.excerpt?.fr || inspectDraft.excerpt?.en) 
                  : (inspectDraft.excerpt?.en || inspectDraft.excerpt?.fr)}
              </p>
            </div>

            {/* Perspective 3 Briefs */}
            {inspectDraft.perspectiveBrief && (
              <div className="bg-zinc-950 border border-orange-500/30 p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Brief Perspective (Ce qu'il faut retenir)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-300">
                  <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800">
                    <strong className="text-white block mb-1 text-[11px]">📌 Ce qu'il s'est passé :</strong>
                    <p className="leading-relaxed">
                      {inspectLanguage === 'fr' 
                        ? (inspectDraft.perspectiveBrief.whatHappened?.fr || inspectDraft.perspectiveBrief.whatHappened?.en) 
                        : (inspectDraft.perspectiveBrief.whatHappened?.en || inspectDraft.perspectiveBrief.whatHappened?.fr)}
                    </p>
                  </div>
                  <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800">
                    <strong className="text-white block mb-1 text-[11px]">⚡ Pourquoi cela compte :</strong>
                    <p className="leading-relaxed">
                      {inspectLanguage === 'fr' 
                        ? (inspectDraft.perspectiveBrief.whyItMatters?.fr || inspectDraft.perspectiveBrief.whyItMatters?.en) 
                        : (inspectDraft.perspectiveBrief.whyItMatters?.en || inspectDraft.perspectiveBrief.whyItMatters?.fr)}
                    </p>
                  </div>
                  <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800">
                    <strong className="text-white block mb-1 text-[11px]">🔍 À surveiller ensuite :</strong>
                    <p className="leading-relaxed">
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
              <div className="bg-zinc-950 border border-blue-500/30 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  Chronologie des Événements
                </h4>
                <div className="space-y-2">
                  {inspectDraft.timeline.map((t, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs">
                      <span className="font-mono text-orange-400 font-bold shrink-0">{t.date}</span>
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
              <div className="bg-zinc-950 border border-purple-500/30 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
                  Acteurs Clés & Positionnement
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {inspectDraft.keyActors.map((actor, idx) => (
                    <div key={idx} className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                      <div className="font-bold text-white">{actor.name} <span className="text-zinc-400 font-normal">({actor.role})</span></div>
                      <div className="text-zinc-300 mt-1 text-[11px]">
                        {inspectLanguage === 'fr' ? (actor.significance?.fr || actor.significance?.en) : (actor.significance?.en || actor.significance?.fr)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Markdown Body preview */}
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl text-xs text-zinc-300 leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto space-y-2">
              <strong className="text-zinc-100 block mb-2 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-800 pb-2">
                Corps de l'article ({inspectLanguage === 'fr' ? 'Version Française' : 'English Version'}) :
              </strong>
              {inspectLanguage === 'fr' 
                ? (inspectDraft.body?.fr || inspectDraft.body?.en) 
                : (inspectDraft.body?.en || inspectDraft.body?.fr)}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
              {onEditArticle && (
                <button
                  onClick={() => {
                    onEditArticle(inspectDraft);
                    setInspectDraft(null);
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {isFr ? 'Modifier dans l\'éditeur principal' : 'Open in full editor'}
                </button>
              )}

              <button
                onClick={() => {
                  handlePublishDraft(inspectDraft);
                }}
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
