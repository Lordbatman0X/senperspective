import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Read Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: firebaseConfig.projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
});

const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = 'kadersdiaz3@gmail.com';
const adminPassword = 'Perspective2026!';
const adminName = 'Kader S. Diaz';

async function createAdmin() {
  try {
    // Check if user exists
    let user;
    try {
      user = await auth.getUserByEmail(adminEmail);
      console.log(`User ${adminEmail} already exists, updating...`);
    } catch (err) {
      // Create new user
      user = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: adminName,
        emailVerified: true,
      });
      console.log(`Created user: ${user.uid}`);
    }

    // Set custom claims for admin
    await auth.setCustomUserClaims(user.uid, {
      role: 'Admin',
      isAdmin: true,
    });
    console.log('Admin claims set');

    // Create/update user profile in Firestore
    const userRef = db.collection('users').doc(adminEmail);
    await userRef.set({
      id: adminEmail,
      email: adminEmail,
      name: adminName,
      role: 'Admin',
      avatarUrl: 'preset-male',
      bio: 'Fondateur & Directeur de Publication — Perspective Group Sénégal',
      accolades: ['verified_identity', 'editorial_board', 'elite_clearance', 'sahel_insider'],
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOnline: true,
      streak: 25,
      readingTime: 820,
    }, { merge: true });
    console.log('User profile created/updated in Firestore');

    console.log('\n✅ Admin account created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createAdmin();