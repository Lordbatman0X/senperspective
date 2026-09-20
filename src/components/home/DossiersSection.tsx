import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Hourglass, FolderOpen } from 'lucide-react';
import { useStore } from '../../store';

interface DossiersSectionProps {
  onSelectDossier: (dossier: any) => void;
}

export const DossiersSection: React.FC<DossiersSectionProps> = ({ onSelectDossier }) => {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings);
  const accentColor = siteSettings?.accentColor || '#E85D42';

  const dossiers = [
    {
      id: 'dossier-gas-energy',
      tag: language === 'fr' ? 'ÉNERGIE' : 'ENERGY',
      titleFr: 'Gaz offshore : Sangomar & GTA',
      titleEn: 'Offshore Gas: Sangomar & GTA',
      descFr: 'Exploitation des gisements, gaz-to-power et retombées pour le tissu industriel local.',
      descEn: 'Offshore fields, gas-to-power rollout, and domestic industrial development.',
      readTime: '15 MIN',
      fullTextFr: 'L’entrée en production industrielle des gisements offshore de Sangomar et du champ GTA (Grand Tortue Ahmeyim) transforme la trajectoire budgétaire du Sénégal. Ce dossier explore les retombées pour la SENELEC, les PME locales et la pétrochimie.',
      fullTextEn: 'The ramp-up of offshore production at Sangomar and GTA transforms Senegal’s fiscal trajectory. This dossier explores spinoff benefits for SENELEC, local SMEs, and domestic petrochemicals.',
      key1Fr: 'Réduction de 35% des coûts de production électrique grâce au Gaz-To-Power.',
      key1En: 'Expected 35% reduction in electricity generation costs via domestic Gas-To-Power.',
      key2Fr: 'Souveraineté budgétaire renforcée par les recettes d\'exportation de GNL.',
      key2En: 'Strengthened fiscal sovereignty backed by LNG export revenues.'
    },
    {
      id: 'dossier-dakar-real-estate',
      tag: language === 'fr' ? 'URBANISME' : 'URBAN',
      titleFr: 'Immobilier : Le boom dakarois',
      titleEn: 'Real Estate: The Dakar Surge',
      descFr: 'Pression foncière sur la presqu’île, axe Diamniadio-Saly et financements institutionnels.',
      descEn: 'Cap-Vert land pressure, the Diamniadio-Saly corridor, and private investment inflows.',
      readTime: '12 MIN',
      fullTextFr: 'L’expansion urbaine de Dakar vers le pôle de Diamniadio et la Saly Portudal redéfinit la cartographie foncière de la région du Cap-Vert. Notre équipe d’analystes décortique l’impact des taux d’intérêt souverains, de l’urbanisation accélérée et de l’injection de capitaux privés dans l’immobilier résidentiel et tertiaire.',
      fullTextEn: 'Dakar’s urban expansion towards the Diamniadio hub and Saly Portudal is reshaping the real estate map of the Cap-Vert region. Our intelligence unit analyzes sovereign interest rates, rapid urbanization, and capital inflows in residential and commercial real estate.',
      key1Fr: 'Pression foncière élevée sur les Almadies, Plateau et Ngor (+18.4% YoY).',
      key1En: 'Sustained land pressure in Almadies, Plateau, and Ngor (+18.4% YoY).',
      key2Fr: 'L\'axe autoroutier TER-AIBD agit comme catalyseur d\'investissements institutionnels.',
      key2En: 'The TER-AIBD transit corridor serves as a major institutional investment catalyst.'
    },
    {
      id: 'dossier-ecowas-trade',
      tag: language === 'fr' ? 'COMMERCE' : 'TRADE',
      titleFr: 'Commerce : Corridors & Fret UEMOA',
      titleEn: 'Trade: UEMOA Freight Corridors',
      descFr: 'Liaisons Port de Dakar-Bamako, tarifs douaniers et intégration commerciale régionale.',
      descEn: 'Port of Dakar to Bamako road links, customs policies, and regional logistics.',
      readTime: '10 MIN',
      fullTextFr: 'Les corridors logistiques entre le Port Autonome de Dakar, Bamako, Ouagadougou et Abidjan constituent la colonne vertébrale des échanges régionaux. Ce dossier passe en revue les données douanières du premier semestre 2026.',
      fullTextEn: 'The logistics corridors linking the Port Authority of Dakar, Bamako, Ouagadougou, and Abidjan form the backbone of regional commerce. This dossier reviews H1 2026 customs and trade volume datasets.',
      key1Fr: 'Croissance de 14.2% des flux de marchandises conteneurisées par le port de Dakar.',
      key1En: '14.2% growth in containerized cargo throughput via the Port of Dakar.',
      key2Fr: 'Rôle pivot de la BCEAO dans la stabilisation des liquidités de marché.',
      key2En: 'Central role of the BCEAO in maintaining regional market liquidity.'
    }
  ];

  return (
    <section 
      id="section-dossiers" 
      aria-labelledby="heading-dossiers" 
      className="mb-12 pt-2"
    >
      <div className="border-b-4 border-brand-dark dark:border-zinc-800 pb-3 flex justify-between items-end mb-6">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 inline-block shrink-0" style={{ backgroundColor: accentColor }} />
          <h2 
            id="heading-dossiers" 
            className="text-xl md:text-2xl font-black uppercase tracking-wider text-brand-dark dark:text-zinc-100"
          >
            {language === 'fr' ? 'Grands Dossiers & Enquêtes' : 'Special Reports & Investigations'}
          </h2>
        </div>
        <Link 
          to="/category/dossiers" 
          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider hover:underline transition-colors"
          style={{ color: accentColor }}
        >
          <span>{language === 'fr' ? 'Voir tout' : 'View all'}</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dossiers.map((dossier, idx) => {
          const title = language === 'fr' ? dossier.titleFr : dossier.titleEn;
          const desc = language === 'fr' ? dossier.descFr : dossier.descEn;

          return (
            <div 
              key={dossier.id}
              onClick={() => onSelectDossier(dossier)}
              className="square-card group flex flex-col justify-between bg-white dark:bg-zinc-900 border border-brand-border dark:border-zinc-800 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:border-brand-primary cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span className="text-2xl font-mono font-black" style={{ color: accentColor }}>
                    0{idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5">
                      {dossier.tag}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-muted dark:text-zinc-400">
                      <Hourglass size={10} className="shrink-0" style={{ color: accentColor }} />
                      <span>{dossier.readTime}</span>
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-base sm:text-lg text-brand-dark dark:text-zinc-100 leading-snug group-hover:text-brand-primary transition-colors mb-2 line-clamp-2">
                  {title}
                </h3>

                <p className="text-xs sm:text-sm text-brand-muted dark:text-zinc-400 font-medium leading-relaxed line-clamp-3 mb-4">
                  {desc}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-border dark:border-zinc-800 flex items-center justify-between mt-auto">
                <span 
                  className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider group-hover:underline transition-colors"
                  style={{ color: accentColor }}
                >
                  <span>{language === 'fr' ? 'Consulter le dossier' : 'Read dossier'}</span>
                  <ChevronRight size={13} />
                </span>
                <FolderOpen size={14} className="text-zinc-400 group-hover:text-brand-primary transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
