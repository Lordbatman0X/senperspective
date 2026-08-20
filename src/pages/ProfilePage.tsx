import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../store";
import { compressImageFile } from "../lib/imageUtils";
import { getSafeText } from "../lib/utils";
import { db } from "../lib/firebase";
import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import { 
  renderNeutralAvatar 
} from "../components/AccountDrawer";
import { NotificationSetupPanel } from "../components/NotificationSetupPanel";
import { InternalShareModal } from "../components/InternalShareModal";
import { 
  Flame, 
  Clock, 
  Lock, 
  Shield, 
  ShieldCheck, 
  Crown, 
  MessageSquare, 
  UserPlus, 
  UserMinus, 
  Eye, 
  EyeOff, 
  Camera, 
  Award, 
  Sparkles, 
  Bookmark, 
  MessageCircle,
  Share2,
  FileText,
  LockKeyhole,
  CheckCircle2,
  PenTool,
  Trophy,
  Activity,
  ArrowLeft
} from "lucide-react";

// Expand accolades definition
const DETAILED_ACCOLADES = [
  {
    id: "verified_identity",
    icon: (size: number) => <ShieldCheck size={size} className="text-emerald-500 shrink-0" />,
    title: { fr: "Compte Vérifié", en: "Verified Account" },
    desc: { fr: "Identité et e-mail vérifiés sur la plateforme", en: "Verified email and account" },
    color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-700"
  },
  {
    id: "deep_reader",
    icon: (size: number) => <Clock size={size} className="text-amber-500 shrink-0" />,
    title: { fr: "Grand Lecteur", en: "Avid Reader" },
    desc: { fr: "+120 minutes de lecture accumulées", en: "Over 120 total minutes spent reading" },
    color: "border-amber-500/20 bg-amber-500/5 text-amber-700"
  },
  {
    id: "daily_devoted",
    icon: (size: number) => <Flame size={size} className="text-orange-500 shrink-0" />,
    title: { fr: "Lecteur Quotidien", en: "Daily Reader" },
    desc: { fr: "Série de lecture active de 5 jours ou +", en: "Active reading streak of 5+ days" },
    color: "border-orange-500/20 bg-orange-500/5 text-orange-700"
  },
  {
    id: "security_pioneer",
    icon: (size: number) => <Lock size={size} className="text-blue-500 shrink-0" />,
    title: { fr: "Compte Sécurisé", en: "Secure Account" },
    desc: { fr: "Code PIN de sécurité activé", en: "PIN security protection active" },
    color: "border-blue-500/20 bg-blue-500/5 text-blue-700"
  },
  {
    id: "elite_clearance",
    icon: (size: number) => <Crown size={size} className="text-purple-500 shrink-0" />,
    title: { fr: "Administrateur", en: "Administrator" },
    desc: { fr: "Membre de l'équipe de gestion du site", en: "Site management team member" },
    color: "border-purple-500/20 bg-purple-500/5 text-purple-700"
  },
  {
    id: "investigative_partner",
    icon: (size: number) => <PenTool size={size} className="text-rose-500 shrink-0" />,
    title: { fr: "Contributeur", en: "Contributor" },
    desc: { fr: "Partage de suggestions et propositions de sujets", en: "Shared article topics and feedback" },
    color: "border-rose-500/20 bg-rose-500/5 text-rose-700"
  },
  {
    id: "loyal_reader",
    icon: (size: number) => <Trophy size={size} className="text-yellow-600 shrink-0" />,
    title: { fr: "Lecteur Fidèle", en: "Loyal Reader" },
    desc: { fr: "Lecture régulière et engagement sur Perspective", en: "Regular reading and engagement on Perspective" },
    color: "border-yellow-600/20 bg-yellow-600/5 text-yellow-700"
  },
  {
    id: "truth_seeker",
    icon: (size: number) => <Activity size={size} className="text-teal-600 shrink-0" />,
    title: { fr: "Commentateur Actif", en: "Active Commenter" },
    desc: { fr: "Participation fréquente aux commentaires", en: "Frequent participant in discussions" },
    color: "border-teal-600/20 bg-teal-600/5 text-teal-700"
  }
];

