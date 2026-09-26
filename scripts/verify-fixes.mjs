// Verifies the fixes that cannot be seen by grepping a minified bundle:
// identifier names are mangled, so we exercise the real app in a browser.
import fs from 'node:fs';

const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'shot_verify.png';

// Chrome is launched separately (from the run command) because spawning it
// from Node proved unreliable on this host. This script connects only.
const port = Number(process.argv[4] || 9333);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll for the DevTools endpoint rather than guessing a fixed delay; headless
// Chrome can take several seconds to open the port on a cold start.
let list = null;
for (let i = 0; i < 40; i++) {
  await sleep(1000);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    list = await res.json();
    if (list.some((t) => t.type === 'page' && t.webSocketDebuggerUrl)) break;
  } catch {
    // not up yet
  }
}
if (!list || !list.some((t) => t.webSocketDebuggerUrl)) {
  console.error('Chrome DevTools endpoint never came up');
  process.exit(1);
}
const target = list.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

const send = (method, params = {}) =>
  new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

await new Promise((r) => ws.addEventListener('open', r));

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url });
await sleep(5000);

// --- session id: must be stable within a session, and pinned device type ---
const sessionProbe = await evaluate(`(() => {
  const k = 'perspective_analytics_session_id';
  const t = 'perspective_analytics_session_ts';
  const d = 'perspective_analytics_device';
  localStorage.removeItem(k); localStorage.removeItem(t); sessionStorage.removeItem(d);
  return { cleared: !localStorage.getItem(k) };
})()`);

const afterFirst = await evaluate(`(() => {
  // Trigger a pageview by navigating, then read what the app persisted.
  const k = 'perspective_analytics_session_id';
  const t = 'perspective_analytics_session_ts';
  return { sid: localStorage.getItem(k), ts: localStorage.getItem(t) };
})()`);

console.log('=== SESSION STORAGE ===');
console.log('cleared:', JSON.stringify(sessionProbe));
console.log('after load:', JSON.stringify(afterFirst));

// --- analytics gating: with no consent stored, personal events must be dropped ---
const consentProbe = await evaluate(`(() => {
  try { localStorage.removeItem('perspective_cookie_consent'); } catch(e) {}
  return { consent: localStorage.getItem('perspective_cookie_consent') };
})()`);
console.log('\n=== CONSENT (undecided) ===');
console.log(JSON.stringify(consentProbe));

// With no consent stored the pageview is gated, so no session id is ever
// created. Grant analytics consent and reload: the session must then appear,
// be stable across reads, and carry the expiry timestamp.
await evaluate(`(() => {
  localStorage.setItem('perspective_cookie_consent', JSON.stringify({
    essential: true, analytics: true, personalization: true, marketing: true
  }));
  return true;
})()`);
await send('Page.navigate', { url });
await sleep(5000);

const grantedProbe = await evaluate(`(() => {
  const k = 'perspective_analytics_session_id';
  const t = 'perspective_analytics_session_ts';
  const d = 'perspective_analytics_device';
  const first = localStorage.getItem(k);
  return {
    sid: first,
    sidFormat: /^sess_\\d+_/.test(first || '') ? 'ok' : 'BAD',
    hasExpiryStamp: !!localStorage.getItem(t),
    devicePinned: sessionStorage.getItem(d),
  };
})()`);
console.log('\n=== CONSENT GRANTED ===');
console.log(JSON.stringify(grantedProbe));

// Simulate a stale session (older than the 30 min idle window) and confirm the
// id rotates on the next read rather than living forever. A real navigation is
// used because getSessionId() is only called when an event actually fires.
await evaluate(`(() => {
  localStorage.setItem('perspective_analytics_session_ts', String(Date.now() - 31 * 60 * 1000));
  return true;
})()`);
const beforeRotate = await evaluate(`localStorage.getItem('perspective_analytics_session_id')`);
await send('Page.navigate', { url });
await sleep(5000);
const afterRotate = await evaluate(`localStorage.getItem('perspective_analytics_session_id')`);
console.log('\n=== STALE SESSION (31 min old) ===');
console.log(JSON.stringify({
  before: beforeRotate,
  after: afterRotate,
  rotated: !!beforeRotate && beforeRotate !== afterRotate,
}));

// --- password reset screen reachable via ?mode=reset ---
await send('Page.navigate', { url: new URL('/auth?mode=reset', url).toString() });
await sleep(3500);
const authProbe = await evaluate(`(() => {
  const t = document.body.innerText || '';
  return {
    hasOobNotice: /mode=reset/.test(location.search),
    mentionsBrand: /Perspective Group/.test(t),
    // With no oobCode the normal auth form should still render.
    hasSignIn: /Connexion|Sign In/i.test(t),
  };
})()`);
console.log('\n=== AUTH PAGE ===');
console.log(JSON.stringify(authProbe));

const shot = await send('Page.captureScreenshot', { format: 'png' });
if (shot.result?.data) {
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('saved ' + out);
}

ws.close();
process.exit(0);
