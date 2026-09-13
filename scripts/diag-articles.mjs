// Diagnostic script: dump articles + messages counts from the Realtime Database
// Usage: node scripts/diag-articles.mjs
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import cfg from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({ ...cfg, databaseURL: cfg.databaseURL });
const db = getDatabase(app);

try {
  const snap = await get(ref(db, 'articles'));
  console.log('articles exists:', snap.exists());
  if (snap.exists()) {
    const val = snap.val();
    const keys = Object.keys(val);
    console.log('article count:', keys.length);
    // Show the 5 most recent by date
    const sorted = keys
      .map(k => ({ k, date: val[k]?.date || val[k]?.createdAt || '', title: val[k]?.title?.fr || val[k]?.title?.en || val[k]?.title || '(no title)' }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const a of sorted.slice(0, 8)) {
      console.log(`  ${a.date} | ${a.k} | ${String(a.title).slice(0, 60)}`);
    }
  }
  const msgSnap = await get(ref(db, 'messages'));
  console.log('messages exists:', msgSnap.exists());
  if (msgSnap.exists()) {
    const m = msgSnap.val();
    const keys = Object.keys(m);
    console.log('message count:', keys.length);
    for (const k of keys.slice(0, 10)) {
      console.log(`  ${k}: ${m[k]?.sender} -> ${m[k]?.receiver} | ${String(m[k]?.text || '').slice(0, 40)}`);
    }
  }
} catch (e) {
  console.error('ERROR:', e.code || e.message);
}
