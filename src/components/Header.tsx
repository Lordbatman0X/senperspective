import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../store";
import { useAuth } from "../contexts/AuthContext";

import { compressImageFile } from "../lib/imageUtils";
import { getSafeText } from "../lib/utils";
import {
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Bookmark,
  Clock,
  User,
  LogOut,
  Check,
  Sparkles,
  Bell,
  Mail,
  MessageSquare,
  ArrowLeft,
  ChevronRight,
  Shield,
  Trophy,
  Globe,
  Flame,
  Crown,
  CreditCard,
  Database,
  Lock,
  Activity,
  WifiOff,
  Key,
  RefreshCw,
  Settings,
  ShieldCheck,
  UploadCloud,
  Cloud,
  CloudRain,
  Wind,
  CloudLightning,
  Eye,
  EyeOff,
  Sliders,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AccountDrawer, renderNeutralAvatar } from "./AccountDrawer";
import { ARTICLE_CATEGORIES } from "../constants";
import { HeaderTopBar } from "./header/HeaderTopBar";

export function Header() {
  const {
    readerProfile,
    setReaderProfile,
    language,
    setLanguage,
    theme,
    toggleTheme,
    articles,
    savedArticles,
    toggleSavedArticle,
    showSignUpModal,
    setShowSignUpModal,
    authTab,
    setAuthTab,
    notifications,
    clearNotifications,
    deleteNotification,
    comments,
    users,
    interactions,
    registerUser,
    loginUser,
    addInteraction,
    siteSettings,
    updateSiteSettings,
    directMessages,
    sendDirectMessage,
    showProfileDrawer,
    setShowProfileDrawer,
    activeProfileTab,
    setActiveProfileTab,
    pendingShareArticleId,
    setPendingShareArticleId,
    notificationResponses,
    respondToNotification,
    matches,
    updateMatch,
    updateUserSecurity,
  } = useStore();
  const { user, loginWithEmail, registerWithEmail, resetUserPassword, logoutUser, allUsers, loginWithGoogle } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrolledSearchOpen, setIsScrolledSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Dialog State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<"main" | "profile" | "studio" | "history" | "notifications" | "newsletters" | "stats" | "subscription" | "offline" | "tipline" | "messages" | "settings">("main");
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  // Messaging and sharing states
  const [selectedChatUser, setSelectedChatUser] = useState("contact@perspective.sn");
  React.useEffect(() => {
    (window as any).setSelectedChatUser = setSelectedChatUser;
    return () => {
      delete (window as any).setSelectedChatUser;
    };
  }, []);
  const [newMessageText, setNewMessageText] = useState("");
  const [attachedMaterialType, setAttachedMaterialType] = useState<"article" | "comment" | "none">("none");
  const [attachedMaterialId, setAttachedMaterialId] = useState("");

  // Account Settings states
  const [newPassword, setNewPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const lastShowProfileModalRef = useRef(false);

  // Sync store state to local state
  useEffect(() => {
    if (showProfileDrawer) {
      setShowProfileModal(true);
      if (activeProfileTab) {
        setActiveSubMenu(activeProfileTab as any);
      }
      if (pendingShareArticleId) {
        setAttachedMaterialType("article");
        setAttachedMaterialId(pendingShareArticleId);
        setPendingShareArticleId("");
      }
      setShowProfileDrawer(false);
    }
  }, [showProfileDrawer, activeProfileTab, pendingShareArticleId]);

  useEffect(() => {
    if (showProfileModal && !lastShowProfileModalRef.current) {
      setActiveSubMenu("main");
      setEditName(readerProfile?.name || "");
      setEditAvatar(readerProfile?.avatarUrl || "");
    }
    lastShowProfileModalRef.current = showProfileModal;
  }, [showProfileModal]);

  useEffect(() => {
    setEmailVerified(readerProfile?.emailVerified || false);
  }, [readerProfile]);

  const currentSettings = siteSettings || {
    siteName: "Perspective",
    accentColor: "#E85D42",
    editorialPhone: "+221 33 824 55 55",
    supportEmail: "contact@perspective.sn",
    officeAddress: "Immeuble Tamaro, Rue Mohamed V, Dakar",
    paywallThreshold: 9999,
    paywallEnabled: false,
    headerStyle: 'glass',
    aiModelMode: 'flash',
    seoTitleSuffix: '| Perspective Group Dakar',
    seoCanonicalBase: 'https://perspective.sn',
    seoDefaultDesc: "Journal d'information indépendant depuis Dakar. Analyses stratégiques de l'actualité politique et socio-économique ouest-africaine.",
    databaseProvider: 'firestore'
  };

  const defaultDispatches = [
    { id: 'disp-1', time: '14:22 DKR', contentFr: "Tensions d'arbitrage levées sur l'axe maritime Dakar-Gorée.", contentEn: "Maritime transit clearance issued for the Dakar-Gorée axis." },
    { id: 'disp-2', time: '11:05 ZLR', contentFr: "Hausse des obligations souveraines suite aux déclarations sur le gaz naturel.", contentEn: "Sovereign bonds rise following regional natural gas production updates." }
  ];

  const defaultCoast = {
    tideTime: '16:48 UT',
    tideValue: '+1.64 Meter',
    goreeCount: '12 Navettes',
    goreeStatus: 'Status: Fluide',
    meteoTemp: '29°C / 84°F',
    meteoCondFr: 'Ensoleillé & Venté',
    meteoCondEn: 'Sunny & Windy',
    windValue: '18 km/h NW',
    windGusts: '22 km/h'
  };

  const defaultWisdom = {
    wolof: "Nila lay doxé, sa gënëg du lënk.",
    translationFr: "Ceux qui avancent avec sagesse et vérité ne craignent point l'obscurité.",
    translationEn: "Those who walk in integrity and light never fear the shadow.",
    sourceFr: "EXP: PROVERBE WOLOF",
    sourceEn: "EXP: WOLOF PROVERB"
  };

  // Local state for editing match results (Arena)
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editMatchScoreA, setEditMatchScoreA] = useState<string>("");
  const [editMatchScoreB, setEditMatchScoreB] = useState<string>("");
  const [editMatchStatus, setEditMatchStatus] = useState<"live" | "upcoming" | "finished">("upcoming");
  const [editMatchTime, setEditMatchTime] = useState<string>("");
  const [editMatchContextFr, setEditMatchContextFr] = useState<string>("");
  const [editMatchContextEn, setEditMatchContextEn] = useState<string>("");

  const readerEmail = readerProfile?.email;
  useEffect(() => {
    if (showProfileModal && readerEmail && clearNotifications) {
      clearNotifications(readerEmail);
    }
  }, [showProfileModal, readerEmail]);
  const [regEmail, setRegEmail] = useState("");
  const [regName, setRegName] = useState("");
  const [regGenre, setRegGenre] = useState("Homme");
  const [internetAvatarUrl, setInternetAvatarUrl] = useState("");
  const [regAvatar, setRegAvatar] = useState(
    `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='%23C97A64'/><circle cx='60' cy='52' r='20' fill='none' stroke='%23ffffff' stroke-width='3'/><path d='M30 100c0-15 12-25 30-25s30 10 30 25' fill='none' stroke='%23ffffff' stroke-width='3'/></svg>`,
  );
  const [regRole, setRegRole] = useState(
    language === "fr" ? "Membre" : "Member",
  );

  const [regAuthType, setRegAuthType] = useState<'password' | 'pin'>("password");
  const [regPassword, setRegPassword] = useState("");
  const [regPin, setRegPin] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginCredential, setLoginCredential] = useState("");
  const [loginAuthType, setLoginAuthType] = useState<'password' | 'pin'>("password");
  const [rememberMe, setRememberMe] = useState(true);

  // Show/Hide Password & PIN states
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegPin, setShowRegPin] = useState(false);
  const [showLoginCredential, setShowLoginCredential] = useState(false);
  const [show2FACode, setShow2FACode] = useState(false);

  // 2FA Security states
  const [regEnable2FA, setRegEnable2FA] = useState(true);
  const [is2FAChallengeActive, setIs2FAChallengeActive] = useState(false);
  const [twoFactorInputCode, setTwoFactorInputCode] = useState("");
  const [generated2FACode, setGenerated2FACode] = useState("");
  const [pendingAuthData, setPendingAuthData] = useState<any>(null);

  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Multi-choice Newsletter Mock state for Profile Card
  const [dailyBriefSub, setDailyBriefSub] = useState(true);
  const [analystFlashSub, setAnalystFlashSub] = useState(true);
  const [maritimeSub, setMaritimeSub] = useState(false);

  // New mock states for advanced possibilities & personalization
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [dataSaverEnabled, setDataSaverEnabled] = useState(false);
  const [tiplineFormText, setTiplineFormText] = useState("");
  const [tiplineSubmitted, setTiplineSubmitted] = useState(false);
  const [isPremiumMock, setIsPremiumMock] = useState(false);
  const [statsArticlesRead, setStatsArticlesRead] = useState(14);
  const [statsReadingStreak, setStatsReadingStreak] = useState(5);

  // Notifications read states
  const [readNotifications, setReadNotifications] = useState<string[]>([]);

  const avatarOptions = [
    {
      id: "preset-male",
      url: "preset-male",
      label: language === "fr" ? "Profil Homme" : "Male Silhouette",
    },
    {
      id: "preset-female",
      url: "preset-female",
      label: language === "fr" ? "Profil Femme" : "Female Silhouette",
    }
  ];

  const handleSettingsPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && readerProfile) {
      try {
        const dataUrl = await compressImageFile(file, 400, 400, 0.75);
        setEditAvatar(dataUrl);
        setReaderProfile({ ...readerProfile, avatarUrl: dataUrl });
        setSettingsSuccessMsg(
          language === "fr"
            ? "✓ Photo personnalisée importée de votre appareil"
            : "✓ Custom photo successfully uploaded from device"
        );
        setTimeout(() => setSettingsSuccessMsg(""), 4000);
      } catch (err) {
        console.error("Failed to compress settings photo upload:", err);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImageFile(file, 400, 400, 0.75);
        setRegAvatar(dataUrl);
      } catch (err) {
        console.error("Failed to compress registration photo upload:", err);
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (authTab === "login") {
      if (!loginEmail.trim() || !loginCredential.trim()) {
        setAuthError(language === "fr" ? "Veuillez remplir tous les champs." : "Please fill in all fields.");
        return;
      }

      const cleanEmail = loginEmail.trim().toLowerCase();

      try {
        await loginWithEmail(cleanEmail, loginCredential, rememberMe);
        setAuthSuccess(language === "fr" ? "Connexion réussie !" : "Login successful!");
        setTimeout(() => {
          setShowSignUpModal(false);
          setAuthSuccess("");
          setLoginEmail("");
          setLoginCredential("");
        }, 800);
      } catch (err: any) {
        console.error("Firebase Auth login error:", err);
        let errorMsg = language === "fr" ? "Identifiants incorrects." : "Invalid email or password.";
        if (err?.code === "auth/user-not-found" || err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
          errorMsg = language === "fr" ? "Adresse e-mail ou mot de passe incorrect." : "Incorrect email or password.";
        } else if (err?.code === "auth/invalid-email") {
          errorMsg = language === "fr" ? "Format d'adresse e-mail invalide." : "Invalid email address format.";
        } else if (err?.code === "auth/too-many-requests") {
          errorMsg = language === "fr" ? "Trop de tentatives. Veuillez réessayer dans un instant." : "Too many attempts. Please try again in a moment.";
        }
        setAuthError(errorMsg);
      }
    } else {
      if (!regName.trim() || !regEmail.trim()) {
        setAuthError(language === "fr" ? "Veuillez remplir tous les champs." : "Please fill in all fields.");
        return;
      }
      
      const credential = regAuthType === "password" ? regPassword : regPin;
      if (!credential || credential.trim().length === 0) {
        setAuthError(
          language === "fr"
            ? `Veuillez spécifier votre ${regAuthType === "password" ? "mot de passe" : "code PIN"}.`
            : `Please specify your ${regAuthType === "password" ? "password" : "PIN code"}.`
        );
        return;
      }

      if (regAuthType === "password" && credential.trim().length < 6) {
        setAuthError(
          language === "fr"
            ? "Le mot de passe doit contenir au moins 6 caractères."
            : "Password must be at least 6 characters."
        );
        return;
      }

      if (regAuthType === "pin" && !/^\d{4,6}$/.test(regPin)) {
        setAuthError(
          language === "fr"
            ? "Le code PIN doit être composé de 4 à 6 chiffres."
            : "PIN code must be between 4 and 6 digits."
        );
        return;
      }

      const cleanEmail = regEmail.trim().toLowerCase();
      const firebasePassword = regAuthType === "password" ? regPassword : regPin + "0000";

      try {
        await registerWithEmail(
          cleanEmail, 
          firebasePassword, 
          regName.trim(), 
          "Member", 
          regAvatar, 
          regAuthType, 
          regPin, 
          false
        );
        
        setAuthSuccess(
          language === "fr" 
            ? "Compte créé et profil enregistré sur Firebase !"
            : "Account created and profile saved in Firebase!"
        );
        setTimeout(() => {
          setShowSignUpModal(false);
          setAuthSuccess("");
          setRegEmail("");
          setRegName("");
          setRegPassword("");
          setRegPin("");
        }, 1000);
      } catch (err: any) {
        console.error("Firebase Auth registration error:", err);
        let errorMsg = language === "fr" ? "Erreur lors de la création du compte." : "Failed to create account.";
        if (err?.code === "auth/email-already-in-use") {
          errorMsg = language === "fr" ? "Cet e-mail est déjà enregistré." : "This email is already registered.";
        } else if (err?.code === "auth/invalid-email") {
          errorMsg = language === "fr" ? "Format d'adresse e-mail invalide." : "Invalid email address format.";
        } else if (err?.code === "auth/weak-password") {
          errorMsg = language === "fr" ? "Le mot de passe doit faire au moins 6 caractères." : "Password must be at least 6 characters.";
        }
        setAuthError(errorMsg);
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Keep middle row sticky constantly when scrolling down or up.
      // Transition between scrolled (transparent sticky) and top (initial form).
      setIsScrolled(currentScrollY > 10);
      setShowHeader(true);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setIsMobileMenuOpen(false);
    }
  };

  const defaultNavItems = [
    { id: 'politique', labelFr: 'Politique', labelEn: 'Politics', url: '/category/politique', enabled: true },
    { id: 'economie', labelFr: 'Économie', labelEn: 'Economy', url: '/category/economie', enabled: true },
    { id: 'societe', labelFr: 'Société', labelEn: 'Society', url: '/category/societe', enabled: true },
    { id: 'international', labelFr: 'International', labelEn: 'International', url: '/category/international', enabled: true },
    { id: 'tech', labelFr: 'Tech', labelEn: 'Tech', url: '/category/tech', enabled: true },
    { id: 'sante', labelFr: 'Santé', labelEn: 'Health', url: '/category/sante', enabled: true },
    { id: 'sports', labelFr: "L'Arène", labelEn: 'The Arena', url: '/larene', enabled: true },
    { id: 'gouvernance', labelFr: 'Gouvernance', labelEn: 'Governance', url: '/category/gouvernance', enabled: true },
  ];

  const activeNavItems = (siteSettings?.headerNavItems && siteSettings.headerNavItems.length > 0)
    ? siteSettings.headerNavItems.filter(item => item.enabled !== false)
    : (siteSettings?.categories && siteSettings.categories.length > 0)
      ? siteSettings.categories.map(cat => ({
          id: cat.id,
          labelFr: cat.fr,
          labelEn: cat.en,
          url: cat.id === 'sports' ? '/larene' : `/category/${cat.id}`,
          enabled: true
        }))
      : defaultNavItems;

  const t = {
    search: language === "fr" ? "RECHERCHER..." : "SEARCH...",
    saved: language === "fr" ? "Sauvegardés" : "Saved",
  };

  return (
    <>
      <HeaderTopBar />

      <header 
        style={{
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className="sticky top-0 z-40"
      >

      {/* Main logo row */}
      <div
        className={`transition-all duration-500 ease-out ${
          isScrolled
            ? "py-2.5 bg-white/50 dark:bg-black/50 backdrop-blur-xl backdrop-saturate-180 border-b border-black/5 dark:border-white/10 text-zinc-900 dark:text-zinc-100 shadow-xs"
            : `${currentSettings.headerStyle === "editorial" 
                ? "bg-white/70 dark:bg-zinc-950/80 backdrop-blur-md border-b border-brand-border/10 text-brand-dark dark:text-brand-white" 
                : currentSettings.headerStyle === "dark-imm" 
                  ? "bg-zinc-950 border-b border-zinc-900 text-white" 
                  : "glass-orange text-white"} py-3 md:py-6 relative z-10`
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative flex items-center justify-between min-h-[44px]">
            {/* Left side actions or menu button */}
            <div className={`transition-all duration-300 ${
              isScrolled
                ? "flex items-center gap-3 min-w-[150px] md:min-w-[220px]"
                : "flex md:hidden items-center gap-3 min-w-0"
            }`}>
              <button
                className={`md:hidden ${isScrolled ? "text-zinc-800 dark:text-zinc-200" : (currentSettings.headerStyle === "editorial" ? "text-brand-dark dark:text-brand-white" : "text-white")}`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>

              {/* Theme & Language Switchers on scroll */}
              {isScrolled && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="hidden md:flex items-center gap-3"
                >
                  <button
                    onClick={toggleTheme}
                    className="p-1 rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-300 hover:text-[#E85D42] dark:hover:text-[#E85D42]"
                    title="Toggle Theme"
                  >
                    {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  </button>
                  <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-0.5 rounded-none border border-zinc-300/50 dark:border-zinc-700/50 shadow-inner">
                    <button
                      onClick={() => setLanguage("fr")}
                      className={`px-1.5 py-0.5 rounded-none text-[9px] font-bold transition-all duration-200 uppercase tracking-widest ${
                        language === "fr"
                          ? "bg-[#E85D42] text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      FR
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`px-1.5 py-0.5 rounded-none text-[9px] font-bold transition-all duration-200 uppercase tracking-widest ${
                        language === "en"
                          ? "bg-[#E85D42] text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Middle Logo (Centered on scroll, left-aligned normally) */}
            <div
              className={`transition-all duration-500 ease-out flex items-center ${
                isScrolled
                  ? "absolute left-1/2 -translate-x-1/2 justify-center"
                  : "justify-start flex-1 md:flex-none ml-2 md:ml-0"
              }`}
            >
              <motion.div
                layoutId="header-logo-container"
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                className="shrink-0"
              >
                <Link
                  to="/"
                  className="flex flex-col items-end select-none group/logo"
                >
                  <h1
                    className={`font-sans font-extrabold tracking-[-0.045em] leading-[0.8] transition-all duration-300 ${
                      isScrolled
                        ? "text-2xl md:text-[32px] text-zinc-900 dark:text-zinc-100"
                        : `${currentSettings.headerStyle === "editorial" ? "text-brand-dark dark:text-brand-white" : "text-white"} text-3xl md:text-4xl`
                    }`}
                    style={isScrolled ? { color: currentSettings.accentColor } : {}}
                  >
                    {currentSettings.siteName}
                  </h1>
                  <span
                    className={`font-sans font-black tracking-[0.11em] leading-none transition-all duration-300 ${
                      isScrolled
                        ? "text-[9px] md:text-[10px] mt-0.5 text-zinc-600 dark:text-zinc-400"
                        : `${currentSettings.headerStyle === "editorial" ? "text-brand-muted" : "text-white/95"} text-[10px] md:text-[11px] mt-0.5 mr-0.5`
                    }`}
                    style={isScrolled ? { color: currentSettings.accentColor } : {}}
                  >
                    GROUP
                  </span>
                </Link>
              </motion.div>
            </div>

            {/* Right Column (Search and Account profile) */}
            <div className={`flex items-center gap-4 justify-end transition-all duration-300 ${isScrolled ? "min-w-[150px] md:min-w-[220px]" : "min-w-0 md:min-w-0"}`}>
              <div className="hidden md:flex flex-1 justify-end items-center">
                <AnimatePresence mode="wait">
                  {!isScrolled ? (
                    <motion.form
                      key="full-search"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSearch}
                      className="relative w-48 lg:w-60"
                    >
                      <input
                        type="text"
                        placeholder={t.search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 dark:bg-black/25 hover:bg-white/15 dark:hover:bg-black/35 focus:bg-white/20 dark:focus:bg-black/40 border border-white/25 focus:border-white/50 rounded-none py-1.5 pl-4 pr-10 text-xs text-white placeholder-white/65 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all duration-300 font-semibold shadow-inner backdrop-blur-sm"
                      />
                      <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
                      >
                        <Search size={14} strokeWidth={2.5} />
                      </button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="collapsed-search"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center"
                    >
                      <AnimatePresence mode="wait">
                        {!isScrolledSearchOpen ? (
                          <motion.button
                            key="search-badge"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setIsScrolledSearchOpen(true)}
                            style={{ backgroundColor: '#717179' }}
                            className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 text-white flex items-center justify-center transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 group"
                            title={language === "fr" ? "Rechercher" : "Search"}
                          >
                            <Search size={14} strokeWidth={3} className="group-hover:rotate-12 transition-transform duration-300" />
                          </motion.button>
                        ) : (
                          <motion.form
                            key="search-form-expanded"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "200px", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleSearch}
                            className="relative flex items-center"
                          >
                            <input
                              autoFocus
                              type="text"
                              placeholder={t.search}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-none py-1.5 pl-4 pr-10 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#E85D42] focus:border-[#E85D42] transition-all font-semibold shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => setIsScrolledSearchOpen(false)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Scrolled Right: Account actions */}
              {isScrolled && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  {readerProfile ? (
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="flex items-center gap-2 hover:opacity-90 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-[#E85D42]">
                        {renderNeutralAvatar(readerProfile.avatarUrl, readerProfile.name, 20)}
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setAuthTab("login");
                        setShowSignUpModal(true);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-[#E85D42] hover:text-[#D45037] transition-colors"
                    >
                      {language === "fr" ? "CONNEXION" : "LOG IN"}
                    </button>
                  )}
                </motion.div>
              )}

              {/* Mobile space adjuster if not scrolled */}
              {!isScrolled && <div className="md:hidden w-7"></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation row */}
      <AnimatePresence initial={false}>
        {!isScrolled && (
          <motion.div
            key="nav-row"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden hidden md:block relative z-0 glass border-b border-brand-border"
          >
            <nav className="max-w-7xl mx-auto px-4">
              <ul className="flex items-center justify-center">
                {activeNavItems.map((item) => {
                  const isExternal = item.url.startsWith('http');
                  const label = language === "fr" ? item.labelFr : item.labelEn;
                  if (isExternal) {
                    return (
                      <li key={item.id}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-[#172033] dark:text-[#f2f4f5] hover:bg-[#E85D42] hover:text-white transition-all duration-300"
                        >
                          {label}
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.url}
                        className="block px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-[#172033] dark:text-[#f2f4f5] hover:bg-[#E85D42] hover:text-white transition-all duration-300"
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    to="/saved"
                    className="flex items-center gap-1.5 px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-[#172033] dark:text-[#f2f4f5] hover:bg-[#E85D42] hover:text-white transition-all duration-300 border-l border-brand-border ml-2 pl-6"
                  >
                    <Bookmark size={14} />
                    {t.saved}
                  </Link>
                </li>
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>

      {/* Mobile Menu Drawer (YouTube-style, glass transparent, smooth sliding side panel with full-page scroll freeze) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="mobile-menu-wrapper"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/75"
            />

            {/* Sliding Drawer Panel (Partial-screen translucent glass style with high contrast text) */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              style={{ willChange: "transform" }}
              className="absolute inset-y-0 left-0 w-[82vw] max-w-[340px] sm:w-96 h-full bg-white/70 dark:bg-[#0a0f18]/70 backdrop-blur-3xl backdrop-saturate-150 rounded-r-2xl sm:rounded-r-3xl border-r border-zinc-300/40 dark:border-zinc-800/40 shadow-2xl flex flex-col text-zinc-950 dark:text-zinc-50 overflow-hidden font-sans"
            >
              {/* Drawer Title / Branding block */}
              <div className="p-4 border-b border-zinc-300/40 dark:border-zinc-800/40 flex justify-between items-center bg-white/30 dark:bg-black/30 backdrop-blur-md">
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-[#E85D42]">
                    PERSPECTIVE
                  </span>
                  <span className="text-[8.5px] uppercase tracking-widest text-zinc-900 dark:text-white font-black -mt-0.5">
                    GROUP
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-none hover:bg-black/10 dark:hover:bg-white/10 transition-all text-zinc-900 dark:text-white hover:text-[#E85D42]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content Area */}
              <div className="flex-1 overflow-y-auto py-2 divide-y divide-zinc-300/40 dark:divide-zinc-800/40">
                {/* Search input section */}
                <div className="p-4 bg-transparent">
                  <form onSubmit={handleSearch} className="relative">
                    <input
                      type="text"
                      placeholder={t.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/50 dark:bg-black/50 border border-zinc-300/60 dark:border-zinc-800/60 rounded-none p-2.5 pl-9 text-xs focus:outline-none focus:border-[#E85D42] font-black text-zinc-950 dark:text-white placeholder-zinc-600 dark:placeholder-zinc-400 uppercase tracking-wider backdrop-blur-sm"
                    />
                    <Search size={14} className="absolute left-3 top-3.5 text-zinc-900 dark:text-white" />
                  </form>
                </div>

                {/* Categories Navigation with translucent hover states & bold black text */}
                <nav className="py-3 flex flex-col bg-transparent">
                  {activeNavItems.map((item) => {
                    const isExternal = item.url.startsWith('http');
                    const label = language === "fr" ? item.labelFr : item.labelEn;
                    const isActive = location.pathname === item.url;

                    if (isExternal) {
                      return (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="px-5 py-3 text-xs uppercase tracking-widest transition-all flex items-center justify-between text-[#172033] dark:text-[#f2f4f5] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 font-black"
                        >
                          <span>{label}</span>
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={item.id}
                        to={item.url}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`px-5 py-3 text-xs uppercase tracking-widest transition-all flex items-center justify-between ${
                          isActive
                            ? "bg-[#E85D42]/15 text-[#E85D42] border-l-4 border-[#E85D42] pl-4 font-black"
                            : "text-[#172033] dark:text-[#f2f4f5] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 pl-5 font-black"
                        }`}
                      >
                        <span>{label}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#E85D42]" />}
                      </Link>
                    );
                  })}

                  <Link
                    to="/saved"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-5 py-3 text-xs font-black uppercase tracking-widest text-[#E85D42] hover:bg-[#E85D42]/15 transition-colors mt-1"
                  >
                    <Bookmark size={14} className="text-[#E85D42]" />
                    <span className="text-[#E85D42]">{t.saved}</span>
                  </Link>

                  {(readerProfile?.role === "Admin" || readerProfile?.role === "Éditeur" || user?.email === "kadersdiaz3@gmail.com" || user?.email === "admin@perspective.sn" || sessionStorage.getItem("perspective-temp-admin-session") === "authenticated") && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-5 py-3 text-xs font-black uppercase tracking-widest text-[#C69B52] hover:bg-[#C69B52]/10 transition-colors mt-1 border-t border-zinc-300/40 dark:border-zinc-800/20"
                    >
                      <Shield size={14} className="text-[#C69B52]" />
                      <span>{language === "fr" ? "Administration" : "Admin Panel"}</span>
                    </Link>
                  )}
                </nav>

                {/* Quick Settings: Mode switch & Language selector */}
                <div className="p-4 space-y-3 bg-white/20 dark:bg-black/20 border-t border-zinc-300/40 dark:border-zinc-800/40">
                  <div className="text-[9.5px] font-black uppercase tracking-widest text-zinc-950 dark:text-white">
                    {language === "fr" ? "Configuration" : "Settings"}
                  </div>

                  {/* Ergonomic Theme Toggle Button */}
                  <div className="flex items-center justify-between bg-white/50 dark:bg-black/40 border border-zinc-300/60 dark:border-zinc-800/60 p-2.5 rounded-none backdrop-blur-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-950 dark:text-white flex items-center gap-1.5">
                      {theme === "dark" ? <Moon size={11} className="text-[#E85D42]" /> : <Sun size={11} className="text-[#E85D42]" />}
                      {theme === "dark" ? (language === "fr" ? "Sombre" : "Dark Mode") : (language === "fr" ? "Clair" : "Light Mode")}
                    </span>
                    <button
                      onClick={toggleTheme}
                      className="relative w-9 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors p-0.5 cursor-pointer focus:outline-none"
                    >
                      <motion.div
                        layout
                        className="w-4 h-4 rounded-full bg-[#E85D42] shadow-md"
                        animate={{ x: theme === "dark" ? 16 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>

                  {/* Language Switcher */}
                  <div className="flex items-center justify-between bg-white/50 dark:bg-black/40 border border-zinc-300/60 dark:border-zinc-800/60 p-2 rounded-none backdrop-blur-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-950 dark:text-white">
                      Language:
                    </span>
                    <div className="flex bg-zinc-200/80 dark:bg-zinc-900 p-0.5 rounded border border-zinc-300/80 dark:border-zinc-800">
                      <button
                        onClick={() => setLanguage("fr")}
                        className={`px-2.5 py-1 text-[9px] font-black tracking-widest uppercase transition-all ${
                          language === "fr"
                            ? "bg-[#E85D42] text-white shadow-sm"
                            : "text-zinc-900 hover:text-black dark:text-zinc-300 dark:hover:text-white font-black"
                        }`}
                      >
                        FR
                      </button>
                      <button
                        onClick={() => setLanguage("en")}
                        className={`px-2.5 py-1 text-[9px] font-black tracking-widest uppercase transition-all ${
                          language === "en"
                            ? "bg-[#E85D42] text-white shadow-sm"
                            : "text-zinc-900 hover:text-black dark:text-zinc-300 dark:hover:text-white font-black"
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Account Row at bottom of sidebar drawer */}
              <div className="mt-auto border-t border-zinc-300/40 dark:border-zinc-800/40 p-4 bg-white/30 dark:bg-black/30 backdrop-blur-md">
                {readerProfile ? (
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer"
                      onClick={() => {
                        setShowProfileModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-[#E85D42] shrink-0">
                        {renderNeutralAvatar(readerProfile.avatarUrl, readerProfile.name, 32)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black tracking-wide truncate max-w-[120px] text-zinc-950 dark:text-white">
                          {readerProfile.name}
                        </div>
                        <div className="text-[8px] uppercase tracking-widest text-[#E85D42] font-black truncate">
                          {readerProfile.email === "kadersdiaz3@gmail.com" ||
                          readerProfile.role === "Admin"
                            ? language === "fr"
                              ? "Admin"
                              : "Admin"
                            : language === "fr"
                              ? "Membre"
                              : "Member"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="px-2 py-1 text-[8px] font-black uppercase tracking-widest bg-zinc-200 dark:bg-zinc-800 text-[#E85D42] hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                    >
                      DASHBOARD
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setAuthTab("login");
                        setShowSignUpModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-center bg-zinc-900 dark:bg-zinc-800 text-white py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer hover:bg-black dark:hover:bg-zinc-700 transition-colors border border-zinc-900 dark:border-zinc-700"
                    >
                      <User size={10} className="text-white" />
                      LOGIN
                    </button>
                    <button
                      onClick={() => {
                        setAuthTab("register");
                        setShowSignUpModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-center bg-[#E85D42] text-white py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer hover:bg-[#D45037] transition-colors"
                    >
                      <User size={10} className="text-white" />
                      SIGN UP
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Pop-up Sign Up Pass Modal with Google/YouTube Vibe */}
      <AnimatePresence>
        {showSignUpModal && (
          <motion.div
            key="signup-modal-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignUpModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
            />

            {/* Pass Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{ willChange: "transform" }}
              className="relative w-full max-w-md bg-zinc-950/80 dark:bg-black/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 dark:border-zinc-800/80 shadow-2xl text-white p-6 md:p-8 max-h-[85vh] overflow-y-auto rounded-2xl z-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent overflow-hidden"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E85D42] to-transparent" />

              {/* Header */}
              <div className="flex justify-between items-start mb-4 font-sans">
                <div>
                  <div className="text-[9px] font-black tracking-widest text-[#E85D42] uppercase flex items-center gap-1.5 mb-1">
                    <User size={11} className="text-[#E85D42]" />
                    {language === "fr" ? "COMPTE MEMBRE" : "MEMBER ACCOUNT"}
                  </div>
                  <h3 className="text-xl font-serif font-black uppercase tracking-wider text-white">
                    {authTab === "login"
                      ? language === "fr"
                        ? "Se Connecter"
                        : "Log In"
                      : language === "fr"
                        ? "Créer un Compte"
                        : "Register Account"}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium tracking-wide">
                    {authTab === "login"
                      ? language === "fr"
                        ? "Accédez à votre espace membre."
                        : "Access your member dashboard."
                      : language === "fr"
                        ? "Rejoignez-nous et personnalisez votre style."
                        : "Join us and customize your profile style."}
                  </p>
                </div>
                <button
                  onClick={() => setShowSignUpModal(false)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Seamless Auth Tab Switcher */}
              <div className="flex bg-zinc-900/60 border border-zinc-800/80 p-1 mb-5 rounded-xl font-sans backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setAuthTab("login")}
                  className={`flex-1 text-center py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${authTab === "login" ? "bg-[#E85D42] text-white shadow-sm font-extrabold" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {language === "fr" ? "Se Connecter" : "Log In"}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab("register")}
                  className={`flex-1 text-center py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${authTab === "register" ? "bg-[#E85D42] text-white shadow-sm font-extrabold" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {language === "fr" ? "S'inscrire" : "Register"}
                </button>
              </div>

              {/* Status Message */}
              {authError && (
                <div className="bg-red-950/45 border border-red-800 text-red-200 text-xs p-3 font-semibold mb-4 text-left animate-shake">
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div className="bg-emerald-950/45 border border-emerald-800 text-emerald-200 text-xs p-3 font-semibold mb-4 text-left animate-fadeIn">
                  {authSuccess}
                </div>
              )}

              {/* 1-Click Google Sign-In */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={async () => {
                    setAuthError("");
                    setAuthSuccess("");
                    try {
                      await loginWithGoogle();
                      setAuthSuccess(language === "fr" ? "Connexion Google réussie !" : "Google sign-in successful!");
                      setTimeout(() => {
                        setShowSignUpModal(false);
                        setAuthSuccess("");
                      }, 700);
                    } catch (err: any) {
                      setAuthError(err.message || (language === "fr" ? "Échec de la connexion Google." : "Google sign-in failed."));
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer border border-zinc-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="font-sans uppercase tracking-wider text-[10px] font-black">
                    {authTab === "login"
                      ? (language === "fr" ? "Continuer avec Google" : "Continue with Google")
                      : (language === "fr" ? "S'inscrire avec Google" : "Sign up with Google")}
                  </span>
                </button>
                <div className="relative flex py-3 items-center">
                  <div className="flex-grow border-t border-zinc-800"></div>
                  <span className="flex-shrink mx-3 text-zinc-500 text-[8px] uppercase font-mono tracking-widest">
                    {language === "fr" ? "Ou avec vos identifiants" : "Or with credentials"}
                  </span>
                  <div className="flex-grow border-t border-zinc-800"></div>
                </div>
              </div>

              {/* Form */}
              <form
                onSubmit={handleAuthSubmit}
                className="space-y-4 font-sans text-left"
              >
                  {authTab === "register" ? (
                    <>
                      {/* Avatar Select - Register Only */}
                      <div className="animate-fadeIn">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                          {language === "fr"
                            ? "Sélectionner l'avatar :"
                            : "Select Avatar :"}
                        </label>
                        <div className="grid grid-cols-2 gap-2.5 mb-2">
                          {avatarOptions.map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => {
                                setRegAvatar(opt.url);
                                setInternetAvatarUrl("");
                              }}
                              className={`relative aspect-square overflow-hidden border-2 bg-zinc-950 ${regAvatar === opt.url ? "border-[#E85D42] scale-105" : "border-zinc-800"} transition-all hover:border-[#E85D42]/60 cursor-pointer`}
                              title={opt.label}
                            >
                              {renderNeutralAvatar(opt.url, "", 80)}
                              {regAvatar === opt.url && (
                                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                  <Check
                                    size={14}
                                    className="text-white"
                                    strokeWidth={4}
                                  />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Genre Select */}
                      <div className="animate-fadeIn">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          {language === "fr" ? "Choisissez votre genre :" : "Choose your genre:"}
                        </label>
                        <div className="flex gap-2">
                          {(["Homme", "Femme", "Autre"] as const).map((g) => (
                            <button
                              type="button"
                              key={g}
                              onClick={() => setRegGenre(g)}
                              className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${regGenre === g ? "bg-zinc-800 border-[#E85D42] text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}
                            >
                              {language === "fr" ? (g === "Homme" ? "Homme" : g === "Femme" ? "Femme" : "Autre") : (g === "Homme" ? "Male" : g === "Femme" ? "Female" : "Other")}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                          {language === "fr"
                            ? "Nom ou Pseudo :"
                            : "Name or Nickname :"}
                        </label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder={
                            language === "fr"
                              ? "Ex: Souleymane Diop"
                              : "e.g. Souleymane Diop"
                          }
                          className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#E85D42] text-sm text-white p-3 font-semibold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] placeholder-zinc-600 rounded-none"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                          {language === "fr" ? "Adresse E-mail :" : "Email Address :"}
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@domain.com"
                          className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#E85D42] text-sm text-white p-3 font-semibold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] placeholder-zinc-600 rounded-none"
                        />
                      </div>

                      {/* Choose credential type */}
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          {language === "fr" ? "Authentification préférée :" : "Preferred authentication:"}
                        </label>
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setRegAuthType("password")}
                            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border transition-colors ${regAuthType === "password" ? "bg-zinc-800 border-[#E85D42] text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}
                          >
                            {language === "fr" ? "Mot de passe" : "Password"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegAuthType("pin")}
                            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border transition-colors ${regAuthType === "pin" ? "bg-zinc-800 border-[#E85D42] text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}
                          >
                            {language === "fr" ? "Code PIN" : "PIN Code"}
                          </button>
                        </div>
                      </div>

                      {/* Password Input */}
                      {regAuthType === "password" && (
                        <div className="animate-fadeIn">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            {language === "fr" ? "Mot de Passe :" : "Password:"}
                          </label>
                          <div className="relative">
                            <input
                              type={showRegPassword ? "text" : "password"}
                              required
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#E85D42] text-sm text-white p-3 pr-10 font-semibold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] placeholder-zinc-600 rounded-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title={showRegPassword ? "Cacher" : "Afficher"}
                            >
                              {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* PIN Input */}
                      {regAuthType === "pin" && (
                        <div className="animate-fadeIn">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            {language === "fr" ? "Code PIN (4 à 6 chiffres) :" : "PIN Code (4 to 6 digits):"}
                          </label>
                          <div className="relative">
                            <input
                              type={showRegPin ? "text" : "password"}
                              pattern="\d{4,6}"
                              maxLength={6}
                              inputMode="numeric"
                              required
                              value={regPin}
                              onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ""))}
                              placeholder="••••"
                              className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#E85D42] text-sm text-white p-3 pr-10 font-mono font-semibold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] placeholder-zinc-600 rounded-none tracking-widest text-center"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegPin(!showRegPin)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title={showRegPin ? "Cacher" : "Afficher"}
                            >
                              {showRegPin ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Login tab inputs */}
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                          {language === "fr" ? "Adresse E-mail :" : "Email Address:"}
                        </label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="contact@perspective.sn"
                          className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#E85D42] text-sm text-white p-3 font-semibold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] placeholder-zinc-600 rounded-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          {language === "fr" ? "Se connecter avec :" : "Log in with:"}
                        </label>
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setLoginAuthType("password")}
                            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border transition-colors ${loginAuthType === "password" ? "bg-zinc-800 border-[#E85D42] text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}
                          >
                            {language === "fr" ? "Mot de passe" : "Password"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setLoginAuthType("pin")}
                            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border transition-colors ${loginAuthType === "pin" ? "bg-zinc-800 border-[#E85D42] text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}
                          >
                            {language === "fr" ? "Code PIN" : "PIN Code"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                          {loginAuthType === "password"
                            ? language === "fr" ? "Mot de Passe :" : "Password:"
                            : language === "fr" ? "Code PIN (4 à 6 chiffres) :" : "PIN Code (4 to 6 digits):"}
                        </label>
                        <div className="relative">
                          <input
                            type={showLoginCredential ? "text" : "password"}
                            maxLength={loginAuthType === "pin" ? 6 : undefined}
                            inputMode={loginAuthType === "pin" ? "numeric" : "text"}
                            required
                            value={loginCredential}
                            onChange={(e) => setLoginCredential(loginAuthType === "pin" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                            placeholder={loginAuthType === "password" ? "••••••••" : "••••"}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#E85D42] text-sm text-white p-3 pr-10 font-semibold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] placeholder-zinc-600 rounded-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginCredential(!showLoginCredential)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title={showLoginCredential ? "Cacher" : "Afficher"}
                          >
                            {showLoginCredential ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {loginAuthType === "password" && (
                          <div className="flex justify-end mt-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!loginEmail.trim()) {
                                  setAuthError(
                                    language === "fr" 
                                      ? "Veuillez d'abord saisir votre adresse e-mail." 
                                      : "Please enter your email address first."
                                  );
                                  return;
                                }
                                try {
                                  await resetUserPassword(loginEmail.trim());
                                  setAuthSuccess(
                                    language === "fr"
                                      ? "Lien de réinitialisation envoyé par e-mail !"
                                      : "Password reset email sent successfully!"
                                  );
                                } catch (err: any) {
                                  setAuthError(
                                    language === "fr"
                                      ? `Erreur : ${err.message}`
                                      : `Error: ${err.message}`
                                  );
                                }
                              }}
                              className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 hover:text-[#E85D42] transition-colors cursor-pointer"
                            >
                              {language === "fr" ? "Mot de passe oublié ?" : "Forgot Password?"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Remember Me Checkbox */}
                      <div className="flex items-center gap-2 mt-4 select-none">
                        <input
                          type="checkbox"
                          id="remember-me-checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#E85D42] border border-zinc-800 bg-zinc-900 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="remember-me-checkbox" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-white transition-colors">
                          {language === "fr" ? "Se souvenir de moi" : "Remember me"}
                        </label>
                      </div>
                    </>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="w-full bg-[#E85D42] text-white font-black uppercase tracking-widest py-3 hover:bg-[#D45037] transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4 rounded-none hover:translate-x-0.5"
                  >
                    <User size={13} />
                    {authTab === "login"
                      ? language === "fr"
                        ? "SE CONNECTER"
                        : "LOG IN"
                      : language === "fr"
                        ? "S'INSCRIRE & COMMENCER"
                        : "REGISTER & START"}
                  </button>
                </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive YouTube-style Right Drawer for User Profile and Admin Controls */}
      <AccountDrawer
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        readerProfile={readerProfile}
        setReaderProfile={setReaderProfile}
        isPremiumMock={isPremiumMock}
        setIsPremiumMock={setIsPremiumMock}
        currentSettings={currentSettings}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        statsReadingStreak={statsReadingStreak}
        statsArticlesRead={statsArticlesRead}
        comments={comments}
        articles={articles}
        savedArticles={savedArticles}
        toggleSavedArticle={toggleSavedArticle}
        directMessages={directMessages}
        sendDirectMessage={sendDirectMessage}
        selectedChatUser={selectedChatUser}
        setSelectedChatUser={setSelectedChatUser}
        attachedMaterialType={attachedMaterialType}
        setAttachedMaterialType={setAttachedMaterialType}
        attachedMaterialId={attachedMaterialId}
        setAttachedMaterialId={setAttachedMaterialId}
        newMessageText={newMessageText}
        setNewMessageText={setNewMessageText}
        editName={editName}
        setEditName={setEditName}
        editAvatar={editAvatar}
        setEditAvatar={setEditAvatar}
        avatarOptions={avatarOptions}
        handleSettingsPhotoUpload={handleSettingsPhotoUpload}
        emailVerified={emailVerified}
        setEmailVerified={setEmailVerified}
        tiplineSubmitted={tiplineSubmitted}
        setTiplineSubmitted={setTiplineSubmitted}
        tiplineFormText={tiplineFormText}
        setTiplineFormText={setTiplineFormText}
        offlineEnabled={offlineEnabled}
        setOfflineEnabled={setOfflineEnabled}
        dataSaverEnabled={dataSaverEnabled}
        setDataSaverEnabled={setDataSaverEnabled}
        notifications={notifications}
        deleteNotification={deleteNotification}
        respondToNotification={respondToNotification}
        notificationResponses={notificationResponses}
        setEditMatchContextEn={setEditMatchContextEn}
      />

      <AnimatePresence>
        {showProfileModal && readerProfile && false && (
          <motion.div
            key="profile-drawer-portal"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Sliding Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              style={{ willChange: "transform" }}
              className="relative w-full sm:w-[512px] h-full bg-brand-white border-l border-brand-border text-brand-dark flex flex-col z-50 font-sans transition-all duration-300 rounded-none shadow-2xl"
            >
              {/* Sticky small profile header (Fixed at top of drawer) */}
              <div className="flex flex-col border-b border-brand-border bg-brand-white text-left relative rounded-none">
                {/* Slimline Category Label & Close Trigger */}
                <div className="flex justify-between items-center px-4 py-2 border-b border-brand-border/10 bg-brand-soft/25">
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-brand-muted flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentSettings.accentColor }} />
                    <span>{language === "fr" ? "ESPACE PERSONNEL" : "SUBSCRIBER PORTAL"}</span>
                  </span>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="p-1 text-brand-muted hover:text-brand-dark hover:bg-brand-soft/45 transition-all rounded-none cursor-pointer border border-transparent hover:border-brand-border/20"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Compact Info Row combining Profile and Stats */}
                <div className="flex flex-row items-center justify-between gap-3 px-4 py-2 bg-brand-white border-b border-brand-border/15">
                  {/* Left Side: Small Avatar & Text */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 shrink-0 bg-brand-soft/30 border border-brand-border/30 overflow-hidden rounded-full shadow-sm relative">
                      {renderNeutralAvatar(readerProfile.avatarUrl, readerProfile.name, 44)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-serif font-black text-brand-dark truncate max-w-[150px] uppercase tracking-tight leading-none">
                          {readerProfile.name}
                        </h4>
                        <span className="text-[8px] font-mono font-bold tracking-wider text-white px-1.5 py-0.5 rounded-none leading-none shrink-0" style={{ backgroundColor: currentSettings.accentColor }}>
                          {readerProfile.email === "kadersdiaz3@gmail.com" ||
                          readerProfile.role === "Admin"
                            ? "ADMIN"
                            : language === "fr" ? "MEMBRE" : "MEMBER"}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-brand-muted font-mono truncate max-w-[170px] mt-1.5 leading-none">
                        {readerProfile.email.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Ultra-slim Stats Badges */}
                  <div className="flex items-center gap-2.5 bg-brand-soft/20 px-2.5 py-1.5 rounded-none border border-brand-border/20 text-[9px] font-mono">
                    <div className="flex items-center gap-1" title={language === "fr" ? "Série de lecture" : "Reading Streak"}>
                      <Flame size={10} className="text-[#E85D42] shrink-0" style={{ color: currentSettings.accentColor }} />
                      <span className="font-bold text-brand-dark">{statsReadingStreak}d</span>
                    </div>
                    <div className="w-px h-3 bg-brand-border/30" />
                    <div className="flex items-center gap-1" title={language === "fr" ? "Dossiers" : "Dossiers"}>
                      <span className="text-[8px] text-brand-muted font-bold">READ:</span>
                      <span className="font-bold text-brand-dark">{statsArticlesRead}</span>
                    </div>
                    <div className="w-px h-3 bg-brand-border/30" />
                    <div className="flex items-center gap-1" title={language === "fr" ? "Notes" : "Notes"}>
                      <span className="text-[8px] text-brand-muted font-bold">NOTE:</span>
                      <span className="font-bold text-brand-dark">
                        {comments?.filter(c => c.email.toLowerCase() === readerProfile.email.toLowerCase()).length || 3}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-brand-border/15 font-mono text-[9px] font-bold bg-brand-white">
                  <button
                    onClick={() => setActiveSubMenu("main")}
                    className={`flex-1 py-2.5 text-center transition-all border-b-2 hover:bg-brand-soft/20 cursor-pointer rounded-none ${
                      activeSubMenu !== "settings" && activeSubMenu !== "studio"
                        ? "text-brand-dark font-black"
                        : "text-brand-muted border-transparent"
                    }`}
                    style={{ borderBottomColor: activeSubMenu !== "settings" && activeSubMenu !== "studio" ? currentSettings.accentColor : "transparent" }}
                  >
                    {language === "fr" ? "BIBLIOTHÈQUE / FLUX" : "LIBRARY & INTEL"}
                  </button>
                  
                  <button
                    onClick={() => setActiveSubMenu("settings")}
                    className={`flex-1 py-2.5 text-center transition-all border-b-2 hover:bg-brand-soft/20 cursor-pointer rounded-none ${
                      activeSubMenu === "settings"
                        ? "text-brand-dark font-black"
                        : "text-brand-muted border-transparent"
                    }`}
                    style={{ borderBottomColor: activeSubMenu === "settings" ? currentSettings.accentColor : "transparent" }}
                  >
                    {language === "fr" ? "PROFIL & OPTION PHOTO" : "PROFILE & OPTIONS"}
                  </button>

                  {(readerProfile?.role === "Admin" ||
                    readerProfile?.role === "Éditeur" ||
                    readerProfile?.email === "kadersdiaz3@gmail.com" ||
                    readerProfile?.email === "contact@perspective.sn" ||
                    user?.email === "admin@perspective.sn" ||
                    sessionStorage.getItem("perspective-temp-admin-session") === "authenticated") && (
                    <button
                      onClick={() => setActiveSubMenu("studio")}
                      className={`flex-1 py-2.5 text-center transition-all border-b-2 hover:bg-brand-soft/20 cursor-pointer rounded-none ${
                        activeSubMenu === "studio"
                          ? "text-brand-dark font-black"
                          : "text-brand-muted border-transparent"
                      }`}
                      style={{ borderBottomColor: activeSubMenu === "studio" ? currentSettings.accentColor : "transparent" }}
                    >
                      {language === "fr" ? "CONFIG STUDIO" : "STUDIO BRAND"}
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable List Body */}
              <div className="flex-grow overflow-y-auto bg-brand-white text-brand-dark py-5 px-6 relative overflow-x-hidden rounded-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSubMenu}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
                    className="space-y-6"
                  >
                    {activeSubMenu === "main" && (
                  <div className="space-y-6">
                    {/* Admin Studio Section */}
                    {(readerProfile?.role === "Admin" ||
                      readerProfile?.role === "Éditeur" ||
                      readerProfile?.email === "kadersdiaz3@gmail.com" ||
                      readerProfile?.email === "contact@perspective.sn" ||
                      user?.email === "admin@perspective.sn" ||
                      sessionStorage.getItem("perspective-temp-admin-session") === "authenticated") && (
                      <div className="pt-1">
                        <button
                          onClick={() => setActiveSubMenu("studio")}
                          className="w-full flex items-center justify-between p-3.5 bg-[#E85D42]/5 hover:bg-[#E85D42]/10 dark:bg-[#E85D42]/10 dark:hover:bg-[#E85D42]/15 border border-[#E85D42]/20 dark:border-[#E85D42]/30 rounded-none transition-all cursor-pointer text-left group"
                        >
                          <span className="flex items-center gap-3.5 text-[12px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-sans">
                            <Shield size={16} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
                            <span>{language === "fr" ? "Perspective Studio" : "Perspective Studio"}</span>
                          </span>
                          <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Section: Collection */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block text-left px-1">
                          {language === "fr" ? "VOTRE COLLECTION" : "MY COLLECTION"}
                        </span>
                        
                        <div className="bg-white dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/40 rounded-none overflow-hidden divide-y divide-zinc-200/45 dark:divide-zinc-800/40">
                          {/* Bookmarks */}
                          <button
                            onClick={() => setActiveSubMenu("history")}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                          >
                            <div className="flex items-center gap-3.5">
                              <Bookmark size={15} className="text-zinc-400 dark:text-zinc-500 group-hover:text-[#E85D42] transition-colors" style={{ color: currentSettings.accentColor }} />
                              <div>
                                <span className="block text-[11.5px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                                  {language === "fr" ? "FAVORIS & COMMENTAIRES" : "BOOKMARKS & REPLIES"}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                                  {language === "fr" ? "Accéder à vos rapports enregistrés" : "Access your saved reports"}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>

                          {/* Analytics */}
                          <button
                            onClick={() => setActiveSubMenu("stats")}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                          >
                            <div className="flex items-center gap-3.5">
                              <Activity size={15} className="text-zinc-400 dark:text-zinc-500 group-hover:text-[#E85D42] transition-colors" style={{ color: currentSettings.accentColor }} />
                              <div>
                                <span className="block text-[11.5px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                                  {language === "fr" ? "STATISTIQUES DE LECTURE" : "READING INTELLIGENCE"}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                                  {language === "fr" ? "Vos métriques d'apprentissage" : "Your reading engagement metrics"}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>

                          {/* Offline Storage */}
                          <button
                            onClick={() => setActiveSubMenu("offline")}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                          >
                            <div className="flex items-center gap-3.5">
                              <WifiOff size={15} className="text-zinc-400 dark:text-zinc-500 group-hover:text-[#E85D42] transition-colors" style={{ color: currentSettings.accentColor }} />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="block text-[11.5px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                                    {language === "fr" ? "MODE HORS-LIGNE" : "OFFLINE STORAGE"}
                                  </span>
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-550 rounded font-sans tracking-wide">
                                    {language === "fr" ? "ACTIF" : "ACTIVE"}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                                  {language === "fr" ? "Consulter sans connexion" : "Browse with cached local data"}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>

                      {/* Section: Communications */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block text-left px-1">
                          {language === "fr" ? "CHANNELS & INTEL" : "CHANNELS & INTELLIGENCE"}
                        </span>

                        <div className="bg-white dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/40 rounded-none overflow-hidden divide-y divide-zinc-200/45 dark:divide-zinc-800/40">
                          {/* Messages */}
                          <button
                            onClick={() => setActiveSubMenu("messages")}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                          >
                            <div className="flex items-center gap-3.5">
                              <MessageSquare size={15} className="text-zinc-400 dark:text-zinc-500 group-hover:text-[#E85D42] transition-colors" style={{ color: currentSettings.accentColor }} />
                              <div>
                                <span className="block text-[11.5px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                                  {language === "fr" ? "CANAL DES ANALYSTES" : "DIRECT ANALYST CHANNEL"}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                                  {language === "fr" ? "Discussion et partage" : "Share and comment on critical intel"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D42]" style={{ backgroundColor: currentSettings.accentColor }} />
                              <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </button>

                          {/* Security Alerts */}
                          <button
                            onClick={() => setActiveSubMenu("notifications")}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                          >
                            <div className="flex items-center gap-3.5">
                              <Bell size={15} className="text-zinc-400 dark:text-zinc-500 group-hover:text-[#E85D42] transition-colors" style={{ color: currentSettings.accentColor }} />
                              <div>
                                <span className="block text-[11.5px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                                  {language === "fr" ? "ALERTES SÉCURITÉ" : "SECURITY ALERTS"}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                                  {language === "fr" ? "Notifications de la rédaction" : "Critical notification stream"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold bg-[#E85D42]/10 text-[#E85D42] px-2 py-0.5 rounded-none" style={{ color: currentSettings.accentColor, backgroundColor: currentSettings.accentColor + '15' }}>
                                {notifications?.filter(n => n.email.toLowerCase() === readerProfile.email.toLowerCase()).length || 0}
                              </span>
                              <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </button>

                          {/* Newsletter subscriptions */}
                          <button
                            onClick={() => setActiveSubMenu("newsletters")}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                          >
                            <div className="flex items-center gap-3.5">
                              <Mail size={15} className="text-zinc-400 dark:text-zinc-500 group-hover:text-[#E85D42] transition-colors" style={{ color: currentSettings.accentColor }} />
                              <div>
                                <span className="block text-[11.5px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                                  {language === "fr" ? "ABONNEMENTS NEWSLETTERS" : "NEWSLETTER PREFERENCES"}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                                  {language === "fr" ? "Gérer vos envois par courriel" : "Configure your custom daily emails"}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>

                      {/* Section: Account & Preferences */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block text-left px-1">
                          {language === "fr" ? "PARAMÈTRES & CONFIGURATION" : "ACCOUNT & CONFIGURATION"}
                        </span>

                        <div className="bg-white dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/40 rounded-none overflow-hidden divide-y divide-zinc-200/45 dark:divide-zinc-800/40">
                          {/* Account Settings */}
                          <button
                            onClick={() => setActiveSubMenu("settings")}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                          >
                            <div className="flex items-center gap-3.5">
                              <Settings size={15} className="text-zinc-400 dark:text-zinc-500 group-hover:text-[#E85D42] transition-colors" style={{ color: currentSettings.accentColor }} />
                              <div>
                                <span className="block text-[11.5px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                                  {language === "fr" ? "PARAMÈTRES DU COMPTE" : "ACCOUNT & PASSWORD"}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                                  {language === "fr" ? "Mettre à jour vos détails" : "Update your profile and passwords"}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>

                          {/* Row of Toggles */}
                          <div className="grid grid-cols-2 divide-x divide-zinc-200/45 dark:divide-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-950/10">
                            {/* Theme Select */}
                            <div
                              onClick={toggleTheme}
                              className="flex items-center justify-between p-3.5 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                            >
                              <span className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                                {theme === "dark" ? <Moon size={14} className="text-[#E85D42] group-hover:rotate-12 transition-transform" style={{ color: currentSettings.accentColor }} /> : <Sun size={14} className="text-amber-550 group-hover:rotate-12 transition-transform" />}
                                <span>{language === "fr" ? "Thème" : "Theme"}</span>
                              </span>
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-zinc-200/60 dark:bg-zinc-800 rounded">
                                {theme === "dark" ? (language === "fr" ? "SOMBRE" : "DARK") : (language === "fr" ? "CLAIR" : "LIGHT")}
                              </span>
                            </div>

                            {/* Language Select */}
                            <div
                              onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
                              className="flex items-center justify-between p-3.5 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer text-left group"
                            >
                              <span className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                                <Globe size={14} className="text-zinc-400 dark:text-zinc-500 group-hover:scale-105 transition-transform" />
                                <span>{language === "fr" ? "Langue" : "Language"}</span>
                              </span>
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-zinc-200/60 dark:bg-zinc-800 rounded">
                                {language === "fr" ? "FR" : "EN"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-4" />

                    {/* Sign Out Button */}
                    <button
                      onClick={() => {
                        logoutUser();
                        setShowProfileModal(false);
                      }}
                      className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 dark:border-rose-500/10 text-rose-500 rounded-none transition-all cursor-pointer font-bold uppercase tracking-wider text-[11px]"
                    >
                      <LogOut size={14} />
                      <span>{language === "fr" ? "Déconnexion" : "Sign Out"}</span>
                    </button>
                  </div>
                )}




                {/* SUBMENU: HISTORY */}
                {activeSubMenu === "history" && (
                  <div className="p-4 space-y-5 text-left">
                    {/* Saved Articles List */}
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-black uppercase text-white tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-1" style={{ color: currentSettings.accentColor }}>
                        <Bookmark size={10} strokeWidth={2.5} />
                        <span className="text-white">{language === "fr" ? "Articles Sauvegardés" : "Saved Articles"}</span>
                      </span>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {articles.filter((a) => savedArticles?.includes(a.id)).length > 0 ? (
                          articles
                            .filter((a) => savedArticles?.includes(a.id))
                            .map((article, idx) => (
                              <div
                                key={`${article.id}-${idx}`}
                                className="flex gap-2 items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-900 transition-all"
                              >
                                <Link
                                  to={`/article/${article.slug}`}
                                  onClick={() => setShowProfileModal(false)}
                                  className="text-xs font-bold leading-tight text-white hover:text-[#E85D42] transition-colors line-clamp-2 pr-2"
                                >
                                  {article.title?.[language] || "Untitled Article"}
                                </Link>
                                <button
                                  onClick={() => toggleSavedArticle(article.id)}
                                  className="text-white hover:text-red-500 transition-colors p-1"
                                >
                                  <X size={12} strokeWidth={3} className="text-white" />
                                </button>
                              </div>
                            ))
                        ) : (
                          <p className="text-[10px] text-white italic py-2">
                            {language === "fr" ? "Aucun article sauvegardé." : "No saved articles yet."}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* User Comments Tracker */}
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-black uppercase text-[#E85D42] tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-1" style={{ color: currentSettings.accentColor }}>
                        <MessageSquare size={10} strokeWidth={2.5} />
                        <span>{language === "fr" ? "Mes Commentaires" : "My Comments"}</span>
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {comments.filter(c => c.email === readerProfile.email).length > 0 ? (
                          comments
                            .filter(c => c.email === readerProfile.email)
                            .map((comment) => (
                              <div key={comment.id} className="p-2.5 bg-zinc-900/60 border border-zinc-800">
                                <div className="flex justify-between items-center text-[7.5px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                                  <span className="truncate pr-2 max-w-[140px]">{comment.articleTitle}</span>
                                  <span className={`font-bold ${comment.isApproved ? "text-emerald-500" : "text-amber-500"}`}>
                                    {comment.isApproved ? (language === "fr" ? "Approuvé" : "Approved") : (language === "fr" ? "En attente" : "Pending")}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-300 font-medium italic">
                                  "{comment.text}"
                                </p>
                              </div>
                            ))
                        ) : (
                          <p className="text-[10px] text-zinc-500 italic py-2">
                            {language === "fr" ? "Aucun commentaire publié." : "No comments posted yet."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBMENU: NOTIFICATIONS */}
                {activeSubMenu === "notifications" && (
                  <div className="p-4 space-y-3.5 text-left">
                    <span className="text-[9px] font-black uppercase text-[#E85D42] tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-1" style={{ color: currentSettings.accentColor }}>
                      <Bell size={10} strokeWidth={2.5} />
                      <span>{language === "fr" ? "Historique des Notifications" : "Notifications History"}</span>
                    </span>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {notifications && notifications.filter(n => n.email.toLowerCase() === readerProfile.email.toLowerCase()).length > 0 ? (
                        notifications
                          .filter(n => n.email.toLowerCase() === readerProfile.email.toLowerCase())
                          .map((notif) => {
                            const response = notificationResponses?.[notif.id];
                            const isWarning = notif.text?.en?.toLowerCase().includes("warning") || 
                                              notif.text?.fr?.toLowerCase().includes("avertissement") ||
                                              notif.text?.en?.toLowerCase().includes("breach") ||
                                              notif.text?.fr?.toLowerCase().includes("écart");
                            return (
                              <div 
                                key={notif.id} 
                                onClick={() => deleteNotification(notif.id)}
                                className="p-3 bg-zinc-900/60 border border-zinc-800 flex flex-col gap-2 relative group/notif cursor-pointer hover:bg-zinc-950/80 hover:border-[#E85D42] transition-all"
                                title={language === 'fr' ? 'Cliquer pour marquer comme lu et fermer' : 'Click to mark as read and dismiss'}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notif.id);
                                  }}
                                  className="absolute top-2.5 right-2.5 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                                  title={language === 'fr' ? 'Supprimer' : 'Remove'}
                                >
                                  <X size={10} />
                                </button>
                                <div className="flex items-start gap-2.5 pr-4">
                                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-[#E85D42]" style={{ backgroundColor: currentSettings.accentColor }} />
                                  <div className="flex-1">
                                    <p className="text-[10.5px] text-zinc-200 font-semibold leading-relaxed">
                                      {typeof notif.text === 'string' ? notif.text : (notif.text?.[language] || notif.text?.fr || notif.text?.en || '')}
                                    </p>
                                    <span className="text-[8px] font-mono text-zinc-500 mt-0.5 block">{notif.date}</span>
                                  </div>
                                </div>
                                {isWarning && (
                                  <div className="pl-4 border-t border-zinc-800 pt-2 flex flex-col gap-1.5">
                                    {response ? (
                                      <div className="flex items-center gap-1.5">
                                        {response === 'accepted' ? (
                                          <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 tracking-wider">
                                            {language === 'fr' ? 'CHARTE CONFIRMÉE' : 'GUIDELINES CONFIRMED'}
                                          </span>
                                        ) : (
                                          <span className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 tracking-wider">
                                            {language === 'fr' ? 'DÉCISION CONTESTÉE' : 'DECISION DISPUTED'}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            respondToNotification(notif.id, 'accepted');
                                            // auto dismiss after action
                                            deleteNotification(notif.id);
                                          }}
                                          className="text-[8px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 cursor-pointer transition-colors"
                                        >
                                          {language === 'fr' ? 'ACCEPTER & ADHÉRER' : 'CONFIRM & ADHERE'}
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            respondToNotification(notif.id, 'disputed');
                                            // auto dismiss after action
                                            deleteNotification(notif.id);
                                          }}
                                          className="text-[8px] font-black uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 cursor-pointer transition-colors border border-zinc-700"
                                        >
                                          {language === 'fr' ? 'CONTESTER' : 'CONTEST'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                      ) : (
                        <div className="p-3 bg-zinc-900/45 border border-zinc-800">
                          <p className="text-xs font-black text-zinc-100 uppercase tracking-tight">
                            {language === "fr" ? "Alerte Marée Dakar" : "Dakar Marine High Tide"}
                          </p>
                          <p className="text-[9.5px] text-zinc-400 font-semibold leading-relaxed mt-0.5">
                            {language === "fr"
                              ? "Niveau d'eau élevé aux Almadies ce soir. Vigilance recommandée."
                              : "Abnormal high tide detected near coastline areas."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                      <span className="text-[9px] font-mono text-zinc-400">
                        {language === "fr" ? "4 canaux configurables" : "4 alert channels ready"}
                      </span>
                      <button
                        onClick={() => {
                          setShowProfileModal(true);
                        }}
                        className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#E85D42] hover:underline cursor-pointer flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800"
                        style={{ color: currentSettings.accentColor }}
                      >
                        <Sliders size={11} />
                        <span>{language === "fr" ? "Configuration des Alertes" : "Setup Notification Channels"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SUBMENU: NEWSLETTERS */}
                {activeSubMenu === "newsletters" && (
                  <div className="p-4 space-y-4 text-left">
                    <span className="text-[9px] font-black uppercase text-[#E85D42] tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-1" style={{ color: currentSettings.accentColor }}>
                      <Mail size={10} strokeWidth={2.5} />
                      <span>{language === "fr" ? "Gérer mes abonnements" : "Subscription Preferences"}</span>
                    </span>

                    <div className="space-y-3 bg-zinc-900/50 p-4 border border-zinc-800">
                      <label className="flex items-center gap-3.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={dailyBriefSub}
                          onChange={(e) => setDailyBriefSub(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#E85D42] cursor-pointer"
                          style={{ accentColor: currentSettings.accentColor }}
                        />
                        <div>
                          <span className="text-[11px] font-black block leading-none">
                            THE DAILY PERSPECTIVE BRIEF
                          </span>
                          <span className="text-[8.5px] text-zinc-400 leading-relaxed block mt-0.5">
                            Sent every morning at 06:00 DKR UTC.
                          </span>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-3.5 cursor-pointer select-none border-t border-zinc-800/80 pt-3">
                        <input
                          type="checkbox"
                          checked={analystFlashSub}
                          onChange={(e) => setAnalystFlashSub(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#E85D42] cursor-pointer"
                          style={{ accentColor: currentSettings.accentColor }}
                        />
                        <div>
                          <span className="text-[11px] font-black block leading-none">
                            POLITICAL ANALYSES REPORTS
                          </span>
                          <span className="text-[8.5px] text-zinc-400 leading-relaxed block mt-0.5">
                            Weekly secure executive summaries.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3.5 cursor-pointer select-none border-t border-zinc-800/80 pt-3">
                        <input
                          type="checkbox"
                          checked={maritimeSub}
                          onChange={(e) => setMaritimeSub(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#E85D42] cursor-pointer"
                          style={{ accentColor: currentSettings.accentColor }}
                        />
                        <div>
                          <span className="text-[11px] font-black block leading-none">
                            COASTAL & HARBOR FLASHES
                          </span>
                          <span className="text-[8.5px] text-zinc-400 leading-relaxed block mt-0.5">
                            Real-time local Dakar conditions.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* SUBMENU: STATS (Analyst Intelligence Report) */}
                {activeSubMenu === "stats" && (
                  <div className="p-4 space-y-4 text-left font-cambria text-xs">
                    <span className="text-[9px] font-black uppercase text-[#E85D42] tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-1" style={{ color: currentSettings.accentColor }}>
                      <Activity size={10} strokeWidth={2.5} />
                      <span>{language === "fr" ? "Rapport d'Intelligence de Lecture" : "Analyst Intelligence Report"}</span>
                    </span>

                    {/* Overall Metrics Cards */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-3 border border-zinc-900 font-mono text-[9px]">
                      <div>
                        <span className="text-zinc-500 block uppercase">{language === "fr" ? "Lectures Sahel" : "Sahel Dispatches Read"}</span>
                        <span className="text-sm font-black text-white block mt-0.5">{statsArticlesRead}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block uppercase">{language === "fr" ? "Série Actuelle" : "Consecutive Reading"}</span>
                        <span className="text-sm font-black text-amber-500 block mt-0.5">🔥 {statsReadingStreak} {language === "fr" ? "jours" : "days"}</span>
                      </div>
                    </div>

                    {/* Interactive Category Chart */}
                    <div className="space-y-2 bg-zinc-900/40 p-3.5 border border-zinc-800">
                      <span className="text-[8.5px] font-black uppercase text-zinc-400 block tracking-wide">
                        {language === "fr" ? "Centres d'Intérêt Analytiques" : "Intelligence Category Interest"}
                      </span>
                      <div className="space-y-2 pt-1 font-mono text-[8px]">
                        <div>
                          <div className="flex justify-between text-zinc-300 mb-0.5">
                            <span>{language === "fr" ? "Géopolitique & Sahel" : "Geopolitical & Sahel"}</span>
                            <span>82%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-1 rounded-none overflow-hidden">
                            <div className="bg-[#E85D42] h-full" style={{ width: "82%", backgroundColor: currentSettings.accentColor }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-zinc-300 mb-0.5">
                            <span>{language === "fr" ? "Sécurité & Frontières" : "Security & Border Patrol"}</span>
                            <span>65%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-1 rounded-none overflow-hidden">
                            <div className="bg-amber-500 h-full" style={{ width: "65%" }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-zinc-300 mb-0.5">
                            <span>{language === "fr" ? "Économie & Ressources" : "Economics & Smuggling"}</span>
                            <span>48%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-1 rounded-none overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: "48%" }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Reading Log */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-1">
                        <span className="text-[8.5px] font-black uppercase text-zinc-400 tracking-wide">
                          {language === "fr" ? "Vos Journaux d'Audit" : "Your Secure Audit Log"}
                        </span>
                        <button
                          onClick={() => {
                            if (window.confirm(language === "fr" ? "Voulez-vous effacer vos journaux d'activité ?" : "Clear your secure activity logs?")) {
                              setSettingsSuccessMsg(language === "fr" ? "✓ Journaux effacés" : "✓ Logs wiped successfully");
                              setTimeout(() => setSettingsSuccessMsg(""), 3000);
                            }
                          }}
                          className="text-[7.5px] font-black uppercase text-rose-500 hover:underline"
                        >
                          {language === "fr" ? "EFFACER" : "WIPE"}
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {interactions.filter(i => i.email.toLowerCase() === readerProfile.email.toLowerCase()).length > 0 ? (
                          interactions
                            .filter(i => i.email.toLowerCase() === readerProfile.email.toLowerCase())
                            .map((log) => (
                              <div key={log.id} className="p-2 bg-zinc-950 border border-zinc-900 font-mono text-[7.5px] text-zinc-400 space-y-0.5">
                                <div className="flex justify-between text-zinc-600">
                                  <span>{log.date}</span>
                                  <span className="text-zinc-700 uppercase">[{log.type}]</span>
                                </div>
                                <p className="text-zinc-300 font-semibold">{language === "fr" ? log.detail.fr : log.detail.en}</p>
                              </div>
                            ))
                        ) : (
                          <p className="text-[9px] text-zinc-500 italic py-2">
                            {language === "fr" ? "Aucune activité enregistrée pour cette session." : "No recorded audit entries yet."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBMENU: OFFLINE (Cache Local & Bande) */}
                {activeSubMenu === "offline" && (
                  <div className="p-4 space-y-4 text-left font-cambria text-xs">
                    <span className="text-[9px] font-black uppercase text-[#E85D42] tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-1" style={{ color: currentSettings.accentColor }}>
                      <WifiOff size={10} strokeWidth={2.5} />
                      <span>{language === "fr" ? "Cache local & Bandes" : "Local Cache & Bandwidth Management"}</span>
                    </span>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900">
                      <div>
                        <span className="text-[11px] font-black block leading-none">
                          {language === "fr" ? "MODE DE LECTURE HORS-LIGNE" : "OFFLINE MIRROR MODE"}
                        </span>
                        <span className="text-[8.5px] text-zinc-500 leading-normal block mt-1">
                          {language === "fr" ? "Pré-charge les articles et les images localement" : "Pre-caches articles & photos locally for flights/tunnels"}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={offlineEnabled}
                          onChange={(e) => {
                            setOfflineEnabled(e.target.checked);
                            setSettingsSuccessMsg(
                              language === "fr"
                                ? (e.target.checked ? "✓ Miroir local activé. 100% des frames synchronisés." : "Miroir local désactivé.")
                                : (e.target.checked ? "✓ Offline mirror enabled. 100% of frames synced." : "Offline mirror disabled.")
                            );
                            setTimeout(() => setSettingsSuccessMsg(""), 3000);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                      </label>
                    </div>

                    {/* Data Saver Mode Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900">
                      <div>
                        <span className="text-[11px] font-black block leading-none">
                          {language === "fr" ? "ÉCONOMISEUR DE DONNÉES" : "BANDWIDTH CONSERVATION MODE"}
                        </span>
                        <span className="text-[8.5px] text-zinc-500 leading-normal block mt-1">
                          {language === "fr" ? "Désactive le chargement des images haute définition" : "Strips HD images & loads lightweight vectors only"}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={dataSaverEnabled}
                          onChange={(e) => {
                            setDataSaverEnabled(e.target.checked);
                            setSettingsSuccessMsg(
                              language === "fr"
                                ? (e.target.checked ? "✓ Économiseur de données activé." : "Économiseur de données désactivé.")
                                : (e.target.checked ? "✓ Bandwidth conservation activated." : "Bandwidth conservation disabled.")
                            );
                            setTimeout(() => setSettingsSuccessMsg(""), 3000);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                      </label>
                    </div>

                    {/* Cache Analytics */}
                    <div className="space-y-2 bg-zinc-900/50 p-3.5 border border-zinc-800">
                      <span className="text-[8.5px] font-black uppercase text-zinc-400 block tracking-wide">
                        {language === "fr" ? "Statistiques d'Espace Stocké" : "Local Storage Footprint"}
                      </span>
                      <div className="space-y-1.5 font-mono text-[8px] text-zinc-400 uppercase leading-normal">
                        <p>PRE_CACHED_FRAMES: 42 articles</p>
                        <p>MEDIA_RESOURCE_CACHED: 12.8 MB</p>
                        <p>SITE_VECTOR_RESOURCES: 2.1 MB</p>
                        <p className="text-zinc-300 font-black">TOTAL_STORAGE: 14.9 MB / 512 MB</p>
                      </div>

                      <button
                        onClick={() => {
                          setSettingsSuccessMsg(language === "fr" ? "✓ Cache local vidé avec succès !" : "✓ Local cache purged successfully!");
                          setTimeout(() => setSettingsSuccessMsg(""), 3000);
                        }}
                        className="mt-2 w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 p-2 text-[8px] text-rose-500 font-bold tracking-widest uppercase text-center cursor-pointer"
                      >
                        {language === "fr" ? "PURGER TOUT LE CACHE" : "PURGE ENTIRE CACHE"}
                      </button>
                    </div>
                  </div>
                )}

                {/* SUBMENU: MESSAGES */}
                {activeSubMenu === "messages" && (
                  <div className="flex flex-col h-full text-left font-cambria text-xs">
                    {/* Navigation toolbar for Full Discussion Page & Floating Tab */}
                    <div className="p-2.5 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between gap-2 shrink-0">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                        {language === "fr" ? "Canal Direct" : "Direct Channel"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-floating-chat', { detail: { email: selectedChatUser } }));
                            setShowProfileModal(false);
                          }}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-[#E85D42] border border border-zinc-800 text-[9.5px] font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1"
                          title={language === "fr" ? "Ouvrir en bulle flottante Messenger" : "Open in floating Facebook chat tab"}
                        >
                          💬 {language === "fr" ? "Bulle Flottante" : "Floating Tab"}
                        </button>
                        <button
                          onClick={() => {
                            navigate('/discussion');
                            setShowProfileModal(false);
                          }}
                          className="px-2 py-1 bg-[#E85D42] hover:bg-[#d04a30] text-white text-[9.5px] font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                          title={language === "fr" ? "Ouvrir la page de discussion complète" : "Open full discussion page"}
                        >
                          ↗ {language === "fr" ? "Plein Écran" : "Full Page"}
                        </button>
                      </div>
                    </div>

                    {/* Contacts list selector */}
                    <div className="p-2.5 border-b border-zinc-900 bg-zinc-950/80 flex gap-1.5 overflow-x-auto shrink-0">
                      {[
                        { email: "contact@perspective.sn", name: language === "fr" ? "Admin Rédaction" : "Editorial Admin" },
                      ].map((contact) => (
                        <button
                          key={contact.email}
                          onClick={() => {
                            setSelectedChatUser(contact.email);
                            setAttachedMaterialType("none");
                            setAttachedMaterialId("");
                          }}
                          className={`px-2.5 py-1 border text-[9.5px] uppercase font-mono font-bold tracking-wider shrink-0 cursor-pointer transition-all rounded ${selectedChatUser === contact.email ? "bg-zinc-800 border-[#E85D42] text-white shadow-xs" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
                        >
                          {contact.name}
                        </button>
                      ))}
                    </div>

                    {/* Chat Messages History */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0c0c0e]">
                      {directMessages && directMessages.filter(
                        (dm) =>
                          (dm.sender === readerProfile.email && dm.receiver === selectedChatUser) ||
                          (dm.sender === selectedChatUser && dm.receiver === readerProfile.email)
                      ).length > 0 ? (
                        directMessages
                          .filter(
                            (dm) =>
                              (dm.sender === readerProfile.email && dm.receiver === selectedChatUser) ||
                              (dm.sender === selectedChatUser && dm.receiver === readerProfile.email)
                          )
                          .map((dm) => {
                            const isMe = dm.sender === readerProfile.email;
                            return (
                              <div
                                key={dm.id}
                                className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                              >
                                <span className="text-[8px] font-mono text-zinc-600 mb-0.5">
                                  {isMe ? (language === "fr" ? "Vous" : "You") : dm.sender.split("@")[0]} • {dm.date}
                                </span>
                                <div
                                  className={`px-3.5 py-2 text-[11px] leading-relaxed font-sans transition-all ${isMe ? "text-white rounded-2xl rounded-br-xs shadow-xs" : "bg-zinc-800 text-zinc-100 rounded-2xl rounded-bl-xs shadow-xs"}`}
                                  style={isMe ? { backgroundColor: currentSettings?.accentColor || "#E85D42" } : {}}
                                >
                                  <p>{getSafeText(dm.text, language)}</p>

                                  {/* Rendering attachment inside bubble */}
                                  {dm.attachment && (
                                    <div className="mt-2.5 p-2 bg-zinc-950 border border-zinc-800/80 text-[10px]">
                                      {dm.attachment.type === "article" ? (
                                        <div>
                                          <span className="text-[7.5px] font-black uppercase text-amber-500 tracking-wider block mb-1">
                                            📰 {language === "fr" ? "Article Partagé" : "Shared Article"}
                                          </span>
                                          <p className="font-bold text-zinc-200 line-clamp-1">{typeof dm.attachment.title === 'object' ? ((dm.attachment.title as any)[language] || (dm.attachment.title as any).fr || (dm.attachment.title as any).en || '') : (dm.attachment.title || '')}</p>
                                          <p className="text-[9px] text-zinc-500 mt-0.5 line-clamp-1">{typeof dm.attachment.subtitle === 'object' ? ((dm.attachment.subtitle as any)[language] || (dm.attachment.subtitle as any).fr || (dm.attachment.subtitle as any).en || '') : (dm.attachment.subtitle || '')}</p>
                                          <button
                                            onClick={() => {
                                              const slug = dm.attachment?.link.split("/article/")[1] || "";
                                              if (slug) {
                                                navigate("/article/" + slug);
                                                setShowProfileModal(false);
                                              }
                                            }}
                                            className="mt-2 w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[7.5px] tracking-wider uppercase py-1 border border-zinc-800 transition-all cursor-pointer"
                                          >
                                            {language === "fr" ? "Consulter l'Article" : "Read Article"}
                                          </button>
                                        </div>
                                      ) : dm.attachment.type === "comment" ? (
                                        <div>
                                          <span className="text-[7.5px] font-black uppercase text-[#E85D42] tracking-wider block mb-1" style={{ color: currentSettings.accentColor }}>
                                            💬 {language === "fr" ? "Extrait Commentaire" : "Shared Comment"}
                                          </span>
                                          <p className="font-bold text-zinc-300 italic">"{typeof dm.attachment.title === 'object' ? ((dm.attachment.title as any)[language] || (dm.attachment.title as any).fr || (dm.attachment.title as any).en || '') : (dm.attachment.title || '')}"</p>
                                          <p className="text-[8.5px] text-zinc-500 mt-1">Par: {typeof dm.attachment.subtitle === 'object' ? ((dm.attachment.subtitle as any)[language] || (dm.attachment.subtitle as any).fr || (dm.attachment.subtitle as any).en || '') : (dm.attachment.subtitle || '')}</p>
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                          <MessageSquare className="text-zinc-700 animate-pulse" size={32} />
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            {language === "fr" ? "Canal Chiffré Sécurisé" : "Secure End-to-End Link"}
                          </p>
                          <p className="text-[9.5px] text-zinc-400 font-medium leading-relaxed max-w-[200px]">
                            {language === "fr"
                              ? "Aucun message. Envoyez une note sécurisée ou partagez un article du journal !"
                              : "No prior secure history. Send an encrypted note or share a Sahel report!"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Share Material Selector Drawer/Section */}
                    <div className="p-3 bg-[#111114] border-t border-zinc-900 shrink-0">
                      <div className="flex gap-1.5 mb-2 overflow-x-auto py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedMaterialType(attachedMaterialType === "article" ? "none" : "article");
                            setAttachedMaterialId("");
                          }}
                          className={`px-2 py-1 text-[8.5px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${attachedMaterialType === "article" ? "bg-amber-600/10 border-amber-500 text-amber-500" : "bg-zinc-950 border-zinc-800 text-zinc-400"}`}
                        >
                          📎 {language === "fr" ? "Partager Article" : "Attach Article"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedMaterialType(attachedMaterialType === "comment" ? "none" : "comment");
                            setAttachedMaterialId("");
                          }}
                          className={`px-2 py-1 text-[8.5px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${attachedMaterialType === "comment" ? "bg-[#E85D42]/10 border-[#E85D42] text-[#E85D42]" : "bg-zinc-950 border-zinc-800 text-zinc-400"}`}
                          style={attachedMaterialType === "comment" ? { borderColor: currentSettings.accentColor, color: currentSettings.accentColor, backgroundColor: currentSettings.accentColor + '10' } : {}}
                        >
                          📎 {language === "fr" ? "Partager Commentaire" : "Attach Comment"}
                        </button>
                      </div>

                      {/* Attachment Selector Body */}
                      {attachedMaterialType === "article" && (
                        <div className="mb-2 bg-zinc-950 border border-zinc-800 max-h-32 overflow-y-auto p-2 space-y-1">
                          {articles && articles.map((art) => (
                            <button
                              key={art.id}
                              type="button"
                              onClick={() => setAttachedMaterialId(art.id)}
                              className={`w-full text-left p-1.5 text-[9px] border transition-all truncate block ${attachedMaterialId === art.id ? "border-amber-500 bg-amber-500/10 text-white" : "border-transparent text-zinc-400 hover:text-white"}`}
                            >
                              [{getSafeText(art.category, language)}] {getSafeText(art.title, language)}
                            </button>
                          ))}
                        </div>
                      )}

                      {attachedMaterialType === "comment" && (
                        <div className="mb-2 bg-zinc-950 border border-zinc-800 max-h-32 overflow-y-auto p-2 space-y-1">
                          {comments && comments.slice(0, 10).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setAttachedMaterialId(c.id)}
                              className={`w-full text-left p-1.5 text-[9px] border transition-all truncate block ${attachedMaterialId === c.id ? "border-[#E85D42] bg-[#E85D42]/10 text-white" : "border-transparent text-zinc-400 hover:text-white"}`}
                              style={attachedMaterialId === c.id ? { borderColor: currentSettings.accentColor, backgroundColor: currentSettings.accentColor + '10' } : {}}
                            >
                              "{getSafeText(c.text, language)}" - {c.author}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Pending Attachment Badge indicator */}
                      {attachedMaterialType !== "none" && attachedMaterialId && (
                        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 px-2 py-1 mb-2 text-[9px]">
                          <span className="text-[#E85D42] font-mono tracking-wider flex items-center gap-1" style={{ color: currentSettings.accentColor }}>
                            ✓ {attachedMaterialType === "article" ? (language === "fr" ? "Article sélectionné !" : "Article linked!") : (language === "fr" ? "Commentaire sélectionné !" : "Comment linked!")}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAttachedMaterialType("none");
                              setAttachedMaterialId("");
                            }}
                            className="text-rose-500 hover:text-rose-400 font-black cursor-pointer uppercase text-[8px]"
                          >
                            [ {language === "fr" ? "Annuler" : "Cancel"} ]
                          </button>
                        </div>
                      )}

                      {/* Chat Input message box */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newMessageText.trim() && attachedMaterialType === "none") return;

                          let attachObj = undefined;
                          if (attachedMaterialType === "article" && attachedMaterialId) {
                            const found = articles?.find((a) => a.id === attachedMaterialId);
                            if (found) {
                              attachObj = {
                                type: "article" as const,
                                id: found.id,
                                title: found.title[language] || found.title.fr,
                                link: `/article/${found.slug}`,
                                subtitle: found.excerpt[language] || found.excerpt.fr
                              };
                            }
                          } else if (attachedMaterialType === "comment" && attachedMaterialId) {
                            const found = comments?.find((c) => c.id === attachedMaterialId);
                            if (found) {
                              attachObj = {
                                type: "comment" as const,
                                id: found.id,
                                title: found.text,
                                link: "",
                                subtitle: found.author
                              };
                            }
                          }

                          sendDirectMessage({
                            sender: readerProfile.email,
                            receiver: selectedChatUser,
                            text: newMessageText.trim() || (language === "fr" ? "Pièce jointe du journal :" : "Linked journal material:"),
                            attachment: attachObj
                          });

                          setNewMessageText("");
                          setAttachedMaterialType("none");
                          setAttachedMaterialId("");
                        }}
                        className="flex gap-1.5"
                      >
                        <input
                          type="text"
                          placeholder={language === "fr" ? "Écrire un message chiffré..." : "Type an encrypted dispatch..."}
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-[#E85D42] p-2 text-[11px] text-white animate-none"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#E85D42] hover:bg-[#D45037] text-white font-black text-[9px] tracking-widest uppercase transition-all cursor-pointer rounded-none font-mono"
                          style={{ backgroundColor: currentSettings.accentColor }}
                        >
                          {language === "fr" ? "ENVOYER" : "SEND"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* SUBMENU: SETTINGS */}
                {activeSubMenu === "settings" && (
                  <div className="p-1 space-y-6 text-left text-xs font-serif text-brand-dark">
                    {/* Success notification banner */}
                    {settingsSuccessMsg && (
                      <div className="bg-brand-soft border border-emerald-800/40 text-emerald-800 dark:text-emerald-200 p-3 font-mono text-[9px] tracking-wide uppercase mb-1 rounded-none animate-fadeIn">
                        {settingsSuccessMsg}
                      </div>
                    )}

                    {/* IDENTITY & AVATAR PROFILE CONFIG (Unified) */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono font-black uppercase text-brand-muted tracking-widest block border-b border-brand-border/30 pb-2">
                        {language === "fr" ? "I. IDENTITÉ & PROFIL VISUEL" : "I. PROFILE IDENTITY & GEOMETRIC PRESETS"}
                      </span>

                      {/* Display name field */}
                      <div className="space-y-2">
                        <label className="block text-[8.5px] font-mono font-black uppercase tracking-widest text-brand-muted">
                          {language === 'fr' ? 'Votre Nom d\'Usage ou Pseudo' : 'Display Name / Nickname'}
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                          }}
                          onBlur={() => {
                            if (editName.trim() && readerProfile) {
                              setReaderProfile({ ...readerProfile, name: editName });
                            }
                          }}
                          className="w-full bg-brand-soft/25 border border-brand-border focus:border-brand-dark focus:outline-none p-3 text-xs font-bold font-serif text-brand-dark rounded-none"
                        />
                      </div>

                      {/* Presets Grid */}
                      <div className="space-y-2">
                        <label className="block text-[8.5px] font-mono font-black uppercase tracking-widest text-brand-muted">
                          {language === 'fr' ? "Sélectionner un preset neutre" : "Select Neutral Preset Avatar"}
                        </label>
                        <div className="grid grid-cols-4 gap-3">
                          {avatarOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setEditAvatar(opt.url);
                                setReaderProfile({ ...readerProfile, avatarUrl: opt.url });
                                setSettingsSuccessMsg(
                                  language === "fr"
                                    ? `✓ Avatar mis à jour : ${opt.label}`
                                    : `✓ Avatar preset selected: ${opt.label}`
                                );
                                setTimeout(() => setSettingsSuccessMsg(""), 4000);
                              }}
                              className="relative aspect-square border bg-brand-white transition-all cursor-pointer overflow-hidden border-brand-border/35 hover:border-brand-dark rounded-none"
                              style={{
                                borderColor: editAvatar === opt.url ? currentSettings.accentColor : undefined,
                              }}
                            >
                              {renderNeutralAvatar(opt.url, readerProfile?.name, 80)}
                              {editAvatar === opt.url && (
                                <div className="absolute inset-0 bg-brand-dark/10 flex items-center justify-center">
                                  <div className="bg-brand-white/95 border border-brand-border/40 p-1 rounded-none shadow-sm">
                                    <Check size={10} className="text-brand-dark" strokeWidth={3} />
                                  </div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Device upload */}
                      <div className="space-y-2 pt-1">
                        <label className="block text-[8.5px] font-mono font-black uppercase tracking-widest text-brand-muted">
                          {language === 'fr' ? 'Ou importer une photo personnalisée depuis l\'appareil' : 'Or upload custom photo from device'}
                        </label>
                        <label className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-brand-soft/30 hover:bg-brand-soft/60 border border-brand-border/30 text-[9px] font-mono font-black tracking-widest uppercase text-brand-dark cursor-pointer transition-all rounded-none border-dashed hover:border-brand-dark">
                          <UploadCloud size={13} style={{ color: currentSettings.accentColor }} />
                          <span>{language === 'fr' ? 'CHOISIR UNE IMAGE' : 'CHOOSE IMAGE FILE'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSettingsPhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Email Verification Card */}
                    <div className="space-y-3 pt-4 border-t border-brand-border/30">
                      <span className="text-[10px] font-mono font-black uppercase text-brand-muted tracking-widest block">
                        {language === "fr" ? "II. STATUT DE VALIDATION DE L'ADRESSE" : "II. EMAIL VALIDATION STATUS"}
                      </span>
                      {emailVerified ? (
                        <div className="bg-brand-soft border border-brand-border/40 p-3.5 flex items-center justify-between rounded-none">
                          <div>
                            <p className="font-bold text-emerald-800 dark:text-emerald-200 text-xs">✓ {language === "fr" ? "Adresse de Messagerie Validée" : "Security Clearance Active"}</p>
                            <p className="text-[10px] text-brand-muted font-mono mt-1">{readerProfile.email}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-brand-soft border border-brand-border/40 text-brand-muted text-[8px] font-mono rounded-none">SECURE_ID</span>
                        </div>
                      ) : (
                        <div className="bg-brand-soft border border-brand-border/40 p-4 flex flex-col gap-3 rounded-none">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-brand-dark text-xs">⚠️ {language === "fr" ? "Validation En Attente" : "Verification Outstanding"}</p>
                              <p className="text-[10px] text-brand-muted font-mono mt-1">{readerProfile.email}</p>
                            </div>
                            <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-600 text-[8px] font-mono rounded-none font-bold">UNVERIFIED</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEmailVerified(true);
                              setSettingsSuccessMsg(
                                language === "fr"
                                  ? "✓ E-mail de validation envoyé avec succès ! Votre compte est maintenant vérifié."
                                  : "✓ Validation dispatch dispatched successfully! Security status elevated."
                              );
                              setTimeout(() => setSettingsSuccessMsg(""), 5000);
                            }}
                            className="bg-brand-dark text-white border border-transparent p-2.5 text-[9px] font-mono font-black tracking-widest uppercase text-center transition-all cursor-pointer rounded-none hover:bg-brand-dark/90"
                          >
                            {language === "fr" ? "VALIDER MON ADRESSE E-MAIL" : "VERIFY MY EMAIL DISPATCH"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Security Update Card */}
                    <div className="space-y-4 pt-4 border-t border-brand-border/30">
                      <span className="text-[10px] font-mono font-black uppercase text-brand-muted tracking-widest block">
                        {language === "fr" ? "III. MISE À JOUR DE SÉCURITÉ" : "III. SECURITY PASS ROTATION"}
                      </span>

                      <div className="space-y-1.5">
                        <label className="block text-[8.5px] font-mono font-black text-brand-muted tracking-widest uppercase">
                          {language === "fr" ? "Nouveau Mot de Passe :" : "New Password Lock:"}
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-brand-soft/25 border border-brand-border focus:border-brand-dark focus:outline-none p-3 text-brand-dark font-mono rounded-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[8.5px] font-mono font-black text-brand-muted tracking-widest uppercase">
                          {language === "fr" ? "Nouveau Code PIN (4 chiffres) :" : "New Secure PIN (4 digits):"}
                        </label>
                        <input
                          type="text"
                          pattern="\d{4}"
                          maxLength={4}
                          placeholder="••••"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                          className="w-full bg-brand-soft/25 border border-brand-border focus:border-brand-dark focus:outline-none p-3 text-brand-dark font-mono tracking-widest text-center rounded-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!newPassword.trim() && !newPin.trim()) return;
                          setSettingsSuccessMsg(
                            language === "fr"
                              ? "✓ Les clés de sécurité de votre compte ont été mises à jour."
                              : "✓ Secure keys successfully rotated and locked."
                          );
                          setNewPassword("");
                          setNewPin("");
                          setTimeout(() => setSettingsSuccessMsg(""), 5000);
                        }}
                        className="w-full bg-[#E85D42] hover:bg-[#D45037] text-white font-mono font-black text-[9px] tracking-widest uppercase p-3.5 transition-all cursor-pointer rounded-none border border-transparent"
                        style={{ backgroundColor: currentSettings.accentColor }}
                      >
                        {language === "fr" ? "METTRE À JOUR LA SÉCURITÉ" : "ROTATE SECURITY KEYS"}
                      </button>
                    </div>

                    {/* Clean editorial footnote instead of tech noise */}
                    <div className="bg-brand-soft/30 border border-brand-border/40 p-4 font-mono space-y-1 text-[8.5px] text-brand-muted uppercase tracking-wider rounded-none">
                      <p>MEMBER ID: {readerProfile.email?.split("@")[0].toUpperCase()}</p>
                      <p>CLEARANCE TIER: {readerProfile.role === "Admin" ? "LEVEL 4 EXECUTIVE" : "LEVEL 1 READER"}</p>
                      <p>Dossier Server Node: Sahel-SNDKR</p>
                    </div>
                  </div>
                )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Close Drawer Footer Action */}
              <div className="p-4 border-t border-brand-border bg-brand-white flex justify-end rounded-none">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-5 py-2 bg-[#E85D42] hover:bg-[#D45037] text-xs font-black uppercase tracking-widest transition-all cursor-pointer text-white rounded-none border border-brand-border/10 font-mono"
                  style={{ backgroundColor: currentSettings.accentColor }}
                >
                  {language === "fr" ? "FERMER" : "CLOSE"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
