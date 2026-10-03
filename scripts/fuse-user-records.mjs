// Repair split-brain user records caused by a case-folding bug in the profile
// write path (sanitizeKeySegment() lowercased canonical Firebase uids, so an
// edit meant for users/Sq7D8WLD... landed on users/sq7d8wld...).
//
// SAFETY:
//   * DRY RUN by default. Pass --apply to actually write.
//   * Always writes a full timestamped JSON backup first.
//   * Never invents identity fields: `role` comes from real data, never forced.
//   * Field-level merge, newest `updatedAt` wins, so a newer phone edit beats
//     an older canonical value instead of the whole record being clobbered.
//
// Usage:
//   node scripts/fuse-user-records.mjs           # dry run, prints the plan
//   node scripts/fuse-user-records.mjs --apply   # backup + write
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const cfg = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp({ ...cfg, databaseURL: cfg.databaseURL });
const db = getDatabase(app);

/** Mirror keys are derived from an email and must keep the app's exact form. */
const emailKey = (e) => String(e).toLowerCase().trim().replace(/[.#$/[\]]/g, '_');
/** A Firebase Auth uid is 20+ chars of [A-Za-z0-9] and is CASE-SENSITIVE. */
const looksLikeUid = (k) => /^[A-Za-z0-9]{20,}$/.test(k);

const stamp = (v) => {
  const t = Date.parse(v || '');
  return Number.isNaN(t) ? 0 : t;
};
const isEmpty = (v) =>
  v === undefined || v === null || v === '' ||
  (Array.isArray(v) && v.length === 0);

const snap = await get(ref(db, 'users'));
const users = snap.val() || {};
const allKeys = Object.keys(users);

if (APPLY) {
  mkdirSync('backups', { recursive: true });
  const file = `backups/users-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(file, JSON.stringify(users, null, 2));
  console.log(`BACKUP written: ${file}\n`);
}

// ---- Group every record under the email it belongs to -------------------
const groups = new Map();
const claim = (email, entry) => {
  const e = String(email || '').toLowerCase().trim();
  if (!e) return;
  if (!groups.has(e)) groups.set(e, []);
  groups.get(e).push(entry);
};
for (const key of allKeys) claim((users[key] || {}).email, { key, d: users[key] || {} });

for (const key of allKeys) {
  const d = users[key] || {};
  if (d.email) continue;
  // Recover an orphan (record lost its email) via pointerTo / uid.
  const owner = [d.pointerTo, d.uid].filter(Boolean)
    .map(t => users[t] && users[t].email)
    .find(Boolean);
  if (owner) { claim(owner, { key, d }); console.log(`(orphan ${key} -> ${owner})`); }
}

let plan = 0;
for (const [email, entries] of [...groups.entries()].sort()) {
  // Canonical = the real Firebase uid key. Prefer one that is actually pointed
  // at (that is what login sync treats as the account), else the newest
  // uid-looking key. NEVER pick a lowercase-uid shadow: that IS the bug.
  const pointed = new Set(entries.map(e => e.d.pointerTo).filter(Boolean));
  const uidEntries = entries.filter(e => looksLikeUid(e.key));
  const byDate = (a, b) => stamp(b.d.updatedAt) - stamp(a.d.updatedAt);
  const canonical =
    uidEntries.find(e => pointed.has(e.key)) ||
    [...uidEntries].sort(byDate)[0] ||
    [...entries].sort(byDate)[0];
  if (!canonical) continue;

  const isPointerStub = (e) => e.d.pointerTo && e.d.pointerTo !== e.key;
  const others = entries.filter(e => e.key !== canonical.key && !isPointerStub(e));
  const duplicates = allKeys.filter(k =>
    k !== canonical.key && k.toLowerCase() === canonical.key.toLowerCase());
  if (others.length === 0 && duplicates.length === 0) continue;
  plan++;

  console.log(`\n=== ${email}`);
  console.log(`  canonical : ${canonical.key}  (name="${canonical.d.name || ''}")`);
  for (const e of others) {
    console.log(`  shadow    : ${e.key}  (name="${e.d.name || ''}" updatedAt=${e.d.updatedAt || '-'})`);
  }
  for (const k of duplicates) console.log(`  DUPLICATE : ${k} (same uid, other case) -> delete`);

  if (!APPLY) continue;

  // ---- Field-level merge -------------------------------------------------
  //
  // DO NOT rank by `updatedAt`: syncUserProfile() bumps `updatedAt` on every
  // single login, so the canonical record always carries the newest timestamp
  // even when its profile fields were never edited. Ranking by it made the
  // canonical win and silently DISCARDED the user's real phone edit.
  //
  // Instead, rank the AUTHORITATIVE record last so a genuine profile edit on a
  // shadow overrides it, and treat activity-only fields (login bookkeeping) as
  // canonical-owned so a shadow's stale copy cannot rewind them.
  const ACTIVITY_ONLY = new Set([
    'updatedAt', 'createdAt', 'createdAtServer', 'lastActive', 'lastActiveAt', 'registeredAt',
  ]);
  // Newest-first, but canonical deliberately sorted LAST.
  const ranked = [...others].sort((a, b) => stamp(b.d.updatedAt) - stamp(a.d.updatedAt));
  const merged = {};
  for (const { d } of [...ranked, canonical]) {
    for (const [k, v] of Object.entries(d || {})) {
      if (isEmpty(v)) continue;
      if (!isEmpty(merged[k])) continue;           // first writer wins
      if (ACTIVITY_ONLY.has(k) && d !== canonical.d) continue; // canonical owns these
      merged[k] = v;
    }
  }
  // Identity is authoritative and derived, never inherited from a stale shadow.
  merged.email = email;
  merged.uid = canonical.key;
  delete merged.pointerTo;                      // canonical must not self-pointer
  merged.updatedAt = new Date().toISOString();

  await set(ref(db, `users/${canonical.key}`), merged);
  console.log(`  WROTE canonical (${Object.keys(merged).length} fields)`);

  // Email-keyed mirrors stay as POINTERS so every existing reader keeps working.
  for (const e of entries) {
    if (e.key === canonical.key) continue;
    const isEmailKey = e.key === emailKey(email) || e.key === emailKey(email).replace(/@/g, '_');
    if (isEmailKey) {
      await set(ref(db, `users/${e.key}`), { email, uid: canonical.key, pointerTo: canonical.key });
      console.log(`  pointer kept: ${e.key}`);
    } else {
      await remove(ref(db, `users/${e.key}`));
      console.log(`  removed shadow: ${e.key}`);
    }
  }
  // Same-uid-different-case duplicates are pure corruption — always delete.
  for (const k of duplicates) {
    await remove(ref(db, `users/${k}`));
    console.log(`  removed duplicate: ${k}`);
  }
}

console.log(`\n${plan} account(s) ${APPLY ? 'repaired' : 'would be repaired'} (${allKeys.length} records scanned).`);
console.log(APPLY ? 'DONE' : 'DRY RUN — re-run with --apply to write.');
process.exit(0);