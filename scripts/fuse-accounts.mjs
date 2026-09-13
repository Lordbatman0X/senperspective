// One-time migration: fuse duplicate user records per email.
// - Canonical record = the Firebase Auth uid-keyed record
// - Email-keyed records become tiny pointers to the canonical record
// - Legacy sanitized-key records are deleted
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';
import { readFileSync } from 'fs';

const cfg = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(cfg.firebase || cfg);
const db = getDatabase(app);

const emailKey = (e) => String(e).toLowerCase().trim().replace(/[.#$[\]]/g, '_');

const snap = await get(ref(db, 'users'));
const users = snap.val() || {};
const byEmail = new Map();
for (const [key, d] of Object.entries(users)) {
  if (!d || typeof d !== 'object' || d.pointerTo) continue;
  const email = String(d.email || '').toLowerCase().trim();
  if (!email) continue;
  if (!byEmail.has(email)) byEmail.set(email, []);
  byEmail.get(email).push({ key, d });
}

for (const [email, records] of byEmail) {
  if (records.length < 2) continue;
  // Canonical: prefer the record whose key looks like a Firebase uid
  const canonical =
    records.find(r => /^[a-zA-Z0-9]{20,}$/.test(r.key)) ||
    records.sort((a, b) => (b.d.updatedAt || '').localeCompare(a.d.updatedAt || ''))[0];
  const merged = {};
  for (const r of records) Object.assign(merged, r.d);
  Object.assign(merged, { uid: canonical.key, email });
  await set(ref(db, `users/${canonical.key}`), merged);
  console.log(`CANONICAL ${email} -> ${canonical.key}`);
  for (const r of records) {
    if (r.key === canonical.key) continue;
    if (r.key === emailKey(email)) {
      await set(ref(db, `users/${r.key}`), { email, uid: canonical.key, pointerTo: canonical.key });
      console.log(`  pointer ${r.key}`);
    } else {
      await remove(ref(db, `users/${r.key}`));
      console.log(`  deleted legacy ${r.key}`);
    }
  }
}
console.log('DONE');
process.exit(0);
