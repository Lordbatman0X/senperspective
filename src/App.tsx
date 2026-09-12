import React, { useEffect } from 'react';
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

function App() {
  const loadArticles = useStore(state => state.loadArticles);
  const loadSiteSettings = useStore(state => state.loadSiteSettings);
  const isLoadingArticles = useStore(state => state.isLoadingArticles);

  useEffect(() => {
    // Load fresh articles from Firestore in background on app startup
    loadArticles();
    // FIX: hydrate shared site settings (BC logo, colors, etc.) from Firebase
    // so all devices (desktop AND mobile) see the same configuration.
    loadSiteSettings();

    // Background auto-refresh: pull fresh articles every 3 minutes so devices
    // that keep the site open see newly published content without a manual
    // reload (the store merge is silent — no full page reload, no flicker).
    const REFRESH_MS = 3 * 60 * 1000;
    let lastFetch = Date.now();
    const refresh = () => {
      // Never auto-refresh inside the admin portal (an admin may be editing).
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return;
      lastFetch = Date.now();
      loadArticles();
    };
    const interval = window.setInterval(refresh, REFRESH_MS);
    // Also refresh when a hidden tab becomes visible again (device unlock,
    // tab switch) — covers the "left the site open overnight" case.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch > 60 * 1000) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadArticles, loadSiteSettings]);

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
