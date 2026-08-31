import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { compressImageFile } from "../lib/imageUtils";
import { db, doc, deleteDoc } from "../lib/mongodb";
import { 
  Search, 
  X, 
  Users, 
  UserPlus, 
  UserMinus, 
  Eye, 
  EyeOff, 
  Camera, 
  Flame, 
  Clock, 
  Lock, 
  Shield, 
  ShieldCheck,
  ChevronRight,
  Database,
  Crown,
  Sparkles,
  Trophy,
  ArrowLeft,
  MessageSquare,
  Bookmark,
  FileText
} from "lucide-react";

const ACCOLADES_DEFS = [
  {
    id: "verified_identity",
    icon: (size: number) => <ShieldCheck size={size} className="text-emerald-500 shrink-0" />,
    title: { fr: "Compte Vérifié", en: "Verified Account" },
    desc: { fr: "Identité et e-mail vérifiés sur la plateforme", en: "Verified email and account" }
  },
  {
    id: "deep_reader",
    icon: (size: number) => <Clock size={size} className="text-amber-500 shrink-0" />,
    title: { fr: "Grand Lecteur", en: "Avid Reader" },
    desc: { fr: "+120 minutes de lecture accumulées", en: "Over 120 total minutes spent reading" }
  },
  {
    id: "daily_devoted",
    icon: (size: number) => <Flame size={size} className="text-orange-500 shrink-0" />,
    title: { fr: "Lecteur Quotidien", en: "Daily Reader" },
    desc: { fr: "Série de lecture active de 5 jours ou +", en: "Active reading streak of 5+ days" }
  },
  {
    id: "security_pioneer",
    icon: (size: number) => <Lock size={size} className="text-blue-500 shrink-0" />,
    title: { fr: "Compte Sécurisé", en: "Secure Account" },
    desc: { fr: "Code PIN de sécurité activé", en: "PIN security protection active" }
  },
  {
    id: "elite_clearance",
    icon: (size: number) => <Crown size={size} className="text-amber-600 shrink-0" />,
    title: { fr: "Administrateur", en: "Administrator" },
    desc: { fr: "Membre de l'équipe de gestion du site", en: "Site management team member" }
  },
  {
    id: "veteran_analyst",
    icon: (size: number) => <Trophy size={size} className="text-indigo-500 shrink-0" />,
    title: { fr: "Membre Connecté", en: "Connected Member" },
    desc: { fr: "Réseau d'amis et abonnés établi", en: "Established network of connections" }
  },
  {
    id: "sahel_insider",
    icon: (size: number) => <Sparkles size={size} className="text-purple-500 shrink-0" />,
    title: { fr: "Profil Complet", en: "Complete Profile" },
    desc: { fr: "Photo et biographie personnalisées", en: "Custom photo and bio set up" }
  }
];

interface ConnectionsAndProfileProps {
  activeSubMenu: string;
  setActiveSubMenu: (val: string) => void;
  readerProfile: any;
  setReaderProfile: (p: any) => void;
  allUsers: any[];
  articles: any[];
  savedArticles: string[];
  toggleSavedArticle: (id: string) => void;
  language: "fr" | "en";
  currentSettings: any;
  theme: string;
  friendsList: string[];
  friendRequests?: string[];
  sentRequests?: string[];
  toggleFriend: (email: string) => Promise<void>;
  networkSearchQuery: string;
  setNetworkSearchQuery: (val: string) => void;
  selectedUserForDetail: any;
  setSelectedUserForDetail: (val: any) => void;
  settingsSuccessMsg: string;
  setSettingsSuccessMsg: (msg: string) => void;
  emailVerified: boolean;
  setEmailVerified: (v: boolean) => void;
  securityPinInput: string;
  setSecurityPinInput: (v: string) => void;
  securityOtpInput: string;
  setSecurityOtpInput: (v: string) => void;
  sentCode: string | null;
  setSentCode: (v: string | null) => void;
  securityError: string;
  setSecurityError: (v: string) => void;
  newPasswordInput: string;
  setNewPasswordInput: (v: string) => void;
  confirmPasswordInput: string;
  setConfirmPasswordInput: (v: string) => void;
  newPinInput: string;
  setNewPinInput: (v: string) => void;
  passwordChangeSuccess: string;
  setPasswordChangeSuccess: (v: string) => void;
  passwordChangeError: string;
  setPasswordChangeError: (v: string) => void;
  updateUserSecurity: any;
  updateUserPassword: any;
  updateUserPin: any;
  syncProfileToFirestore: (fields: any) => Promise<void>;
  editName: string;
  setEditName: (v: string) => void;
  editAvatar: string;
  setEditAvatar: (v: string) => void;
  avatarOptions: any[];
  renderNeutralAvatar: (url: string, name: string, size: number) => React.ReactNode;
  isAdmin: boolean;
  setSelectedChatUser?: (email: string) => void; // Optional to prevent compilation issues
  setShowProfileModal?: (val: boolean) => void;
}

