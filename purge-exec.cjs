const BASE = 'https://senperspective-api-56o8.onrender.com';
const KEEP_EMAILS = ['kadersdiaz3@gmail.com', 'admin@perspective.sn'];

async function wipeCollection(name) {
  try {
    const r = await fetch(`${BASE}/api/mongodb/collection/${name}/wipe`, { method: 'DELETE' });
    const t = await r.text();
    console.log(`wipe ${name}: ${r.status} ${t.slice(0, 120)}`);
  } catch (e) { console.log(`wipe ${name} failed:`, e.message); }
}

async function listDocs(name) {
  try {
    const r = await fetch(`${BASE}/api/mongodb/collection/${name}`);
    const j = await r.json();
    const docs = (j && j.documents) || [];
    console.log(`${name}: ${docs.length} docs`);
    docs.forEach(d => {
      const dd = d.data || d;
      console.log('  -', dd.id || dd.email || dd._id || '(no id)');
    });
    return docs;
  } catch (e) { console.log(`${name} failed:`, e.message); return []; }
}

const collections = ['articles', 'comments', 'directMessages', 'notifications', 'friends', 'interactions', 'media', 'ads', 'subscribers', 'matches', 'users', 'site_settings'];

const seedUsers = require('fs').existsSync('server/data/central_db.json')
  ? JSON.parse(require('fs').readFileSync('server/data/central_db.json', 'utf8')).users || {}
  : {};

async function main() {
  console.log('=== BEFORE ===');
  for (const c of collections) await listDocs(c);

  console.log('=== WIPING ALL CONTENT COLLECTIONS (preserving admins) ===');
  for (const c of ['articles', 'comments', 'directMessages', 'notifications', 'friends', 'interactions', 'media', 'ads', 'subscribers', 'matches', 'site_settings']) {
    await wipeCollection(c);
  }
  await wipeCollection('users');

  console.log('=== RE-SEEDING protected admins ===');
  for (const email of KEEP_EMAILS) {
    const src = seedUsers[email] || {};
    const admin = {
      id: email,
      email: email,
      name: src.name || (email === 'kadersdiaz3@gmail.com' ? 'Kaders Diaz' : 'Perspective Admin'),
      role: 'Admin',
      avatarUrl: src.avatarUrl || 'preset-male',
      bio: src.bio || '',
      emailVerified: true,
      ...src
    };
    try {
      const r = await fetch(`${BASE}/api/mongodb/doc/users/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: admin, merge: true })
      });
      console.log('seed admin:', email, r.status, (await r.text()).slice(0, 120));
    } catch (e) { console.log('seed admin failed:', email, e.message); }
  }

  console.log('=== AFTER ===');
  for (const c of collections.slice(0, 4)) await listDocs(c);
}

main();
