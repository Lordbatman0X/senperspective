import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ArticlePage } from './pages/ArticlePage';
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { AdminPortal } from './pages/AdminPortal';
import { AboutPage, ContactPage } from './pages/StaticPages';
import { ProfilePage } from './pages/ProfilePage';
import { LArenePage } from './pages/LArenePage';
import { DiscussionPage } from './pages/DiscussionPage';
import { AuthPage } from './pages/AuthPage';
import { Layout } from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationToastHost } from './components/NotificationToastHost';
import { useStore } from './store';
import { subscribeToArticles } from './firebase/db';
import { subscribeToAllComments } from './firebase/db';

// Injected by Vite at build time — changes on every deploy. A device that
// kept an OLD cached bundle (webviews / add-to-homescreen tabs can ignore
// cache headers) would otherwise sync nothing forever: it never receives
// the real-time listener. On load, if the running bundle is older than the
// freshly served one, force exactly ONE reload to pick up the new build.
declare const __BUILD_ID__: string;

function ensureFreshBundle() {
  try {
    const stored = localStorage.getItem('__APP_BUILD_ID__');
    if (stored && stored !== __BUILD_ID__) {
      localStorage.setItem('__APP_BUILD_ID__', __BUILD_ID__);
      window.location.reload();
      return;
    }
    localStorage.setItem('__APP_BUILD_ID__', __BUILD_ID__);
  } catch { /* private mode — ignore */ }
}
    // FIX (comments disappearing on reload): loadComments() now only writes to
    // the store if the realtime listener hasn't already populated it with remote
    // data. The listener callback above is registered first, so if RTDB data
    // arrives quickly, loadComments() will see non-empty store state and skip
    // the seedComments fallback that was clobbering real comments.

function App() {
  ensureFreshBundle();
  const loadArticles = useStore(state => state.loadArticles);
  const loadSiteSettings = useStore(state => state.loadSiteSettings);
  const loadComments = useStore(state => state.loadComments);
  const isLoadingArticles = useStore(state => state.isLoadingArticles);

  useEffect(() => {
    // Load fresh articles in background on app startup (also recovers legacy
    // localStorage articles and hydrates the cache before the cloud answers).
    loadArticles();
    // FIX: hydrate shared site settings (BC logo, colors, etc.) from Firebase
    // so all devices (desktop AND mobile) see the same configuration.
    loadSiteSettings();
    // FIX (disappearing comments): load persisted comments from the Realtime
    // Database on startup so they survive reloads and are shared across devices.
    loadComments();

    // FIX (articles not syncing across devices and browsers): replaced the
    // 3-minute polling with a PERSISTENT real-time listener. A one-shot get()
    // races a 7s timeout and on slower devices/connections it loses the race
    // right after page load (while the RTDB connection is still being
    // established) — the app then silently falls back to a stale local cache
    // and the device never sees newly published articles. onValue keeps a
    // long-lived connection that the SDK automatically re-establishes after
    // network drops, and pushes cloud changes within ~1 second, so every
    // device converges on the same content — instantly, on every page.
    let hasPrevSnapshot = false;
    const prevIdsRef = { current: new Set<string>() };
    const unsubArticles = subscribeToArticles(
      (remoteList) => {
        try {
          const local = Array.isArray(useStore.getState().articles)
            ? [...useStore.getState().articles]
            : [];
          const remoteIds = new Set(remoteList.map(a => String((a as any)?.id || '')));

          // Deletion sync: ids that were in the previous cloud snapshot but
          // are gone now were deleted remotely — drop stale local copies so
          // removed articles don't resurrect from the device cache.
          const deletedIds = hasPrevSnapshot
            ? [...prevIdsRef.current].filter(id => id && !remoteIds.has(id))
            : [];
          const deletedSet = new Set(deletedIds);
          const extras = local.filter(a => {
            const id = String((a as any)?.id || '');
            return id && !remoteIds.has(id) && !deletedSet.has(id);
          });

          // Remote-first merge: cloud is the source of truth (fresh content
          // and order win); local-only articles (offline drafts) are kept
          // after the remote ones.
          const merged = [...remoteList, ...extras];
          const sig = merged.map(a => `${(a as any)?.id}:${(a as any)?.updatedAtServer || ''}`).join('|');
          const prevSig = local.map(a => `${(a as any)?.id}:${(a as any)?.updatedAtServer || ''}`).join('|');
          if (sig !== prevSig) {
            useStore.setState({ articles: merged as any });
          }
          prevIdsRef.current = remoteIds;
          hasPrevSnapshot = true;
        } catch (e) {
          console.warn('[App] Article realtime merge notice:', e);
        }
      },
      (err) => console.warn('[App] Article realtime subscription notice:', err?.message)
    );

    // Realtime listener for comments so edits/approvals/deletes are
    // reflected instantly and survive reloads.
    const unsubComments = subscribeToAllComments(
      (remoteComments) => {
        try {
          useStore.setState({ comments: remoteComments });
        } catch (e) {
          console.warn('[App] Comment realtime merge notice:', e);
        }
      },
      (err) => console.warn('[App] Comment realtime subscription notice:', err?.message)
    );

    // Safety net: when a hidden tab becomes visible again after a long time
    // (device unlock, browser resume), force one fresh fetch in case the
    // listener connection was interrupted while the tab was frozen.
    let lastFetch = Date.now();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch > 60 * 1000) {
        lastFetch = Date.now();
        loadArticles();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    // Fallback channel: some mobile networks / firewalls block or silently
    // drop the RTDB websocket the real-time listener depends on. A light
    // 3-minute polling loop guarantees every device converges on the cloud
    // content even if the push channel dies.
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadArticles();
    }, 3 * 60 * 1000);
    return () => {
      unsubArticles();
      unsubComments();
      window.clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadArticles, loadSiteSettings, loadComments]);

  return (
    <Router>
      <AuthProvider>
        {/* Glassy sync indicator - top edge only (no full-screen overlay) */}
        {isLoadingArticles && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#E85D42] to-transparent animate-[syncbar_1.2s_ease-in-out_infinite]" />
                        <style>{`@keyframes syncbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
          </div>
        )}
        {/* No full-screen overlay - articles always show from cache while fresh content loads in background */}
        <NotificationToastHost />
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/category/:categoryId" element={<CategoryPage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/larene" element={<LArenePage />} />
            <Route path="/sports" element={<LArenePage />} />
            <Route path="/sport" element={<LArenePage />} />
            <Route path="/arene" element={<LArenePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/profile/:email" element={<ProfilePage />} />
            <Route path="/discussion" element={<DiscussionPage />} />
            <Route path="/authpage" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/newsletter" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/admin/*" element={<AdminPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
