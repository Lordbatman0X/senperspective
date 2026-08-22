import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { ARTICLE_CATEGORIES } from '../constants';

export function Footer() {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings);

  const [logoError, setLogoError] = React.useState(false);

  // Reset logo error if siteSettings changes
  React.useEffect(() => {
    setLogoError(false);
  }, [siteSettings.boukariCorpLogo]);
  
  const text = {
    desc: language === 'fr' 
      ? (siteSettings?.footerDescFr || 'Perspective Group. Média d\'analyse et de réflexion. Notre promesse : L\'actualité. Sans Filtre. Sans Compromis. Politique, géopolitique, économie, société, culture ou sport : toutes les actualités sont traitées avec la même profondeur.')
      : (siteSettings?.footerDescEn || 'Perspective Group. Media for analysis and reflection. Our promise: News. Unfiltered. Uncompromised. Politics, geopolitics, economy, society, culture, or sports: all news is treated with equal depth.'),
    unitLabel: language === 'fr'
      ? (siteSettings?.boukariCorpUnitLabelFr || 'Unité Opérationnelle de')
      : (siteSettings?.boukariCorpUnitLabelEn || 'An Operational Unit of'),
    corpName: siteSettings?.boukariCorpName || 'Boukari Corporation',
    copyright: language === 'fr'
      ? (siteSettings?.footerCopyrightFr || '© 2026 Perspective Group. Tous droits réservés.')
      : (siteSettings?.footerCopyrightEn || '© 2026 Perspective Group. All rights reserved.'),
    location: siteSettings?.footerLocationText || 'Perspective Group, Dakar, Sénégal',
    about: language === 'fr' ? 'À propos' : 'About',
    contact: language === 'fr' ? 'Contact' : 'Contact Us'
  };

  const editions = (siteSettings?.categories && siteSettings.categories.length > 0) ? siteSettings.categories : ARTICLE_CATEGORIES;

  return (
    <footer className="bg-brand-black text-white mt-16 pb-12">
      {/* Thin accent top line */}
      <div className="h-1 w-full bg-brand-primary" style={{ backgroundColor: siteSettings.accentColor }}></div>
      
      <div className="pt-16 pb-8 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
          
          {/* Column 1: Brand & Operational Unit */}
          <div className="flex flex-col items-start">
            <div className="flex flex-col items-start leading-none font-sans select-none mb-4">
              <h3 className="font-sans font-extrabold tracking-[-0.045em] leading-[0.8] text-2xl" style={{ color: siteSettings.accentColor }}>
                {siteSettings.siteName}
              </h3>
              <span className="font-sans font-black tracking-[0.11em] text-[9.5px] mt-0.5 text-white/90">
                GROUP
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {text.desc}
            </p>
            <a href={`mailto:${siteSettings.supportEmail || 'contact@perspective.sn'}`} className="font-bold hover:text-white transition-colors text-sm" style={{ color: siteSettings.accentColor }}>
              {siteSettings.supportEmail || 'contact@perspective.sn'}
            </a>

            {/* Subtle Operational Unit Badge */}
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-zinc-800/80 w-full">
              <div 
                className="h-16 sm:h-20 flex items-center justify-center shrink-0 overflow-hidden"
              >
                {siteSettings.boukariCorpLogo && !logoError ? (
                  <img 
                    src={siteSettings.boukariCorpLogo} 
                    alt="Boukari Corporation Logo" 
                    onError={() => setLogoError(true)}
                    className="h-16 sm:h-20 w-auto max-w-[200px] object-contain block" 
                  />
                ) : (
                  <div className="h-14 px-3.5 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <span className="font-mono font-black text-base text-zinc-100 tracking-wider drop-shadow-xs">
                      BC
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
                  {text.unitLabel}
                </span>
                <span className="text-base sm:text-lg font-black uppercase tracking-widest text-white drop-shadow-xs">
                  {text.corpName}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Editions */}
          <div className="flex flex-col">
            <h3 className="font-sans font-black tracking-widest uppercase text-base mb-6 text-zinc-200">Éditions</h3>
            <ul className="grid grid-cols-2 gap-y-3.5">
              {editions.map(ed => (
                <li key={ed.id}>
                  <Link to={ed.id === "sports" ? "/larene" : `/category/${ed.id}`} className="text-gray-400 text-xs font-semibold uppercase hover:text-white transition-colors">
                    {language === "fr" ? ed.fr : ed.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Corporate Info & Direct Contact */}
          <div className="flex flex-col">
            <h3 className="font-sans font-black tracking-widest uppercase text-base mb-6 text-zinc-200">Corporate</h3>
            <ul className="flex flex-col gap-y-3 mb-6">
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white text-sm font-bold uppercase transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: siteSettings.accentColor }}></span>
                  {text.about}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white text-sm font-semibold uppercase transition-colors">
                  {text.contact}
                </Link>
              </li>
              <li>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))}
                  className="text-gray-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer text-left flex items-center gap-1.5"
                >
                  <span>{language === 'fr' ? 'Gestion des cookies' : 'Cookie Preferences'}</span>
                </button>
              </li>
              {siteSettings?.showDraftPoliciesInFooter && (
                <li>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-draft-policies'))}
                    className="text-amber-400/90 hover:text-amber-300 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer text-left flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    <span>{language === 'fr' ? 'Charte de Sécurité & CGU (Projet)' : 'Safe Use Policies (Draft)'}</span>
                  </button>
                </li>
              )}
            </ul>
            
            <div className="flex flex-col gap-1.5 text-sm text-gray-400 font-mono mt-2 pt-4 border-t border-zinc-800/80">
              <p className="font-bold uppercase tracking-widest text-[9px] text-zinc-500">{language === 'fr' ? 'SIÈGE & RÉDACTION' : 'HEADQUARTERS'}</p>
              <p className="text-xs italic leading-tight text-zinc-300">{siteSettings.officeAddress || 'Immeuble Tamaro, Rue Mohamed V, Dakar'}</p>
              <p className="font-bold uppercase tracking-widest text-[9px] text-zinc-500 mt-2">{language === 'fr' ? 'CONTACT DÉDIÉ' : 'HOTLINE'}</p>
              <p className="text-xs font-sans font-extrabold text-white">{siteSettings.editorialPhone || '+221 33 824 55 55'}</p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Rights Reserved Badge Bar */}
        <div className="border-t border-zinc-800/80 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-400 font-mono gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-zinc-300">
              {text.copyright}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">
            {text.location}
          </div>
        </div>
      </div>
    </footer>
  );
}

