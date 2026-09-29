import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../store";
import { compressImageFile, sanitizeFirestorePayload } from "../lib/imageUtils";
import { getSafeText } from "../lib/utils";
import { fetchUserProfile, saveUserProfileFields, isAdminProfile, setUserRole as setUserRoleCloud } from '../firebase/auth';
import {
  saveFirestoreDoc,
  deleteFirestoreDoc,
  deleteRelationPair,
  legacyRelationKeys,
  friendsKey,
  requestKey,
  typedRelationKey,
  fetchFirestoreCollection,
  subscribeToFriendRequests,
} from '../firebase/db';
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
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [mutes, setMutes] = useState<string[]>([]);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const currentSettings = siteSettings || { accentColor: "#E85D42" };
  const accentColor = currentSettings.accentColor;

  // Relationship state — loaded from Firestore.
  // FIX (relations not persistent): single canonical collection per relation
  // type, read by FIELDS (never by doc key). Keys are written with friendsKey()/
  // requestKey() so writes and deletes always resolve to the same RTDB path,
  // and every delete sweeps legacy key variants (deleteRelationPair).
  const loadRelations = async (collection: string, byField: string, key: string, valueField: string, type?: string): Promise<string[]> => {
    const rows: any[] = await fetchFirestoreCollection(collection);
    const k = key.toLowerCase().trim();
    // Deduplicate — counts must be strictly real (one row per unique relation).
    // Self-rows (a==b) are ignored: an optimistic write that hasn't synced yet
    // must never make "following" and "followers" disagree with "friends".
    return Array.from(new Set(rows
      .filter((r: any) => String(r?.[byField] || "").toLowerCase().trim() === k && (!type || String(r?.type || "").toLowerCase() === type))
      .map((r: any) => String(r?.[valueField] || "").toLowerCase().trim())
      .filter((v: string) => Boolean(v) && v !== k)));
  };

  // FIX (following/followers were inverted): a FOLLOW record is authored by the
  // FOLLOWER — it stores user_id=<follower> + follower_email=<followed>.
  // "Following" (accounts I follow) = rows where user_id == ME, read follower_email.
  // "Followers" (accounts following X) = rows where follower_email == X, read user_id.

  // Following of CURRENT user (accounts they follow)
  useEffect(() => {
    if (!readerProfile?.email) return;
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const load = async () => setFollowing(await loadRelations('followers', 'user_id', myEmail, 'follower_email'));
    load();
  }, [readerProfile?.email]);

  // Followers of TARGET user (people whose user_id follows the target:
  // in the 'followers' collection, user_id = follower, follower_email = followed)
  useEffect(() => {
    const dec = decodeURIComponent(email || "").toLowerCase().trim();
    if (!dec) return;
    const load = async () => setFollowers(await loadRelations('followers', 'follower_email', dec, 'user_id'));
    load();
  }, [email]);

  // Following of TARGET user
  useEffect(() => {
    const dec = decodeURIComponent(email || "").toLowerCase().trim();
    if (!dec) return;
    const load = async () => setTargetFollowing(await loadRelations('followers', 'user_id', dec, 'follower_email'));
    load();
  }, [email]);

  // Friends of TARGET user + my pending friend requests
  // (self-contained: must not reference consts declared after the component's
  // early-return, which would throw a temporal-dead-zone ReferenceError)
  const [targetFriends, setTargetFriends] = useState<string[]>([]);
  const decodedEmailMemo = decodeURIComponent(email || "").toLowerCase().trim();
  // Realtime listener for friend_requests + one-shot load, both registered at
  // top level (NOT nested inside a callback — hooks must not be called inside
  // other hooks' callbacks, which would throw React error #321).
  let unsubFriendRequestsPP: (() => void) | undefined;
  useEffect(() => {
    if (!decodedEmailMemo) return;
    const me = ((readerProfile?.email || '') as string).toLowerCase().trim();
    const load = async () => {
      setTargetFriends(await loadRelations('friends', 'user_id', decodedEmailMemo, 'friend_email', 'friend'));
      try {
        if (!me) { setIncomingRequests([]); setOutgoingRequests([]); return; }
        const rows: any[] = await fetchFirestoreCollection('friend_requests');
        const mine = rows.filter((r: any) => {
          const from = String(r?.from || '').toLowerCase().trim();
          const to = String(r?.to || '').toLowerCase().trim();
          return from === me || to === me;
        });
        setIncomingRequests(mine.filter((r: any) => String(r?.to || '').toLowerCase().trim() === me && r?.status === 'pending'));
        setOutgoingRequests(mine.filter((r: any) => String(r?.from || '').toLowerCase().trim() === me && r?.status === 'pending'));
      } catch (err) {
        console.warn('[Profile] Friend requests load notice:', err);
      }
    };
    load();
  }, [decodedEmailMemo, readerProfile?.email]);

  useEffect(() => {
    const me = ((readerProfile?.email || '') as string).toLowerCase().trim();
    if (!me) return;
    unsubFriendRequestsPP = subscribeToFriendRequests(
      (rows) => {
        try {
          const mine = rows.filter((r: any) => {
            const from = String(r?.from || '').toLowerCase().trim();
            const to = String(r?.to || '').toLowerCase().trim();
            return from === me || to === me;
          });
          setIncomingRequests(mine.filter((r: any) => String(r?.to || '').toLowerCase().trim() === me && r?.status === 'pending'));
          setOutgoingRequests(mine.filter((r: any) => String(r?.from || '').toLowerCase().trim() === me && r?.status === 'pending'));
          // Refresh friendship state (in case a request was confirmed/rejected)
          loadRelations('friends', 'user_id', decodedEmailMemo, 'friend_email', 'friend')
            .then(setTargetFriends)
            .catch(() => {});
        } catch (err) {
          console.warn('[Profile] Friend requests realtime error:', err);
        }
      },
      (err) => console.warn('[Profile] Friend requests subscription error:', err)
    );
    return () => unsubFriendRequestsPP?.();
  }, [decodedEmailMemo, readerProfile?.email]);

  // Blocks of CURRENT user
  useEffect(() => {
    if (!readerProfile?.email) return;
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const load = async () => setBlocks(await loadRelations('blocks', 'user_id', myEmail, 'blocked_email', 'block'));
    load();
  }, [readerProfile?.email]);

  // Mutes of CURRENT user
  useEffect(() => {
    if (!readerProfile?.email) return;
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const load = async () => setMutes(await loadRelations('blocks', 'user_id', myEmail, 'blocked_email', 'mute'));
    load();
  }, [readerProfile?.email]);

  // Check if TARGET user has blocked CURRENT user
  useEffect(() => {
    const dec = decodeURIComponent(email || "").toLowerCase().trim();
    if (!dec || !readerProfile?.email) return;
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const check = async () => {
      const rows: any[] = await fetchFirestoreCollection('blocks');
      setHasBlockedMe(rows.some(r => String(r?.user_id || "").toLowerCase().trim() === dec && String(r?.blocked_email || "").toLowerCase().trim() === myEmail && String(r?.type || "block").toLowerCase() === 'block'));
    };
    check();
  }, [email, readerProfile?.email]);

  // Friends of CURRENT user (FIX: value field is friend_email, not email)
  useEffect(() => {
    if (!readerProfile?.email) return;
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const load = async () => setFriends(await loadRelations('friends', 'user_id', myEmail, 'friend_email', 'friend'));
    load();
  }, [readerProfile?.email]);

  // Handle finding target user
  const decodedEmail = decodeURIComponent(email || "").toLowerCase().trim();
  const [targetUserData, setTargetUserData] = useState<any | null>(null);

  useEffect(() => {
    if (!decodedEmail) return;
    const loadUser = async () => {
      try {
        const u = await fetchUserProfile(decodedEmail);
        if (u) {
          setTargetUserData({ id: u.email, ...u });
        } else {
          setTargetUserData(null);
        }
      } catch (err) {
        console.warn('Error loading user profile:', err);
        setTargetUserData(null);
      }
    };
    loadUser();
  }, [decodedEmail]);

  const fallbackUser = allUsers.find(u => {
    const uEmail = (u.email || "").toLowerCase().trim();
    const uId = ((u as any).id || "").toLowerCase().trim();
    return uEmail === decodedEmail || uId === decodedEmail || encodeURIComponent(uEmail) === decodedEmail;
  });

  const targetUser = targetUserData ? {
    ...fallbackUser,
    ...targetUserData,
    email: targetUserData.email || fallbackUser?.email || decodedEmail,
    hideEmail: targetUserData.hideEmail !== undefined ? targetUserData.hideEmail : fallbackUser?.hideEmail,
    hidePersonalInfo: targetUserData.hidePersonalInfo !== undefined ? targetUserData.hidePersonalInfo : fallbackUser?.hidePersonalInfo
  } : fallbackUser;

  // Initialize bio editing
  useEffect(() => {
    if (targetUser) {
      setEditedBio(targetUser.bio || "");
    }
  }, [targetUser?.bio]);

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

  const userEmailLow = readerProfile?.email ? ((readerProfile.email ?? '').toLowerCase()).trim() : "";
  const targetEmailLow = (targetUser.email || decodedEmail).toLowerCase().trim();
  const isSelf = userEmailLow.length > 0 && userEmailLow === targetEmailLow;
  const isFriend = friends.includes(targetEmailLow) || friends.includes(decodedEmail);
  const isAdmin = isAdminProfile(readerProfile);

  // Privacy gate rule: show public info always; hide detailed stats/accolades/badges
  // when target user has set their profile to private, unless viewer is the owner or admin.
  const canViewDetails = isSelf || isAdmin || !targetUser.hidePersonalInfo;

  // Friend-request flow: adding a friend sends a REQUEST; friendship is only
  // established once the other account CONFIRMS. Data lives in the
  // `friend_requests` collection: {id, from, to, status: 'pending'|'accepted', created_at}
  //
  // CANONICAL KEY FORMAT: `${from}_${to}` where `from` = requester, `to` = recipient.
  // This matches the format used by AccountDrawer so both pages operate on the same
  // RTDB records. Older records may exist under `freq_${a}_${b}` — confirmFriendRequest
  // handles both for backward compatibility.
  const friendRequestId = (a: string, b: string) => `${a}_${b}`;

  const loadPendingRequests = async () => {
    if (!userEmailLow) { setIncomingRequests([]); setOutgoingRequests([]); return; }
    try {
      const rows: any[] = await fetchFirestoreCollection('friend_requests');
      const mine = rows.filter((r: any) => {
        const from = String(r?.from || '').toLowerCase().trim();
        const to = String(r?.to || '').toLowerCase().trim();
        return from === userEmailLow || to === userEmailLow;
      });
      setIncomingRequests(mine.filter((r: any) => String(r?.to || '').toLowerCase().trim() === userEmailLow && r?.status === 'pending'));
      setOutgoingRequests(mine.filter((r: any) => String(r?.from || '').toLowerCase().trim() === userEmailLow && r?.status === 'pending'));
    } catch (err) {
      console.warn('[Profile] Friend requests load notice:', err);
    }
  };

  const confirmFriendRequest = async (fromEmail: string) => {
    const me = userEmailLow;
    // Helper: warn (not crash) when the cloud write is rejected, but ALWAYS
    // update local state so the UI stays consistent — the realtime listener
    // reconciles from RTDB when the write lands, and legacy sweeps clean up
    // duplicates. An unchecked write that fails (permission/offline) while the
    // UI pretends success is exactly the "relations not persistent" bug.
    const persistOrWarn = async (label: string, p: Promise<boolean>) => {
      try {
        const ok = await p;
        if (ok !== true) {
          console.warn(`[Profile] ${label}: cloud write not confirmed — local state kept, will reconcile.`);
          setErrorMsg(language === "fr"
            ? "Écriture cloud non confirmée — état local conservé, resynchronisation en cours."
            : "Cloud write not confirmed — local state kept, re-syncing.");
          setTimeout(() => setErrorMsg(""), 5000);
        }
        return ok === true;
      } catch (err) {
        console.warn(`[Profile] ${label} failed:`, err);
        return false;
      }
    };
    try {
      const ts = Date.now();
      // Establish the mutual friendship (both directions, canonical keys).
      await persistOrWarn('confirm: friends forward',
        saveFirestoreDoc('friends', friendsKey(me, fromEmail), { id: friendsKey(me, fromEmail), user_id: me, friend_email: fromEmail, email: fromEmail, connected_at: ts, type: 'friend' }));
      await persistOrWarn('confirm: friends reverse',
        saveFirestoreDoc('friends', friendsKey(fromEmail, me), { id: friendsKey(fromEmail, me), user_id: fromEmail, friend_email: me, email: me, connected_at: ts, type: 'friend' }));
      // Mark request accepted on the canonical key + sweep legacy key variants
      // (cross-page/backward compat: original pending request may predate the fix).
      // NOTE: legacyRelationKeys() covers pre-fix formats only (never the
      // canonical '__' key), so the accepted record below is never deleted.
      await persistOrWarn('confirm: request accepted',
        saveFirestoreDoc('friend_requests', requestKey(fromEmail, me), {
          id: requestKey(fromEmail, me), from: fromEmail, to: me,
          status: 'accepted', created_at: ts, accepted_at: ts,
        }));
      try {
        for (const legacyId of legacyRelationKeys(fromEmail, me)) {
          await deleteFirestoreDoc('friend_requests', legacyId).catch(() => {});
        }
      } catch { /* best-effort legacy sweep */ }
      // Refresh relationship state
      setTargetFriends(await loadRelations('friends', 'user_id', targetEmailLow, 'friend_email', 'friend'));
      await loadPendingRequests();
      useStore().addFriend({ id: fromEmail, email: fromEmail, name: fromEmail.split('@')[0], status: 'friend' } as any);
      useStore().addNotification({
        id: 'notif-friend-accepted-' + Date.now(),
        email: fromEmail,
        text: {
          fr: `${targetUser.name || me} a confirmé votre demande d'amitié. Vous êtes maintenant amis !`,
          en: `${targetUser.name || me} confirmed your friend request. You are now friends!`
        },
        date: new Date().toISOString().split('T')[0],
        isRead: false,
        category: 'network',
        groupKey: `network:${me}`,
        actorEmail: me
      });
      setSuccessMsg(language === "fr" ? "Demande confirmée — vous êtes désormais amis !" : "Request confirmed — you are now friends!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error('[Profile] Confirm friend request failed:', err);
    }
  };

  const handleFriendship = async () => {
    if (!readerProfile?.email) {
      setAuthTab("login");
      setShowSignUpModal(true);
      return;
    }
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const targetEmail = ((targetUser.email ?? '').toLowerCase()).trim();
    if (myEmail === targetEmail) return;
    const a = myEmail, b = targetEmail;
    const requestId = requestKey(a, b);
    try {
      if (isFriend) {
        // Remove friendship both directions (+ legacy key variants)
        await deleteRelationPair('friends', a, b);
        setFriends((friends ?? []).filter(f => f !== b));
        setTargetFriends((prev) => prev.filter(f => f !== a));
        useStore().deleteFriend(b);
        setSuccessMsg(language === "fr" ? "Contact retiré de votre réseau." : "Contact removed from your secure network.");
      } else if (incomingRequests.some((r: any) => String(r?.from || '').toLowerCase().trim() === b)) {
        // The other account already requested me → confirm it
        await confirmFriendRequest(b);
        return;
      } else if (outgoingRequests.some((r: any) => String(r?.to || '').toLowerCase().trim() === b)) {
        // Cancel my pending outgoing request — delete canonical + legacy keys so
        // neither AccountDrawer nor ProfilePage can resurrect it on reload.
        await deleteRelationPair('friend_requests', a, b);
        setOutgoingRequests(prev => prev.filter((r: any) => String(r?.to || '').toLowerCase().trim() !== b));
        setSuccessMsg(language === "fr" ? "Demande d'amitié annulée." : "Friend request cancelled.");
      } else {
        // Send a new friend request (friendship NOT established yet).
        // Check the write result: on failure keep the request VISIBLE locally
        // (optimistic pending) instead of dropping it — the realtime listener
        // reconciles once the server confirms, so reload never loses it.
        const ok = await saveFirestoreDoc('friend_requests', requestId, { id: requestId, from: a, to: b, status: 'pending', created_at: Date.now() });
        setOutgoingRequests(prev => [...prev, { id: requestId, from: a, to: b, status: ok === true ? 'pending' : 'pending-local' }]);
        if (ok !== true) {
          console.warn('[Profile] friend request cloud write not confirmed — kept locally.');
          setErrorMsg(language === "fr"
            ? "Demande conservée localement — synchronisation en cours."
            : "Request kept locally — syncing.");
          setTimeout(() => setErrorMsg(""), 5000);
        }
        useStore().addNotification({
          id: 'notif-friend-request-' + Date.now(),
          email: b,
          text: {
            fr: `${readerProfile?.name || a} vous a envoyé une demande d'amitié. Confirmez-la depuis son profil.`,
            en: `${readerProfile?.name || a} sent you a friend request. Confirm it from their profile.`
          },
          date: new Date().toISOString().split('T')[0],
          isRead: false,
          category: 'network',
          groupKey: `network:${a}`,
          actorEmail: a
        });
        setSuccessMsg(language === "fr" ? "Demande d'amitié envoyée. En attente de confirmation." : "Friend request sent. Awaiting confirmation.");
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
    if (!readerProfile?.email) {
      setAuthTab("login");
      setShowSignUpModal(true);
      return;
    }
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const targetEmail = ((targetUser.email ?? '').toLowerCase()).trim();
    if (myEmail === targetEmail) return;

    const isFollowing = following.includes(targetEmail);
    try {
      if (isFollowing) {
        // FIX (unfollow not persistent): delete canonical + legacy key variants
        await deleteRelationPair('followers', myEmail, targetEmail);
        setFollowing(following.filter(f => f !== targetEmail));
        setFollowers((followers ?? []).filter(f => f !== myEmail));
        setSuccessMsg(language === "fr" ? "Vous ne suivez plus ce membre." : "Unfollowed member.");
      } else {
        const followKey = friendsKey(myEmail, targetEmail);
        // Check the write: on failure keep the follow VISIBLE locally so the
        // relation is never silently lost — the listener reconciles on confirm.
        const ok = await saveFirestoreDoc('followers', followKey, { id: followKey, user_id: myEmail, follower_email: targetEmail, followed_at: Date.now(), type: 'follow' });
        setFollowing([...new Set([...following, targetEmail])]);
        setFollowers((prev) => (prev.includes(myEmail) ? prev : [...prev, myEmail]));
        if (ok !== true) {
          console.warn('[Profile] follow cloud write not confirmed — kept locally.');
          setErrorMsg(language === "fr" ? "Suivi conservé localement — synchronisation en cours." : "Follow kept locally — syncing.");
          setTimeout(() => setErrorMsg(""), 5000);
        }
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
    if (!readerProfile?.email) {
      setAuthTab("login");
      setShowSignUpModal(true);
      return;
    }
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const targetEmail = ((targetUser.email ?? '').toLowerCase()).trim();
    if (myEmail === targetEmail) return;

    const isCurrentlyBlocked = blocks.includes(targetEmail);
    try {
      if (isCurrentlyBlocked) {
        // Type-scoped delete: only removes the BLOCK, never the mute that
        // may share this pair (blocks collection holds both relations).
        await deleteRelationPair('blocks', myEmail, targetEmail, 'block');
        setBlocks(blocks.filter(x => x !== targetEmail));
        setSuccessMsg(language === "fr" ? "Membre débloqué." : "Unblocked member.");
      } else {
        // Typed canonical key — block and mute for the same pair coexist
        // instead of overwriting each other under a shared friendsKey.
        const blockKey = typedRelationKey('block', myEmail, targetEmail);
        const ok = await saveFirestoreDoc('blocks', blockKey, { id: blockKey, user_id: myEmail, blocked_email: targetEmail, created_at: new Date().toISOString(), type: 'block' });
        setBlocks([...new Set([...blocks, targetEmail])]);
        if (ok !== true) {
          console.warn('[Profile] block cloud write not confirmed — kept locally.');
        }
        setSuccessMsg(language === "fr" ? "Membre bloqué avec succès." : "Blocked member successfully.");
        // Auto-remove friend and follow connections on block
        await deleteRelationPair('friends', myEmail, targetEmail);
        await deleteRelationPair('followers', myEmail, targetEmail);
        setFriends((friends ?? []).filter(f => f !== targetEmail));
        setFollowing(following.filter(f => f !== targetEmail));
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error setting block status:", err);
    }
  };

  // Mute/Unmute action
  const handleMute = async () => {
    if (!readerProfile?.email) {
      setAuthTab("login");
      setShowSignUpModal(true);
      return;
    }
    const myEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
    const targetEmail = ((targetUser.email ?? '').toLowerCase()).trim();
    if (myEmail === targetEmail) return;

    const isCurrentlyMuted = mutes.includes(targetEmail);
    try {
      if (isCurrentlyMuted) {
        // Type-scoped delete: only removes the MUTE, never the block.
        await deleteRelationPair('blocks', myEmail, targetEmail, 'mute');
        setMutes(mutes.filter(x => x !== targetEmail));
        setSuccessMsg(language === "fr" ? "Notifications réactivées." : "Unmuted member.");
      } else {
        const muteKey = typedRelationKey('mute', myEmail, targetEmail);
        await saveFirestoreDoc('blocks', muteKey, { id: muteKey, user_id: myEmail, blocked_email: targetEmail, created_at: new Date().toISOString(), type: 'mute' });
        setMutes([...new Set([...mutes, targetEmail])]);
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
    if (!readerProfile?.email) {
      setAuthTab("login");
      setShowSignUpModal(true);
      return;
    }
    if (!reportReason) return;

    const reportId = "report-" + Date.now();
    try {
      await saveFirestoreDoc('reports', reportId, {
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

  // Helper to durably save user fields to Central Database (Firebase RTDB)
  const persistUserUpdate = async (userEmail: string, payload: Record<string, any>) => {
    const cleanEmail = userEmail.toLowerCase().trim();
    try {
      const clean = await sanitizeFirestorePayload(payload);
      // FIX (avatar / cover / privacy resetting after a deploy, and desktop
      // disagreeing with phone): this called `syncUserProfile()`, which is the
      // LOGIN path. It rebuilds a whole profile object and `set()`s it, so a
      // single-field edit round-tripped through it could drop or default the
      // other fields, and it derived its write key from `readerProfile.uid`,
      // which is not always the canonical uid.
      //
      // `saveUserProfileFields()` is the dedicated, whitelist-guarded writer:
      // it merges into the existing record, touches ONLY the fields being
      // edited, and resolves every key variant for the account. Route all
      // profile edits through it so this surface and the account drawer share
      // one write path.
      const ok = await saveUserProfileFields(cleanEmail, clean);
      if (!ok) console.warn("[ProfilePage] profile update reported no write:", cleanEmail);
    } catch (err) {
      console.warn("[Profile update notice - Central]:", err);
    }
  };

  // Profile image changes (Avatar & Cover photo)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatarUrl" | "coverPhotoUrl") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isCover = type === "coverPhotoUrl";
      const compressedDataUrl = await compressImageFile(file, isCover ? 800 : 400, isCover ? 500 : 400, 0.75);
      const userEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
      await persistUserUpdate(userEmail, { [type]: compressedDataUrl });
      
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
      const userEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
      await persistUserUpdate(userEmail, { hidePersonalInfo: newStatus });
      
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
      const userEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
      await persistUserUpdate(userEmail, { hideEmail: newStatus });
      
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
      const userEmail = ((readerProfile.email ?? '').toLowerCase()).trim();
      await persistUserUpdate(userEmail, { bio: editedBio });
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
      const userEmail = ((targetUser.email ?? '').toLowerCase()).trim();
      await persistUserUpdate(userEmail, { accolades: updatedAccolades });
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
  const userComments = (comments ?? []).filter(c => c.email?.toLowerCase().trim() === decodedEmail);

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
                 targetUser.email === "admin@senperspective.com" || 
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
                      ? `${((targetUser.email ?? '').toLowerCase())} (${language === "fr" ? "Masqué aux visiteurs" : "Hidden from visitors"})`
                      : ((targetUser.email ?? '').toLowerCase()))}
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

            {/* Followers, Following and Friends stats */}
            <div className="flex gap-3 pt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400 items-center mb-1">
              <div className="bg-zinc-100 dark:bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{followers.length}</span> {language === "fr" ? "abonnés" : "followers"}
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{targetFollowing.length}</span> {language === "fr" ? "abonnements" : "following"}
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{targetFriends.length}</span> {language === "fr" ? "amis" : "friends"}
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

                    {/* Friend request button — friendship requires the other account's confirmation */}
                    <button
                      onClick={handleFriendship}
                      className={`px-3.5 py-2 font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all rounded-lg border shadow-xs ${
                        isFriend
                          ? "bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800"
                          : incomingRequests.some((r: any) => String(r?.from || '').toLowerCase().trim() === ((targetUser.email ?? '').toLowerCase()).trim())
                            ? "bg-amber-500 text-white border-amber-500 hover:opacity-90"
                            : outgoingRequests.some((r: any) => String(r?.to || '').toLowerCase().trim() === ((targetUser.email ?? '').toLowerCase()).trim())
                              ? "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                              : "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 hover:opacity-90"
                      }`}
                    >
                      {isFriend ? (
                        <>
                          <UserMinus size={13} />
                          <span>{language === "fr" ? "RETIRER DES AMIS" : "REMOVE FRIEND"}</span>
                        </>
                      ) : incomingRequests.some((r: any) => String(r?.from || '').toLowerCase().trim() === ((targetUser.email ?? '').toLowerCase()).trim()) ? (
                        <>
                          <UserPlus size={13} />
                          <span>{language === "fr" ? "CONFIRMER LA DEMANDE" : "CONFIRM REQUEST"}</span>
                        </>
                      ) : outgoingRequests.some((r: any) => String(r?.to || '').toLowerCase().trim() === ((targetUser.email ?? '').toLowerCase()).trim()) ? (
                        <>
                          <UserPlus size={13} />
                          <span>{language === "fr" ? "DEMANDE ENVOYÉE — ANNULER" : "REQUEST SENT — CANCEL"}</span>
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
                        following.includes(((targetUser.email ?? '').toLowerCase()).trim()) 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" 
                          : "bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <Activity size={13} />
                      <span>{following.includes(((targetUser.email ?? '').toLowerCase()).trim()) ? (language === "fr" ? "ABONNÉ(E)" : "FOLLOWING") : (language === "fr" ? "SUIVRE" : "FOLLOW")}</span>
                    </button>
                  </div>

                  {/* Row 2: Secondary Moderation Actions */}
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    {/* Mute button */}
                    <button
                      onClick={handleMute}
                      className={`px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all rounded-md border shadow-xs ${
                        mutes.includes(((targetUser.email ?? '').toLowerCase()).trim()) 
                          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" 
                          : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      }`}
                      title={language === "fr" ? "Masquer les notifications" : "Mute notifications"}
                    >
                      <EyeOff size={11} />
                      <span>{mutes.includes(((targetUser.email ?? '').toLowerCase()).trim()) ? (language === "fr" ? "MASQUÉ" : "MUTED") : (language === "fr" ? "MASQUER" : "MUTE")}</span>
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
                  savedArticles && (savedArticles ?? []).length > 0 ? (
                    <div className="divide-y divide-brand-border/10">
                      {(articles ?? []).filter(a => savedArticles.includes(a.id)).map(art => (
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
                      {(articles ?? []).slice(0, 3).map((art, idx) => (
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
                      const relatedArticle = (articles ?? []).find(a => a.id === c.articleId || a.slug === c.articleId);
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