export function ProfilePage() {
  const { email } = useParams<{ email: string }>();
  const { allUsers, user: firebaseUser } = useAuth();
  const { 
    language, 
    siteSettings, 
    readerProfile, 
    setReaderProfile, 
    comments, 
    articles,
    savedArticles,
    toggleSavedArticle,
    setShowSignUpModal,
    setAuthTab,
    setShowProfileDrawer,
    setActiveProfileTab,
    setPendingShareArticleId
  } = useStore();

  const [friends, setFriends] = useState<string[]>([]);
  const [showInternalShareModal, setShowInternalShareModal] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState("");

  // New relation states
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [targetFollowing, setTargetFollowing] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [mutes, setMutes] = useState<string[]>([]);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const currentSettings = siteSettings || { accentColor: "#E85D42" };
  const accentColor = currentSettings.accentColor;

  // Real-time following of CURRENT logged-in user
  useEffect(() => {
    if (!readerProfile?.email) return;
    const followingRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "following");
    const unsubscribe = onSnapshot(followingRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.id.toLowerCase().trim());
      });
      setFollowing(list);
    }, (err) => {
      console.warn("Error loading following list:", err);
    });
    return () => unsubscribe();
  }, [readerProfile?.email]);

  // Real-time followers of TARGET user
  useEffect(() => {
    const dec = decodeURIComponent(email || "").toLowerCase().trim();
    if (!dec) return;
    const followersRef = collection(db, "users", dec, "followers");
    const unsubscribe = onSnapshot(followersRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.id.toLowerCase().trim());
      });
      setFollowers(list);
    }, (err) => {
      console.warn("Error loading target followers list:", err);
    });
    return () => unsubscribe();
  }, [email]);

  // Real-time following of TARGET user
  useEffect(() => {
    const dec = decodeURIComponent(email || "").toLowerCase().trim();
    if (!dec) return;
    const targetFollowingRef = collection(db, "users", dec, "following");
    const unsubscribe = onSnapshot(targetFollowingRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.id.toLowerCase().trim());
      });
      setTargetFollowing(list);
    }, (err) => {
      console.warn("Error loading target following list:", err);
    });
    return () => unsubscribe();
  }, [email]);

  // Real-time blocks of CURRENT logged-in user
  useEffect(() => {
    if (!readerProfile?.email) return;
    const blocksRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "blocks");
    const unsubscribe = onSnapshot(blocksRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.id.toLowerCase().trim());
      });
      setBlocks(list);
    }, (err) => {
      console.warn("Error loading blocks list:", err);
    });
    return () => unsubscribe();
  }, [readerProfile?.email]);

  // Real-time mutes of CURRENT logged-in user
  useEffect(() => {
    if (!readerProfile?.email) return;
    const mutesRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "mutes");
    const unsubscribe = onSnapshot(mutesRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.id.toLowerCase().trim());
      });
      setMutes(list);
    }, (err) => {
      console.warn("Error loading mutes list:", err);
    });
    return () => unsubscribe();
  }, [readerProfile?.email]);

  // Real-time check if TARGET user has blocked me
  useEffect(() => {
    const dec = decodeURIComponent(email || "").toLowerCase().trim();
    if (!dec || !readerProfile?.email) return;
    const myEmail = readerProfile.email.toLowerCase().trim();
    const targetBlocksRef = collection(db, "users", dec, "blocks");
    const unsubscribe = onSnapshot(targetBlocksRef, (snapshot) => {
      let blocked = false;
      snapshot.forEach((docSnap) => {
        if (docSnap.id.toLowerCase().trim() === myEmail) {
          blocked = true;
        }
      });
      setHasBlockedMe(blocked);
    }, (err) => {
      console.warn("Error loading target blocks list:", err);
    });
    return () => unsubscribe();
  }, [email, readerProfile?.email]);

  // Real-time friends of CURRENT logged-in user
  useEffect(() => {
    if (!readerProfile?.email) return;
    const friendsRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "friends");
    const unsubscribe = onSnapshot(friendsRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.id.toLowerCase().trim());
      });
      setFriends(list);
    }, (err) => {
      console.error("Error loading friends list:", err);
    });
    return () => unsubscribe();
  }, [readerProfile?.email]);

  // Handle finding target user with live Firestore listener
  const decodedEmail = decodeURIComponent(email || "").toLowerCase().trim();
  const [targetUserData, setTargetUserData] = useState<any | null>(null);

  useEffect(() => {
    if (!decodedEmail) return;
    const userDocRef = doc(db, "users", decodedEmail);
    const unsub = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setTargetUserData({ id: snap.id, ...snap.data() });
      } else {
        setTargetUserData(null);
      }
    }, (err) => {
      console.warn("Error loading target user live doc:", err);
    });
    return () => unsub();
  }, [decodedEmail]);

  const fallbackUser = allUsers.find(u => u.email.toLowerCase().trim() === decodedEmail);
  const targetUser = targetUserData ? {
    ...fallbackUser,
    ...targetUserData,
    email: targetUserData.email || decodedEmail,
    hideEmail: targetUserData.hideEmail !== undefined ? targetUserData.hideEmail : fallbackUser?.hideEmail,
    hidePersonalInfo: targetUserData.hidePersonalInfo !== undefined ? targetUserData.hidePersonalInfo : fallbackUser?.hidePersonalInfo
  } : fallbackUser;

  // Initialize bio editing
  useEffect(() => {
    if (targetUser) {
      setEditedBio(targetUser.bio || "");
    }
  }, [targetUser?.bio]);

  if (!readerProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="square-card p-10 bg-brand-soft/30 border border-brand-border/40 max-w-xl mx-auto rounded-none text-left">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 mb-6 rounded-none">
            <LockKeyhole size={28} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-brand-dark font-mono mb-4">
            {language === "fr" ? "ACCÈS RESTREINT" : "RESTRICTED ACCESS"}
          </h2>
          <p className="text-xs text-brand-muted font-serif leading-relaxed mb-8">
            {language === "fr" 
              ? "La consultation des dossiers d'analyse et des profils des membres du réseau Perspective est réservée aux abonnés authentifiés. Veuillez vous connecter pour accéder à l'annuaire."
              : "Access to intelligence dossiers and Perspective network user profiles is restricted to authenticated subscribers. Please authenticate to view the ledger."}
          </p>
          <button
            onClick={() => {
              setAuthTab("login");
              setShowSignUpModal(true);
            }}
            className="px-6 py-3 font-mono text-[10px] font-black uppercase tracking-widest text-white transition-all cursor-pointer border-none"
            style={{ backgroundColor: accentColor }}
          >
            {language === "fr" ? "SE CONNECTER / S'INSCRIRE" : "LOG IN / REGISTER"}
          </button>
        </div>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="square-card p-10 bg-brand-soft/30 border border-brand-border/40 max-w-xl mx-auto rounded-none text-left font-mono">
          <h2 className="text-xl font-black uppercase tracking-widest text-brand-dark mb-4">
            {language === "fr" ? "DOSSIER MEMBRE INEXISTANT" : "DOSSIER NOT FOUND"}
          </h2>
          <p className="text-xs text-brand-muted leading-relaxed mb-6 font-serif">
            {language === "fr"
              ? "Le profil demandé n'existe pas ou a été désactivé par l'administration centrale du réseau."
              : "The requested intelligence profile does not exist or has been deactivated by core network administration."}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:opacity-85 transition-opacity"
          >
            <ArrowLeft size={14} />
            {language === "fr" ? "RETOUR À L'ACCUEIL" : "BACK TO HOME"}
          </Link>
        </div>
      </div>
    );
  }

  const isSelf = readerProfile.email.toLowerCase().trim() === decodedEmail;
  const isFriend = friends.includes(decodedEmail);
  const isAdmin = readerProfile.email === "kadersdiaz3@gmail.com" || 
                  readerProfile.email === "admin@perspective.sn" || 
                  readerProfile.email?.toLowerCase().includes("admin");

  // Privacy gate rule
  const canViewDetails = !targetUser.hidePersonalInfo || isSelf || isFriend || isAdmin;

  // Toggle friendship action
  const handleFriendship = async () => {
    const myEmail = readerProfile.email.toLowerCase().trim();
    const targetEmail = targetUser.email.toLowerCase().trim();
    if (myEmail === targetEmail) return;

    try {
      const myFriendDocRef = doc(db, "users", myEmail, "friends", targetEmail);
      const targetFriendDocRef = doc(db, "users", targetEmail, "friends", myEmail);

      if (isFriend) {
        await deleteDoc(myFriendDocRef);
        await deleteDoc(targetFriendDocRef);
        setSuccessMsg(language === "fr" ? "Contact retiré de votre réseau." : "Contact removed from your secure network.");
      } else {
        await setDoc(myFriendDocRef, { email: targetEmail, connectedAt: Date.now() });
        await setDoc(targetFriendDocRef, { email: myEmail, connectedAt: Date.now() });
        setSuccessMsg(language === "fr" ? "Contact ajouté à votre réseau !" : "Contact established successfully!");
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error setting friend status:", err);
      setErrorMsg(language === "fr" ? "Impossible de modifier la relation." : "Unable to alter network parameters.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // Follow/Unfollow action
  const handleFollow = async () => {
    const myEmail = readerProfile.email.toLowerCase().trim();
    const targetEmail = targetUser.email.toLowerCase().trim();
    if (myEmail === targetEmail) return;

    const isFollowing = following.includes(targetEmail);

    try {
      const myFollowingDocRef = doc(db, "users", myEmail, "following", targetEmail);
      const targetFollowersDocRef = doc(db, "users", targetEmail, "followers", myEmail);

      if (isFollowing) {
        await deleteDoc(myFollowingDocRef);
        await deleteDoc(targetFollowersDocRef);
        setSuccessMsg(language === "fr" ? "Vous ne suivez plus ce membre." : "Unfollowed member.");
      } else {
        await setDoc(myFollowingDocRef, { email: targetEmail, followedAt: Date.now() });
        await setDoc(targetFollowersDocRef, { email: myEmail, followedAt: Date.now() });
        setSuccessMsg(language === "fr" ? "Vous suivez désormais ce membre !" : "Following member!");
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error setting follow status:", err);
      setErrorMsg(language === "fr" ? "Impossible de modifier l'abonnement." : "Unable to update follow parameters.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // Block/Unblock action
  const handleBlock = async () => {
    const myEmail = readerProfile.email.toLowerCase().trim();
    const targetEmail = targetUser.email.toLowerCase().trim();
    if (myEmail === targetEmail) return;

    const isCurrentlyBlocked = blocks.includes(targetEmail);

    try {
      const blockDocRef = doc(db, "users", myEmail, "blocks", targetEmail);
      if (isCurrentlyBlocked) {
        await deleteDoc(blockDocRef);
        setSuccessMsg(language === "fr" ? "Membre débloqué." : "Unblocked member.");
      } else {
        await setDoc(blockDocRef, { email: targetEmail, blockedAt: Date.now() });
        setSuccessMsg(language === "fr" ? "Membre bloqué avec succès." : "Blocked member successfully.");
        
        // Auto-remove friend and follow connections on block
        await deleteDoc(doc(db, "users", myEmail, "friends", targetEmail));
        await deleteDoc(doc(db, "users", targetEmail, "friends", myEmail));
        await deleteDoc(doc(db, "users", myEmail, "following", targetEmail));
        await deleteDoc(doc(db, "users", targetEmail, "followers", myEmail));
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error setting block status:", err);
    }
  };

  // Mute/Unmute action
  const handleMute = async () => {
    const myEmail = readerProfile.email.toLowerCase().trim();
    const targetEmail = targetUser.email.toLowerCase().trim();
    if (myEmail === targetEmail) return;

    const isCurrentlyMuted = mutes.includes(targetEmail);

    try {
      const muteDocRef = doc(db, "users", myEmail, "mutes", targetEmail);
      if (isCurrentlyMuted) {
        await deleteDoc(muteDocRef);
        setSuccessMsg(language === "fr" ? "Notifications réactivées." : "Unmuted member.");
      } else {
        await setDoc(muteDocRef, { email: targetEmail, mutedAt: Date.now() });
        setSuccessMsg(language === "fr" ? "Membre masqué (sourdine active)." : "Muted member notifications.");
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error setting mute status:", err);
    }
  };

  // Submit report action
  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason) return;

    const reportId = "report-" + Date.now();
    try {
      await setDoc(doc(db, "reports", reportId), {
        id: reportId,
        reportedBy: readerProfile.email,
        reportedUser: targetUser.email,
        reason: reportReason,
        details: reportDetails,
        date: new Date().toISOString(),
        status: "pending"
      });
      setShowReportModal(false);
      setReportReason("");
      setReportDetails("");
      setSuccessMsg(language === "fr" ? "Signalement transmis aux administrateurs." : "Report submitted to central administration.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error submitting report ticket:", err);
      setErrorMsg(language === "fr" ? "Erreur de transmission." : "Failed to submit report ticket.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // Profile image changes (Avatar & Cover photo)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatarUrl" | "coverPhotoUrl") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isCover = type === "coverPhotoUrl";
      const compressedDataUrl = await compressImageFile(file, isCover ? 800 : 400, isCover ? 500 : 400, 0.75);
      const userDocRef = doc(db, "users", readerProfile.email.toLowerCase().trim());
      await updateDoc(userDocRef, { [type]: compressedDataUrl });
      
      // Update store immediately if updating self
      if (isSelf) {
        setReaderProfile({ ...readerProfile, [type]: compressedDataUrl });
      }
      setSuccessMsg(
        language === "fr" 
          ? "✓ Image mise à jour avec succès !" 
          : "✓ Image updated successfully!"
      );
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Failed to upload image:", err);
      setErrorMsg(language === "fr" ? "Erreur de stockage." : "Storage write error.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  // Toggle privacy choice
  const togglePrivacy = async () => {
    try {
      const newStatus = !targetUser.hidePersonalInfo;
      const userDocRef = doc(db, "users", readerProfile.email.toLowerCase().trim());
      await updateDoc(userDocRef, { hidePersonalInfo: newStatus });
      
      if (isSelf) {
        setReaderProfile({ ...readerProfile, hidePersonalInfo: newStatus });
      }
      setSuccessMsg(
        language === "fr"
          ? (newStatus ? "✓ Espace rendu privé." : "✓ Espace rendu public.")
          : (newStatus ? "✓ Dossier made confidential." : "✓ Dossier made open ledger.")
      );
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error toggling privacy:", err);
    }
  };

  // Toggle email visibility choice
  const toggleHideEmail = async () => {
    if (!readerProfile?.email) return;
    try {
      const newStatus = !targetUser.hideEmail;
      const userDocRef = doc(db, "users", readerProfile.email.toLowerCase().trim());
      await updateDoc(userDocRef, { hideEmail: newStatus });
      
      if (isSelf) {
        setReaderProfile({ ...readerProfile, hideEmail: newStatus });
      }
      setSuccessMsg(
        language === "fr"
          ? (newStatus ? "✓ Adresse e-mail masquée." : "✓ Adresse e-mail affichée sur le profil.")
          : (newStatus ? "✓ Email address hidden." : "✓ Email address displayed on profile.")
      );
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error toggling email visibility:", err);
    }
  };

  // Bio updates
  const saveBio = async () => {
    try {
      const userDocRef = doc(db, "users", readerProfile.email.toLowerCase().trim());
      await updateDoc(userDocRef, { bio: editedBio });
      if (isSelf) {
        setReaderProfile({ ...readerProfile, bio: editedBio });
      }
      setIsEditingBio(false);
      setSuccessMsg(language === "fr" ? "✓ Biographie enregistrée" : "✓ Bio updated");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Accolade management (Toggle own accolades for dynamic customization!)
  const toggleAccolade = async (accoladeId: string) => {
    if (!isSelf && !isAdmin) return;
    const currentAccolades = targetUser.accolades || [];
    let updatedAccolades = [];
    if (currentAccolades.includes(accoladeId)) {
      updatedAccolades = currentAccolades.filter((a: string) => a !== accoladeId);
    } else {
      updatedAccolades = [...currentAccolades, accoladeId];
    }

    try {
      const userDocRef = doc(db, "users", targetUser.email.toLowerCase().trim());
      await updateDoc(userDocRef, { accolades: updatedAccolades });
      if (isSelf) {
        setReaderProfile({ ...readerProfile, accolades: updatedAccolades });
      }
      setSuccessMsg(language === "fr" ? "✓ Décorations modifiées" : "✓ Accolades altered");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // User comments list
  const userComments = comments.filter(c => c.email?.toLowerCase().trim() === decodedEmail);

  // Trigger secured chat dispatch
  const handleOpenSecureDispatch = () => {
    if ((window as any).setSelectedChatUser) {
      (window as any).setSelectedChatUser(targetUser.email);
    }
    useStore.setState({ 
      activeProfileTab: "messages",
      showProfileDrawer: true 
    });
  };

  const isBlockedByMe = blocks.includes(decodedEmail);

  if (isBlockedByMe || hasBlockedMe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="square-card p-10 bg-zinc-950 text-zinc-100 border border-zinc-900 max-w-xl mx-auto rounded-none text-left">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 mb-6 rounded-none">
            <LockKeyhole size={28} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-brand-white font-mono mb-4">
            {language === "fr" ? "TRANSMISSION INTERROMPUE" : "TRANSMISSION BLOCKED"}
          </h2>
          <p className="text-xs text-zinc-400 font-serif leading-relaxed mb-8">
            {language === "fr" 
              ? "Les communications et accès aux dossiers d'analyse entre votre compte et ce membre ont été interrompus conformément aux protocoles de blocage de sécurité de Perspective."
              : "Communications and access to intelligence dossiers between your account and this member have been suspended in compliance with Perspective network security blocking protocols."}
          </p>
          <div className="flex gap-4">
            {isBlockedByMe && (
              <button
                onClick={handleBlock}
                className="px-6 py-3 font-mono text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 cursor-pointer border-none"
              >
                {language === "fr" ? "DÉBLOQUER CE MEMBRE" : "UNBLOCK MEMBER"}
              </button>
            )}
            <Link
              to="/"
              className="px-6 py-3 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-300 border border-zinc-800 hover:bg-zinc-900 flex items-center justify-center"
            >
              {language === "fr" ? "RETOUR" : "RETURN"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn text-left">
      
      {/* Alert Notification Badges */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-widest px-5 py-3 shadow-xl flex items-center gap-2">
          <CheckCircle2 size={13} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-50 bg-rose-600 text-white font-mono text-[10px] font-bold uppercase tracking-widest px-5 py-3 shadow-xl">
          {errorMsg}
        </div>
      )}

      {/* Nav Back Header */}
      <div className="mb-6 flex justify-between items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest text-brand-dark/80 hover:text-brand-dark transition-colors"
        >
          <ArrowLeft size={13} />
          <span>{language === "fr" ? "RETOUR AU FLUX INTERNE" : "RETURN TO INTELLIGENCE STREAM"}</span>
        </Link>
        <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">
          {language === "fr" ? "DÉTAILS COMPTE MEMBRE" : "MEMBER ENCRYPTED DOCKET"}
        </span>
      </div>

      {/* Hero Cover Frame */}
      <div className="relative h-64 md:h-80 w-full rounded-2xl bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-xl group">
        {targetUser.coverPhotoUrl ? (
          <img 
            src={targetUser.coverPhotoUrl} 
            alt="Cover" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-950 flex items-center justify-center">
            <span className="font-serif italic text-zinc-600 text-sm tracking-widest">
              PERSPECTIVE JOURNAL
            </span>
          </div>
        )}

        {/* Ambient Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 pointer-events-none" />

        {/* Journal Badge overlay on top left */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white font-mono text-[9px] uppercase font-bold tracking-widest shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>PERSPECTIVE • {language === "fr" ? "FICHE MEMBRE" : "MEMBER DOSSIER"}</span>
        </div>
        
        {/* Cover Change Button */}
        {isSelf && (
          <label className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-white/20 font-mono text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all shadow-md z-10">
            <Camera size={12} />
            <span>{language === "fr" ? "COUVERTURE" : "COVER PHOTO"}</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handlePhotoUpload(e, "coverPhotoUrl")} 
              className="hidden" 
            />
          </label>
        )}
      </div>

      {/* Profile Info Summary Glass Card (Lays elegantly on the cover) */}
      <div className="relative -mt-20 md:-mt-24 mx-3 sm:mx-6 md:mx-8 p-6 md:p-8 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl backdrop-saturate-150 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl z-20 flex flex-col gap-6 transition-all">
        
        {/* Avatar, Name & Accreditation Row */}
        <div className="flex flex-col md:flex-row gap-5 items-start md:items-end w-full">
          {/* Avatar Container laying over the card border */}
          <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-white dark:bg-zinc-900 border-4 border-white dark:border-zinc-950 overflow-hidden shadow-2xl shrink-0 -mt-14 md:-mt-20 ring-1 ring-black/10">
            {renderNeutralAvatar(targetUser.avatarUrl, targetUser.name, 144)}
            
            {/* Avatar Change Overlay */}
            {isSelf && (
              <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity backdrop-blur-xs">
                <Camera size={22} />
                <span className="text-[9px] font-mono font-bold mt-1 uppercase tracking-wider">
                  {language === "fr" ? "MODIFIER" : "CHANGE"}
                </span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handlePhotoUpload(e, "avatarUrl")} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          {/* User Meta */}
          <div className="space-y-2 md:mb-1 flex-grow w-full">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                {targetUser.name}
              </h1>
              
              {/* Membership Flag */}
              <span 
                className="text-[9.5px] font-mono font-bold text-white px-2.5 py-0.5 tracking-wider uppercase rounded-full shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                {targetUser.email === "kadersdiaz3@gmail.com" || 
                 targetUser.email === "admin@perspective.sn" || 
                 targetUser.role?.toLowerCase() === "admin"
                  ? "ADMIN"
                  : targetUser.role?.toUpperCase() || "MEMBER"}
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {(targetUser.hideEmail || targetUser.hidePersonalInfo) && !isSelf
                  ? (language === "fr" ? "••••••••@••••.com (E-mail masqué)" : "••••••••@••••.com (Hidden email)")
                  : (isSelf && targetUser.hideEmail
                      ? `${targetUser.email.toLowerCase()} (${language === "fr" ? "Masqué aux visiteurs" : "Hidden from visitors"})`
                      : targetUser.email.toLowerCase())}
              </p>

              {isSelf && (
                <button
                  onClick={toggleHideEmail}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 hover:text-black border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-200 dark:text-zinc-200 dark:hover:text-black dark:border-zinc-700 shadow-2xs"
                  title={language === "fr" ? "Afficher ou masquer l'adresse e-mail" : "Display or hide email address"}
                >
                  {targetUser.hideEmail ? (
                    <>
                      <EyeOff size={11} className="text-rose-500 group-hover:text-black" />
                      <span>{language === "fr" ? "AFFICHER E-MAIL" : "SHOW EMAIL"}</span>
                    </>
                  ) : (
                    <>
                      <Eye size={11} className="text-emerald-500 group-hover:text-black" />
                      <span>{language === "fr" ? "MASQUER E-MAIL" : "HIDE EMAIL"}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Followers and Following stats */}
            <div className="flex gap-3 pt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400 items-center mb-1">
              <div className="bg-zinc-100 dark:bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{followers.length}</span> {language === "fr" ? "abonnés" : "followers"}
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{targetFollowing.length}</span> {language === "fr" ? "abonnements" : "following"}
              </div>
            </div>

            {/* Action Controls Row - Positioned neatly under Followers / Following */}
            <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col gap-2.5 w-full">
              {isSelf ? (
                <div className="flex flex-wrap gap-2.5 items-center">
                  {/* Privacy Toggle */}
                  <button
                    onClick={togglePrivacy}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all rounded-xl shadow-xs"
                  >
                    {targetUser.hidePersonalInfo ? (
                      <>
                        <EyeOff size={13} style={{ color: accentColor }} />
                        <span>{language === "fr" ? "ESPACE PRIVÉ" : "PRIVATE MODE"}</span>
                      </>
                    ) : (
                      <>
                        <Eye size={13} className="text-emerald-600 dark:text-emerald-400" />
                        <span>{language === "fr" ? "ESPACE PUBLIC" : "PUBLIC MODE"}</span>
                      </>
                    )}
                  </button>

                  {/* Edit Bio Mode Trigger */}
                  <button
                    onClick={() => setIsEditingBio(!isEditingBio)}
                    className="px-4 py-2 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all rounded-xl border-none shadow-xs hover:opacity-90"
                    style={{ backgroundColor: accentColor }}
                  >
                    <span>{isEditingBio ? (language === "fr" ? "ANNULER" : "CANCEL") : (language === "fr" ? "MODIFIER LA BIO" : "EDIT BIO")}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  {/* Row 1: Direct Message, Friend, Follow */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Direct Messaging link */}
                    <button
                      onClick={handleOpenSecureDispatch}
                      className="px-3.5 py-2 text-white font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all rounded-lg border-none shadow-md hover:scale-[1.02]"
                      style={{ backgroundColor: accentColor }}
                    >
                      <MessageSquare size={13} />
                      <span>{language === "fr" ? "ENVOYER UN MESSAGE" : "MESSAGE"}</span>
                    </button>

                    {/* Internal Share Profile button */}
                    <button
                      onClick={() => setShowInternalShareModal(true)}
                      className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800 font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all rounded-lg shadow-xs"
                    >
                      <Share2 size={13} />
                      <span>{language === "fr" ? "PARTAGER LE PROFIL" : "SHARE PROFILE"}</span>
                    </button>

                    {/* Add/Remove Friend Contact button */}
                    <button
                      onClick={handleFriendship}
                      className={`px-3.5 py-2 font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all rounded-lg border shadow-xs ${
                        isFriend 
                          ? "bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800" 
                          : "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 hover:opacity-90"
                      }`}
                    >
                      {isFriend ? (
                        <>
                          <UserMinus size={13} />
                          <span>{language === "fr" ? "RETIRER DES AMIS" : "REMOVE FRIEND"}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} />
                          <span>{language === "fr" ? "AJOUTER EN AMI" : "ADD FRIEND"}</span>
                        </>
                      )}
                    </button>

                    {/* Follow / Unfollow button */}
                    <button
                      onClick={handleFollow}
                      className={`px-3.5 py-2 font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all rounded-lg border shadow-xs ${
                        following.includes(targetUser.email.toLowerCase().trim()) 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" 
                          : "bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <Activity size={13} />
                      <span>{following.includes(targetUser.email.toLowerCase().trim()) ? (language === "fr" ? "ABONNÉ(E)" : "FOLLOWING") : (language === "fr" ? "SUIVRE" : "FOLLOW")}</span>
                    </button>
                  </div>

                  {/* Row 2: Secondary Moderation Actions */}
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    {/* Mute button */}
                    <button
                      onClick={handleMute}
                      className={`px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all rounded-md border shadow-xs ${
                        mutes.includes(targetUser.email.toLowerCase().trim()) 
                          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" 
                          : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      }`}
                      title={language === "fr" ? "Masquer les notifications" : "Mute notifications"}
                    >
                      <EyeOff size={11} />
                      <span>{mutes.includes(targetUser.email.toLowerCase().trim()) ? (language === "fr" ? "MASQUÉ" : "MUTED") : (language === "fr" ? "MASQUER" : "MUTE")}</span>
                    </button>

                    {/* Block button */}
                    <button
                      onClick={handleBlock}
                      className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-rose-600 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md shadow-xs"
                      title={language === "fr" ? "Bloquer le membre" : "Block member"}
                    >
                      <Lock size={11} />
                      <span>{language === "fr" ? "BLOQUER" : "BLOCK"}</span>
                    </button>

                    {/* Report button */}
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md shadow-xs"
                      title={language === "fr" ? "Signaler ce membre" : "Report member"}
                    >
                      <Award size={11} />
                      <span>{language === "fr" ? "SIGNALER" : "REPORT"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid Content Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left Column: Stats & Accolades */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Bio statement */}
          <div className="square-card p-5 bg-brand-white border border-brand-border/15">
            <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-muted mb-3 flex items-center gap-2">
              <span>{language === "fr" ? "NOTE DE SÉCURITÉ / BIO" : "BIOGRAPHICAL RECORD"}</span>
            </h3>
            {isEditingBio ? (
              <div className="space-y-2">
                <textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  placeholder={language === "fr" ? "Présentez-vous..." : "Describe your role..."}
                  className="w-full bg-brand-white border border-brand-border p-2.5 text-xs text-brand-dark focus:border-brand-dark font-serif"
                  rows={4}
                />
                <button
                  onClick={saveBio}
                  className="w-full bg-[#E85D42] text-white font-mono text-[9px] font-black uppercase py-2 tracking-widest border-none cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  {language === "fr" ? "ENREGISTRER" : "SAVE BIO"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-brand-dark font-serif leading-relaxed italic">
                {targetUser.bio || (language === "fr" ? "« Aucune note biographique n'a été spécifiée par ce membre. »" : "« No secure biographical data logs registered. »")}
              </p>
            )}
          </div>

          {/* Privacy Gated Content Block */}
          {!canViewDetails ? (
            <div className="square-card p-5 bg-zinc-950 text-zinc-100 border border-zinc-900 flex flex-col items-center justify-center text-center py-10">
              <LockKeyhole size={30} className="text-[#E85D42] mb-3" style={{ color: accentColor }} />
              <p className="text-[10px] font-mono uppercase font-black tracking-widest text-zinc-300">
                {language === "fr" ? "DOSSIER CLASSIFIÉ" : "SECURED LEDGER"}
              </p>
              <p className="text-[9px] text-zinc-400 mt-2 font-serif max-w-[200px] leading-relaxed">
                {language === "fr" 
                  ? "Les statistiques, médailles et favoris de ce membre ont été cachés pour des raisons de confidentialité."
                  : "Statistical counters, accolades, and bookmark records are classified per member request."}
              </p>
            </div>
          ) : (
            <>
              {/* Bento Stats */}
              <div className="square-card p-5 bg-brand-white border border-brand-border/15">
                <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-muted mb-4">
                  {language === "fr" ? "STATISTIQUES DE LECTURE" : "READING STATISTICS"}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Streak Card */}
                  <div className="p-3 bg-brand-soft/45 border border-brand-border/25 font-mono text-left">
                    <span className="text-[8px] font-bold text-brand-muted block uppercase tracking-wider">{language === "fr" ? "SÉRIE EN COURS" : "STREAK"}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Flame size={14} className="text-[#E85D42]" style={{ color: accentColor }} />
                      <span className="text-xl font-bold text-brand-dark">{targetUser.streak ?? 5}d</span>
                    </div>
                  </div>

                  {/* Reading Time Card */}
                  <div className="p-3 bg-brand-soft/45 border border-brand-border/25 font-mono text-left">
                    <span className="text-[8px] font-bold text-brand-muted block uppercase tracking-wider">{language === "fr" ? "TEMPS DE LECTURE" : "READING TIME"}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock size={14} className="text-amber-500" />
                      <span className="text-xl font-bold text-brand-dark">{targetUser.readingTime ?? 120}m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accolades Showcase */}
              <div className="square-card p-5 bg-brand-white border border-brand-border/15">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-muted">
                    {language === "fr" ? "BADGES ET CERTIFICATS" : "BADGES & CERTIFICATES"}
                  </h3>
                  <span className="text-[9px] font-mono text-brand-dark font-bold">
                    {targetUser.accolades?.length || 0}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {DETAILED_ACCOLADES.map((badge) => {
                    const isEarned = targetUser.accolades?.includes(badge.id);
                    const canAlter = isSelf || isAdmin;
                    
                    return (
                      <div 
                        key={badge.id}
                        onClick={() => canAlter && toggleAccolade(badge.id)}
                        className={`flex items-start gap-3 p-2.5 border transition-all rounded-none ${
                          isEarned 
                            ? `${badge.color} cursor-pointer` 
                            : "border-brand-border/20 bg-zinc-50/20 opacity-30 cursor-not-allowed"
                        } ${canAlter ? "hover:scale-[1.01]" : ""}`}
                        title={canAlter ? (language === "fr" ? "Cliquer pour basculer" : "Click to toggle") : undefined}
                      >
                        <div className="p-1 bg-white/65 shrink-0 border border-brand-border/20">
                          {badge.icon(16)}
                        </div>
                        <div className="text-left">
                          <span className="text-[9.5px] font-bold uppercase block tracking-wide">
                            {badge.title[language] || badge.title.fr}
                          </span>
                          <p className="text-[8.5px] text-brand-muted mt-0.5 leading-tight font-serif">
                            {badge.desc[language] || badge.desc.fr}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Right Column (Span 2): Shared bookmarks & statements history */}
        <div className="space-y-6 lg:col-span-2">
          
          {canViewDetails ? (
            <>
              {/* Saved Dossiers / Articles */}
              <div className="square-card p-5 bg-brand-white border border-brand-border/15">
                <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-muted mb-4 flex items-center gap-1.5">
                  <Bookmark size={12} style={{ color: accentColor }} />
                  <span>{language === "fr" ? "DOSSIERS ENREGISTRÉS" : "SECURED STUDY ARCHIVES"}</span>
                </h3>

                {isSelf ? (
                  // Real saved articles for logged-in viewer
                  savedArticles && savedArticles.length > 0 ? (
                    <div className="divide-y divide-brand-border/10">
                      {articles.filter(a => savedArticles.includes(a.id)).map(art => (
                        <div key={art.id} className="py-3 flex justify-between items-center gap-3">
                          <Link 
                            to={`/article/${art.slug}`}
                            className="font-serif font-black text-xs text-brand-dark hover:underline truncate"
                          >
                            [{art.category}] {art.title[language] || art.title.fr}
                          </Link>
                          <button
                            onClick={() => toggleSavedArticle(art.id)}
                            className="text-[8.5px] font-mono font-bold uppercase tracking-wider text-[#E85D42] hover:underline cursor-pointer border-none bg-transparent"
                            style={{ color: accentColor }}
                          >
                            {language === "fr" ? "RETIRER" : "REMOVE"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] font-mono text-brand-muted italic py-4">
                      {language === "fr" ? "Aucun dossier archivé pour l'instant." : "No strategic archives catalogued."}
                    </p>
                  )
                ) : (
                  // For other profiles, show high-level mocked analytical reading recommendations or dynamic read history
                  <div className="space-y-3 font-serif">
                    <p className="text-[10px] font-mono text-brand-muted italic">
                      {language === "fr" 
                        ? "Sujets d'intérêts et dossiers consultés récemment par ce membre :" 
                        : "Strategic investigation reports consulted recently by this member:"}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 font-mono text-[9px]">
                      {articles.slice(0, 3).map((art, idx) => (
                        <Link 
                          key={art.id}
                          to={`/article/${art.slug}`}
                          className="p-3 bg-brand-soft/30 border border-brand-border/20 hover:border-brand-dark transition-all rounded-none flex items-center justify-between"
                        >
                          <span className="font-bold uppercase truncate max-w-[150px]">{art.title[language] || art.title.fr}</span>
                          <span className="text-[7.5px] font-semibold text-zinc-500 dark:text-zinc-400">#0{idx+1}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Public comments / statement history */}
              <div className="square-card p-5 bg-brand-white border border-brand-border/15">
                <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-muted mb-4 flex items-center gap-1.5">
                  <MessageCircle size={12} />
                  <span>{language === "fr" ? "DÉCLARATIONS & COMMENTAIRES PUBLICS" : "PUBLIC DEFENSE DISPATCHES"}</span>
                </h3>

                {userComments.length > 0 ? (
                  <div className="space-y-4">
                    {userComments.map(c => {
                      const relatedArticle = articles.find(a => a.id === c.articleId || a.slug === c.articleId);
                      return (
                        <div key={c.id} className="p-4 bg-brand-soft/25 border border-brand-border/15 text-left rounded-none">
                          <div className="flex justify-between items-center gap-2 mb-2 font-mono text-[8px] text-brand-muted font-bold uppercase tracking-wider">
                            <span>
                              {language === "fr" ? "SUR LE DOSSIER :" : "ON DOSSIER : "}{" "}
                              {relatedArticle ? (
                                <Link to={`/article/${relatedArticle.slug}`} className="text-zinc-700 underline font-black">
                                  {relatedArticle.title[language] || relatedArticle.title.fr}
                                </Link>
                              ) : "Général"}
                            </span>
                            <span>{c.date}</span>
                          </div>
                          <p className="text-xs text-brand-dark italic font-serif leading-relaxed">
                            "{getSafeText(c.text, language)}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] font-mono text-brand-muted italic py-6 text-center">
                    {language === "fr" 
                      ? "Ce membre n'a émis aucune déclaration publique pour le moment." 
                      : "This member has not logged any verified statements yet."}
                  </p>
                )}
              </div>
              {/* Notification Setup Preferences Panel */}
              {isSelf && (
                <div className="mt-6">
                  <NotificationSetupPanel />
                </div>
              )}
            </>
          ) : (
            <div className="square-card p-10 bg-brand-soft/25 border border-brand-border/15 flex flex-col items-center justify-center text-center py-24">
              <Lock size={28} className="text-brand-muted mb-3" />
              <p className="text-[10px] font-mono uppercase font-black tracking-widest text-brand-muted">
                {language === "fr" ? "CONTENU CONFIDENTIEL DE MEMBRE" : "MEMBER DOSSIER UNDER LOCK"}
              </p>
              <p className="text-xs text-brand-muted mt-2 font-serif max-w-sm leading-relaxed">
                {language === "fr"
                  ? "Vous devez être ami avec ce membre pour accéder à son journal d'activités, ses favoris et ses déclarations publiques."
                  : "Establishing a network link (adding as contact) is required to access activity trackers, archives, and statements."}
              </p>
            </div>
          )}

        </div>

      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-950 border border-brand-border p-6 max-w-md w-full relative">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand-dark dark:text-zinc-100 mb-2">
              {language === "fr" ? "SIGNALER LE COMPTE MEMBRE" : "REPORT MEMBER ACCOUNT"}
            </h3>
            <p className="text-[10px] text-brand-muted font-mono mb-4">
              {language === "fr" ? "Sujet :" : "Subject :"} {targetUser.name} ({targetUser.email})
            </p>
            
            <form onSubmit={handleReport} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                  {language === "fr" ? "Motif de signalement" : "Reason for reporting"}
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-brand-border p-2 text-xs font-bold"
                >
                  <option value="">-- {language === "fr" ? "Choisir..." : "Select..."} --</option>
                  <option value="harassment">{language === "fr" ? "Harcèlement ou dénigrement" : "Harassment or bullying"}</option>
                  <option value="spam">{language === "fr" ? "Spam ou propagande" : "Spam or self-promotion"}</option>
                  <option value="fake_info">{language === "fr" ? "Désinformation manifeste" : "Misinformation / Fake news"}</option>
                  <option value="hate_speech">{language === "fr" ? "Discours de haine" : "Hate speech"}</option>
                  <option value="other">{language === "fr" ? "Autre infraction à la charte" : "Other charter breach"}</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                  {language === "fr" ? "Détails complémentaires (Optionnel)" : "Additional Details (Optional)"}
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-brand-border p-2 text-xs font-serif"
                  rows={3}
                  placeholder={language === "fr" ? "Expliquez brièvement l'infraction..." : "Briefly describe the infraction..."}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider font-mono border border-brand-border hover:bg-zinc-100 text-brand-dark dark:text-zinc-200"
                >
                  {language === "fr" ? "Annuler" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider font-mono text-white bg-rose-600 hover:bg-rose-700 border-none"
                >
                  {language === "fr" ? "Soumettre le Ticket" : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Share Modal */}
      <InternalShareModal
        isOpen={showInternalShareModal}
        onClose={() => setShowInternalShareModal(false)}
        initialItem={{
          type: "profile",
          id: targetUser.email,
          title: targetUser.name,
          link: `/profile/${encodeURIComponent(targetUser.email)}`,
          subtitle: targetUser.email,
          image: targetUser.avatarUrl
        }}
      />

    </div>
  );
}
