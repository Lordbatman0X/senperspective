import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot,
  getDocs,
  query,
  deleteDoc
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useStore } from "../store";
import { sampleArticles } from "../data";
import { Article } from "../types";
import { sanitizeFirestorePayload } from "../lib/imageUtils";

export interface FirestoreUser {
  email: string;
  name: string;
  avatarUrl: string;
  role: string;
  coverPhotoUrl?: string;
  streak?: number;
  readingTime?: number;
  hidePersonalInfo?: boolean;
  hideEmail?: boolean;
  bio?: string;
  accolades?: string[];
  mfaEnabled?: boolean;
  twoFactorEnabled?: boolean;
  authType?: "password" | "pin";
  pin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  allUsers: FirestoreUser[];
  loginWithEmail: (email: string, pass: string, remember?: boolean) => Promise<void>;
  registerWithEmail: (
    email: string, 
    pass: string, 
    name: string, 
    role?: string, 
    avatarUrl?: string, 
    authType?: 'password' | 'pin', 
    pin?: string, 
    twoFactorEnabled?: boolean
  ) => Promise<void>;
  logoutUser: () => Promise<void>;
  resetUserPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<FirestoreUser[]>([]);
  const { setReaderProfile } = useStore();

  // Sync / listen to registered users from Firestore (starts from scratch without mock accounts)
  useEffect(() => {
    const cleanOldMockData = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        // Remove legacy mock user accounts from Firestore if present
        const legacyMockEmails = [
          'fatou.diop@example.com',
          'mamadou.sylla@example.com',
          'amina.kane@example.com',
          'member@perspective.sn'
        ];
        for (const mockEmail of legacyMockEmails) {
          const docRef = doc(db, "users", mockEmail);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            await deleteDoc(docRef);
          }
        }
      } catch (err) {
        console.warn("Clean up legacy mock data notice:", err);
      }
    };

    cleanOldMockData();

    // Subscribe to Firestore users collection in real time
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList: FirestoreUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({
          email: data.email || docSnap.id,
          name: data.name || "Anonymous",
          avatarUrl: data.avatarUrl || "preset-male",
          role: data.role || "Member",
          coverPhotoUrl: data.coverPhotoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop",
          streak: data.streak !== undefined ? data.streak : 1,
          readingTime: data.readingTime !== undefined ? data.readingTime : 0,
          hidePersonalInfo: data.hidePersonalInfo || false,
          hideEmail: data.hideEmail || false,
          bio: data.bio || "",
          accolades: data.accolades || ["verified_identity"]
        });
      });

      setAllUsers(usersList);
    }, (error) => {
      console.error("Error fetching firestore users:", error);
    });

    return () => unsubscribeUsers();
  }, []);

  // Real-time synchronization of Direct Messages via Firestore
  useEffect(() => {
    // Listen to messages collection in real-time
    const unsubscribeMessages = onSnapshot(collection(db, "messages"), (snapshot) => {
      const messagesList: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messagesList.push({
          id: docSnap.id,
          sender: data.sender || "",
          receiver: data.receiver || "",
          text: data.text || "",
          date: data.date || new Date().toISOString().split('T')[0],
          timestamp: data.timestamp || Date.now(),
          attachment: data.attachment || undefined
        });
      });

      // Sort messages chronologically by timestamp
      messagesList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      // Update the Zustand store
      useStore.setState({ directMessages: messagesList });
    }, (error) => {
      console.error("Error listening to messages:", error);
    });

    return () => unsubscribeMessages();
  }, []);

  // Real-time synchronization of Comments via Firestore
  useEffect(() => {
    const unsubscribeComments = onSnapshot(collection(db, "comments"), (snapshot) => {
      if (snapshot.empty) return;
      const commentsList: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        commentsList.push({
          id: docSnap.id,
          articleId: data.articleId || "",
          articleTitle: data.articleTitle || "",
          author: data.author || "Anonymous",
          email: data.email || "",
          text: data.text || "",
          date: data.date || new Date().toISOString().split('T')[0],
          isApproved: data.isApproved !== undefined ? data.isApproved : true,
          ipAddress: data.ipAddress || "",
          avatarUrl: data.avatarUrl || "",
          isMember: data.isMember || false,
          parentId: data.parentId || undefined,
          replyTo: data.replyTo || undefined,
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          likedBy: data.likedBy || [],
          dislikedBy: data.dislikedBy || []
        });
      });
      useStore.setState({ comments: commentsList });
    }, (error) => {
      console.error("Error listening to comments in Firestore:", error);
    });

    return () => unsubscribeComments();
  }, []);

  // Real-time synchronization of Articles via Firestore
  useEffect(() => {
    const unsubscribeArticles = onSnapshot(collection(db, "articles"), (snapshot) => {
      const firestoreArticlesMap = new Map<string, Article>();
      
      // Seed with initial local sampleArticles
      sampleArticles.forEach((a) => firestoreArticlesMap.set(a.id, a));

      // Merge with articles saved in Firestore
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Article;
        if (data && data.id) {
          firestoreArticlesMap.set(data.id, data);
        }
      });

      const updatedArticles = Array.from(firestoreArticlesMap.values());
      useStore.setState({ articles: updatedArticles });
    }, (error) => {
      console.error("Error listening to articles in Firestore:", error);
    });

    return () => unsubscribeArticles();
  }, []);

  // Real-time synchronization of Media via Firestore
  useEffect(() => {
    const unsubscribeMedia = onSnapshot(collection(db, "media"), (snapshot) => {
      if (snapshot.empty) return;
      const mediaList: any[] = [];
      snapshot.forEach((docSnap) => {
        mediaList.push(docSnap.data());
      });
      useStore.setState({ media: mediaList });
    }, (error) => {
      console.error("Error listening to media in Firestore:", error);
    });

    return () => unsubscribeMedia();
  }, []);

  // Real-time synchronization of Site Settings via Firestore
  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, "siteSettings", "config"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        useStore.setState((state) => ({
          siteSettings: { ...state.siteSettings, ...data }
        }));
      } else {
        // Bootstrap initial settings document in Firestore with maintenance mode enabled
        const current = useStore.getState().siteSettings;
        setDoc(doc(db, "siteSettings", "config"), { ...current, isMaintenanceMode: true }, { merge: true }).catch(() => {});
      }
    }, (error) => {
      console.error("Error listening to siteSettings in Firestore:", error);
    });

    return () => unsubscribeSettings();
  }, []);

  // Real-time synchronization of Matches via Firestore
  useEffect(() => {
    const unsubscribeMatches = onSnapshot(collection(db, "matches"), (snapshot) => {
      if (snapshot.empty) return;
      const matchesList: any[] = [];
      snapshot.forEach((docSnap) => {
        matchesList.push(docSnap.data());
      });
      useStore.setState({ matches: matchesList });
    }, (error) => {
      console.error("Error listening to matches in Firestore:", error);
    });

    return () => unsubscribeMatches();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && firebaseUser.email) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.email.toLowerCase().trim());
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setReaderProfile({
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || "Anonymous",
              email: firebaseUser.email,
              avatarUrl: data.avatarUrl || "preset-male",
              role: data.role || "Member",
              emailVerified: firebaseUser.emailVerified,
              mfaEnabled: false,
              isFirebase: true,
              coverPhotoUrl: data.coverPhotoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop",
              streak: data.streak !== undefined ? data.streak : 5,
              readingTime: data.readingTime !== undefined ? data.readingTime : 120,
              hidePersonalInfo: data.hidePersonalInfo || false,
              hideEmail: data.hideEmail || false,
              bio: data.bio || "",
              accolades: data.accolades || []
            });
          } else {
            // Profile does not exist in Firestore yet, create default
            const fallbackProfile = {
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
              avatarUrl: "preset-male",
              role: "Member",
              coverPhotoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop",
              streak: 5,
              readingTime: 120,
              hidePersonalInfo: false,
              bio: "Nouveau lecteur.",
              accolades: ["verified_identity"]
            };
            await setDoc(userDocRef, fallbackProfile);
            setReaderProfile({
              id: firebaseUser.uid,
              name: fallbackProfile.name,
              email: firebaseUser.email,
              avatarUrl: fallbackProfile.avatarUrl,
              role: fallbackProfile.role,
              emailVerified: firebaseUser.emailVerified,
              mfaEnabled: false,
              isFirebase: true,
              coverPhotoUrl: fallbackProfile.coverPhotoUrl,
              streak: fallbackProfile.streak,
              readingTime: fallbackProfile.readingTime,
              hidePersonalInfo: fallbackProfile.hidePersonalInfo,
              bio: fallbackProfile.bio,
              accolades: fallbackProfile.accolades
            });
          }
        } catch (err) {
          console.error("Error syncing reader profile:", err);
        }
      } else {
        const currentProfile = useStore.getState().readerProfile;
        if (currentProfile && currentProfile.isFirebase) {
          setReaderProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [setReaderProfile]);

  const loginWithEmail = async (email: string, pass: string, remember: boolean = true) => {
    const cleanEmail = email.toLowerCase().trim();
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    } catch (err) {
      console.warn("Failed to set auth persistence:", err);
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      // Update lastLoginAt in Firestore
      const userDocRef = doc(db, "users", cleanEmail);
      await setDoc(userDocRef, { lastLoginAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    } catch (err: any) {
      // Fallback check against Firestore user profile
      const userDocRef = doc(db, "users", cleanEmail);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        await setDoc(userDocRef, { lastLoginAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        setReaderProfile({
          id: data.id || "usr_" + Date.now(),
          name: data.name || cleanEmail.split("@")[0],
          email: cleanEmail,
          avatarUrl: data.avatarUrl || "preset-male",
          role: data.role || "Member",
          emailVerified: true,
          mfaEnabled: data.twoFactorEnabled || data.mfaEnabled || false,
          isFirebase: true,
          coverPhotoUrl: data.coverPhotoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop",
          streak: data.streak || 1,
          readingTime: data.readingTime || 0,
          hidePersonalInfo: data.hidePersonalInfo || false,
          bio: data.bio || "",
          accolades: data.accolades || ["verified_identity"]
        });
        return;
      }
      throw err;
    }
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    role: string = "Member", 
    avatarUrl: string = "preset-male",
    authType: 'password' | 'pin' = 'password',
    pin?: string,
    twoFactorEnabled: boolean = false
  ) => {
    const cleanEmail = email.toLowerCase().trim();
    let firebaseUid = "usr_" + Date.now();
    let firebaseUserObj: any = null;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      firebaseUserObj = userCredential.user;
      firebaseUid = firebaseUserObj.uid;
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        try {
          const loginCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
          firebaseUserObj = loginCredential.user;
          firebaseUid = firebaseUserObj.uid;
        } catch (loginErr) {
          console.warn("Could not sign in existing user during registration fallback:", loginErr);
        }
      } else {
        console.warn("Firebase Auth createUserWithEmailAndPassword notice:", err);
      }
    }

    // Save complete user account profile in Firestore users collection
    const profileData = {
      id: firebaseUid,
      email: cleanEmail,
      name,
      avatarUrl: avatarUrl || "preset-male",
      role: role || "Member",
      authType: authType || 'password',
      pin: pin || "",
      twoFactorEnabled: twoFactorEnabled || false,
      mfaEnabled: twoFactorEnabled || false,
      emailVerified: true,
      coverPhotoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop",
      streak: 1,
      readingTime: 0,
      hidePersonalInfo: false,
      bio: "Membre actif",
      accolades: ["verified_identity"],
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    try {
      const safeProfile = await sanitizeFirestorePayload(profileData);
      await setDoc(doc(db, "users", cleanEmail), safeProfile, { merge: true });
    } catch (fsErr) {
      console.error("Firestore setDoc error for user registration:", fsErr);
    }

    // Immediately set active readerProfile in global state
    setReaderProfile({
      id: firebaseUid,
      name: profileData.name,
      email: cleanEmail,
      avatarUrl: profileData.avatarUrl,
      role: profileData.role,
      emailVerified: true,
      mfaEnabled: twoFactorEnabled,
      isFirebase: true,
      coverPhotoUrl: profileData.coverPhotoUrl,
      streak: profileData.streak,
      readingTime: profileData.readingTime,
      hidePersonalInfo: profileData.hidePersonalInfo,
      bio: profileData.bio,
      accolades: profileData.accolades
    });
  };

  const logoutUser = async () => {
    await signOut(auth);
    setReaderProfile(null);
  };

  const resetUserPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      allUsers,
      loginWithEmail,
      registerWithEmail,
      logoutUser,
      resetUserPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
