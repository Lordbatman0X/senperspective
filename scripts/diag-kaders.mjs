// Diagnostic + fusion script for the kadersdiaz3 super-admin account.
// Usage:
//   node scripts/diag-kaders.mjs          -> dump all matching user records
//   node scripts/diag-kaders.mjs --fuse   -> merge duplicates into ONE record
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, remove, set } from 'firebase/database';
import cfg from '../firebase-applet-config.json' with { type: 'json' };

const TARGET = 'kadersdiaz3@gmail.com';
const app = initializeApp({ ...cfg, databaseURL: cfg.databaseURL });
const db = getDatabase(app);

const doFuse = process.argv.includes('--fuse');

try {
  const snap = await get(ref(db, 'users'));
  const val = snap.val() || {};
  const matches = [];
  for (const [key, u] of Object.entries(val)) {
    const email = String(u?.email || '').toLowerCase().trim();
    const keyLooksLike = key.toLowerCase().includes('kadersdiaz');
    if (email === TARGET || keyLooksLike) matches.push({ key, u });
  }
  console.log(`found ${matches.length} record(s) for ${TARGET}:`);
  for (const { key, u } of matches) {
    console.log(`KEY=${key}`);
    console.log(`  email=${u.email} name=${u.name} role=${u.role} suspended=${u.suspended} uid=${u.uid}`);
    console.log(`  avatarUrl=${String(u.avatarUrl || '').startsWith('data:') ? `(base64 ${String(u.avatarUrl).length} chars)` : u.avatarUrl} coverPhotoUrl=${String(u.coverPhotoUrl || '').startsWith('data:') ? `(base64 ${String(u.coverPhotoUrl).length} chars)` : (u.coverPhotoUrl || '').slice(0, 30)} bio=${(u.bio || '').slice(0, 40)}`);
    console.log(`  streak=${u.streak} readingTime=${u.readingTime} accolades=${JSON.stringify(u.accolades)}`);
  }

  if (doFuse && matches.length > 1) {
    // Canonical record: prefer the Firebase Auth uid key, else the raw email key.
    const withUid = matches.filter(m => m.u.uid && m.key === m.u.uid);
    const byRawEmail = matches.find(m => m.key === TARGET);
    const canonical = withUid[0] || byRawEmail || matches[0];
    // Merge: start from canonical, overlay non-empty fields from the others
    // (longest strings / largest arrays / biggest numbers win).
    const merged = { ...(canonical.u || {}) };
    for (const m of matches) {
      if (m === canonical) continue;
      const o = m.u || {};
      for (const [k, v] of Object.entries(o)) {
        if (v === undefined || v === null || v === '') continue;
        const cur = merged[k];
        const curEmpty = cur === undefined || cur === null || cur === '' || cur === 'preset-male';
        if (curEmpty) { merged[k] = v; continue; }
        if (typeof v === 'string' && typeof cur === 'string' && v.length > cur.length) merged[k] = v;
        if (Array.isArray(v) && (!Array.isArray(cur) || v.length > cur.length)) merged[k] = v;
        if (typeof v === 'number' && typeof cur === 'number' && v > cur) merged[k] = v;
      }
    }
    // Identity fields are authoritative for the super admin.
    merged.email = TARGET;
    merged.role = 'Admin';
    merged.suspended = false;
    if (!merged.uid) merged.uid = canonical.u.uid || '';
    console.log('\nCANONICAL KEY =', canonical.key);
    console.log('merged name =', merged.name, '| role =', merged.role);
    await set(ref(db, `users/${canonical.key}`), merged);
    for (const m of matches) {
      if (m.key === canonical.key) continue;
      await remove(ref(db, `users/${m.key}`));
      console.log('REMOVED duplicate record:', m.key);
    }
    console.log('FUSION COMPLETE — single canonical record:', canonical.key);
  } else if (doFuse) {
    console.log('nothing to fuse (single record or none).');
  }
} catch (e) {
  console.error('ERROR:', e.code || e.message);
}
