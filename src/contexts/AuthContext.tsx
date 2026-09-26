import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  onAuthStateChanged,
  verifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { useStore, loadSeenDmIds, rememberSeenDmIds } from '../store';
import { subscribeToMessages } from '../firebase/db';
import {
  AppUserProfile,
  syncUserProfile,
  signInEmail,
  registerEmail,
  signInGoogle,
  signOutUser,
  resetPasswordEmail,
  isBootstrapAdmin,
  fetchAllUsers,
} from '../firebase/auth';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: AppUserProfile | null;
  allUsers: AppUserProfile[];
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string, ...rest: any[]) => Promise<AppUserProfile>;
  loginWithEmail: (email: string, pass: string, ...rest: any[]) => Promise<AppUserProfile>;
  register: (email: string, pass: string, name: string) => Promise<AppUserProfile>;
  registerWithEmail: (email: string, pass: string, name: string, role?: string, avatarUrl?: string, authType?: string, pin?: string, ...rest: any[]) => Promise<AppUserProfile>;
  loginWithGoogle: () => Promise<AppUserProfile>;
  logout: () => Promise<void>;
  logoutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (oobCode: string, newPassword: string) => Promise<void>;
  resetUserPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = Boolean(
    profile?.role === 'Admin' ||
    (user?.email && isBootstrapAdmin(user.email))
  );

  const loadDirectory = async () => {
    try {
      const list = await fetchAllUsers();
      if (list && list.length > 0) {
        setAllUsers(list);
        // FIX (role attributions not appearing in profiles): publish the
        // fetched directory into the zustand store's `users` so attributed
        // roles, suspension flags and avatars are visible app-wide, and merge
        // (never wipe) existing local user entries.
        try {
          const storeUsers = useStore.getState().users || [];
          const byEmail = new Map<string, any>();
          storeUsers.forEach((u: any) => {
            const k = (u.email || '').toLowerCase().trim();
            if (k) byEmail.set(k, u);
          });
          list.forEach((u: any) => {
            const k = (u.email || '').toLowerCase().trim();
            if (k) byEmail.set(k, { ...(byEmail.get(k) || {}), ...u });
          });
          useStore.setState({ users: Array.from(byEmail.values()) });
        } catch (e) {
          console.warn('[AuthContext] Store users sync notice:', e);
        }
      }
    } catch (e) {
      // Non-blocking
    }
  };

  // FIX (Account button missing after re-login): the header reads
  // `readerProfile` from the zustand store, not this context's `profile`
  // state. Every successful login must also publish the profile to the store.
  const publishProfileToStore = (userProf: AppUserProfile | null) => {
    if (!userProf) return;
    try {
      useStore.setState({
        readerProfile: {
          id: userProf.uid || userProf.email,
          uid: userProf.uid || userProf.email,
          name: userProf.name || userProf.email?.split('@')[0] || 'Utilisateur',
          email: userProf.email || '',
          avatarUrl: userProf.avatarUrl || 'preset-male',
          coverPhotoUrl: userProf.coverPhotoUrl || (userProf as any).cover_photo_url || '',
          role: userProf.role || 'Membre',
          streak: userProf.streak,
          readingTime: userProf.readingTime,
          bio: userProf.bio,
          accolades: userProf.accolades,
          hideEmail: userProf.hideEmail === true,
          hidePersonalInfo: userProf.hidePersonalInfo === true,
          suspended: userProf.suspended === true,
        },
      });
    } catch (e) {
      console.warn('[AuthContext] Store profile publish notice:', e);
    }
  };

  /** Suspended accounts (flagged by the super admin) must never stay logged in. */
  const enforceNotSuspended = async (userProf: AppUserProfile): Promise<AppUserProfile> => {
    if (userProf && userProf.suspended === true) {
      try { await signOutUser(); } catch {}
      useStore.setState({ readerProfile: null });
      throw new Error('ACCOUNT_SUSPENDED');
    }
    return userProf;
  };

  useEffect(() => {
    loadDirectory();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userProf = await syncUserProfile(firebaseUser);
          await enforceNotSuspended(userProf);
          setProfile(userProf);
          publishProfileToStore(userProf);
          loadDirectory();
        } catch (err: any) {
          if (err?.message === 'ACCOUNT_SUSPENDED') {
            setProfile(null);
            setLoading(false);
            return;
          }
          console.error('[AuthContext] Failed to load user profile from Firestore:', err);
          // Fallback minimal profile
          const fallback: AppUserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
            role: isBootstrapAdmin(firebaseUser.email) ? 'Admin' : 'Membre',
            avatarUrl: firebaseUser.photoURL || 'preset-male',
            streak: 1,
            readingTime: 0,
            accolades: isBootstrapAdmin(firebaseUser.email)
              ? ['verified_identity', 'editorial_board', 'elite_clearance']
              : ['verified_identity'],
          };
          setProfile(fallback);
          publishProfileToStore(fallback);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // FIX (messages between users don't get across): messages were saved to the
  // cloud on send, but NOTHING ever read them back — each device only saw its
  // own local copy, so a message sent on one device never appeared on the
  // recipient's device. This real-time listener streams the signed-in user's
  // conversations from the cloud into the store and keeps them in sync:
  //  - new messages from other devices/users appear instantly (and raise a
  //    notification for messages that arrive while the app is open);
  //  - read flags written on any device propagate to all devices;
  //  - local offline drafts are preserved alongside the cloud history.
  // Requires Firebase Auth (the database rules gate `messages` on auth).
  // Ids of DM rows this device has ALREADY processed. Persisted through
  // loadSeenDmIds/rememberSeenDmIds (localStorage) and held in a ref so the
  // listener closure stays stable: without this, every reload/login rebuilt an
  // empty set and re-announced the whole history — the "random notifications
  // from the same correspondent" storm.
  const seenMessageIdsRef = useRef<Set<string>>(loadSeenDmIds());
  const firstMsgSnapshotRef = useRef(false);
  useEffect(() => {
    const email = profile?.email;
    if (!user || !email) return;
    const myEmail = email.toLowerCase().trim();
    const sessionStart = Date.now();
    firstMsgSnapshotRef.current = false;
    // Seed with what this device already holds so the first cloud snapshot is
    // never mistaken for live traffic.
    (useStore.getState().directMessages || []).forEach((dm: any) => {
      const id = String(dm?.id || '');
      if (id) seenMessageIdsRef.current.add(id);
    });
    const unsub = subscribeToMessages(
      myEmail,
      (cloudMsgs) => {
        try {
          const isFirstSnapshot = !firstMsgSnapshotRef.current;
          firstMsgSnapshotRef.current = true;
          const current = useStore.getState().directMessages || [];
          const cloudById = new Map<string, any>();
          for (const m of cloudMsgs) {
            if (m && m.id != null) cloudById.set(String(m.id), m);
          }
          const merged: any[] = [];
          const seen = new Set<string>();
          // Local first (preserves offline/unsent drafts), swapping in the
          // fresher cloud copy whenever the id exists in the cloud.
          for (const dm of current) {
            const id = String((dm as any)?.id || '');
            if (!id || seen.has(id)) continue;
            if (cloudById.has(id)) merged.push(cloudById.get(id));
            else merged.push(dm);
            seen.add(id);
          }
          // Then append cloud messages this device has never seen.
          for (const m of cloudMsgs) {
            const id = String((m as any)?.id || '');
            if (id && !seen.has(id)) {
              merged.push(m);
              seen.add(id);
            }
          }
          // Chronological order (the UI renders the filtered conversation in
          // array order, so ascending timestamps = correct chat history).
          merged.sort((a: any, b: any) => (a?.timestamp || 0) - (b?.timestamp || 0));
          useStore.setState({ directMessages: merged as any });

          // Notify about genuinely-new incoming messages (skip the initial
          // snapshot so logging in doesn't spam notifications for old chats).
          for (const m of cloudMsgs) {
            const id = String((m as any)?.id || '');
            if (!id || seenMessageIdsRef.current.has(id)) continue;
            seenMessageIdsRef.current.add(id);
            rememberSeenDmIds([id]);
            const sender = String((m as any)?.sender || '').toLowerCase().trim();
            const receiver = String((m as any)?.receiver || '').toLowerCase().trim();
            if (receiver === myEmail && sender && sender !== myEmail) {
              // Backlog guard: a row that already existed when the session
              // started (or that is already read) is history, not an arrival.
              const arrivedAt = Number((m as any)?.timestamp || 0);
              const isBacklog = isFirstSnapshot && arrivedAt > 0 && arrivedAt < sessionStart - 60000;
              if (isBacklog || (m as any)?.read) continue;
              const users = useStore.getState().users || [];
              const senderUser = users.find((u: any) =>
                String(u?.email || '').toLowerCase().trim() === sender);
              const senderLabel = senderUser?.name || sender;
              const lang = useStore.getState().language;
              try {
                useStore.getState().addNotification({
                  id: 'notif-dm-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                  email: myEmail,
                  text: {
                    fr: `Nouveau message de ${senderLabel} : "${String((m as any)?.text || '').slice(0, 40)}"`,
                    en: `New message from ${senderLabel}: "${String((m as any)?.text || '').slice(0, 40)}"`
                  },
                  date: new Date().toISOString().split('T')[0],
                  isRead: false,
                  category: 'messages',
                  link: '/discussion',
                  // One unread line per correspondent — the drawer/hub show the
                  // exact per-account unread counts from the messages themselves.
                  groupKey: `dm:${sender}`,
                  actorEmail: sender
                } as any);
              } catch {}
            }
          }
        } catch (e) {
          console.warn('[AuthContext] Message sync merge notice:', e);
        }
      },
      (err) => console.warn('[AuthContext] Message subscription notice:', err?.message)
    );
    return () => unsub();
  }, [user, profile?.email]);

  const login = async (email: string, pass: string): Promise<AppUserProfile> => {
    setLoading(true);
    try {
      const userProf = await enforceNotSuspended(await signInEmail(email, pass));
      setProfile(userProf);
      publishProfileToStore(userProf);
      loadDirectory();
      return userProf;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string): Promise<AppUserProfile> => {
    setLoading(true);
    try {
      const userProf = await registerEmail(email, pass, name);
      setProfile(userProf);
      publishProfileToStore(userProf);
      loadDirectory();
      return userProf;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    role?: string, 
    avatarUrl?: string, 
    authType?: string
  ): Promise<AppUserProfile> => {
    setLoading(true);
    try {
      const userProf = await registerEmail(email, pass, name);
      const updated = await syncUserProfile({
        ...userProf,
        role: role || userProf.role,
        avatarUrl: avatarUrl || userProf.avatarUrl,
        authType: authType || 'password'
      });
      setProfile(updated);
      publishProfileToStore(updated);
      loadDirectory();
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<AppUserProfile> => {
    setLoading(true);
    try {
      const userProf = await enforceNotSuspended(await signInGoogle());
      setProfile(userProf);
      publishProfileToStore(userProf);
      loadDirectory();
      return userProf;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await signOutUser();
    } catch (err) {
      console.warn('[AuthContext] Sign out notice:', err);
    }
    // FIX (logout not working): Firebase signOut alone leaves the store's
    // readerProfile and cached session data in place, so the UI still shows
    // the user as logged in. Clear every session artifact.
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem('perspective_auth_session');
      localStorage.removeItem('perspective_admin_passwords');
      sessionStorage.removeItem('perspective-temp-admin-session');
      sessionStorage.removeItem('perspective_admin_email');
    } catch {}
    try {
      // FIX (login buttons missing after logout): setting a "Visiteur" object
      // here made `readerProfile` truthy, so the header kept showing the
      // Account button and never showed Connection / Register again.
      // The logged-out state is simply `null`.
      useStore.setState({
        readerProfile: null,
      });
    } catch (e) {
      console.warn('[AuthContext] Store reset notice:', e);
    }
    setLoading(false);
  };

  const resetPassword = async (email: string): Promise<void> => {
    // Re-thrown with a readable message so AuthPage can show something
    // actionable instead of a raw Firebase code.
    try {
      await resetPasswordEmail(email);
    } catch (e: any) {
      const err = new Error(e?.code || 'auth/unknown');
      (err as any).code = e?.code;
      throw err;
    }
  };

  /**
   * Complete a password reset from the emailed link.
   *
   * Firebase hands the app an `oobCode` query parameter. Verifying it produces
   * a temporary credential that authorises exactly one password change, so
   * this cannot be used to escalate privileges.
   */
  const confirmPasswordReset = async (oobCode: string, newPassword: string): Promise<void> => {
    const credential = await verifyPasswordResetCode(auth, oobCode);
    await firebaseConfirmPasswordReset(auth, credential, newPassword);
  };

  const refreshProfile = async (): Promise<void> => {
    if (auth.currentUser) {
      const updated = await syncUserProfile(auth.currentUser);
      setProfile(updated);
      loadDirectory();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        allUsers,
        loading,
        isAdmin,
        login,
        loginWithEmail: login,
        register,
        registerWithEmail,
        loginWithGoogle,
        logout,
        logoutUser: logout,
        resetPassword,
    confirmPasswordReset,
        resetUserPassword: resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
