import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Article, Language, Match } from './types';
import { sampleArticles } from './data';
import { seedArticles, seedComments, seedMessages, seedMedia, seedSubscribers, seedMatches, seedSiteSettings } from './data/seedData';
import {
  fetchAllArticles, 
  saveArticle, 
  deleteArticle as firestoreDeleteArticle, 
  subscribeToArticles, 
  addSubscriberEmail, 
  updateSiteSettings as firestoreUpdateSiteSettings,
  fetchSiteSettings,
  addComment as firestoreAddComment,
  deleteComment as firestoreDeleteComment,
  saveFirestoreDoc,
  deleteFirestoreDoc,
  fetchFirestoreCollection,
  fetchAllComments,
  subscribeToAllComments,
  saveCommentToFirestore,
  fetchAllAds,
  subscribeToAds,
  saveAdToFirestore,
  deleteAdFromFirestore
} from './firebase/db';
import { hashPassword } from './lib/authCrypto';
import { sanitizeFirestorePayload } from './lib/imageUtils';
import { trackConversion } from './lib/telemetry';
import { triggerInAppToast } from './lib/notificationSound';

function dedupeArticles(list) {
  const seen = new Set();
  const out = [];
  for (const a of list) {
    const id = String(a && a.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id); out.push(a);
  }
  return out;
}
function dedupeComments(list: any[]): any[] {
  const seen = new Set();
  const out: any[] = [];
  for (const c of list) {
    const id = String(c && c.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id); out.push(c);
  }
  return out;
}
const cloudSave = (col: string, id: string, data: any) => {
  return saveFirestoreDoc(col, id, data);
};
const cloudDelete = (col: string, id: string) => {
  deleteFirestoreDoc(col, id).catch(() => {});
};
const cloudSaveUserProfile = (email: string, data: any) => {
  saveFirestoreDoc('users', email, data).catch(() => {});
};
const LOCAL_ARTICLES_KEY = "senperspective-local-articles-v1";
/** Max length of an inline `data:` URL we are willing to persist locally (~12 KB). */
const MAX_LOCAL_DATA_URL_CHARS = 12000;

/**
 * Recursively strip oversized inline base64 `data:` URLs from a value before it
 * is written to localStorage. Hosted (https://) URLs pass through untouched.
 *
 * WHY: a single cover image kept as a base64 Data URL (1-3 MB) instantly blows
 * the ~5 MB per-origin localStorage quota and crashes the admin editor with
 * QuotaExceededError. Images must live in Firebase Storage, not localStorage.
 */
function stripHeavyMedia<T>(value: T, seen?: WeakSet<object>): T {
  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.length > MAX_LOCAL_DATA_URL_CHARS) {
      return '' as unknown as T;
    }
    return value;
  }
  if (!value || typeof value !== 'object') return value;
  const visited = seen || new WeakSet<object>();
  if (visited.has(value as unknown as object)) return value;
  visited.add(value as unknown as object);
  if (Array.isArray(value)) {
    return value.map(v => stripHeavyMedia(v, visited)) as unknown as T;
  }
  const out: Record<string, any> = {};
  const src = value as Record<string, any>;
  for (const k of Object.keys(src)) {
    out[k] = stripHeavyMedia(src[k], visited);
  }
  return out as T;
}

/**
 * Quota-safe localStorage write. Never throws: if the payload does not fit it
 * is progressively trimmed (newest entries first) and, as a last resort, the
 * key is cleared instead of letting a QuotaExceededError crash the render.
 */
function safeLocalWrite(key: string, payload: any): void {
  const write = (data: any) => localStorage.setItem(key, JSON.stringify(data));
  try {
    write(payload);
    return;
  } catch (e) { /* fall through to trimmed retries */ }

  if (Array.isArray(payload)) {
    for (const limit of [50, 25, 10, 1, 0]) {
      try {
        write(payload.slice(0, limit));
        return;
      } catch (e) { /* keep shrinking */ }
    }
  }
  try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
}

