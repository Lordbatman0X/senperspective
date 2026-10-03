/**
 * Lightweight, DevTools-free diagnostics.
 *
 * WHY: diagnosing the login/sync problems needed the browser console, but F12
 * is blocked or needs Fn on many machines. This captures the same signal and
 * ships it to a Realtime Database node that can be read over plain REST, so the
 * failure can be inspected without opening any developer tooling.
 *
 * Deliberately defensive: never throws, never blocks, never awaits. A
 * diagnostics helper must not become a new source of errors.
 */
const ENDPOINT =
  'https://ai-studio-applet-webapp-29e84-default-rtdb.firebaseio.com/client_diagnostics';
const SESSION = Math.random().toString(36).slice(2, 10);
const buffer: any[] = [];
let started = false;

function push(kind: string, detail: string, extra?: any) {
  try {
    buffer.push({
      kind,
      detail: String(detail || '').slice(0, 800),
      extra: extra === undefined ? null : JSON.parse(JSON.stringify(extra)).toString?.().slice(0, 400) ?? String(extra).slice(0, 400),
      at: new Date().toISOString(),
      url: typeof location !== 'undefined' ? location.pathname : '',
      online: typeof navigator !== 'undefined' ? navigator.onLine : null,
    });
    if (buffer.length >= 10) void flush();
  } catch { /* never throw */ }
}

export async function flush(): Promise<void> {
  if (!buffer.length) return;
  const batch = buffer.splice(0, buffer.length);
  try {
    await fetch(`${ENDPOINT}/${SESSION}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(batch.map((b, i) => [`e${i}`, b])), seenAt: new Date().toISOString() }),
      keepalive: true,
    });
  } catch { /* offline: drop, never surface */ }
}

export function startDiagnostics(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('error', (e: any) => {
    if (e && e.target && e.target.tagName && !e.message) {
      push('load-fail', (e.target.src || e.target.href || e.target.tagName));
    } else {
      push('error', e?.message || String(e), { file: e?.filename, line: e?.lineno });
    }
    void flush();
  }, true);

  window.addEventListener('unhandledrejection', (e: any) => {
    push('unhandled-rejection', e?.reason?.message || String(e?.reason));
    void flush();
  });

  // Surface our own warnings (timeouts, permission denials) too.
  //
  // console.warn matters as much as console.error here: the database layer
  // reports its failures through console.warn ("Database timeout after 7000ms",
  // "write not confirmed by server"), so hooking console.error alone silently
  // discarded the very signal this reporter exists to collect.
  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: any[]) => {
      push(`${level}-output`, args.map(a => (a && a.message) || String(a)).join(' '));
      void flush();
      original(...args);
    };
  }

  window.addEventListener('online', () => { push('net', 'back online'); void flush(); });
  window.addEventListener('offline', () => { push('net', 'went offline'); void flush(); });

  push('session-start', 'diagnostics armed', { ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '' });
  setInterval(() => void flush(), 15000);
  window.addEventListener('pagehide', () => void flush());
}

export const diagnosticsSessionId = SESSION;