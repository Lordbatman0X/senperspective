import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import rawConfig from "../../firebase-applet-config.json";

const defaultConfig = {
  projectId: "earnest-strand-z71nt",
  appId: "1:357139667334:web:0b3ce7b362c3f238a2b407",
  apiKey: "AIzaSyALmx2cnEFumIoBPUj0qQjoO30zFG4pJrg",
  authDomain: "earnest-strand-z71nt.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-perspectivegroup-9af7fbb0-c841-48c0-854d-ab5c65f4ba29",
  storageBucket: "earnest-strand-z71nt.firebasestorage.app",
  messagingSenderId: "357139667334",
  measurementId: ""
};

const firebaseConfig = (rawConfig && typeof rawConfig === 'object' && (rawConfig as any).apiKey) 
  ? rawConfig 
  : defaultConfig;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || defaultConfig.firestoreDatabaseId);
export default app;
