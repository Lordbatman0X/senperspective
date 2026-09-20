import React from 'react';
import { Waves, Ship, CloudSun, Wind } from 'lucide-react';
import { useStore } from '../../store';

export const UtilitySection: React.FC = () => {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings);
  const accentColor = siteSettings?.accentColor || '#E85D42';

  const telemetry = [
    {
      id: 'maree',
      icon: Waves,
      label: language === 'fr' ? 'Marée Dakar' : 'Dakar Tides',
      val1: language === 'fr' ? 'Basse : 08h42 (0.4m)' : 'Low: 08:42 (0.4m)',
      val2: language === 'fr' ? 'Haute : 14h55 (1.4m)' : 'High: 14:55 (1.4m)',
      tag: language === 'fr' ? 'PORT AUTONOME' : 'DAKAR PORT'
    },
    {
      id: 'goree',
      icon: Ship,
      label: language === 'fr' ? 'Chaloupe Gorée' : 'Gorée Ferry',
      val1: language === 'fr' ? 'Départ : 10h00 • 12h30' : 'Dep: 10:00 • 12:30',
      val2: language === 'fr' ? 'Retour : 14h00 • 16h30' : 'Ret: 14:00 • 16:30',
      tag: language === 'fr' ? 'EMBARCADÈRE' : 'TERMINAL'
    },
    {
      id: 'meteo',
      icon: CloudSun,
      label: language === 'fr' ? 'Météo Côtière' : 'Coastal Weather',
      val1: '24°C • Ensoleillé',
      val2: language === 'fr' ? 'Alizé maritime : 18 km/h' : 'Sea breeze: 18 km/h',
      tag: 'CAP-VERT'
    },
    {
      id: 'houle',
      icon: Wind,
      label: language === 'fr' ? 'Houle & Pêche' : 'Swell & Fishing',
      val1: language === 'fr' ? 'Houle : 1.2m (Modérée)' : 'Swell: 1.2m (Moderate)',
      val2: language === 'fr' ? 'Sorties pirogues : Favorables' : 'Canoe departure: Favorable',
      tag: 'YOFF • NGOR'
    }
  ];

  return (
    <section 
      id="section-utility" 
      aria-labelledby="heading-utility" 
      className="mb-12 pt-2"
    >
      <div className="border-b-4 border-brand-dark dark:border-zinc-800 pb-3 flex justify-between items-end mb-6">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 inline-block shrink-0" style={{ backgroundColor: accentColor }} />
          <h2 
            id="heading-utility" 
            className="text-xl md:text-2xl font-black uppercase tracking-wider text-brand-dark dark:text-zinc-100"
          >
            {language === 'fr' ? 'Météo Maritime & Radar Côtier' : 'Maritime Weather & Coastal Radar'}
          </h2>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {language === 'fr' ? 'STATION DAKAR' : 'DAKAR STATION'}
        </span>
      </div>

      {/* Uniform 4-column horizontal strip matching the 4-column cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {telemetry.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.id}
              className="square-card bg-white dark:bg-zinc-900 border border-brand-border dark:border-zinc-800 shadow-sm p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-dark dark:text-zinc-100">
                  <Icon size={15} style={{ color: accentColor }} />
                  <span>{item.label}</span>
                </div>
                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                  {item.tag}
                </span>
              </div>
              <div className="text-xs font-sans text-brand-muted dark:text-zinc-400 space-y-0.5">
                <p className="font-semibold text-brand-dark dark:text-zinc-200">{item.val1}</p>
                <p>{item.val2}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
