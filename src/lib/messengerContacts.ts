export interface MessengerContact {
  email: string;
  name: string;
  role: string;
  avatar: string;
  avatarUrl?: string;
  isOnline: boolean;
  isAi?: boolean;
}

export function getMessengerContacts(
  allUsers: any[] = [],
  friends: any[] = [],
  currentUserEmail: string = '',
  language: 'fr' | 'en' = 'fr'
): MessengerContact[] {
  const myEmailLower = (currentUserEmail || '').toLowerCase().trim();
  const map = new Map<string, MessengerContact>();

  // 1. Official AI Companion: Abdel
  const abdelEmail = 'abdel@senperspective.com';
  if (myEmailLower !== abdelEmail) {
    map.set(abdelEmail, {
      email: abdelEmail,
      name: language === 'fr' ? 'Abdel (IA Rédactionnelle)' : 'Abdel (Editorial AI)',
      role: language === 'fr' ? 'Intelligence Éditoriale' : 'Editorial Intelligence',
      avatar: 'A',
      avatarUrl: 'preset-male',
      isOnline: true,
      isAi: true
    });
  }

  // 2. Official Editorial Desk: Perspective Group
  const editorialEmail = 'contact@senperspective.com';
  if (myEmailLower !== editorialEmail) {
    map.set(editorialEmail, {
      email: editorialEmail,
      name: language === 'fr' ? 'Admin Rédaction' : 'Editorial Admin',
      role: 'Perspective Group',
      avatar: 'P',
      avatarUrl: 'preset-male',
      isOnline: true,
      isAi: false
    });
  }

  // 3. Registered Users from Supabase
  (allUsers || []).forEach(u => {
    const emailLow = (u.email || '').toLowerCase().trim();
    if (emailLow && emailLow !== myEmailLower && !map.has(emailLow)) {
      map.set(emailLow, {
        email: u.email,
        name: u.name || emailLow.split('@')[0],
        role: u.role || 'Member',
        avatar: (u.name || 'U').charAt(0).toUpperCase(),
        avatarUrl: u.avatarUrl || u.avatar,
        isOnline: Boolean(u.isOnline || (u.lastLoginAt && Date.now() - new Date(u.lastLoginAt).getTime() < 30 * 60 * 1000)),
        isAi: false
      });
    }
  });

  // 4. Friends List — friends may be string emails or FriendContact objects
   const normalizedFriends: MessengerContact[] = (friends || []).map(f => {
     if (typeof f === 'string') {
       const emailLow = f.toLowerCase().trim();
       return {
         email: emailLow,
         name: emailLow.split('@')[0],
         role: 'Member',
         avatar: emailLow.charAt(0).toUpperCase(),
         isOnline: false,
         isAi: false
       };
     }
     const emailLow = (f.email || '').toLowerCase().trim();
     return {
       email: emailLow,
       name: f.name || emailLow.split('@')[0],
       role: f.role || 'Member',
       avatar: (f.name || 'U').charAt(0).toUpperCase(),
       avatarUrl: f.avatarUrl || f.avatar,
       isOnline: Boolean(f.isOnline),
       isAi: false
     };
   });

   normalizedFriends.forEach(f => {
     if (f.email && f.email !== myEmailLower && !map.has(f.email)) {
       map.set(f.email, f);
     }
   });

  return Array.from(map.values());
}
