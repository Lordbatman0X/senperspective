import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Abdel } from './Abdel';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { MaintenancePage } from '../pages/MaintenancePage';

export const Layout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isArticle = location.pathname.startsWith('/article/');
  
  const { articles, theme, ads, siteSettings } = useStore();
  let contextArticle = undefined;
  
  if (isArticle) {
    const slug = location.pathname.split('/')[2];
    contextArticle = articles.find(a => a.slug === slug || a.id === slug);
  }

  React.useEffect(() => {
    const root = document.documentElement;
    if (siteSettings?.fontPairing) root.setAttribute("data-font-pairing", siteSettings.fontPairing);
    if (siteSettings?.glassIntensity) root.setAttribute("data-glass-intensity", siteSettings.glassIntensity);
    if (siteSettings?.accentColor) {
      root.style.setProperty('--color-brand-primary', siteSettings.accentColor);
      root.style.setProperty('--color-brand-primary-hover', siteSettings.accentColor);
    }

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, siteSettings?.fontPairing, siteSettings?.glassIntensity, siteSettings?.accentColor]);

  // If maintenance mode is active (default true unless explicitly set to false) and user is not on admin routes, display Maintenance Page
  if (siteSettings?.isMaintenanceMode !== false && !isAdmin) {
    return <MaintenancePage />;
  }

  const headerAds = ads?.filter(a => a.active && a.position === 'header' && a.imageUrl && a.imageUrl.trim() !== '') || [];

  return (
    <div className="min-h-screen flex flex-col bg-transparent font-sans text-brand-dark">
      {!isAdmin && <Header />}
      
      {!isAdmin && headerAds.length > 0 && headerAds[0]?.imageUrl && (
        <div className="w-full bg-brand-soft/40 border-b border-brand-border/10 dark:border-zinc-800 flex justify-center py-2 relative group overflow-hidden">
           <a href={headerAds[0].targetUrl} target="_blank" rel="noopener noreferrer" className="block max-w-4xl w-full mx-auto relative hover:opacity-95 transition-opacity">
              <span className="absolute top-0 right-0 bg-brand-white/80 backdrop-blur-sm text-[8px] uppercase tracking-widest px-1 font-bold text-brand-muted z-10 border-b border-l border-brand-border/20">Publicité</span>
              <img src={headerAds[0].imageUrl} className="w-full h-auto max-h-[120px] object-cover border border-brand-border/10 dark:border-zinc-800/40" alt="Ad" />
           </a>
        </div>
      )}

      <main className="flex-grow">
        {children}
      </main>

      {!isAdmin && <Abdel contextArticle={contextArticle} />}
      {!isAdmin && <Footer />}
    </div>
  );
}