export const ConnectionsAndProfile: React.FC<ConnectionsAndProfileProps> = ({
  activeSubMenu,
  setActiveSubMenu,
  readerProfile,
  setReaderProfile,
  allUsers,
  articles,
  savedArticles,
  toggleSavedArticle,
  language,
  currentSettings,
  theme,
  friendsList,
  friendRequests = [],
  sentRequests = [],
  toggleFriend,
  networkSearchQuery,
  setNetworkSearchQuery,
  selectedUserForDetail,
  setSelectedUserForDetail,
  settingsSuccessMsg,
  setSettingsSuccessMsg,
  emailVerified,
  setEmailVerified,
  securityPinInput,
  setSecurityPinInput,
  securityOtpInput,
  setSecurityOtpInput,
  sentCode,
  setSentCode,
  securityError,
  setSecurityError,
  newPasswordInput,
  setNewPasswordInput,
  confirmPasswordInput,
  setConfirmPasswordInput,
  newPinInput,
  setNewPinInput,
  passwordChangeSuccess,
  setPasswordChangeSuccess,
  passwordChangeError,
  setPasswordChangeError,
  updateUserSecurity,
  updateUserPassword,
  updateUserPin,
  syncProfileToFirestore,
  editName,
  setEditName,
  editAvatar,
  setEditAvatar,
  avatarOptions,
  renderNeutralAvatar,
  isAdmin,
  setSelectedChatUser,
  setShowProfileModal,
}) => {
  const { deleteUser } = useStore();
  const [isUploading, setIsUploading] = useState(false);
  const [editBio, setEditBio] = useState(readerProfile?.bio || "");
  const [showSecurityPinInput, setShowSecurityPinInput] = useState(false);
  const [confirmDeleteSelf, setConfirmDeleteSelf] = useState(false);

  React.useEffect(() => {
    if (readerProfile?.bio !== undefined) {
      setEditBio(readerProfile.bio);
    }
  }, [readerProfile?.bio]);

  // Dynamically calculate our own earned accolades
  const myEarnedAccolades: string[] = ["verified_identity"];
  if ((readerProfile?.readingTime || 0) >= 120) myEarnedAccolades.push("deep_reader");
  if ((readerProfile?.streak || 0) >= 5) myEarnedAccolades.push("daily_devoted");
  if (readerProfile?.mfaEnabled) myEarnedAccolades.push("security_pioneer");
  if (readerProfile?.role === "Admin") myEarnedAccolades.push("elite_clearance");
  if (friendsList && friendsList.length > 0) myEarnedAccolades.push("veteran_analyst");
  if (readerProfile?.bio && readerProfile?.bio.trim().length > 5) myEarnedAccolades.push("sahel_insider");

  // Format custom avatar upload from device
  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const dataUrl = await compressImageFile(file, 400, 400, 0.75);
        setReaderProfile({ ...readerProfile, avatarUrl: dataUrl });
        await syncProfileToFirestore({ avatarUrl: dataUrl });
        setEditAvatar(dataUrl);
        setSettingsSuccessMsg(language === "fr" ? "✓ Photo de profil mise à jour !" : "✓ Profile photo updated!");
        setTimeout(() => setSettingsSuccessMsg(""), 3000);
      } catch (err) {
        console.error("Failed to compress avatar upload:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <>
      {/* VIEW: CONNECTIONS (NETWORK & DISCOVERY) */}
      {activeSubMenu === "connections" && (
        selectedUserForDetail ? (
          /* DETAILED OTHER USER VIEW */
          <div className="flex flex-col h-[520px] text-left font-serif overflow-y-auto scrollbar-thin">
            {/* Header banner back to network */}
            <div className="px-3 py-2 bg-brand-soft/20 border-b border-brand-border/10 flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="flex items-center gap-1.5 text-[9.5px] font-mono font-black uppercase tracking-wider text-brand-dark hover:opacity-85 cursor-pointer bg-transparent border-none"
              >
                <ArrowLeft size={12} style={{ color: currentSettings.accentColor }} />
                <span>{language === "fr" ? "Retour au Réseau" : "Back to Network"}</span>
              </button>
              
              <div className="flex gap-2">
                {/* Toggle Friend Action inside Detailed profile */}
                <button
                  onClick={() => toggleFriend(selectedUserForDetail.email)}
                  className="px-2.5 py-1 text-[8px] font-mono font-bold uppercase tracking-wider border rounded-none cursor-pointer transition-all bg-transparent"
                  style={{
                    color: friendsList.includes(selectedUserForDetail.email.toLowerCase().trim()) ? "#e11d48" : currentSettings.accentColor,
                    borderColor: friendsList.includes(selectedUserForDetail.email.toLowerCase().trim()) ? "rgba(225, 29, 72, 0.3)" : `${currentSettings.accentColor}30`
                  }}
                >
                  {(() => {
                    const email = selectedUserForDetail.email.toLowerCase().trim();
                    if (friendsList.includes(email)) return language === "fr" ? "Retirer Ami" : "Remove Friend";
                    if (sentRequests.includes(email)) return language === "fr" ? "Annuler Demande" : "Cancel Request";
                    if (friendRequests.includes(email)) return language === "fr" ? "Accepter" : "Accept Request";
                    return language === "fr" ? "Ajouter Ami" : "Add Friend";
                  })()}
                </button>

                {/* Direct Secure Chat Button */}
                {setSelectedChatUser && (
                  <button
                    onClick={() => {
                      setSelectedChatUser(selectedUserForDetail.email);
                      setActiveSubMenu("messages");
                      setSelectedUserForDetail(null);
                    }}
                    className="px-2.5 py-1 text-[8.5px] font-mono font-black uppercase tracking-wider text-white rounded-none cursor-pointer hover:opacity-90 transition-opacity border-none flex items-center gap-1"
                    style={{ backgroundColor: currentSettings.accentColor }}
                  >
                    <MessageSquare size={10} />
                    <span>{language === "fr" ? "Message" : "Message"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile banner & Cover photo */}
            <div className="relative border-b border-brand-border/15 bg-brand-white dark:bg-zinc-900/30 overflow-hidden">
              <div className="h-28 w-full bg-brand-soft overflow-hidden relative">
                <img 
                  src={selectedUserForDetail.coverPhotoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop"} 
                  className="w-full h-full object-cover" 
                  alt="cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
              </div>

              {/* Avatar overlay */}
              <div className="px-4 pb-3 pt-1 flex items-start gap-4 relative">
                <div className="w-16 h-16 border-2 border-brand-white bg-brand-white overflow-hidden shrink-0 -mt-8 relative z-10 shadow-md">
                  {renderNeutralAvatar(selectedUserForDetail.avatarUrl, selectedUserForDetail.name, 64)}
                </div>

                <div className="min-w-0 flex-grow mt-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 className="text-sm font-black tracking-tight text-brand-dark dark:text-zinc-100 leading-none truncate max-w-[180px]">
                      {selectedUserForDetail.name}
                    </h4>
                    <span 
                      className="text-[7.5px] font-mono font-black tracking-widest uppercase px-1.5 py-0.5 text-white leading-none shrink-0"
                      style={{ backgroundColor: currentSettings.accentColor }}
                    >
                      {selectedUserForDetail.role || "Member"}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-brand-muted truncate mt-1">
                    {(selectedUserForDetail.hideEmail || selectedUserForDetail.hidePersonalInfo) && selectedUserForDetail.email.toLowerCase() !== readerProfile?.email.toLowerCase()
                      ? (language === "fr" ? "••••••••@••••.com (E-mail masqué)" : "••••••••@••••.com (Hidden email)")
                      : selectedUserForDetail.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-5">
              {/* Bio block */}
              <div className="space-y-1 bg-brand-soft/10 border border-brand-border/20 p-3.5">
                <span className="text-[8.5px] font-mono uppercase text-brand-muted block tracking-wider font-bold">
                  {language === "fr" ? "BIOGRAPHIE ET PARCOURS" : "BIOGRAPHY & DEPLOYMENT"}
                </span>
                <p className="text-xs text-brand-dark dark:text-zinc-200 italic font-medium leading-relaxed font-serif">
                  {selectedUserForDetail.bio || (language === "fr" ? "Aucune description renseignée." : "No description declared yet.")}
                </p>
              </div>

              {/* Private Check */}
              {selectedUserForDetail.hidePersonalInfo ? (
                <div className="p-6 border border-rose-500/15 bg-rose-500/5 text-center flex flex-col items-center justify-center gap-2">
                  <Lock size={20} className="text-rose-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-rose-600">
                    {language === "fr" ? "PROFIL ARCHIVÉ ET PRIVÉ" : "SECURED & PRIVATE DOSSIER"}
                  </span>
                  <p className="text-[10px] text-brand-muted font-medium leading-relaxed font-serif max-w-[220px]">
                    {language === "fr" 
                      ? "Ce membre a verrouillé son espace personnel. Les statistiques et dossiers sauvegardés sont inaccessibles."
                      : "This member has locked their personal space. Analytics and favorites are restricted."}
                  </p>
                </div>
              ) : (
                /* Public profile stats, accolades and bookmarks */
                <div className="space-y-5">
                  {/* Stats & Streak row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 border border-zinc-800 bg-zinc-950 dark:bg-zinc-900 text-white shadow-sm rounded-none">
                      <span className="text-[8.5px] font-mono text-amber-400 uppercase block tracking-wider font-black">{language === "fr" ? "SÉRIE DE LECTURE" : "DAILY STREAK"}</span>
                      <p className="text-xl font-serif font-black text-white flex items-center gap-1.5 mt-1">
                        <span>{selectedUserForDetail.streak || 5}</span>
                        <Flame size={16} className="text-orange-500 shrink-0" />
                      </p>
                    </div>

                    <div className="p-3.5 border border-zinc-800 bg-zinc-950 dark:bg-zinc-900 text-white shadow-sm rounded-none">
                      <span className="text-[8.5px] font-mono text-amber-400 uppercase block tracking-wider font-black">{language === "fr" ? "TEMPS DE LECTURE" : "TIME READ"}</span>
                      <p className="text-xl font-serif font-black text-white flex items-center gap-1.5 mt-1">
                        <span>{selectedUserForDetail.readingTime || 120} m</span>
                        <Clock size={16} className="text-amber-400 shrink-0" />
                      </p>
                    </div>
                  </div>

                  {/* Accolades of selected user */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-brand-muted uppercase block tracking-wider font-black border-b border-brand-border/15 pb-1">
                      {language === "fr" ? "BADGES ET DISTINCTIONS" : "BADGES & CERTIFICATES"}
                    </span>
                    
                    {(() => {
                      const detailsEarnedAccolades: string[] = ["verified_identity"];
                      if ((selectedUserForDetail.readingTime || 0) >= 120) detailsEarnedAccolades.push("deep_reader");
                      if ((selectedUserForDetail.streak || 0) >= 5) detailsEarnedAccolades.push("daily_devoted");
                      if (selectedUserForDetail.mfaEnabled || selectedUserForDetail.mfaActive) detailsEarnedAccolades.push("security_pioneer");
                      if (selectedUserForDetail.role === "Admin") detailsEarnedAccolades.push("elite_clearance");
                      if (selectedUserForDetail.friendsCount || (selectedUserForDetail.email && selectedUserForDetail.email.length % 2 === 0)) detailsEarnedAccolades.push("veteran_analyst");
                      if (selectedUserForDetail.bio && selectedUserForDetail.bio.trim().length > 5) detailsEarnedAccolades.push("sahel_insider");

                      return (
                        <div className="grid grid-cols-1 gap-2.5">
                          {ACCOLADES_DEFS.map((acc) => {
                            const hasAcc = detailsEarnedAccolades.includes(acc.id);
                            return (
                              <div 
                                key={acc.id}
                                className={`p-2 border flex items-center gap-3 transition-colors ${
                                  hasAcc 
                                    ? "bg-brand-white dark:bg-zinc-900 border-brand-border/30" 
                                    : "bg-brand-soft/5 border-transparent opacity-45"
                                }`}
                              >
                                <div className={`p-1.5 rounded-none ${hasAcc ? "bg-brand-soft/35" : "bg-transparent grayscale"}`}>
                                  {acc.icon(15)}
                                </div>
                                <div className="text-left min-w-0 flex-1">
                                  <p className={`text-[10px] font-bold leading-none ${hasAcc ? "text-brand-dark dark:text-zinc-100" : "text-brand-muted font-mono"}`}>
                                    {acc.title[language]} {!hasAcc && "🔒"}
                                  </p>
                                  <p className="text-[8.5px] text-brand-muted font-serif truncate mt-0.5 leading-tight">
                                    {acc.desc[language]}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bookmarks shared */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-brand-muted uppercase block tracking-wider font-black border-b border-brand-border/15 pb-1">
                      {language === "fr" ? "RAPPORT ET LECTURES FAVORITES" : "PUBLIC BOOKMARKS"}
                    </span>
                    <p className="text-[9.5px] italic text-brand-muted font-serif py-1">
                      {language === "fr" 
                        ? `${selectedUserForDetail.name} partage les mêmes dossiers confidentiels du Sahel.` 
                        : `${selectedUserForDetail.name} shares access to standard Sahel reports.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STANDARD DISCOVERY & MEMBERS SEARCH */
          <div className="flex flex-col h-[520px] text-left font-serif">
            {/* Search contacts bar */}
            <div className="px-3.5 py-2.5 border-b border-brand-border/15 bg-brand-soft/20 flex flex-col gap-1.5 shrink-0">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-brand-muted">
                  <Search size={13} className="opacity-75" />
                </span>
                <input
                  type="text"
                  value={networkSearchQuery}
                  onChange={(e) => setNetworkSearchQuery(e.target.value)}
                  placeholder={language === "fr" ? "Rechercher des membres..." : "Search members..."}
                  className="w-full pl-9 pr-8 py-2 text-[11px] bg-brand-white dark:bg-zinc-900 border border-brand-border/30 dark:border-zinc-800 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark/20 focus:outline-none rounded-none font-sans transition-all text-brand-dark dark:text-zinc-200"
                />
                {networkSearchQuery && (
                  <button
                    onClick={() => setNetworkSearchQuery("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-brand-muted hover:text-brand-dark cursor-pointer border-none bg-transparent"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Network Members List */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-brand-soft/5 dark:bg-zinc-950/20 scrollbar-thin">
              {(() => {
                const myEmail = readerProfile?.email?.toLowerCase().trim() || "";
                // Filter out self
                const members = allUsers.filter(u => u.email.toLowerCase().trim() !== myEmail);
                const filteredMembers = members.filter(m => 
                  m.name.toLowerCase().includes(networkSearchQuery.toLowerCase()) ||
                  m.email.toLowerCase().includes(networkSearchQuery.toLowerCase()) ||
                  (m.role || "").toLowerCase().includes(networkSearchQuery.toLowerCase())
                );

                if (filteredMembers.length === 0) {
                  return (
                    <div className="py-12 text-center text-brand-muted italic font-serif">
                      {language === "fr" ? "Aucun membre trouvé." : "No members found."}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredMembers.map((member) => {
                      const isFriend = friendsList.includes(member.email.toLowerCase().trim());
                      const memberCover = member.coverPhotoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&fit=crop";
                      
                      return (
                        <div 
                          key={member.email}
                          className="border border-brand-border/25 bg-brand-white dark:bg-zinc-900/40 relative overflow-hidden flex flex-col group rounded-none"
                        >
                          {/* Mini cover bar */}
                          <div className="h-10 w-full relative overflow-hidden bg-brand-soft">
                            <img src={memberCover} className="w-full h-full object-cover opacity-65" alt="cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                          </div>

                          {/* Body */}
                          <div className="p-3 flex items-start gap-3 relative">
                            {/* Avatar overlapping */}
                            <Link 
                              to={`/profile/${encodeURIComponent(member.email)}`}
                              onClick={() => { if (setShowProfileModal) setShowProfileModal(false); }}
                              className="w-10 h-10 border border-brand-white dark:border-zinc-900 bg-brand-white overflow-hidden shrink-0 -mt-6 relative z-10 shadow-xs hover:scale-105 transition-transform block"
                            >
                              {renderNeutralAvatar(member.avatarUrl, member.name, 40)}
                            </Link>

                            <div className="min-w-0 flex-grow text-left">
                              <Link
                                to={`/profile/${encodeURIComponent(member.email)}`}
                                onClick={() => { if (setShowProfileModal) setShowProfileModal(false); }}
                                className="text-xs font-serif font-black text-brand-dark dark:text-zinc-100 truncate hover:text-[#E85D42] hover:underline transition-colors flex items-center gap-1.5 leading-none mt-1 block"
                              >
                                {member.name}
                              </Link>
                              <p className="text-[9px] font-mono text-brand-muted truncate mt-0.5">
                                {(member.hideEmail || member.hidePersonalInfo) && member.email.toLowerCase() !== readerProfile?.email.toLowerCase()
                                  ? (language === "fr" ? "••••••••@••••.com (E-mail masqué)" : "••••••••@••••.com (Hidden email)")
                                  : member.email}
                              </p>
                              
                              {/* Badge and Friend action button */}
                              <div className="flex items-center gap-1.5 mt-2">
                                <span 
                                  className="text-[8px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 text-white animate-fade-in"
                                  style={{ backgroundColor: currentSettings.accentColor }}
                                >
                                  {member.role || "Member"}
                                </span>
                                {isFriend && (
                                  <span className="text-[8.5px] font-mono text-emerald-600 dark:text-emerald-400 font-black tracking-wider uppercase">
                                    ✓ {language === "fr" ? "AMI" : "FRIEND"}
                                  </span>
                                )}
                                {!isFriend && sentRequests.includes(member.email.toLowerCase().trim()) && (
                                  <span className="text-[8.5px] font-mono text-amber-600 dark:text-amber-400 font-black tracking-wider uppercase">
                                    {language === "fr" ? "EN ATTENTE" : "PENDING"}
                                  </span>
                                )}
                                {!isFriend && friendRequests.includes(member.email.toLowerCase().trim()) && (
                                  <span className="text-[8.5px] font-mono text-blue-600 dark:text-blue-400 font-black tracking-wider uppercase">
                                    {language === "fr" ? "DEMANDE REÇUE" : "REQUESTED"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions buttons */}
                            <div className="flex flex-col gap-1.5 shrink-0 self-center">
                              <button
                                onClick={() => toggleFriend(member.email)}
                                className="p-1.5 border transition-all cursor-pointer flex items-center justify-center rounded-none bg-transparent"
                                style={{
                                  color: isFriend ? "#e11d48" : currentSettings.accentColor,
                                  borderColor: isFriend ? "rgba(225, 29, 72, 0.3)" : `${currentSettings.accentColor}30`
                                }}
                                title={
                                  isFriend ? (language === "fr" ? "Retirer" : "Remove Friend") :
                                  sentRequests.includes(member.email.toLowerCase().trim()) ? (language === "fr" ? "Annuler" : "Cancel Request") :
                                  friendRequests.includes(member.email.toLowerCase().trim()) ? (language === "fr" ? "Accepter" : "Accept Request") :
                                  (language === "fr" ? "Ajouter" : "Add Friend")
                                }
                              >
                                {isFriend ? <UserMinus size={13} /> : (sentRequests.includes(member.email.toLowerCase().trim()) || friendRequests.includes(member.email.toLowerCase().trim())) ? <Clock size={13} /> : <UserPlus size={13} />}
                              </button>
                              <Link
                                to={`/profile/${encodeURIComponent(member.email)}`}
                                onClick={() => { if (setShowProfileModal) setShowProfileModal(false); }}
                                className="p-1.5 border border-brand-border/30 hover:border-brand-dark text-brand-muted hover:text-brand-dark transition-all cursor-pointer flex items-center justify-center rounded-none bg-transparent"
                                title={language === "fr" ? "Voir Profil" : "View Profile"}
                              >
                                <Eye size={13} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )
      )}

      {/* VIEW: PROFILE & SETTINGS */}
      {activeSubMenu === "settings" && (
        <div className="space-y-6 text-left font-serif text-brand-dark pb-6 overflow-y-auto max-h-[520px] scrollbar-thin px-1">
          
          {/* Interactive Premium Cover Photo & Profile Banner */}
          <div className="relative border border-brand-border/30 bg-brand-white dark:bg-zinc-900/30 overflow-hidden shadow-xs">
            {/* Cover Image */}
            <div className="h-28 w-full bg-brand-soft overflow-hidden relative">
              <img 
                src={readerProfile.coverPhotoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop"} 
                className="w-full h-full object-cover" 
                alt="cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
              
              {/* Change Cover floating button */}
              <label className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/75 text-white cursor-pointer transition-colors border border-white/20 rounded-none flex items-center gap-1 z-10">
                <Camera size={12} />
                <span className="text-[8px] font-mono tracking-wider uppercase font-black">{language === "fr" ? "Bannière" : "Cover"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const dataUrl = await compressImageFile(file, 800, 500, 0.75);
                        setReaderProfile({ ...readerProfile, coverPhotoUrl: dataUrl });
                        await syncProfileToFirestore({ coverPhotoUrl: dataUrl });
                        setSettingsSuccessMsg(language === "fr" ? "✓ Bannière de profil mise à jour !" : "✓ Cover photo updated!");
                        setTimeout(() => setSettingsSuccessMsg(""), 3000);
                      } catch (err) {
                        console.error("Failed to compress cover photo upload:", err);
                      }
                    }
                  }} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Profile Details Overlay */}
            <div className="px-4.5 pb-4 pt-1 flex items-start gap-4 relative">
              {/* Avatar Overlay with device photo upload overlay! */}
              <div className="w-16 h-16 border-2 border-brand-white bg-brand-white overflow-hidden shrink-0 -mt-8 relative z-10 shadow-md group">
                {renderNeutralAvatar(readerProfile.avatarUrl, readerProfile.name, 64)}
                
                {/* Device profile picture upload hover indicator */}
                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                  <Camera size={16} />
                  <span className="text-[6.5px] font-mono font-black uppercase tracking-wider">{language === "fr" ? "Changer" : "Upload"}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCustomAvatarUpload} 
                    className="hidden" 
                  />
                </label>
              </div>

              <div className="min-w-0 flex-grow mt-1.5 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-black tracking-tight text-brand-dark dark:text-zinc-100 font-serif leading-none truncate max-w-[180px]">{readerProfile.name}</h4>
                  <span 
                    className="text-[7.5px] font-mono font-black tracking-widest uppercase px-1.5 py-0.5 text-white leading-none shrink-0"
                    style={{ backgroundColor: currentSettings.accentColor }}
                  >
                    {readerProfile.role || "Member"}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-brand-muted truncate mt-1">{readerProfile.email}</p>
              </div>
            </div>
          </div>

          {/* I. ACCOUNT CONFIGURATION & PROFILE DETAILS */}
          <div className="space-y-4 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-300 dark:border-zinc-800 p-4 shadow-xs">
            <span className="text-[10px] font-mono font-black uppercase text-zinc-900 dark:text-zinc-100 tracking-widest block border-b border-zinc-300 dark:border-zinc-700 pb-1.5">
              {language === "fr" ? "I. COMPTE & PHOTO DE PROFIL" : "I. IDENTITY & BIO DETAILS"}
            </span>
            
            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
                {language === 'fr' ? "Nom d'usage" : "Display Name"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-grow bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none px-3 py-2 text-xs font-bold font-serif text-zinc-900 dark:text-zinc-100 rounded-none shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (editName.trim() && readerProfile) {
                      setReaderProfile({ ...readerProfile, name: editName });
                      syncProfileToFirestore({ name: editName });
                      setSettingsSuccessMsg(language === "fr" ? "✓ Nom mis à jour !" : "✓ Name updated!");
                      setTimeout(() => setSettingsSuccessMsg(""), 3000);
                    }
                  }}
                  className="px-4 text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-none cursor-pointer hover:opacity-90 transition-opacity border-none shadow-xs"
                  style={{ backgroundColor: currentSettings.accentColor }}
                >
                  {language === "fr" ? "Sauver" : "Save"}
                </button>
              </div>
            </div>

            {/* Biography Editor */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
                {language === 'fr' ? "Biographie / Description" : "Custom Biography / Bio"}
              </label>
              <div className="flex flex-col gap-2">
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder={language === "fr" ? "Rédigez une brève biographie..." : "Type a brief bio details..."}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none p-3 text-xs font-medium font-serif text-zinc-900 dark:text-zinc-100 rounded-none h-18 resize-none leading-relaxed shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setReaderProfile({ ...readerProfile, bio: editBio });
                    syncProfileToFirestore({ bio: editBio });
                    setSettingsSuccessMsg(language === "fr" ? "✓ Biographie mise à jour !" : "✓ Biography updated!");
                    setTimeout(() => setSettingsSuccessMsg(""), 3000);
                  }}
                  className="px-4 py-2 self-end text-white font-mono font-bold text-[9px] uppercase tracking-wider rounded-none cursor-pointer hover:opacity-90 transition-opacity border-none shadow-xs"
                  style={{ backgroundColor: currentSettings.accentColor }}
                >
                  {language === "fr" ? "METTRE À JOUR LA BIO" : "UPDATE BIO"}
                </button>
              </div>
            </div>

            {/* Custom File Upload & Preset Avatars selection */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <label className="block text-[9.5px] font-mono font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-2">
                {language === 'fr' ? "Sélectionner ou téléverser une photo" : "Select or Upload Avatar"}
              </label>
              
              {/* Direct file upload from device button */}
              <div className="flex gap-2 items-center mb-3">
                <label className="w-full sm:w-auto px-4 py-2.5 border border-zinc-900 dark:border-zinc-100 bg-zinc-950 dark:bg-zinc-900 text-white hover:bg-black transition-all text-[10px] font-mono tracking-wider uppercase font-black cursor-pointer flex items-center justify-center gap-2 shadow-md rounded-none">
                  <Camera size={15} className="text-amber-400 shrink-0" />
                  <span className="font-black text-white">{isUploading ? (language === "fr" ? "CHARGEMENT..." : "UPLOADING...") : (language === "fr" ? "TÉLÉVERSER DEPUIS L'APPAREIL" : "UPLOAD FROM DEVICE")}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCustomAvatarUpload} 
                    className="hidden" 
                    disabled={isUploading}
                  />
                </label>
              </div>

              {/* Preset grids */}
              <div className="grid grid-cols-4 gap-1.5">
                {avatarOptions.slice(0, 4).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setEditAvatar(opt.url);
                      setReaderProfile({ ...readerProfile, avatarUrl: opt.url });
                      syncProfileToFirestore({ avatarUrl: opt.url });
                      setSettingsSuccessMsg(
                        language === "fr"
                          ? `✓ Modèle sélectionné : ${opt.label}`
                          : `✓ Template selected: ${opt.label}`
                      );
                      setTimeout(() => setSettingsSuccessMsg(""), 3000);
                    }}
                    className="relative h-11 border bg-white dark:bg-zinc-900 transition-all cursor-pointer overflow-hidden border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-100 rounded-none flex items-center justify-center shadow-xs"
                    style={{
                      borderColor: editAvatar === opt.url ? currentSettings.accentColor : undefined,
                    }}
                    title={opt.label}
                  >
                    <div className="w-8 h-8 overflow-hidden shrink-0">
                      {renderNeutralAvatar(opt.url, readerProfile?.name, 32)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Privacy Choice Toggle Card */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-300 dark:border-zinc-800 rounded-none flex items-center justify-between shadow-xs">
            <div className="text-left pr-2">
              <span className="text-[10px] font-mono font-black uppercase text-zinc-900 dark:text-zinc-100 block tracking-wider">
                {language === "fr" ? "PROFIL PRIVE VS PUBLIC" : "PRIVATE VS PUBLIC PROFILE"}
              </span>
              <p className="text-[10px] text-zinc-800 dark:text-zinc-200 font-serif font-medium leading-relaxed mt-0.5">
                {language === "fr" 
                  ? "Masquer vos statistiques de lecture et vos articles favoris des autres membres."
                  : "Hide your active reading stats and bookmarked articles from other registered members."}
              </p>
            </div>
            <button
              onClick={() => {
                const newValue = !readerProfile.hidePersonalInfo;
                setReaderProfile({ ...readerProfile, hidePersonalInfo: newValue });
                syncProfileToFirestore({ hidePersonalInfo: newValue });
                setSettingsSuccessMsg(
                  newValue
                    ? (language === "fr" ? "✓ Profil défini sur PRIVÉ !" : "✓ Profile set to PRIVATE!")
                    : (language === "fr" ? "✓ Profil défini sur PUBLIC !" : "✓ Profile set to PUBLIC!")
                );
                setTimeout(() => setSettingsSuccessMsg(""), 3000);
              }}
              className="p-2 border transition-colors rounded-none shrink-0 cursor-pointer flex items-center justify-center bg-transparent"
              style={{
                color: readerProfile.hidePersonalInfo ? "#f43f5e" : currentSettings.accentColor,
                borderColor: readerProfile.hidePersonalInfo ? "rgba(244, 63, 94, 0.3)" : `${currentSettings.accentColor}30`
              }}
            >
              {readerProfile.hidePersonalInfo ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Email Visibility Card */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-300 dark:border-zinc-800 rounded-none flex items-center justify-between shadow-xs">
            <div className="text-left pr-2">
              <span className="text-[10px] font-mono font-black uppercase text-zinc-900 dark:text-zinc-100 block tracking-wider">
                {language === "fr" ? "VISIBILITÉ DE L'ADRESSE E-MAIL" : "EMAIL ADDRESS VISIBILITY"}
              </span>
              <p className="text-[10px] text-zinc-800 dark:text-zinc-200 font-serif font-medium leading-relaxed mt-0.5">
                {language === "fr" 
                  ? "Choisir d'afficher ou de masquer votre adresse e-mail sur votre carte de profil."
                  : "Choose whether to display or hide your email address on your public profile card."}
              </p>
            </div>
            <button
              onClick={() => {
                const newValue = !readerProfile.hideEmail;
                setReaderProfile({ ...readerProfile, hideEmail: newValue });
                syncProfileToFirestore({ hideEmail: newValue });
                setSettingsSuccessMsg(
                  newValue
                    ? (language === "fr" ? "✓ Adresse e-mail MASQUÉE du profil !" : "✓ Email address HIDDEN from profile!")
                    : (language === "fr" ? "✓ Adresse e-mail VISIBLE sur le profil !" : "✓ Email address VISIBLE on profile!")
                );
                setTimeout(() => setSettingsSuccessMsg(""), 3000);
              }}
              className="px-3 py-1.5 border font-mono text-[9.5px] font-bold uppercase tracking-wider transition-colors rounded-none shrink-0 cursor-pointer flex items-center justify-center gap-1.5 bg-transparent"
              style={{
                color: readerProfile.hideEmail ? "#f43f5e" : "#10b981",
                borderColor: readerProfile.hideEmail ? "rgba(244, 63, 94, 0.4)" : "rgba(16, 185, 129, 0.4)"
              }}
            >
              {readerProfile.hideEmail ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{readerProfile.hideEmail ? (language === "fr" ? "MASQUÉ" : "HIDDEN") : (language === "fr" ? "VISIBLE" : "VISIBLE")}</span>
            </button>
          </div>

          {/* II. Reading Statistics Bento Section */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-black uppercase text-zinc-900 dark:text-zinc-100 tracking-widest block border-b border-zinc-300 dark:border-zinc-700 pb-1.5">
              {language === "fr" ? "II. STATISTIQUES & ASSIDUITÉ" : "II. STATISTICS & ENGAGEMENT"}
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* Streak Bento Card */}
              <div className="p-4 border border-zinc-800 bg-zinc-950 dark:bg-zinc-900 text-white text-left relative overflow-hidden flex flex-col justify-between h-28 shadow-md rounded-none">
                <div>
                  <span className="text-[9.5px] font-mono font-black text-amber-400 uppercase block tracking-wider">{language === "fr" ? "SÉRIE DE LECTURE" : "DAILY STREAK"}</span>
                  <p className="text-2xl font-serif font-black text-white flex items-center gap-2 mt-1">
                    <span>{readerProfile.streak || 1}</span>
                    <Flame size={20} className="text-orange-500 animate-pulse shrink-0" />
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newStreak = (readerProfile.streak || 1) + 1;
                    setReaderProfile({ ...readerProfile, streak: newStreak });
                    syncProfileToFirestore({ streak: newStreak });
                    setSettingsSuccessMsg(language === "fr" ? "✓ Série incrémentée !" : "✓ Daily streak recorded!");
                    setTimeout(() => setSettingsSuccessMsg(""), 2000);
                  }}
                  className="text-[8.5px] font-mono font-black tracking-widest text-left uppercase text-amber-300 hover:text-white hover:underline border-none bg-transparent cursor-pointer"
                >
                  {language === "fr" ? "+ ENREGISTRER AUJOURD'HUI" : "+ LOG READING TODAY"}
                </button>
              </div>

              {/* Reading Time Bento Card */}
              <div className="p-4 border border-zinc-800 bg-zinc-950 dark:bg-zinc-900 text-white text-left relative overflow-hidden flex flex-col justify-between h-28 shadow-md rounded-none">
                <div>
                  <span className="text-[9.5px] font-mono font-black text-amber-400 uppercase block tracking-wider">{language === "fr" ? "TEMPS DE LECTURE" : "TIME READ"}</span>
                  <p className="text-2xl font-serif font-black text-white flex items-center gap-2 mt-1">
                    <span>{readerProfile.readingTime || 120} m</span>
                    <Clock size={18} className="text-amber-400 shrink-0" />
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newTime = (readerProfile.readingTime || 120) + 15;
                    setReaderProfile({ ...readerProfile, readingTime: newTime });
                    syncProfileToFirestore({ readingTime: newTime });
                    setSettingsSuccessMsg(language === "fr" ? "✓ +15m enregistrés !" : "✓ +15m reading time logged!");
                    setTimeout(() => setSettingsSuccessMsg(""), 2000);
                  }}
                  className="text-[8.5px] font-mono font-black tracking-widest text-left uppercase text-amber-300 hover:text-white hover:underline border-none bg-transparent cursor-pointer"
                >
                  {language === "fr" ? "+ LIRE 15 MINUTES" : "+ LOG 15 MINUTES"}
                </button>
              </div>
            </div>
          </div>

          {/* III. Saved Articles List Grid */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-black uppercase text-white dark:text-white tracking-widest block border-b border-zinc-300 dark:border-zinc-700 pb-1.5">
              {language === "fr" ? "III. ARTICLES ENREGISTRÉS" : "III. BOOKMARKED ARTICLES"}
            </span>
            
            {(() => {
              const mySaved = articles.filter(a => savedArticles.includes(a.id));
              if (mySaved.length === 0) {
                return (
                  <p className="text-[10.5px] text-white dark:text-white italic py-3 font-serif">
                    {language === "fr" ? "Aucun article enregistré pour le moment." : "No saved articles logged."}
                  </p>
                );
              }
              return (
                <div className="grid grid-cols-1 gap-2">
                  {mySaved.map((art) => (
                    <div 
                      key={art.id} 
                      className="p-3 border border-zinc-800 bg-zinc-900/90 dark:bg-zinc-900/90 hover:bg-zinc-800 transition-colors flex justify-between items-center text-left rounded-none shadow-sm"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-[11.5px] font-serif font-black text-white dark:text-white truncate leading-snug">
                          {language === "fr" ? art.title?.fr : art.title?.en}
                        </p>
                        <p className="text-[8.5px] font-mono text-zinc-300 dark:text-zinc-300 uppercase tracking-wider mt-0.5">
                          {art.category || "General"} • {art.date || "2026-07"}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleSavedArticle(art.id)}
                        className="text-rose-400 hover:text-rose-300 font-mono text-[9px] font-bold uppercase tracking-wider shrink-0 cursor-pointer border-none bg-transparent"
                      >
                        {language === "fr" ? "Retirer" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* IV. MY ACCREDITATIONS & ACCOLADES (Beautiful Custom Badges list!) */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-black uppercase text-white dark:text-white tracking-widest block border-b border-zinc-300 dark:border-zinc-700 pb-1.5">
              {language === "fr" ? "IV. MES ACCOLADES & DISTINCTIONS" : "IV. MY ACCOLADES & CERTIFICATES"}
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {ACCOLADES_DEFS.map((acc) => {
                const hasAcc = myEarnedAccolades.includes(acc.id);
                return (
                  <div 
                    key={acc.id}
                    className={`p-3.5 border flex items-center gap-3.5 transition-all ${
                      hasAcc 
                        ? "bg-zinc-900 dark:bg-zinc-900 border-zinc-700 dark:border-zinc-700 shadow-xs" 
                        : "bg-zinc-900/40 dark:bg-zinc-900/40 border-zinc-800 dark:border-zinc-800 opacity-60"
                    }`}
                  >
                    <div className={`p-2 rounded-none ${hasAcc ? "bg-zinc-800 dark:bg-zinc-800" : "bg-transparent grayscale"}`}>
                      {acc.icon(18)}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className={`text-[11.5px] font-serif font-black leading-none ${hasAcc ? "text-white dark:text-white" : "text-zinc-400 dark:text-zinc-400 font-mono"}`}>
                        {acc.title[language]} {!hasAcc && "🔒"}
                      </p>
                      <p className="text-[10px] text-zinc-200 dark:text-zinc-200 mt-1 leading-snug font-serif">
                        {acc.desc[language]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* V. Security PIN section */}
          <div className="border border-zinc-300 dark:border-zinc-800 rounded-none overflow-hidden bg-white dark:bg-zinc-900/80 shadow-xs">
            <details className="group">
              <summary className="flex justify-between items-center p-3.5 cursor-pointer bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors select-none">
                <span className="text-[10px] font-mono font-black uppercase text-zinc-900 dark:text-zinc-100 tracking-wider">
                  {language === "fr" ? "▼ CODE PIN & SÉCURITÉ DU COMPTE" : "▼ ACCOUNT SECURITY PIN"}
                </span>
              </summary>
              <div className="p-4 space-y-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40">
                {emailVerified ? (
                  <div className="space-y-3 font-mono text-[9px]">
                    <div className="flex items-center gap-1.5 font-bold uppercase text-zinc-900 dark:text-zinc-100">
                      <Lock size={12} style={{ color: currentSettings.accentColor }} />
                      <span>{language === "fr" ? "Code PIN d'Authentification Rapide" : "Quick Access PIN Code"}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-bold uppercase text-zinc-800 dark:text-zinc-200 block">{language === "fr" ? "Définir un Code PIN (4 à 6 chiffres)" : "Set Security PIN (4 to 6 Digits)"}</label>
                        <div className="relative">
                          <input
                            type={showSecurityPinInput ? "text" : "password"}
                            maxLength={6}
                            inputMode="numeric"
                            placeholder="••••"
                            value={securityPinInput}
                            onChange={(e) => setSecurityPinInput(e.target.value.replace(/\D/g, ''))}
                            className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-2 pr-10 w-full focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-mono text-center tracking-widest text-sm text-zinc-900 dark:text-zinc-100 rounded-none shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecurityPinInput(!showSecurityPinInput)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                            title={showSecurityPinInput ? "Cacher" : "Afficher"}
                          >
                            {showSecurityPinInput ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      {securityError && <p className="text-rose-600 text-[8.5px] font-bold">{securityError}</p>}
                      <button
                        onClick={() => {
                          if (securityPinInput.length < 4 || securityPinInput.length > 6) {
                            setSecurityError(language === "fr" ? "Le PIN doit contenir entre 4 et 6 chiffres." : "The PIN must contain 4 to 6 digits.");
                            return;
                          }
                          setSecurityError("");
                          updateUserPin(readerProfile.email, securityPinInput);
                          setSecurityPinInput("");
                          setSettingsSuccessMsg(language === "fr" ? "✓ Code PIN enregistré avec succès !" : "✓ Security PIN Code Saved Successfully!");
                          setTimeout(() => setSettingsSuccessMsg(""), 3000);
                        }}
                        className="w-full text-white font-black py-2.5 uppercase tracking-wider text-[8.5px] cursor-pointer rounded-none border-none shadow-xs"
                        style={{ backgroundColor: currentSettings.accentColor }}
                      >
                        {language === "fr" ? "ENREGISTRER LE CODE PIN" : "SAVE SECURITY PIN"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] italic text-zinc-600 dark:text-zinc-400">{language === "fr" ? "Veuillez valider votre compte d'abord." : "Please verify your account first."}</p>
                )}
              </div>
            </details>
          </div>

          {/* VI. Danger Zone - Delete Account */}
          <div className="border border-rose-300 dark:border-rose-900/60 rounded-none overflow-hidden bg-rose-50/50 dark:bg-rose-950/20 shadow-xs">
            <details className="group">
              <summary className="flex justify-between items-center p-3.5 cursor-pointer bg-rose-100/80 dark:bg-rose-900/40 hover:bg-rose-200/60 dark:hover:bg-rose-900/60 transition-colors select-none">
                <span className="text-[10px] font-mono font-black uppercase text-rose-800 dark:text-rose-300 tracking-wider flex items-center gap-2">
                  <X size={14} className="text-rose-600" />
                  {language === "fr" ? "▼ ZONE DANGEREUSE : SUPPRIMER MON COMPTE" : "▼ DANGER ZONE: REMOVE ACCOUNT"}
                </span>
              </summary>
              <div className="p-4 space-y-3 border-t border-rose-200 dark:border-rose-900/50 bg-white dark:bg-zinc-950/80 font-mono text-[10px]">
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {language === "fr" 
                    ? "La suppression de votre compte effacera toutes vos données personnelles, vos articles sauvegardés et vos préférences de manière irréversible."
                    : "Deleting your account will permanently wipe your personal data, saved articles, and preferences."}
                </p>
                {confirmDeleteSelf ? (
                  <div className="space-y-2">
                    <p className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                      {language === "fr" ? "Êtes-vous certain(e) de vouloir supprimer définitivement ce compte ?" : "Are you sure you want to permanently delete this account?"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSelf(false)}
                        className="flex-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 py-2 font-bold uppercase text-[9px] cursor-pointer"
                      >
                        {language === "fr" ? "Annuler" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (readerProfile?.email) {
                            const clean = readerProfile.email.toLowerCase().trim();
                            try {
                              const saved = localStorage.getItem('perspective_deleted_user_emails');
                              const list = saved ? JSON.parse(saved) : [];
                              if (!list.includes(clean)) {
                                list.push(clean);
                                localStorage.setItem('perspective_deleted_user_emails', JSON.stringify(list));
                              }
                            } catch (e) {
                              console.error(e);
                            }
                            deleteUser(clean);
                            try {
                              await deleteDoc(doc(db, "users", clean));
                            } catch (e) {
                              console.error(e);
                            }
                            setReaderProfile({
                              name: "Visiteur",
                              email: "",
                              role: "Member",
                              avatarUrl: "preset-male",
                              isMongo: false
                            });
                            if (setShowProfileModal) setShowProfileModal(false);
                          }
                        }}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 font-black uppercase text-[9px] cursor-pointer border-none"
                      >
                        {language === "fr" ? "OUI, SUPPRIMER DÉFINITIVEMENT" : "YES, DELETE PERMANENTLY"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteSelf(true)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 uppercase tracking-wider text-[9px] cursor-pointer border-none shadow-xs"
                  >
                    {language === "fr" ? "SUPPRIMER MON COMPTE" : "DELETE MY ACCOUNT"}
                  </button>
                )}
              </div>
            </details>
          </div>

          {/* Metadata Footer Card */}
          <div className="bg-white dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-800 p-4 font-mono space-y-1 text-[9px] text-zinc-700 dark:text-zinc-300 uppercase tracking-wider rounded-none shadow-xs">
            <p className="font-bold text-zinc-900 dark:text-zinc-100">MEMBER ID: {readerProfile.email?.split("@")[0].toUpperCase()}</p>
            <p>CLEARANCE TIER: {isAdmin ? "LEVEL 4 EXECUTIVE" : "LEVEL 1 READER"}</p>
            <p>Dossier Server Node: Sahel-SNDKR</p>
          </div>

        </div>
      )}
    </>
  );
};
