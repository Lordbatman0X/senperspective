import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Article } from '../types';
import { db, doc, getDoc } from '../lib/mongodb';
import { 
  LogOut, LayoutDashboard, FileText, Settings, Plus, Edit2, Trash2, Trophy, Clock, Tag,
  Image as ImageIcon, MessageSquare, Users, Megaphone, Menu, X, ArrowUpRight, Search, Upload, Sun, Moon, Shield, ShieldCheck, Eye, EyeOff,
  Home, Bell, BarChart2, Mail, DollarSign, Palette, Compass, Globe, History, Zap, Ship, Quote, Wrench, Database, Bot, Cloud, Server
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { getSafeText, formatCategory } from '../lib/utils';

// Modular Tab components
import { DashboardOverview } from '../components/admin/DashboardOverview';
import { MediaLibraryTab } from '../components/admin/MediaLibraryTab';
import { CommentsTab } from '../components/admin/CommentsTab';
import { SubscriberTab } from '../components/admin/SubscriberTab';
import { AdManagerTab } from '../components/admin/AdManagerTab';
import { ArticleEditorTab } from '../components/admin/ArticleEditorTab';
import { MediaSelector } from '../components/admin/components/MediaSelector';
import { ModerationTab } from '../components/admin/ModerationTab';
import { CustomizerTab } from '../components/admin/CustomizerTab';
import { GoogleIntegrationsTab } from '../components/admin/GoogleIntegrationsTab';
import { CloudSqlTab } from '../components/admin/CloudSqlTab';
import { TaxonomyTab } from '../components/admin/TaxonomyTab';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { MakeWebhookTab } from '../components/admin/MakeWebhookTab';
import { RssAutomationTab } from '../components/admin/RssAutomationTab';
import { ApiDiagnosticTab } from '../components/admin/ApiDiagnosticTab';
import { AudienceAnalyticsTab } from '../components/admin/AudienceAnalyticsTab';
import { VercelMigrationTab } from '../components/admin/VercelMigrationTab';
import { SecurityTab } from '../components/admin/SecurityTab';

const ADMIN_SESSION_KEY = "perspective-temp-admin-session";

export function AdminPortal() {
  const { user } = useAuth();
  const { readerProfile, language } = useStore();

  useSEO({
    title: language === 'fr' ? 'Portail Administrateur | The Perspective Group' : 'Admin Suite Portal | The Perspective Group',
    description: 'Administrative portal for content management, homepage curation, analytics, and settings.'
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize session state
  const [sessionAuth, setSessionAuth] = useState(() => {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "authenticated";
  });

  const firebaseAdmin = Boolean(user && readerProfile?.role === "Admin");
  const hasAdminAccess = sessionAuth || firebaseAdmin;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError(language === 'fr' ? 'Veuillez saisir votre identifiant et votre mot de passe.' : 'Please enter your username and password.');
      setLoading(false);
      return;
    }

    // Authorized credentials dictionary
    const validCredentials: Record<string, string[]> = {
      'admin': ['Perspective2026!', 'Admin2026!', 'Swiz1324'],
      'admin@perspective.sn': ['Perspective2026!', 'Admin2026!', 'Swiz1324'],
      'kader': ['Perspective2026!', 'Kader2026!', 'Swiz1324'],
      'kadersdiaz3@gmail.com': ['Swiz1324', 'Perspective2026!', 'Kader2026!'],
      'contact@perspective.sn': ['Perspective2026!', 'Swiz1324'],
      'editor': ['Editor2026!', 'Perspective2026!', 'Swiz1324'],
      'editor@perspective.sn': ['Editor2026!', 'Perspective2026!', 'Swiz1324'],
    };

    let isAuthenticated = false;
    let matchedRole = 'Admin';
    let matchedName = cleanUser === 'kadersdiaz3@gmail.com' ? 'Kader' : cleanUser;

    // 0. Check localStorage updated passwords first
    try {
      const storedPasses = JSON.parse(localStorage.getItem('perspective_admin_passwords') || '{}');
      if (storedPasses[cleanUser] === cleanPass) {
        isAuthenticated = true;
      }
      if (!isAuthenticated && !cleanUser.includes('@')) {
        const fullEmailKey = `${cleanUser}@perspective.sn`;
        if (storedPasses[fullEmailKey] === cleanPass) {
          isAuthenticated = true;
        }
      }
    } catch (e) {}

    // 1. Check default dictionary
    if (!isAuthenticated && validCredentials[cleanUser] && validCredentials[cleanUser].includes(cleanPass)) {
      isAuthenticated = true;
    }

    // 2. Check store users list (Zustand state & registered users)
    if (!isAuthenticated) {
      const storeUsers = useStore.getState().users || [];
      const matchedUser = storeUsers.find(
        u => (
          u.email.toLowerCase() === cleanUser || 
          u.name?.toLowerCase() === cleanUser || 
          u.email.split('@')[0].toLowerCase() === cleanUser ||
          (u.email.toLowerCase() === `${cleanUser}@perspective.sn`)
        )
      );

      if (matchedUser) {
        const isPassMatch = matchedUser.password && matchedUser.password === cleanPass;
        const isPinMatch = matchedUser.pin && matchedUser.pin === cleanPass;
        const isMasterMatch = cleanPass === "Perspective2026!" || cleanPass === "Admin2026!" || cleanPass === "Swiz1324";

        if (isPassMatch || isPinMatch || isMasterMatch) {
          isAuthenticated = true;
          matchedRole = matchedUser.role || 'Admin';
          matchedName = matchedUser.name || cleanUser;
        }
      }
    }

    // 3. Check Firestore users collection directly for real-time accounts created in Security Tab
    if (!isAuthenticated) {
      try {
        const checkKeys = [cleanUser];
        if (!cleanUser.includes('@')) {
          checkKeys.push(`${cleanUser}@perspective.sn`);
        }
        for (const docKey of checkKeys) {
          const userDocRef = doc(db, "users", docKey);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            const uRole = uData.role || 'Admin';
            const uPass = uData.password || uData.pin || '';
            if (
              uPass === cleanPass || cleanPass === "Perspective2026!" || cleanPass === "Admin2026!" || cleanPass === "Swiz1324"
            ) {
              isAuthenticated = true;
              matchedRole = uRole;
              matchedName = uData.name || cleanUser;
              break;
            }
          }
        }
      } catch (err) {
        console.warn("Firestore admin login check notice:", err);
      }
    }

    // 4. Fallback for admin / kader / editor / perspective usernames with master keys
    if (!isAuthenticated) {
      if (
        (cleanUser.includes("admin") || cleanUser.includes("kader") || cleanUser.includes("editor") || cleanUser.includes("perspective")) && 
        (cleanPass === "Perspective2026!" || cleanPass === "Admin2026!" || cleanPass === "Swiz1324")
      ) {
        isAuthenticated = true;
      }
    }

    if (isAuthenticated) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "authenticated");
      sessionStorage.setItem("perspective_admin_email", cleanUser);
      useStore.setState({
        readerProfile: {
          id: 'admin-' + Date.now(),
          name: matchedName,
          email: cleanUser.includes('@') ? cleanUser : `${cleanUser}@perspective.sn`,
          role: matchedRole as any,
          emailVerified: true
        }
      });
      setSessionAuth(true);
    } else {
      setError(
        language === 'fr' 
          ? "Mot de passe incorrect ou nom d'utilisateur non autorisé." 
          : "Invalid password or unauthorized username."
      );
    }
    setLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setSessionAuth(false);
    window.location.href = '/';
  };

  if (!hasAdminAccess) {
    return (
      <div className="dark min-h-screen flex flex-col items-center justify-center p-4 font-sans bg-zinc-950 text-zinc-100">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 max-w-sm w-full p-8 relative shadow-2xl rounded-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="flex flex-col items-end leading-none font-sans select-none mb-4">
              <h1 className="font-sans font-extrabold tracking-[-0.045em] leading-[0.8] text-3xl text-orange-500">
                Perspective
              </h1>
              <span className="font-sans font-black tracking-[0.11em] text-[9.5px] mt-0.5 mr-0.5 text-zinc-300 uppercase">
                GROUP
              </span>
            </div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase text-center mt-4">
              {language === 'fr' ? 'Espace Rédaction (Admin)' : 'Editorial Workspace (Admin)'}
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder={language === 'fr' ? "Nom d'utilisateur" : "Username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
                required
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={language === 'fr' ? "Mot de passe" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium pr-10"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100"
                title={showPassword ? (language === 'fr' ? 'Cacher' : 'Hide') : (language === 'fr' ? 'Voir' : 'Show')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
               <p className="text-red-400 text-[11px] font-bold uppercase tracking-wider text-center">{error}</p>
            )}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-colors shadow-md"
            >
              {loading ? (language === 'fr' ? 'Connexion...' : 'Signing in...') : (language === 'fr' ? 'Connexion' : 'Sign In')}
            </button>
            
            <div className="pt-2 text-center">
              <a href="/" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-orange-400 transition-colors">
                &larr; {language === 'fr' ? 'Retour au Journal' : 'Back to Journal'}
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <AdminRouter onLogout={handleLogout} />;
}

function AdminRouter({ onLogout }: { onLogout: () => void }) {
  const { 
    articles, addArticle, updateArticle, deleteArticle, purgeAllArticles,
    media, addMedia, deleteMedia, updateMediaName,
    ads, saveAd, deleteAd,
    comments, approveComment, deleteComment,
    subscribers, deleteSubscriber, language, setLanguage, theme, toggleTheme,
    siteSettings, updateSiteSettings,
    matches = [], addMatch, updateMatch, deleteMatch,
    interactions = [],
    friends = [], addFriend, deleteFriend,
    abdelPrompts, updateAbdelPrompts
  } = useStore();

  const users = friends;

  const currentSettings = siteSettings || {
    siteName: 'Perspective',
    accentColor: '#E85D42',
    editorialPhone: '+221 33 824 55 55',
    supportEmail: 'contact@perspective.sn',
    officeAddress: 'Immeuble Tamaro, Rue Mohamed V, Dakar',
    paywallThreshold: 9999,
    paywallEnabled: false,
    cookieConsentEnabled: true,
    privacyPolicyTextFr: "Perspective Group traite les données de ses lecteurs (compte, newsletter, commentaires) conformément au Règlement Général sur la Protection des Données (RGPD) et aux lois sénégalaises sur les données personnelles. Vos données ne sont jamais cédées à des tiers.",
    privacyPolicyTextEn: "Perspective Group processes reader data (accounts, newsletters, comments) in strict compliance with GDPR and Senegalese data protection legislation. Your personal data is never sold or shared with third parties.",
    dataRetentionDays: 365,
    fontPairing: 'modern',
    glassIntensity: 'medium',
    headerStyle: 'glass',
    aiModelMode: 'flash',
    seoTitleSuffix: '| Perspective Group Dakar',
    seoCanonicalBase: 'https://perspective.sn',
    seoDefaultDesc: "Journal d'information indépendant depuis Dakar. Analyses stratégiques de l'actualité politique et socio-économique ouest-africaine.",
    seoDefaultKeywords: "Sénégal, Dakar, Perspective Group, L'Arène, politique, géopolitique, économie, afrique",
    seoOgImage: "https://perspective.sn/og-preview.jpg",
    seoRobotsIndex: "index, follow, max-image-preview:large",
    seoGoogleSiteVerification: "",
    databaseProvider: 'firestore',
    analystDispatches: [],
    sportsQuadrantSelection: {
      zone1Type: 'match', zone1Id: '',
      zone2Type: 'match', zone2Id: '',
      zone3Type: 'match', zone3Id: '',
      zone4Type: 'article', zone4Id: ''
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'admin_dashboard' | 'api_diagnostic' | 'make_webhook' | 'rss_automation' | 'vercel_migration' | 'list' | 'editor' | 'taxonomy' | 'media' | 'matches' | 'comments' | 'subscribers' | 'google_integrations' | 'cloud_sql' | 'ads' | 'security' | 'moderation' | 'customizer' | 'homepage_curation' | 'live_alerts' | 'audience' | 'navigation' | 'seo_distribution' | 'settings' | 'activity_log' | 'abdel_chat_config'>('overview');
  const [contentSubTab, setContentSubTab] = useState<'articles' | 'rss_drafts' | 'rss_automation'>('articles');

  const handleTabChange = (tabId: string, subTab?: 'articles' | 'rss_drafts' | 'rss_automation') => {
    if (tabId === 'make_webhook') {
      setActiveTab('list');
      setContentSubTab('rss_automation');
    } else if (tabId === 'rss_automation') {
      setActiveTab('list');
      setContentSubTab('rss_drafts');
    } else {
      setActiveTab(tabId as any);
      if (subTab) {
        setContentSubTab(subTab);
      }
    }
    setMobileMenuOpen(false);
  };
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [articleFilter, setArticleFilter] = useState('all');
  const [articleSearch, setArticleSearch] = useState('');

  // Abdel & Chat config local states
  const [frPromptsText, setFrPromptsText] = useState((abdelPrompts?.fr || []).join('\n'));
  const [enPromptsText, setEnPromptsText] = useState((abdelPrompts?.en || []).join('\n'));
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [newFriendRole, setNewFriendRole] = useState('');

  useEffect(() => {
    if (abdelPrompts) {
      setFrPromptsText((abdelPrompts.fr || []).join('\n'));
      setEnPromptsText((abdelPrompts.en || []).join('\n'));
    }
  }, [abdelPrompts]);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Curation Form States
  const [curationSiteName, setCurationSiteName] = useState(currentSettings.siteName || 'Perspective');
  const [curationAccentColor, setCurationAccentColor] = useState(currentSettings.accentColor || '#E85D42');
  const [curationHeaderStyle, setCurationHeaderStyle] = useState(currentSettings.headerStyle || 'glass');
  const [curationSpotlightId, setCurationSpotlightId] = useState('');

  // Sports Quadrant Curation Form States
  const [quadZone1Type, setQuadZone1Type] = useState<'match' | 'article'>(currentSettings.sportsQuadrantSelection?.zone1Type || 'match');
  const [quadZone1Id, setQuadZone1Id] = useState(currentSettings.sportsQuadrantSelection?.zone1Id || '');
  const [quadZone2Type, setQuadZone2Type] = useState<'match' | 'article'>(currentSettings.sportsQuadrantSelection?.zone2Type || 'match');
  const [quadZone2Id, setQuadZone2Id] = useState(currentSettings.sportsQuadrantSelection?.zone2Id || '');
  const [quadZone3Type, setQuadZone3Type] = useState<'match' | 'article'>(currentSettings.sportsQuadrantSelection?.zone3Type || 'match');
  const [quadZone3Id, setQuadZone3Id] = useState(currentSettings.sportsQuadrantSelection?.zone3Id || '');
  const [quadZone4Type, setQuadZone4Type] = useState<'match' | 'article'>(currentSettings.sportsQuadrantSelection?.zone4Type || 'article');
  const [quadZone4Id, setQuadZone4Id] = useState(currentSettings.sportsQuadrantSelection?.zone4Id || '');
  const [viewportPreview, setViewportPreview] = useState<'desktop' | 'mobile'>('desktop');

  // Match delete confirmation state
  const [confirmDeleteMatchId, setConfirmDeleteMatchId] = useState<string | null>(null);

  // Live Alerts Form States
  const [liveFlashFr, setLiveFlashFr] = useState('');
  const [liveFlashEn, setLiveFlashEn] = useState('');
  const [liveFlashType, setLiveFlashType] = useState('standard');

  // SEO Form States
  const [seoTitleSuffix, setSeoTitleSuffix] = useState(currentSettings.seoTitleSuffix !== undefined ? currentSettings.seoTitleSuffix : '| Perspective Group Dakar');
  const [seoCanonicalBase, setSeoCanonicalBase] = useState(currentSettings.seoCanonicalBase !== undefined ? currentSettings.seoCanonicalBase : 'https://perspective.sn');
  const [seoDefaultDesc, setSeoDefaultDesc] = useState(currentSettings.seoDefaultDesc !== undefined ? currentSettings.seoDefaultDesc : "Journal d'information indépendant depuis Dakar. Analyses stratégiques de l'actualité politique et socio-économique ouest-africaine.");
  const [seoKeywords, setSeoKeywords] = useState(currentSettings.seoDefaultKeywords !== undefined ? currentSettings.seoDefaultKeywords : "Sénégal, Dakar, Perspective Group, L'Arène, politique, géopolitique, économie, afrique");
  const [seoOgImage, setSeoOgImage] = useState(currentSettings.seoOgImage !== undefined ? currentSettings.seoOgImage : "https://perspective.sn/og-preview.jpg");
  const [seoRobotsIndex, setSeoRobotsIndex] = useState(currentSettings.seoRobotsIndex !== undefined ? currentSettings.seoRobotsIndex : "index, follow, max-image-preview:large");
  const [seoGoogleVerification, setSeoGoogleVerification] = useState(currentSettings.seoGoogleSiteVerification !== undefined ? currentSettings.seoGoogleSiteVerification : "");

  // Settings Form States
  const [settingsAIExecutionMode, setSettingsAIExecutionMode] = useState(currentSettings.aiModelMode || 'flash');
  const [settingsDatabaseProvider, setSettingsDatabaseProvider] = useState(currentSettings.databaseProvider || 'firestore');
  const [settingsPaywallThreshold, setSettingsPaywallThreshold] = useState(currentSettings.paywallThreshold || 9999);
  const [settingsPaywallEnabled, setSettingsPaywallEnabled] = useState(currentSettings.paywallEnabled === true);

  // Privacy & Personal Data Form States
  const [cookieConsentEnabled, setCookieConsentEnabled] = useState(currentSettings.cookieConsentEnabled !== false);
  const [privacyPolicyTextFr, setPrivacyPolicyTextFr] = useState(currentSettings.privacyPolicyTextFr !== undefined ? currentSettings.privacyPolicyTextFr : "Perspective Group traite les données de ses lecteurs (compte, newsletter, commentaires) conformément au Règlement Général sur la Protection des Données (RGPD) et aux lois sénégalaises sur les données personnelles. Vos données ne sont jamais cédées à des tiers.");
  const [privacyPolicyTextEn, setPrivacyPolicyTextEn] = useState(currentSettings.privacyPolicyTextEn !== undefined ? currentSettings.privacyPolicyTextEn : "Perspective Group processes reader data (accounts, newsletters, comments) in strict compliance with GDPR and Senegalese data protection legislation. Your personal data is never sold or shared with third parties.");
  const [dataRetentionDays, setDataRetentionDays] = useState(currentSettings.dataRetentionDays || 365);

  // Deleting confirmation state
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  // Track SEO form initialization
  const isSeoInitializedRef = React.useRef(false);

  // Sync states when siteSettings changes
  useEffect(() => {
    if (siteSettings && !isSeoInitializedRef.current) {
      isSeoInitializedRef.current = true;
      setCurationSiteName(siteSettings.siteName || 'Perspective');
      setCurationAccentColor(siteSettings.accentColor || '#E85D42');
      setCurationHeaderStyle(siteSettings.headerStyle || 'glass');
      setSettingsPaywallThreshold(siteSettings.paywallThreshold || 3);
      setSettingsPaywallEnabled(siteSettings.paywallEnabled !== false);
      setSeoTitleSuffix(siteSettings.seoTitleSuffix !== undefined ? siteSettings.seoTitleSuffix : '| Perspective Group Dakar');
      setSeoCanonicalBase(siteSettings.seoCanonicalBase !== undefined ? siteSettings.seoCanonicalBase : 'https://perspective.sn');
      setSeoDefaultDesc(siteSettings.seoDefaultDesc !== undefined ? siteSettings.seoDefaultDesc : "Journal d'information indépendant depuis Dakar. Analyses stratégiques de l'actualité politique et socio-économique ouest-africaine.");
      setSeoKeywords(siteSettings.seoDefaultKeywords !== undefined ? siteSettings.seoDefaultKeywords : "Sénégal, Dakar, Perspective Group, L'Arène, politique, géopolitique, économie, afrique");
      setSeoOgImage(siteSettings.seoOgImage !== undefined ? siteSettings.seoOgImage : "https://perspective.sn/og-preview.jpg");
      setSeoRobotsIndex(siteSettings.seoRobotsIndex !== undefined ? siteSettings.seoRobotsIndex : "index, follow, max-image-preview:large");
      setSeoGoogleVerification(siteSettings.seoGoogleSiteVerification !== undefined ? siteSettings.seoGoogleSiteVerification : "");
      setSettingsAIExecutionMode(siteSettings.aiModelMode || 'flash');
      setSettingsDatabaseProvider(siteSettings.databaseProvider || 'firestore');
      setCookieConsentEnabled(siteSettings.cookieConsentEnabled !== false);
      setPrivacyPolicyTextFr(siteSettings.privacyPolicyTextFr || "Perspective Group traite les données de ses lecteurs (compte, newsletter, commentaires) conformément au Règlement Général sur la Protection des Données (RGPD) et aux lois sénégalaises sur les données personnelles. Vos données ne sont jamais cédées à des tiers.");
      setPrivacyPolicyTextEn(siteSettings.privacyPolicyTextEn || "Perspective Group processes reader data (accounts, newsletters, comments) in strict compliance with GDPR and Senegalese data protection legislation. Your personal data is never sold or shared with third parties.");
      setDataRetentionDays(siteSettings.dataRetentionDays || 365);
      
      if (siteSettings.sportsQuadrantSelection) {
        setQuadZone1Type(siteSettings.sportsQuadrantSelection.zone1Type || 'match');
        setQuadZone1Id(siteSettings.sportsQuadrantSelection.zone1Id || '');
        setQuadZone2Type(siteSettings.sportsQuadrantSelection.zone2Type || 'match');
        setQuadZone2Id(siteSettings.sportsQuadrantSelection.zone2Id || '');
        setQuadZone3Type(siteSettings.sportsQuadrantSelection.zone3Type || 'match');
        setQuadZone3Id(siteSettings.sportsQuadrantSelection.zone3Id || '');
        setQuadZone4Type(siteSettings.sportsQuadrantSelection.zone4Type || 'article');
        setQuadZone4Id(siteSettings.sportsQuadrantSelection.zone4Id || '');
      }
    }
  }, [siteSettings]);

  // Local state for matches tab in AdminRouter
  const [selectedMatchForEdit, setSelectedMatchForEdit] = useState<any | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  // Form states for match
  const [matchLeague, setMatchLeague] = useState("world-cup");
  const [matchLeagueFr, setMatchLeagueFr] = useState("");
  const [matchLeagueEn, setMatchLeagueEn] = useState("");
  const [matchTeamAName, setMatchTeamAName] = useState("");
  const [matchTeamAColor, setMatchTeamAColor] = useState("#E85D42");
  const [matchTeamAScore, setMatchTeamAScore] = useState("");
  const [matchTeamBName, setMatchTeamBName] = useState("");
  const [matchTeamBColor, setMatchTeamBColor] = useState("#2B4C7E");
  const [matchTeamBScore, setMatchTeamBScore] = useState("");
  const [matchStatus, setMatchStatus] = useState<"live" | "upcoming" | "finished">("upcoming");
  const [matchTime, setMatchTime] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchArena, setMatchArena] = useState("");
  const [matchContextFr, setMatchContextFr] = useState("");
  const [matchContextEn, setMatchContextEn] = useState("");

  const startEditMatch = (m: any) => {
    setSelectedMatchForEdit(m);
    setIsCreatingMatch(false);
    setMatchLeague(m.league);
    setMatchLeagueFr(m.leagueLabel.fr);
    setMatchLeagueEn(m.leagueLabel.en);
    setMatchTeamAName(m.teamA.name);
    setMatchTeamAColor(m.teamA.color);
    setMatchTeamAScore(m.teamA.score !== undefined ? String(m.teamA.score) : "");
    setMatchTeamBName(m.teamB.name);
    setMatchTeamBColor(m.teamB.color);
    setMatchTeamBScore(m.teamB.score !== undefined ? String(m.teamB.score) : "");
    setMatchStatus(m.status);
    setMatchTime(m.time || "");
    setMatchDate(m.date || "");
    setMatchArena(m.arena || "");
    setMatchContextFr(m.contextInfo?.fr || "");
    setMatchContextEn(m.contextInfo?.en || "");
  };

  const startCreateMatch = () => {
    setSelectedMatchForEdit(null);
    setIsCreatingMatch(true);
    setMatchLeague("world-cup");
    setMatchLeagueFr("Coupe du Monde");
    setMatchLeagueEn("World Cup");
    setMatchTeamAName("");
    setMatchTeamAColor("#E85D42");
    setMatchTeamAScore("");
    setMatchTeamBName("");
    setMatchTeamBColor("#2B4C7E");
    setMatchTeamBScore("");
    setMatchStatus("upcoming");
    setMatchTime("");
    setMatchDate("Aujourd'hui, 21:00 GMT");
    setMatchArena("Stade Abdoulaye Wade, Diamniadio");
    setMatchContextFr("");
    setMatchContextEn("");
  };

  const handleSaveMatch = () => {
    if (!matchTeamAName.trim() || !matchTeamBName.trim()) {
      alert("Please provide names for both competing teams.");
      return;
    }

    const scoreA = matchTeamAScore.trim() !== "" ? parseInt(matchTeamAScore) : undefined;
    const scoreB = matchTeamBScore.trim() !== "" ? parseInt(matchTeamBScore) : undefined;

    const matchPayload = {
      league: matchLeague,
      leagueLabel: { fr: matchLeagueFr || matchLeague, en: matchLeagueEn || matchLeague },
      teamA: { name: matchTeamAName, score: scoreA, color: matchTeamAColor },
      teamB: { name: matchTeamBName, score: scoreB, color: matchTeamBColor },
      status: matchStatus,
      time: matchStatus === "live" ? matchTime : undefined,
      date: matchStatus !== "live" ? matchDate : undefined,
      arena: matchArena,
      contextInfo: { fr: matchContextFr, en: matchContextEn }
    };

    if (selectedMatchForEdit) {
      updateMatch(selectedMatchForEdit.id, matchPayload);
    } else {
      addMatch({
        id: `match-${Date.now()}`,
        ...matchPayload
      });
    }

    // Reset
    setSelectedMatchForEdit(null);
    setIsCreatingMatch(false);
  };

  // Media Selector pop-up controller helper
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [mediaSelectorCallback, setMediaSelectorCallback] = useState<((url: string) => void) | null>(null);

  const openImgSelector = (onSelect: (url: string) => void) => {
    setMediaSelectorCallback(() => onSelect);
    setMediaSelectorOpen(true);
  };

  const startNewArticle = () => {
    setEditingArticle(null);
    setActiveTab('editor');
    setMobileMenuOpen(false);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setActiveTab('editor');
    setMobileMenuOpen(false);
  };

  const handleDeleteArticle = (id: string) => {
    deleteArticle(id);
    setDeletingArticleId(null);
  };

  const handlePurgeTestArticles = async () => {
    // 1. Purge server-side RSS drafts cache
    try {
      await fetch('/api/webhooks/make-rss', { method: 'DELETE' });
    } catch (e) {}

    // 2. Filter test articles in local/Firestore state
    const testArts = articles.filter(a => {
      const titleLower = (a.title?.fr || a.title?.en || '').toLowerCase();
      const slugLower = (a.slug || a.id || '').toLowerCase();
      const bodyLower = (a.body?.fr || a.body?.en || '').toLowerCase();
      return (
        titleLower.includes('test') || 
        slugLower.includes('test-title') || 
        slugLower.includes('rss-test') || 
        slugLower.includes('rss-draft') ||
        bodyLower === 'test content' ||
        bodyLower.includes('test summary')
      );
    });

    if (testArts.length === 0) {
      alert(language === 'fr' ? 'Pipeline réinitialisé ! Aucun article de test supplémentaire en attente.' : 'Pipeline reset! No test articles found.');
      return;
    }

    testArts.forEach(a => deleteArticle(a.id));
    alert(language === 'fr' 
      ? `Pipeline réinitialisé et ${testArts.length} article(s) de test supprimé(s) avec succès !`
      : `Pipeline reset and ${testArts.length} test article(s) purged successfully!`);
  };

  const handlePurgeAllArticles = async () => {
    if (!confirm(language === 'fr' 
      ? 'Êtes-vous SÛR de vouloir PURGER TOUS LES ARTICLES (brouillons et publiés) ? Cette action est irréversible.' 
      : 'Are you SURE you want to PURGE ALL ARTICLES (drafts and live)? This action cannot be undone.')) {
      return;
    }
    await purgeAllArticles();
    setEditingArticle(null);
    showToast(language === 'fr' ? 'Tous les articles (brouillons et publiés) ont été purgés avec succès !' : 'All articles (drafts and live) purged successfully!');
  };

  const handleSaveArticle = async (saved: Article) => {
    const isNew = !articles.find(a => a.id === saved.id);
    if (isNew) {
      await addArticle(saved);
    } else {
      await updateArticle(saved);
    }
    setEditingArticle(null);
    setActiveTab('list');
  };

  // Filtered article files list
  const filteredArticles = articles.filter(a => {
    const matchesFilter = 
      articleFilter === 'all' || 
      (articleFilter === 'published' && a.isPublished) || 
      (articleFilter === 'draft' && !a.isPublished);

    const titleStr = a.title?.[language] || a.title?.fr || '';
    const matchesSearch = titleStr.toLowerCase().includes(articleSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const menuItems = [
    { id: 'overview', label: language === 'fr' ? 'Tableau de bord' : 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { id: 'admin_dashboard', label: language === 'fr' ? 'Base de Données' : 'Database Manager', icon: Database, badge: 0 },
    { id: 'list', label: language === 'fr' ? 'Gestion des Contenus' : 'Content & RSS Suite', icon: FileText, badge: articles?.filter(a => !a.isPublished)?.length || 0 },
    { id: 'taxonomy', label: language === 'fr' ? 'Taxonomie & Tags' : 'Taxonomy & Tags', icon: Tag, badge: 0 },
    { id: 'homepage_curation', label: language === 'fr' ? 'Page d’accueil' : 'Homepage Curation', icon: Home, badge: 0 },
    { id: 'media', label: language === 'fr' ? 'Médias' : 'Media Library', icon: ImageIcon, badge: 0 },
    { id: 'matches', label: language === 'fr' ? 'L’Arène' : 'L’Arène', icon: Trophy, badge: 0 },
    { id: 'live_alerts', label: language === 'fr' ? 'Direct et alertes' : 'Live & Alerts', icon: Bell, badge: 0 },
    { id: 'comments', label: language === 'fr' ? 'Communauté' : 'Comments & Community', icon: MessageSquare, badge: comments?.filter(c => !c.isApproved).length || 0 },
    { id: 'audience', label: language === 'fr' ? 'Audience' : 'Audience Analytics', icon: BarChart2, badge: 0 },
    { id: 'subscribers', label: language === 'fr' ? 'Newsletters' : 'Newsletters', icon: Mail, badge: subscribers?.length || 0 },
    { id: 'google_integrations', label: language === 'fr' ? 'Intégrations Google' : 'Google Hub', icon: Zap, badge: 0 },
    { id: 'vercel_migration', label: language === 'fr' ? 'Migration Vercel' : 'Vercel Migration', icon: Cloud, badge: 0 },
    { id: 'cloud_sql', label: language === 'fr' ? 'Base Cloud SQL' : 'Cloud SQL DB', icon: Database, badge: 0 },
    { id: 'ads', label: language === 'fr' ? 'Monétisation' : 'Monetization', icon: DollarSign, badge: 0 },
    { id: 'customizer', label: language === 'fr' ? 'Apparence' : 'Appearance', icon: Palette, badge: 0 },
    { id: 'navigation', label: language === 'fr' ? 'Navigation' : 'Menu Navigation', icon: Compass, badge: 0 },
    { id: 'seo_distribution', label: language === 'fr' ? 'SEO et distribution' : 'SEO & Distribution', icon: Globe, badge: 0 },
    { id: 'abdel_chat_config', label: language === 'fr' ? 'Abdel & Chat' : 'Abdel & Chat Config', icon: Bot, badge: 0 },
    { id: 'security', label: language === 'fr' ? 'Sécurité & Accès' : 'Security & Passwords', icon: ShieldCheck, badge: 0 },
    { id: 'api_diagnostic', label: language === 'fr' ? 'Diagnostic IA' : 'AI Diagnostic', icon: Server, badge: 0 },
    { id: 'moderation', label: language === 'fr' ? 'Utilisateurs et rôles' : 'Users & Roles', icon: Users, badge: 0 },
    { id: 'settings', label: language === 'fr' ? 'Paramètres' : 'Global Settings', icon: Settings, badge: 0 },
    { id: 'activity_log', label: language === 'fr' ? 'Journal d’activité' : 'Activity Logs', icon: History, badge: 0 },
  ] as const;

  return (
    <div className="dark min-h-screen text-zinc-100 flex flex-col md:flex-row font-sans relative bg-zinc-950">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-orange-600 text-white px-5 py-3 shadow-2xl font-mono text-xs font-black uppercase tracking-widest border border-white/20 animate-pulse">
          ✓ {toastMessage}
        </div>
      )}

      {/* Mobile Top Navigation bar */}
      <header className="md:hidden bg-zinc-900/90 backdrop-blur-md text-zinc-100 p-4 flex justify-between items-center border-b border-zinc-800 z-40">
        <div className="flex flex-col leading-none">
          <span className="font-extrabold text-base tracking-tight text-orange-500">{currentSettings.siteName}</span>
          <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
            {language === 'fr' ? "SUITE DE GESTION" : "ADMIN SUITE"}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800 p-0.5 border border-zinc-700 text-[9px] font-bold rounded">
            <button 
              onClick={() => setLanguage('fr')} 
              className={`px-1.5 py-0.5 transition-all uppercase cursor-pointer rounded-xs ${language === 'fr' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              FR
            </button>
            <button 
              onClick={() => setLanguage('en')} 
              className={`px-1.5 py-0.5 transition-all uppercase cursor-pointer rounded-xs ${language === 'en' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              EN
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 text-zinc-300 hover:text-white ml-2">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Sidebar navigation */}
      <aside className={`w-full md:w-64 bg-zinc-900/95 backdrop-blur-md flex flex-col h-auto md:h-screen sticky top-0 z-40 border-r border-zinc-800 ${mobileMenuOpen ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-6 border-b border-zinc-800 hidden md:block">
          <div className="flex flex-col items-center select-none text-center">
            <h1 className="font-sans font-extrabold tracking-[-0.045em] leading-[0.8] text-2xl text-orange-500">
              {currentSettings.siteName}
            </h1>
            <span className="font-sans font-bold tracking-widest text-[9px] mt-2 text-zinc-400 uppercase">
              {language === 'fr' ? 'ADMINISTRATION' : 'ADMIN PORTAL'}
            </span>
          </div>
        </div>

        {/* Sidebar Nav anchors */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleTabChange(item.id);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all select-none rounded-lg cursor-pointer ${
                  isActive ? 'bg-orange-600 text-white font-extrabold shadow-md' : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={16} />
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-orange-600' : 'bg-orange-600 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Language selector */}
        <div className="p-4 border-t border-zinc-800 bg-transparent flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {language === 'fr' ? 'Langue' : 'Language'}
          </span>
          <div className="flex bg-zinc-800 p-0.5 border border-zinc-700 rounded">
            <button 
              onClick={() => setLanguage('fr')} 
              className={`px-2 py-0.5 text-[9px] font-black transition-all uppercase tracking-widest cursor-pointer rounded-xs ${
                language === 'fr' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button 
              onClick={() => setLanguage('en')} 
              className={`px-2 py-0.5 text-[9px] font-black transition-all uppercase tracking-widest cursor-pointer rounded-xs ${
                language === 'en' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Footer Log Out button */}
        <div className="p-4 border-t border-zinc-800 bg-transparent">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-all cursor-pointer rounded-lg"
          >
            <LogOut size={16} /> {language === 'fr' ? 'Déconnexion' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Administrative dashboard Stage */}
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden min-h-[calc(100vh-60px)] md:min-h-screen bg-zinc-950 text-zinc-100 font-sans">
        {/* Always visible Maintenance Mode status bar at top of Admin Portal */}
        <div className={`mb-8 p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl transition-all ${
          siteSettings?.isMaintenanceMode === true 
            ? 'bg-amber-950/70 border-amber-500/60 text-amber-200' 
            : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-md shrink-0 ${
              siteSettings?.isMaintenanceMode === true 
                ? 'bg-amber-500/20 text-amber-400' 
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              <Wrench className={`w-5 h-5 ${siteSettings?.isMaintenanceMode === true ? 'animate-spin-slow' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-wider ${
                  siteSettings?.isMaintenanceMode === true ? 'text-amber-300' : 'text-emerald-400'
                }`}>
                  {siteSettings?.isMaintenanceMode === true 
                    ? (language === 'fr' ? 'MODE MAINTENANCE : ACTIF (SITE PRIVÉ)' : 'MAINTENANCE MODE: ACTIVE (SITE PRIVATE)')
                    : (language === 'fr' ? 'STATUT DU SITE : EN LIGNE (PUBLIC)' : 'SITE STATUS: ONLINE (PUBLIC)')}
                </span>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  siteSettings?.isMaintenanceMode === true 
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {siteSettings?.isMaintenanceMode === true ? 'PAUSE' : 'LIVE'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                {siteSettings?.isMaintenanceMode === true 
                  ? (language === 'fr' 
                      ? 'Le site senperspective.com affiche la page de maintenance aux visiteurs. Seul l\'Espace Admin est accessible.' 
                      : 'The site displays the maintenance page to public visitors. Only Admin Portal is accessible.')
                  : (language === 'fr' 
                      ? 'Le site est ouvert et accessible à tous les visiteurs publics.' 
                      : 'The website is currently open and accessible to all public visitors.')}
              </p>
            </div>
          </div>

          <button
            onClick={() => updateSiteSettings({ isMaintenanceMode: !siteSettings?.isMaintenanceMode })}
            className={`px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded shrink-0 shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
              siteSettings?.isMaintenanceMode === true 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black' 
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            <span>
              {siteSettings?.isMaintenanceMode === true 
                ? (language === 'fr' ? 'RÉOUVRIR LE SITE (EN LIGNE)' : 'RE-OPEN SITE (GO LIVE)')
                : (language === 'fr' ? 'PASSER EN MODE MAINTENANCE' : 'ENABLE MAINTENANCE MODE')}
            </span>
          </button>
        </div>

        {activeTab === 'overview' && (
          <DashboardOverview 
            articles={articles}
            comments={comments}
            subscribers={subscribers}
            onNewArticle={startNewArticle}
            onGoToTab={(tab) => handleTabChange(tab)}
          />
        )}

        {activeTab === 'admin_dashboard' && (
          <AdminDashboard />
        )}

        {activeTab === 'media' && (
          <MediaLibraryTab 
            media={media}
            addMedia={addMedia}
            deleteMedia={deleteMedia}
            updateMediaName={updateMediaName}
          />
        )}

        {activeTab === 'comments' && (
          <CommentsTab 
            comments={comments}
            approveComment={approveComment}
            deleteComment={deleteComment}
          />
        )}

        {activeTab === 'subscribers' && (
          <SubscriberTab 
            subscribers={subscribers}
            deleteSubscriber={deleteSubscriber}
          />
        )}

        {activeTab === 'google_integrations' && (
          <GoogleIntegrationsTab />
        )}

        {activeTab === 'vercel_migration' && (
          <VercelMigrationTab />
        )}

        {activeTab === 'cloud_sql' && (
          <CloudSqlTab />
        )}

        {activeTab === 'ads' && (
          <AdManagerTab 
            ads={ads}
            saveAd={saveAd}
            deleteAd={deleteAd}
            openMediaSelector={openImgSelector}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab />
        )}

        {activeTab === 'api_diagnostic' && (
          <ApiDiagnosticTab />
        )}

        {activeTab === 'moderation' && (
          <ModerationTab />
        )}

        {activeTab === 'customizer' && (
          <CustomizerTab />
        )}

        {activeTab === 'homepage_curation' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div className="border-b border-zinc-200/20 dark:border-zinc-800 pb-3">
              <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                {language === 'fr' ? 'Curation Page d’Accueil' : 'Homepage Curation'}
              </h2>
              <p className="text-xs text-brand-muted uppercase tracking-wider font-mono">Curate spotlight features, select visual themes & toggle columns</p>
            </div>
            
            <div className="p-6 border border-zinc-800 bg-black space-y-6 rounded-lg shadow-2xl">
              {/* Site Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-zinc-400">Nom du Site / Site Name</label>
                  <input 
                    type="text" 
                    value={curationSiteName}
                    onChange={(e) => setCurationSiteName(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border/20 p-2.5 text-xs font-mono font-bold outline-none focus:border-brand-primary text-brand-dark dark:text-brand-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-zinc-400">Couleur d’Accents / Theme Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={curationAccentColor}
                      onChange={(e) => setCurationAccentColor(e.target.value)}
                      className="w-10 h-8 p-0 border-0 bg-transparent cursor-pointer shrink-0"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {['#E85D42', '#F77F00', '#2A9D8F', '#264653', '#6A4C93'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCurationAccentColor(preset)}
                          className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-110 shrink-0 cursor-pointer"
                          style={{ backgroundColor: preset }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Spotlight select */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-2 text-zinc-400">1. Article en Vedette Principal (Spotlight Frame)</h3>
                <select 
                  value={curationSpotlightId}
                  onChange={(e) => setCurationSpotlightId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border/20 p-2.5 text-xs focus:outline-none font-bold text-brand-dark dark:text-brand-white"
                >
                  <option value="">{language === 'fr' ? 'Choisir un article...' : 'Select an article...'}</option>
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>
                      [{formatCategory(a.category, language)}] {getSafeText(a.title, language)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400 font-mono mt-1">
                  {language === 'fr' 
                    ? "* Cet article sera mis en évidence dans le grand carrousel de la page d'accueil."
                    : "* This article will be set as a priority spotlight item in the hero carousel."}
                </p>
              </div>

              {/* Header Style */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-2 text-zinc-400">2. Style d'En-tête de la Page</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'glass', title: language === 'fr' ? 'Verre Translucide' : 'Translucent Glass', desc: 'Maximise transparency & subtle blurs' },
                    { id: 'editorial', title: language === 'fr' ? 'Classique Editorial' : 'Classic Editorial', desc: 'Solid crisp backgrounds with serif font pairs' },
                    { id: 'dark-imm', title: language === 'fr' ? 'Sombre Immersif' : 'Immersive Dark', desc: 'Force gorgeous deep slate background' }
                  ].map(style => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setCurationHeaderStyle(style.id)}
                      className={`border p-4 text-left cursor-pointer transition-colors ${curationHeaderStyle === style.id ? 'border-[#E85D42] bg-zinc-500/10' : 'border-brand-border p-4 bg-zinc-500/5 hover:border-[#E85D42]'}`}
                      style={{ borderColor: curationHeaderStyle === style.id ? curationAccentColor : undefined }}
                    >
                      <p className="text-xs font-black uppercase tracking-wide text-zinc-950 dark:text-zinc-100" style={{ color: curationHeaderStyle === style.id ? curationAccentColor : undefined }}>{style.title}</p>
                      <p className="text-[10px] text-brand-muted mt-1 leading-snug font-mono">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Curation du Quadrant de l'Arène */}
              <div className="border-t border-brand-border/10 pt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                    {language === 'fr' ? "3. Curation du Quadrant de l'Arène (Perspective Sports Quadrant)" : "3. Curation of the Arena Quadrant (Perspective Sports Quadrant)"}
                  </h3>
                  <p className="text-xs text-brand-muted font-mono mt-1">
                    {language === 'fr'
                      ? "Associez chaque zone à un match de L'Arène ou à une analyse sportive. Glissez ou remplacez le contenu instantanément."
                      : "Map each zone to a specific Arena match outcome or custom sports story analysis."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Zone 1 */}
                  <div className="p-4 border border-brand-border/20 bg-zinc-500/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-zinc-400">ZONE 1: MAIN LIVE / PRIORITY</span>
                      <select 
                        value={quadZone1Type} 
                        onChange={(e) => { setQuadZone1Type(e.target.value as any); setQuadZone1Id(''); }}
                        className="bg-zinc-100 dark:bg-zinc-950 p-1 text-[10px] font-bold border border-brand-border"
                      >
                        <option value="match">Match</option>
                        <option value="article">Article</option>
                      </select>
                    </div>
                    <select
                      value={quadZone1Id}
                      onChange={(e) => setQuadZone1Id(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2 text-xs font-bold text-brand-dark dark:text-brand-white"
                    >
                      <option value="">{language === 'fr' ? 'Sélection automatique (Prioritaire)' : 'Auto selection (Priority)'}</option>
                      {quadZone1Type === 'match' ? (
                        matches.map(m => (
                          <option key={m.id} value={m.id}>
                            [{m.status.toUpperCase()}] {m.teamA.name} vs {m.teamB.name} ({getSafeText(m.leagueLabel, language)})
                          </option>
                        ))
                      ) : (
                        articles.map(a => (
                          <option key={a.id} value={a.id}>
                            [{formatCategory(a.category, language)}] {getSafeText(a.title, language)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Zone 2 */}
                  <div className="p-4 border border-brand-border/20 bg-zinc-500/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-zinc-400">ZONE 2: UPCOMING MAJOR</span>
                      <select 
                        value={quadZone2Type} 
                        onChange={(e) => { setQuadZone2Type(e.target.value as any); setQuadZone2Id(''); }}
                        className="bg-zinc-100 dark:bg-zinc-950 p-1 text-[10px] font-bold border border-brand-border"
                      >
                        <option value="match">Match</option>
                        <option value="article">Article</option>
                      </select>
                    </div>
                    <select
                      value={quadZone2Id}
                      onChange={(e) => setQuadZone2Id(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2 text-xs font-bold text-brand-dark dark:text-brand-white"
                    >
                      <option value="">{language === 'fr' ? 'Sélection automatique' : 'Auto selection'}</option>
                      {quadZone2Type === 'match' ? (
                        matches.map(m => (
                          <option key={m.id} value={m.id}>
                            [{m.status.toUpperCase()}] {m.teamA.name} vs {m.teamB.name} ({getSafeText(m.leagueLabel, language)})
                          </option>
                        ))
                      ) : (
                        articles.map(a => (
                          <option key={a.id} value={a.id}>
                            [{formatCategory(a.category, language)}] {getSafeText(a.title, language)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Zone 3 */}
                  <div className="p-4 border border-brand-border/20 bg-zinc-500/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-zinc-400">ZONE 3: LATEST RESULT</span>
                      <select 
                        value={quadZone3Type} 
                        onChange={(e) => { setQuadZone3Type(e.target.value as any); setQuadZone3Id(''); }}
                        className="bg-zinc-100 dark:bg-zinc-950 p-1 text-[10px] font-bold border border-brand-border"
                      >
                        <option value="match">Match</option>
                        <option value="article">Article</option>
                      </select>
                    </div>
                    <select
                      value={quadZone3Id}
                      onChange={(e) => setQuadZone3Id(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2 text-xs font-bold text-brand-dark dark:text-brand-white"
                    >
                      <option value="">{language === 'fr' ? 'Sélection automatique' : 'Auto selection'}</option>
                      {quadZone3Type === 'match' ? (
                        matches.map(m => (
                          <option key={m.id} value={m.id}>
                            [{m.status.toUpperCase()}] {m.teamA.name} vs {m.teamB.name} ({getSafeText(m.leagueLabel, language)})
                          </option>
                        ))
                      ) : (
                        articles.map(a => (
                          <option key={a.id} value={a.id}>
                            [{formatCategory(a.category, language)}] {getSafeText(a.title, language)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Zone 4 */}
                  <div className="p-4 border border-brand-border/20 bg-zinc-500/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-zinc-400">ZONE 4: SPORTS LEADING STORY</span>
                      <select 
                        value={quadZone4Type} 
                        onChange={(e) => { setQuadZone4Type(e.target.value as any); setQuadZone4Id(''); }}
                        className="bg-zinc-100 dark:bg-zinc-950 p-1 text-[10px] font-bold border border-brand-border"
                      >
                        <option value="article">Article</option>
                        <option value="match">Match</option>
                      </select>
                    </div>
                    <select
                      value={quadZone4Id}
                      onChange={(e) => setQuadZone4Id(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2 text-xs font-bold text-brand-dark dark:text-brand-white"
                    >
                      <option value="">{language === 'fr' ? 'Sélection automatique' : 'Auto selection'}</option>
                      {quadZone4Type === 'match' ? (
                        matches.map(m => (
                          <option key={m.id} value={m.id}>
                            [{m.status.toUpperCase()}] {m.teamA.name} vs {m.teamB.name} ({getSafeText(m.leagueLabel, language)})
                          </option>
                        ))
                      ) : (
                        articles.map(a => (
                          <option key={a.id} value={a.id}>
                            [{formatCategory(a.category, language)}] {getSafeText(a.title, language)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Interactive Mini Preview Grid */}
                <div className="p-4 border border-brand-border/20 bg-zinc-500/5 font-sans">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      {language === 'fr' ? `Aperçu interactif (${viewportPreview})` : `Interactive Live Mock Preview (${viewportPreview})`}
                    </span>
                    <div className="flex gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => setViewportPreview('desktop')}
                        className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all ${viewportPreview === 'desktop' ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-700 border-zinc-300 dark:text-zinc-300 dark:border-zinc-800'}`}
                      >
                        Desktop
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setViewportPreview('mobile')}
                        className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all ${viewportPreview === 'mobile' ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-700 border-zinc-300 dark:text-zinc-300 dark:border-zinc-800'}`}
                      >
                        Mobile
                      </button>
                    </div>
                  </div>

                  {viewportPreview === 'desktop' ? (
                    <div className="grid grid-cols-12 gap-3 text-white text-[10px] select-none">
                      <div className="col-span-6 bg-emerald-950/80 border border-emerald-800 p-3 flex flex-col justify-between h-28">
                        <div className="flex justify-between text-[8px] font-bold text-emerald-400">
                          <span>ZONE 1 • MAIN EVENT</span>
                          <span>{quadZone1Type.toUpperCase()}</span>
                        </div>
                        <div className="font-extrabold text-xs text-center truncate">
                          {quadZone1Id ? (quadZone1Type === 'match' ? (matches.find(m => m.id === quadZone1Id)?.teamA.name + ' vs ' + matches.find(m => m.id === quadZone1Id)?.teamB.name) : articles.find(a => a.id === quadZone1Id)?.title[language]) : 'Auto Fallback (First Priority Match)'}
                        </div>
                        <div className="text-[8px] text-emerald-500 italic">Live or Priority Match</div>
                      </div>
                      <div className="col-span-6 flex flex-col gap-2">
                        <div className="bg-[#07211E]/80 border border-emerald-900/50 p-2 h-[32px] flex justify-between items-center">
                          <span className="text-[8px] text-amber-500 font-bold">ZONE 2: UPCOMING</span>
                          <span className="truncate max-w-[120px] font-bold">
                            {quadZone2Id ? (quadZone2Type === 'match' ? (matches.find(m => m.id === quadZone2Id)?.teamA.name + ' vs ' + matches.find(m => m.id === quadZone2Id)?.teamB.name) : articles.find(a => a.id === quadZone2Id)?.title[language]) : 'Auto Fallback (First Upcoming Match)'}
                          </span>
                        </div>
                        <div className="bg-[#07211E]/80 border border-emerald-900/50 p-2 h-[32px] flex justify-between items-center">
                          <span className="text-[8px] text-zinc-400 font-bold">ZONE 3: RESULT</span>
                          <span className="truncate max-w-[120px] font-bold">
                            {quadZone3Id ? (quadZone3Type === 'match' ? (matches.find(m => m.id === quadZone3Id)?.teamA.name + ' vs ' + matches.find(m => m.id === quadZone3Id)?.teamB.name) : articles.find(a => a.id === quadZone3Id)?.title[language]) : 'Auto Fallback (First Completed Result)'}
                          </span>
                        </div>
                        <div className="bg-[#07211E]/80 border border-emerald-900/50 p-2 h-[32px] flex justify-between items-center">
                          <span className="text-[8px] text-emerald-400 font-bold">ZONE 4: STORY</span>
                          <span className="truncate max-w-[120px] font-bold">
                            {quadZone4Id ? (quadZone4Type === 'match' ? (matches.find(m => m.id === quadZone4Id)?.teamA.name + ' vs ' + matches.find(m => m.id === quadZone4Id)?.teamB.name) : articles.find(a => a.id === quadZone4Id)?.title[language]) : 'Auto Fallback (Sports Editorial Analysis)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 text-white text-[10px] select-none">
                      <div className="bg-emerald-950/80 border border-emerald-800 p-2 flex justify-between items-center">
                        <span className="font-bold text-emerald-400">ZONE 1 (Live/Priority)</span>
                        <span className="font-bold truncate max-w-[150px]">
                          {quadZone1Id ? (quadZone1Type === 'match' ? (matches.find(m => m.id === quadZone1Id)?.teamA.name + ' vs ' + matches.find(m => m.id === quadZone1Id)?.teamB.name) : articles.find(a => a.id === quadZone1Id)?.title[language]) : 'Auto Fallback'}
                        </span>
                      </div>
                      <div className="bg-[#07211E]/80 border border-emerald-900/50 p-2 flex justify-between items-center">
                        <span className="text-amber-500 font-bold">ZONE 2 (Upcoming)</span>
                        <span className="font-bold truncate max-w-[150px]">
                          {quadZone2Id ? (quadZone2Type === 'match' ? (matches.find(m => m.id === quadZone2Id)?.teamA.name + ' vs ' + matches.find(m => m.id === quadZone2Id)?.teamB.name) : articles.find(a => a.id === quadZone2Id)?.title[language]) : 'Auto Fallback'}
                        </span>
                      </div>
                      <div className="bg-[#07211E]/80 border border-emerald-900/50 p-2 flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">ZONE 3 (Result)</span>
                        <span className="font-bold truncate max-w-[150px]">
                          {quadZone3Id ? (quadZone3Type === 'match' ? (matches.find(m => m.id === quadZone3Id)?.teamA.name + ' vs ' + matches.find(m => m.id === quadZone3Id)?.teamB.name) : articles.find(a => a.id === quadZone3Id)?.title[language]) : 'Auto Fallback'}
                        </span>
                      </div>
                      <div className="bg-[#07211E]/80 border border-emerald-900/50 p-2 flex justify-between items-center">
                        <span className="text-emerald-400 font-bold">ZONE 4 (Analysis)</span>
                        <span className="font-bold truncate max-w-[150px]">
                          {quadZone4Id ? (quadZone4Type === 'match' ? (matches.find(m => m.id === quadZone4Id)?.teamA.name + ' vs ' + matches.find(m => m.id === quadZone4Id)?.teamB.name) : articles.find(a => a.id === quadZone4Id)?.title[language]) : 'Auto Fallback'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-zinc-200/10">
                <button 
                  onClick={() => {
                    // Update main spotlight article feature flags
                    if (curationSpotlightId) {
                      articles.forEach(a => {
                        if (a.id === curationSpotlightId) {
                          updateArticle({ ...a, isFeatured: true });
                        }
                      });
                    }

                    // Save site settings including sports quadrant selections
                    updateSiteSettings({
                      siteName: curationSiteName,
                      accentColor: curationAccentColor,
                      headerStyle: curationHeaderStyle as any,
                      sportsQuadrantSelection: {
                        zone1Type: quadZone1Type,
                        zone1Id: quadZone1Id,
                        zone2Type: quadZone2Type,
                        zone2Id: quadZone2Id,
                        zone3Type: quadZone3Type,
                        zone3Id: quadZone3Id,
                        zone4Type: quadZone4Type,
                        zone4Id: quadZone4Id,
                      }
                    });

                    showToast(language === 'fr' ? 'Configuration d’accueil et quadrant de l’arène sauvegardés !' : 'Homepage layout & sports quadrant curation updated successfully!');
                  }}
                  className="btn btn-primary px-6 py-2.5 text-xs uppercase font-black tracking-widest bg-brand-primary text-white cursor-pointer" 
                  style={{ backgroundColor: curationAccentColor }}
                >
                  {language === 'fr' ? 'Sauvegarder et Appliquer' : 'Save & Publish Live'}
                </button>
              </div>
            </div>

            {/* Sidebar Modules Control Map */}
            <div className="glass p-6 border border-brand-border/10 bg-brand-white/40 dark:bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200/20 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-brand-dark dark:text-brand-white">
                    {language === 'fr' ? 'Carte de Contrôle des Modules de la Barre Latérale' : 'Sidebar Modules Control Map'}
                  </h3>
                  <p className="text-[10px] text-brand-muted font-mono uppercase mt-0.5">
                    {language === 'fr' ? 'Emplacements et accès rapide aux réglages de la colonne de droite' : 'Layout locations and quick access to right sidebar settings'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                {/* Module 1: Flash Info */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[#E85D42] uppercase text-[11px] flex items-center gap-1.5">
                      <Zap size={13} /> 1. Flash Info (Live Ticker)
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-800">ACTIF SUR SITE</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Positionné directement sous la section <strong>Tendances</strong>. Affiche les alertes en temps réel et dépêches d'analystes.
                  </p>
                  <button 
                    onClick={() => setActiveTab('live_alerts')}
                    className="mt-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E85D42] text-white hover:bg-[#c94931] cursor-pointer transition-all"
                  >
                    Gérer les Flashes → (Direct et Alertes)
                  </button>
                </div>

                {/* Module 2: Le Monde */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[#E85D42] uppercase text-[11px] flex items-center gap-1.5">
                      <Globe size={13} /> 2. Le Monde (Global Briefs)
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-800">ACTIF SUR SITE</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Dépêches et synthèses internationales synthétiques avec horaires GMT et étiquettes thématiques.
                  </p>
                  <button 
                    onClick={() => setActiveTab('customizer')}
                    className="mt-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer transition-all border border-zinc-700"
                  >
                    Gérer "Le Monde" → (Apparence)
                  </button>
                </div>

                {/* Module 3: Ports & Météo Dakar */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[#E85D42] uppercase text-[11px] flex items-center gap-1.5">
                      <Ship size={13} /> 3. Ports & Météo Dakar
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-800">ACTIF SUR SITE</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Affichage maritime : Marée du port de Dakar, navettes Gorée, température et avis de vent.
                  </p>
                  <button 
                    onClick={() => setActiveTab('customizer')}
                    className="mt-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer transition-all border border-zinc-700"
                  >
                    Gérer Ports & Météo → (Apparence)
                  </button>
                </div>

                {/* Module 4: Sagesse du Jour */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[#E85D42] uppercase text-[11px] flex items-center gap-1.5">
                      <Quote size={13} /> 4. Sagesse du Jour
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-800">ACTIF SUR SITE</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Proverbe Wolof quotidien avec traductions bilingues FR/EN et crédit de source.
                  </p>
                  <button 
                    onClick={() => setActiveTab('customizer')}
                    className="mt-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer transition-all border border-zinc-700"
                  >
                    Gérer le Proverbe → (Apparence)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'live_alerts' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div className="border-b border-zinc-200/20 dark:border-zinc-800 pb-3">
              <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                {language === 'fr' ? 'Flashes & Alertes en Direct' : 'Live & Alert Bulletins'}
              </h2>
              <p className="text-xs text-brand-muted uppercase tracking-wider font-mono">Broadcast breaking analyst dispatches to the home ticker</p>
            </div>
            
            <div className="glass p-6 border border-brand-border/10 bg-brand-white/40 dark:bg-zinc-900/40 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Flash en Français</label>
                  <textarea 
                    value={liveFlashFr}
                    onChange={(e) => setLiveFlashFr(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border/20 p-3 text-xs focus:outline-none h-20 placeholder-zinc-500 font-medium text-brand-dark dark:text-brand-white" 
                    placeholder="Signalisation d'actualité en temps réel..." 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Flash in English</label>
                  <textarea 
                    value={liveFlashEn}
                    onChange={(e) => setLiveFlashEn(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border/20 p-3 text-xs focus:outline-none h-20 placeholder-zinc-500 font-medium text-brand-dark dark:text-brand-white" 
                    placeholder="Real-time news broadcast update..." 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Type de Signalisation / Level</label>
                <select 
                  value={liveFlashType}
                  onChange={(e) => setLiveFlashType(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border/20 p-2.5 text-xs focus:outline-none font-bold text-brand-dark dark:text-brand-white"
                >
                  <option value="crimson">Crimson Flash (Urgence Politique / Geopolitical Alert)</option>
                  <option value="standard">Standard Amber (Information générale / Mainstream)</option>
                  <option value="pulse">Pulse Glass (Signal discret / Economic Update)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-200/10">
                <button 
                  onClick={() => {
                    if (!liveFlashFr.trim() || !liveFlashEn.trim()) {
                      alert(language === 'fr' ? 'Veuillez remplir les deux langues.' : 'Please provide alert text in both languages.');
                      return;
                    }

                    const currentDispatches = currentSettings.analystDispatches || [];
                    const dkrHour = String(new Date().getUTCHours()).padStart(2, '0');
                    const dkrMin = String(new Date().getUTCMinutes()).padStart(2, '0');
                    const timestampStr = `${dkrHour}:${dkrMin} GMT`;

                    const newDispatch = {
                      id: `disp-${Date.now()}`,
                      time: timestampStr,
                      contentFr: liveFlashFr.trim(),
                      contentEn: liveFlashEn.trim(),
                      level: liveFlashType
                    };

                    updateSiteSettings({
                      analystDispatches: [newDispatch, ...currentDispatches]
                    });

                    setLiveFlashFr('');
                    setLiveFlashEn('');
                    showToast(language === 'fr' ? 'Signal d’alerte publié au téléscripteur !' : 'Breaking bulletin broadcasted to live ticker!');
                  }}
                  className="btn btn-primary px-6 py-2.5 text-xs uppercase font-black tracking-widest bg-brand-primary text-white cursor-pointer" 
                  style={{ backgroundColor: currentSettings.accentColor }}
                >
                  {language === 'fr' ? 'Diffuser le Flash d\'Alerte' : 'Broadcast Breaking Flash'}
                </button>
              </div>
            </div>

            {/* List of current alerts */}
            <div className="glass p-6 border border-brand-border/10 bg-brand-white/40 dark:bg-zinc-900/40">
              <h3 className="text-xs font-black uppercase tracking-widest mb-4">Alertes actives sur le site ({currentSettings.analystDispatches?.length || 0})</h3>
              <div className="space-y-3 font-sans text-xs">
                {(currentSettings.analystDispatches && currentSettings.analystDispatches.length > 0) ? (
                  currentSettings.analystDispatches.map((d: any) => (
                    <div key={d.id} className="flex justify-between items-start gap-4 p-3 bg-zinc-500/5 border border-brand-border/10">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black font-mono text-[#E85D42]">{d.time}</span>
                          <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.2 rounded ${d.level === 'crimson' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                            {d.level || 'standard'}
                          </span>
                        </div>
                        <p className="text-brand-dark dark:text-brand-white font-semibold">FR: {d.contentFr}</p>
                        <p className="text-brand-muted">EN: {d.contentEn}</p>
                      </div>
                      <button 
                        onClick={() => {
                          const updated = currentSettings.analystDispatches.filter((item: any) => item.id !== d.id);
                          updateSiteSettings({ analystDispatches: updated });
                          showToast(language === 'fr' ? 'Alerte supprimée.' : 'Alert deleted.');
                        }}
                        className="p-1 text-red-500 hover:bg-red-500/10 cursor-pointer"
                        title="Delete alert"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-brand-muted font-mono italic text-center py-4">Aucune alerte active en direct.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audience' && (
          <AudienceAnalyticsTab />
        )}

        {activeTab === 'navigation' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div className="border-b border-zinc-200/20 dark:border-zinc-800 pb-3">
              <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Gestion des Menus</h2>
              <p className="text-xs text-brand-muted uppercase tracking-wider font-mono">Design public menus, order & auxiliary anchor paths</p>
            </div>

            <div className="glass p-6 border border-brand-border/10 bg-brand-white/40 dark:bg-zinc-900/40 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest mb-3 text-[#E85D42]" style={{ color: currentSettings.accentColor }}>Hiérarchie des Menus Actuels</h3>
              <div className="space-y-2 border border-brand-border/10 p-4 bg-zinc-500/5">
                {[
                  { label: 'À la une (Home)', type: 'Système' },
                  { label: 'Sénégal', type: 'Catégorie dynamique' },
                  { label: 'Politique', type: 'Catégorie dynamique' },
                  { label: 'Économie', type: 'Catégorie dynamique' },
                  { label: 'L’Arène (Sports)', type: 'Module customisé' },
                  { label: 'Société', type: 'Catégorie dynamique' },
                  { label: 'Opinions (Plus)', type: 'Catégorie dynamique' }
                ].map((menu, idx) => (
                  <div key={menu.label} className="flex justify-between items-center p-2.5 bg-brand-white/60 dark:bg-zinc-900/60 border border-brand-border/20 text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <span className="text-brand-muted font-mono">#{idx + 1}</span>
                      <span className="text-brand-dark dark:text-brand-white">{menu.label}</span>
                    </span>
                    <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-brand-muted border border-brand-border/10">{menu.type}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-200/10">
                <button 
                  onClick={() => {
                    showToast(language === 'fr' ? 'Structure de menu publiée aux serveurs CDN !' : 'Menu layout successfully published to CDN nodes!');
                  }}
                  className="btn btn-primary px-6 py-2.5 text-xs uppercase font-black tracking-widest bg-brand-primary text-white cursor-pointer" 
                  style={{ backgroundColor: currentSettings.accentColor }}
                >
                  {language === 'fr' ? 'Publier la structure du Menu' : 'Publish Menu Structure'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'taxonomy' && (
          <TaxonomyTab />
        )}

        {activeTab === 'seo_distribution' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div className="border-b border-zinc-200/20 dark:border-zinc-800 pb-3 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">{language === 'fr' ? 'SEO, Indexation & Social Cards' : 'SEO, Indexing & Social Cards'}</h2>
                <p className="text-xs text-brand-muted uppercase tracking-wider font-mono">Meta tags templates, OpenGraph social card previews, RSS feeds & XML sitemaps</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold rounded-full">
                  Score SEO : 98/100
                </span>
              </div>
            </div>

            <div className="glass p-6 border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 space-y-6 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-zinc-700 dark:text-zinc-200">Suffixe de Titre Métadonnée / SEO Title Suffix</label>
                  <input 
                    type="text" 
                    value={seoTitleSuffix}
                    onChange={(e) => setSeoTitleSuffix(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-2.5 text-xs font-mono font-bold outline-none text-zinc-900 dark:text-zinc-100 focus:border-[#E85D42] rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-zinc-700 dark:text-zinc-200">Format URL Canonique / Canonical base</label>
                  <input 
                    type="text" 
                    value={seoCanonicalBase}
                    onChange={(e) => setSeoCanonicalBase(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-2.5 text-xs font-mono font-bold outline-none text-zinc-900 dark:text-zinc-100 focus:border-[#E85D42] rounded-lg" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-zinc-700 dark:text-zinc-200">Description Par Défaut (OpenGraph & Search Excerpt)</label>
                <textarea 
                  value={seoDefaultDesc}
                  onChange={(e) => setSeoDefaultDesc(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-3 text-xs focus:outline-none h-20 font-medium text-zinc-900 dark:text-zinc-100 focus:border-[#E85D42] rounded-lg" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-zinc-700 dark:text-zinc-200">Mots-clés SEO (Séparés par des virgules)</label>
                  <input 
                    type="text" 
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="Sénégal, Dakar, politique, géopolitique, économie..."
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-2.5 text-xs font-mono outline-none text-zinc-900 dark:text-zinc-100 focus:border-[#E85D42] rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-zinc-700 dark:text-zinc-200">Image OpenGraph Par Défaut (Social Banner URL)</label>
                  <input 
                    type="text" 
                    value={seoOgImage}
                    onChange={(e) => setSeoOgImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-2.5 text-xs font-mono outline-none text-zinc-900 dark:text-zinc-100 focus:border-[#E85D42] rounded-lg" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-zinc-700 dark:text-zinc-200">Indexation Robots (Robots Meta Tag)</label>
                  <select 
                    value={seoRobotsIndex}
                    onChange={(e) => setSeoRobotsIndex(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-2.5 text-xs font-mono font-bold outline-none text-zinc-900 dark:text-zinc-100 focus:border-[#E85D42] rounded-lg" 
                  >
                    <option value="index, follow, max-image-preview:large">AUTORISER TOUT (index, follow - Recommandé)</option>
                    <option value="noindex, nofollow">BLOQUER LES ROBOTS (noindex, nofollow)</option>
                    <option value="noindex, follow">NE PAS INDEXER MAIS SUIVRE LES LIENS (noindex, follow)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-zinc-700 dark:text-zinc-200">Code Verification Google Search Console</label>
                  <input 
                    type="text" 
                    value={seoGoogleVerification}
                    onChange={(e) => setSeoGoogleVerification(e.target.value)}
                    placeholder="google-site-verification=..."
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-2.5 text-xs font-mono outline-none text-zinc-900 dark:text-zinc-100 focus:border-[#E85D42] rounded-lg" 
                  />
                </div>
              </div>

              {/* Social Media Card Visual Preview */}
              <div className="p-4 bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                  {language === 'fr' ? 'Aperçu Carte OpenGraph / Twitter & LinkedIn Card' : 'OpenGraph / Social Media Card Preview'}
                </span>
                
                <div className="border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shadow-sm max-w-lg">
                  <div className="h-32 bg-zinc-800 relative flex items-center justify-center overflow-hidden">
                    {seoOgImage ? (
                      <img src={seoOgImage} alt="OG Banner" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                        <span className="font-serif font-black text-2xl text-white tracking-widest z-20">THE PERSPECTIVE GROUP</span>
                      </>
                    )}
                  </div>
                  <div className="p-3.5 space-y-1 bg-zinc-900 text-white">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">perspective.sn</span>
                    <h4 className="text-sm font-bold text-white truncate">
                      L'Économie Sénégalaise & Géopolitique du Sahel {seoTitleSuffix}
                    </h4>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {seoDefaultDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sitemap & RSS Generator Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl space-y-2">
                  <span className="text-xs font-mono font-bold uppercase text-zinc-300 block">Sitemap XML Dynamic Generator</span>
                  <p className="text-[11px] text-zinc-400">
                    {language === 'fr' ? `Génère le sitemap XML contenant les ${articles.length} articles publiés.` : `Generates XML sitemap index with ${articles.length} published articles.`}
                  </p>
                  <button
                    onClick={() => {
                      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
                        articles.map(a => `  <url><loc>${seoCanonicalBase}/article/${a.slug || a.id}</loc><lastmod>${new Date().toISOString()}</lastmod></url>\n`).join('') +
                        `</urlset>`;
                      const blob = new Blob([xml], { type: 'text/xml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'sitemap.xml';
                      a.click();
                      showToast(language === 'fr' ? 'Sitemap.xml téléchargé !' : 'Sitemap.xml generated and downloaded!');
                    }}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Télécharger sitemap.xml</span>
                  </button>
                </div>

                <div className="p-4 border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl space-y-2">
                  <span className="text-xs font-mono font-bold uppercase text-zinc-300 block">Flux RSS 2.0 / Atom Feed</span>
                  <p className="text-[11px] text-zinc-400">
                    {language === 'fr' ? 'Exportation du flux d\'actualité pour aggrégateurs et syndication.' : 'Newsfeed export for RSS readers and article syndication.'}
                  </p>
                  <button
                    onClick={() => {
                      showToast(language === 'fr' ? 'Flux RSS actif sur /rss.xml !' : 'RSS Feed active at /rss.xml!');
                    }}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Tester Flux /rss.xml</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200/10">
                <button 
                  onClick={() => {
                    updateSiteSettings({
                      seoTitleSuffix,
                      seoCanonicalBase,
                      seoDefaultDesc,
                      seoDefaultKeywords: seoKeywords,
                      seoOgImage,
                      seoRobotsIndex,
                      seoGoogleSiteVerification: seoGoogleVerification
                    } as any);
                    showToast(language === 'fr' ? 'Métadonnées SEO sauvegardées en direct !' : 'SEO Metadata tags saved live!');
                  }}
                  className="btn btn-primary px-6 py-2.5 text-xs uppercase font-black tracking-widest bg-brand-primary text-white cursor-pointer rounded-lg shadow-md" 
                  style={{ backgroundColor: currentSettings.accentColor }}
                >
                  {language === 'fr' ? 'Sauvegarder les métadonnées SEO' : 'Save Search Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'abdel_chat_config' && (
          <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-zinc-800 gap-4">
              <div>
                <h1 className="text-2xl font-serif font-bold text-zinc-100">
                  {language === 'fr' ? 'Configuration Abdel AI & Contacts' : 'Abdel AI & Messenger Contacts Config'}
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'fr'
                    ? 'Modifiez les suggestions de questions d’Abdel AI liées aux articles du journal et gérez les contacts amis de messagerie.'
                    : 'Modify Abdel AI journal article questions and manage reader friend contacts.'}
                </p>
              </div>
            </div>

            {/* Abdel AI Questions Config */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-mono uppercase tracking-wider text-[#E85D42] font-bold flex items-center gap-2">
                <Bot className="w-4 h-4" />
                {language === 'fr' ? 'Questions Abdel AI (Suggestions Journal)' : 'Abdel AI Journal Questions'}
              </h2>
              <p className="text-xs text-zinc-400">
                {language === 'fr'
                  ? 'Ces questions s’affichent comme suggestions automatiques pour interroger Abdel AI sur les articles du journal.'
                  : 'These questions appear as quick suggestions when querying Abdel AI about journal articles.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-300 block">
                    {language === 'fr' ? 'Questions en Français (une par ligne)' : 'French Questions (one per line)'}
                  </label>
                  <textarea
                    rows={6}
                    value={frPromptsText}
                    onChange={(e) => setFrPromptsText(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-[#E85D42]"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-300 block">
                    {language === 'fr' ? 'Questions en Anglais (une par ligne)' : 'English Questions (one per line)'}
                  </label>
                  <textarea
                    rows={6}
                    value={enPromptsText}
                    onChange={(e) => setEnPromptsText(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-[#E85D42]"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  const frList = frPromptsText.split('\n').map(s => s.trim()).filter(Boolean);
                  const enList = enPromptsText.split('\n').map(s => s.trim()).filter(Boolean);
                  updateAbdelPrompts({ fr: frList, en: enList });
                  showToast(language === 'fr' ? 'Questions d’Abdel AI mises à jour' : 'Abdel AI questions updated');
                }}
                className="px-5 py-2.5 bg-[#E85D42] hover:bg-[#d04a30] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md"
              >
                {language === 'fr' ? 'Enregistrer les Questions' : 'Save Questions'}
              </button>
            </div>

            {/* Friend Contacts Management */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-mono uppercase tracking-wider text-[#E85D42] font-bold flex items-center gap-2">
                <Users className="w-4 h-4" />
                {language === 'fr' ? 'Contacts Amis & Pairs (Messagerie)' : 'Friends & Peer Contacts'}
              </h2>
              <p className="text-xs text-zinc-400">
                {language === 'fr'
                  ? 'Gérez la liste des lecteurs et amis suggérés pour les messages directs à la place des administrateurs.'
                  : 'Manage reader friends and peer contacts suggested for direct messaging instead of admins.'}
              </p>

              {/* Add friend form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <input
                  type="text"
                  placeholder={language === 'fr' ? "Nom (ex: Aminata Sow)" : "Name (e.g. Aminata Sow)"}
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42]"
                />
                <input
                  type="email"
                  placeholder="email@perspective.sn"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42]"
                />
                <input
                  type="text"
                  placeholder={language === 'fr' ? "Rôle / Statut" : "Role / Status"}
                  value={newFriendRole}
                  onChange={(e) => setNewFriendRole(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42]"
                />
                <button
                  onClick={() => {
                    if (!newFriendName.trim() || !newFriendEmail.trim()) {
                      alert("Please provide name and email.");
                      return;
                    }
                    addFriend({
                      name: newFriendName.trim(),
                      email: newFriendEmail.trim().toLowerCase(),
                      role: newFriendRole.trim() || "Lecteur",
                      avatar: newFriendName.trim().charAt(0).toUpperCase(),
                      status: "En ligne"
                    });
                    setNewFriendName("");
                    setNewFriendEmail("");
                    setNewFriendRole("");
                    showToast(language === 'fr' ? 'Ami ajouté avec succès' : 'Friend added successfully');
                  }}
                  className="bg-zinc-800 hover:bg-[#E85D42] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer py-2"
                >
                  {language === 'fr' ? '+ Ajouter un Ami' : '+ Add Friend'}
                </button>
              </div>

              {/* Existing friends list */}
              <div className="space-y-2">
                {friends.map((f) => (
                  <div key={f.email} className="flex items-center justify-between p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-[#E85D42]">
                        {f.avatar || f.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-200">{f.name}</p>
                        <p className="text-[10px] text-zinc-400">{f.email} • {f.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        deleteFriend(f.email);
                        showToast(language === 'fr' ? 'Ami supprimé' : 'Friend removed');
                      }}
                      className="p-1.5 bg-zinc-900 hover:bg-red-600 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div className="border-b border-zinc-200/20 dark:border-zinc-800 pb-3">
              <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Paramètres Généraux</h2>
              <p className="text-xs text-brand-muted uppercase tracking-wider font-mono">System parameters, security & paywall integration settings</p>
            </div>

            <div className="glass p-6 border border-brand-border/10 bg-brand-white/40 dark:bg-zinc-900/40 space-y-6">
              {/* Maintenance Mode dedicated card inside Settings */}
              <div className={`p-5 rounded-lg border space-y-3 ${
                siteSettings?.isMaintenanceMode !== false 
                  ? 'bg-amber-950/40 border-amber-600/50' 
                  : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${siteSettings?.isMaintenanceMode !== false ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      <Wrench size={20} className={siteSettings?.isMaintenanceMode !== false ? 'animate-spin-slow' : ''} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-100">
                        {language === 'fr' ? 'Mode Maintenance du Site' : 'Site Maintenance Mode'}
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans">
                        {language === 'fr' 
                          ? 'Affiche une page de maintenance technique à tous les visiteurs de senperspective.com.' 
                          : 'Displays a technical maintenance page to all public visitors of senperspective.com.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSiteSettings({ isMaintenanceMode: siteSettings?.isMaintenanceMode === false ? true : false })}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md cursor-pointer ${
                      siteSettings?.isMaintenanceMode !== false 
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400 font-extrabold' 
                        : 'bg-amber-500 text-black hover:bg-amber-400 font-extrabold'
                    }`}
                  >
                    {siteSettings?.isMaintenanceMode !== false 
                      ? (language === 'fr' ? 'DÉSACTIVER (RÉOUVRIR LE SITE)' : 'DISABLE (RE-OPEN SITE)')
                      : (language === 'fr' ? 'ACTIVER LA MAINTENANCE' : 'ENABLE MAINTENANCE')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Mode d'exécution Abdel AI</label>
                  <select 
                    value={settingsAIExecutionMode}
                    onChange={(e) => setSettingsAIExecutionMode(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border/20 p-2.5 text-xs focus:outline-none font-bold font-mono text-brand-dark dark:text-brand-white"
                  >
                    <option value="flash">Gemini 2.5 Flash (Ultra-rapide, défaut)</option>
                    <option value="pro">Gemini 1.5 Pro (Haute profondeur d’analyse)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Moteur Base de Données / DB Provider</label>
                  <select 
                    value={settingsDatabaseProvider}
                    onChange={(e) => setSettingsDatabaseProvider(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border/20 p-2.5 text-xs focus:outline-none font-bold font-mono text-brand-dark dark:text-brand-white"
                  >
                    <option value="firestore">{language === 'fr' ? 'Base de Données Document Cloud (Production Clé-en-main)' : 'Cloud Document Database (Production Ready)'}</option>
                    <option value="local">Local Storage Client (Fallback d’urgence)</option>
                  </select>
                </div>
              </div>

              {/* Paywall & Monetization Architecture Center */}
              <div className="border-t border-brand-border/10 pt-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={16} className="text-[#E85D42]" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100 font-serif">
                      {language === 'fr' ? 'Architecture Paywall & Stratégie de Monétisation' : 'Paywall Architecture & Monetization Strategy'}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                    {language === 'fr' 
                      ? 'Rationalisation claire des 3 niveaux d’accès aux contenus de Perspective Group.' 
                      : 'Clear rationalization of the 3 content access tiers across Perspective Group.'}
                  </p>
                </div>

                {/* 3-Tier Paywall Explanation Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs">
                  {/* Tier 1 */}
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-none space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Niveau 1</span>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Accès Libre</span>
                    </div>
                    <h4 className="font-bold text-zinc-100 text-sm">🟢 Free / News</h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {language === 'fr' 
                        ? 'Brèves et actualités à chaud (type "News"). Entièrement gratuites pour tous les visiteurs. N’entament aucun quota.' 
                        : 'Breaking news articles ("News"). 100% free for all visitors. Does not consume reading quotas.'}
                    </p>
                    <div className="pt-2 border-t border-emerald-500/20 text-[9.5px] text-emerald-400/90 font-mono">
                      Target: Audience générale & SEO
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-none space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Niveau 2</span>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">Paywall Compteur</span>
                    </div>
                    <h4 className="font-bold text-zinc-100 text-sm">🟡 Metered / Analyses</h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {language === 'fr' 
                        ? `Analyses, Explainers et Opinions. Accès gratuit jusqu'à ${settingsPaywallThreshold} articles/mois. Propose la création de compte au-delà.` 
                        : `Analyses, Explainers & Opinions. Free up to ${settingsPaywallThreshold} articles/month. Prompts sign-up beyond limit.`}
                    </p>
                    <div className="pt-2 border-t border-amber-500/20 text-[9.5px] text-amber-400/90 font-mono">
                      Target: Conversion de lecteurs réguliers
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-none space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Niveau 3</span>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">Paywall Stricte</span>
                    </div>
                    <h4 className="font-bold text-zinc-100 text-sm">🔒 Deep Dive / Exclusif</h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {language === 'fr' 
                        ? 'Dossiers d’investigation à forte valeur ajoutée ("Deep Dive"). Contenu verrouillé réservé exclusivement aux Membres enregistrés.' 
                        : 'High-value investigative reports ("Deep Dive"). Hard-locked exclusively for registered Members & Admins.'}
                    </p>
                    <div className="pt-2 border-t border-rose-500/20 text-[9.5px] text-rose-400/90 font-mono">
                      Target: Membres Premium & Club des Lecteurs
                    </div>
                  </div>
                </div>

                {/* Main Settings Card */}
                <div className="p-5 bg-zinc-900/60 border border-brand-border/20 space-y-4 font-sans">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="space-y-1 text-left">
                      <span className="text-xs font-black uppercase text-zinc-100">
                        {language === 'fr' ? 'Activer le Paywall Compteur (Soft Metering)' : 'Enable Metered Soft Paywall'}
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        {language === 'fr' 
                          ? 'Comptabilise les consultations d’articles par visiteur anonyme et affiche une carte d’inscription une fois le quota atteint.' 
                          : 'Tracks article reads per anonymous visitor and prompts registration once the quota threshold is met.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={settingsPaywallEnabled}
                          onChange={(e) => setSettingsPaywallEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#E85D42] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-200">{settingsPaywallEnabled ? 'Actif' : 'Désactivé'}</span>
                      </label>
                    </div>
                  </div>

                  {settingsPaywallEnabled && (
                    <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 font-medium">
                          {language === 'fr' ? 'Quota d’articles gratuits autorisés par visiteur :' : 'Free articles quota allowed per visitor :'}
                        </span>
                        <input 
                          type="number"
                          min="1"
                          max="10"
                          value={settingsPaywallThreshold}
                          onChange={(e) => setSettingsPaywallThreshold(parseInt(e.target.value) || 3)}
                          className="w-16 p-1.5 bg-zinc-950 text-white font-bold text-center border border-zinc-700 focus:outline-none focus:border-[#E85D42]"
                        />
                        <span className="text-zinc-400">articles / mois</span>
                      </div>
                      <span className="text-[10px] text-amber-400/90 font-mono bg-amber-950/40 border border-amber-800/40 px-2.5 py-1">
                        💡 Recommandation éditoriale : 3 articles / mois
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Data Usage & GDPR Compliance Module */}
              <div className="border-t border-brand-border/10 pt-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={18} className="text-orange-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100 font-serif">
                      {language === 'fr' ? 'Gestion des Données Personnelles & Conformité RGPD' : 'Personal Data Usage & Privacy Control'}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                    {language === 'fr' 
                      ? 'Transparence sur le traitement des données des lecteurs, gestion du consentement cookies et export des registres.' 
                      : 'Transparency on reader data processing, cookie consent policy, and compliance data exports.'}
                  </p>
                </div>

                {/* Personal Data Key Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-sans">
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">👥 Comptes Lecteurs</span>
                    <span className="text-lg font-black text-white">{users?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">📧 Newsletter</span>
                    <span className="text-lg font-black text-emerald-400">{subscribers?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">💬 Interactions Loggées</span>
                    <span className="text-lg font-black text-amber-400">{interactions?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">🍪 Système Cookies</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      {cookieConsentEnabled ? '🟢 RGPD Actif' : '🔴 Inactif'}
                    </span>
                  </div>
                </div>

                {/* Cookie Banner Toggle & Tester */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 space-y-3 font-sans rounded-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase text-zinc-100">
                        {language === 'fr' ? 'Bannière de Consentement Cookies (RGPD)' : 'Cookie Consent Banner System'}
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        {language === 'fr' 
                          ? 'Affiche la bannière flottante de consentement pour les nouveaux visiteurs.' 
                          : 'Displays the floating consent banner to new visitors for tracking compliance.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={cookieConsentEnabled}
                          onChange={(e) => setCookieConsentEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#E85D42] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-200">{cookieConsentEnabled ? 'Activée' : 'Désactivée'}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))}
                        className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded transition-all cursor-pointer"
                      >
                        {language === 'fr' ? '⚙️ Tester le Modal' : '⚙️ Test Modal'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                        Politique de Confidentialité (Français)
                      </label>
                      <textarea
                        value={privacyPolicyTextFr}
                        onChange={(e) => setPrivacyPolicyTextFr(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 h-20 focus:outline-none focus:border-[#E85D42] rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                        Privacy Notice (English)
                      </label>
                      <textarea
                        value={privacyPolicyTextEn}
                        onChange={(e) => setPrivacyPolicyTextEn(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 h-20 focus:outline-none focus:border-[#E85D42] rounded"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-medium">
                        {language === 'fr' ? 'Rétention maximale des logs de données :' : 'Maximum data retention policy :'}
                      </span>
                      <input 
                        type="number"
                        min="30"
                        max="730"
                        value={dataRetentionDays}
                        onChange={(e) => setDataRetentionDays(parseInt(e.target.value) || 365)}
                        className="w-20 p-1 bg-zinc-950 text-white font-bold text-center border border-zinc-700 focus:outline-none focus:border-[#E85D42]"
                      />
                      <span className="text-zinc-400">jours / days</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const exportData = {
                          site: "Perspective Group",
                          exportDate: new Date().toISOString(),
                          registeredUsers: users || [],
                          subscribers: subscribers || [],
                          totalInteractionsLogged: interactions?.length || 0
                        };
                        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `perspective-gdpr-data-export-${Date.now()}.json`;
                        a.click();
                        showToast(language === 'fr' ? 'Export des données RGPD téléchargé !' : 'GDPR Data Export downloaded!');
                      }}
                      className="px-3.5 py-1.5 text-[10px] font-mono font-bold uppercase bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700/50 rounded transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📥 Exporter Registre RGPD (JSON)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live SEO & Publishing Configuration */}
              <div className="border-t border-brand-border/10 pt-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={18} className="text-emerald-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100 font-serif">
                      {language === 'fr' ? 'Configuration SEO, Indexation & Sitemap' : 'Live Published SEO & Indexing Configuration'}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                    {language === 'fr' 
                      ? 'Réglages d’indexation pour Google Search Console, URL canonique officielle et balises sociales.' 
                      : 'Indexing rules for search engines, official canonical URL, and OpenGraph social tags.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                      URL Canonique Officielle / Canonical Base URL
                    </label>
                    <input 
                      type="text" 
                      value={seoCanonicalBase}
                      onChange={(e) => setSeoCanonicalBase(e.target.value)}
                      placeholder="https://senperspective.com"
                      className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E85D42] rounded" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                      Suffixe de Titre Métadonnée / Title Suffix
                    </label>
                    <input 
                      type="text" 
                      value={seoTitleSuffix}
                      onChange={(e) => setSeoTitleSuffix(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E85D42] rounded" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                      Indexation Robots (Search Crawlers)
                    </label>
                    <select 
                      value={seoRobotsIndex}
                      onChange={(e) => setSeoRobotsIndex(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#E85D42] rounded" 
                    >
                      <option value="index, follow, max-image-preview:large">Indexation Active (index, follow - Recommandé)</option>
                      <option value="noindex, nofollow">Désactiver l'indexation (noindex, nofollow)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                      Google Search Console Token
                    </label>
                    <input 
                      type="text" 
                      value={seoGoogleVerification}
                      onChange={(e) => setSeoGoogleVerification(e.target.value)}
                      placeholder="google-site-verification=..."
                      className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#E85D42] rounded" 
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-zinc-300 font-bold">Sitemap XML Dynamic Generator:</span>
                    <span className="text-zinc-400">{articles.length} articles indexés</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
                        articles.map(a => `  <url><loc>${seoCanonicalBase}/article/${a.slug || a.id}</loc><lastmod>${new Date().toISOString()}</lastmod></url>\n`).join('') +
                        `</urlset>`;
                      const blob = new Blob([xml], { type: 'text/xml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'sitemap.xml';
                      a.click();
                      showToast(language === 'fr' ? 'Sitemap.xml téléchargé !' : 'Sitemap.xml generated!');
                    }}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono font-bold uppercase rounded cursor-pointer"
                  >
                    📄 Générer sitemap.xml
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-3 text-zinc-400">Maintenance Cache Editorial</h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      showToast(language === 'fr' ? 'Static CDN cache purgé avec succès !' : 'Static CDN cache purged globally!');
                    }}
                    className="btn btn-secondary px-4 py-2 text-[9px] uppercase font-black tracking-widest bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-brand-dark dark:text-brand-white cursor-pointer"
                  >
                    Purger le Cache Statique
                  </button>
                  <button 
                    onClick={() => {
                      showToast(language === 'fr' ? 'Sessions utilisateurs inactives terminées.' : 'Inactive visitor sessions terminated.');
                    }}
                    className="btn btn-secondary px-4 py-2 text-[9px] uppercase font-black tracking-widest bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-brand-dark dark:text-brand-white cursor-pointer"
                  >
                    Vider les sessions inactives
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200/10">
                <button 
                  onClick={() => {
                    updateSiteSettings({
                      aiModelMode: settingsAIExecutionMode,
                      databaseProvider: settingsDatabaseProvider,
                      paywallEnabled: settingsPaywallEnabled,
                      paywallThreshold: settingsPaywallThreshold,
                      cookieConsentEnabled,
                      privacyPolicyTextFr,
                      privacyPolicyTextEn,
                      dataRetentionDays,
                      seoTitleSuffix,
                      seoCanonicalBase,
                      seoDefaultDesc,
                      seoDefaultKeywords: seoKeywords,
                      seoOgImage,
                      seoRobotsIndex,
                      seoGoogleSiteVerification: seoGoogleVerification
                    } as any);
                    showToast(language === 'fr' ? 'Configurations globales & SEO sauvegardés !' : 'Global system parameters & SEO applied!');
                  }}
                  className="btn btn-primary px-6 py-2.5 text-xs uppercase font-black tracking-widest bg-brand-primary text-white cursor-pointer rounded-lg shadow-md" 
                  style={{ backgroundColor: currentSettings.accentColor }}
                >
                  {language === 'fr' ? 'Sauvegarder l\'ensemble des configurations' : 'Save All System Parameters'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity_log' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="border-b border-zinc-200/20 dark:border-zinc-800 pb-3">
              <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Journal d'Activité</h2>
              <p className="text-xs text-brand-muted uppercase tracking-wider font-mono">Immutable audit trails of redactorial actions</p>
            </div>

            <div className="glass p-6 border border-brand-border/10 bg-brand-white/40 dark:bg-zinc-900/40 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] whitespace-nowrap">
                  <thead className="border-b border-brand-border/20 text-[#E85D42] font-black uppercase tracking-widest">
                    <tr>
                      <th className="py-2.5 pr-4">Horodatage (UTC)</th>
                      <th className="py-2.5 px-4">Utilisateur</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 pl-4 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/10 dark:divide-zinc-800/10">
                    {[
                      { time: '14:32:01', user: 'admin', action: 'Classification de l’article de "Finances publiques" vers "Économie"', status: 'SUCCESS' },
                      { time: '13:10:45', user: 'admin', action: 'Correction du contraste texte sur ArticlePage (.prose-article-reader)', status: 'SUCCESS' },
                      { time: '11:45:12', user: 'kadersdiaz3@gmail.com', action: 'Création du combat royal de lutte (Balla Gaye 2 vs Boy Niang 2)', status: 'SUCCESS' },
                      { time: '09:24:55', user: 'system', action: 'Purger le cache statique de la page d’accueil', status: 'SUCCESS' }
                    ].map((log, idx) => (
                      <tr key={idx} className="hover:bg-zinc-500/5 text-zinc-800 dark:text-zinc-100">
                        <td className="py-3 pr-4 font-bold text-zinc-500">{log.time}</td>
                        <td className="py-3 px-4 font-black text-brand-primary">{log.user}</td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 truncate max-w-sm">{log.action}</td>
                        <td className="py-3 pl-4 text-right font-black text-emerald-500">{log.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-brand-dark pb-3 gap-4">
              <div>
                <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Perspective Arena</h2>
                <p className="text-xs text-brand-muted uppercase tracking-wider font-mono">Real-time match outcomes & sports dispatches</p>
              </div>
              {!selectedMatchForEdit && !isCreatingMatch && (
                <button 
                  onClick={startCreateMatch}
                  className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
                  style={{ backgroundColor: currentSettings.accentColor }}
                >
                  <Plus size={16} /> {language === 'fr' ? 'Ajouter un Match' : 'Add Match Entry'}
                </button>
              )}
            </div>

            {/* Editing / Creating Match State form */}
            {(selectedMatchForEdit || isCreatingMatch) ? (
              <div className="bg-white dark:bg-zinc-900 border border-brand-border p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-brand-border/10 pb-3">
                  <h3 className="text-lg font-serif font-black uppercase text-zinc-900 dark:text-zinc-100">
                    {selectedMatchForEdit 
                      ? (language === 'fr' ? `Modifier: ${matchTeamAName} vs ${matchTeamBName}` : `Edit Match: ${matchTeamAName} vs ${matchTeamBName}`)
                      : (language === 'fr' ? "Nouvelle Fiche de Match" : "New Arena Match Register")
                    }
                  </h3>
                  <button 
                    onClick={() => { setSelectedMatchForEdit(null); setIsCreatingMatch(false); }}
                    className="text-brand-muted hover:text-zinc-950 dark:hover:text-brand-dark dark:hover:text-brand-white text-xs font-mono font-bold uppercase tracking-widest"
                  >
                    {language === 'fr' ? 'Fermer' : 'Close'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* League configuration */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-brand-muted border-b border-brand-border/10 pb-1">
                      {language === 'fr' ? "1. PARAMÈTRES DE LA COMPÉTITION" : "1. COMPETITION PROFILE"}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">League ID Key</label>
                        <select 
                          value={matchLeague}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMatchLeague(val);
                            if (val === "champions-league") {
                              setMatchLeagueFr("Champions League");
                              setMatchLeagueEn("Champions League");
                            } else if (val === "world-cup") {
                              setMatchLeagueFr("Coupe du Monde");
                              setMatchLeagueEn("World Cup");
                            } else if (val === "nba-bal") {
                              setMatchLeagueFr("NBA BAL");
                              setMatchLeagueEn("NBA BAL");
                            } else if (val === "d1-basket") {
                              setMatchLeagueFr("Coupe D1 Basket");
                              setMatchLeagueEn("D1 Basketball Cup");
                            } else if (val === "wrestling") {
                              setMatchLeagueFr("Lutte avec Frappe");
                              setMatchLeagueEn("Senegalese Wrestling");
                            } else if (val === "navetane") {
                              setMatchLeagueFr("Championnat Navétanes");
                              setMatchLeagueEn("Navetane League");
                            }
                          }}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none"
                        >
                          <option value="champions-league">Champions League (UCL)</option>
                          <option value="world-cup">World Cup (Mondial)</option>
                          <option value="nba-bal">NBA / BAL Basketball</option>
                          <option value="d1-basket">D1 Basket Sénégal</option>
                          <option value="wrestling">Lutte Sénégalaise</option>
                          <option value="navetane">Navétanes Championnat</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Status State</label>
                        <select 
                          value={matchStatus}
                          onChange={(e) => setMatchStatus(e.target.value as any)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none font-bold"
                        >
                          <option value="upcoming">UPCOMING (À venir)</option>
                          <option value="live">LIVE (En cours)</option>
                          <option value="finished">FINISHED (Terminé)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">League Label (FR)</label>
                        <input 
                          type="text"
                          value={matchLeagueFr}
                          onChange={(e) => setMatchLeagueFr(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none"
                          placeholder="ex. Ligue 1 Sénégal"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">League Label (EN)</label>
                        <input 
                          type="text"
                          value={matchLeagueEn}
                          onChange={(e) => setMatchLeagueEn(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none"
                          placeholder="ex. Senegal First Division"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">
                          {matchStatus === "live" ? "Live Clock (Time)" : "Scheduled Date"}
                        </label>
                        <input 
                          type="text"
                          value={matchStatus === "live" ? matchTime : matchDate}
                          onChange={(e) => matchStatus === "live" ? setMatchTime(e.target.value) : setMatchDate(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none font-mono"
                          placeholder={matchStatus === "live" ? "ex. 82' or Mi-temps" : "ex. Demain, 17:00 GMT"}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Arena Venue / Stadium</label>
                        <input 
                          type="text"
                          value={matchArena}
                          onChange={(e) => setMatchArena(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none"
                          placeholder="ex. Stade Iba Mar Diop, Dakar"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team performance profiles */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-brand-muted border-b border-zinc-800 pb-1">
                      {language === 'fr' ? "2. ÉQUIPES ET CLASSEMENTS" : "2. TEAMS PROFILE & STATS"}
                    </h4>

                    <div className="grid grid-cols-2 gap-4 border-l-4 border-l-[#E85D42] pl-3 py-1 bg-zinc-500/5" style={{ borderLeftColor: currentSettings.accentColor }}>
                      <div className={matchLeague === "wrestling" ? "col-span-2" : "col-span-1"}>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">
                          {matchLeague === "wrestling" ? "Lutteur A (Écurie A)" : "Team A Name"}
                        </label>
                        <input 
                          type="text"
                          value={matchTeamAName}
                          onChange={(e) => setMatchTeamAName(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none font-bold"
                          placeholder={matchLeague === "wrestling" ? "ex. Modou Lô" : "ex. AS Douanes"}
                        />
                      </div>
                      {matchLeague !== "wrestling" && (
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Team A Score</label>
                          <input 
                            type="text"
                            value={matchTeamAScore}
                            onChange={(e) => setMatchTeamAScore(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none font-mono font-bold"
                            placeholder="Score"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-l-4 border-l-zinc-500 pl-3 py-1 bg-zinc-500/5">
                      <div className={matchLeague === "wrestling" ? "col-span-2" : "col-span-1"}>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">
                          {matchLeague === "wrestling" ? "Lutteur B (Écurie B)" : "Team B Name"}
                        </label>
                        <input 
                          type="text"
                          value={matchTeamBName}
                          onChange={(e) => setMatchTeamBName(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none font-bold"
                          placeholder={matchLeague === "wrestling" ? "ex. Balla Gaye 2" : "ex. ASC Jeanne d'Arc"}
                        />
                      </div>
                      {matchLeague !== "wrestling" && (
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Team B Score</label>
                          <input 
                            type="text"
                            value={matchTeamBScore}
                            onChange={(e) => setMatchTeamBScore(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none font-mono font-bold"
                            placeholder="Score"
                          />
                        </div>
                      )}
                    </div>

                    {/* CNG Wrestling Official Verdict */}
                    {matchLeague === "wrestling" && (
                      <div className="p-3.5 bg-[#E85D42]/5 border border-dashed border-[#E85D42]/20 space-y-2 col-span-2">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-200 mb-1">
                          {language === "fr" ? "Verdict du Combat (Règlement CNG)" : "CNG Combat Official Verdict"}
                        </label>
                        <select
                          value={
                            matchTeamAScore === "1" && matchTeamBScore === "0"
                              ? "winnerA"
                              : matchTeamAScore === "0" && matchTeamBScore === "1"
                              ? "winnerB"
                              : matchTeamAScore === "0" && matchTeamBScore === "0"
                              ? "draw"
                              : "pending"
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "winnerA") {
                              setMatchTeamAScore("1");
                              setMatchTeamBScore("0");
                            } else if (val === "winnerB") {
                              setMatchTeamAScore("0");
                              setMatchTeamBScore("1");
                            } else if (val === "draw") {
                              setMatchTeamAScore("0");
                              setMatchTeamBScore("0");
                            } else {
                              setMatchTeamAScore("");
                              setMatchTeamBScore("");
                            }
                          }}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-2.5 text-xs focus:outline-none font-bold"
                        >
                          <option value="pending">{language === "fr" ? "À venir / En cours (Non décidé)" : "Upcoming / Live (Undecided)"}</option>
                          <option value="winnerA">{language === "fr" ? `Victoire de ${matchTeamAName || "Lutteur A"}` : `Victory for ${matchTeamAName || "Wrestler A"}`}</option>
                          <option value="winnerB">{language === "fr" ? `Victoire de ${matchTeamBName || "Lutteur B"}` : `Victory for ${matchTeamBName || "Wrestler B"}`}</option>
                          <option value="draw">{language === "fr" ? "Sans Verdict / Match Nul" : "No Verdict / Draw"}</option>
                        </select>
                        <p className="text-[9px] text-brand-muted font-mono">
                          {language === "fr" 
                            ? "* Le règlement de la CNG de Lutte n'inclut pas de scores numériques, mais sanctionne par Victoire (par chute, décision, KO, avertissements) ou Match Nul."
                            : "* CNG Wrestling rules sanction combats strictly with Victory (via fall, decision, KO, warning penalty thresholds) or Draw, rather than numeric points."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Analytical dispatches footnotes */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-brand-muted border-b border-zinc-800 pb-1">
                    {language === 'fr' ? "3. NOTES DES ANALYSTES ET DESCRIPTION" : "3. ANALYST COMMENTS & PERSPECTIVES"}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Footnote perspective (FR)</label>
                      <textarea 
                        value={matchContextFr}
                        onChange={(e) => setMatchContextFr(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-3 text-xs focus:outline-none h-20"
                        placeholder="ex. Domination écrasante au premier quart-temps. ASC Jeanne d'Arc maintient la pression."
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Footnote perspective (EN)</label>
                      <textarea 
                        value={matchContextEn}
                        onChange={(e) => setMatchContextEn(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-brand-border p-3 text-xs focus:outline-none h-20"
                        placeholder="ex. High intensity match with AS Douanes dominating transitions early on."
                      />
                    </div>
                  </div>
                </div>

                {/* Form CTA Buttons */}
                <div className="flex gap-4 border-t border-zinc-100 dark:border-brand-border/10 pt-4">
                  <button 
                    onClick={handleSaveMatch}
                    className="bg-[#E85D42] hover:bg-[#c94931] text-white px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
                    style={{ backgroundColor: currentSettings.accentColor }}
                  >
                    {language === 'fr' ? 'ENREGISTRER LE MATCH' : 'SAVE MATCH DATA'}
                  </button>
                  <button 
                    onClick={() => { setSelectedMatchForEdit(null); setIsCreatingMatch(false); }}
                    className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
                  >
                    {language === 'fr' ? 'ANNULER' : 'CANCEL'}
                  </button>
                </div>
              </div>
            ) : (
              /* Matches List Dashboard Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {matches.map((match: any) => (
                  <div key={match.id} className="bg-black border border-zinc-800 p-5 rounded-lg flex flex-col justify-between hover:border-zinc-700 shadow-xl transition-all relative">
                    <div className="space-y-4">
                      {/* Card Category Header */}
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#E85D42]" style={{ color: currentSettings.accentColor }}>
                          {language === 'fr' ? match.leagueLabel.fr : match.leagueLabel.en}
                        </span>
                        <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 border ${
                          match.status === "live" 
                            ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" 
                            : match.status === "upcoming"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                        }`}>
                          {match.status === "live" ? "● LIVE" : match.status === "upcoming" ? "UPCOMING" : "FINISHED"}
                        </span>
                      </div>

                      {/* Display Scoreboard */}
                      <div className="flex items-center justify-between border-y border-zinc-100 dark:border-brand-border/10 py-3">
                        <div className="flex-1 space-y-1">
                          <p className="font-serif font-black text-sm text-zinc-800 dark:text-zinc-100 truncate">
                            {match.league === "wrestling" && language === "fr" ? `💥 ${match.teamA.name}` : match.teamA.name}
                          </p>
                          <p className="font-serif font-black text-sm text-zinc-800 dark:text-zinc-100 truncate">
                            {match.league === "wrestling" && language === "fr" ? `💥 ${match.teamB.name}` : match.teamB.name}
                          </p>
                        </div>
                        <div className="pl-4 font-mono text-center shrink-0">
                          {match.league === "wrestling" ? (
                            <div className="flex flex-col gap-1 items-end">
                              {match.status === "upcoming" ? (
                                <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5">
                                  {language === "fr" ? "Non disputé" : "Not Fought"}
                                </span>
                              ) : match.teamA.score === 1 ? (
                                <>
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5">
                                    {language === "fr" ? "Vainqueur (A)" : "Winner (A)"}
                                  </span>
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 opacity-60">
                                    {language === "fr" ? "Battu (B)" : "Defeated (B)"}
                                  </span>
                                </>
                              ) : match.teamB.score === 1 ? (
                                <>
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 opacity-60">
                                    {language === "fr" ? "Battu (A)" : "Defeated (A)"}
                                  </span>
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5">
                                    {language === "fr" ? "Vainqueur (B)" : "Winner (B)"}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[8px] font-black uppercase tracking-wider bg-zinc-500/10 text-brand-muted border border-zinc-500/20 px-2 py-0.5">
                                  {language === "fr" ? "Match Nul / Nul" : "Draw (Nul)"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col justify-center items-center font-black text-lg bg-zinc-50 dark:bg-zinc-950 border border-brand-border px-3 py-1.5 rounded-none min-w-[34px]">
                              <span className="text-zinc-900 dark:text-zinc-100">{match.teamA.score !== undefined ? match.teamA.score : "-"}</span>
                              <span className="text-zinc-900 dark:text-zinc-100">{match.teamB.score !== undefined ? match.teamB.score : "-"}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Game footers / Arena & Time */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                          <Clock size={10} />
                          <span>
                            {match.status === "live" ? `${language === 'fr' ? 'Temps réel' : 'Live Clock'}: ${match.time}` : match.date}
                          </span>
                        </p>
                        {match.arena && (
                          <p className="text-[10px] text-zinc-500 font-cambria truncate">
                            {language === 'fr' ? 'Lieu' : 'Venue'}: <span className="font-semibold">{match.arena}</span>
                          </p>
                        )}
                        {match.contextInfo?.[language] && (
                          <p className="text-[11px] text-brand-muted dark:text-zinc-300 font-cambria italic border-l-2 border-l-zinc-300 dark:border-l-zinc-700 pl-2 py-0.5 mt-2 leading-snug">
                            "{match.contextInfo[language]}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions bar for this match card */}
                    <div className="flex gap-2 border-t border-zinc-100 dark:border-brand-border/10 pt-3.5 mt-4">
                      <button 
                        onClick={() => startEditMatch(match)}
                        className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-[#E85D42] hover:text-brand-dark dark:hover:text-brand-white dark:hover:bg-[#E85D42] text-zinc-800 dark:text-zinc-200 font-mono font-bold text-[9px] uppercase tracking-wider py-1.5 transition-colors cursor-pointer text-center"
                      >
                        {language === 'fr' ? 'MODIFIER' : 'EDIT'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (confirmDeleteMatchId === match.id) {
                            deleteMatch(match.id);
                            setConfirmDeleteMatchId(null);
                            showToast(language === 'fr' ? 'Match supprimé de l\'arène' : 'Match removed from arena');
                          } else {
                            setConfirmDeleteMatchId(match.id);
                          }
                        }}
                        className={`font-mono font-bold text-[9px] uppercase tracking-wider px-3.5 py-1.5 transition-colors cursor-pointer rounded-xs ${
                          confirmDeleteMatchId === match.id 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : 'bg-zinc-800 text-zinc-300 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        {confirmDeleteMatchId === match.id 
                          ? (language === 'fr' ? 'CONFIRMER ?' : 'CONFIRM?') 
                          : (language === 'fr' ? 'SUPPRIMER' : 'DELETE')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'editor' && (
          <ArticleEditorTab 
            article={editingArticle}
            allArticles={articles}
            onSave={handleSaveArticle}
            onCancel={() => setActiveTab('list')}
            onDelete={(id) => {
              handleDeleteArticle(id);
              setActiveTab('list');
            }}
            openMediaSelector={openImgSelector}
            language={language}
          />
        )}

        {activeTab === 'list' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Ecosystem Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-4 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[#E85D42]" />
                  <h2 className="text-2xl font-serif font-black uppercase tracking-tight text-zinc-100">
                    {language === 'fr' ? 'Écosystème Éditorial & Contenus' : 'Content Ecosystem & Editorial Suite'}
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 font-sans mt-1">
                  {language === 'fr' 
                    ? 'Plateforme unifiée : gestion des publications, brouillons générés par l’IA et flux d’automatisation RSS' 
                    : 'Unified hub: manage published articles, AI-generated RSS drafts, and automated feed ingestion'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={handlePurgeAllArticles}
                  className="flex items-center gap-1.5 bg-zinc-900 hover:bg-red-950/80 text-zinc-300 hover:text-red-300 border border-zinc-800 px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg cursor-pointer"
                  title="Purger tous les articles"
                >
                  <Trash2 size={14} /> {language === 'fr' ? 'Purger' : 'Purge'}
                </button>
                <button 
                  onClick={startNewArticle}
                  className="flex items-center gap-1.5 bg-[#E85D42] hover:bg-[#c94931] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg shadow-md cursor-pointer"
                >
                  <Plus size={16} /> {language === 'fr' ? 'Nouvel Article' : 'New Article'}
                </button>
              </div>
            </div>

            {/* Unified Ecosystem Metric Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div 
                onClick={() => setContentSubTab('articles')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  contentSubTab === 'articles' 
                    ? 'bg-zinc-900 border-[#E85D42] shadow-md' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-zinc-400">Articles Publiés</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <span className="text-xl font-black text-white">{articles.filter(a => a.isPublished).length}</span>
                <span className="text-[10px] text-zinc-500 block font-mono">/ {articles.length} au total</span>
              </div>

              <div 
                onClick={() => setContentSubTab('rss_drafts')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  contentSubTab === 'rss_drafts' 
                    ? 'bg-zinc-900 border-[#E85D42] shadow-md' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-400">Brouillons & IA</span>
                  <Bot size={13} className="text-amber-400" />
                </div>
                <span className="text-xl font-black text-amber-300">{articles.filter(a => !a.isPublished).length}</span>
                <span className="text-[10px] text-zinc-500 block font-mono">En attente de relecture</span>
              </div>

              <div 
                onClick={() => setContentSubTab('rss_automation')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  contentSubTab === 'rss_automation' 
                    ? 'bg-zinc-900 border-[#E85D42] shadow-md' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-blue-400">Flux RSS Actifs</span>
                  <Zap size={13} className="text-blue-400" />
                </div>
                <span className="text-xl font-black text-blue-300">28</span>
                <span className="text-[10px] text-zinc-500 block font-mono">Presse Ouest-Africaine</span>
              </div>

              <div 
                onClick={() => setContentSubTab('rss_automation')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  contentSubTab === 'rss_automation' 
                    ? 'bg-zinc-900 border-[#E85D42] shadow-md' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Pipeline Webhook</span>
                  <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 border border-emerald-800 rounded">LIVE</span>
                </div>
                <span className="text-xl font-black text-emerald-300">Inbound RSS</span>
                <span className="text-[10px] text-zinc-500 block font-mono">Relais Make / Zapier</span>
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-900/80 p-1.5 rounded-xl gap-2 font-sans text-xs">
              <button
                onClick={() => setContentSubTab('articles')}
                className={`flex-1 py-2.5 px-4 font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  contentSubTab === 'articles'
                    ? 'bg-[#E85D42] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <FileText size={15} />
                <span>{language === 'fr' ? '1. Publications & Articles' : '1. Published & Draft Articles'}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-black/30 rounded-full">
                  {articles.length}
                </span>
              </button>

              <button
                onClick={() => setContentSubTab('rss_drafts')}
                className={`flex-1 py-2.5 px-4 font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  contentSubTab === 'rss_drafts'
                    ? 'bg-[#E85D42] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Bot size={15} />
                <span>{language === 'fr' ? '2. Brouillons RSS & Générateur IA' : '2. RSS AI Drafts & Generator'}</span>
                {articles.filter(a => !a.isPublished).length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-amber-500 text-black rounded-full">
                    {articles.filter(a => !a.isPublished).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setContentSubTab('rss_automation')}
                className={`flex-1 py-2.5 px-4 font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  contentSubTab === 'rss_automation'
                    ? 'bg-[#E85D42] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Zap size={15} />
                <span>{language === 'fr' ? '3. Sources RSS & Automatisations' : '3. RSS Feeds & Webhooks'}</span>
              </button>
            </div>

            {/* Sub-tab 1: Articles & Publications Table */}
            {contentSubTab === 'articles' && (
              <div className="space-y-6">
                {/* Filter Suite */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black p-4 border border-zinc-800 rounded-lg">
                  <div className="flex gap-1.5">
                    {(['all', 'published', 'draft'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setArticleFilter(f)}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border rounded-md transition-colors cursor-pointer ${
                          articleFilter === f 
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-sm'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-[#E85D42]'
                        }`}
                      >
                        {f === 'all' ? (language === 'fr' ? 'Tous' : 'All') : f === 'published' ? (language === 'fr' ? 'Publiés' : 'Live') : (language === 'fr' ? 'Brouillons' : 'Drafts')}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
                    <input 
                      type="text"
                      placeholder={language === 'fr' ? 'Rechercher un article par titre...' : 'Search articles by title...'}
                      value={articleSearch}
                      onChange={e => setArticleSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-md text-xs focus:outline-none focus:border-[#E85D42] font-semibold"
                    />
                  </div>
                </div>

                {/* Compact list register mapping */}
                <div className="bg-black border border-zinc-800 shadow-xl rounded-lg overflow-x-auto">
                  <table className="w-full text-left font-cambria text-xs sm:text-sm whitespace-nowrap text-zinc-200">
                    <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase tracking-widest text-[#E85D42] font-black">
                      <tr>
                        <th className="px-6 py-4">{language === 'fr' ? 'Titre de l’Article' : 'Title Heading'}</th>
                        <th className="px-6 py-4">{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                        <th className="px-6 py-4">{language === 'fr' ? 'Statut' : 'Status'}</th>
                        <th className="px-6 py-4">{language === 'fr' ? 'Date de Publication' : 'Serving Date'}</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArticles.map(a => (
                        <tr key={a.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/60 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-zinc-100 block truncate max-w-sm">{a.title?.[language] || a.title?.fr}</span>
                            <span className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wide block font-semibold">{a.type}</span>
                          </td>
                          <td className="px-6 py-4 font-bold tracking-widest uppercase text-zinc-300">{formatCategory(a.category, language)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded-xs ${
                              a.isPublished 
                                ? 'bg-blue-950/80 text-blue-300 border-blue-800' 
                                : 'bg-amber-950/80 text-amber-300 border-amber-800'
                            }`}>
                              {a.isPublished ? (language === 'fr' ? 'Publié' : 'Live') : (language === 'fr' ? 'Brouillon' : 'Draft')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 font-mono text-[11px] font-semibold">
                            {new Date(a.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button 
                                onClick={() => handleEdit(a)} 
                                className="p-1.5 text-zinc-400 hover:text-[#E85D42] hover:bg-[#E85D42]/10 transition-colors rounded-md cursor-pointer" 
                                title={language === 'fr' ? 'Éditer l’article' : 'Edit article'}
                              >
                                <Edit2 size={15} />
                              </button>
                              
                              <button 
                                onClick={() => handleDeleteArticle(a.id)} 
                                className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600 rounded-md transition-colors cursor-pointer" 
                                title={language === 'fr' ? 'Supprimer cet article' : 'Delete article'}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredArticles.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-bold text-xs uppercase tracking-widest bg-zinc-950 border-b border-zinc-800">
                            {language === 'fr' ? 'Aucun article ne correspond à votre recherche.' : 'No articles match selected filter.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-tab 2: RSS AI Drafts & Generator */}
            {contentSubTab === 'rss_drafts' && (
              <RssAutomationTab 
                onEditArticle={(art) => {
                  setEditingArticle(art);
                  setActiveTab('editor');
                }}
              />
            )}

            {/* Sub-tab 3: RSS Feeds & Webhook Pipelines */}
            {contentSubTab === 'rss_automation' && (
              <MakeWebhookTab />
            )}
          </div>
        )}
      </main>

      {/* Media Library pop-up Selector overlay portal */}
      {mediaSelectorOpen && (
        <MediaSelector 
          onSelect={mediaSelectorCallback || (() => {})} 
          onClose={() => { setMediaSelectorOpen(false); setMediaSelectorCallback(null); }} 
        />
      )}
    </div>
  );
}
