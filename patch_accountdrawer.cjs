const fs = require('fs');

let code = fs.readFileSync('src/components/AccountDrawer.tsx', 'utf8');

// 1. Add state and listeners for friendRequests and sentRequests
const listenersStr = `  // Real-time Firestore listener for friends
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  useEffect(() => {
    if (!readerProfile?.email) return;
    
    const reqRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "friend_requests");
    const unsubReq = safeOnSnapshot(reqRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap: any) => list.push(docSnap.id.toLowerCase().trim()));
      setFriendRequests(list);
    }, (err) => console.warn(err));

    const sentRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "sent_requests");
    const unsubSent = safeOnSnapshot(sentRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap: any) => list.push(docSnap.id.toLowerCase().trim()));
      setSentRequests(list);
    }, (err) => console.warn(err));

    return () => { unsubReq(); unsubSent(); };
  }, [readerProfile?.email]);

  useEffect(() => {`;

code = code.replace(
  "  // Real-time Firestore listener for friends\n  useEffect(() => {",
  listenersStr
);

// 2. Update toggleFriend
const oldToggle = `  const toggleFriend = async (friendEmail: string) => {
    if (!readerProfile?.email) return;
    const myEmail = readerProfile.email.toLowerCase().trim();
    const targetEmail = friendEmail.toLowerCase().trim();
    if (myEmail === targetEmail) return;

    const isFriend = friendsList.includes(targetEmail);
    try {
      const myFriendDocRef = doc(db, "users", myEmail, "friends", targetEmail);
      const targetFriendDocRef = doc(db, "users", targetEmail, "friends", myEmail);

      if (isFriend) {
        await deleteDoc(myFriendDocRef);
        await deleteDoc(targetFriendDocRef);
        setSettingsSuccessMsg(language === "fr" ? "✓ Contact retiré du réseau" : "✓ Contact removed from network");
      } else {
        await setDoc(myFriendDocRef, { email: targetEmail, connectedAt: Date.now() });
        await setDoc(targetFriendDocRef, { email: myEmail, connectedAt: Date.now() });
        setSettingsSuccessMsg(language === "fr" ? "✓ Contact ajouté au réseau !" : "✓ Contact added to network!");
      }
      setTimeout(() => setSettingsSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Failed to toggle friend status:", err);
    }
  };`;

const newToggle = `  const toggleFriend = async (friendEmail: string) => {
    if (!readerProfile?.email) return;
    const myEmail = readerProfile.email.toLowerCase().trim();
    const targetEmail = friendEmail.toLowerCase().trim();
    if (myEmail === targetEmail) return;

    const isFriend = friendsList.includes(targetEmail);
    const hasSentRequest = sentRequests.includes(targetEmail);
    const hasReceivedRequest = friendRequests.includes(targetEmail);

    const targetUser = allUsers.find(u => u.email.toLowerCase().trim() === targetEmail);
    const isPrivate = targetUser?.hidePersonalInfo;

    try {
      const myFriendDocRef = doc(db, "users", myEmail, "friends", targetEmail);
      const targetFriendDocRef = doc(db, "users", targetEmail, "friends", myEmail);
      
      const sentReqRef = doc(db, "users", myEmail, "sent_requests", targetEmail);
      const targetReqRef = doc(db, "users", targetEmail, "friend_requests", myEmail);

      const receivedReqRef = doc(db, "users", myEmail, "friend_requests", targetEmail);
      const targetSentReqRef = doc(db, "users", targetEmail, "sent_requests", myEmail);

      if (isFriend) {
        await deleteDoc(myFriendDocRef);
        await deleteDoc(targetFriendDocRef);
        setSettingsSuccessMsg(language === "fr" ? "✓ Contact retiré du réseau" : "✓ Contact removed from network");
      } else if (hasSentRequest) {
        await deleteDoc(sentReqRef);
        await deleteDoc(targetReqRef);
        setSettingsSuccessMsg(language === "fr" ? "✓ Demande annulée" : "✓ Request cancelled");
      } else if (hasReceivedRequest) {
        await deleteDoc(receivedReqRef);
        await deleteDoc(targetSentReqRef);
        await setDoc(myFriendDocRef, { email: targetEmail, connectedAt: Date.now() });
        await setDoc(targetFriendDocRef, { email: myEmail, connectedAt: Date.now() });
        setSettingsSuccessMsg(language === "fr" ? "✓ Demande acceptée !" : "✓ Request accepted!");
      } else {
        if (isPrivate) {
          await setDoc(sentReqRef, { email: targetEmail, sentAt: Date.now() });
          await setDoc(targetReqRef, { email: myEmail, sentAt: Date.now() });
          setSettingsSuccessMsg(language === "fr" ? "✓ Demande envoyée" : "✓ Request sent");
        } else {
          await setDoc(myFriendDocRef, { email: targetEmail, connectedAt: Date.now() });
          await setDoc(targetFriendDocRef, { email: myEmail, connectedAt: Date.now() });
          setSettingsSuccessMsg(language === "fr" ? "✓ Contact ajouté au réseau !" : "✓ Contact added to network!");
        }
      }
      setTimeout(() => setSettingsSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Failed to toggle friend status:", err);
    }
  };`;

code = code.replace(oldToggle, newToggle);

// 3. Update the component props passed to ConnectionsAndProfile
code = code.replace(
  "friendsList={friendsList}",
  "friendsList={friendsList}\n                      friendRequests={friendRequests}\n                      sentRequests={sentRequests}"
);

fs.writeFileSync('src/components/AccountDrawer.tsx', code);
