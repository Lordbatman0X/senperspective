import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Settings2, X, Check, Lock, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { sendConsentTelemetry } from '../lib/telemetry';

export interface CookiePreferences {
  essential: boolean; // Always true
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  updatedAt: string;
}

const STORAGE_KEY = 'perspective_cookie_consent';

export function CookieConsentBanner() {
  const language = useStore((s) => s.language);
  const isFr = language === 'fr';

  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    personalization: true,
    marketing: false,
    updatedAt: new Date().toISOString()
  });

  useEffect(() => {
    // Check existing consent
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Delay banner display slightly for smooth page entry
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    } else {
      try {
        setPreferences(JSON.parse(stored));
      } catch (e) {
        setIsVisible(true);
      }
    }

    // Listen for custom event to reopen settings anytime
    const handleReopen = () => {
      setShowModal(true);
      setIsVisible(true);
    };

    window.addEventListener('open-cookie-settings', handleReopen);
    return () => window.removeEventListener('open-cookie-settings', handleReopen);
  }, []);

  const saveConsent = (updated: CookiePreferences) => {
    const payload = {
      ...updated,
      essential: true,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setPreferences(payload);
    setIsVisible(false);
    setShowModal(false);

    // Dispatch real telemetry consent record to server & Firestore
    sendConsentTelemetry(payload);

    // Notify window
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: payload }));
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      personalization: true,
      marketing: true,
      updatedAt: new Date().toISOString()
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      essential: true,
      analytics: false,
      personalization: false,
      marketing: false,
      updatedAt: new Date().toISOString()
    });
  };

  if (!isVisible && !showModal) return null;

  return (
    <>
      {/* 1. Bottom Floating Subtle Glass Card */}
      {isVisible && !showModal && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-slideUp font-sans">
          <div className="bg-zinc-950/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/10 dark:border-zinc-800/60 text-zinc-100 p-4 shadow-2xl rounded-2xl flex flex-col gap-3 transition-all hover:bg-zinc-950/80">
            
            {/* Header / Info */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl shrink-0 mt-0.5">
                <Cookie size={18} />
              </div>
              <div className="space-y-1 flex-1 pr-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <span>{isFr ? 'Vie privée & Cookies' : 'Privacy & Cookies'}</span>
                  </h4>
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-mono">
                    RGPD
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300/90 leading-relaxed">
                  {isFr
                    ? 'Nous utilisons des cookies essentiels et statistiques pour optimiser la navigation et adapter l’expérience Abdel IA. Vos données restent protégées.'
                    : 'We use essential and analytics cookies to optimize navigation and Abdel AI context. Your data stays protected.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
              <button
                onClick={() => setShowModal(true)}
                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-700/40 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <Settings2 size={12} />
                <span>{isFr ? 'Options' : 'Options'}</span>
              </button>

              <button
                onClick={handleRejectAll}
                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-700/40 rounded-lg transition-all cursor-pointer"
              >
                {isFr ? 'Refuser' : 'Decline'}
              </button>

              <button
                onClick={handleAcceptAll}
                className="flex-1 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider bg-[#E85D42]/90 hover:bg-[#E85D42] text-white rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Check size={13} />
                <span>{isFr ? 'Accepter' : 'Accept All'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Detailed Modal Preferences */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn font-sans">
          <div className="bg-zinc-950/85 backdrop-blur-2xl border border-white/10 text-zinc-100 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    {isFr ? 'Gestion de la Confidentialité' : 'Privacy Preferences'}
                  </h3>
                  <p className="text-[9.5px] text-zinc-400 font-mono uppercase tracking-wider">
                    Perspective Group — RGPD
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body Options */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <p className="text-zinc-300/90 leading-relaxed text-[11px]">
                {isFr
                  ? 'Personnalisez ci-dessous les catégories de cookies autorisées pour ce navigateur.'
                  : 'Customize below the allowed cookie categories for this browser.'}
              </p>

              <div className="space-y-2.5 pt-1">
                
                {/* 1. Essential */}
                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Lock size={13} className="text-emerald-400" />
                      <span className="font-extrabold text-white uppercase tracking-wider text-[10.5px]">
                        {isFr ? '1. Cookies Essentiels' : '1. Essential Cookies'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      {isFr
                        ? 'Nécessaires au fonctionnement du site, sécurité et quotas.'
                        : 'Required for core site operation, security, and quotas.'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[8.5px] uppercase font-bold shrink-0">
                    {isFr ? 'Requis' : 'Required'}
                  </span>
                </div>

                {/* 2. Analytics & Location */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <span className="font-extrabold text-white uppercase tracking-wider text-[10.5px] block">
                      {isFr ? "2. Mesure d'Audience & Géolocalisation" : '2. Analytics & Location Tracking'}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {isFr
                        ? 'Autorise l’utilisation de la localisation régionale et des statistiques anonymes de trafic.'
                        : 'Authorizes regional location detection and anonymous traffic analytics.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#E85D42]"></div>
                  </label>
                </div>

                {/* 3. Personalization & AI */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <span className="font-extrabold text-white uppercase tracking-wider text-[10.5px] block">
                      {isFr ? '3. Personnalisation Abdel IA' : '3. Abdel AI Personalization'}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {isFr
                        ? 'Mémoire de contexte pour l’assistant IA Abdel.'
                        : 'Context memory for the Abdel AI assistant.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={preferences.personalization}
                      onChange={(e) => setPreferences({ ...preferences, personalization: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#E85D42]"></div>
                  </label>
                </div>

                {/* 4. Marketing */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <span className="font-extrabold text-white uppercase tracking-wider text-[10.5px] block">
                      {isFr ? '4. Annonces Partenaires' : '4. Partner Ads'}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {isFr
                        ? 'Contenus sponsorisés et médias partenaires.'
                        : 'Sponsored media and partner announcements.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#E85D42]"></div>
                  </label>
                </div>

              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-2">
              <button
                onClick={handleRejectAll}
                className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                {isFr ? 'Essentiels seuls' : 'Essentials only'}
              </button>

              <button
                onClick={() => saveConsent(preferences)}
                className="px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-[#E85D42] hover:bg-[#D45037] text-white rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1"
              >
                <Check size={14} />
                <span>{isFr ? 'Enregistrer' : 'Save'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
