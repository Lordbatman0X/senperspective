sed -i '1iimport { realFirebaseAuth, GoogleAuthProvider, signInWithPopup as realSignInWithPopup } from "../lib/realFirebase";' src/contexts/AuthContext.tsx
