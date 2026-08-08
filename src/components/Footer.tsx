import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { ARTICLE_CATEGORIES } from '../constants';

export function Footer() {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings) || {
    siteName: 'Perspective',
    accentColor: '#E85D42',
    editorialPhone: '+221 33 824 55 55',
    supportEmail: 'contact@perspective.sn',
    officeAddress: 'Immeuble Tamaro, Rue Mohamed V, Dakar'
  };
  
  const text = {
    desc: language === 'fr' 
      ? 'Une rédaction engagée pour une information claire, indépendante et accessible à tous. Depuis Dakar, Perspective Group décrypte l’actualité avec profondeur, rigueur et impartialité.'
      : 'An editorial team committed to clear, independent, and accessible information for all. From Dakar, Perspective Group decodes the news with depth, rigor, and impartiality.',
    about: language === 'fr' ? 'À propos' : 'About',
    legal: language === 'fr' ? 'Mentions légales' : 'Legal',
    admin: language === 'fr' ? 'Espace Rédaction' : 'Newsroom Login'
  };

  const editions = ARTICLE_CATEGORIES;

  return (
    <footer className="bg-brand-black text-white mt-16 pb-8">
      {/* Thin orange top line */}
      <div className="h-1 w-full bg-brand-primary" style={{ backgroundColor: siteSettings.accentColor }}></div>
      
      {/* Space below the orange line */}
      <div className="pt-20 pb-16 max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-24">
        
        {/* Column 1 */}
        <div className="flex flex-col items-start">
          <div className="flex flex-col items-end leading-none font-sans select-none mb-6">
            <h3 className="font-sans font-extrabold tracking-[-0.045em] leading-[0.8] text-2xl" style={{ color: siteSettings.accentColor }}>
              {siteSettings.siteName}
            </h3>
            <span className="font-sans font-black tracking-[0.11em] text-[9.5px] mt-0.5 mr-0.5 text-white/90">
              GROUP
            </span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            {text.desc}
          </p>
          <a href={`mailto:${siteSettings.supportEmail}`} className="font-bold hover:text-white transition-colors" style={{ color: siteSettings.accentColor }}>
            {siteSettings.supportEmail}
          </a>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col">
          <h3 className="font-sans font-black tracking-widest uppercase text-lg mb-6">Éditions</h3>
          <ul className="grid grid-cols-2 gap-y-3">
            {editions.map(ed => (
              <li key={ed.id}>
                <Link to={ed.id === "sports" ? "/larene" : `/category/${ed.id}`} className="text-gray-400 text-sm font-semibold uppercase hover:text-white transition-colors">
                  {language === "fr" ? ed.fr : ed.en}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 */}
        <div className="flex flex-col">
          <h3 className="font-sans font-black tracking-widest uppercase text-lg mb-6">Corporate</h3>
          <ul className="flex flex-col gap-y-3 mb-8">
            <li>
              <Link to="/about" className="text-gray-400 text-sm font-semibold uppercase hover:text-white transition-colors">{text.about}</Link>
            </li>
            <li>
              <Link to="/legal" className="text-gray-400 text-sm font-semibold uppercase hover:text-white transition-colors">{text.legal}</Link>
            </li>
            <li>
              <Link to="/admin" className="text-gray-400 text-sm font-semibold uppercase hover:text-white transition-colors" style={{ color: siteSettings.accentColor }}>{text.admin}</Link>
            </li>
          </ul>
          
          <div className="flex flex-col gap-1 text-sm text-gray-400 font-mono">
            <p className="font-bold uppercase tracking-widest text-[9px] text-zinc-500 mb-1">{language === 'fr' ? 'SIÈGE & RÉDACTION' : 'HEADQUARTERS'}</p>
            <p className="text-xs italic mb-2 leading-tight">{siteSettings.officeAddress}</p>
            <p className="font-bold uppercase tracking-widest text-[9px] text-zinc-500 mb-1">{language === 'fr' ? 'LIGNE DIRECTE' : 'HOTLINE'}</p>
            <p className="text-xs font-sans font-extrabold">{siteSettings.editorialPhone}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
