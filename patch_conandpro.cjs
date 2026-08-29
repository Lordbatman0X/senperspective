const fs = require('fs');

let code = fs.readFileSync('src/components/ConnectionsAndProfile.tsx', 'utf8');

// 1. Add props to interface
code = code.replace(
  "  friendsList: string[];",
  "  friendsList: string[];\n  friendRequests?: string[];\n  sentRequests?: string[];"
);

// 2. Add to destructuring
code = code.replace(
  "  friendsList,\n  toggleFriend,",
  "  friendsList,\n  friendRequests = [],\n  sentRequests = [],\n  toggleFriend,"
);

// 3. Update the detailed profile toggle friend button
const oldDetailedButton = `                <button
                  onClick={() => toggleFriend(selectedUserForDetail.email)}
                  className="px-2.5 py-1 text-[8px] font-mono font-bold uppercase tracking-wider border rounded-none cursor-pointer transition-all bg-transparent"
                  style={{
                    color: friendsList.includes(selectedUserForDetail.email.toLowerCase().trim()) ? "#e11d48" : currentSettings.accentColor,
                    borderColor: friendsList.includes(selectedUserForDetail.email.toLowerCase().trim()) ? "rgba(225, 29, 72, 0.3)" : \`\${currentSettings.accentColor}30\`
                  }}
                >
                  {friendsList.includes(selectedUserForDetail.email.toLowerCase().trim()) 
                    ? (language === "fr" ? "Retirer Ami" : "Remove Friend") 
                    : (language === "fr" ? "Ajouter Ami" : "Add Friend")}
                </button>`;

const newDetailedButton = `                <button
                  onClick={() => toggleFriend(selectedUserForDetail.email)}
                  className="px-2.5 py-1 text-[8px] font-mono font-bold uppercase tracking-wider border rounded-none cursor-pointer transition-all bg-transparent"
                  style={{
                    color: friendsList.includes(selectedUserForDetail.email.toLowerCase().trim()) ? "#e11d48" : currentSettings.accentColor,
                    borderColor: friendsList.includes(selectedUserForDetail.email.toLowerCase().trim()) ? "rgba(225, 29, 72, 0.3)" : \`\${currentSettings.accentColor}30\`
                  }}
                >
                  {(() => {
                    const email = selectedUserForDetail.email.toLowerCase().trim();
                    if (friendsList.includes(email)) return language === "fr" ? "Retirer Ami" : "Remove Friend";
                    if (sentRequests.includes(email)) return language === "fr" ? "Annuler Demande" : "Cancel Request";
                    if (friendRequests.includes(email)) return language === "fr" ? "Accepter" : "Accept Request";
                    return language === "fr" ? "Ajouter Ami" : "Add Friend";
                  })()}
                </button>`;
code = code.replace(oldDetailedButton, newDetailedButton);

// 4. Update the friend item badge
const oldBadge = `                                {isFriend && (
                                  <span className="text-[8.5px] font-mono text-emerald-600 dark:text-emerald-400 font-black tracking-wider uppercase">
                                    ✓ {language === "fr" ? "AMI" : "FRIEND"}
                                  </span>
                                )}`;
const newBadge = `                                {isFriend && (
                                  <span className="text-[8.5px] font-mono text-emerald-600 dark:text-emerald-400 font-black tracking-wider uppercase">
                                    ✓ {language === "fr" ? "AMI" : "FRIEND"}
                                  </span>
                                )}
                                {!isFriend && sentRequests.includes(member.email.toLowerCase().trim()) && (
                                  <span className="text-[8.5px] font-mono text-amber-600 dark:text-amber-400 font-black tracking-wider uppercase">
                                    {language === "fr" ? "EN ATTENTE" : "PENDING"}
                                  </span>
                                )}
                                {!isFriend && friendRequests.includes(member.email.toLowerCase().trim()) && (
                                  <span className="text-[8.5px] font-mono text-blue-600 dark:text-blue-400 font-black tracking-wider uppercase">
                                    {language === "fr" ? "DEMANDE REÇUE" : "REQUESTED"}
                                  </span>
                                )}`;
code = code.replace(oldBadge, newBadge);

// 5. Update the friend item button
const oldListButton = `                              <button
                                onClick={() => toggleFriend(member.email)}
                                className="p-1.5 border transition-all cursor-pointer flex items-center justify-center rounded-none bg-transparent"
                                style={{
                                  color: isFriend ? "#e11d48" : currentSettings.accentColor,
                                  borderColor: isFriend ? "rgba(225, 29, 72, 0.3)" : \`\${currentSettings.accentColor}30\`
                                }}
                                title={isFriend ? (language === "fr" ? "Retirer" : "Remove Friend") : (language === "fr" ? "Ajouter" : "Add Friend")}
                              >
                                {isFriend ? <UserMinus size={13} /> : <UserPlus size={13} />}
                              </button>`;

const newListButton = `                              <button
                                onClick={() => toggleFriend(member.email)}
                                className="p-1.5 border transition-all cursor-pointer flex items-center justify-center rounded-none bg-transparent"
                                style={{
                                  color: isFriend ? "#e11d48" : currentSettings.accentColor,
                                  borderColor: isFriend ? "rgba(225, 29, 72, 0.3)" : \`\${currentSettings.accentColor}30\`
                                }}
                                title={
                                  isFriend ? (language === "fr" ? "Retirer" : "Remove Friend") :
                                  sentRequests.includes(member.email.toLowerCase().trim()) ? (language === "fr" ? "Annuler" : "Cancel Request") :
                                  friendRequests.includes(member.email.toLowerCase().trim()) ? (language === "fr" ? "Accepter" : "Accept Request") :
                                  (language === "fr" ? "Ajouter" : "Add Friend")
                                }
                              >
                                {isFriend ? <UserMinus size={13} /> : (sentRequests.includes(member.email.toLowerCase().trim()) || friendRequests.includes(member.email.toLowerCase().trim())) ? <Clock size={13} /> : <UserPlus size={13} />}
                              </button>`;
code = code.replace(oldListButton, newListButton);

// Also need to import Clock if missing
if (!code.includes("Clock,")) {
  code = code.replace("UserPlus,", "UserPlus, Clock,");
}

fs.writeFileSync('src/components/ConnectionsAndProfile.tsx', code);
