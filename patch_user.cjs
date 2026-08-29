const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf8');
code = code.replace(
  "registeredAt?: string;",
  "registeredAt?: string;\n  isPrivate?: boolean;\n  friends?: string[];\n  pendingFriendRequests?: string[];\n  sentFriendRequests?: string[];"
);
fs.writeFileSync('src/store.ts', code);
