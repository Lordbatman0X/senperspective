/**
 * Local Storage Store - Works without backend server
 * All data persists in browser localStorage
 */

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  passwordHash?: string;
  createdAt?: string;
  updatedAt?: string;
  isOnline?: boolean;
  streak?: number;
  readingTime?: number;
  accolades?: string[];
  [key: string]: any;
}

export interface LocalSession {
  token: string;
  email: string;
  expiresAt: string;
  createdAt: string;
}

const USERS_KEY = 'perspective_users';
const SESSIONS_KEY = 'perspective_sessions';
const CURRENT_SESSION_KEY = 'perspective_current_session';

const AUTH_SALT = '_perspective_auth_v2_2026_salt';

function simpleHash(str: string): string {
  let hash = 0;
  const combined = str + AUTH_SALT;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

function generateToken(): string {
  return Array.from({length: 64}, () => Math.random().toString(36).charAt(2)).join('');
}

export function getUsers(): LocalUser[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveUsers(users: LocalUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSessions(): LocalSession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(SESSIONS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveSessions(sessions: LocalSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function initializeStore() {
  const users = getUsers();
  const admins = [
    { id: 'kadersdiaz3@gmail.com', email: 'kadersdiaz3@gmail.com', name: 'Kader S. Diaz', role: 'Admin', avatarUrl: 'preset-male', bio: 'Fondateur', passwordHash: simpleHash('Perspective2026!'), accolades: ['verified_identity', 'editorial_board', 'elite_clearance'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'admin@perspective.sn', email: 'admin@perspective.sn', name: 'Perspective Admin', role: 'Admin', avatarUrl: 'preset-male', bio: 'Administrateur', passwordHash: simpleHash('Admin2026!'), accolades: ['verified_identity', 'elite_clearance'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
  let updated = false;
  for (const admin of admins) { if (!users.find(u => u.email === admin.email)) { users.push(admin); updated = true; } }
  if (updated) saveUsers(users);
}

export function registerUser(email: string, password: string, name: string, additionalFields: Record<string, any> = {}): { success: boolean; user?: LocalUser; error?: string } {
  const users = getUsers(); const normalizedEmail = email.toLowerCase().trim();
  if (users.find(u => u.email === normalizedEmail)) return { success: false, error: 'Email already registered' };
  const isSuperAdmin = normalizedEmail === 'kadersdiaz3@gmail.com';
  const newUser: LocalUser = { id: normalizedEmail, email: normalizedEmail, name: name || normalizedEmail.split('@')[0], role: isSuperAdmin ? 'Admin' : (additionalFields.role || 'Member'), passwordHash: simpleHash(password), avatarUrl: additionalFields.avatarUrl || 'preset-male', bio: additionalFields.bio || '', accolades: isSuperAdmin ? ['verified_identity', 'editorial_board', 'elite_clearance'] : ['verified_identity'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), streak: 1, readingTime: 0, ...additionalFields };
  users.push(newUser); saveUsers(users);
  const { passwordHash, ...safeUser } = newUser; return { success: true, user: safeUser };
}

export function loginUser(email: string, password: string): { success: boolean; user?: LocalUser; token?: string; error?: string } {
  const users = getUsers(); const normalizedEmail = email.toLowerCase().trim();
  const user = users.find(u => u.email === normalizedEmail);
  if (!user || !user.passwordHash) return { success: false, error: 'Invalid credentials' };
  if (user.passwordHash !== simpleHash(password)) return { success: false, error: 'Invalid credentials' };
  const token = generateToken(); const sessions = getSessions().filter(s => s.email !== normalizedEmail);
  sessions.push({ token, email: normalizedEmail, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() });
  saveSessions(sessions); localStorage.setItem(CURRENT_SESSION_KEY, token);
  const { passwordHash, ...safeUser } = user; return { success: true, user: safeUser, token };
}

export function validateSession(token: string): LocalUser | null {
  if (!token) return null; const session = getSessions().find(s => s.token === token);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const user = getUsers().find(u => u.email === session.email); if (!user) return null;
  const { passwordHash, ...safeUser } = user; return safeUser;
}

export function getCurrentSession(): LocalSession | null { if (typeof window === 'undefined') return null; const token = localStorage.getItem(CURRENT_SESSION_KEY); if (!token) return null; return getSessions().find(s => s.token === token) || null; }
export function logoutUser(): void { const token = localStorage.getItem(CURRENT_SESSION_KEY); if (token) { saveSessions(getSessions().filter(s => s.token !== token)); } localStorage.removeItem(CURRENT_SESSION_KEY); }
export function getUserByEmail(email: string): LocalUser | null { const user = getUsers().find(u => u.email === email.toLowerCase().trim()); if (!user) return null; const { passwordHash, ...safeUser } = user; return safeUser; }

export function updateUser(email: string, updates: Record<string, any>): boolean {
  const users = getUsers(); const index = users.findIndex(u => u.email === email.toLowerCase().trim());
  if (index === -1) return false; const safeUpdates = { ...updates }; delete safeUpdates.passwordHash; delete safeUpdates.id; delete safeUpdates.email; safeUpdates.updatedAt = new Date().toISOString();
  users[index] = { ...users[index], ...safeUpdates }; saveUsers(users); return true;
}

export function deleteUser(email: string): boolean { const users = getUsers(); const filtered = users.filter(u => u.email !== email.toLowerCase().trim()); if (filtered.length === users.length) return false; saveUsers(filtered); return true; }

if (typeof window !== 'undefined') initializeStore();