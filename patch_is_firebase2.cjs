const fs = require('fs');
let content = fs.readFileSync('src/components/ConnectionsAndProfile.tsx', 'utf-8');

content = content.replace(/isFirebase:/g, 'isMongo:');

fs.writeFileSync('src/components/ConnectionsAndProfile.tsx', content, 'utf-8');
console.log('Patched isFirebase in ConnectionsAndProfile');
