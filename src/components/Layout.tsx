import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { FloatingHub } from './FloatingHub';
import { CookieConsentBanner } from './CookieConsentBanner';
import { DraftPoliciesModal } from './DraftPoliciesModal';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { MaintenancePage } from '../pages/MaintenancePage';
import { trackPageView, syncAudienceProfile } from '../lib/telemetry';
import { initGa4, trackGa4PageView } from '../lib/ga4';
import { isAdPubliclyVisible } from '../lib/adCampaign';
import { useAdImpression, trackAdClick } from '../lib/adTracking';

export const Layout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const location = useLocation();
  const language = useStore(state => state.language);
  const isAdmin = location.pathname.startsWith('/admin');
  const isArticle = location.pathname.startsWith('/article/');
  const loadArticles = useStore(state => state.loadArticles);
  // Used to attach a known address to the consented audience profile. Both are
  // opt-in identifiers: a visitor with no account and no subscription stays
  // pseudonymous behind a random local id.
  const readerProfile = useStore(state => state.readerProfile);
  const subscribers = useStore(state => state.subscribers);
  const isFirstRun = React.useRef(true);
  
  const [showDraftPoliciesModal, setShowDraftPoliciesModal] = useState(false);

  useEffect(() => {
    const handleOpenDraftPolicies = () => {
      setShowDraftPoliciesModal(true);
    };
    window.addEventListener('open-draft-policies', handleOpenDraftPolicies);
    return () => window.removeEventListener('open-draft-policies', handleOpenDraftPolicies);
  }, []);
  
  // Background reload: when navigating to home page, refresh articles silently
  React.useEffect(() => {
    if (location.pathname === '/') {
      // Skip on first load (App.tsx already calls loadArticles on mount)
      if (isFirstRun.current) {
        isFirstRun.current = false;
        return;
      }
      // Navigate back to home — reload articles in background (no overlay)
      loadArticles();
    }
  }, [location.pathname, loadArticles]);
  
  const { articles, theme, ads, siteSettings } = useStore();
  let contextArticle = undefined;
  
  if (isArticle) {
    const slug = location.pathname.split('/')[2];
    contextArticle = (articles ?? []).find(a => a.slug === slug || a.id === slug);
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

  // Track real visitor pageview
  React.useEffect(() => {
    if (!isAdmin) {
      const artTitle = typeof contextArticle?.title === 'string' 
        ? contextArticle?.title
        : (contextArticle?.title?.fr || contextArticle?.title?.en || '');
      trackPageView(location.pathname, contextArticle?.id, artTitle, contextArticle?.category);

      // GA4. `initGa4` is itself consent-gated, so this is a no-op until the
      // reader accepts analytics. The panel used to claim the tag was injected
      // when nothing ever loaded it.
      initGa4(siteSettings?.ga4MeasurementId);
      trackGa4PageView(location.pathname);

      // Consent-gated audience profile. This is a no-op unless the reader
      // accepted BOTH analytics and marketing, so an undecided or declining
      // visitor is never profiled. It only rolls up signals the consented
      // pageview already produced — see syncAudienceProfile for the full
      // statement of what is and is not collected.
      const profileEmail =
        (readerProfile?.email && !readerProfile.email.includes('visitor@')
          ? readerProfile.email
          : '') || '';
      const isSubscriber = Boolean(
        profileEmail && (subscribers || []).some(s => (s.email || '').toLowerCase() === profileEmail.toLowerCase())
      );
      syncAudienceProfile({
        userEmail: profileEmail,
        isSubscribed: isSubscriber,
        pagePath: location.pathname,
        articleCategory: contextArticle?.category,
      });
    }
  }, [location.pathname, contextArticle?.id, readerProfile?.email, subscribers?.length]);

  // If maintenance mode is explicitly active and user is not on admin routes, display Maintenance Page
  if (siteSettings?.isMaintenanceMode === true && !isAdmin) {
    return <MaintenancePage />;
  }
  
  // Campaign-aware: a header ad is shown only when its campaign is genuinely
  // live (enabled, not paused, not expired, inside its schedule). Legacy ads
  // carrying only `active: true` behave exactly as before.
  const headerAds = (ads ?? []).filter(
    a => a.position === 'header' && a.imageUrl && a.imageUrl.trim() !== '' && isAdPubliclyVisible(a)
  );
  const headerAd = headerAds[0] ?? null;

  // One impression per header ad per session, counted only once it is on screen.
  const headerImpressionRef = useAdImpression(headerAd?.id, !!headerAd);

  
  return (
    <div className="min-h-screen flex flex-col bg-transparent font-sans text-brand-dark">
      {!isAdmin && <Header />}
      
      {!isAdmin && headerAd && (
        <div className="w-full bg-brand-soft/40 border-b border-brand-border/10 dark:border-zinc-800 flex justify-center py-2 relative group overflow-hidden">
          <div ref={headerImpressionRef} className="block max-w-4xl w-full mx-auto relative">
            <a
              href={headerAd.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { void trackAdClick(headerAd.id); }}
              className="block hover:opacity-95 transition-opacity"
            >
              <span className="absolute top-0 right-0 bg-brand-white/80 backdrop-blur-sm text-[8px] uppercase tracking-widest px-1 font-bold text-brand-muted z-10 border-b border-l border-brand-border/20">
                {headerAd.campaignType === 'sponsored'
                  ? (language === 'fr' ? 'Contenu sponsorisé' : 'Sponsored content')
                  : (language === 'fr' ? 'Publicité' : 'Advertisement')}
              </span>
              <img
                src={headerAd.imageUrl}
                className="w-full h-auto max-h-[120px] object-cover border border-brand-border/10 dark:border-zinc-800/40"
                alt={headerAd.campaignName || headerAd.name || (language === 'fr' ? 'Publicité' : 'Advertisement')}
              />
            </a>
          </div>
        </div>
      )}

      <main className="flex-grow">
        {children}
      </main>
      
      {!isAdmin && <FloatingHub contextArticle={contextArticle} />}
      {!isAdmin && <Footer />}
      {!isAdmin && <CookieConsentBanner />}
      <DraftPoliciesModal isOpen={showDraftPoliciesModal} onClose={() => setShowDraftPoliciesModal(false)} />
    </div>
  );
};
