const fs = require('fs');

let code = fs.readFileSync('src/components/AccountDrawer.tsx', 'utf8');

const oldBlockStart = `                          // Add registered Firestore users`;
const oldBlockEnd = `                          const rawContacts = Array.from(contactMap.values());`;

const newBlock = `                          // Only add friends to direct message contacts
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

                          const rawContacts = Array.from(contactMap.values());`;

// We use regex to replace everything between oldBlockStart and oldBlockEnd
const regex = new RegExp(oldBlockStart + '[\\s\\S]*?' + oldBlockEnd, 'm');
code = code.replace(regex, newBlock);

fs.writeFileSync('src/components/AccountDrawer.tsx', code);
