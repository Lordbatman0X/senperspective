const fs = require('fs');

let code = fs.readFileSync('src/components/AccountDrawer.tsx', 'utf8');

const regex = /\/\/ Add registered Firestore users[\s\S]*?const rawContacts = Array\.from\(contactMap\.values\(\)\);/;
if (regex.test(code)) {
    code = code.replace(regex, `// Only add friends to direct message contacts
                          (allUsers || []).forEach(u => {
                            const emailLow = u.email.toLowerCase().trim();
                            if (emailLow && emailLow !== myEmail && friendsList.includes(emailLow)) {
                              contactMap.set(emailLow, {
                                email: u.email,
                                name: u.name || emailLow.split("@")[0],
                                avatarUrl: u.avatarUrl,
                                role: u.role || "Member"
                              });
                            }
                          });

                          const rawContacts = Array.from(contactMap.values());`);
    fs.writeFileSync('src/components/AccountDrawer.tsx', code);
    console.log("Replaced successfully");
} else {
    console.log("Regex did not match");
}
