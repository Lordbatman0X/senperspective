sed -i 's/const { loginWithGoogle } = await import("..\/contexts\/AuthContext").then(m => m.useAuth());//g' src/components/NewsletterSignup.tsx
sed -i 's/import { useStore } from '"'"'..\/store'"'"';/import { useStore } from '"'"'..\/store'"'"';\nimport { useAuth } from '"'"'..\/contexts\/AuthContext'"'"';/g' src/components/NewsletterSignup.tsx
sed -i 's/const { language, siteSettings, addSubscriber } = useStore();/const { language, siteSettings, addSubscriber } = useStore();\n  const { loginWithGoogle } = useAuth();/g' src/components/NewsletterSignup.tsx
