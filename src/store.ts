import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set as idbSet, del } from 'idb-keyval';
import { Article, Language, Match } from './types';
import { sampleArticles } from './data';
import { seedArticles, seedComments, seedMessages, seedMedia, seedSubscribers, seedMatches, seedSiteSettings } from './data/seedData';
import { db, doc, setDoc, deleteDoc, getDocs, collection } from './lib/mongodb';
import { sanitizeFirestorePayload } from './lib/imageUtils';
import { trackConversion } from './lib/telemetry';

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return (await get(name)) || null;
    } catch (err) {
      console.warn("IndexedDB getItem fallback notice:", err);
      try {
        return localStorage.getItem(name);
      } catch (_) {
        return null;
      }
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await idbSet(name, value);
    } catch (err) {
      console.warn("IndexedDB setItem fallback notice:", err);
      try {
        localStorage.setItem(name, value);
      } catch (_) {}
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await del(name);
    } catch (err) {
      console.warn("IndexedDB removeItem fallback notice:", err);
      try {
        localStorage.removeItem(name);
      } catch (_) {}
    }
  },
};

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
  avatarUrl?: string;
  role?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  isMongoDB?: boolean;
  coverPhotoUrl?: string;
  streak?: number;
  readingTime?: number;
  hidePersonalInfo?: boolean;
  hideEmail?: boolean;
  bio?: string;
  accolades?: string[];
  notificationPreferences?: NotificationPreferences;
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
  read?: boolean;
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
  category?: 'messages' | 'newsletters' | 'newPublishes' | 'generalNews' | 'system';
}

