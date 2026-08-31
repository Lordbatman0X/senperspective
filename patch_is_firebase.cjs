const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf-8');

content = content.replace(/currentProfile\.isFirebase/g, 'currentProfile.isMongo');

fs.writeFileSync('src/contexts/AuthContext.tsx', content, 'utf-8');
console.log('Patched isFirebase in AuthContext.tsx');
