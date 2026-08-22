import mongoose, { Document, Model } from 'mongoose';

// Disable mongoose command buffering globally and set a short timeout so operations fail immediately if disconnected
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 1000);

const MONGO_URL = process.env.MONGO_URL || '';

let isConnecting = false;

export async function connectMongo(): Promise<boolean> {
  if ((mongoose.connection.readyState as number) === 1) {
    return true;
  }
  if (!MONGO_URL || MONGO_URL.trim() === '') {
    return false;
  }

  // If already connecting, wait briefly up to 1.5 seconds for connection state
  if (isConnecting || (mongoose.connection.readyState as number) === 2) {
    let waited = 0;
    while ((mongoose.connection.readyState as number) === 2 && waited < 15) {
      await new Promise((r) => setTimeout(r, 100));
      waited++;
    }
    return (mongoose.connection.readyState as number) === 1;
  }

  isConnecting = true;
  try {
    await mongoose.connect(MONGO_URL, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
      bufferCommands: false
    });
    console.log("[MongoDB] Connected successfully to MongoDB database.");
    return (mongoose.connection.readyState as number) === 1;
  } catch (err: any) {
    console.warn("[MongoDB] Connection notice (using in-memory store fallback):", err?.message || err);
    return false;
  } finally {
    isConnecting = false;
  }
}

export interface IGenericDoc extends Document {
  docId: string;
  collectionName: string;
  data: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const GenericDocSchema = new mongoose.Schema<IGenericDoc>(
  {
    docId: { type: String, required: true, index: true },
    collectionName: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true, strict: false, bufferCommands: false }
);

GenericDocSchema.index({ collectionName: 1, docId: 1 }, { unique: true });

export const MongoDocModel: Model<IGenericDoc> =
  (mongoose.models.GenericDoc as Model<IGenericDoc>) ||
  mongoose.model<IGenericDoc>('GenericDoc', GenericDocSchema);

export interface IMongoUser extends Document {
  email: string;
  name: string;
  password?: string;
  role: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  registeredAt?: string;
  status?: string;
  pin?: string;
  authType?: string;
  twoFactorEnabled?: boolean;
  streak?: number;
  readingTime?: number;
  hidePersonalInfo?: boolean;
  hideEmail?: boolean;
  token?: string;
}

const MongoUserSchema = new mongoose.Schema<IMongoUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    password: { type: String, default: '' },
    role: { type: String, default: 'Abonné' },
    avatarUrl: { type: String, default: '' },
    coverPhotoUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    registeredAt: { type: String, default: () => new Date().toISOString() },
    status: { type: String, default: 'active' },
    pin: { type: String, default: '' },
    authType: { type: String, default: 'password' },
    twoFactorEnabled: { type: Boolean, default: false },
    streak: { type: Number, default: 1 },
    readingTime: { type: Number, default: 0 },
    hidePersonalInfo: { type: Boolean, default: false },
    hideEmail: { type: Boolean, default: false },
    token: { type: String, default: '' }
  },
  { timestamps: true, bufferCommands: false }
);

export const MongoUserModel: Model<IMongoUser> =
  (mongoose.models.MongoUser as Model<IMongoUser>) ||
  mongoose.model<IMongoUser>('MongoUser', MongoUserSchema);

// In-Memory Storage Fallback (guarantees fast responses if MongoDB is disconnected or MONGO_URL unset)
const inMemoryDocs = new Map<string, { docId: string; collectionName: string; data: any; createdAt: Date; updatedAt: Date }>();
const inMemoryUsers = new Map<string, any>();

function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function getCollectionDocs(collectionName: string) {
  const connected = await connectMongo();
  if (connected && isMongoReady()) {
    try {
      const docs = await MongoDocModel.find({ collectionName }).lean().exec();
      return docs.map((d: any) => ({
        id: d.docId,
        docId: d.docId,
        data: d.data,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }));
    } catch (err) {
      console.warn("[MongoDB Query Notice, using memory store]", err);
    }
  }

  const results: any[] = [];
  inMemoryDocs.forEach((val) => {
    if (val.collectionName === collectionName) {
      results.push({
        id: val.docId,
        docId: val.docId,
        data: val.data,
        createdAt: val.createdAt,
        updatedAt: val.updatedAt
      });
    }
  });
  return results;
}

export async function getDocument(collectionName: string, docId: string) {
  const connected = await connectMongo();
  if (connected && isMongoReady()) {
    try {
      const doc = await MongoDocModel.findOne({ collectionName, docId }).lean().exec();
      if (doc) {
        return { id: doc.docId, data: doc.data };
      }
      return null;
    } catch (err) {
      console.warn("[MongoDB Query Notice, using memory store]", err);
    }
  }

  const key = `${collectionName}:${docId}`;
  const found = inMemoryDocs.get(key);
  if (found) {
    return { id: found.docId, data: found.data };
  }
  return null;
}

