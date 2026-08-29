const fs = require('fs');

let code = fs.readFileSync('src/store.ts', 'utf8');

// 1. Add interface methods
const interfaceHooksStr = `
  updatePrivacy: (email: string, isPrivate: boolean) => void;
  sendFriendRequest: (fromEmail: string, toEmail: string) => void;
  acceptFriendRequest: (fromEmail: string, toEmail: string) => void;
  removeFriend: (email1: string, email2: string) => void;
`;
if (!code.includes("updatePrivacy: (email")) {
    code = code.replace(
      "registerUser: (user: UserAccount) => boolean;",
      `registerUser: (user: UserAccount) => boolean;\n${interfaceHooksStr}`
    );
}

// 2. Add implementations
const implementationsStr = `
      updatePrivacy: (email, isPrivate) => {
        const users = get().users || [];
        const normalized = email.toLowerCase().trim();
        set({
          users: users.map(u => u.email.toLowerCase().trim() === normalized ? { ...u, isPrivate } : u)
        });
      },
      sendFriendRequest: (fromEmail, toEmail) => {
        const users = get().users || [];
        const fromNorm = fromEmail.toLowerCase().trim();
        const toNorm = toEmail.toLowerCase().trim();
        set({
          users: users.map(u => {
            const currentEmail = u.email.toLowerCase().trim();
            if (currentEmail === fromNorm) {
              return { ...u, sentFriendRequests: [...(u.sentFriendRequests || []), toNorm] };
            }
            if (currentEmail === toNorm) {
              return { ...u, pendingFriendRequests: [...(u.pendingFriendRequests || []), fromNorm] };
            }
            return u;
          })
        });
      },
      acceptFriendRequest: (fromEmail, toEmail) => {
        const users = get().users || [];
        const fromNorm = fromEmail.toLowerCase().trim();
        const toNorm = toEmail.toLowerCase().trim(); // the one accepting
        set({
          users: users.map(u => {
            const currentEmail = u.email.toLowerCase().trim();
            if (currentEmail === fromNorm) {
              return { 
                ...u, 
                friends: [...(u.friends || []), toNorm],
                sentFriendRequests: (u.sentFriendRequests || []).filter(e => e !== toNorm)
              };
            }
            if (currentEmail === toNorm) {
              return { 
                ...u, 
                friends: [...(u.friends || []), fromNorm],
                pendingFriendRequests: (u.pendingFriendRequests || []).filter(e => e !== fromNorm)
              };
            }
            return u;
          })
        });
      },
      removeFriend: (email1, email2) => {
        const users = get().users || [];
        const norm1 = email1.toLowerCase().trim();
        const norm2 = email2.toLowerCase().trim();
        set({
          users: users.map(u => {
            const currentEmail = u.email.toLowerCase().trim();
            if (currentEmail === norm1) {
              return { ...u, friends: (u.friends || []).filter(e => e !== norm2) };
            }
            if (currentEmail === norm2) {
              return { ...u, friends: (u.friends || []).filter(e => e !== norm1) };
            }
            return u;
          })
        });
      },
`;

if (!code.includes("updatePrivacy: (email, isPrivate)")) {
    code = code.replace(
      "registerUser: (newUser) => {",
      `${implementationsStr}\n      registerUser: (newUser) => {`
    );
}

// 3. Remove default/fake users from `users` array in seed/sample logic if any
// Also inside seedSampleArticles
code = code.replace(/users:\s*\[\s*{\s*email:\s*'kadersdiaz3@gmail.com'[\s\S]*?\s*}\s*\]/g, "users: []");

fs.writeFileSync('src/store.ts', code);
