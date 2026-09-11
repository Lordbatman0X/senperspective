import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStore } from '../store';

const AUTH_SALT = '_perspective_auth_v2_2026_salt';
const USERS_KEY = 'perspective_users';
const SESSION_KEY = 'perspective_session';
const SESSIONS_KEY = 'perspective_sessions';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < (str + AUTH_SALT).length; i++) {
    hash = ((hash << 5) - hash) + (str + AUTH_SALT).charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

function generateToken(): string {
  return Array.from({ length: 64 }, () => Math.random().toString(36).charAt(2)).join('');
}

interface LocalUser {
  id: string; email: string; name: string; role: string;
  avatarUrl?: string; bio?: string; passwordHash?: string;
  createdAt?: string; updatedAt?: string; streak?: number;
  readingTime?: number; accolades?: string[];
}

interface StoredSession { token: string; email: string; expiresAt: string; }

function getUsers(): LocalUser[] { try { const d = localStorage.getItem(USERS_KEY); return d ? JSON.parse(d) : []; } catch { return []; } }
function saveUsers(u: LocalUser[]) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function getSessions(): StoredSession[] { try { const d = localStorage.getItem(SESSIONS_KEY); return d ? JSON.parse(d) : []; } catch { return []; } }
function saveSessions(s: StoredSession[]) { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s)); }

function initAdmins() {
  const users = getUsers();
  const admins = [
    { id: 'kadersdiaz3@gmail.com', email: 'kadersdiaz3@gmail.com', name: 'Kader S. Diaz', role: 'Admin', avatarUrl: 'preset-male', bio: 'Fondateur', passwordHash: simpleHash('Perspective2026!'), accolades: ['verified_identity', 'editorial_board', 'elite_clearance'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'admin@perspective.sn', email: 'admin@perspective.sn', name: 'Perspective Admin', role: 'Admin', avatarUrl: 'preset-male', bio: 'Administrateur', passwordHash: simpleHash('Admin2026!'), accolades: ['verified_identity', 'elite_clearance'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
  let updated = false;
  for (const a of admins) { if (!users.find(u => u.email === a.email)) { users.push(a); updated = true; } }
  if (updated) saveUsers(users);
}
initAdmins();

interface AuthContextType { user: any; loading: boolean; login: (e: string, p: string) => Promise<{ success: boolean; error?: string }>; register: (e: string, p: string, n: string) => Promise<{ success: boolean; error?: string }>; logout: () => void; }
const AuthContext = createContext<AuthContextType | undefined>(undefined);export const SimpleAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { setReaderProfile } = useStore();

  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      const session = getSessions().find(s => s.token === token && new Date(s.expiresAt) > new Date());
      if (session) {
        const found = getUsers().find(u => u.email === session.email);
        if (found) {
          const { passwordHash, ...safe } = found;
          setUser(safe);
          setReaderProfile(safe);
        }
      }
    }
    setLoading(false);
  }, [setReaderProfile]);

  const login = async (email: string, password: string) => {
    const found = getUsers().find(u => u.email === email.toLowerCase().trim());
    if (!found?.passwordHash) return { success: false, error: 'Invalid credentials' };
    if (found.passwordHash !== simpleHash(password)) return { success: false, error: 'Invalid password or unauthorized username' };
    const token = generateToken();
    saveSessions([...getSessions().filter(s => s.email !== found.email), { token, email: found.email, expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString() }]);
    localStorage.setItem(SESSION_KEY, token);
    const { passwordHash, ...safe } = found;
    setUser(safe); setReaderProfile(safe);
    return { success: true };
  };

  const register = async (email: string, password: string, name: string) => {
    const users = getUsers();
    const ne = email.toLowerCase().trim();
    if (users.find(u => u.email === ne)) return { success: false, error: 'Email already registered' };
    const newUser: LocalUser = { id: ne, email: ne, name: name || ne.split('@')[0], role: ne === 'kadersdiaz3@gmail.com' ? 'Admin' : 'Member', avatarUrl: 'preset-male', bio: '', passwordHash: simpleHash(password), accolades: ne === 'kadersdiaz3@gmail.com' ? ['verified_identity','editorial_board','elite_clearance'] : ['verified_identity'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), streak: 1, readingTime: 0 };
    users.push(newUser); saveUsers(users);
    const token = generateToken();
    saveSessions([...getSessions(), { token, email: ne, expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString() }]);
    localStorage.setItem(SESSION_KEY, token);
    const { passwordHash, ...safe } = newUser; setUser(safe); setReaderProfile(safe);
    return { success: true };
  };

  const logout = () => {
    const t = localStorage.getItem(SESSION_KEY);
    if (t) { saveSessions(getSessions().filter(s => s.token !== t)); localStorage.removeItem(SESSION_KEY); }
    setUser(null); setReaderProfile(null as any);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useSimpleAuth = () => { const c = useContext(AuthContext); if (!c) throw new Error('useSimpleAuth must be used within SimpleAuthProvider'); return c; };
