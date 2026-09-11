import { Collection, ObjectId } from 'mongodb';
import { getCollection, hashPassword } from './mongodb';

export interface User {
  _id?: ObjectId;
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  passwordHash?: string;
  deletedAt?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

export interface Session {
  token: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  additionalFields: Record<string, any> = {}
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const users = await getCollection('users');
    if (!users) return { success: false, error: 'Database not available' };

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing && !existing.deletedAt) {
      return { success: false, error: 'Email already registered' };
    }

    const isSuperAdmin = normalizedEmail === 'kadersdiaz3@gmail.com';
    const userData: User = {
      id: normalizedEmail,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      role: isSuperAdmin ? 'Admin' : (additionalFields.role || 'Member'),
      passwordHash: hashPassword(password),
      avatarUrl: additionalFields.avatarUrl || 'preset-male',
      bio: additionalFields.bio || '',
      accolades: isSuperAdmin ? ['verified_identity', 'editorial_board', 'elite_clearance'] : ['verified_identity'],
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...additionalFields,
    };

    if (existing) {
      await users.updateOne({ email: normalizedEmail }, { $set: { ...userData, deletedAt: null } });
    } else {
      await users.insertOne(userData);
    }

    const { passwordHash, ...safeUser } = userData;
    return { success: true, user: safeUser as User };
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration failed' };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; session?: Session; error?: string }> {
  try {
    const users = await getCollection('users');
    if (!users) return { success: false, error: 'Database not available' };
    const normalizedEmail = email.toLowerCase().trim();
    const user = await users.findOne({ email: normalizedEmail });
    if (!user) return { success: false, error: 'Invalid credentials' };
    const hashedInput = hashPassword(password);
    if (user.passwordHash && user.passwordHash !== hashedInput) {
      return { success: false, error: 'Invalid credentials' };
    }
    if (!user.passwordHash) {
      await users.updateOne({ email: normalizedEmail }, { $set: { passwordHash: hashedInput } });
    }
    if (user.deletedAt) {
      await users.updateOne({ email: normalizedEmail }, { $set: { deletedAt: null, updatedAt: new Date() } });
      user.deletedAt = null;
    }
    await users.updateOne({ email: normalizedEmail }, { $set: { updatedAt: new Date(), isOnline: true } });
    const session = await createSession(normalizedEmail);
    const { passwordHash, ...safeUser } = user;
    return { success: true, user: safeUser as User, session };
  } catch (err: any) {
    return { success: false, error: err.message || 'Login failed' };
  }
}

async function createSession(email: string): Promise<Session> {
  const sessions = await getCollection('sessions');
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const session: Session = {
    token,
    email: email.toLowerCase().trim(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };
  if (sessions) await sessions.insertOne(session);
  return session;
}

export async function validateSession(token: string): Promise<User | null> {
  try {
    const sessions = await getCollection('sessions');
    const users = await getCollection('users');
    if (!sessions || !users) return null;
    const session = await sessions.findOne({ token });
    if (!session || session.expiresAt < new Date()) return null;
    const user = await users.findOne({ email: session.email, deletedAt: null });
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser as User;
  } catch { return null; }
}

export async function logoutUser(token: string): Promise<boolean> {
  try {
    const sessions = await getCollection('sessions');
    if (!sessions) return false;
    await sessions.deleteOne({ token });
    return true;
  } catch { return false; }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const users = await getCollection('users');
    if (!users) return null;
    const user = await users.findOne({ email: email.toLowerCase().trim(), deletedAt: null });
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser as User;
  } catch { return null; }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await getCollection('users');
    if (!users) return [];
    const userList = await users.find({ deletedAt: null }).toArray();
    return userList.map(({ passwordHash, ...user }) => user as User);
  } catch { return []; }
}

export async function deleteUser(email: string): Promise<boolean> {
  try {
    const users = await getCollection('users');
    if (!users) return false;
    await users.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { deletedAt: new Date().toISOString(), updatedAt: new Date() } }
    );
    return true;
  } catch { return false; }
}

export async function updateUser(email: string, updates: Record<string, any>): Promise<boolean> {
  try {
    const users = await getCollection('users');
    if (!users) return false;
    const safeUpdates = { ...updates };
    delete safeUpdates.passwordHash;
    delete safeUpdates._id;
    delete safeUpdates.email;
    safeUpdates.updatedAt = new Date();
    await users.updateOne({ email: email.toLowerCase().trim() }, { $set: safeUpdates });
    return true;
  } catch { return false; }
}