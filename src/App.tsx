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
  const isLoadingArticles = useStore(state => state.isLoadingArticles);
  const articles = useStore(state => state.articles);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  return (
    <Router>
      <AuthProvider>
        {/* Glassy sync indicator — shows while fresh content loads from the cloud */}
        {isLoadingArticles && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#E85D42] to-transparent animate-[syncbar_1.2s_ease-in-out_infinite]" />
            <style>{`@keyframes syncbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
          </div>
        )}
        {/* Full loading screen on first visit when no articles loaded yet */}
        {isLoadingArticles && articles.length === 0 && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center bg-[#0a0a0a]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-[#E85D42] border-t-transparent animate-spin" />
              <p className="text-sm text-zinc-400 font-mono">Chargement des articles...</p>
            </div>
          </div>
        )}
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