export interface SubscriberItem {
  email: string;
  date: string;
}

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  savedArticles: string[];
  toggleSavedArticle: (id: string) => void;
  articles: Article[];
  setArticles: (articles: Article[]) => void;
  syncFromMongoDB: () => Promise<void>;
  addArticle: (article: Article) => void;
  updateArticle: (article: Article) => void;
  deleteArticle: (id: string) => void;
  purgeAllArticles: () => Promise<void>;
  media: MediaItem[];
  addMedia: (m: MediaItem) => void;
  deleteMedia: (id: string) => void;
  updateMediaName: (id: string, name: string) => void;
  ads: AdItem[];
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
  friends: FriendContact[];
  addFriend: (friend: FriendContact) => void;
  deleteFriend: (email: string) => void;
  abdelPrompts: { fr: string[]; en: string[] };
  updateAbdelPrompts: (prompts: { fr: string[]; en: string[] }) => void;
  sendWarningNotification: (email: string, textFr: string, textEn: string) => void;
  notifications: NotificationItem[];
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  addNotification: (notification: NotificationItem) => void;
  clearNotifications: (email: string) => void;
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

  loginUser: (email: string, credential: string, authType: 'password' | 'pin') => boolean;
  addInteraction: (email: string, type: string, detail: { fr: string; en: string }, link?: string) => void;
  notificationResponses: Record<string, 'accepted' | 'disputed'>;
  respondToNotification: (notifId: string, response: 'accepted' | 'disputed') => void;
  siteSettings: {
    isMaintenanceMode?: boolean;
    maintenanceMessageFr?: string;
    maintenanceMessageEn?: string;
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
  };
  updateSiteSettings: (settings: Partial<AppState['siteSettings']>) => void;
  deleteUser: (email: string) => void;
  updateUserRole: (email: string, role: string) => void;
  updateUserSecurity: (email: string, emailVerified: boolean, mfaEnabled: boolean) => void;
  updateUserPassword: (email: string, password: string) => void;
  updateUserPin: (email: string, pin: string) => void;
  purgeDatabaseAndArticles: () => Promise<void>;
  seedSampleArticles: () => void;
  matches: Match[];
  updateMatch: (matchId: string, updated: Partial<Match>) => void;
  addMatch: (match: Match) => void;
  deleteMatch: (matchId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      language: 'fr',
      setLanguage: (lang) => set({ language: lang }),
      showSignUpModal: false,
      setShowSignUpModal: (show) => set({ showSignUpModal: show }),
      authTab: 'login',
      setAuthTab: (tab) => set({ authTab: tab }),
      savedArticles: [],
      toggleSavedArticle: (id) => {
        const saved = get().savedArticles || [];
        const isSaving = !saved.includes(id);
        const email = get().readerProfile?.email || 'anonymous';
        const art = get().articles.find(a => a.id === id);
        
        if (saved.includes(id)) {
          set({ savedArticles: saved.filter((s) => s !== id) });
        } else {
          set({ savedArticles: [...saved, id] });
        }

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
      articles: sampleArticles,
      setArticles: (articles) => set({ articles }),
      syncFromMongoDB: async () => {
        try {
          const snapshot = await getDocs(collection(db, "articles"));
          if (snapshot && !snapshot.empty) {
            const fetchedArticles: Article[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data) {
                fetchedArticles.push(data as Article);
              }
            });
            if (fetchedArticles.length > 0) {
              fetchedArticles.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
              set({ articles: fetchedArticles });
            }
          }

          // Fetch Ads from MongoDB
          const adsSnapshot = await getDocs(collection(db, "ads"));
          if (adsSnapshot && !adsSnapshot.empty) {
            const fetchedAds = [];
            adsSnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data) fetchedAds.push(data);
            });
            if (fetchedAds.length > 0) {
              set({ ads: fetchedAds });
            }
          }
        } catch (err) {
          console.error("Failed to sync from MongoDB:", err);
        }
      },
      addArticle: async (article) => {
        set({ articles: [article, ...get().articles] });
        try {
          const clean = await sanitizeFirestorePayload(article as any);
          await setDoc(doc(db, "articles", article.id), clean, { merge: true });
        } catch (err) {
          console.error("Error writing article to MongoDB:", err);
        }

        if (article.isPublished) {
          const currentProfile = get().readerProfile;
          const artTitleFr = typeof article.title === 'string' ? article.title : (article.title?.fr || 'Nouvel article');
          const artTitleEn = typeof article.title === 'string' ? article.title : (article.title?.en || 'New article');
          get().addNotification({
            id: 'pub-' + Date.now(),
            email: currentProfile?.email || 'kadersdiaz3@gmail.com',
            text: {
              fr: `📰 Nouvel Article Publié : "${artTitleFr}"`,
              en: `📰 New Article Released: "${artTitleEn}"`
            },
            date: new Date().toISOString().split('T')[0],
            isRead: false,
            category: 'newPublishes',
            link: `/article/${article.slug}`
          });
        }
      },
      updateArticle: async (article) => {
        set({ articles: get().articles.map(a => a.id === article.id ? article : a) });
        try {
          const clean = await sanitizeFirestorePayload(article as any);
          await setDoc(doc(db, "articles", article.id), clean, { merge: true });
        } catch (err) {
          console.error("Error updating article in MongoDB:", err);
        }
      },
      deleteArticle: (id) => {
        set({ articles: get().articles.filter(a => a.id !== id) });
        deleteDoc(doc(db, "articles", id)).catch(() => {});
      },
      purgeAllArticles: async () => {
        // Capture current articles BEFORE resetting store state
        const currentArticles = [...(get().articles || [])];
        set({ articles: [] });

        // Delete all captured articles from MongoDB
        const deletePromises = currentArticles.map(a => 
          deleteDoc(doc(db, "articles", a.id)).catch(err => console.error(`Failed deleting ${a.id}:`, err))
        );
        await Promise.all(deletePromises);

        // Query MongoDB collection directly to delete any remaining draft or live articles
        try {
          const snapshot = await getDocs(collection(db, "articles"));
          const mongodbDeletes = snapshot.docs.map(docSnap => 
            deleteDoc(doc(db, "articles", docSnap.id)).catch(err => console.error(`Failed deleting doc ${docSnap.id}:`, err))
          );
          await Promise.all(mongodbDeletes);
        } catch (e) {
          console.error("Error purging MongoDB articles collection:", e);
        }

        // Purge server-side RSS drafts and cache
        try {
          await fetch('/api/webhooks/make-rss', { method: 'DELETE' });
        } catch (e) {
          console.error("Error calling DELETE /api/webhooks/make-rss:", e);
        }
      },
      media: seedMedia && seedMedia.length > 0 ? (seedMedia as MediaItem[]) : [],
      addMedia: async (m) => {
        set({ media: [m, ...(get().media || [])] });
        try {
          const clean = await sanitizeFirestorePayload(m as any);
          await setDoc(doc(db, "media", m.id), clean, { merge: true });
        } catch (err) {
          console.error("Error adding media to MongoDB:", err);
        }
      },
      deleteMedia: (id) => {
        set({ media: (get().media || []).filter(m => m.id !== id) });
        deleteDoc(doc(db, "media", id)).catch(() => {});
      },
      updateMediaName: (id, name) => {
        set({ media: (get().media || []).map(m => m.id === id ? { ...m, name } : m) });
        setDoc(doc(db, "media", id), { name }, { merge: true }).catch(() => {});
      },
      ads: [
        {
          id: 'default-header-ad',
          name: 'Orange 5G Home Box',
          imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=1200&fit=crop',
          targetUrl: 'https://orange.sn',
          position: 'header',
          active: true,
          tag: 'ORANGE SÉNÉGAL',
          description: 'Profitez du très haut débit avec la nouvelle box 5G d\'Orange. La puissance du réseau numéro 1 au Sénégal.',
          ctaText: 'Découvrir l\'offre',
          impressions: 14520,
          clicks: 342
        },
        {
          id: 'h-ad-1',
          name: 'Sovereign Impact Fund for West Africa',
          imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800&fit=crop',
          targetUrl: 'https://www.bceao.int',
          position: 'in-article',
          active: true,
          tag: 'FINANCE & COLLATERAL',
          description: 'Maximisez vos investissements stratégiques et participez au développement socio-économique dakarois.',
          ctaText: 'En savoir plus',
          impressions: 9840,
          clicks: 215
        },
        {
          id: 'h-ad-2',
          name: 'Digital Infrastructures Senegal Hub',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&fit=crop',
          targetUrl: 'https://www.sec.gouv.sn',
          position: 'in-article',
          active: true,
          tag: 'CLOUD & CLUSTERTECH',
          description: 'Des performances cloud premium et un accompagnement local d\'exception pour les leaders du e-commerce.',
          ctaText: 'Tester Gratuitement',
          impressions: 7210,
          clicks: 144
        },
        {
          id: 'h-ad-3',
          name: 'The Perspective: Readers\' Club Weekly Edition',
          imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&fit=crop',
          targetUrl: 'https://ai.studio/build',
          position: 'in-article',
          active: true,
          tag: 'EXCLUSIVE REPORTS',
          description: 'Abonnez-vous à nos rapports de synthèse et grands décryptages exclusifs du journal Perspective.',
          ctaText: 'Rejoindre le Club',
          impressions: 4510,
          clicks: 98
        },
        {
          id: 'h-ad-4',
          name: 'Prestige Residences & Sustainable Villas',
          imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800&fit=crop',
          targetUrl: 'https://www.sec.gouv.sn',
          position: 'sidebar',
          active: true,
          tag: 'REAL ESTATE PRESTIGE',
          description: 'Achetez d\'incroyables propriétés d\'exception à Dakar Almadies et en bord de mer à Saly.',
          ctaText: 'Découvrir la Brochure',
          impressions: 12340,
          clicks: 278
        },
        {
          id: 'ad-cafe-touba',
          name: 'CAFÉ SÉNÉGAL TOUBA',
          imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&fit=crop',
          targetUrl: 'https://cafetouba.sn',
          position: 'sidebar-cafe',
          active: true,
          tag: 'SPONSORISÉ',
          description: 'L\'arôme authentique aux épices de grains de poivre noir des terroirs.',
          ctaText: 'COMMANDER',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          textColor: '#78350f',
          impressions: 11200,
          clicks: 380
        },
        {
          id: 'ad-ter-trans-dakar',
          name: 'TER - TRANS-DAKAR',
          imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=800&fit=crop',
          targetUrl: 'https://terdakar.sn',
          position: 'sidebar-ter',
          active: true,
          tag: 'SPONSORISÉ',
          description: 'Dakar-Diamniadio en 20 minutes chrono. Wi-Fi gratuit à bord.',
          ctaText: 'HORAIRES TER',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          textColor: '#1e3a8a',
          impressions: 15300,
          clicks: 410
        }
      ],
      saveAd: async (ad) => {
        const existing = (get().ads || []).find(a => a.id === ad.id);
        const updatedAds = existing
          ? (get().ads || []).map(a => a.id === ad.id ? ad : a)
          : [ad, ...(get().ads || [])];
        set({ ads: updatedAds });
        try {
          const clean = await sanitizeFirestorePayload(ad as any);
          await setDoc(doc(db, "ads", ad.id), clean, { merge: true });
        } catch (err) {
          console.error("Error saving ad to MongoDB:", err);
        }
      },
      deleteAd: (id) => {
        set({ ads: (get().ads || []).filter(a => a.id !== id) });
        deleteDoc(doc(db, "ads", id)).catch(err => console.error("Error deleting ad from MongoDB:", err));
      },
      comments: seedComments && seedComments.length > 0 ? (seedComments as CommentItem[]) : [],
      directMessages: seedMessages && seedMessages.length > 0 ? (seedMessages as DirectMessage[]) : [],
      sendDirectMessage: (msg) => {
        const dms = get().directMessages || [];
        const msgId = 'dm-' + Date.now().toString() + Math.random().toString(36).substring(4);
        const newMsg = {
          ...msg,
          id: msgId,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        };
        set({ directMessages: [...dms, newMsg] });

        // Save to MongoDB
        try {
          const cleanMsg = JSON.parse(JSON.stringify(newMsg));
          setDoc(doc(db, "messages", msgId), cleanMsg).catch(err => {
            console.error("Failed to write message to MongoDB:", err);
          });
        } catch (err) {
          console.warn("MongoDB write failed, falling back to local only:", err);
        }

        // Trigger notification for receiver if logged in or mock alert
        get().addNotification({
          id: 'notif-dm-' + Date.now(),
          email: msg.receiver,
          text: {
            fr: `Nouveau message de la part de ${msg.sender === 'admin@perspective.sn' ? 'l\'Administrateur' : msg.sender}.`,
            en: `New direct message from ${msg.sender === 'admin@perspective.sn' ? 'Admin' : msg.sender}.`
          },
          date: new Date().toISOString().split('T')[0],
          isRead: false,
          category: 'messages'
        });
      },
      deleteDirectMessage: (id) => {
        const dms = get().directMessages || [];
        set({ directMessages: dms.filter(dm => dm.id !== id) });
        try {
          deleteDoc(doc(db, "messages", id)).catch(() => {});
        } catch (err) {}
      },
      markDirectMessagesAsRead: (contactEmail, userEmail) => {
        const dms = get().directMessages || [];
        const senderClean = contactEmail ? contactEmail.toLowerCase() : '';
        const receiverClean = userEmail ? userEmail.toLowerCase() : '';
        let updated = false;

        const newDms = dms.map(dm => {
          if (!dm.read && dm.receiver?.toLowerCase() === receiverClean && (!senderClean || dm.sender?.toLowerCase() === senderClean)) {
            updated = true;
            try {
              setDoc(doc(db, "messages", dm.id), { read: true }, { merge: true }).catch(() => {});
            } catch (err) {}
            return { ...dm, read: true };
          }
          return dm;
        });

        if (updated) {
          set({ directMessages: newDms });
        }

        const notifs = get().notifications || [];
        const updatedNotifs = notifs.map(n => {
          if ((!n.email || n.email.toLowerCase() === receiverClean) && n.category === 'messages' && !n.isRead) {
            return { ...n, isRead: true };
          }
          return n;
        });
        set({ notifications: updatedNotifs });
      },
      friends: [],
      addFriend: (friend) => set(state => ({ friends: [...(state.friends || []), friend] })),
      deleteFriend: (email) => set(state => ({ friends: (state.friends || []).filter(f => f.email !== email) })),
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
      addComment: (comment) => {
        const comments = get().comments || [];
        const filtered = comments.filter(c => c.id !== comment.id);
        set({ comments: [comment, ...filtered] });
        
        // Write to MongoDB comments collection
        try {
          const cleanComment = JSON.parse(JSON.stringify(comment));
          setDoc(doc(db, "comments", comment.id), cleanComment).catch(err => {
            console.error("Failed to write comment to MongoDB:", err);
          });
        } catch (err) {
          console.warn("MongoDB comment write error:", err);
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
          const parent = comments.find(p => p.id === comment.parentId);
          if (parent && parent.email && parent.email.toLowerCase() !== comment.email?.toLowerCase()) {
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
          if (friend.email && friend.email.toLowerCase() !== comment.email?.toLowerCase()) {
            get().addNotification({
              id: 'notif-friend-comment-' + Date.now() + '-' + Math.random().toString(36).substring(4),
              email: friend.email,
              text: {
                fr: `${comment.author} (Ami) a publié un commentaire sur "${comment.articleTitle || 'un article'}" : "${comment.text.substring(0, 35)}..."`,
                en: `${comment.author} (Friend) posted a comment on "${comment.articleTitle || 'an article'}": "${comment.text.substring(0, 35)}..."`
              },
              date: new Date().toISOString().split('T')[0],
              isRead: false,
              category: 'messages',
              link: `/article/${comment.articleId}`
            });
          }
        });
      },
      approveComment: (id) => {
        set({ comments: (get().comments || []).map(c => c.id === id ? { ...c, isApproved: true } : c) });
        try {
          setDoc(doc(db, "comments", id), { isApproved: true }, { merge: true });
        } catch (e) { console.error(e); }
      },
      deleteComment: (id, requesterEmail) => {
        const comments = get().comments || [];
        const comment = comments.find(c => c.id === id);
        if (!comment) return;

        if (requesterEmail) {
          const isOwner = comment.email && requesterEmail.trim().toLowerCase() === comment.email.trim().toLowerCase();
          if (!isOwner) {
            console.warn("Unauthorized attempt to delete comment by non-owner:", requesterEmail);
            return;
          }
        }

        set({ comments: comments.filter(c => c.id !== id) });
        try {
          deleteDoc(doc(db, "comments", id)).catch(err => console.error("MongoDB comment deletion error:", err));
        } catch (err) { console.error(err); }

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
        const comment = comments.find(c => c.id === id);
        if (!comment) return false;

        if (requesterEmail) {
          const isOwner = comment.email && requesterEmail.trim().toLowerCase() === comment.email.trim().toLowerCase();
          if (!isOwner) {
            console.warn("Unauthorized attempt to modify comment by non-owner:", requesterEmail);
            return false;
          }
        }

        set({
          comments: comments.map(c => c.id === id ? { ...c, text, isApproved: true } : c)
        });
        try {
          setDoc(doc(db, "comments", id), { text, isApproved: true }, { merge: true });
        } catch (err) { console.error(err); }

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
        const comment = comments.find(c => c.id === id);
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
          comments: comments.map(c => c.id === id ? { ...c, likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy } : c)
        });

        try {
          setDoc(doc(db, "comments", id), { likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy }, { merge: true });
        } catch (err) { console.error(err); }

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
        const comment = comments.find(c => c.id === id);
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
          comments: comments.map(c => c.id === id ? { ...c, likes, dislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy } : c)
        });

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
          setDoc(doc(db, "users", currentProfile.id || currentProfile.email), updatedProfile, { merge: true }).catch(() => {});
        } else {
          set({ notificationPreferences: updated });
        }
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

        // Trigger browser notification if permitted
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const textMsg = typeof notification.text === 'string' 
            ? notification.text 
            : (notification.text?.[get().language] || notification.text?.fr || 'Nouvelle notification');
          
          if (Notification.permission === 'granted') {
            try {
              new Notification('Perspective Group', {
                body: textMsg,
                icon: '/favicon.ico'
              });
            } catch (e) {}
          } else if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                try {
                  new Notification('Perspective Group', {
                    body: textMsg,
                    icon: '/favicon.ico'
                  });
                } catch (e) {}
              }
            }).catch(() => {});
          }
        }
      },
      clearNotifications: (email) => {
        const list = get().notifications || [];
        const hasUnread = list.some(n => n.email.toLowerCase() === email.toLowerCase() && !n.isRead);
        if (!hasUnread) return;
        set({
          notifications: list.map(n =>
            n.email.toLowerCase() === email.toLowerCase() ? { ...n, isRead: true } : n
          )
        });
      },
      deleteNotification: (id) => set({ notifications: (get().notifications || []).filter(n => n.id !== id) }),
      notificationResponses: {},
      respondToNotification: (notifId, response) => {
        set({
          notificationResponses: {
            ...(get().notificationResponses || {}),
            [notifId]: response
          }
        });
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
        if (!current.some(s => s.email.toLowerCase() === clean)) {
          const newSub = { email: clean, date: new Date().toISOString().split('T')[0] };
          set({ subscribers: [newSub, ...current] });
          trackConversion('newsletter_subscription', clean, { source: 'subscription_form' });
          try {
            const subDocId = clean.replace(/[^a-zA-Z0-9]/g, '_');
            await setDoc(doc(db, "subscribers", subDocId), {
              email: clean,
              date: newSub.date,
              createdAt: new Date().toISOString(),
              active: true
            }, { merge: true });
          } catch (err) {
            console.error("Error saving subscriber to MongoDB:", err);
          }
        }
      },
      deleteSubscriber: async (email) => {
        const clean = email.trim().toLowerCase();
        set({ subscribers: (get().subscribers || []).filter(s => s.email.toLowerCase() !== clean) });
        try {
          const subDocId = clean.replace(/[^a-zA-Z0-9]/g, '_');
          await deleteDoc(doc(db, "subscribers", subDocId));
        } catch (err) {
          console.error("Error deleting subscriber from MongoDB:", err);
        }
      },
      readerProfile: null,
      setReaderProfile: (profile) => set((state) => {
        const updatedUsers = (state.users || []).map(u => 
          profile && u.email.toLowerCase() === profile.email.toLowerCase()
            ? { ...u, name: profile.name, avatarUrl: profile.avatarUrl, emailVerified: profile.emailVerified, mfaEnabled: profile.mfaEnabled }
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
          email: 'admin@perspective.sn',
          type: 'read',
          date: '2026-06-25',
          detail: { fr: 'A ouvert le tableau de bord administrateur.', en: 'Opened the administrator control panel.' }
        }
      ],
      
      updatePrivacy: (email, isPrivate) => {
        const users = get().users || [];
        const normalized = email.toLowerCase().trim();
        set({
          users: users.map(u => u.email.toLowerCase().trim() === normalized ? { ...u, isPrivate } : u)
        });
      },
      sendFriendRequest: (fromEmail, toEmail) => {
        const users = get().users || [];
        const fromNorm = fromEmail.toLowerCase().trim();
        const toNorm = toEmail.toLowerCase().trim();
        set({
          users: users.map(u => {
            const currentEmail = u.email.toLowerCase().trim();
            if (currentEmail === fromNorm) {
              return { ...u, sentFriendRequests: [...(u.sentFriendRequests || []), toNorm] };
            }
            if (currentEmail === toNorm) {
              return { ...u, pendingFriendRequests: [...(u.pendingFriendRequests || []), fromNorm] };
            }
            return u;
          })
        });
      },
      acceptFriendRequest: (fromEmail, toEmail) => {
        const users = get().users || [];
        const fromNorm = fromEmail.toLowerCase().trim();
        const toNorm = toEmail.toLowerCase().trim(); // the one accepting
        set({
          users: users.map(u => {
            const currentEmail = u.email.toLowerCase().trim();
            if (currentEmail === fromNorm) {
              return { 
                ...u, 
                friends: [...(u.friends || []), toNorm],
                sentFriendRequests: (u.sentFriendRequests || []).filter(e => e !== toNorm)
              };
            }
            if (currentEmail === toNorm) {
              return { 
                ...u, 
                friends: [...(u.friends || []), fromNorm],
                pendingFriendRequests: (u.pendingFriendRequests || []).filter(e => e !== fromNorm)
              };
            }
            return u;
          })
        });
      },
      removeFriend: (email1, email2) => {
        const users = get().users || [];
        const norm1 = email1.toLowerCase().trim();
        const norm2 = email2.toLowerCase().trim();
        set({
          users: users.map(u => {
            const currentEmail = u.email.toLowerCase().trim();
            if (currentEmail === norm1) {
              return { ...u, friends: (u.friends || []).filter(e => e !== norm2) };
            }
            if (currentEmail === norm2) {
              return { ...u, friends: (u.friends || []).filter(e => e !== norm1) };
            }
            return u;
          })
        });
      },

      registerUser: (newUser) => {
        const users = get().users || [];
        const normalizedEmail = newUser.email.trim().toLowerCase();
        if (users.some(u => u.email.trim().toLowerCase() === normalizedEmail)) {
          return false;
        }
        const normalizedUser = {
          ...newUser,
          email: normalizedEmail
        };
        set({ users: [normalizedUser, ...users] });
        return true;
      },
      loginUser: (email, credential, authType) => {
        const users = get().users || [];
        const trimmedEmail = email.trim().toLowerCase();
        const user = users.find(u => u.email.trim().toLowerCase() === trimmedEmail);
        if (!user) return false;

        // Try checking both password and pin for max user-friendliness
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
      },
      siteSettings: {
        isMaintenanceMode: false,
        maintenanceMessageFr: "Notre site est actuellement en cours de maintenance et de mise à jour technique. Nous serons de retour très rapidement.",
        maintenanceMessageEn: "Our platform is currently undergoing scheduled maintenance and updates. We will be back online shortly.",
        siteName: 'Perspective',
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
        seoCanonicalBase: 'https://perspective.sn',
        seoDefaultDesc: "Grand journal d'information et de décryptage indépendant depuis Dakar. Couverture complète : Politique, Économie, Société, Tech, Culture, Sports, Santé et International.",
        databaseProvider: 'mongodb',
        editorialPhone: '+221 33 824 55 55',
        supportEmail: 'contact@perspective.sn',
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
        const newSettings = { ...get().siteSettings, ...settings };
        set({ siteSettings: newSettings });
        try {
          const clean = await sanitizeFirestorePayload(newSettings as any);
          await setDoc(doc(db, "siteSettings", "config"), clean, { merge: true });
        } catch (err) {
          console.error("Error updating siteSettings in MongoDB:", err);
        }
      },
      deleteUser: (email) => {
        const normalized = email.toLowerCase().trim();
        set({ users: (get().users || []).filter(u => u.email.toLowerCase() !== normalized) });
        try {
          deleteDoc(doc(db, "users", normalized)).catch(err => console.error("Error deleting user from MongoDB:", err));
        } catch (e) { console.error(e); }
      },
      updateUserRole: (email, role) => {
        const normalized = email.toLowerCase().trim();
        set({
          users: (get().users || []).map(u => u.email.toLowerCase() === normalized ? { ...u, role } : u)
        });
        try {
          setDoc(doc(db, "users", normalized), { role }, { merge: true }).catch(err => console.error("Error updating user role in MongoDB:", err));
        } catch (e) { console.error(e); }
      },
      updateUserSecurity: (email, emailVerified, mfaEnabled) => {
        const normalized = email.toLowerCase().trim();
        const users = get().users || [];
        const updatedUsers = users.map(u => u.email.toLowerCase() === normalized ? { ...u, emailVerified, mfaEnabled } : u);
        const readerProfile = get().readerProfile;
        const updatedProfile = readerProfile && readerProfile.email.toLowerCase() === normalized
          ? { ...readerProfile, emailVerified, mfaEnabled }
          : readerProfile;
        set({
          users: updatedUsers,
          readerProfile: updatedProfile
        });
        try {
          setDoc(doc(db, "users", normalized), { emailVerified, mfaEnabled, twoFactorEnabled: mfaEnabled }, { merge: true }).catch(err => console.error("Error updating user security in MongoDB:", err));
        } catch (e) { console.error(e); }
      },
      updateUserPassword: (email, password) => {
        const normalized = email.toLowerCase().trim();
        const users = get().users || [];
        const exists = users.some(u => u.email.toLowerCase() === normalized);
        let updatedUsers = users.map(u => u.email.toLowerCase() === normalized ? { ...u, password } : u);
        if (!exists) {
          updatedUsers.push({
            id: 'admin-' + Date.now(),
            email: normalized,
            name: normalized.split('@')[0],
            role: 'Admin',
            password: password,
            authType: 'password',
            registeredAt: new Date().toISOString()
          });
        }
        set({ users: updatedUsers });
        try {
          setDoc(doc(db, "users", normalized), { password, email: normalized, role: 'Admin' }, { merge: true }).catch(err => console.error("Error updating user password in MongoDB:", err));
        } catch (e) { console.error(e); }
      },
      updateUserPin: (email, pin) => {
        const normalized = email.toLowerCase().trim();
        const users = get().users || [];
        const updatedUsers = users.map(u => u.email.toLowerCase() === normalized ? { ...u, pin, authType: 'pin' as const } : u);
        const readerProfile = get().readerProfile;
        const updatedProfile = readerProfile && readerProfile.email.toLowerCase() === normalized
          ? { ...readerProfile, mfaEnabled: true }
          : readerProfile;
        set({
          users: updatedUsers,
          readerProfile: updatedProfile
        });
        try {
          setDoc(doc(db, "users", normalized), { pin, authType: 'pin', mfaEnabled: true, twoFactorEnabled: true }, { merge: true }).catch(err => console.error("Error updating user PIN in MongoDB:", err));
        } catch (e) { console.error(e); }
      },
      purgeDatabaseAndArticles: async () => {
        const articlesToDelete = get().articles || [];
        const usersToDelete = get().users || [];
        
        // 1. Reset local state immediately
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

        // 2. Clear client-side storage caches
        try {
          await del('perspective-group-storage');
          await del('perspective-storage-v1');
          localStorage.clear();
        } catch (e) {
          console.error("Error clearing local storage:", e);
        }

        // 3. Delete documents from MongoDB remote collections
        try {
          for (const art of articlesToDelete) {
            if (art.id) await deleteDoc(doc(db, "articles", art.id)).catch(() => {});
          }
          for (const usr of usersToDelete) {
            if (usr.email) await deleteDoc(doc(db, "users", usr.email.toLowerCase().trim())).catch(() => {});
          }
        } catch (e) {
          console.error("Error purging remote MongoDB docs:", e);
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
        const target = matches.find(m => m.id === matchId);
        if (target) {
          try {
            const clean = await sanitizeFirestorePayload(target as any);
            await setDoc(doc(db, "matches", matchId), clean, { merge: true });
          } catch (e) {
            console.error("Error updating match in MongoDB:", e);
          }
        }
      },
      addMatch: async (match) => {
        set({ matches: [...(get().matches || []), match] });
        try {
          const clean = await sanitizeFirestorePayload(match as any);
          await setDoc(doc(db, "matches", match.id), clean, { merge: true });
        } catch (e) {
          console.error("Error adding match to MongoDB:", e);
        }
      },
      deleteMatch: (matchId) => {
        set({ matches: (get().matches || []).filter(m => m.id !== matchId) });
        deleteDoc(doc(db, "matches", matchId)).catch(() => {});
      }
    }),
    {
      name: 'perspective-group-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ 
        theme: state.theme,
        language: state.language, 
        savedArticles: state.savedArticles,
        articles: state.articles,
        media: state.media,
        ads: state.ads,
        comments: state.comments,
        directMessages: state.directMessages,
        notifications: state.notifications,
        notificationPreferences: state.notificationPreferences,
        notificationResponses: state.notificationResponses,
        subscribers: state.subscribers,
        readerProfile: state.readerProfile,
        interactions: state.interactions,
        siteSettings: state.siteSettings,
        matches: state.matches
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.articles || state.articles.length < 10) {
            state.articles = seedArticles;
          }
          if (!state.media || state.media.length === 0) {
            state.media = seedMedia as MediaItem[];
          }
          if (!state.comments || state.comments.length === 0) {
            state.comments = seedComments as CommentItem[];
          }
          if (!state.directMessages || state.directMessages.length === 0) {
            state.directMessages = seedMessages as DirectMessage[];
          }
        }
      }
    }
  )
);
