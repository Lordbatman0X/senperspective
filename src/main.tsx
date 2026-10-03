import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { startDiagnostics } from './lib/diagnostics';
import './index.css';

// Arm DevTools-free diagnostics first, so even a failure during the rest of
// startup is captured and shipped.
startDiagnostics();

// Global API routing: when VITE_API_BASE_URL is set (production on Firebase
// Hosting + Render backend), all relative /api/... fetches are redirected to
// the central server. Locally (dev) nothing changes — same-origin /api works.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

if (API_BASE) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  const routedFetch: typeof fetch = (input: any, init?: any): Promise<Response> => {
    if (typeof input === 'string' || input instanceof String) {
      let url = String(input);
      if (url.startsWith('/api/')) {
        url = `${API_BASE}${url}`;
      }
      return originalFetch(url, init);
    }
    if (input instanceof Request && input.url.startsWith(`${globalThis.location.origin}/api/`)) {
      const newUrl = input.url.replace(`${globalThis.location.origin}/api/`, `${API_BASE}/api/`);
      return originalFetch(new Request(newUrl, input), init);
    }
    return originalFetch(input, init);
  };
  globalThis.fetch = routedFetch;
  console.info(`[API] Remote backend active: ${API_BASE}`);

  // Keep-alive: free-tier hosts (Render) spin the API down after ~15 min idle,
  // which caused 30-60s delays on login/first load. Ping health every 9 min
  // while the tab is open so the backend stays warm.
  const KEEPALIVE_MS = 9 * 60 * 1000;
  const pingHealth = () => {
    originalFetch(`${API_BASE}/api/health`).catch(() => {});
  };
  pingHealth();
  setInterval(pingHealth, KEEPALIVE_MS);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
