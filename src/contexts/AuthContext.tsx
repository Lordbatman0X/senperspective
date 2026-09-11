import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useStore } from '../store';
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
      }
    } catch (e) {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadDirectory();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userProf = await syncUserProfile(firebaseUser);
          setProfile(userProf);
          loadDirectory();
        } catch (err) {
          console.error('[AuthContext] Failed to load user profile from Firestore:', err);
          // Fallback minimal profile
          setProfile({
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
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<AppUserProfile> => {
    setLoading(true);
    try {
      const userProf = await signInEmail(email, pass);
      setProfile(userProf);
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
      loadDirectory();
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<AppUserProfile> => {
    setLoading(true);
    try {
      const userProf = await signInGoogle();
      setProfile(userProf);
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
      useStore.setState({
        readerProfile: {
          id: 'visiteur',
          name: 'Visiteur',
          email: '',
          avatarUrl: 'preset-neutral',
          role: 'Visiteur',
        },
      });
    } catch (e) {
      console.warn('[AuthContext] Store reset notice:', e);
    }
    setLoading(false);
  };

  const resetPassword = async (email: string): Promise<void> => {
    await resetPasswordEmail(email);
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
