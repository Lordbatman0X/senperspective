const fs = require('fs');
let code = fs.readFileSync('src/lib/realFirebase.ts', 'utf8');
code = code.replace(
  "import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';",
  "import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, FacebookAuthProvider, signInWithPopup } from 'firebase/auth';"
);
code = code.replace(
  "export { GoogleAuthProvider, signInWithPopup };",
  "export { GoogleAuthProvider, GithubAuthProvider, OAuthProvider, FacebookAuthProvider, signInWithPopup };"
);
fs.writeFileSync('src/lib/realFirebase.ts', code);
