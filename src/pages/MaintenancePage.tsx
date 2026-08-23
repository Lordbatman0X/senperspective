import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { Wrench, Shield, Lock, ArrowRight, Mail, Phone, Clock, AlertTriangle } from 'lucide-react';

export function MaintenancePage() {
  const { language, siteSettings } = useStore();

  const msgFr = siteSettings?.maintenanceMessageFr || "Notre site est actuellement en cours de maintenance et de mise à jour technique. Nous serons de retour très rapidement.";
  const msgEn = siteSettings?.maintenanceMessageEn || "Our platform is currently undergoing scheduled maintenance and updates. We will be back online shortly.";

  const message = language === 'fr' ? msgFr : msgEn;
  const siteName = siteSettings?.siteName || "Perspective";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden font-sans">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center border-b border-zinc-800 pb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary text-white flex items-center justify-center font-bold text-xl tracking-tighter">
            P
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-white">{siteName}</h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-sans">Journal d'Information & Analyses</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto my-auto py-12 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest mb-8">
          <Wrench className="w-4 h-4 animate-spin-slow text-amber-400" />
          <span>{language === 'fr' ? "Maintenance Technique en Cours" : "Scheduled Maintenance in Progress"}</span>
        </div>

        <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white tracking-tight mb-6 leading-tight">
          {language === 'fr' ? "Amélioration Éditioriale & Plateforme" : "Platform & Editorial Maintenance"}
        </h2>

        <p className="text-zinc-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10 font-sans">
          {message}
        </p>

        {/* Feature Cards / Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
          <div className="bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-brand-primary font-mono text-xs uppercase tracking-wider font-bold mb-1">
              <Clock className="w-4 h-4" />
              <span>{language === 'fr' ? "Statut" : "Status"}</span>
            </div>
            <p className="text-xs text-zinc-300">
              {language === 'fr' ? "Mises à jour système & sécurité en cours" : "System & security updates ongoing"}
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-brand-primary font-mono text-xs uppercase tracking-wider font-bold mb-1">
              <Shield className="w-4 h-4" />
              <span>{language === 'fr' ? "Protection" : "Protection"}</span>
            </div>
            <p className="text-xs text-zinc-300">
              {language === 'fr' ? "Vos données et sessions sont sécurisées" : "Your sessions & data remain protected"}
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-brand-primary font-mono text-xs uppercase tracking-wider font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{language === 'fr' ? "Retour Prévu" : "Estimated Return"}</span>
            </div>
            <p className="text-xs text-zinc-300">
              {language === 'fr' ? "Très prochainement" : "Very soon"}
            </p>
          </div>
        </div>


      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 gap-4 relative z-10 font-mono">
        <div>
          © {new Date().getFullYear()} {siteName}. {language === 'fr' ? "Tous droits réservés." : "All rights reserved."}
        </div>
        <div className="flex items-center gap-6">
          {siteSettings?.supportEmail && (
            <a href={`mailto:${siteSettings.supportEmail}`} className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <Mail className="w-3.5 h-3.5" />
              <span>{siteSettings.supportEmail}</span>
            </a>
          )}
          {siteSettings?.editorialPhone && (
            <a href={`tel:${siteSettings.editorialPhone}`} className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <Phone className="w-3.5 h-3.5" />
              <span>{siteSettings.editorialPhone}</span>
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
