import { MongoClient, Db, Collection } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'perspective';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongoDB(): Promise<Db | null> {
  if (db) return db;
  
  if (!MONGO_URI) {
    console.warn('[MongoDB] MONGODB_URI not set');
    return null;
  }

  try {
    client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`[MongoDB] Connected to ${DB_NAME}`);
    
    // Create indexes
    await createIndexes(db);
    
    // Seed admin accounts
    await seedAdminAccounts(db);
    
    return db;
  } catch (err: any) {
    console.error('[MongoDB] Connection failed:', err.message);
    return null;
  }
}

export function getDb(): Db | null {
  return db;
}

export function isConnected(): boolean {
  return db !== null;
}

export async function getCollection(name: string): Promise<Collection | null> {
  if (!db) return null;
  return db.collection(name);
}

async function createIndexes(db: Db) {
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('articles').createIndex({ id: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ token: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('[MongoDB] Indexes created');
  } catch (err: any) {
    console.warn('[MongoDB] Index creation warning:', err.message);
  }
}

async function seedAdminAccounts(db: Db) {
  const users = db.collection('users');
  
  const admins = [
    {
      email: 'kadersdiaz3@gmail.com',
      name: 'Kader S. Diaz',
      role: 'Admin',
      passwordHash: hashPassword('Perspective2026!'),
      avatarUrl: 'preset-male',
      bio: 'Fondateur & Directeur de Publication',
      accolades: ['verified_identity', 'editorial_board', 'elite_clearance'],
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      email: 'admin@perspective.sn',
      name: 'Perspective Admin',
      role: 'Admin',
      passwordHash: hashPassword('Admin2026!'),
      avatarUrl: 'preset-male',
      bio: 'Administrateur Système',
      accolades: ['verified_identity', 'elite_clearance'],
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const admin of admins) {
    await users.updateOne(
      { email: admin.email },
      { $setOnInsert: admin },
      { upsert: true }
    );
  }
  
  console.log('[MongoDB] Admin accounts seeded');
}

// Simple password hashing (same as client-side for compatibility)
const AUTH_SALT = '_perspective_auth_v2_2026_salt';

function hashPassword(password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password + AUTH_SALT).digest('hex');
}

export { hashPassword };

export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
}