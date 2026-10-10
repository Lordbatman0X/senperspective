// scripts/test-api-utils.mjs
// Regression test for the backend-URL normalisation that fixes the
// "Failed to execute 'fetch' on 'Window': Failed to parse URL from //" crash.
//
// `getApiBaseUrl` used to return a hand-entered value with only trailing
// slashes trimmed, so a base typed without a scheme (`localhost:3000`,
// `//localhost:3000`, bare `https://`) was concatenated by `resolveApiUrl`
// into an invalid URL and every `/api/...` fetch threw. The fix must:
//   1. Keep a valid http(s) origin.
//   2. Reject anything that is not a real http(s) URL (treated as "unset"),
//      so `resolveApiUrl` falls back to a clean same-origin relative path.
//   3. Never emit a URL that `new URL` cannot parse.
import assert from 'node:assert/strict';

// apiUtils reads window/localStorage lazily (inside functions), so stubbing
// them before the import is safe. Bundled with esbuild (see test:api-utils).
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
const setHost = (hostname) => {
  globalThis.window = { location: { hostname, origin: `https://${hostname}`, host: hostname } };
};

import { getApiBaseUrl, setApiBaseUrl, resolveApiUrl, isStaticApiRoute, normalizeBackendBase } from '../src/lib/apiUtils';

const ok = (m) => console.log(`ok - ${m}`);
const KEY = 'perspective_backend_api_url';

// --- normalizeBackendBase: the shared guard used by BOTH getApiBaseUrl (Admin
//     "Backend proxy URL") and main.tsx's global fetch interceptor (the
//     VITE_API_BASE_URL env var). A malformed value MUST become '' so neither
//     path builds an invalid `//api/...` URL. -------------------------------
assert.equal(normalizeBackendBase('https://api.example.com/'), 'https://api.example.com');
assert.equal(normalizeBackendBase('https://api.example.com/base/'), 'https://api.example.com/base');
assert.equal(normalizeBackendBase('http://localhost:3000'), 'http://localhost:3000');
for (const bad of ['', '   ', 'localhost:3000', '//localhost:3000', 'https://', 'http://', 'ftp://host', 'not a url', '/relative', 'senperspective.com']) {
  assert.equal(normalizeBackendBase(bad), '', `normalizeBackendBase("${bad}") must be unset`);
}
// Whatever a valid base yields, concatenating a `/api/...` path stays parseable
// — the exact "Failed to parse URL from //" regression.
for (const good of ['https://api.example.com', 'https://api.example.com/base']) {
  assert.doesNotThrow(() => new URL(`${good}/api/rss-automation/config`));
}
ok('normalizeBackendBase keeps only real http(s) origins; malformed values are unset (no // URL)');

// --- valid bases are kept verbatim (minus trailing slash / mount path) ------
setHost('senperspective.com');
store.set(KEY, 'https://api.example.com/');
assert.equal(getApiBaseUrl(), 'https://api.example.com');
store.set(KEY, 'https://api.example.com/base/');
assert.equal(getApiBaseUrl(), 'https://api.example.com/base', 'a mount path is preserved, trailing slash trimmed');
store.set(KEY, 'http://localhost:3000');
assert.equal(getApiBaseUrl(), 'http://localhost:3000', 'http localhost is a valid base');
ok('a valid http(s) base is kept as an origin (+ optional mount path)');

// --- invalid / scheme-less bases are treated as UNSET (not concatenated) ----
for (const bad of ['localhost:3000', '//localhost:3000', 'https://', 'http://', 'ftp://host', 'not a url', '/relative']) {
  store.set(KEY, bad);
  assert.equal(getApiBaseUrl(), '', `"${bad}" must normalise to unset`);
  // And resolveApiUrl must fall back to a clean relative path, never a `//` URL.
  const resolved = resolveApiUrl('/api/rss-automation/config');
  assert.equal(resolved, '/api/rss-automation/config', `"${bad}" must not poison resolveApiUrl`);
  // Whatever comes out must be parseable — this is the exact crash that was hit.
  assert.doesNotThrow(() => new URL(resolved, 'https://app.example'), `resolved URL for "${bad}" must parse`);
}
ok('a scheme-less / malformed base is treated as unset, so resolveApiUrl stays clean');

// --- resolveApiUrl with a valid base builds a correct absolute URL ----------
store.set(KEY, 'https://api.example.com');
assert.equal(resolveApiUrl('/api/chat'), 'https://api.example.com/api/chat');
assert.equal(resolveApiUrl('api/chat'), 'https://api.example.com/api/chat', 'a path without a leading slash is normalised');
assert.equal(resolveApiUrl('https://other.test/x'), 'https://other.test/x', 'an absolute URL is returned untouched');
ok('resolveApiUrl joins a valid base with the path, and passes absolute URLs through');

// --- setApiBaseUrl round-trips a valid value and clears an invalid one ------
setApiBaseUrl('https://railway.app');
assert.equal(getApiBaseUrl(), 'https://railway.app');
setApiBaseUrl('localhost:3000'); // invalid → treated as unset on read
assert.equal(getApiBaseUrl(), '', 'an invalid saved base reads back as unset (no crash)');
setApiBaseUrl(null);
assert.equal(getApiBaseUrl(), '');
ok('setApiBaseUrl stores the value; an invalid one reads back as unset');

// --- isStaticApiRoute: no doomed /api call on a host with no backend -------
setHost('senperspective.com');
store.clear();
assert.equal(isStaticApiRoute('/api/rss-automation/config'), true, 'no base on a custom domain → static route (skip)');
store.set(KEY, 'https://api.example.com');
assert.equal(isStaticApiRoute('/api/rss-automation/config'), false, 'a configured base → real backend (call it)');
setHost('localhost');
assert.equal(isStaticApiRoute('/api/rss-automation/config'), false, 'local Express/Vite serves the API on the same origin');
ok('isStaticApiRoute only reports a static route when there is truly no backend');

console.log('\napi url normalisation checks passed');
process.exit(0);
