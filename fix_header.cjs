const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const socialCode = `
  const handleSocialSignIn = async (provider: 'google' | 'github' | 'apple' | 'facebook') => {
    setAuthError("");
    setAuthSuccess("");
    try {
      await loginWithSocial(provider);
      setAuthSuccess(language === "fr" ? "Connexion réussie !" : "Login successful!");
      setTimeout(() => {
        setShowSignUpModal(false);
        setAuthSuccess("");
      }, 800);
    } catch (err: any) {
      setAuthError(err.message || \`\${provider} sign in failed\`);
    }
  };
`;

code = code.replace('  const handleAuthSubmit = async', socialCode + '\n  const handleAuthSubmit = async');
fs.writeFileSync('src/components/Header.tsx', code);
