// Diagnostic script: dump users + site_settings from the Realtime Database
// Usage: node scripts/diag-users.mjs
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import cfg from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({ ...cfg, databaseURL: cfg.databaseURL });
const db = getDatabase(app);

try {
  const usersSnap = await get(ref(db, 'users'));
  if (usersSnap.exists()) {
    const val = usersSnap.val();
    for (const [key, u] of Object.entries(val)) {
      console.log(`KEY=${key}`);
      console.log(`  email=${u.email} name=${u.name} role=${u.role} suspended=${u.suspended} uid=${u.uid} hasPasswordHash=${Boolean(u.passwordHash || u.password)}`);
    }
  } else {
    console.log('NO USERS DATA');
  }
  const ss = await get(ref(db, 'site_settings/global'));
  console.log('site_settings exists:', ss.exists());
  if (ss.exists()) {
    const v = ss.val();
    console.log('boukariCorpLogo length:', (v.boukariCorpLogo || '').length);
    console.log('siteName:', v.siteName, 'accentColor:', v.accentColor);
  }
} catch (e) {
  console.error('ERROR:', e.code || e.message);
}
