sed -i 's/logoutUser: () => Promise<void>;/loginWithGoogle: () => Promise<void>;\n  logoutUser: () => Promise<void>;/g' src/contexts/AuthContext.tsx
