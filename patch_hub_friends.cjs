const fs = require('fs');

let code = fs.readFileSync('src/components/FloatingHub.tsx', 'utf8');

// 1. Import necessary Firestore functions if missing
if (!code.includes("collection,")) {
  code = code.replace(
    /import \{([^}]+)\} from "\.\.\/lib\/mongodb";/,
    'import { $1, collection, safeOnSnapshot } from "../lib/mongodb";'
  );
}

// 2. Add local state for realFriendsList
const listenerStr = `  const [realFriendsList, setRealFriendsList] = useState<string[]>([]);
  useEffect(() => {
    if (!readerProfile?.email) return;
    const friendsRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "friends");
    const unsubscribe = safeOnSnapshot(friendsRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap: any) => list.push(docSnap.id.toLowerCase().trim()));
      setRealFriendsList(list);
    }, (err) => console.warn(err));
    return () => unsubscribe();
  }, [readerProfile?.email]);`;

code = code.replace(
  "  const containerRef = useRef<HTMLDivElement>(null);",
  `  const containerRef = useRef<HTMLDivElement>(null);\n${listenerStr}`
);

// 3. Update the contacts filtering logic
const oldContactsLogic = `  // Only add friends to the FloatingHub chat contact list
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

const newContactsLogic = `  // Only add friends to the FloatingHub chat contact list
  allUsers.forEach(u => {
    const emailLow = u.email.toLowerCase().trim();
    if (emailLow && emailLow !== myEmailLower && realFriendsList.includes(emailLow)) {
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
