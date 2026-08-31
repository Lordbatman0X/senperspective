const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf-8');

content = content.replace(/firebaseUser/g, 'mongoUser');
content = content.replace(/firebaseUid/g, 'mongoUid');
content = content.replace(/firebaseUserObj/g, 'mongoUserObj');
content = content.replace(/isFirebase:/g, 'isMongo:');
content = content.replace(/Firebase Auth/g, 'MongoDB Auth');

fs.writeFileSync('src/contexts/AuthContext.tsx', content, 'utf-8');
console.log('Patched AuthContext.tsx var names');
