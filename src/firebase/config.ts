import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB2j5xIJDbvR5IedkiuUZzZE9vnVRoEDqw",
  authDomain: "ai-studio-applet-webapp-29e84.firebaseapp.com",
  databaseURL: "https://ai-studio-applet-webapp-29e84-default-rtdb.firebaseio.com",
  projectId: "ai-studio-applet-webapp-29e84",
  storageBucket: "ai-studio-applet-webapp-29e84.firebasestorage.app",
  messagingSenderId: "1000520692696",
  appId: "1:1000520692696:web:eaf95635ede78baff4b8ad"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export firebaseConfig
export default firebaseConfig;

// Realtime Database — free on the Spark plan (no billing required),
// unlike Firestore which now demands the Blaze plan on new projects.
export const rtdb = getDatabase(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);
