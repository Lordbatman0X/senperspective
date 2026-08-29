const fs = require('fs');
let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

// 1. Update realFirebase imports
code = code.replace(
  'import { realFirebaseAuth, GoogleAuthProvider, signInWithPopup as realSignInWithPopup } from "../lib/realFirebase";',
  'import { realFirebaseAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, FacebookAuthProvider, signInWithPopup as realSignInWithPopup } from "../lib/realFirebase";'
);

// 2. Add loginWithSocial to interface
if (!code.includes('loginWithSocial')) {
  code = code.replace(
    'loginWithGoogle: () => Promise<void>;',
    "loginWithGoogle: () => Promise<void>;\n  loginWithSocial: (providerName: 'google' | 'github' | 'apple' | 'facebook') => Promise<void>;"
  );
}

// 3. Add loginWithSocial implementation and update provider creation logic
const loginWithGoogleImpl = `  const loginWithGoogle = async () => {`;
const loginWithSocialImpl = `  const loginWithSocial = async (providerName: 'google' | 'github' | 'apple' | 'facebook') => {
    try {
      let provider: any;
      switch (providerName) {
        case 'github':
          provider = new GithubAuthProvider();
          break;
        case 'apple':
          provider = new OAuthProvider('apple.com');
          break;
        case 'facebook':
          provider = new FacebookAuthProvider();
          break;
        case 'google':
        default:
          provider = new GoogleAuthProvider();
          break;
      }

      const result = await realSignInWithPopup(realFirebaseAuth, provider);
      const u = result.user;
      
      // Some providers might not return an email (like Github sometimes), fallback to uid@provider.com if needed
      const rawEmail = u.email || \`\${u.uid}@\${providerName}.com\`;
      const cleanEmail = rawEmail.toLowerCase().trim();
      
      if (!cleanEmail) throw new Error("No email returned from " + providerName);
      
      const userDocRef = doc(db, "users", cleanEmail);
      const userDoc = await getDoc(userDocRef);
      
      let profileObj;
      if (userDoc.exists()) {
        const data = userDoc.data();
        const isAdminUser = cleanEmail === "kadersdiaz3@gmail.com" || cleanEmail === "admin@perspective.sn" || data.role === "Admin" || cleanEmail.includes("admin");
        profileObj = {
          ...data,
          id: data.id || u.uid,
          name: data.name || u.displayName || cleanEmail.split("@")[0],
          email: cleanEmail,
          avatarUrl: data.avatarUrl || u.photoURL || "preset-male",
          role: isAdminUser ? "Admin" : (data.role || "Member"),
          isFirebase: true
        };
        await setDoc(userDocRef, { ...profileObj, lastLoginAt: new Date().toISOString() }, { merge: true });
      } else {
        const isAdminUser = cleanEmail === "kadersdiaz3@gmail.com" || cleanEmail === "admin@perspective.sn" || cleanEmail.includes("admin");
        profileObj = {
          id: u.uid,
          name: u.displayName || cleanEmail.split("@")[0],
          email: cleanEmail,
          avatarUrl: u.photoURL || "preset-male",
          role: isAdminUser ? "Admin" : "Member",
          emailVerified: true,
          mfaEnabled: false,
          isFirebase: true,
          coverPhotoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop",
          streak: 1,
          readingTime: 0,
          hidePersonalInfo: false,
          bio: "Membre lecteur",
          accolades: ["verified_identity"]
        };
        await setDoc(userDocRef, { ...profileObj, registeredAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() }, { merge: true });
      }
      
      setReaderProfile(profileObj);
      
      // Update fake Mongo auth service to sync state if needed
      try { await auth.register(cleanEmail, \`\${providerName}_oauth_pass_ignored\`, profileObj.name); } catch(e){}
    } catch (err) {
      console.error(\`\${providerName} sign in error:\`, err);
      throw err;
    }
  };

  const loginWithGoogle = () => loginWithSocial('google');`;

if (code.includes('const loginWithGoogle = async () => {') && !code.includes('const loginWithSocial =')) {
  // Regex replacement to replace the old loginWithGoogle function entirely
  // It's safer to just do string slice replacement to replace the entire loginWithGoogle block
  const oldGoogleStart = code.indexOf(loginWithGoogleImpl);
  const nextFuncStart = code.indexOf('const loginWithEmail =', oldGoogleStart);
  
  if (oldGoogleStart !== -1 && nextFuncStart !== -1) {
    const before = code.slice(0, oldGoogleStart);
    const after = code.slice(nextFuncStart);
    code = before + loginWithSocialImpl + '\n\n  ' + after;
  }
}

// 4. Ensure loginWithSocial is exposed in the context Provider
if (!code.includes('loginWithSocial,')) {
  code = code.replace(
    'loginWithGoogle,',
    'loginWithGoogle,\n      loginWithSocial,'
  );
}

fs.writeFileSync('src/contexts/AuthContext.tsx', code);
