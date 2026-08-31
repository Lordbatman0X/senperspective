const fs = require('fs');
let content = fs.readFileSync('src/pages/AuthPage.tsx', 'utf-8');

content = content.replace(/import \{ realFirebaseAuth \} from "\.\.\/lib\/realFirebase";/, 'import { auth } from "../lib/mongodb";');
content = content.replace(/realFirebaseAuth\.currentUser/g, 'auth.currentUser');

fs.writeFileSync('src/pages/AuthPage.tsx', content, 'utf-8');
console.log('Patched AuthPage.tsx');
