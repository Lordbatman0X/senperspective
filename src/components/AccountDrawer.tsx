import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useAuth } from "../contexts/AuthContext";
import { ConnectionsAndProfile } from "./ConnectionsAndProfile";
import { SharedItemCard } from "./SharedItemCard";
import { InternalShareModal } from "./InternalShareModal";
import { db, safeOnSnapshot, doc, updateDoc, collection, setDoc, deleteDoc } from "../lib/mongodb";
import { sanitizeFirestorePayload } from "../lib/imageUtils";
import {
  X,
  Sun,
  Moon,
  Bookmark,
  User,
  LogOut,
  MessageSquare,
  Flame,
  Crown,
  Lock,
  Activity,
  WifiOff,
  Send,
  Search,
  Users,
  Eye,
  Clock,
  Sparkles,
  Check,
  Shield,
  FileText,
  ThumbsUp,
  ExternalLink,
  MessageCircle,
  Bell,
  Share2
} from "lucide-react";
import { NotificationSetupPanel } from "./NotificationSetupPanel";
import { motion, AnimatePresence } from "motion/react";

// Inline helper for neutral avatar rendering matching app design standards
export function renderNeutralAvatar(urlOrPreset: string | undefined, name: string = "User", size: number = 40) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : "U";
  
  if (urlOrPreset && (urlOrPreset.startsWith("http") || urlOrPreset.startsWith("data:") || urlOrPreset.startsWith("/") || urlOrPreset.startsWith("blob:"))) {
    return (
      <img
        src={urlOrPreset}
        alt={name}
        className="w-full h-full object-cover block rounded-none"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRTRFNkVCIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIxNCIgcj0iNi41IiBmaWxsPSIjOEE4RDkxIi8+PHBhdGggZD0iTTcgMzYgQzcgMjTuNSwgMTIuNSAyNCwgMjAgMjQgQzI3LjUgMjQsIDMzIDI3LjUsIDMzIDM2IFoiIGZpbGw9IiM4QThEOTEiLz48L3N2Zz4=";
        }}
      />
    );
  }

  if (urlOrPreset === "preset-male") {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" className="w-full h-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" style={{ minWidth: size, minHeight: size }}>
        <circle cx="20" cy="14" r="6.5" fill="currentColor" />
        <path d="M7 36 C7 27.5, 12.5 24, 20 24 C27.5 24, 33 27.5, 33 36 Z" fill="currentColor" />
      </svg>
    );
  }

  if (urlOrPreset === "preset-female") {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" className="w-full h-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" style={{ minWidth: size, minHeight: size }}>
        <path d="M12 15 C12 8, 28 8, 28 15 C28 19, 26.5 21, 26.5 21 C26.5 21, 25 15, 20 15 C15 15, 13.5 21, 13.5 21 C13.5 21, 12 19, 12 15 Z" fill="currentColor" />
        <circle cx="20" cy="14" r="6.5" fill="currentColor" />
        <path d="M7 36 C7 27.5, 12.5 24, 20 24 C27.5 24, 33 27.5, 33 36 Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-mono font-bold text-xs uppercase">
      {initial}
    </div>
  );
}

export interface AccountDrawerProps {
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  readerProfile: any;
  setReaderProfile: (profile: any) => void;
  isPremiumMock: boolean;
  setIsPremiumMock: (premium: boolean) => void;
  currentSettings: any;
  language: "fr" | "en";
  setLanguage: (lang: "fr" | "en") => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  
  // stats/comments
  statsReadingStreak: number;
  statsArticlesRead: number;
  comments: any[];
  articles: any[];
  savedArticles: string[];
  toggleSavedArticle: (id: string) => void;
  
  // messages
  directMessages: any[];
  sendDirectMessage: (msg: any) => void;
  selectedChatUser: string;
  setSelectedChatUser: (email: string) => void;
  attachedMaterialType: string;
  setAttachedMaterialType: (type: any) => void;
  attachedMaterialId: string;
  setAttachedMaterialId: (id: string) => void;
  newMessageText: string;
  setNewMessageText: (text: string) => void;
  
  // settings
  editName: string;
  setEditName: (name: string) => void;
  editAvatar: string;
  setEditAvatar: (url: string) => void;
  avatarOptions: any[];
  handleSettingsPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  emailVerified: boolean;
  setEmailVerified: (verified: boolean) => void;
  
  // tipline
  tiplineSubmitted: boolean;
  setTiplineSubmitted: (submitted: boolean) => void;
  tiplineFormText: string;
  setTiplineFormText: (text: string) => void;
  
  // offline
  offlineEnabled: boolean;
  setOfflineEnabled: (enabled: boolean) => void;
  dataSaverEnabled: boolean;
  setDataSaverEnabled: (enabled: boolean) => void;
  
  // notifications
  notifications: any[];
  deleteNotification: (id: string) => void;
  respondToNotification: (id: string, action: string) => void;
  notificationResponses: Record<string, string>;

  // studio / admin config
  expandedSection?: string;
  setExpandedSection?: (section: any) => void;
  editMatchContextEn?: string;
  setEditMatchContextEn?: (s: string) => void;
}