export async function saveDocument(collectionName: string, docId: string, data: any, merge: boolean = true) {
  let finalData = data;
  
  const existing = await getDocument(collectionName, docId);
  if (merge && existing && existing.data && typeof existing.data === "object" && typeof data === "object") {
    finalData = { ...existing.data, ...data };
  }

  const key = `${collectionName}:${docId}`;
  const now = new Date();
  inMemoryDocs.set(key, {
    docId,
    collectionName,
    data: finalData,
    createdAt: inMemoryDocs.get(key)?.createdAt || now,
    updatedAt: now
  });

  const connected = await connectMongo();
  if (connected && isMongoReady()) {
    try {
      const updated = await MongoDocModel.findOneAndUpdate(
        { collectionName, docId },
        { collectionName, docId, data: finalData },
        { upsert: true, new: true }
      ).exec();
      if (updated) {
        return { id: updated.docId, data: updated.data };
      }
    } catch (err) {
      console.warn("[MongoDB Save Notice]", err);
    }
  }

  return { id: docId, data: finalData };
}

export async function deleteDocument(collectionName: string, docId: string) {
  const key = `${collectionName}:${docId}`;
  inMemoryDocs.delete(key);

  const connected = await connectMongo();
  if (connected && isMongoReady()) {
    try {
      await MongoDocModel.deleteOne({ collectionName, docId }).exec();
    } catch (err) {
      console.warn("[MongoDB Delete Notice]", err);
    }
  }
  return true;
}

export async function wipeCollection(collectionName: string) {
  for (const [key, val] of inMemoryDocs.entries()) {
    if (val.collectionName === collectionName) {
      inMemoryDocs.delete(key);
    }
  }

  const connected = await connectMongo();
  let deletedCount = 0;
  if (connected && isMongoReady()) {
    try {
      const res = await MongoDocModel.deleteMany({ collectionName }).exec();
      deletedCount = res.deletedCount || 0;
    } catch (err) {
      console.warn("[MongoDB Wipe Notice]", err);
    }
  }
  return deletedCount;
}

export async function registerUser(email: string, password?: string, name?: string) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const connected = await connectMongo();
  
  let userData: any = null;

  if (connected && isMongoReady()) {
    try {
      let existingUser = await MongoUserModel.findOne({ email: normalizedEmail }).exec();
      if (!existingUser) {
        existingUser = await MongoUserModel.create({
          email: normalizedEmail,
          password: password || 'default_pass',
          name: name || normalizedEmail.split('@')[0],
          registeredAt: new Date().toISOString(),
          role: 'Abonné'
        });
      }
      userData = {
        id: existingUser._id.toString(),
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        avatarUrl: existingUser.avatarUrl || '',
        coverPhotoUrl: existingUser.coverPhotoUrl || '',
        registeredAt: existingUser.registeredAt,
        streak: existingUser.streak,
        readingTime: existingUser.readingTime
      };
    } catch (err) {
      console.warn("[MongoDB User Register Notice]", err);
    }
  }

  if (!userData) {
    let existingInMemory = inMemoryUsers.get(normalizedEmail);
    if (!existingInMemory) {
      existingInMemory = {
        id: 'user_' + Date.now(),
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        role: 'Abonné',
        avatarUrl: '',
        coverPhotoUrl: '',
        registeredAt: new Date().toISOString(),
        streak: 1,
        readingTime: 0
      };
      inMemoryUsers.set(normalizedEmail, existingInMemory);
    }
    userData = existingInMemory;
  }

  await saveDocument('users', normalizedEmail, userData, true);
  return userData;
}

export async function loginUser(email: string, password?: string) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const connected = await connectMongo();

  let userData: any = null;

  if (connected && isMongoReady()) {
    try {
      let user = await MongoUserModel.findOne({ email: normalizedEmail }).exec();
      if (!user) {
        user = await MongoUserModel.create({
          email: normalizedEmail,
          password: password || 'default_pass',
          name: normalizedEmail.split('@')[0],
          registeredAt: new Date().toISOString(),
          role: 'Abonné'
        });
      }
      userData = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl || '',
        coverPhotoUrl: user.coverPhotoUrl || '',
        registeredAt: user.registeredAt,
        streak: user.streak,
        readingTime: user.readingTime
      };
    } catch (err) {
      console.warn("[MongoDB User Login Notice]", err);
    }
  }

  if (!userData) {
    return registerUser(normalizedEmail, password);
  }

  return userData;
}

export async function updateUserPasswordServer(email: string, newPassword: string) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const connected = await connectMongo();

  if (connected && isMongoReady()) {
    try {
      await MongoUserModel.findOneAndUpdate(
        { email: normalizedEmail },
        { password: newPassword },
        { upsert: true }
      ).exec();
    } catch (err) {
      console.warn("[MongoDB Password Update Notice]", err);
    }
  }

  const existingInMemory = inMemoryUsers.get(normalizedEmail);
  if (existingInMemory) {
    existingInMemory.password = newPassword;
    inMemoryUsers.set(normalizedEmail, existingInMemory);
  }

  await saveDocument('users', normalizedEmail, { password: newPassword }, true);
  return { success: true, email: normalizedEmail };
}
