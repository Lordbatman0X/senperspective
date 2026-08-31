const fs = require('fs');

let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf-8');

// Remove realFirebase import
content = content.replace(/import \{ realFirebaseAuth.*?\} from "\.\.\/lib\/realFirebase";\n/g, '');

// Add missing to mongodb import
content = content.replace('MongoUser as User', 'MongoUser as User,\n  GoogleAuthProvider,\n  GithubAuthProvider,\n  OAuthProvider,\n  FacebookAuthProvider,\n  signInWithPopup');

fs.writeFileSync('src/contexts/AuthContext.tsx', content, 'utf-8');
console.log('Patched AuthContext.tsx imports');