export function AccountDrawer({
  showProfileModal,
  setShowProfileModal,
  readerProfile,
  setReaderProfile,
  isPremiumMock,
  setIsPremiumMock,
  currentSettings,
  language,
  setLanguage,
  theme,
  toggleTheme,
  statsReadingStreak,
  statsArticlesRead,
  comments,
  articles,
  savedArticles,
  toggleSavedArticle,
  directMessages,
  sendDirectMessage,
  selectedChatUser,
  setSelectedChatUser,
  attachedMaterialType,
  setAttachedMaterialType,
  attachedMaterialId,
  setAttachedMaterialId,
  newMessageText,
  setNewMessageText,
  editName,
  setEditName,
  editAvatar,
  setEditAvatar,
  avatarOptions,
  handleSettingsPhotoUpload,
  emailVerified,
  setEmailVerified,
  tiplineSubmitted,
  setTiplineSubmitted,
  tiplineFormText,
  setTiplineFormText,
  offlineEnabled,
  setOfflineEnabled,
  dataSaverEnabled,
  setDataSaverEnabled,
  notifications,
  deleteNotification,
  respondToNotification,
  notificationResponses,
}: AccountDrawerProps) {
  const navigate = useNavigate();
  const { updateUserSecurity, updateUserPassword, updateUserPin, friends } = useStore();
  const { user, logoutUser, allUsers } = useAuth();
  
  const [activeSubMenu, setActiveSubMenu] = useState<string>("main");
  const [showInternalShareModal, setShowInternalShareModal] = useState<boolean>(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState("");
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  
  // Friends list state with real-time Firestore sync
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [networkSearchQuery, setNetworkSearchQuery] = useState("");
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<any | null>(null);

  // Security variables
  const [securityPinInput, setSecurityPinInput] = useState("");
  const [securityOtpInput, setSecurityOtpInput] = useState("");
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState("");

  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");

  const isAdmin = Boolean(
    readerProfile?.role === "Admin" ||
    readerProfile?.role === "Éditeur" ||
    user?.email === "kadersdiaz3@gmail.com" ||
    user?.email === "admin@perspective.sn" ||
    sessionStorage.getItem("perspective-temp-admin-session") === "authenticated"
  );

  const markDirectMessagesAsRead = useStore(s => s.markDirectMessagesAsRead);
  const unreadMessagesCount = (directMessages || []).filter(
    dm => dm.receiver?.toLowerCase().trim() === (readerProfile?.email || '').toLowerCase().trim() && !dm.read
  ).length;

  useEffect(() => {
    if (showProfileModal && activeSubMenu === "messages" && readerProfile?.email) {
      markDirectMessagesAsRead('', readerProfile.email);
    }
  }, [showProfileModal, activeSubMenu, readerProfile?.email, markDirectMessagesAsRead]);

  // Real-time Firestore listener for friends
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  useEffect(() => {
    if (!readerProfile?.email) return;
    
    const reqRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "friend_requests");
    const unsubReq = safeOnSnapshot(reqRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap: any) => list.push(docSnap.id.toLowerCase().trim()));
      setFriendRequests(list);
    }, (err) => console.warn(err));

    const sentRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "sent_requests");
    const unsubSent = safeOnSnapshot(sentRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap: any) => list.push(docSnap.id.toLowerCase().trim()));
      setSentRequests(list);
    }, (err) => console.warn(err));

    return () => { unsubReq(); unsubSent(); };
  }, [readerProfile?.email]);

  useEffect(() => {
    if (!readerProfile?.email) return;
    const friendsRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "friends");
    const unsubscribe = safeOnSnapshot(
      friendsRef,
      (snapshot) => {
        const list: string[] = [];
        snapshot.forEach((docSnap: any) => {
          list.push(docSnap.id.toLowerCase().trim());
        });
        setFriendsList(list);
      },
      (error) => {
        console.warn("Notice fetching friends:", error);
      }
    );
    return () => unsubscribe();
  }, [readerProfile?.email]);

  const toggleFriend = async (friendEmail: string) => {
    if (!readerProfile?.email) return;
    const myEmail = readerProfile.email.toLowerCase().trim();
    const targetEmail = friendEmail.toLowerCase().trim();
    if (myEmail === targetEmail) return;

    const isFriend = friendsList.includes(targetEmail);
    const hasSentRequest = sentRequests.includes(targetEmail);
    const hasReceivedRequest = friendRequests.includes(targetEmail);

    const targetUser = allUsers.find(u => u.email.toLowerCase().trim() === targetEmail);
    const isPrivate = targetUser?.hidePersonalInfo;

    try {
      const myFriendDocRef = doc(db, "users", myEmail, "friends", targetEmail);
      const targetFriendDocRef = doc(db, "users", targetEmail, "friends", myEmail);
      
      const sentReqRef = doc(db, "users", myEmail, "sent_requests", targetEmail);
      const targetReqRef = doc(db, "users", targetEmail, "friend_requests", myEmail);

      const receivedReqRef = doc(db, "users", myEmail, "friend_requests", targetEmail);
      const targetSentReqRef = doc(db, "users", targetEmail, "sent_requests", myEmail);

      if (isFriend) {
        await deleteDoc(myFriendDocRef);
        await deleteDoc(targetFriendDocRef);
        setSettingsSuccessMsg(language === "fr" ? "✓ Contact retiré du réseau" : "✓ Contact removed from network");
      } else if (hasSentRequest) {
        await deleteDoc(sentReqRef);
        await deleteDoc(targetReqRef);
        setSettingsSuccessMsg(language === "fr" ? "✓ Demande annulée" : "✓ Request cancelled");
      } else if (hasReceivedRequest) {
        await deleteDoc(receivedReqRef);
        await deleteDoc(targetSentReqRef);
        await setDoc(myFriendDocRef, { email: targetEmail, connectedAt: Date.now() });
        await setDoc(targetFriendDocRef, { email: myEmail, connectedAt: Date.now() });
        setSettingsSuccessMsg(language === "fr" ? "✓ Demande acceptée !" : "✓ Request accepted!");
      } else {
        if (isPrivate) {
          await setDoc(sentReqRef, { email: targetEmail, sentAt: Date.now() });
          await setDoc(targetReqRef, { email: myEmail, sentAt: Date.now() });
          setSettingsSuccessMsg(language === "fr" ? "✓ Demande envoyée" : "✓ Request sent");
        } else {
          await setDoc(myFriendDocRef, { email: targetEmail, connectedAt: Date.now() });
          await setDoc(targetFriendDocRef, { email: myEmail, connectedAt: Date.now() });
          setSettingsSuccessMsg(language === "fr" ? "✓ Contact ajouté au réseau !" : "✓ Contact added to network!");
        }
      }
      setTimeout(() => setSettingsSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Failed to toggle friend status:", err);
    }
  };

  const syncProfileToFirestore = async (updatedFields: Record<string, any>) => {
    if (readerProfile && readerProfile.email) {
      try {
        const userRef = doc(db, "users", readerProfile.email.toLowerCase().trim());
        const safeFields = await sanitizeFirestorePayload(updatedFields);
        await updateDoc(userRef, safeFields);
      } catch (err) {
        console.error("Error syncing profile updates to Firestore:", err);
      }
    }
  };

  const navItems = [
    { id: "main", icon: Activity, labelFr: "Briefing", labelEn: "Briefing" },
    { id: "alerts", icon: Bell, labelFr: "Alertes", labelEn: "Alerts" },
    { id: "history", icon: Bookmark, labelFr: "Favoris", labelEn: "Saved" },
    { id: "messages", icon: MessageSquare, labelFr: "Messages", labelEn: "Messages" },
    { id: "connections", icon: Users, labelFr: "Réseau", labelEn: "Network" },
    { id: "offline", icon: WifiOff, labelFr: "Miroir", labelEn: "Mirror" },
    { id: "settings", icon: User, labelFr: "Profil", labelEn: "Profile" },
  ];

  return (
    <AnimatePresence>
      {showProfileModal && readerProfile && (
        <motion.div
          key="account-drawer-modal"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end"
        >
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowProfileModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Sliding Panel with Pure Brand Aesthetics & Translucent Glass backdrop */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="relative w-[85vw] max-w-[420px] sm:w-[480px] h-full bg-white/25 dark:bg-black/40 backdrop-blur-2xl backdrop-saturate-150 rounded-l-2xl sm:rounded-l-3xl border-l border-white/20 dark:border-zinc-800/40 text-zinc-950 dark:text-zinc-50 flex flex-col z-50 font-serif shadow-2xl overflow-hidden"
          >
            {/* Drawer Header Area */}
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-zinc-300/30 dark:border-zinc-800/30 bg-white/10 dark:bg-black/20 backdrop-blur-md select-none shrink-0">
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-none" style={{ backgroundColor: currentSettings?.accentColor || "#E85D42" }} />
                  <span>{language === "fr" ? "Espace Membre" : "Member Account"}</span>
                </span>
                <h3 className="text-sm font-serif font-black uppercase tracking-wider text-zinc-900 dark:text-white mt-0.5">
                  {activeSubMenu === "main" && (language === "fr" ? "Aperçu & Briefing" : "Briefing & Overview")}
                  {activeSubMenu === "alerts" && (language === "fr" ? "Configuration des Notifications" : "Notification Setup & Alerts")}
                  {activeSubMenu === "history" && (language === "fr" ? "Dossiers Favoris" : "Saved Dossiers")}
                  {activeSubMenu === "messages" && (language === "fr" ? "Messagerie Sécurisée" : "Secure Dispatch Chat")}
                  {activeSubMenu === "connections" && (language === "fr" ? "Réseau d'Analystes" : "Analyst Network")}
                  {activeSubMenu === "offline" && (language === "fr" ? "Base de Données Locale" : "Local Database Mirror")}
                  {activeSubMenu === "settings" && (language === "fr" ? "Profil & Sécurité" : "Profile & Security")}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800 rounded-none"
                  title={language === "fr" ? "Changer de mode" : "Toggle theme"}
                >
                  {theme === "dark" ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} style={{ color: currentSettings?.accentColor }} />}
                </button>

                {/* Language Switcher */}
                <button
                  onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
                  className="text-[9px] font-mono font-black text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors rounded-none cursor-pointer"
                >
                  {language === "fr" ? "EN" : "FR"}
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={() => {
                    logoutUser();
                    setShowProfileModal(false);
                  }}
                  className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer rounded-none border border-transparent"
                  title={language === "fr" ? "Déconnexion" : "Sign Out"}
                >
                  <LogOut size={14} />
                </button>

                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                {/* Close Drawer Button */}
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-none cursor-pointer border border-zinc-200 dark:border-zinc-800"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Horizontal Ribbon Navigation Tabs */}
            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-zinc-300/30 dark:border-zinc-800/40 flex items-center overflow-x-auto scrollbar-none shrink-0 divide-x divide-zinc-300/20 dark:divide-zinc-800/40 select-none p-1.5 gap-1">
              {navItems.map((item) => {
                const isSelected = activeSubMenu === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSubMenu(item.id)}
                    className={`flex-1 min-w-[68px] py-2.5 px-2 flex flex-col items-center justify-center transition-all cursor-pointer relative rounded-md ${
                      isSelected
                        ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black shadow-lg border border-zinc-950 dark:border-white opacity-100"
                        : "bg-white/20 dark:bg-zinc-900/40 text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white hover:bg-white/40 dark:hover:bg-zinc-800/60 border border-zinc-300/40 dark:border-zinc-700/50 backdrop-blur-sm"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={isSelected ? "text-white dark:text-zinc-950" : "text-zinc-900 dark:text-zinc-100"}
                      style={isSelected ? {} : { color: currentSettings?.accentColor || "#E85D42" }}
                    />
                    <span
                      className={`text-[9px] font-mono uppercase tracking-wider mt-1 leading-none ${
                        isSelected
                          ? "font-black text-white dark:text-zinc-950"
                          : "font-black text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {language === "fr" ? item.labelFr : item.labelEn}
                    </span>
                    {item.id === "messages" && unreadMessagesCount > 0 && !isSelected && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full shadow-md">
                        {unreadMessagesCount}
                      </span>
                    )}
                    {isSelected && (
                      <div
                        className="absolute -bottom-1 left-3 right-3 h-0.5 rounded-full"
                        style={{ backgroundColor: currentSettings?.accentColor || "#E85D42" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main Content Workspace */}
            <div className="flex-grow overflow-y-auto py-5 px-6 relative overflow-x-hidden rounded-none bg-transparent backdrop-blur-md text-zinc-900 dark:text-zinc-100">
              
              {/* Feedback Alert Toast */}
              {settingsSuccessMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 p-3 font-mono text-[9px] font-bold tracking-wide uppercase mb-4 rounded-none animate-fadeIn">
                  {settingsSuccessMsg}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSubMenu}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  
                  {/* VIEW: BRIEFING (INTEL & STATS DASHBOARD) */}
                  {activeSubMenu === "main" && (
                    <div className="space-y-6 text-left font-serif">
                      
                      {/* Identity Card */}
                      <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                        <div className="flex items-center gap-4 text-left w-full md:w-auto">
                          <div className="w-12 h-12 shrink-0 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 overflow-hidden relative shadow-xs">
                            {renderNeutralAvatar(readerProfile.avatarUrl, readerProfile.name, 48)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-serif font-black text-zinc-900 dark:text-white uppercase tracking-tight leading-none truncate max-w-[180px]">
                                {readerProfile.name}
                              </h4>
                              <span
                                className="text-[8px] font-mono font-bold tracking-wider text-white px-1.5 py-0.5 rounded-none leading-none shrink-0"
                                style={{ backgroundColor: currentSettings?.accentColor || "#E85D42" }}
                              >
                                {isAdmin ? "ADMIN" : (language === "fr" ? "MEMBRE" : "MEMBER")}
                              </span>
                            </div>
                            <p className="text-[9.5px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[200px] mt-1 leading-none">
                              {readerProfile.email.toLowerCase()}
                            </p>
                          </div>
                        </div>

                        {/* Fast Stats Badges */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end text-[9.5px] font-mono">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" title={language === "fr" ? "Série de lecture" : "Daily Streak"}>
                            <Flame size={12} className="text-orange-500 shrink-0" />
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{statsReadingStreak}d</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <span className="text-[8px] text-zinc-500 dark:text-zinc-400 font-bold">READ:</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{statsArticlesRead}</span>
                          </div>
                        </div>
                      </div>

                      {/* Topic Breakdown & Strategic Reports */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 p-4 text-left">
                          <span className="text-[9px] font-mono font-bold uppercase text-zinc-900 dark:text-zinc-100 block tracking-wider">
                            {language === "fr" ? "Centres d'Intérêt" : "Analytical Focus"}
                          </span>
                          <div className="space-y-3 pt-1 font-mono text-[9.5px]">
                            <div>
                              <div className="flex justify-between text-zinc-800 dark:text-zinc-200 mb-1">
                                <span>{language === "fr" ? "Géopolitique" : "Geopolitics"}</span>
                                <span className="font-bold">85%</span>
                              </div>
                              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-none overflow-hidden">
                                <div className="h-full" style={{ width: "85%", backgroundColor: currentSettings?.accentColor || "#E85D42" }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-zinc-800 dark:text-zinc-200 mb-1">
                                <span>{language === "fr" ? "Dossiers Défense" : "Security Dossiers"}</span>
                                <span className="font-bold">62%</span>
                              </div>
                              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-none overflow-hidden">
                                <div className="bg-amber-500 h-full" style={{ width: "62%" }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-zinc-800 dark:text-zinc-200 mb-1">
                                <span>{language === "fr" ? "Économie Sahel" : "Sahel Economy"}</span>
                                <span className="font-bold">40%</span>
                              </div>
                              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-none overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: "40%" }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dépêches List */}
                        <div className="space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 p-4 text-left">
                          <span className="text-[9px] font-mono font-bold uppercase text-zinc-900 dark:text-zinc-100 block tracking-wider">
                            {language === "fr" ? "Dépêches Récents" : "Recent Dispatches"}
                          </span>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {notifications && notifications.length > 0 ? (
                              notifications.slice(0, 3).map((n) => (
                                <div key={n.id} className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[9px] font-mono flex flex-col gap-1 text-left">
                                  <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-[8.5px]">
                                    <span>{n.date || "TODAY"}</span>
                                    <span className="text-amber-600 font-bold">INFO</span>
                                  </div>
                                  <p className="text-zinc-600 dark:text-zinc-300 truncate text-[9px] leading-snug">{typeof n.text === 'string' ? n.text : (n.text?.[language] || n.text?.fr || n.text?.en || '')}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-[9.5px] text-zinc-500 dark:text-zinc-400 italic py-3 font-mono">
                                {language === "fr" ? "Aucune alerte en attente." : "All dispatches read."}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Security Audit Log */}
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                          <span className="text-[9.5px] font-mono font-bold uppercase text-zinc-900 dark:text-zinc-100 tracking-wider">
                            {language === "fr" ? "Journal d'Activité de Session" : "Session Activity Audit Log"}
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm(language === "fr" ? "Effacer les journaux de session ?" : "Clear secure session log?")) {
                                setSettingsSuccessMsg(language === "fr" ? "✓ Journaux effacés" : "✓ Activity logs wiped");
                                setTimeout(() => setSettingsSuccessMsg(""), 3000);
                              }
                            }}
                            className="text-[8px] font-mono font-bold uppercase text-rose-600 hover:underline cursor-pointer border-none bg-transparent"
                          >
                            {language === "fr" ? "EFFACER" : "PURGE LOGS"}
                          </button>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {comments && comments.length > 0 ? (
                            comments.slice(0, 3).map((comment, index) => (
                              <div key={index} className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 font-mono text-[8.5px] text-zinc-900 dark:text-zinc-100 space-y-1 text-left">
                                <div className="flex justify-between text-zinc-500">
                                  <span>LOG #{index + 101}</span>
                                  <span>[COMMENT]</span>
                                </div>
                                <p className="font-semibold font-serif text-zinc-900 dark:text-zinc-100 truncate">
                                  {language === "fr" ? `Déclaration sur "${comment.articleTitle}"` : `Commented on "${comment.articleTitle}"`}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic py-2 font-serif">
                              {language === "fr" ? "Aucune activité récente." : "No recent activity recorded."}
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* VIEW: ALERTS & NOTIFICATION SETUP */}
                  {activeSubMenu === "alerts" && (
                    <div className="space-y-4">
                      <NotificationSetupPanel />
                    </div>
                  )}

                  {/* VIEW: HISTORY (SAVED ARTICLES & COMMENTS) */}
                  {activeSubMenu === "history" && (
                    <div className="space-y-6 text-left font-serif">
                      
                      {/* Saved Geopolitical Reports */}
                      <div className="space-y-3">
                        <span className="text-[9.5px] font-mono font-bold uppercase text-white dark:text-white tracking-widest flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                          <Bookmark size={12} style={{ color: currentSettings?.accentColor }} />
                          <span className="text-white dark:text-white">{language === "fr" ? "Rapports & Articles Sauvegardés" : "Saved Articles & Reports"}</span>
                        </span>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {articles && articles.filter((a) => savedArticles?.includes(a.id)).length > 0 ? (
                            articles
                              .filter((a) => savedArticles?.includes(a.id))
                              .map((article, idx) => (
                                <div
                                  key={`${article.id}-${idx}`}
                                  className="p-3.5 bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 text-left rounded-none shadow-sm space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[8.5px] font-mono font-bold uppercase text-white dark:text-white tracking-wider flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                      {article.category || (language === "fr" ? "Économie" : "Economy")} • {article.publishedAt || article.date || "2026-06-21T09:00:00Z"}
                                    </span>
                                    <button
                                      onClick={() => toggleSavedArticle(article.id)}
                                      className="text-white dark:text-white hover:text-rose-400 transition-colors p-1 cursor-pointer border-none bg-transparent shrink-0"
                                      title={language === "fr" ? "Supprimer" : "Remove"}
                                    >
                                      <X size={13} className="text-white dark:text-white" />
                                    </button>
                                  </div>
                                  <Link
                                    to={`/article/${article.slug}`}
                                    onClick={() => setShowProfileModal(false)}
                                    className="text-xs font-serif font-black leading-snug text-white dark:text-white hover:text-amber-300 transition-colors line-clamp-2 block"
                                  >
                                    {article.title?.[language] || article.title?.fr || "Sénégal, futur hub gazier d’Afrique de l’Ouest : Quels dividendes ?"}
                                  </Link>
                                </div>
                              ))
                          ) : (
                            <p className="text-[10.5px] text-white dark:text-white italic py-4 font-serif">
                              {language === "fr" ? "Aucun rapport enregistré pour le moment." : "No bookmarked articles saved."}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Public Comments Tracker */}
                      <div className="space-y-3 pt-2">
                        <span className="text-[9.5px] font-mono font-bold uppercase text-zinc-900 dark:text-zinc-100 tracking-widest flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                          <MessageSquare size={12} style={{ color: currentSettings?.accentColor }} />
                          <span>{language === "fr" ? "Historique de vos Déclarations" : "Your Public Comments"}</span>
                        </span>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {comments && comments.filter(c => c.email?.toLowerCase() === readerProfile.email?.toLowerCase()).length > 0 ? (
                            comments
                              .filter(c => c.email?.toLowerCase() === readerProfile.email?.toLowerCase())
                              .map((comment) => (
                                <div key={comment.id} className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-left">
                                  <div className="flex justify-between items-center text-[8.5px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                                    <span className="truncate pr-2 max-w-[200px] font-bold text-zinc-900 dark:text-zinc-100">{comment.articleTitle}</span>
                                    <span className={`font-black ${comment.isApproved ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
                                      {comment.isApproved ? (language === "fr" ? "APPROUVÉ" : "APPROVED") : (language === "fr" ? "EN AUDIT" : "UNDER AUDIT")}
                                    </span>
                                  </div>
                                  <p className="text-[11.5px] text-zinc-800 dark:text-zinc-200 font-serif italic leading-relaxed">
                                    "{comment.text}"
                                  </p>
                                </div>
                              ))
                          ) : (
                            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 italic py-4 font-serif">
                              {language === "fr" ? "Vous n'avez publié aucun commentaire." : "No public comments logged from this account."}
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* VIEW: MESSAGES (FACEBOOK MESSENGER STYLE) */}
                  {activeSubMenu === "messages" && (
                    <div className="flex flex-col h-[530px] text-left font-sans bg-white dark:bg-zinc-950">
                      
                      {/* Messenger Top Bar & Search */}
                      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/60 shrink-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-7 h-7 rounded-full text-white flex items-center justify-center shadow-xs"
                              style={{ backgroundColor: currentSettings?.accentColor || "#E85D42" }}
                            >
                              <MessageCircle size={15} />
                            </div>
                            <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                              {language === "fr" ? "Messenger" : "Messages"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('open-floating-chat', { detail: { email: selectedChatUser } }));
                                setShowProfileModal(false);
                              }}
                              className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-[#E85D42] text-[9.5px] font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1"
                              title={language === "fr" ? "Ouvrir la bulle flottante Messenger" : "Open floating Messenger tab"}
                            >
                              💬 {language === "fr" ? "Bulle" : "Floating"}
                            </button>
                            <button
                              onClick={() => {
                                navigate('/discussion');
                                setShowProfileModal(false);
                              }}
                              className="px-2 py-1 bg-[#E85D42] hover:bg-[#d04a30] text-white text-[9.5px] font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                              title={language === "fr" ? "Ouvrir la page de discussion complète" : "Open full discussion page"}
                            >
                              ↗ {language === "fr" ? "Plein Écran" : "Full Page"}
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                            <Search size={13} />
                          </span>
                          <input
                            type="text"
                            value={chatSearchTerm}
                            onChange={(e) => setChatSearchTerm(e.target.value)}
                            placeholder={language === "fr" ? "Rechercher dans Messenger..." : "Search Messenger..."}
                            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full focus:outline-none focus:border-[#E85D42] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                          />
                          {chatSearchTerm && (
                            <button
                              onClick={() => setChatSearchTerm("")}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer border-none bg-transparent"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Messenger Active Contacts Carousel / List */}
                      <div className="px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex gap-3 overflow-x-auto shrink-0 select-none scrollbar-none items-center">
                        {(() => {
                          const myEmail = readerProfile?.email?.toLowerCase().trim() || "";
                          const contactMap = new Map<string, { email: string; name: string; avatarUrl?: string; role?: string }>();

                          // Only add friends to direct message contacts
                          (allUsers || []).forEach(u => {
                            const emailLow = u.email.toLowerCase().trim();
                            if (emailLow && emailLow !== myEmail && friendsList.includes(emailLow)) {
                              contactMap.set(emailLow, {
                                email: u.email,
                                name: u.name || emailLow.split("@")[0],
                                avatarUrl: u.avatarUrl,
                                role: u.role || "Member"
                              });
                            }
                          });

                          const rawContacts = Array.from(contactMap.values());

                          const filtered = rawContacts.filter(c =>
                            c.name.toLowerCase().includes(chatSearchTerm.toLowerCase()) ||
                            c.email.toLowerCase().includes(chatSearchTerm.toLowerCase()) ||
                            (c.role || "").toLowerCase().includes(chatSearchTerm.toLowerCase())
                          );

                          if (filtered.length === 0) {
                            return (
                              <div className="py-2 px-2 flex flex-col items-center justify-center text-center w-full gap-1">
                                <p className="text-xs text-zinc-500 italic">
                                  {language === "fr" ? "Aucun contact trouvé" : "No contacts found"}
                                </p>
                              </div>
                            );
                          }

                          return filtered.map((contact) => {
                            const isSelected = selectedChatUser === contact.email;
                            const firstName = contact.name.split(" ")[0];
                            const brandAccent = currentSettings?.accentColor || "#E85D42";

                            return (
                              <button
                                key={contact.email}
                                onClick={() => {
                                  setSelectedChatUser(contact.email);
                                  setAttachedMaterialType("none");
                                  setAttachedMaterialId("");
                                }}
                                className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group border-none bg-transparent"
                              >
                                <div 
                                  className={`relative w-11 h-11 rounded-full p-[2px] transition-all ${
                                    isSelected 
                                      ? "scale-105 shadow-xs" 
                                      : "hover:scale-105"
                                  }`}
                                  style={isSelected ? { backgroundColor: brandAccent } : {}}
                                >
                                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-white dark:border-zinc-950">
                                    {renderNeutralAvatar(contact.avatarUrl, contact.name, 42)}
                                  </div>
                                  <span className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-950 absolute bottom-0 right-0 z-10" />
                                </div>
                                <span 
                                  className={`text-[10px] truncate max-w-[56px] ${isSelected ? "font-bold" : "text-zinc-700 dark:text-zinc-300"}`}
                                  style={isSelected ? { color: brandAccent } : {}}
                                >
                                  {firstName}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>

                      {/* Active Conversation Header */}
                      {(() => {
                        const activeContact = allUsers.find(u => u.email.toLowerCase().trim() === selectedChatUser.toLowerCase().trim())
                          || { email: selectedChatUser, name: selectedChatUser.split("@")[0], role: "Member", avatarUrl: "preset-male" };

                        return (
                          <div className="px-4 py-2 bg-zinc-50/80 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shrink-0">
                                {renderNeutralAvatar(activeContact.avatarUrl, activeContact.name, 32)}
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 absolute bottom-0 right-0 z-10" />
                              </div>
                              <div className="flex flex-col text-left min-w-0">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white leading-none truncate">
                                  {activeContact.name}
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 truncate flex items-center gap-1 font-medium">
                                  {language === "fr" ? "En ligne sur Messenger" : "Active on Messenger"}
                                </span>
                              </div>
                            </div>
                            
                            <Link
                              to={`/profile/${encodeURIComponent(activeContact.email)}`}
                              onClick={() => useStore.setState({ showProfileDrawer: false })}
                              className="px-2.5 py-1 text-[10px] font-medium bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full transition-colors flex items-center gap-1 no-underline"
                            >
                              <span>{language === "fr" ? "Profil" : "Profile"}</span>
                              <ExternalLink size={10} />
                            </Link>
                          </div>
                        );
                      })()}

                      {/* Chat Messages Body (Messenger Speech Bubbles) */}
                      <div className="flex-grow overflow-y-auto p-4 space-y-2.5 bg-zinc-50/40 dark:bg-zinc-950/80 scrollbar-thin">
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
                              const isLikeEmoji = dm.text === "👍";
                              const activeContact = allUsers.find(u => u.email.toLowerCase().trim() === selectedChatUser.toLowerCase().trim());

                              return (
                                <div key={dm.id} className={`flex items-end gap-2 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto flex-row"}`}>
                                  {!isMe && (
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 mb-1">
                                      {renderNeutralAvatar(activeContact?.avatarUrl, activeContact?.name || "User", 24)}
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-col">
                                    {isLikeEmoji ? (
                                      <div className="text-3xl py-1 px-2 animate-bounce">👍</div>
                                    ) : (
                                      <div 
                                        className={`px-3.5 py-2 text-xs leading-relaxed transition-all shadow-xs ${
                                          isMe
                                            ? "text-white rounded-2xl rounded-br-xs"
                                            : "bg-zinc-200/90 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-bl-xs"
                                        }`}
                                        style={isMe ? { backgroundColor: currentSettings?.accentColor || "#E85D42" } : {}}
                                      >
                                        <p className="whitespace-pre-line font-sans">{dm.text}</p>
                                        
                                        {/* Attachment Preview Card */}
                                        {dm.attachment && (
                                          <SharedItemCard attachment={dm.attachment} compact />
                                        )}
                                      </div>
                                    )}
                                    <span className={`text-[8.5px] text-zinc-400 mt-0.5 px-1 ${isMe ? "text-right" : "text-left"}`}>
                                      {dm.date || "Aujourd'hui"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-zinc-400">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center"
                              style={{ 
                                backgroundColor: (currentSettings?.accentColor || "#E85D42") + "15", 
                                color: currentSettings?.accentColor || "#E85D42" 
                              }}
                            >
                              <MessageCircle size={24} />
                            </div>
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                              {language === "fr" ? "Démarrer la discussion" : "Start a Conversation"}
                            </p>
                            <p className="text-[11px] text-zinc-500 max-w-[220px]">
                              {language === "fr" 
                                ? "Envoyez un message pour discuter en direct avec ce membre." 
                                : "Send a message to connect with this member directly."}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Messenger Input Bar */}
                      <div className="p-2.5 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!newMessageText.trim()) return;

                            sendDirectMessage({
                              sender: readerProfile.email,
                              receiver: selectedChatUser,
                              text: newMessageText.trim(),
                            });

                            setNewMessageText("");
                          }}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => setShowInternalShareModal(true)}
                            title={language === "fr" ? "Partager un contenu interne" : "Share internal intel"}
                            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer shrink-0"
                          >
                            <Share2 size={16} />
                          </button>

                          <input
                            type="text"
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            placeholder={language === "fr" ? "Écrire un message..." : "Type a message..."}
                            className="flex-grow bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 px-4 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#E85D42] rounded-full font-sans"
                          />

                          {newMessageText.trim() ? (
                            <button
                              type="submit"
                              className="w-8 h-8 rounded-full text-white flex items-center justify-center transition-transform hover:scale-105 cursor-pointer border-none shrink-0 shadow-xs"
                              style={{ backgroundColor: currentSettings?.accentColor || "#E85D42" }}
                            >
                              <Send size={14} className="ml-0.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                sendDirectMessage({
                                  sender: readerProfile.email,
                                  receiver: selectedChatUser,
                                  text: "👍",
                                });
                              }}
                              title="J'aime"
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer border-none shrink-0"
                              style={{ color: currentSettings?.accentColor || "#E85D42" }}
                            >
                              <ThumbsUp size={18} />
                            </button>
                          )}
                        </form>
                      </div>

                    </div>
                  )}

                  {/* VIEW: OFFLINE CACHE MIRROR */}
                  {activeSubMenu === "offline" && (
                    <div className="space-y-5 text-left font-mono">
                      
                      <div className="space-y-3">
                        {/* Offline Sync Switch */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-none flex items-center justify-between text-zinc-900 dark:text-zinc-100">
                          <div className="text-left pr-3">
                            <span className="text-[10px] font-bold uppercase block tracking-wider">{language === "fr" ? "Synchronisation Locale" : "Local Database Sync"}</span>
                            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-serif">{language === "fr" ? "Mémorise automatiquement les articles pour une lecture hors-ligne." : "Mirror dispatches into local indexed DB for offline reading."}</p>
                          </div>
                          <button
                            onClick={() => {
                              setOfflineEnabled(!offlineEnabled);
                              setSettingsSuccessMsg(
                                !offlineEnabled
                                  ? (language === "fr" ? "✓ Synchro locale activée !" : "✓ Local database sync enabled!")
                                  : (language === "fr" ? "✓ Synchro locale désactivée" : "✓ Local database sync disabled")
                              );
                              setTimeout(() => setSettingsSuccessMsg(""), 3000);
                            }}
                            className={`w-11 h-6 rounded-none p-0.5 transition-colors cursor-pointer border ${offlineEnabled ? "bg-emerald-600 border-emerald-600" : "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"}`}
                          >
                            <div className={`w-4 h-4 bg-white transition-transform ${offlineEnabled ? "transform translate-x-5" : ""}`} />
                          </button>
                        </div>

                        {/* Low Bandwidth Mode */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-none flex items-center justify-between text-zinc-900 dark:text-zinc-100">
                          <div className="text-left pr-3">
                            <span className="text-[10px] font-bold uppercase block tracking-wider">{language === "fr" ? "Économiseur de Données" : "Data Saver Mode"}</span>
                            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-serif">{language === "fr" ? "N'affiche que le texte et désactive le chargement lourd des visuels." : "Omit heavy illustrations and high-res images on low network speeds."}</p>
                          </div>
                          <button
                            onClick={() => {
                              setDataSaverEnabled(!dataSaverEnabled);
                              setSettingsSuccessMsg(
                                !dataSaverEnabled
                                  ? (language === "fr" ? "✓ Économiseur activé !" : "✓ Data saver enabled!")
                                  : (language === "fr" ? "✓ Économiseur désactivé" : "✓ Data saver disabled")
                              );
                              setTimeout(() => setSettingsSuccessMsg(""), 3000);
                            }}
                            className={`w-11 h-6 rounded-none p-0.5 transition-colors cursor-pointer border ${dataSaverEnabled ? "bg-emerald-600 border-emerald-600" : "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"}`}
                          >
                            <div className={`w-4 h-4 bg-white transition-transform ${dataSaverEnabled ? "transform translate-x-5" : ""}`} />
                          </button>
                        </div>
                      </div>

                      {/* Client Cache Purge Box */}
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2 text-[9px]">
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold uppercase block tracking-wider mb-2">{language === "fr" ? "Empreinte Disque Navigateur" : "Indexed Cache Footprint"}</span>
                        <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
                          <span className="text-zinc-500">CACHE SIZE:</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">142 KB / 512 MB</span>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(language === "fr" ? "Vider tout le cache local ?" : "Wipe local client cache?")) {
                              setSettingsSuccessMsg(language === "fr" ? "✓ Cache client vidé" : "✓ Local client cache purged");
                              setTimeout(() => setSettingsSuccessMsg(""), 3000);
                            }
                          }}
                          className="w-full mt-3 text-center bg-rose-600 hover:bg-rose-700 text-white text-[8.5px] py-2 font-bold uppercase tracking-wider rounded-none cursor-pointer border-none"
                        >
                          {language === "fr" ? "PURGER LE CACHE CLIENT" : "PURGE LOCAL CACHE"}
                        </button>
                      </div>

                    </div>
                  )}

                  {/* VIEW: CONNECTIONS & PROFILE SETTINGS */}
                  {(activeSubMenu === "connections" || activeSubMenu === "settings") && (
                    <ConnectionsAndProfile
                      activeSubMenu={activeSubMenu}
                      setActiveSubMenu={setActiveSubMenu}
                      readerProfile={readerProfile}
                      setReaderProfile={setReaderProfile}
                      allUsers={allUsers}
                      articles={articles}
                      savedArticles={savedArticles}
                      toggleSavedArticle={toggleSavedArticle}
                      language={language}
                      currentSettings={currentSettings}
                      theme={theme}
                      friendsList={friendsList}
                      friendRequests={friendRequests}
                      sentRequests={sentRequests}
                      toggleFriend={toggleFriend}
                      networkSearchQuery={networkSearchQuery}
                      setNetworkSearchQuery={setNetworkSearchQuery}
                      selectedUserForDetail={selectedUserForDetail}
                      setSelectedUserForDetail={setSelectedUserForDetail}
                      settingsSuccessMsg={settingsSuccessMsg}
                      setSettingsSuccessMsg={setSettingsSuccessMsg}
                      emailVerified={emailVerified}
                      setEmailVerified={setEmailVerified}
                      securityPinInput={securityPinInput}
                      setSecurityPinInput={setSecurityPinInput}
                      securityOtpInput={securityOtpInput}
                      setSecurityOtpInput={setSecurityOtpInput}
                      sentCode={sentCode}
                      setSentCode={setSentCode}
                      securityError={securityError}
                      setSecurityError={setSecurityError}
                      newPasswordInput={newPasswordInput}
                      setNewPasswordInput={setNewPasswordInput}
                      confirmPasswordInput={confirmPasswordInput}
                      setConfirmPasswordInput={setConfirmPasswordInput}
                      newPinInput={newPinInput}
                      setNewPinInput={setNewPinInput}
                      passwordChangeSuccess={passwordChangeSuccess}
                      setPasswordChangeSuccess={setPasswordChangeSuccess}
                      passwordChangeError={passwordChangeError}
                      setPasswordChangeError={setPasswordChangeError}
                      updateUserSecurity={updateUserSecurity}
                      updateUserPassword={updateUserPassword}
                      updateUserPin={updateUserPin}
                      syncProfileToFirestore={syncProfileToFirestore}
                      editName={editName}
                      setEditName={setEditName}
                      editAvatar={editAvatar}
                      setEditAvatar={setEditAvatar}
                      avatarOptions={avatarOptions}
                      renderNeutralAvatar={renderNeutralAvatar}
                      isAdmin={isAdmin}
                      setSelectedChatUser={setSelectedChatUser}
                      setShowProfileModal={setShowProfileModal}
                    />
                  )}

                </motion.div>
              </AnimatePresence>

            </div>

            {/* Footer Bar */}
            <div className="p-4 border-t border-zinc-300/40 dark:border-zinc-800/40 bg-white/30 dark:bg-black/30 backdrop-blur-md flex justify-between items-center shrink-0 select-none">
              {isAdmin ? (
                <Link
                  to="/admin"
                  onClick={() => setShowProfileModal(false)}
                  className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E85D42] hover:underline transition-colors cursor-pointer flex items-center gap-1.5"
                  style={{ color: currentSettings?.accentColor }}
                >
                  <Shield size={12} />
                  <span>{language === "fr" ? "Administration" : "Admin Panel"}</span>
                </Link>
              ) : (
                <span className="text-[9px] font-mono text-zinc-400">
                  {language === "fr" ? "Perspective Group" : "Perspective Group"}
                </span>
              )}
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-xs font-mono font-black uppercase tracking-widest text-white dark:text-zinc-900 transition-colors cursor-pointer rounded-none border-none shadow-xs"
                style={{ backgroundColor: currentSettings?.accentColor }}
              >
                {language === "fr" ? "FERMER" : "CLOSE PORTAL"}
              </button>
            </div>

            <InternalShareModal
              isOpen={showInternalShareModal}
              onClose={() => setShowInternalShareModal(false)}
            />

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
