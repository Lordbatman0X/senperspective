const fs = require('fs');
let code = fs.readFileSync('src/pages/AuthPage.tsx', 'utf8');

// import SocialLoginButtons
code = `import { SocialLoginButtons } from '../components/SocialLoginButtons';\n` + code;

// remove the constant SocialLoginButtons definition at the bottom
const splitIndex = code.indexOf('// Extracted Component for Social Login Buttons');
if (splitIndex !== -1) {
  code = code.substring(0, splitIndex).trimEnd() + '\n';
}

fs.writeFileSync('src/pages/AuthPage.tsx', code);
