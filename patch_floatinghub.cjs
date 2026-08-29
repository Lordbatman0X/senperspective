const fs = require('fs');

let code = fs.readFileSync('src/components/FloatingHub.tsx', 'utf8');

// Replace the contactMap population logic
const oldContactsLogic = `  // Add all registered users from Firestore except current user
  allUsers.forEach(u => {
    const emailLow = u.email.toLowerCase().trim();
    if (emailLow && emailLow !== myEmailLower) {
      contactMap.set(emailLow, {
        name: u.name || emailLow.split("@")[0],
        email: u.email,
        avatar: (u.name || "U").charAt(0).toUpperCase(),
        role: u.role || "Member",
        isOnline: Boolean(u.isOnline)
      });
    }
  });`;

const newContactsLogic = `  // Only add friends to the FloatingHub chat contact list
  const currentUserRecord = allUsers.find(u => u.email.toLowerCase().trim() === myEmailLower);
  const friendsList = currentUserRecord?.friends || [];

  allUsers.forEach(u => {
    const emailLow = u.email.toLowerCase().trim();
    if (emailLow && emailLow !== myEmailLower && friendsList.includes(emailLow)) {
      contactMap.set(emailLow, {
        name: u.name || emailLow.split("@")[0],
        email: u.email,
        avatar: (u.name || "U").charAt(0).toUpperCase(),
        role: u.role || "Member",
        isOnline: Boolean(u.isOnline)
      });
    }
  });`;

code = code.replace(oldContactsLogic, newContactsLogic);

fs.writeFileSync('src/components/FloatingHub.tsx', code);
