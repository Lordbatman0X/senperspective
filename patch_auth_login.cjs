const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf-8');

content = content.replace(/realSignInWithPopup\(realFirebaseAuth, provider\)/g, 'signInWithPopup(auth, provider)');

fs.writeFileSync('src/contexts/AuthContext.tsx', content, 'utf-8');
console.log('Patched loginWithSocial');
