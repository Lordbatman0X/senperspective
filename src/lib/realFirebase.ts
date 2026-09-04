import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, FacebookAuthProvider, signInWithPopup, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const realFirebaseAuth = getAuth(app);
export const realFirestore = getFirestore(app);
export { collection, doc, setDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, orderBy };
export { GoogleAuthProvider, GithubAuthProvider, OAuthProvider, FacebookAuthProvider, signInWithPopup, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence };
