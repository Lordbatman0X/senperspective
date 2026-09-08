import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

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
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
