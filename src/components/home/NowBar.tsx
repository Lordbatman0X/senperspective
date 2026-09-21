import React from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useStore } from '../../store';
import { Article } from '../../types';

interface NowBarProps {
  flashArticles?: Article[];
  analystDispatches?: any[];
}

export const NowBar: React.FC<NowBarProps> = ({ flashArticles = [], analystDispatches = [] }) => {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings);
  const accentColor = siteSettings?.accentColor || '#E85D42';

  // Admin-controlled live band configuration (Homepage Curation tab)
  const bandConfig = (siteSettings as any)?.liveBand || {};
  const bandEnabled = bandConfig.enabled !== false; // default ON
  const bandTitle = language === 'fr'
    ? (bandConfig.titleFr || 'EN DIRECT • FLASH INFO LIVE')
    : (bandConfig.titleEn || 'HAPPENING NOW • FLASH INFO LIVE');
  const showFallbackWires = bandConfig.showFallbackWires !== false; // default ON
  const maxItems = Math.max(1, Math.min(30, Number(bandConfig.maxItems) || 10));

  // Build a rich set of items for the continuous moving ticker
  const tickerItems: Array<{
    id: string;
    badge: string;
    text: string;
    link?: string;
    badgeColor?: string;
  }> = [];

  if (!bandEnabled) return null;

  // 1. Add Flash breaking articles
  flashArticles.forEach((art, idx) => {
    tickerItems.push({
      id: `flash-${art.id || idx}`,
      badge: art.readingTime ? `${art.readingTime} MIN` : 'FLASH',
      text: art.title?.[language] || art.title?.fr || 'Dépêche urgente',
      link: `/article/${art.slug || art.id}`,
      badgeColor: 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
    });
  });

  // 2. Add Analyst dispatches
  analystDispatches.forEach((disp, idx) => {
    tickerItems.push({
      id: `dispatch-${disp.id || idx}`,
      badge: disp.time || 'DIRECT',
      text: language === 'fr' ? disp.contentFr : disp.contentEn,
      badgeColor: 'bg-red-500/20 text-red-700 dark:text-red-300'
    });
  });

  // 3. Fallback / foundational Senegal news wires if list is short
  if (showFallbackWires && tickerItems.length < 4) {
    const fallbackNews = language === 'fr' ? [
      {
        id: 'wire-1',
        badge: 'ÉNERGIE',
        text: "Offshore Sénégal : Le gisement Sangomar confirme son plateau de production nominale.",
        badgeColor: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
      },
      {
        id: 'wire-2',
        badge: 'BRVM',
        text: "Bourse Régionale : Hausse des indices sectoriels et raffermissement des titres de la place dakaroise.",
        badgeColor: 'bg-blue-500/20 text-blue-800 dark:text-blue-300'
      },
      {
        id: 'wire-3',
        badge: 'INSTITUTIONS',
        text: "Sénégal 2050 : Présentation du cadre stratégique et des arbitrages de souveraineté budgétaire.",
        badgeColor: 'bg-purple-500/20 text-purple-800 dark:text-purple-300'
      },
      {
        id: 'wire-4',
        badge: 'PORT DAKAR',
        text: "Logistique sous-régionale : Fluidité accrue des rotations sur les corridors Bamako-Dakar.",
        badgeColor: 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
      }
    ] : [
      {
        id: 'wire-1',
        badge: 'ENERGY',
        text: "Senegal Offshore: Sangomar field operations sustain nominal production milestones.",
        badgeColor: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
      },
      {
        id: 'wire-2',
        badge: 'BRVM',
        text: "Regional Exchange: Positive session opening for Dakar-listed financial institutions.",
        badgeColor: 'bg-blue-500/20 text-blue-800 dark:text-blue-300'
      },
      {
        id: 'wire-3',
        badge: 'POLICY',
        text: "Senegal 2050: Strategic development framework advances public finance milestones.",
        badgeColor: 'bg-purple-500/20 text-purple-800 dark:text-purple-300'
      },
      {
        id: 'wire-4',
        badge: 'PORT DAKAR',
        text: "Regional Logistics: Enhanced transit velocity recorded along Dakar-Bamako corridor.",
        badgeColor: 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
      }
    ];

    fallbackNews.forEach(item => tickerItems.push(item));
  }

  // Cap the ticker to the admin-configured number of items
  const visibleItems = tickerItems.slice(0, maxItems);

  // Render a single sequence of ticker items
  const renderItemSequence = (keyPrefix: string) => (
    <div className="inline-flex items-center gap-6 pr-6">
      {visibleItems.map((item, idx) => {
        const content = (
          <div className="inline-flex items-center gap-2 shrink-0 group">
            <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 tracking-wider ${item.badgeColor || 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'}`}>
              {item.badge}
            </span>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors">
              {item.text}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700 ml-2 font-bold">•</span>
          </div>
        );

        if (item.link) {
          return (
            <Link key={`${keyPrefix}-${item.id}-${idx}`} to={item.link} className="shrink-0">
              {content}
            </Link>
          );
        }

        return (
          <div key={`${keyPrefix}-${item.id}-${idx}`} className="shrink-0">
            {content}
          </div>
        );
      })}
    </div>
  );

  return (
    <section 
      id="section-now" 
      aria-labelledby="heading-now" 
      className="mb-8 border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row items-stretch overflow-hidden">
        {/* Urgent Live Header (Fixed on the left) */}
        <div 
          className="flex items-center gap-2 px-3.5 py-2.5 sm:px-4 bg-[#E85D42] text-white shrink-0 text-[10px] font-mono font-black uppercase tracking-widest z-10 select-none shadow-xs"
          style={{ backgroundColor: accentColor }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <Radio size={13} className="animate-pulse" />
          <h2 id="heading-now" className="text-[10px] font-mono font-black uppercase tracking-widest">
            {bandTitle}
          </h2>
        </div>

        {/* Continuous slow-moving news ticker */}
        <div 
          className="relative flex-1 overflow-hidden py-2 sm:py-2.5 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center"
          title={language === 'fr' ? 'Survolez pour mettre en pause' : 'Hover to pause'}
        >
          {/* Subtle edge fades */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-zinc-50/80 dark:from-zinc-950/80 to-transparent z-1" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-50/80 dark:from-zinc-950/80 to-transparent z-1" />

          {/* Two duplicated sequences to achieve a seamless, continuous, slow infinite scroll */}
          <div className="animate-smooth-ticker flex items-center">
            {renderItemSequence('seq-1')}
            {renderItemSequence('seq-2')}
          </div>
        </div>
      </div>
    </section>
  );
};
