const fs = require('fs');
let content = fs.readFileSync('src/lib/googleIntegration.ts', 'utf-8');

content = content.replace(/import \{ realFirebaseAuth, GoogleAuthProvider, signInWithPopup \} from '\.\/realFirebase';/, 'import { auth, GoogleAuthProvider, signInWithPopup } from "./mongodb";');
content = content.replace(/signInWithPopup\(realFirebaseAuth, provider\)/g, 'signInWithPopup(auth, provider)');

fs.writeFileSync('src/lib/googleIntegration.ts', content, 'utf-8');
console.log('Patched googleIntegration.ts');