function persistArticleLocally(a) {
  try {
    const raw = localStorage.getItem(LOCAL_ARTICLES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(arr) ? arr : [];
    // Strip oversized base64 payloads BEFORE touching the ~5 MB quota.
    const safe = stripHeavyMedia(a);
    const idx = list.findIndex(function(x){ return String(x && x.id) === String(safe && safe.id); });
    if (idx >= 0) list[idx] = safe; else list.unshift(safe);
    safeLocalWrite(LOCAL_ARTICLES_KEY, list.slice(0, 200));
  } catch (e) {}
}
function removeLocalArticleBackup(id) {
  try {
    const raw = localStorage.getItem(LOCAL_ARTICLES_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    localStorage.setItem(LOCAL_ARTICLES_KEY, JSON.stringify(arr.filter(function(x){ return String(x && x.id) !== String(id); })));
  } catch (e) {}
}
function loadArticlesFromLocalBackup() {
  try {
    const raw = localStorage.getItem(LOCAL_ARTICLES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function persistCommentLocally(c: CommentItem) {
  try {
    const raw = localStorage.getItem('senperspective-local-comments-v1');
    const arr = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(arr) ? arr : [];
    const safe = stripHeavyMedia(c);
    const idx = list.findIndex(x => String(x && x.id) === String(safe && safe.id));
    if (idx >= 0) list[idx] = safe; else list.unshift(safe);
    safeLocalWrite('senperspective-local-comments-v1', list.slice(0, 500));
  } catch (e) { /* localStorage unavailable */ }
}
function loadCommentsFromLocalBackup(): CommentItem[] {
  try {
    const raw = localStorage.getItem('senperspective-local-comments-v1');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function removeLocalCommentBackup(id: string) {
  try {
    const raw = localStorage.getItem('senperspective-local-comments-v1');
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    localStorage.setItem('senperspective-local-comments-v1', JSON.stringify(arr.filter(x => String(x && x.id) !== String(id))));
  } catch (e) { /* localStorage unavailable */ }
}
const supabase: any = null;
const resolveApiUrl = (url: string) => url;

export interface FriendContact {
  email: string;
  name: string;
  role: string;
  avatar: string;
  status: string;
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'gif' | string;
  name: string;
  date: string;
}

export interface AdItem {
  id: string;
  name: string;
  imageUrl: string;
  targetUrl: string;
  position: 'header' | 'sidebar' | 'in-article' | 'far-left' | 'homepage-between' | 'sidebar-cafe' | 'sidebar-ter' | 'announcement' | string;
  active: boolean;
  tag?: string;
  description?: string;
  ctaText?: string;
  impressions?: number;
  clicks?: number;
  width?: string | number;
  height?: string | number;
  title?: { fr: string; en: string } | string | any;
  bgColor?: string;
  textColor?: string;
  icon?: string;
  isAnnouncement?: boolean;
}

export interface NotificationPreferences {
  messages: boolean;
  newsletters: boolean;
  newPublishes: boolean;
  generalNews: boolean;
  browserPush?: boolean;
  emailAlerts?: boolean;
}

export interface ReaderProfile {
  id: string;
  name: string;
  email: string;
  uid?: string;
  avatarUrl?: string;
  role?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  isMongoDB?: boolean;
  isSupabaseAuthSession?: boolean;
  coverPhotoUrl?: string;
  streak?: number;
  readingTime?: number;
  hidePersonalInfo?: boolean;
  hideEmail?: boolean;
  bio?: string;
  accolades?: string[];
  notificationPreferences?: NotificationPreferences;
  suspended?: boolean;
}

export interface UserAccount {
  id?: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  isOnline?: boolean;
  authType: 'password' | 'pin';
  password?: string;
  pin?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  registeredAt?: string;
  isPrivate?: boolean;
  friends?: string[];
  pendingFriendRequests?: string[];
  sentFriendRequests?: string[];
}

export interface UserInteraction {
  id: string;
  email: string;
  type: string; // 'read' | 'like_comment' | 'dislike_comment' | 'post_comment' | 'share_abdel' | 'like_article' | 'edit_comment' | 'delete_comment'
  date: string;
  detail: { fr: string; en: string };
  link?: string;
}

export interface DirectMessage {
  id: string;
  sender: string; // email
  receiver: string; // email
  text: string;
  date: string;
  timestamp?: number;
  read?: boolean;
  reactions?: Record<string, string[]>;
  attachment?: {
    type: 'article' | 'match' | 'comment' | 'dispatch' | 'profile' | 'general' | string;
    id: string;
    title: string;
    link: string;
    subtitle?: string;
    image?: string;
  };
}

export interface CommentItem {
  id: string;
  articleId: string;
  articleTitle: string;
  author: string;
  email?: string;
  text: string;
  date: string;
  isApproved: boolean;
  /** True when the RTDB write failed but the local backup kept the comment.
   *  UI can show "pending sync / retry" instead of pretending it was saved. */
  pendingSync?: boolean;
  ipAddress?: string;
  avatarUrl?: string;
  isMember?: boolean;
  parentId?: string;
  replyTo?: string;
  likes?: number;
  dislikes?: number;
  likedBy?: string[]; // array of user emails who liked
  dislikedBy?: string[]; // array of user emails who disliked
  attachment?: {
    type: 'article' | 'match' | 'comment' | 'dispatch' | 'profile' | 'general' | string;
    id: string;
    title: string;
    link: string;
    subtitle?: string;
    image?: string;
  };
}

export interface NotificationItem {
  id: string;
  email: string;
  text: { fr: string; en: string };
  date: string;
  isRead: boolean;
  link?: string;
  category?: 'messages' | 'newsletters' | 'newPublishes' | 'generalNews' | 'system' | 'social';
}

export interface SubscriberItem {
  email: string;
  date: string;
}

interface AppState {
  theme: 'light' | 'dark';
  isSyncing: boolean;
  isLoadingArticles: boolean;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  savedArticles: string[];
  toggleSavedArticle: (id: string) => void;
  articles: Article[];
  setArticles: (articles: Article[]) => void;
  loadArticles: () => Promise<Article[]>;
  syncFromSupabase: () => Promise<void>;
  addArticle: (article: Article) => Promise<{ success: boolean; error?: string }>;
  updateArticle: (article: Article) => Promise<{ success: boolean; error?: string }>;
  deleteArticle: (id: string) => void;
  purgeAllArticles: () => Promise<void>;
  media: MediaItem[];
  addMedia: (m: MediaItem) => void;
  deleteMedia: (id: string) => void;
  updateMediaName: (id: string, name: string) => void;
  ads: AdItem[];
  loadAds: () => Promise<void>;
  saveAd: (ad: AdItem) => void;
  deleteAd: (id: string) => void;
  comments: CommentItem[];
  addComment: (comment: CommentItem) => void;
  approveComment: (id: string) => void;
  deleteComment: (id: string, requesterEmail?: string) => void;
  updateCommentText: (id: string, text: string, requesterEmail?: string) => boolean;
  likeComment: (id: string, userEmail: string) => void;
  dislikeComment: (id: string, userEmail: string) => void;
  directMessages: DirectMessage[];
  sendDirectMessage: (msg: Omit<DirectMessage, 'id' | 'date'>) => void;
  deleteDirectMessage: (id: string) => void;
  markDirectMessagesAsRead: (contactEmail: string, userEmail: string) => void;
  activeMessengerContact: string;
  setActiveMessengerContact: (email: string) => void;
  messengerTextScale: 'normal' | 'large' | 'xlarge';
  setMessengerTextScale: (scale: 'normal' | 'large' | 'xlarge') => void;
  reactToDirectMessage: (messageId: string, reaction: string, userEmail?: string) => void;
  syncPreferencesToFirebase: (customPrefs?: any) => Promise<void>;
  friends: FriendContact[];
  setFriends: (friends: any) => void;
  addFriend: (friend: FriendContact) => void;
  deleteFriend: (email: string) => void;
  abdelPrompts: { fr: string[]; en: string[] };
  updateAbdelPrompts: (prompts: { fr: string[]; en: string[] }) => void;
  sendWarningNotification: (email: string, textFr: string, textEn: string) => void;
  notifications: NotificationItem[];
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  addNotification: (notification: NotificationItem) => void;
  clearNotifications: (email: string, scope?: 'all' | 'social') => void;
  deleteNotification: (id: string) => void;
  subscribers: SubscriberItem[];
  addSubscriber: (email: string) => void;
  deleteSubscriber: (email: string) => void;
  readerProfile: ReaderProfile | null;
  setReaderProfile: (profile: ReaderProfile | null) => void;
  showProfileDrawer: boolean;
  setShowProfileDrawer: (show: boolean) => void;
  activeProfileTab: string;
  setActiveProfileTab: (tab: string) => void;
  pendingShareArticleId: string;
  setPendingShareArticleId: (id: string) => void;
  showSignUpModal: boolean;
  setShowSignUpModal: (show: boolean) => void;
  authTab: 'login' | 'register';
  setAuthTab: (tab: 'login' | 'register') => void;
  users: UserAccount[];
  interactions: UserInteraction[];
  registerUser: (user: UserAccount) => boolean;

  updatePrivacy: (email: string, isPrivate: boolean) => void;
  sendFriendRequest: (fromEmail: string, toEmail: string) => void;
  acceptFriendRequest: (fromEmail: string, toEmail: string) => void;
  removeFriend: (email1: string, email2: string) => void;

  loginUser: (email: string, credential: string, authType: 'password' | 'pin') => Promise<boolean>;
  addInteraction: (email: string, type: string, detail: { fr: string; en: string }, link?: string) => void;
  notificationResponses: Record<string, 'accepted' | 'disputed'>;
  respondToNotification: (notifId: string, response: 'accepted' | 'disputed') => void;
  siteSettings: {
    isMaintenanceMode?: boolean;
    maintenanceMessageFr?: string;
    maintenanceMessageEn?: string;
    abdelIntroMessageFr?: string;
    abdelIntroMessageEn?: string;
    dossiers?: any[];
    announcements?: any[];
    fontPairing?: string;
    glassIntensity?: string;
    headerStyle?: string;
    aiModelMode?: string;
    abdelAiProvider?: string;
    seoTitleSuffix?: string;
    seoCanonicalBase?: string;
    seoDefaultDesc?: string;
    seoDefaultKeywords?: string;
    seoOgImage?: string;
    seoRobotsIndex?: string;
    seoGoogleSiteVerification?: string;
    googleChatWebhook?: string;
    ga4MeasurementId?: string;
    databaseProvider?: string;
    homeSections?: string[];
    writingIdentity?: {
      writerNameFr?: string;
      writerNameEn?: string;
      publicationNameFr?: string;
      publicationNameEn?: string;
      bylineTemplateFr?: string;
      bylineTemplateEn?: string;
      voiceToneFr?: string;
      voiceToneEn?: string;
      editorialStanceFr?: string;
      editorialStanceEn?: string;
      creditLineFr?: string;
      creditLineEn?: string;
    };
    globalWritingPrompt?: string;
    headerNavItems?: { id: string; labelFr: string; labelEn: string; url: string; enabled: boolean; isExternal?: boolean; }[];
    showHeaderTopBar?: boolean;
    showHeaderTicker?: boolean;
    categories?: { id: string; fr: string; en: string; icon?: string; }[];
    tags?: { id: string; fr: string; en: string; }[];
    keywords?: string[];
    siteName: string;
    boukariCorpLogo?: string;
    accentColor: string;
    editorialPhone: string;
    supportEmail: string;
    officeAddress: string;
    footerDescFr?: string;
    footerDescEn?: string;
    boukariCorpUnitLabelFr?: string;
    boukariCorpUnitLabelEn?: string;
    boukariCorpName?: string;
    footerCopyrightFr?: string;
    footerCopyrightEn?: string;
    footerLocationText?: string;
    paywallThreshold: number;
    paywallEnabled: boolean;
    cookieConsentEnabled?: boolean;
    showDraftPoliciesInFooter?: boolean;
    privacyPolicyTextFr?: string;
    privacyPolicyTextEn?: string;
    dataRetentionDays?: number;
    sportsQuadrantSelection?: {
      zone1Type?: 'match' | 'article';
      zone1Id?: string;
      zone2Type?: 'match' | 'article';
      zone2Id?: string;
      zone3Type?: 'match' | 'article';
      zone3Id?: string;
      zone4Type?: 'match' | 'article';
      zone4Id?: string;
    };
    analystDispatches: {
      id: string;
      time: string;
      contentFr: string;
      contentEn: string;
      level?: string;
    }[];
    leMondeDispatches?: {
      id: string;
      time: string;
      tagFr: string;
      tagEn: string;
      titleFr: string;
      titleEn: string;
      excerptFr?: string;
      excerptEn?: string;
    }[];
    coastAndHarbor: {
      tideTime: string;
      tideValue: string;
      goreeCount: string;
      goreeStatus: string;
      meteoTemp: string;
      meteoCondFr: string;
      meteoCondEn: string;
      windValue: string;
      windGusts: string;
      galeWarningFr?: string;
      galeWarningEn?: string;
      goreeNoteFr?: string;
      goreeNoteEn?: string;
    };
    dailyWisdom: {
      wolof: string;
      translationFr: string;
      translationEn: string;
      sourceFr: string;
      sourceEn: string;
    };
    trendingCount: number;
    mostReadCount: number;
    curatedTrendingArticleIds?: string[];
    curatedLatestNewsArticleIds?: string[];
    curatedDossierArticleIds?: string[];
  };
  updateSiteSettings: (settings: Partial<AppState['siteSettings']>) => void;
  loadSiteSettings: () => Promise<void>;
  deleteUser: (email: string) => void;
  updateUserRole: (email: string, role: string) => void;
  updateUserSecurity: (email: string, emailVerified: boolean, mfaEnabled: boolean) => void;
  updateUserPassword: (email: string, password: string) => void;
  updateUserPin: (email: string, pin: string) => void;
  purgeDatabaseAndArticles: () => Promise<void>;
  seedSampleArticles: () => void;
  loadAllDataFromMongoDB: () => Promise<void>;
  loadComments: () => Promise<void>;
  matches: Match[];
  updateMatch: (matchId: string, updated: Partial<Match>) => void;
  addMatch: (match: Match) => void;
  deleteMatch: (matchId: string) => void;
}

export const syncPreferencesToFirestore = async (customPrefs?: any, explicitEmail?: string) => {
  try {
    const store = useStore.getState();
    const email = explicitEmail || store.readerProfile?.email;
    const currentPrefs = {
      theme: store.theme,
      language: store.language,
      savedArticles: store.savedArticles,
      notificationPreferences: store.notificationPreferences,
      messengerTextScale: store.messengerTextScale || 'normal',
      ...customPrefs
    };

        if (email && email !== 'visitor@senperspective.com' && email !== 'anonymous') {
          const cleanEmail = email.toLowerCase().trim();
          // Persist preferences in the user's profile document (MongoDB Atlas via /api/users)
          await cloudSaveUserProfile(cleanEmail, { preferences: currentPrefs });
        } else {
      let deviceId = '';
      if (typeof window !== 'undefined' && window.localStorage) {
        deviceId = localStorage.getItem('perspective_device_id') || '';
        if (!deviceId) {
          deviceId = 'dev_' + Math.random().toString(36).substring(2, 12);
          localStorage.setItem('perspective_device_id', deviceId);
        }
        localStorage.setItem('perspective_preferences', JSON.stringify(currentPrefs));
      }
    }
  } catch (err) {
    console.warn("[Preferences] Sync notice:", err);
  }
};

/**
 * Size-guarded JSON storage for zustand/persist.
 *
 * Browsers enforce a ~5-10 MB quota on localStorage. When the persisted
 * state exceeds that quota (historically the full `articles` array with
 * rich bilingual bodies), `localStorage.setItem` throws a *synchronous*
 * QuotaExceededError that crashes the React render cycle:
 *
 *   "Failed to execute 'setItem' on 'Storage': Setting the value of
 *    'perspective-group-storage' exceeded the quota."
 *
 * This wrapper converts that crash into a graceful no-op:
 *   1. On QuotaExceededError it clears the stale key and retries once.
 *   2. If the retry still exceeds the quota, persistence is silently
 *      skipped — the in-memory store remains valid; only the localStorage
 *      copy is stale. The app keeps rendering without interruption.
 */
function createSafeJSONStorage() {
  const raw: Storage = {
    getItem(key: string): string | null {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    setItem(key: string, value: string): void {
      try {
        localStorage.setItem(key, value);
      } catch (e: any) {
        const errName = e?.name ?? '';
        const errMsg = e?.message ?? '';
        const isQuotaError =
          errName === 'QuotaExceededError' ||
          /quota/i.test(errName) ||
          /quota/i.test(errMsg) ||
          e?.code === 22; // WebKit DOM error code for quota exceeded
        if (isQuotaError) {
          // Clear stale data and retry once — it may fit after clearing.
          try { localStorage.removeItem(key); } catch {}
          try { localStorage.setItem(key, value); } catch {}
          // If the retry still fails, silently skip persistence.
          // The in-memory Zustand store is still the source of truth.
        }
      }
    },
    removeItem(key: string): void {
      try { localStorage.removeItem(key); } catch {}
    },
    key(index: number): string | null {
      try { return localStorage.key(index); } catch { return null; }
    },
    get length(): number {
      try { return localStorage.length; } catch { return 0; }
    },
    clear(): void {
      try { localStorage.clear(); } catch {}
    },
  };
  return createJSONStorage(() => raw);
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      isSyncing: false,
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: next });
        syncPreferencesToFirestore({ theme: next });
      },
      language: 'fr',
      setLanguage: (lang) => {
        set({ language: lang });
        syncPreferencesToFirestore({ language: lang });
      },
      activeMessengerContact: 'contact@senperspective.com',
      setActiveMessengerContact: (email: string) => set({ activeMessengerContact: (email || '').toLowerCase().trim() }),
      messengerTextScale: 'normal',
      setMessengerTextScale: (scale: 'normal' | 'large' | 'xlarge') => {
        set({ messengerTextScale: scale });
        syncPreferencesToFirestore({ messengerTextScale: scale });
      },
      reactToDirectMessage: (messageId: string, reaction: string, userEmail?: string) => {
        const dms = get().directMessages || [];
        const cleanEmail = (userEmail || get().readerProfile?.email || 'visitor@senperspective.com').toLowerCase().trim();
        let updatedReactions: Record<string, string[]> = {};
        const updatedDms = dms.map(dm => {
          if (dm.id === messageId) {
            const reactions = { ...(dm.reactions || {}) };
            const currentUsers = reactions[reaction] || [];
            if (currentUsers.includes(cleanEmail)) {
              reactions[reaction] = currentUsers.filter(e => e !== cleanEmail);
              if (reactions[reaction].length === 0) delete reactions[reaction];
            } else {
              reactions[reaction] = [...currentUsers, cleanEmail];
            }
            updatedReactions = reactions;
            return { ...dm, reactions };
          }
          return dm;
        });
        set({ directMessages: updatedDms });
        const updatedMsg = updatedDms.find(dm => dm.id === messageId);
        if (updatedMsg) { cloudSave('messages', messageId, updatedMsg); }
      },
      syncPreferencesToFirebase: async (customPrefs?: any) => {
        await syncPreferencesToFirestore(customPrefs);
      },
      showSignUpModal: false,
      setShowSignUpModal: (show) => set({ showSignUpModal: show }),
      authTab: 'login',
      setAuthTab: (tab) => set({ authTab: tab }),
      savedArticles: [],
      toggleSavedArticle: (id) => {
        const saved = Array.isArray(get().savedArticles) ? get().savedArticles : [];
        const isSaving = !saved.includes(id);
        const email = get().readerProfile?.email || 'anonymous';
        const art = (Array.isArray(get().articles) ? get().articles : []).find(a => a.id === id);
        
        let nextSaved: string[];
        if (saved.includes(id)) {
          nextSaved = saved.filter((s) => s !== id);
        } else {
          nextSaved = [...saved, id];
        }
        set({ savedArticles: nextSaved });
        syncPreferencesToFirestore({ savedArticles: nextSaved });

        if (art && email !== 'anonymous') {
          get().addInteraction(
            email,
            'like_article',
            {
              fr: isSaving ? `A enregistré l'article "${art.title?.fr || 'Sans titre'}" dans ses favoris.` : `A retiré l'article "${art.title?.fr || 'Sans titre'}" de ses favoris.`,
              en: isSaving ? `Saved article "${art.title?.en || 'Untitled'}" to favorites.` : `Removed article "${art.title?.en || 'Untitled'}" from favorites.`
            },
            `/article/${art.slug}`
          );
        }
      },
      articles: seedArticles,
      isLoadingArticles: false,
      setArticles: (articles) => set({ articles }),
      loadArticles: async () => {
        const preExisting = Array.isArray(get().articles) ? [...get().articles] : [];
        const localBackup = loadArticlesFromLocalBackup();
        if (preExisting.length === 0 && localBackup.length > 0) { set({ articles: localBackup }); }
        set({ isLoadingArticles: true });
        // --- Legacy localStorage article recovery --------------------------
        // Earlier builds persisted articles in localStorage. The current build
        // persists only UI preferences (see partialize), and Firestore was
        // empty/unavailable — so articles created before Firestore existed
        // would vanish on every reload. Rescue them once per session.
        const recovered: Article[] = [];
        try {
          const seedIds = new Set(seedArticles.map(a => String(a.id)));
          const seen = new Set<string>();
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            const raw = localStorage.getItem(key);
            if (!raw || raw.length < 20 || !raw.includes('"articles"')) continue;
            let parsed: any = null;
            try { parsed = JSON.parse(raw); } catch { continue; }
            const list = Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed?.state?.articles)
                ? parsed.state.articles
                : Array.isArray(parsed?.articles)
                  ? parsed.articles
                  : null;
            if (!list) continue;
            for (const item of list) {
              const id = String(item?.id || '');
              if (!id || seen.has(id) || seedIds.has(id)) continue;
              if (!item?.title && !item?.slug && !item?.content) continue;
              seen.add(id);
              recovered.push(item as Article);
            }
          }
        } catch { /* recovery is best-effort — never block startup */ }

        const backfillToFirestore = (list: Article[]) => {
          // Fire-and-forget: once Firestore exists AND the visitor is an
          // authenticated admin, rescued articles get persisted permanently.
          for (const a of list) {
            import('./firebase/db')
              .then(m => m.saveArticleToFirestore(a))
              .catch(() => {});
          }
        };

        try {
          const remote = await fetchAllArticles();
          if (remote && remote.length > 0) {
            let remoteList = remote;
            if (recovered.length > 0) {
              const remoteIds = new Set(remote.map(a => String(a.id)));
              const missing = recovered.filter(a => !remoteIds.has(String(a.id)));
              if (missing.length > 0) {
                // Remote first (it is fresh + date-sorted), rescued legacy
                // articles appended after so they don't pollute the top.
                remoteList = [...remote, ...missing];
                backfillToFirestore(missing);
              }
            }
            // Remote-first merge: the cloud is the source of truth, so its
            // articles (versions AND order) win over stale locally-persisted
            // copies. Local-only articles (created offline / drafts not yet
            // synced) are preserved after the remote ones. This guarantees
            // newly published articles appear at the TOP on every device,
            // instead of being appended at the end behind stale cache.
            const merged = dedupeArticles([...remoteList, ...preExisting, ...localBackup]);
            set({ articles: merged, isLoadingArticles: false });
            return remoteList;
          }
          // Firestore empty → show rescued + seed content immediately
          if (recovered.length > 0) backfillToFirestore(recovered);
          const fallback = dedupeArticles([...preExisting, ...localBackup, ...recovered, ...seedArticles]);
          set({ articles: fallback, isLoadingArticles: false });
          return fallback;
        } catch (err) {
          console.warn('[Firebase] Notice loading articles:', err);
          if (recovered.length > 0) backfillToFirestore(recovered);
          const fallback = dedupeArticles([...preExisting, ...localBackup, ...recovered, ...seedArticles]);
          set({ articles: fallback, isLoadingArticles: false });
          return fallback;
        }
      },
      syncFromSupabase: async () => {
        await get().loadArticles();
      },
      
      loadAllDataFromMongoDB: async () => {
        set({ isSyncing: true, isLoadingArticles: true });
        try {
          const remoteArticles = await fetchAllArticles();
          if (remoteArticles && remoteArticles.length > 0) {
            set({ articles: remoteArticles, isLoadingArticles: false });
          } else {
            set({ articles: seedArticles, isLoadingArticles: false });
          }
          const remoteComments = await fetchAllComments();
          // Merge remote comments with local backup so nothing is lost if the
          // cloud write hasn't propagated yet — the local backup acts as a durable
          // offline cache.
          const localBackup = loadCommentsFromLocalBackup();
          const merged = dedupeComments([...(Array.isArray(remoteComments) ? remoteComments : []), ...localBackup]);
          set({ comments: merged });
        } catch (err) {
          console.error("[Store] loadAllDataFromMongoDB notice:", err);
          set({ comments: loadCommentsFromLocalBackup() });
        } finally {
          set({ isSyncing: false });
        }
      },
      loadComments: async () => {
        try {
          const remoteComments = await fetchAllComments();
          // FIX (comments disappearing on reload): never clobber the store with
          // an empty list. If remote data exists, merge it with the local backup
          // (deduped by id); if remote is empty, keep the current store state —
          // the realtime listener will populate it when data arrives.
          if (remoteComments && remoteComments.length > 0) {
            const localBackup = loadCommentsFromLocalBackup();
            set({ comments: dedupeComments([...remoteComments, ...localBackup]) });
          }
        } catch (err) {
          console.warn("[Firebase] loadComments failed:", err);
          // On error keep existing store state — the realtime listener will
          // reconcile when it can.
        }
      },
      addArticle: async (article) => {
        persistArticleLocally(article);
        set({ articles: dedupeArticles([article, ...(Array.isArray(get().articles) ? get().articles : [])]) });
        try {
          const clean = await sanitizeFirestorePayload(article as any);
          await saveArticle({ ...article, ...clean });
        } catch (err) {
          console.error("[Firebase] Error writing article:", err);
          return { success: false };
        }

        if (article.isPublished) {
          const currentProfile = get().readerProfile;
          const artTitleFr = typeof article.title === 'string' ? article.title : (article.title?.fr || 'Nouvel article');
          const artTitleEn = typeof article.title === 'string' ? article.title : (article.title?.en || 'New article');
          get().addNotification({
            id: 'pub-' + Date.now(),
            email: currentProfile?.email || 'kadersdiaz3@gmail.com',
            text: {
              fr: `Nouvel Article Publie : "${artTitleFr}"`,
              en: `New Article Released: "${artTitleEn}"`
            },
            date: new Date().toISOString().split('T')[0],
            isRead: false,
            category: 'newPublishes',
            link: `/article/${article.slug}`
          });

          // FIX (social notifications): notify the author's followers about the
          // new publication so their Account Drawer "Social" feed shows it.
          (async () => {
            try {
              const authorClean = (article.authorEmail || currentProfile?.email || '').toLowerCase().trim();
              if (!authorClean) return;
              const followerRows: any[] = await fetchFirestoreCollection('followers');
              const followerEmails = Array.from(new Set(followerRows
                .filter((r: any) => String(r?.follower_email || '').toLowerCase().trim() === authorClean)
                .map((r: any) => String(r?.user_id || '').toLowerCase().trim())
                .filter(Boolean)));
              followerEmails.forEach(followerEmail => {
                if (followerEmail === authorClean) return;
                get().addNotification({
                  id: 'notif-follower-publish-' + Date.now() + '-' + Math.random().toString(36).substring(4),
                  email: followerEmail,
                  text: {
                    fr: `${article.author || authorClean} que vous suivez a publié : \"${artTitleFr}\"`,
                    en: `${article.author || authorClean}, whom you follow, published: \"${artTitleEn}\"`
                  },
                  date: new Date().toISOString().split('T')[0],
                  isRead: false,
                  category: 'social',
                  link: `/article/${article.slug}`
                });
              });
            } catch (err) {
              console.warn('[Store] Follower publish notification notice:', err);
            }
          })();
        }
        return { success: true };
      },
      updateArticle: async (article) => {
        persistArticleLocally(article);
        set({ articles: (Array.isArray(get().articles) ? get().articles : []).map(a => a.id === article.id ? article : a) });
        try {
          const clean = await sanitizeFirestorePayload(article as any);
          await saveArticle({ ...article, ...clean });
          return { success: true };
        } catch (err) {
          console.error("[Firebase] Error updating article:", err);
          return { success: false };
        }
      },
      deleteArticle: (id) => {
        set({ articles: (Array.isArray(get().articles) ? get().articles : []).filter(a => a.id !== id) });
        removeLocalArticleBackup(id);
        firestoreDeleteArticle(id).catch(err => {
          console.warn('[Firebase] Notice deleting article:', err);
        });
      },
      purgeAllArticles: async () => {
        const currentArticles = [...(Array.isArray(get().articles) ? get().articles : [])];
        set({ articles: [] });

        if (supabase) {
          await supabase.from('articles').delete().neq('id', '00000000-0000-0000-0000-000000000000').catch(() => {});
        }

        try {
          await fetch(resolveApiUrl('/api/webhooks/make-rss'), { method: 'DELETE' });
        } catch (e) {
          console.error("Error calling DELETE /api/webhooks/make-rss:", e);
        }
      },
      media: seedMedia && seedMedia.length > 0 ? (seedMedia as MediaItem[]) : [],
      addMedia: async (m) => {
        set({ media: [m, ...(get().media || [])] });
        try {
          const clean = await sanitizeFirestorePayload(m as any);
          if (supabase) { await supabase.from('media').upsert({ id: m.id, ...clean }).catch(() => {}); }
        } catch (err) {
          console.error("[Supabase notice] Error adding media:", err);
        }
      },
      deleteMedia: (id) => {
        set({ media: (get().media || []).filter(m => m.id !== id) });
        if (supabase) { supabase.from('media').delete().eq('id', id).catch(() => {}); }
      },
      updateMediaName: (id, name) => {
        set({ media: (get().media || []).map(m => m.id === id ? { ...m, name } : m) });
        if (supabase) { supabase.from('media').update({ name }).eq('id', id).catch(() => {}); }
      },
      ads: [],
      loadAds: async () => {
        try {
          const remoteAds = await fetchAllAds();
          if (remoteAds && remoteAds.length > 0) {
            // Merge remote ads with the seed defaults: replace ads that exist
            // in RTDB, keep seed ads that haven't been overridden remotely.
            const remoteIds = new Set(remoteAds.map(a => String(a?.id || '')));
            const seedOnly = (get().ads || []).filter(a => !remoteIds.has(a.id));
            set({ ads: [...remoteAds, ...seedOnly] });
          }
        } catch (err) {
          console.warn('[Firebase] loadAds notice:', err);
        }
      },
      saveAd: async (ad) => {
        const existing = (get().ads || []).find(a => a.id === ad.id);
        const updatedAds = existing
          ? (get().ads || []).map(a => a.id === ad.id ? ad : a)
          : [ad, ...(get().ads || [])];
        set({ ads: updatedAds });
        // FIX (ads disappearing on reload): persist to Firebase RTDB so changes
        // survive across sessions/devices and are synced in real time.
        try {
          await saveAdToFirestore(ad);
        } catch (err) {
          console.error("[Firebase] Error saving ad:", err);
        }
        try {
          const clean = await sanitizeFirestorePayload(ad as any);
          if (supabase) { await supabase.from('ads').upsert({ id: ad.id, ...clean }).catch(() => {}); }
        } catch (err) {
          console.error("[Supabase notice] Error saving ad:", err);
        }
      },
      deleteAd: (id) => {
        set({ ads: (get().ads || []).filter(a => a.id !== id) });
        // FIX: persist deletion to RTDB so the ad doesn't reappear on reload.
        try {
          deleteAdFromFirestore(id);
        } catch (err) {
          console.error("[Firebase] Error deleting ad:", err);
        }
        if (supabase) { supabase.from('ads').delete().eq('id', id).catch(() => {}); }
      },
      comments: seedComments && seedComments.length > 0 ? (seedComments as CommentItem[]) : [],
      directMessages: seedMessages && seedMessages.length > 0 ? (seedMessages as DirectMessage[]) : [],
      sendDirectMessage: (msg) => {
        const dms = get().directMessages || [];
        const msgId = 'dm-' + Date.now().toString() + Math.random().toString(36).substring(4);
        const cleanSender = (msg.sender || '').toLowerCase().trim();
        const cleanReceiver = (msg.receiver || '').toLowerCase().trim();
        const newMsg = {
          ...msg,
          sender: cleanSender,
          receiver: cleanReceiver,
          id: msgId,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        };
        set({ directMessages: [...dms, newMsg] });

        try {
          cloudSave('messages', msgId, newMsg);
        } catch (err) {
          console.warn("Message sync notice:", err);
        }

        // Trigger notification for receiver
        get().addNotification({
          id: 'notif-dm-' + Date.now(),
          email: cleanReceiver,
          text: {
            fr: `Nouveau message de la part de ${cleanSender === 'admin@senperspective.com' ? 'l\'Administrateur' : cleanSender}.`,
            en: `New direct message from ${cleanSender === 'admin@senperspective.com' ? 'Admin' : cleanSender}.`
          },
          date: new Date().toISOString().split('T')[0],
          isRead: false,
          category: 'messages'
        });

        // If message is directed to Abdel (Official AI Assistant in Messenger), generate response
        if (cleanReceiver === 'abdel@senperspective.com') {
          setTimeout(async () => {
            try {
              let replyText = "";
              const response = await fetch(resolveApiUrl('/api/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: newMsg.text,
                  language: get().language,
                  history: (get().directMessages || [])
                    .filter(m => (m.sender === cleanSender && m.receiver === 'abdel@senperspective.com') || (m.sender === 'abdel@senperspective.com' && m.receiver === cleanSender))
                    .slice(-6)
                    .map(m => ({
                      role: m.sender === 'abdel@senperspective.com' ? 'assistant' : 'user',
                      content: m.text
                    }))
                })
              });

              if (response.ok) {
                const data = await response.json();
                replyText = data.response || data.text || "";
              }

              if (!replyText) {
                replyText = get().language === 'en'
                  ? "I am listening closely to your editorial insights. How else can I assist your reading of Perspective Group today?"
                  : "Je suis à votre écoute avec attention. Quels autres points ou analyses de Perspective Group souhaitez-vous approfondir ?";
              }

              const abdelMsgId = 'dm-' + Date.now().toString() + '-abdel';
              const abdelMsg = {
                id: abdelMsgId,
                sender: 'abdel@senperspective.com',
                receiver: cleanSender,
                text: replyText,
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                read: false
              };

              set(state => ({ directMessages: [...(state.directMessages || []), abdelMsg] }));
              cloudSave('messages', abdelMsgId, abdelMsg);
            } catch (err) {
              console.warn("[Abdel Messenger] Direct AI response notice:", err);
            }
          }, 600);
        }
      },
      deleteDirectMessage: (id) => {
        const dms = get().directMessages || [];
        set({ directMessages: dms.filter(dm => dm.id !== id) });
        cloudDelete('messages', id);
      },
      markDirectMessagesAsRead: (contactEmail, userEmail) => {
        const dms = get().directMessages || [];
        const senderClean = contactEmail ? contactEmail.toLowerCase() : '';
        const receiverClean = userEmail ? userEmail.toLowerCase() : '';
        let updated = false;

        const newDms = dms.map(dm => {
          if (!dm.read && dm.receiver?.toLowerCase() === receiverClean && (!senderClean || dm.sender?.toLowerCase() === senderClean)) {
            updated = true;
            cloudSave('messages', dm.id, { ...dm, read: true });
            return { ...dm, read: true };
          }
          return dm;
        });

        if (updated) {
          set({ directMessages: newDms });
        }

        const notifs = get().notifications || [];
        const updatedNotifs = notifs.map(n => {
          if ((!n.email || ((n.email ?? '').toLowerCase()) === receiverClean) && n.category === 'messages' && !n.isRead) {
            return { ...n, isRead: true };
          }
          return n;
        });
        set({ notifications: updatedNotifs });
      },
      friends: [],
      setFriends: (list: any) => {
        if (!Array.isArray(list)) return;
        const normalized = list.map(item => {
          if (typeof item === 'string') {
            return {
              email: item.toLowerCase().trim(),
              name: item.split('@')[0],
              role: 'Membre',
              avatar: 'preset-male',
              status: 'online'
            };
          }
          return item;
        });
        set({ friends: normalized });
      },
      addFriend: (friend) => {
        set(state => ({ friends: [...(state.friends || []), friend] }));
        // NOTE: the global `friends` contact list is UI-local (member directory
        // cache) — the REAL social graph lives in RTDB `friends/<a__b>` rows
        // (ProfilePage / AccountDrawer toggleFriend). Never write contact
        // objects to that collection: its rows are keyed directional relations
        // and contact payloads would corrupt readers. No cloud write here.
      },
      deleteFriend: (email) => {
        set(state => ({ friends: (state.friends || []).filter(f => f.email !== email) }));
        // UI-local only (see addFriend) — real unfriend goes through
        // deleteRelationPair('friends', …) in ProfilePage/AccountDrawer.
      },
      // Fuse accounts with the same email into one account
      fuseAccounts: async () => {
        const allUsers = get().users || [];
        const emailMap = new Map<string, any>();
        const duplicates: any[] = [];
        
        for (const u of allUsers as any[]) {
          const user = u as any;
          const email = (user.email || '').toLowerCase().trim();
          if (!email) continue;
          
          if (emailMap.has(email)) {
            // Merge data from duplicate into the original
            const original = emailMap.get(email) as any;
            // Keep the most recent data, merge arrays
            if (user.interactions && Array.isArray(user.interactions)) {
              original.interactions = [...(original.interactions || []), ...user.interactions];
            }
            if (user.comments && Array.isArray(user.comments)) {
              original.comments = [...(original.comments || []), ...user.comments];
            }
            if (user.subscriptions && Array.isArray(user.subscriptions)) {
              original.subscriptions = [...(original.subscriptions || []), ...user.subscriptions];
            }
            // Keep the most recent lastLogin
            if (user.lastLogin && (!original.lastLogin || user.lastLogin > original.lastLogin)) {
              original.lastLogin = user.lastLogin;
            }
            // Keep the most complete profile
            if (user.name && !original.name) original.name = user.name;
            if (user.avatar && !original.avatar) original.avatar = user.avatar;
            duplicates.push(user);
          } else {
            emailMap.set(email, { ...user });
          }
        }
        
        const fusedUsers = Array.from(emailMap.values());
        if (duplicates.length > 0) {
          set({ users: fusedUsers });
          for (const dup of duplicates) {
            try {
              // FIX (disappearing accounts): soft-delete duplicates instead of
              // permanently deleting the row, so the account can be recovered.
              if (supabase) { await supabase.from('users').update({ deleted_at: new Date().toISOString(), isOnline: false }).eq('id', dup.id).catch(() => {}); }
            } catch (_) {}
          }
          for (const user of fusedUsers) {
            try {
              const clean = await sanitizeFirestorePayload(user);
              if (supabase) { await supabase.from('users').upsert({ id: user.id, ...clean }, { onConflict: 'email' }).catch(() => {}); }
            } catch (_) {}
          }
          console.log(`Fused ${duplicates.length} duplicate accounts. Total users: ${fusedUsers.length}`);
        }
        return { fused: duplicates.length, total: fusedUsers.length };
      },
      // Safe account manager - never removes legitimate, admin, or founder accounts
      removeFakeAccounts: async () => {
        const allUsers = get().users || [];
        // Protected core emails that MUST never be purged
        const protectedEmails = ['kadersdiaz3@gmail.com', 'admin@senperspective.com'];
        const realUsers: any[] = [];
        const removedUsers: any[] = [];
        
        for (const user of allUsers) {
          const email = (user.email || '').toLowerCase().trim();
          if (protectedEmails.includes(email) || email.endsWith('@senperspective.com') || user.role === 'Admin') {
            realUsers.push(user);
            continue;
          }
          // Only flag explicitly corrupt or empty placeholder entries
          const isCorrupted = !email || email === 'undefined' || email === 'null' || (email.includes('fake_temp_') && !user.name);
          if (isCorrupted) {
            removedUsers.push(user);
          } else {
            realUsers.push(user);
          }
        }
        
        if (removedUsers.length > 0) {
          set({ users: realUsers });
          for (const user of removedUsers) {
            try {
              // FIX (disappearing accounts): soft-delete corrupt/placeholder
              // entries instead of permanently destroying the row.
              if (supabase && user.id) { await supabase.from('users').update({ deleted_at: new Date().toISOString(), isOnline: false }).eq('id', user.id).catch(() => {}); }
            } catch (_) {}
          }
        }
        return { removed: removedUsers.length, total: realUsers.length };
      },
      abdelPrompts: {
        fr: [
          "Quelles sont les actualités majeures aujourd'hui sur Perspective ?",
          "Résumer les faits marquants en Afrique de l'Ouest",
          "Quels dossiers géopolitiques et économiques suivre actuellement ?",
          "Recommande-moi une grande enquête du journal"
        ],
        en: [
          "What are today's major headlines on Perspective?",
          "Summarize key West African developments",
          "Which geopolitical & economic topics should I follow?",
          "Recommend a major investigation or editorial breakdown"
        ]
      },
      updateAbdelPrompts: (prompts) => set({ abdelPrompts: prompts }),
      sendWarningNotification: (email, textFr, textEn) => {
        get().addNotification({
          id: 'warning-' + Date.now(),
          email,
          text: {
            fr: `⚠️ AVERTISSEMENT DE MODÉRATION : ${textFr}`,
            en: `⚠️ MODERATION WARNING: ${textEn}`
          },
          date: new Date().toISOString().split('T')[0],
          isRead: false
        });

        // Log this warning as an audit interaction so the Admin can see it instantly
        get().addInteraction(
          email,
          'moderation_warning',
          {
            fr: `⚠️ Avertissement de modération : "${textFr.substring(0, 50)}..."`,
            en: `⚠️ Moderation warning: "${textEn.substring(0, 50)}..."`
          }
        );
      },
      addComment: async (comment) => {
        const comments = get().comments || [];
        // FIX (comments not persistent): the store must wait for the cloud write
        // BEFORE showing the comment as saved. Previously the comment was shown
        // instantly while the RTDB write ran fire-and-forget in the background —
        // any write failure (offline, rules, timeout) silently lost the comment.
        // Now: local backup first (survives reload), cloud write awaited, and on
        // failure the comment stays visible flagged `pendingSync` so the UI can
        // offer a retry instead of pretending it was saved.
        const filtered = (comments ?? []).filter(c => c.id !== comment.id);
        set({ comments: [comment, ...filtered] });
        // Persist locally so comments survive reloads even if the cloud write
        // hasn't propagated yet — the realtime listener will reconcile from the
        // cloud eventually, but the local backup prevents data loss on reload.
        persistCommentLocally(comment);
        // Write to Firebase RTDB so other devices see the comment.
        // saveCommentToFirestore/addComment THROW on failure (handleFirestoreError
        // rethrows) — it never returns false, so any rejection lands in catch.
        try {
          await saveCommentToFirestore(comment);
        } catch (err) {
          console.warn("[Firebase] Comment RTDB save failed — kept locally, flagged pendingSync:", err);
          const flagged = { ...comment, pendingSync: true } as CommentItem;
          set({ comments: [flagged, ...(get().comments || []).filter(c => c.id !== comment.id)] });
          persistCommentLocally(flagged);
        }
        // Log interaction if author email exists
        if (comment.email) {
          get().addInteraction(
            comment.email,
            'post_comment',
            {
              fr: `A publié un commentaire sur "${comment.articleTitle}" : "${comment.text.substring(0, 40)}..."`,
              en: `Posted a comment on "${comment.articleTitle}": "${comment.text.substring(0, 40)}..."`
            }
          );
        }

        // Notify parent author if this is a reply!
        if (comment.parentId) {
          const parent = (comments ?? []).find(p => p.id === comment.parentId);
          if (parent && parent.email && ((parent.email ?? '').toLowerCase()) !== comment.email?.toLowerCase()) {
            get().addNotification({
              id: 'notif-reply-' + Date.now(),
              email: parent.email,
              text: {
                fr: `${comment.author} a répondu à votre commentaire : "${comment.text.substring(0, 40)}..."`,
                en: `${comment.author} replied to your comment: "${comment.text.substring(0, 40)}..."`
              },
              date: new Date().toISOString().split('T')[0],
              isRead: false,
              category: 'messages',
              link: `/article/${comment.articleId}`
            });
          }
        }

        // Notify reader friends about the new comment/activity across the app
        const friendsList = get().friends || [];
        friendsList.forEach(friend => {
          if (friend.email && ((friend.email ?? '').toLowerCase()) !== comment.email?.toLowerCase()) {
            get().addNotification({
              id: 'notif-friend-comment-' + Date.now() + '-' + Math.random().toString(36).substring(4),
              email: friend.email,
              text: {
                fr: `${comment.author} (Ami) a publié un commentaire sur "${comment.articleTitle || 'un article'}" : "${comment.text.substring(0, 35)}..."`,
                en: `${comment.author} (Friend) posted a comment on "${comment.articleTitle || 'an article'}": "${comment.text.substring(0, 35)}..."`
              },
              date: new Date().toISOString().split('T')[0],
              isRead: false,
              category: 'social',
              link: `/article/${comment.articleId}`
            });
          }
        });

        // Notify FOLLOWERS of the comment author (real verified relations
        // from the `followers` collection: rows where follower_email = author)
        try {
          const authorClean = (comment.email || '').toLowerCase().trim();
          if (authorClean) {
            const followerRows = await fetchFirestoreCollection('followers');
            const followerEmails = Array.from(new Set(followerRows
              .filter((r: any) => String(r?.follower_email || '').toLowerCase().trim() === authorClean)
              .map((r: any) => String(r?.user_id || '').toLowerCase().trim())
              .filter(Boolean)));
            followerEmails.forEach(followerEmail => {
              if (followerEmail === authorClean) return;
              get().addNotification({
                id: 'notif-follower-comment-' + Date.now() + '-' + Math.random().toString(36).substring(4),
                email: followerEmail,
                text: {
                  fr: `${comment.author} que vous suivez a commenté \"${comment.articleTitle || 'un article'}\" : \"${comment.text.substring(0, 35)}...\"`,
                  en: `${comment.author}, whom you follow, commented on \"${comment.articleTitle || 'an article'}\": \"${comment.text.substring(0, 35)}...\"`
                },
                date: new Date().toISOString().split('T')[0],
                isRead: false,
                category: 'social',
                link: `/article/${comment.articleId}`
              });
            });
          }
        } catch (err) {
          console.warn('[Store] Follower comment notification notice:', err);
        }
      },
      approveComment: (id) => {
        const comment = (get().comments || []).find(c => c.id === id);
        if (!comment) return;
        const updated = { ...comment, isApproved: true };
        set({ comments: (get().comments || []).map(c => c.id === id ? updated : c) });
        cloudSave('comments', id, updated);
        persistCommentLocally(updated);
      },
      deleteComment: (id, requesterEmail) => {
        const comments = get().comments || [];
        const comment = (comments ?? []).find(c => c.id === id);
        if (!comment) return;

        if (requesterEmail) {
          const isOwner = comment.email && requesterEmail.trim().toLowerCase() === (comment.email ?? '').trim().toLowerCase();
          if (!isOwner) {
            console.warn("Unauthorized attempt to delete comment by non-owner:", requesterEmail);
            return;
          }
        }

        set({ comments: (comments ?? []).filter(c => c.id !== id) });
        cloudDelete('comments', id);
        // Also run the dedicated delete (removes legacy push-key nodes whose
        // `id` field matches) so deleted comments can never resurrect on reload.
        firestoreDeleteComment(id).catch(() => {});
        removeLocalCommentBackup(id);

        if (comment && comment.email) {
          get().addInteraction(
            comment.email,
            'delete_comment',
            {
              fr: `A supprimé son commentaire de l'article "${comment.articleTitle}".`,
              en: `Deleted comment from article "${comment.articleTitle}".`
            }
          );
        }
      },
      updateCommentText: (id, text, requesterEmail) => {
        const comments = get().comments || [];
        const comment = (comments ?? []).find(c => c.id === id);
        if (!comment) return false;

        if (requesterEmail) {
          const isOwner = comment.email && requesterEmail.trim().toLowerCase() === (comment.email ?? '').trim().toLowerCase();
          if (!isOwner) {
            console.warn("Unauthorized attempt to modify comment by non-owner:", requesterEmail);
            return false;
          }
        }

        set({
          comments: (comments ?? []).map(c => c.id === id ? { ...c, text, isApproved: true } : c)
        });
        cloudSave('comments', id, { ...comment, text, isApproved: true });
        persistCommentLocally({ ...comment, text, isApproved: true });

        if (comment && comment.email) {
          get().addInteraction(
            comment.email,
            'edit_comment',
            {
              fr: `A modifié son commentaire sur "${comment.articleTitle}" : "${text.substring(0, 35)}..."`,
              en: `Edited comment on "${comment.articleTitle}": "${text.substring(0, 35)}..."`
            }
          );
        }
        return true;
      },
      likeComment: (id, userEmail) => {
        const comments = get().comments || [];
        const comment = (comments ?? []).find(c => c.id === id);
        if (!comment) return;

        const likedBy = comment.likedBy || [];
        const dislikedBy = comment.dislikedBy || [];
        let likes = comment.likes || 0;
        let dislikes = comment.dislikes || 0;

        let newLikedBy = [...likedBy];
        let newDislikedBy = [...dislikedBy];

        if (likedBy.includes(userEmail)) {
          likes = Math.max(0, likes - 1);
          newLikedBy = newLikedBy.filter(e => e !== userEmail);
        } else {
          likes += 1;
          newLikedBy.push(userEmail);
          if (dislikedBy.includes(userEmail)) {
            dislikes = Math.max(0, dislikes - 1);
            newDislikedBy = newDislikedBy.filter(e => e !== userEmail);
          }

          if (comment.email && comment.email !== userEmail) {
            get().addNotification({
              id: 'notif-like-' + Date.now() + '-' + Math.random().toString(36).substring(4),
              email: comment.email,
              text: {
                fr: `${userEmail.split('@')[0]} a aimé votre commentaire sur "${comment.articleTitle}"`,
                en: `${userEmail.split('@')[0]} liked your comment on "${comment.articleTitle}"`
              },
              date: new Date().toISOString().split('T')[0],
              isRead: false,
              link: `/article/${comment.articleId}`
            });
          }
        }

        set({
          comments: (comments ?? []).map(c => c.id === id ? { ...c, likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy } : c)
        });
        cloudSave('comments', id, { ...comment, likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy });
        persistCommentLocally({ ...comment, likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy });

        get().addInteraction(
          userEmail,
          'like_comment',
          {
            fr: `A aimé le commentaire de ${comment.author} sur "${comment.articleTitle}"`,
            en: `Liked ${comment.author}'s comment on "${comment.articleTitle}"`
          }
        );
      },
      dislikeComment: (id, userEmail) => {
        const comments = get().comments || [];
        const comment = (comments ?? []).find(c => c.id === id);
        if (!comment) return;

        const likedBy = comment.likedBy || [];
        const dislikedBy = comment.dislikedBy || [];
        let likes = comment.likes || 0;
        let dislikes = comment.dislikes || 0;

        let newLikedBy = [...likedBy];
        let newDislikedBy = [...dislikedBy];

        if (dislikedBy.includes(userEmail)) {
          dislikes = Math.max(0, dislikes - 1);
          newDislikedBy = newDislikedBy.filter(e => e !== userEmail);
        } else {
          dislikes += 1;
          newDislikedBy.push(userEmail);
          if (likedBy.includes(userEmail)) {
            likes = Math.max(0, likes - 1);
            newLikedBy = newLikedBy.filter(e => e !== userEmail);
          }

          // Create notification for comment owner!
          if (comment.email && comment.email !== userEmail) {
            get().addNotification({
              id: 'notif-dislike-' + Date.now() + '-' + Math.random().toString(36).substring(4),
              email: comment.email,
              text: {
                fr: `${userEmail.split('@')[0]} n'a pas aimé votre commentaire sur "${comment.articleTitle}"`,
                en: `${userEmail.split('@')[0]} disliked your comment on "${comment.articleTitle}"`
              },
              date: new Date().toISOString().split('T')[0],
              isRead: false,
              link: `/article/${comment.articleId}`
            });
          }
        }

        set({
          comments: (comments ?? []).map(c => c.id === id ? { ...c, likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy } : c)
        });
        cloudSave('comments', id, { ...comment, likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy });
        persistCommentLocally({ ...comment, likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy });

        get().addInteraction(
          userEmail,
          'dislike_comment',
          {
            fr: `N'a pas aimé le commentaire de ${comment.author} sur "${comment.articleTitle}"`,
            en: `Disliked ${comment.author}'s comment on "${comment.articleTitle}"`
          }
        );
      },
      notifications: [
        {
          id: 'warning-kader',
          email: 'kadersdiaz3@gmail.com',
          text: {
            fr: "AVERTISSEMENT ADMINISTRATIF : Votre commentaire récent sur l'article du Corridor Logistique de Saly a été signalé pour écart de langage. Veuillez confirmer votre respect de la charte de Perspective.",
            en: "ADMINISTRATIVE WARNING: Your recent comment on the Saly Logistics Corridor article has been flagged for a breach of community conduct. Please confirm your adherence to Perspective's guidelines."
          },
          date: '2026-06-27',
          isRead: false,
          category: 'system'
        }
      ],
      notificationPreferences: {
        messages: true,
        newsletters: true,
        newPublishes: true,
        generalNews: true,
        browserPush: false,
        emailAlerts: true
      },
      updateNotificationPreferences: (prefs) => {
        const current = get().notificationPreferences || {
          messages: true,
          newsletters: true,
          newPublishes: true,
          generalNews: true,
          browserPush: false,
          emailAlerts: true
        };
        const updated = { ...current, ...prefs };
        const currentProfile = get().readerProfile;
        if (currentProfile) {
          const updatedProfile = { ...currentProfile, notificationPreferences: updated };
          set({ notificationPreferences: updated, readerProfile: updatedProfile });
          const userKey = (currentProfile.email || currentProfile.id || '').toLowerCase().trim();
          if (userKey && supabase) {
            supabase.from('users').update({ notification_preferences: updated } as any).eq('id', userKey).catch(() => {});
          }
        } else {
          set({ notificationPreferences: updated });
        }
        syncPreferencesToFirestore({ notificationPreferences: updated });
      },
      addNotification: (notification) => {
        // Check category preferences
        const prefs = get().notificationPreferences;
        if (notification.category && prefs && notification.category !== 'system') {
          if (prefs[notification.category] === false) {
            // Category is muted by user setup preference
            return;
          }
        }
        set({ notifications: [notification, ...(get().notifications || [])] });
        // Persist so notifications survive reloads and appear on other devices
        cloudSave('notifications', notification.id, { ...notification, isRead: false });

        // Live in-app toast + browser push — ONLY for notifications addressed to
        // the signed-in reader on this device (not for notifications this device
        // merely fans out to other members). Social items land in "Activité".
        const me = ((get().readerProfile?.email ?? '')).toLowerCase().trim();
        const notifTarget = ((notification.email ?? '')).toLowerCase().trim();
        if (me && notifTarget && me === notifTarget) {
          const lang = get().language;
          const textMsg = typeof notification.text === 'string'
            ? notification.text
            : (notification.text?.[lang] || notification.text?.fr || 'Nouvelle notification');
          const isSocial = notification.category === 'social';
          triggerInAppToast({
            type: isSocial ? 'social' : (notification.category === 'system' ? 'system' : (notification.category === 'messages' ? 'message' : 'publication')),
            title: isSocial
              ? (lang === 'fr' ? 'Activité de votre réseau' : 'Network activity')
              : (notification.category === 'messages'
                ? (lang === 'fr' ? 'Nouveau message' : 'New message')
                : (lang === 'fr' ? 'Nouvelle publication' : 'New publication')),
            body: textMsg,
            actionUrl: notification.link
          });
        }
      },
      clearNotifications: (email, scope) => {
        const target = (email ?? '').toLowerCase().trim();
        const list = get().notifications || [];
        const matchesScope = (n: NotificationItem) => {
          if (((n.email ?? '').toLowerCase().trim()) !== target) return false;
          if (scope === 'social') {
            // Only "Activité" items: followed/friend comments & publications
            return n.category === 'social' ||
              String(n.id || '').startsWith('notif-follower-') ||
              String(n.id || '').startsWith('notif-friend-');
          }
          return true;
        };
        const hasUnread = list.some(n => matchesScope(n) && !n.isRead);
        if (!hasUnread) return;
        set({
          notifications: list.map(n => (matchesScope(n) ? { ...n, isRead: true } : n))
        });
        // Persist read state per user
        list.filter(n => matchesScope(n) && !n.isRead)
          .forEach(n => cloudSave('notifications', n.id, { ...n, isRead: true }));
      },
      deleteNotification: (id) => {
        set({ notifications: (get().notifications || []).filter(n => n.id !== id) });
        cloudDelete('notifications', id);
      },
      notificationResponses: {},
      respondToNotification: (notifId, response) => {
        set({
          notificationResponses: {
            ...(get().notificationResponses || {}),
            [notifId]: response
          }
        });
        cloudSave('notification_responses', notifId, { id: notifId, response });
      },
      subscribers: [
        { email: 'sylla.editor@gmail.com', date: '2026-06-15' },
        { email: 'mariama.sow@orange.sn', date: '2026-06-17' },
        { email: 'diop.consulting@gmail.com', date: '2026-06-19' }
      ],
      addSubscriber: async (email) => {
        const clean = email.trim().toLowerCase();
        if (!clean || !clean.includes('@')) return;
        const current = get().subscribers || [];
        if (!current.some(s => ((s.email ?? '').toLowerCase()) === clean)) {
          const newSub = { email: clean, date: new Date().toISOString().split('T')[0] };
          set({ subscribers: [newSub, ...current] });
          trackConversion('newsletter_subscription', clean, { source: 'subscription_form' });
          try {
            const subDocId = clean.replace(/[^a-zA-Z0-9]/g, '_');
            if (supabase) {
              await supabase.from('subscribers').upsert({ id: subDocId, email: clean, date: newSub.date, active: true }).catch(() => {});
            }
          } catch (err) {
            console.error("[Supabase notice] Error saving subscriber:", err);
          }
        }
      },
      deleteSubscriber: async (email) => {
        const clean = email.trim().toLowerCase();
        set({ subscribers: (get().subscribers || []).filter(s => ((s.email ?? '').toLowerCase()) !== clean) });
        try {
          const subDocId = clean.replace(/[^a-zA-Z0-9]/g, '_');
          if (supabase) {
            await supabase.from('subscribers').delete().eq('id', subDocId).catch(() => {});
          }
        } catch (err) {
          console.error("[Supabase notice] Error deleting subscriber:", err);
        }
      },
      readerProfile: null,
      setReaderProfile: (profile) => set((state) => {
        const updatedUsers = (state.users || []).map(u => 
          profile && ((u.email ?? '').toLowerCase()) === ((profile.email ?? '').toLowerCase())
            ? { ...u, ...profile }
            : u
        );
        return { 
          readerProfile: profile,
          users: updatedUsers
        };
      }),
      showProfileDrawer: false,
      setShowProfileDrawer: (show) => set({ showProfileDrawer: show }),
      activeProfileTab: 'main',
      setActiveProfileTab: (tab) => set({ activeProfileTab: tab }),
      pendingShareArticleId: '',
      setPendingShareArticleId: (id) => set({ pendingShareArticleId: id }),
      users: [],
      interactions: [
        {
          id: 'int-1',
          email: 'admin@senperspective.com',
          type: 'read',
          date: '2026-06-25',
          detail: { fr: 'A ouvert le tableau de bord administrateur.', en: 'Opened the administrator control panel.' }
        }
      ],
      
      updatePrivacy: (email, isPrivate) => {
        const users = get().users || [];
        const normalized = email.toLowerCase().trim();
        set({
          users: (users ?? []).map(u => ((u.email ?? '').toLowerCase()).trim() === normalized ? { ...u, isPrivate } : u)
        });
        // FIX (users relations not persistent): the store's `users` list is
        // in-memory — the CLOUD profile is the source of truth. Mirror the flag
        // to RTDB so it (and roles, friend_ids) survive reload.
        try { cloudSaveUserProfile(email, { isPrivate }); } catch { /* best-effort */ }
        if (supabase) {
          supabase.from('users').update({ hide_personal_info: isPrivate }).eq('id', normalized).catch(() => {});
        }
      },
      sendFriendRequest: (fromEmail, toEmail) => {
        const users = get().users || [];
        const fromNorm = fromEmail.toLowerCase().trim();
        const toNorm = toEmail.toLowerCase().trim();
        set({
          users: (users ?? []).map(u => {
            const currentEmail = ((u.email ?? '').toLowerCase()).trim();
            if (currentEmail === fromNorm) {
              return { ...u, sentFriendRequests: [...(u.sentFriendRequests || []), toNorm] };
            }
            if (currentEmail === toNorm) {
              return { ...u, pendingFriendRequests: [...(u.pendingFriendRequests || []), fromNorm] };
            }
            return u;
          })
        });
        if (supabase) {
          supabase.from('friend_requests').upsert({ user_id: fromNorm, to_email: toNorm, status: 'pending', created_at: new Date().toISOString() }).catch(() => {});
        }
      },
      acceptFriendRequest: (fromEmail, toEmail) => {
        const users = get().users || [];
        const fromNorm = fromEmail.toLowerCase().trim();
        const toNorm = toEmail.toLowerCase().trim();
        set({
          users: (users ?? []).map(u => {
            const currentEmail = ((u.email ?? '').toLowerCase()).trim();
            if (currentEmail === fromNorm) {
              return { ...u, friends: [...(u.friends || []), toNorm], sentFriendRequests: (u.sentFriendRequests || []).filter(e => e !== toNorm) };
            }
            if (currentEmail === toNorm) {
              return { ...u, friends: [...(u.friends || []), fromNorm], pendingFriendRequests: (u.pendingFriendRequests || []).filter(e => e !== fromNorm) };
            }
            return u;
          })
        });
        if (supabase) {
          supabase.from('friends').upsert({ user_id: fromNorm, friend_email: toNorm, connected_at: Date.now() }).catch(() => {});
          supabase.from('friends').upsert({ user_id: toNorm, friend_email: fromNorm, connected_at: Date.now() }).catch(() => {});
          supabase.from('friend_requests').delete().eq('user_id', fromNorm).eq('to_email', toNorm).catch(() => {});
        }
      },
      removeFriend: (email1, email2) => {
        const users = get().users || [];
        const norm1 = email1.toLowerCase().trim();
        const norm2 = email2.toLowerCase().trim();
        set({
          users: (users ?? []).map(u => {
            const currentEmail = ((u.email ?? '').toLowerCase()).trim();
            if (currentEmail === norm1) {
              return { ...u, friends: (u.friends || []).filter(e => e !== norm2) };
            }
            if (currentEmail === norm2) {
              return { ...u, friends: (u.friends || []).filter(e => e !== norm1) };
            }
            return u;
          })
        });
        if (supabase) {
          supabase.from('friends').delete().eq('user_id', norm1).eq('friend_email', norm2).catch(() => {});
          supabase.from('friends').delete().eq('user_id', norm2).eq('friend_email', norm1).catch(() => {});
        }
      },

      registerUser: (newUser) => {
        const users = get().users || [];
        const normalizedEmail = (newUser.email ?? '').trim().toLowerCase();
        if ((users ?? []).some(u => (u.email ?? '').trim().toLowerCase() === normalizedEmail)) {
          return false;
        }
        const normalizedUser = {
          ...newUser,
          email: normalizedEmail
        };
        set({ users: [normalizedUser, ...users] });
        if (supabase) {
          supabase.from('users').upsert({
            id: normalizedEmail,
            email: normalizedEmail,
            name: newUser.name || normalizedEmail.split('@')[0],
            role: newUser.role || 'Member',
            avatarUrl: newUser.avatarUrl || 'preset-male',
            authType: newUser.authType || 'password',
            password: newUser.password,
            registeredAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            isOnline: true,
            streak: 1,
            readingTime: 0,
            bio: "Membre actif Perspective",
            accolades: ["verified_identity"]
          }, { onConflict: 'email' }).catch(() => {});
        }
        return true;
      },
      loginUser: async (email, credential, authType) => {
        const trimmedEmail = email.trim().toLowerCase();
        
        // First try to find user in local state
        let user = (get().users || []).find(u => (u.email ?? '').trim().toLowerCase() === trimmedEmail);
        
        // If not found locally, try Supabase
        if (!user && supabase) {
          try {
            const { data } = await supabase.from('users').select('*').eq('email', trimmedEmail).maybeSingle();
            if (data) {
              user = data as any;
              // Add to local state
              set({ users: [user, ...(get().users || [])] });
            }
          } catch (err) {
            console.warn("[Supabase notice] Error fetching user for login:", err);
          }
        }
        
        if (!user) return false;

        const isPasswordCorrect = user.password && user.password === credential;
        const isPinCorrect = user.pin && user.pin === credential;

        if (isPasswordCorrect || isPinCorrect) {
          const actualAuthType = isPasswordCorrect ? 'password' : 'pin';
          set({
            readerProfile: {
              id: 'member-' + Date.now(),
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl,
              role: user.role,
              emailVerified: user.emailVerified || false,
              mfaEnabled: user.mfaEnabled || false
            }
          });
          get().addInteraction(
            user.email,
            'login',
            actualAuthType === 'password'
              ? { fr: 'S’est connecté via mot de passe.', en: 'Logged in via password.' }
              : { fr: 'S’est connecté via code PIN.', en: 'Logged in via PIN code.' }
          );
          return true;
        }
        return false;
      },
      addInteraction: (email, type, detail, link) => {
        const interactions = get().interactions || [];
        const newInteraction: UserInteraction = {
          id: 'int-' + Date.now() + '-' + Math.random().toString(36).substring(4),
          email,
          type,
          date: new Date().toISOString().split('T')[0],
          detail,
          link
        };
        set({ interactions: [newInteraction, ...interactions] });
        cloudSave('analytics_events', newInteraction.id, {
          id: newInteraction.id,
          session_id: 'session-' + Date.now(),
          event_name: type,
          path: link || '/',
          article_id: '',
          article_title: '',
          category: 'General',
          device_type: 'Desktop',
          country: '',
          city: '',
          timestamp: new Date().toISOString(),
          user_email: email,
          metadata: detail
        });
        // Also persist the interaction itself so the audit feed survives reloads
        cloudSave('interactions', newInteraction.id, newInteraction);
      },
      siteSettings: {
        isMaintenanceMode: false,
        maintenanceMessageFr: "Notre site est actuellement en cours de maintenance et de mise à jour technique. Nous serons de retour très rapidement.",
        maintenanceMessageEn: "Our platform is currently undergoing scheduled maintenance and updates. We will be back online shortly.",
        siteName: 'Perspective Group',
        abdelIntroMessageFr: "Bonjour ! Je suis Abdel, votre guide d'actualité sur Perspective Group. Que souhaitez-vous décrypter aujourd'hui ?",
        abdelIntroMessageEn: "Hello! I am Abdel, your news guide on Perspective Group. What would you like to unpack today?",
        dossiers: [
          {
            id: 'dos-1',
            tag: { fr: 'Dossier Macro', en: 'Macro Dossier' },
            titleFr: 'Dakar Real Estate & Bulle Foncière : Analyse des Grands Projets',
            titleEn: 'Dakar Real Estate & Land Bubble: Macro Analysis',
            descFr: 'L’immobilier à Dakar est l’un des marchés les plus dynamiques de la région UEMOA.',
            descEn: 'Real estate in Dakar is one of the most dynamic markets in the WAEMU region.',
            readTime: '12 MIN',
            fullTextFr: 'Analyse approfondie de la dynamique foncière, des investissements majeurs et de la pression urbaine.',
            fullTextEn: 'In-depth analysis of land dynamics, major investments, and urban pressure across the Dakar region.',
            key1Fr: 'Pression démographique et extension urbaine vers Diamniadio',
            key1En: 'Demographic pressure and urban expansion towards Diamniadio',
            key2Fr: 'Rendements locatifs et spéculation foncière',
            key2En: 'Rental yields and land speculation'
          }
        ],
        announcements: [
          {
            id: 'ann-1',
            titleFr: 'Ouverture du Sommet Économique de Dakar',
            titleEn: 'Dakar Economic Summit Opening',
            textFr: 'Retrouvez notre édition spéciale en direct du Centre International de Conférences.',
            textEn: 'Follow our special live coverage from the International Conference Center.',
            imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
            link: '#'
          }
        ],
        boukariCorpLogo: '',
        accentColor: '#E85D42',
        headerStyle: 'glass',
        showHeaderTopBar: true,
        showHeaderTicker: true,
        headerNavItems: [
          { id: 'politique', labelFr: 'Politique', labelEn: 'Politics', url: '/category/politique', enabled: true },
          { id: 'economie', labelFr: 'Économie', labelEn: 'Economy', url: '/category/economie', enabled: true },
          { id: 'societe', labelFr: 'Société', labelEn: 'Society', url: '/category/societe', enabled: true },
          { id: 'international', labelFr: 'International', labelEn: 'International', url: '/category/international', enabled: true },
          { id: 'tech', labelFr: 'Tech', labelEn: 'Tech', url: '/category/tech', enabled: true },
          { id: 'sante', labelFr: 'Santé', labelEn: 'Health', url: '/category/sante', enabled: true },
          { id: 'sports', labelFr: "Sports", labelEn: 'Sports', url: '/category/sports', enabled: true },
          { id: 'gouvernance', labelFr: 'Gouvernance', labelEn: 'Governance', url: '/category/gouvernance', enabled: true },
        ],
        aiModelMode: 'flash',
        abdelAiProvider: 'auto',
        seoTitleSuffix: '| Perspective Group Dakar',
        seoCanonicalBase: 'https://senperspective.com',
        seoDefaultDesc: "Grand journal d'information et de décryptage indépendant depuis Dakar. Couverture complète : Politique, Économie, Société, Tech, Culture, Sports, Santé et International.",
        databaseProvider: 'mongodb',
        editorialPhone: '+221 33 824 55 55',
        supportEmail: 'contact@senperspective.com',
        officeAddress: 'Immeuble Tamaro, Rue Mohamed V, Dakar',
        footerDescFr: "Perspective Group. Grand journal d'information et de réflexion indépendant. Notre promesse : L'actualité. Sans Filtre. Sans Compromis. Politique, Économie, Société, Tech, Culture, Sports, Santé ou International : toutes les rubriques sont traitées avec la même exigence journalistique.",
        footerDescEn: "Perspective Group. Major independent news and reflection journal. Our promise: News. Unfiltered. Uncompromised. Politics, Economy, Society, Tech, Culture, Sports, Health, or World news: every section is covered with equal journalistic depth.",
        boukariCorpUnitLabelFr: "Unité Opérationnelle de",
        boukariCorpUnitLabelEn: "An Operational Unit of",
        boukariCorpName: "Boukari Corporation",
        footerCopyrightFr: "© 2026 Perspective Group. Tous droits réservés.",
        footerCopyrightEn: "© 2026 Perspective Group. All rights reserved.",
        footerLocationText: "Perspective Group, Dakar, Sénégal",
        paywallThreshold: 9999,
        paywallEnabled: false,
        cookieConsentEnabled: true,
        showDraftPoliciesInFooter: false,
        privacyPolicyTextFr: "Perspective Group traite les données de ses lecteurs (compte, newsletter, commentaires) conformément au Règlement Général sur la Protection des Données (RGPD) et aux lois sénégalaises sur les données personnelles. Vos données ne sont jamais cédées à des tiers.",
        privacyPolicyTextEn: "Perspective Group processes reader data (accounts, newsletters, comments) in strict compliance with GDPR and Senegalese data protection legislation. Your personal data is never sold or shared with third parties.",
        dataRetentionDays: 365,
        analystDispatches: [
          { id: 'disp-0', time: '16:00 DKR', contentFr: "Lancement des travaux de curage des canaux à Wakhinane, Yeumbeul et Rufisque par la DPGI et la SONAGED face aux risques d'inondations.", contentEn: "Launch of canal dredging operations in Wakhinane, Yeumbeul, and Rufisque by DPGI and SONAGED ahead of flood risks.", level: 'pulse' },
          { id: 'disp-1', time: '14:22 DKR', contentFr: "Tensions d'arbitrage levées sur l'axe maritime Dakar-Gorée.", contentEn: "Maritime transit clearance issued for the Dakar-Gorée axis.", level: 'standard' },
          { id: 'disp-2', time: '11:05 ZLR', contentFr: "Hausse des obligations souveraines suite aux déclarations sur le gaz naturel.", contentEn: "Sovereign bonds rise following regional natural gas production updates.", level: 'pulse' }
        ],
        leMondeDispatches: [
          {
            id: 'lm-1',
            time: '14:22 GMT',
            tagFr: 'Sommet CEDEAO',
            tagEn: 'ECOWAS Summit',
            titleFr: 'Négociations commerciales & accords de libre-échange Ouest-Africains.',
            titleEn: 'West African trade negotiations and free trade agreements update.',
            excerptFr: 'Les ministres des Finances se sont réunis à Abuja.',
            excerptEn: 'Finance ministers convened in Abuja for tariff consensus.'
          },
          {
            id: 'lm-2',
            time: '11:05 GMT',
            tagFr: 'Marchés Financiers',
            tagEn: 'Financial Markets',
            titleFr: 'Stabilité de la BRVM et obligations souveraines de la zone UEMOA.',
            titleEn: 'BRVM market stability and WAEMU sovereign bonds report.',
            excerptFr: 'Ajustements de liquidité enregistrés en fin de séance.',
            excerptEn: 'Liquidity adjustments noted at market close.'
          },
          {
            id: 'lm-3',
            time: '08:45 GMT',
            tagFr: 'Géopolitique',
            tagEn: 'Geopolitics',
            titleFr: 'Infrastructures portuaires : Partenariats stratégiques de l\'Atlantique.',
            titleEn: 'Port infrastructure: Strategic Atlantic maritime partnerships.',
            excerptFr: 'Développement des terminaux conteneurs régionaux.',
            excerptEn: 'Regional container terminal expansion initiatives.'
          }
        ],
        coastAndHarbor: {
          tideTime: '16:48 UT',
          tideValue: '+1.64 Meter',
          goreeCount: '12 Navettes',
          goreeStatus: 'Status: Fluide',
          meteoTemp: '29°C / 84°F',
          meteoCondFr: 'Ensoleillé & Venté',
          meteoCondEn: 'Sunny & Windy',
          windValue: '18 km/h NW',
          windGusts: 'Gusts: 22 km/h',
          galeWarningFr: "Avis de coup de vent et de houle dangereuse de secteur Nord-Ouest dépassant 2,5 mètres de hauteur sur l'axe Saint-Louis - Dakar - Mbour.",
          galeWarningEn: "Severe NW gale warning with hazardous offshore swells reaching 2.5 to 3.0 meters along the Saint-Louis - Dakar - Mbour coast.",
          goreeNoteFr: "Horaires officiels de la Liaison Maritime Dakar-Gorée (LMDG). Retards minimes possibles en cas de forte houle.",
          goreeNoteEn: "Official schedules of Dakar-Gorée Maritime Link (LMDG). Slight delays may occur only during major offshore gales."
        },
        dailyWisdom: {
          wolof: "Nila lay doxé, sa gënëg du lënk.",
          translationFr: "Ceux qui avancent avec sagesse et vérité ne craignent point l'obscurité.",
          translationEn: "Those who walk in integrity and light never fear the shadow.",
          sourceFr: "EXP: PROVERBE WOLOF",
          sourceEn: "EXP: WOLOF PROVERB"
        },
        trendingCount: 4,
        mostReadCount: 5,
        categories: [
          { id: 'politique', fr: 'Politique', en: 'Politics', icon: 'Landmark' },
          { id: 'economie', fr: 'Économie', en: 'Economics', icon: 'TrendingUp' },
          { id: 'societe', fr: 'Société', en: 'Society', icon: 'Users' },
          { id: 'international', fr: 'International', en: 'International', icon: 'Globe' },
          { id: 'tech', fr: 'Tech', en: 'Tech', icon: 'Cpu' },
          { id: 'sante', fr: 'Santé', en: 'Health', icon: 'HeartPulse' },
          { id: 'sports', fr: 'Sports', en: 'Sports', icon: 'Trophy' },
          { id: 'people', fr: 'People', en: 'People', icon: 'Smile' },
          { id: 'gouvernance', fr: 'Gouvernance', en: 'Governance', icon: 'ShieldCheck' },
          { id: 'decryptages', fr: 'Décryptages', en: 'Decryptions', icon: 'BookOpen' }
        ],
        tags: [
          { id: 'senegal', fr: 'Sénégal', en: 'Senegal' },
          { id: 'dakar', fr: 'Dakar', en: 'Dakar' },
          { id: 'cedeao', fr: 'CEDEAO', en: 'ECOWAS' },
          { id: 'uemoa', fr: 'UEMOA', en: 'WAEMU' },
          { id: 'gouvernance', fr: 'Gouvernance', en: 'Governance' },
          { id: 'petrole-gaz', fr: 'Pétrole & Gaz', en: 'Oil & Gas' },
          { id: 'infrastructures', fr: 'Infrastructures', en: 'Infrastructures' },
          { id: 'agriculture', fr: 'Agriculture', en: 'Agriculture' },
          { id: 'elections', fr: 'Élections', en: 'Elections' }
        ],
        keywords: [
          'Sénégal', 'Dakar', 'Perspective Group', 'politique', 'économie', 'tech', 'culture', 'sports', 'santé', 'société', 'international', 'afrique', 'investigation', 'décryptage'
        ]
      },
      updateSiteSettings: async (settings) => {
        const newSettings = { ...get().siteSettings, ...settings, databaseProvider: 'firebase' };
        set({ siteSettings: newSettings });
        try {
          const clean = await sanitizeFirestorePayload(newSettings as any);
          await firestoreUpdateSiteSettings(clean);
        } catch (err) {
          console.error("[Firebase notice] Error updating siteSettings:", err);
        }
      },
      // FIX (BC logo & settings not appearing on other devices): settings were
      // saved to Firebase but NEVER fetched back on app startup — each device
      // only saw its own localStorage. This hydrates the shared settings from
      // the Realtime Database, merging only non-empty remote values so local
      // defaults are never clobbered by empty remote fields.
      loadSiteSettings: async () => {
        try {
          const remote = await fetchSiteSettings();
          if (!remote || typeof remote !== 'object') return;
          const current = get().siteSettings || {};
          const merged: Record<string, any> = { ...current };
          Object.entries(remote).forEach(([key, val]) => {
            if (val === undefined || val === null || val === '') return;
            if (key === 'updatedAtServer') return;
            merged[key] = val;
          });
          set({ siteSettings: merged as any });
        } catch (err) {
          console.warn('[Firebase] loadSiteSettings failed:', err);
        }
      },
      deleteUser: (email) => {
        const normalized = email.toLowerCase().trim();
        set({ users: (get().users || []).filter(u => ((u.email ?? '').toLowerCase()) !== normalized) });
      },
      updateUserRole: (email, role) => {
        const normalized = email.toLowerCase().trim();
        set({
          users: (get().users || []).map(u => ((u.email ?? '').toLowerCase()) === normalized ? { ...u, role } : u)
        });
      },
      updateUserSecurity: (email, emailVerified, mfaEnabled) => {
        const normalized = email.toLowerCase().trim();
        const users = get().users || [];
        const updatedUsers = (users ?? []).map(u => ((u.email ?? '').toLowerCase()) === normalized ? { ...u, emailVerified, mfaEnabled } : u);
        const readerProfile = get().readerProfile;
        const updatedProfile = readerProfile && ((readerProfile.email ?? '').toLowerCase()) === normalized
          ? { ...readerProfile, emailVerified, mfaEnabled }
          : readerProfile;
        set({
          users: updatedUsers,
          readerProfile: updatedProfile
        });
      },
      updateUserPassword: async (email, password) => {
        const normalized = email.toLowerCase().trim();
        const passwordHash = await hashPassword(password);
        const users = get().users || [];
        const exists = (users ?? []).some(u => ((u.email ?? '').toLowerCase()) === normalized);
        let updatedUsers = (users ?? []).map(u => ((u.email ?? '').toLowerCase()) === normalized ? { ...u, passwordHash } : u);
        if (!exists) {
          updatedUsers.push({
            id: 'admin-' + Date.now(),
            email: normalized,
            name: normalized.split('@')[0],
            role: 'Admin',
            passwordHash,
            authType: 'password',
            registeredAt: new Date().toISOString()
          });
        }
        set({ users: updatedUsers });
      },
      updateUserPin: (email, pin) => {
        const normalized = email.toLowerCase().trim();
        const users = get().users || [];
        const updatedUsers = (users ?? []).map(u => ((u.email ?? '').toLowerCase()) === normalized ? { ...u, pin, authType: 'pin' as const } : u);
        const readerProfile = get().readerProfile;
        const updatedProfile = readerProfile && ((readerProfile.email ?? '').toLowerCase()) === normalized
          ? { ...readerProfile, mfaEnabled: true }
          : readerProfile;
        set({
          users: updatedUsers,
          readerProfile: updatedProfile
        });
      },
      purgeDatabaseAndArticles: async () => {
        set({
          articles: [],
          users: [],
          comments: [],
          directMessages: [],
          notifications: [],
          interactions: [],
          savedArticles: [],
          subscribers: [],
          readerProfile: null
        });

        try {
          localStorage.removeItem('perspective-group-storage');
          localStorage.removeItem('perspective-storage-v1');
        } catch (e) {
          console.error("Error clearing local storage:", e);
        }
      },
      seedSampleArticles: () => {
        set({
          articles: seedArticles,
          media: seedMedia as MediaItem[],
          comments: seedComments as CommentItem[],
          directMessages: seedMessages as DirectMessage[],
          matches: seedMatches,
          users: []
        });
      },
      matches: [
        // Champions League
        {
          id: "cl-1",
          league: "champions-league",
          leagueLabel: { fr: "Champions League", en: "Champions League" },
          teamA: { name: "Real Madrid 🇪🇸", score: 2, color: "from-blue-600 to-zinc-800" },
          teamB: { name: "Man City 🏴󠁧󠁢󠁥󠁮󠁧󠁿", score: 2, color: "from-sky-400 to-sky-600" },
          status: "live",
          time: "64'",
          arena: "Santiago Bernabéu",
          contextInfo: { 
            fr: "Choc spectaculaire en demi-finale avec des buts magnifiques des deux côtés.", 
            en: "Spectacular semi-final clash with stunning long-range goals from both sides." 
          }
        },
        {
          id: "cl-2",
          league: "champions-league",
          leagueLabel: { fr: "Champions League", en: "Champions League" },
          teamA: { name: "PSG 🇫🇷", color: "from-blue-900 to-red-800" },
          teamB: { name: "Bayern Munich 🇩🇪", color: "from-red-600 to-red-800" },
          status: "upcoming",
          date: "Demain / Tomorrow",
          time: "19:00 GMT",
          arena: "Parc des Princes",
          contextInfo: { 
            fr: "Le Paris Saint-Germain reçoit le géant bavarois pour une place en finale.", 
            en: "Paris Saint-Germain hosts the Bavarian giants for a spot in the finals." 
          }
        },
        {
          id: "cl-3",
          league: "champions-league",
          leagueLabel: { fr: "Champions League", en: "Champions League" },
          teamA: { name: "Liverpool 🏴󠁧󠁢󠁥󠁮󠁧󠁿", score: 3, color: "from-red-700 to-red-900" },
          teamB: { name: "FC Barcelone 🇪🇸", score: 1, color: "from-blue-800 to-red-700" },
          status: "finished",
          date: "14 Mai 2026",
          time: "Score Final",
          arena: "Anfield Road",
          contextInfo: { 
            fr: "Remontée fantastique de Liverpool devant son public en délire.", 
            en: "Fantastic comeback from Liverpool in front of an ecstatic home crowd." 
          }
        },
        // World Cup
        {
          id: "wc-1",
          league: "world-cup",
          leagueLabel: { fr: "Coupe du Monde", en: "World Cup" },
          teamA: { name: "Sénégal 🇸🇳", score: 2, color: "from-emerald-600 to-green-700" },
          teamB: { name: "Pays-Bas 🇳🇱", score: 1, color: "from-orange-500 to-orange-600" },
          status: "live",
          time: "82'",
          arena: "Doha International Arena",
          contextInfo: { 
            fr: "Le Sénégal mène grâce à un doublé retentissant à la 68e et 75e minute.", 
            en: "Senegal leads with a stunning brace in the 68th and 75th minutes." 
          }
        },
        {
          id: "wc-2",
          league: "world-cup",
          leagueLabel: { fr: "Coupe du Monde", en: "World Cup" },
          teamA: { name: "Argentine 🇦🇷", score: 3, color: "from-sky-400 to-blue-500" },
          teamB: { name: "France 🇫🇷", score: 3, color: "from-blue-700 to-blue-900" },
          status: "finished",
          date: "18 Déc 2022",
          time: "T.A.B (4-2)",
          arena: "Lusail Stadium",
          contextInfo: { 
            fr: "Finale historique conclue par le triomphe de Lionel Messi aux tirs au but.", 
            en: "Historic final sealed by Lionel Messi's triumph on penalty shootouts." 
          }
        },
        {
          id: "wc-3",
          league: "world-cup",
          leagueLabel: { fr: "Coupe du Monde", en: "World Cup" },
          teamA: { name: "Brésil 🇧🇷", color: "from-yellow-400 to-green-600" },
          teamB: { name: "Sénégal 🇸🇳", color: "from-emerald-600 to-green-700" },
          status: "upcoming",
          date: "Demain / Tomorrow",
          time: "19:00 GMT",
          arena: "Al-Bayt Stadium",
          contextInfo: { 
            fr: "Match de poule très attendu pour les Lions de la Téranga.", 
            en: "Highly anticipated group-stage matchup for the Lions of Teranga." 
          }
        },
        // NBA BAL
        {
          id: "bal-1",
          league: "nba-bal",
          leagueLabel: { fr: "NBA BAL", en: "NBA BAL" },
          teamA: { name: "AS Douanes 🇸🇳", score: 78, color: "from-red-600 to-red-800" },
          teamB: { name: "Al Ahly 🇪🇬", score: 74, color: "from-red-800 to-zinc-900" },
          status: "live",
          time: "Q4 - 1:45",
          arena: "Dakar Arena, Diamniadio",
          contextInfo: { 
            fr: "L'AS Douanes pousse dans une ambiance volcanique à Dakar.", 
            en: "AS Douanes is pushing hard in a volcanic home atmosphere in Dakar." 
          }
        },
        {
          id: "bal-2",
          league: "nba-bal",
          leagueLabel: { fr: "NBA BAL", en: "NBA BAL" },
          teamA: { name: "US Monastir 🇹🇳", score: 62, color: "from-blue-600 to-blue-800" },
          teamB: { name: "Petro de Luanda 🇦🇴", score: 70, color: "from-yellow-500 to-red-600" },
          status: "finished",
          date: "Hier / Yesterday",
          time: "Score Final",
          arena: "Kigali Arena",
          contextInfo: { 
            fr: "Victoire tactique cruciale pour les géants angolais de Luanda.", 
            en: "Crucial tactical win for the Angolan giants from Luanda." 
          }
        },
        // D1 Basketball Cup
        {
          id: "d1b-1",
          league: "d1-basket",
          leagueLabel: { fr: "Coupe D1 Basket", en: "D1 Basketball Cup" },
          teamA: { name: "ASC Ville de Dakar 🇸🇳", score: 58, color: "from-cyan-600 to-blue-800" },
          teamB: { name: "Jeanne d'Arc 🇸🇳", score: 59, color: "from-blue-800 to-zinc-900" },
          status: "live",
          time: "Q3 - 4:10",
          arena: "Stadium Marius Ndiaye",
          contextInfo: { 
            fr: "Derby dakarois très serré pour le titre national de basket.", 
            en: "Tight Dakar derby deciding the national cup basketball finals." 
          }
        },
        {
          id: "d1b-2",
          league: "d1-basket",
          leagueLabel: { fr: "Coupe D1 Basket", en: "D1 Basketball Cup" },
          teamA: { name: "DUC 🇸🇳", score: 82, color: "from-amber-500 to-amber-700" },
          teamB: { name: "USO 🇸🇳", score: 76, color: "from-red-500 to-zinc-900" },
          status: "finished",
          date: "22 Juin 2026",
          time: "Score Final",
          arena: "Stadium Marius Ndiaye",
          contextInfo: { 
            fr: "Le Dakar Université Club triomphe grâce à un jeu collectif rapide.", 
            en: "Dakar University Club triumphs with high-tempo fast breaks." 
          }
        },
        // Wrestling
        {
          id: "wrest-1",
          league: "wrestling",
          leagueLabel: { fr: "Lutte avec Frappe", en: "Senegalese Wrestling" },
          teamA: { name: "Balla Gaye 2", color: "from-green-600 to-yellow-600" },
          teamB: { name: "Boy Niang 2", color: "from-red-600 to-zinc-900" },
          status: "upcoming",
          date: "Dimanche / Sunday",
          time: "18:30 GMT",
          arena: "Arène Nationale de Pikine",
          contextInfo: { 
            fr: "Le combat royal de la banlieue dakaroise. Intensité maximale.", 
            en: "The royal clash of the Dakar suburbs. Ultimate stakes." 
          }
        },
        {
          id: "wrest-2",
          league: "wrestling",
          leagueLabel: { fr: "Lutte avec Frappe", en: "Senegalese Wrestling" },
          teamA: { name: "Reug Reug", score: 1, color: "from-yellow-500 to-orange-600" },
          teamB: { name: "Sa Thiès", score: 0, color: "from-blue-600 to-zinc-800" },
          status: "finished",
          date: "14 Juin 2026",
          time: "KO Technique",
          arena: "Arène Nationale de Pikine",
          contextInfo: { 
            fr: "Victoire éclair par projection dévastatrice suivie de frappes régulières.", 
            en: "Flash victory by explosive takedown followed by heavy ground strikes." 
          }
        },
        // Navetane League
        {
          id: "nav-1",
          league: "navetane",
          leagueLabel: { fr: "Championnat Navétanes", en: "Navetane League" },
          teamA: { name: "ASC Deggo (Zone 1)", score: 1, color: "from-teal-600 to-emerald-800" },
          teamB: { name: "ASC Milan (Medina)", score: 1, color: "from-red-600 to-zinc-950" },
          status: "live",
          time: "88'",
          arena: "Stade de l'Iba Mar Diop",
          contextInfo: { 
            fr: "Atmosphère électrique de quartier, Milan pousse pour arracher le but vainqueur.", 
            en: "Volcanic neighborhood atmosphere, Milan pushes hard to grab the winner." 
          }
        },
        {
          id: "nav-2",
          league: "navetane",
          leagueLabel: { fr: "Championnat Navétanes", en: "Navetane League" },
          teamA: { name: "ASC Jappo (Zone 4)", score: 2, color: "from-indigo-600 to-indigo-900" },
          teamB: { name: "ASC Wallidan", score: 0, color: "from-emerald-500 to-teal-700" },
          status: "finished",
          date: "20 Juin 2026",
          time: "Score Final",
          arena: "Stade Amadou Barry",
          contextInfo: { 
            fr: "Jappo se qualifie pour les quarts de finale départementaux.", 
            en: "Jappo secures their place in the department quarter-finals." 
          }
        }
      ],
      updateMatch: async (matchId, updated) => {
        const matches = (get().matches || []).map(m => m.id === matchId ? { ...m, ...updated } : m);
        set({ matches });
        const target = (matches ?? []).find(m => m.id === matchId);
        if (target) {
          try {
            const clean = await sanitizeFirestorePayload(target as any);
            if (supabase) { await supabase.from('matches').upsert({ id: matchId, ...clean }).catch(() => {}); }
          } catch (e) {
            console.error("[Supabase notice] Error updating match:", e);
          }
        }
      },
      addMatch: async (match) => {
        set({ matches: [...(get().matches || []), match] });
        try {
          const clean = await sanitizeFirestorePayload(match as any);
          if (supabase) { await supabase.from('matches').upsert({ id: match.id, ...clean }).catch(() => {}); }
        } catch (e) {
          console.error("[Supabase notice] Error adding match:", e);
        }
      },
      deleteMatch: (matchId) => {
        set({ matches: (get().matches || []).filter(m => m.id !== matchId) });
        if (supabase) { supabase.from('matches').delete().eq('id', matchId).catch(() => {}); }
        }
    }),
    {
      name: 'perspective-group-storage',
      // v4: purge persisted fake "Visiteur" readerProfile created by older
      // logout/delete-account code (made the login/register UI unreachable).
      // v5: purge the full `articles` array from localStorage (it caused
      // QuotaExceededError crashes — articles are re-fetched from the cloud
      // on every load and backed up separately in LOCAL_ARTICLES_KEY).
      version: 5,
      storage: createSafeJSONStorage(),
      // v3: every browser drops ALL stale persisted data on next load.
      // Shared-domain data (articles/users/comments/messages/...) is never
      // persisted anymore — it is always re-fetched fresh from MongoDB.
      // IMPORTANT: only copy keys whose value is defined, otherwise a missing
      // persisted field would overwrite the live default (e.g. savedArticles: [])
      // with `undefined` and crash every `.length`/`.map()` that reads it.
      migrate: (persistedState: any) => {
        const safe: any = {};
        if (persistedState && typeof persistedState === 'object') {
          const keys = [
            'theme', 'language', 'savedArticles', 'activeMessengerContact',
            'messengerTextScale', 'notificationPreferences',
            'notificationResponses', 'readerProfile',
            'siteSettings'
          ];
          for (const k of keys) {
            if (persistedState[k] !== undefined && persistedState[k] !== null) {
              safe[k] = persistedState[k];
            }
          }
          // FIX (login buttons missing after logout): older builds persisted a
          // fake "Visiteur" profile object on logout/delete-account, which is
          // truthy and keeps the header showing the Account button forever.
          // Discard it — a real profile always has a non-empty email.
          const rp = safe.readerProfile;
          if (rp && (typeof rp !== 'object' || !(rp.email || '').trim() || rp.id === 'visiteur' || rp.name === 'Visiteur')) {
            delete safe.readerProfile;
          }
        }
        return safe;
      },
      // Never let rehydrated `undefined` values clobber valid in-memory defaults,
      // and guarantee every known array field is ALWAYS an array so that no
      // `.length`/`.map()` anywhere in the app can crash on `undefined`.
      merge: (persistedState: any, currentState: any) => {
        const out: any = { ...currentState };
        if (persistedState && typeof persistedState === 'object') {
          for (const k of Object.keys(persistedState)) {
            const v = persistedState[k];
            if (k && v !== undefined && v !== null) out[k] = v;
          }
        }
        // Array-field safety net — never allow these to be non-arrays.
        const ARRAY_KEYS = [
          'articles', 'savedArticles', 'users', 'comments', 'directMessages',
          'notifications', 'friends', 'interactions', 'media', 'ads',
          'subscribers', 'matches'
        ];
        for (const k of ARRAY_KEYS) {
          if (!Array.isArray(out[k])) out[k] = [];
        }
        return out;
      },
      partialize: (state) => {
        // Persist ONLY UI preferences and lightweight user state.
        //
        // NB: `articles` is deliberately NOT persisted here. Each Article
        // carries a bilingual `body`, excerpts, perspectiveBrief, keyActors,
        // timeline, structuralForces, SEO metadata, and image URLs — easily
        // 5–10 KB per article. With 100+ articles the JSON blob blows past
        // the browser localStorage quota (~5–10 MB), and zustand's
        // createJSONStorage throws a *synchronous* QuotaExceededError that
        // crashes the React render cycle ("interruption d'affichage").
        //
        // Articles are instead:
        //   • Re-fetched from Firestore/MongoDB on every load via
        //     loadArticles() (fetchAllArticles), which is the source of truth.
        //   • Backed up offline in the SEPARATE LOCAL_ARTICLES_KEY key
        //     (persistArticleLocally / loadArticlesFromLocalBackup), capped
        //     at 200 entries, so a reload never loses user-created content
        //     even when the cloud write hasn't propagated yet.
        //   • Recovered from legacy localStorage keys by the recovery sweep
        //     inside loadArticles() (lines below this persist block).
        //
        // siteSettings is persisted so that the BC logo (boukariCorpLogo)
        // and other customizer settings survive page reloads.
        return {
          theme: state.theme,
          language: state.language,
          savedArticles: state.savedArticles,
          activeMessengerContact: state.activeMessengerContact,
          messengerTextScale: state.messengerTextScale,
          notificationPreferences: state.notificationPreferences,
          notificationResponses: state.notificationResponses,
          readerProfile: state.readerProfile,
          // REMOVED: articles — see comment above; causes QuotaExceededError.
          siteSettings: state.siteSettings,
          // REMOVED: users - must be fetched from MongoDB on every page load
        };
      },
      onRehydrateStorage: () => (state: any) => {
        // NOTE: previously this callback used `delete state.X` to clear stale
        // persisted data — but zustand v5 passes the ALREADY-MERGED state here,
        // so `delete` corrupts the live in-memory store and leaves keys
        // `undefined`, crashing every `.filter/.map/.length` on first render.
        // Stale-data protection is now handled by `migrate` + `partialize`
        // above (shared data is never persisted). Intentionally a no-op.
        return undefined;
      }
    }
  )
);



