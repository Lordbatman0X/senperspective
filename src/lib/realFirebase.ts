import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, FacebookAuthProvider, signInWithPopup } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const realFirebaseAuth = getAuth(app);
export { GoogleAuthProvider, GithubAuthProvider, OAuthProvider, FacebookAuthProvider, signInWithPopup };
