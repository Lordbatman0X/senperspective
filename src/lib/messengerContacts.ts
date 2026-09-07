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
  const abdelEmail = 'abdel@perspective.sn';
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
  const editorialEmail = 'contact@perspective.sn';
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

  // 3. Registered Users from Firestore
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

  // 4. Friends List
  (friends || []).forEach(f => {
    const emailLow = (f.email || '').toLowerCase().trim();
    if (emailLow && emailLow !== myEmailLower && !map.has(emailLow)) {
      map.set(emailLow, {
        email: f.email,
        name: f.name || emailLow.split('@')[0],
        role: f.role || 'Member',
        avatar: (f.name || 'U').charAt(0).toUpperCase(),
        avatarUrl: f.avatarUrl || f.avatar,
        isOnline: Boolean((f as any).isOnline),
        isAi: false
      });
    }
  });

  return Array.from(map.values());
}
