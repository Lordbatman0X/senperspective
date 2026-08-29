const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const targetStr = `                      : language === "fr"
                        ? "S'INSCRIRE & COMMENCER"
                        : "REGISTER & START"}
                  </button>`;
                  
const replacement = targetStr + `
                  <SocialLoginButtons language={language} handleSocialSignIn={handleSocialSignIn} isSubmitting={false} />`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/Header.tsx', code);
