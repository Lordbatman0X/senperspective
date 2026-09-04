import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Article } from '../types';
import { calculateReadingTime, formatRelativeDate, getSafeText, formatCategory } from '../lib/utils';
import { motion } from 'motion/react';
import { SlidersHorizontal, Filter, Bookmark, Waves, Ship, CloudSun, Wind, Coffee, Zap, Quote, TrendingUp, Hash, Globe, Mail, Send, FolderKanban, FileText, X, CheckCircle, Trophy, Megaphone } from 'lucide-react';
import { SportsSlider } from '../components/SportsSlider';
import { SportsQuadrant } from '../components/SportsQuadrant';
import { useSEO } from '../hooks/useSEO';
import { getSafeImageUrl, DEFAULT_FALLBACK_IMAGE } from '../lib/imageUtils';
import { NewsletterSignup } from '../components/NewsletterSignup';

function ArticleCard({ article, large = false, small = false, tall = false }: { article: Article, large?: boolean, small?: boolean, tall?: boolean }) {
  const navigate = useNavigate();
  const language = useStore((s) => s.language);
  const { toggleSavedArticle, savedArticles } = useStore();
  const isSaved = savedArticles?.includes(article.id) || false;
  
  if (large) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full flex-shrink-0 group relative overflow-hidden flex flex-col md:flex-row h-[26rem] md:h-[20rem] cursor-pointer square-card" 
        onClick={() => { navigate(`/article/${article.slug || article.id}`); }}
      >
        <div className="relative w-full md:w-2/3 h-1/2 md:h-full overflow-hidden shrink-0 bg-brand-black">
           <div 
              className="w-full h-full bg-cover bg-center opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-transform duration-700"
              style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
           />
           <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/20 via-transparent to-transparent opacity-80" />
           <div className="absolute top-4 left-4 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 shadow-md">
              {formatCategory(article.category, language)}
           </div>
        </div>
        <div className="w-full md:w-1/3 flex flex-col p-6 md:p-8 justify-center h-1/2 md:h-full z-10 relative">
           <h2 className="relative text-brand-dark font-black text-xl md:text-2xl leading-[1.1] mb-3 group-hover:text-brand-primary transition-colors line-clamp-3">
             {getSafeText(article.title, language) || 'Sans titre'}
           </h2>
           <p className="relative text-brand-muted font-medium text-xs md:text-sm line-clamp-3 mb-4 leading-relaxed">
             {getSafeText(article.excerpt, language) || ''}
           </p>
           <div className="mt-auto flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-4 relative">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">
                {article.author} • {formatRelativeDate(article.date, language)}
              </span>
           </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="group flex flex-col h-full overflow-hidden square-card bg-white dark:bg-zinc-900 border border-brand-border dark:border-zinc-800 shadow-sm relative"
    >
      <Link to={`/article/${article.slug || article.id}`} className="block relative overflow-hidden shrink-0">
        <div 
          className={`relative bg-cover bg-center transition-transform duration-700 group-hover:scale-105 ${large ? 'h-[12rem] md:h-[16rem]' : tall ? 'h-52 sm:h-60' : small ? 'aspect-[4/5]' : 'h-40 sm:h-48'}`}
          style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
        >
          {large && (
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent pointer-events-none" />
          )}
        </div>
        {!tall && !large && (
           <div className="absolute top-0 left-0 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 m-3 shadow-md z-20">
             {formatCategory(article.category, language)}
           </div>
        )}
      </Link>
      
      <div className={`flex flex-col flex-grow ${small ? 'p-4' : tall ? 'p-6' : 'p-5 sm:p-6'} justify-between`}>
        <div className="flex-grow space-y-3">
          <Link to={`/article/${article.slug || article.id}`}>
            <h3 className={`font-black mb-3 leading-snug transition-colors ${large ? 'text-3xl lg:text-4xl text-brand-dark group-hover:text-brand-primary line-clamp-3' : small ? 'text-base text-brand-dark group-hover:text-brand-primary line-clamp-2' : tall ? 'text-[22px] text-[#E85D42] hover:text-[#D45037] line-clamp-3' : 'text-xl text-brand-dark group-hover:text-brand-primary line-clamp-3'}`}>
              {getSafeText(article.title, language) || 'Sans titre'}
            </h3>
            <p className={`mt-2 ${large ? 'text-brand-muted text-lg line-clamp-3' : small ? 'text-brand-muted text-xs line-clamp-2' : tall ? 'text-zinc-600 dark:text-zinc-300 text-[15px] leading-relaxed line-clamp-4 font-medium' : 'text-brand-muted text-sm sm:text-base leading-relaxed line-clamp-3'}`}>
              {getSafeText(article.excerpt, language) || ''}
            </p>
          </Link>
        </div>
        
        <div className={`flex justify-between items-center mt-6 pt-4 ${tall ? 'border-t border-zinc-200 dark:border-zinc-700' : 'border-t border-brand-border dark:border-zinc-800'}`}>
          <div className={`font-bold uppercase tracking-wider ${tall ? 'text-[11px] text-zinc-500 dark:text-zinc-400' : 'text-[10px] text-brand-muted'}`}>
            {tall ? `${formatRelativeDate(article.date, language)} • ${article.readingTime} MIN` : `${article.author} • ${formatRelativeDate(article.date, language)}`}
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              toggleSavedArticle(article.id);
            }}
            className={`text-brand-dark hover:text-brand-primary transition-colors ${isSaved ? 'text-brand-primary' : ''}`}
            title="Save article"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MiniCard({ article }: { article: Article }) {
  const language = useStore((s) => s.language);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Link to={`/article/${article.slug || article.id}`} className="group min-w-[200px] w-[200px] flex-shrink-0 square-card block overflow-hidden">
        <div 
          className="w-full h-28 bg-cover bg-center border-b border-zinc-200 dark:border-zinc-800 transition-colors"
          style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
        />
        <div className="p-3 bg-transparent">
          <div className="text-[9px] font-bold uppercase tracking-wider text-brand-primary mb-1">
            {formatCategory(article.category, language)}
          </div>
          <h4 className="font-bold text-xs leading-snug text-brand-muted group-hover:text-[#E85D42] dark:group-hover:text-[#E85D42] transition-colors mb-2 line-clamp-2">
            {getSafeText(article.title, language) || 'Untitled'}
          </h4>
          <div className="text-[9px] font-bold uppercase tracking-wider text-brand-muted">
            {formatRelativeDate(article.date, language)}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function CategorySection({ title, subTitle, articles }: { title: string, subTitle?: string, articles: Article[] }) {
  if (articles.length === 0) return null;
  
  // Show first 8 articles in a grid
  const mainGrid = articles.slice(0, 8);
  // Show rest in a horizontal mini-carousel
  const subCarousel = articles.slice(8, 14);

  return (
    <section className="mb-14">
      <div className="border-b-4 border-brand-dark pb-1 mb-5 flex justify-between items-end">
        <h2 className="text-xl font-black uppercase tracking-widest">{title}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
         {mainGrid.map((article, idx) => (
            <ArticleCard key={`${article.id}-${idx}`} article={article} />
         ))}
      </div>

      {subCarousel.length > 0 && (
        <div className="glass p-4 -mx-4 md:mx-0 border border-brand-border bg-black/5 mt-8">
           <h3 className="text-xs font-bold uppercase tracking-widest text-[#E85D42] mb-4 px-4 md:px-0">
             {subTitle || "Sous-catégorie / Related"}
           </h3>
           <div className="flex overflow-x-auto hide-scrollbar gap-4 pt-3 pb-3 -mt-2 px-4 md:px-0 scroll-smooth snap-x">
             {subCarousel.map((article, idx) => (
                <div key={`${article.id}-${idx}`} className="snap-start" style={{ scrollSnapAlign: 'start' }}>
                  <MiniCard article={article} />
                </div>
             ))}
           </div>
        </div>
      )}
    </section>
  );
}

function HeroCarousel({ articles }: { articles: Article[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeHero, setActiveHero] = useState(0);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollLeft = containerRef.current.scrollLeft;
    const width = containerRef.current.offsetWidth;
    const idx = Math.round(scrollLeft / width);
    setActiveHero(idx);
  };

  const scrollTo = (idx: number) => {
    if (!containerRef.current) return;
    const width = containerRef.current.offsetWidth;
    containerRef.current.scrollTo({ left: width * idx, behavior: 'smooth' });
    setActiveHero(idx);
  };

  useEffect(() => {
    if (articles.length <= 1) return;
    const timer = setInterval(() => {
      setActiveHero(prev => {
        const next = (prev + 1) % articles.length;
        scrollTo(next);
        return next;
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [articles.length]);

  if (articles.length === 0) return null;

  return (
        <section className="hidden md:block mb-10 relative group overflow-hidden bg-brand-white shadow-sm border border-brand-border" >
          {/* Navigation Arrows */}
          <button 
             onClick={(e) => { e.stopPropagation(); scrollTo(activeHero === 0 ? articles.length - 1 : activeHero - 1); }} 
             className="absolute left-0 top-0 bottom-0 z-20 w-16 bg-black/20 text-white flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-none border-r border-white/10"
          >
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button 
             onClick={(e) => { e.stopPropagation(); scrollTo((activeHero + 1) % articles.length); }} 
             className="absolute right-0 top-0 bottom-0 z-20 w-16 bg-black/20 text-white flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-none border-l border-white/10"
          >
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><path d="m9 18 6-6-6-6"/></svg>
          </button>

          {/* Indication Dots */}
          <div className="absolute bottom-6 w-full z-20 flex justify-center gap-3">
             {articles.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollTo(idx);
                  }}
                  className={`w-10 h-1.5 transition-all duration-500 shadow-sm ${idx === activeHero ? 'bg-[#E85D42] shadow-md border border-black/50' : 'bg-brand-white/50 hover:bg-brand-white/90 border border-transparent'}`}
                />
             ))}
          </div>

          <div 
             ref={containerRef}
             onScroll={handleScroll}
             className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
          >
             {articles.map((article, idx) => (
                <div key={`${article.id}-${idx}`} className="min-w-full flex-shrink-0" style={{ scrollSnapAlign: 'start' }}>
                  <ArticleCard article={article} large />
                </div>
             ))}
          </div>
        </section>
  );
}

export function HomePage() {
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');
  
  const articles = useStore((s) => s.articles)
    .filter(a => a.isPublished !== false && (a as any).status !== 'draft')
    .sort((a, b) => {
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'title-asc') {
        const titleA = (a.title?.fr || a.title?.en || '').toLowerCase();
        const titleB = (b.title?.fr || b.title?.en || '').toLowerCase();
        return titleA.localeCompare(titleB);
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  const language = useStore((s) => s.language);
  const theme = useStore((s) => s.theme);
  const ads = useStore((s) => s.ads);
  const addSubscriber = useStore((s) => s.addSubscriber);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [selectedDossierModal, setSelectedDossierModal] = useState<any | null>(null);

  const dossierItems = [
    {
      id: 'dossier-real-estate',
      tag: language === 'fr' ? 'DOSSIER MACRO' : 'MACRO DOSSIER',
      titleFr: 'Dakar Real Estate & Bulle Foncière : Analyse des Grands Projets de Diamniadio',
      titleEn: 'Dakar Real Estate Macro: Land Values & Diamniadio Expansion Report',
      descFr: 'L\'immobilier à Dakar est l\'un des marchés les plus dynamiques de la région. Ce dossier spécial décortique les forces macro-économiques.',
      descEn: 'Dakar real estate is one of the most dynamic markets in West Africa. This special report analyzes macro-economic forces driving prices.',
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
      tag: language === 'fr' ? 'INTÉGRATION UEMOA' : 'ECOWAS TRADE',
      titleFr: 'Échanges Commerciaux en Afrique de l\'Ouest : Dynamiques & Monnaie Unique',
      titleEn: 'ECOWAS Regional Trade Dynamics & Monetary Integration Report',
      descFr: 'Rapport spécial d’analyse sur les flux de fret transfrontaliers, les politiques tarifaires et l’harmonisation douanière CEDEAO.',
      descEn: 'Special intelligence briefing on cross-border freight flows, tariff policies, and ECOWAS customs harmonization.',
      readTime: '15 MIN',
      fullTextFr: 'Les corridors logistiques entre le Port Autonome de Dakar, Bamako, Ouagadougou et Abidjan constituent la colonne vertébrale des échanges régionaux. Ce dossier passe en revue les données douanières du premier semestre 2026.',
      fullTextEn: 'The logistics corridors linking the Port Authority of Dakar, Bamako, Ouagadougou, and Abidjan form the backbone of regional commerce. This dossier reviews H1 2026 customs and trade volume datasets.',
      key1Fr: 'Croissance de 14.2% des flux de marchandises conteneurisées par le port de Dakar.',
      key1En: '14.2% growth in containerized cargo throughput via the Port of Dakar.',
      key2Fr: 'Rôle pivot de la BCEAO dans la stabilisation des liquidités de marché.',
      key2En: 'Central role of the BCEAO in maintaining regional market liquidity.'
    },
    {
      id: 'dossier-gas-energy',
      tag: language === 'fr' ? 'ÉNERGIE & GAZ' : 'ENERGY & GAS',
      titleFr: 'Stratégie Gazière Sangomar & GTA : Vers l\'Indépendance Énergétique',
      titleEn: 'Sangomar & GTA Offshore Gas Strategy: Path to Regional Sovereignty',
      descFr: 'Dossier exclusif sur l\'exploitation des gisements offshore, le gaz-to-power et la transformation industrielle locale.',
      descEn: 'Exclusive dossier on offshore gas field operations, gas-to-power infrastructure, and domestic industrialization.',
      readTime: '18 MIN',
      fullTextFr: 'L’entrée en production industrielle des gisements offshore de Sangomar et du champ GTA (Grand Tortue Ahmeyim) transforme la trajectoire budgétaire du Sénégal. Ce dossier explore les retombées pour la SENELEC, les PME locales et la pétrochimie.',
      fullTextEn: 'The ramp-up of offshore production at Sangomar and GTA transforms Senegal’s fiscal trajectory. This dossier explores spinoff benefits for SENELEC, local SMEs, and domestic petrochemicals.',
      key1Fr: 'Réduction de 35% des coûts de production électrique grâce au Gaz-To-Power.',
      key1En: 'Expected 35% reduction in electricity generation costs via domestic Gas-To-Power.',
      key2Fr: 'Souveraineté budgétaire renforcée par les recettes d\'exportation de GNL.',
      key2En: 'Strengthened fiscal sovereignty backed by LNG export revenues.'
    }
  ];

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    addSubscriber(newsletterEmail);
    setSubscribedEmail(newsletterEmail);
    setShowNewsletterModal(true);
    setNewsletterEmail('');
  };
  
  useSEO({
    title: language === 'fr' ? 'The Perspective Group | Grand Journal d’Information' : 'The Perspective Group | Independent News & Journal',
    description: language === 'fr' 
      ? "Grand journal d’information, de décryptage et d’analyse basé à Dakar : Politique, Économie, Société, Tech, Culture, Sports, Santé et International." 
      : "Major independent news, analysis, and investigation journal based in Dakar covering Politics, Economics, Tech, Culture, Sports, Health, and World news.",
  });

  const currentSettings: any = useStore((s) => s.siteSettings) || {
    siteName: 'Perspective',
    accentColor: '#E85D42',
    trendingCount: 4,
    mostReadCount: 5,
    analystDispatches: [],
    coastAndHarbor: {},
    dailyWisdom: {}
  };
  const [activeCoastTab, setActiveCoastTab] = useState<'tide' | 'goree' | 'meteo' | 'gale' | null>(null);
  
  const featuredArticles = articles.filter(a => a.isFeatured).slice(0, 4);
  const flashArticles = articles.filter(a => a.category === 'Flash Info' || a.category === 'Flash' || (a as any).type === 'flash');
  const arenaArticles = articles.filter(a => a.category === 'Sports' || a.category?.toLowerCase().includes('sport') || a.category?.toLowerCase().includes('arène'));
  const dossierArticles = articles.filter(a => a.category === 'Dossiers' || a.category === 'Dossier' || a.category?.toLowerCase().includes('dossier'));
  const maritimeArticles = articles.filter(a => a.category === 'Météo & Maritime' || a.category === 'Chaloupe & Transports' || a.category?.toLowerCase().includes('météo') || a.category?.toLowerCase().includes('chaloupe'));

  const largeSet = [...articles, ...articles, ...articles]; // Mock more articles for layout
  const allMixedSet = [...largeSet].sort(() => Math.random() - 0.5);

  const sidebarAds = ads?.filter(a => a.active && a.position === 'sidebar' && a.imageUrl && a.imageUrl.trim() !== '') || [];
  const activeBetweenAds = ads?.filter(a => a.active && a.position === 'homepage-between') || [];

  const categoriesConfig = [
    { main: "Politique", sub: language === 'fr' ? "Politique" : "Politics" },
    { main: "International", sub: language === 'fr' ? "International" : "International" },
    { main: "Économie", sub: language === 'fr' ? "Économie" : "Economy" },
    { main: "Société", sub: language === 'fr' ? "Société" : "Society" },
    { main: "People", sub: language === 'fr' ? "People" : "People" },
    { main: "Dossiers", sub: language === 'fr' ? "Dossiers" : "Dossiers" },
  ];

  const t = {
    trending: language === 'fr' ? 'Les plus récents' : 'Latest News',
    mostRead: language === 'fr' ? 'Les plus lus' : 'Most Read',
    editorsPicks: language === 'fr' ? 'Choix de la rédaction' : 'Editor\'s Picks',
    newsletter: language === 'fr' ? 'Newsletter' : 'Newsletter',
    briefings: 'Dossiers',
    discover: language === 'fr' ? 'Découvrir' : 'Discover',
    adSpace: language === 'fr' ? 'Espace Publicitaire' : 'Premium Ad Space',
    adLabel: language === 'fr' ? 'Publicité' : 'Advertisement'
  };

  const horizontalAds = [
    {
      id: "h-ad-1",
      title: language === 'fr' ? "Fonds d'investissement d'impact pour l'Afrique de l'Ouest" : "Impact Investment Fund for West Africa",
      desc: language === 'fr' ? "Maximisez vos investissements stratégiques et participez au développement socio-économique dakarois." : "Maximize your strategic investments and participate in Dakar's socio-economic development.",
      cta: language === 'fr' ? "En savoir plus" : "Learn More",
      tag: "FINANCE & COLLATERAL",
      bgClass: "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800",
      btnClass: "bg-[#E85D42] hover:bg-[#D45037] text-white",
      imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800&fit=crop"
    },
    {
      id: "h-ad-2",
      title: language === 'fr' ? "Infrastructures Digitales Hub Sénégal" : "Digital Infrastructures Senegal Hub",
      desc: language === 'fr' ? "Des performances cloud premium et un accompagnement local d'exception pour les leaders du e-commerce." : "Premium cloud performance and exceptional local guidance for e-commerce leaders.",
      cta: language === 'fr' ? "Tester Gratuitement" : "Start Free Trial",
      tag: "CLOUD & CLUSTERTECH",
      bgClass: "bg-zinc-50 border-zinc-200 dark:bg-[#18181c] dark:border-zinc-800",
      btnClass: "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-black",
      imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&fit=crop"
    },
    {
      id: "h-ad-3",
      title: language === 'fr' ? "The Perspective : Notre Edition Club des Lecteurs" : "The Perspective: Readers' Club Weekly Edition",
      desc: language === 'fr' ? "Abonnez-vous à nos rapports de synthèse et grands décryptages exclusifs du journal Perspective." : "Subscribe to our exclusive synthesis reports and in-depth investigations.",
      cta: language === 'fr' ? "Rejoindre le Club" : "Access Club Reports",
      tag: "EXCLUSIVE REPORTS",
      bgClass: "bg-amber-50/40 border-amber-200/50 dark:bg-zinc-900/60 dark:border-zinc-800",
      btnClass: "bg-[#E85D42] hover:bg-[#D45037] text-white",
      imageUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&fit=crop"
    },
    {
      id: "h-ad-4",
      title: language === 'fr' ? "Résidences de Prestige & Villas Vertes" : "Prestige Residences & Sustainable Villas",
      desc: language === 'fr' ? "Achetez d'incroyables propriétés d'exception à Dakar Almadies et en bord de mer à Saly." : "Purchase extraordinary premium real estate in Dakar Almadies and seaside at Saly.",
      cta: language === 'fr' ? "Découvrir la Brochure" : "View Brochure",
      tag: "REAL ESTATE PRESTIGE",
      bgClass: "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800",
      btnClass: "bg-[#E85D42] hover:bg-[#D45037] text-white",
      imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800&fit=crop"
    }
  ];

  const farLeftAd = ads?.find(a => a.active && a.position === 'far-left');
  const farRightAd = ads?.find(a => a.active && a.position === 'far-right');
  const hasLeftAd = !!farLeftAd;
  const hasRightAd = !!(farRightAd || (sidebarAds && sidebarAds.length > 0));

  const mainColSpan = hasLeftAd && hasRightAd 
    ? 'lg:col-span-10' 
    : hasLeftAd || hasRightAd 
    ? 'lg:col-span-11' 
    : 'lg:col-span-12';

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      
      {/* Big Carousel of HotTopics */}
      <HeroCarousel articles={featuredArticles} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content: Chronological Journal Feed */}
        <div className={`${hasRightAd ? 'lg:col-span-7' : 'lg:col-span-9'} min-w-0 space-y-8`}>
          <div className="border-b-4 border-brand-dark pb-3 flex justify-between items-end dark:border-zinc-800">
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-brand-dark">
                {language === 'fr' ? "L'Actualité" : "Latest News"}
              </h2>
            </div>
            
            {/* Elegant Selector with Filter logo */}
            <div className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 px-2.5 py-1 border border-zinc-300 dark:border-zinc-800 transition-all select-none">
              <Filter size={11} className="text-[#E85D42]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[9px] uppercase font-black tracking-wider text-brand-dark dark:text-zinc-200 outline-none cursor-pointer font-sans"
              >
                <option value="date-desc" className="bg-zinc-900 text-white">{language === 'fr' ? 'RÉCENT / DATE' : 'NEWEST / DATE'}</option>
                <option value="date-asc" className="bg-zinc-900 text-white">{language === 'fr' ? 'ANCIEN / DATE' : 'OLDEST / DATE'}</option>
                <option value="title-asc" className="bg-zinc-900 text-white">{language === 'fr' ? 'TITRE (A-Z)' : 'TITLE (A-Z)'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6">
            {/* Fetch sorted articles */}
            {[...articles]
              .sort((a, b) => {
                if (sortBy === 'date-desc') {
                  return new Date(b.date).getTime() - new Date(a.date).getTime();
                } else if (sortBy === 'date-asc') {
                  return new Date(a.date).getTime() - new Date(b.date).getTime();
                } else {
                  const titleA = (a.title?.[language] || '').toLowerCase();
                  const titleB = (b.title?.[language] || '').toLowerCase();
                  return titleA.localeCompare(titleB);
                }
              })
              .slice(0, 20) // expanded feed scale
              .map((article, idx, array) => {
                const elements = [];
                // Render regular article card
                elements.push(
                  <ArticleCard key={`${article.id}-${idx}`} article={article} />
                );

                // Insert dynamic horizontally structured ad banner up to 5 times (every 4 items) - One line in phone mode
                if ((idx + 1) % 4 === 0 && activeBetweenAds.length > 0) {
                  const adIndex = Math.floor((idx + 1) / 4) - 1;
                  
                  if (adIndex < 5) { // up to 5 ads
                    const currentAd = activeBetweenAds[adIndex % activeBetweenAds.length];
                    elements.push(
                      <div className="col-span-1 sm:col-span-2 py-1" key={`horizontal-mid-ad-${adIndex}`}>
                        <div className="bg-[#E85D42]/5 text-zinc-950 dark:text-zinc-200 border border-[#E85D42]/20 px-3 py-2 sm:px-4 sm:py-2.5 relative overflow-hidden group font-sans">
                          <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-4 w-full flex-nowrap">
                            {/* Left: Sponsor badge, thumbnail, and info */}
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <span 
                                className="shrink-0 text-[7px] sm:text-[8px] bg-[#E85D42]/10 font-black px-1.5 py-0.5 tracking-wider uppercase border border-[#E85D42]/20 select-none" 
                                style={{ color: currentSettings.accentColor, borderColor: `${currentSettings.accentColor}33` }}
                              >
                                {language === 'fr' ? 'SPONSOR' : 'SPONSOR'}
                              </span>
                              {currentAd.imageUrl && currentAd.imageUrl.trim() !== '' && (
                                <img 
                                  src={currentAd.imageUrl} 
                                  alt="" 
                                  className="w-7 h-7 sm:w-8 sm:h-8 object-cover border border-brand-border shrink-0 rounded-none"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="text-left min-w-0 flex-1">
                                <h4 className="font-black text-[10px] sm:text-xs uppercase tracking-wider text-[#E85D42] truncate leading-tight" style={{ color: currentSettings.accentColor }}>
                                  {currentAd.name}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-zinc-600 dark:text-zinc-400 font-medium truncate hidden xs:block sm:block leading-tight">
                                  {typeof currentAd.description === 'object'
                                    ? ((currentAd.description as any)[language] || (currentAd.description as any).fr || (currentAd.description as any).en || '')
                                    : (currentAd.description || currentAd.targetUrl)}
                                </p>
                              </div>
                            </div>

                            {/* Right: CTA button on far right, widely separated */}
                            <a 
                              href={currentAd.targetUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-[#E85D42] text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:opacity-90 shrink-0 transition-opacity ml-2 whitespace-nowrap"
                              style={{ backgroundColor: currentSettings.accentColor }}
                            >
                              {currentAd.ctaText || (language === 'fr' ? 'DÉCOUVRIR' : 'DISCOVER')}
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }

                return elements;
              })}
          </div>
        </div>
        
        {/* Right Sidebar Rubrics (Stays lg:col-span-3 when ad disappears, so articles widen) */}
        <div className="lg:col-span-3 min-w-0 space-y-8">
          
          {/* Widget 1: Trendings - Sourced from our actual journal articles */}
          <div className="glass p-5 border-t-4 border-t-[#E85D42] bg-white/95 dark:bg-zinc-900/80 text-left" style={{ borderTopColor: currentSettings.accentColor }}>
            <div className="flex items-center gap-1.5 mb-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
              <TrendingUp size={14} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
              <span className="text-xs font-serif font-black uppercase tracking-widest text-[#E85D42]">
                {language === 'fr' ? 'TENDANCES' : 'TRENDINGS'}
              </span>
            </div>
            
            <div className="space-y-3 font-sans">
              {articles.slice(1, (currentSettings.trendingCount || 4)).map((article, idx) => (
                <Link 
                  key={`${article.id}-${idx}`} 
                  to={`/article/${article.slug || article.id}`} 
                  className="group flex gap-3 p-2 bg-zinc-50/80 dark:bg-zinc-950/20 hover:bg-white dark:hover:bg-zinc-950/60 transition-all border border-zinc-200/60 dark:border-zinc-800/40 rounded-none duration-300"
                >
                  <img 
                    src={getSafeImageUrl(article.featuredImage || article.imageUrl)} 
                    alt="" 
                    className="w-20 h-16 object-cover bg-zinc-100 dark:bg-zinc-900 shrink-0 border border-zinc-200/50 dark:border-zinc-800/50" 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                    }}
                  />
                  <div className="flex flex-col justify-between min-w-0 flex-grow">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#E85D42]">
                        {formatCategory(article.category, language)}
                      </span>
                      <h4 
                        className="font-black text-[11px] leading-tight dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors line-clamp-2 mt-0.5"
                        style={{ color: theme === 'dark' ? undefined : '#000000' }}
                      >
                        {getSafeText(article.title, language) || 'Untitled'}
                      </h4>
                    </div>
                    <span 
                      className="text-[8px] font-extrabold dark:text-zinc-400 uppercase tracking-wider mt-1 block"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {article.author} • {article.readingTime} MIN
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Widget 1.5: FLASH INFO / DÉPÊCHES D'ANALYSTES (Placed right under Trendings) */}
          <div className="glass p-5 border-t-4 border-t-[#E85D42] bg-white/95 dark:bg-zinc-900/80 text-left" style={{ borderTopColor: currentSettings.accentColor }}>
            <div className="flex items-center gap-1.5 mb-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
              <Zap size={14} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
              <span className="text-xs font-serif font-black uppercase tracking-widest text-[#E85D42]">
                {language === 'fr' ? 'FLASH INFO' : 'BREAKING FLASH'}
              </span>
            </div>

            <div className="space-y-4 font-sans text-left">
              {flashArticles.length > 0 && (
                <div className="space-y-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  {flashArticles.slice(0, 3).map((art, idx) => (
                    <Link
                      key={`${art.id}-${idx}`}
                      to={`/article/${art.slug || art.id}`}
                      className="group block pb-2 border-b border-zinc-200/40 dark:border-zinc-800/20 last:border-0 last:pb-0 text-left"
                    >
                      <span className="text-[7px] font-mono font-black uppercase px-1.5 py-0.5 rounded inline-block mb-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        FLASH INFO
                      </span>
                      <p className="font-extrabold text-xs leading-relaxed dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors text-left block">
                        {art.title?.[language] || art.title?.fr}
                      </p>
                      <span className="text-[9px] font-mono font-bold text-[#E85D42] block mt-1 text-left" style={{ color: currentSettings.accentColor }}>
                        {formatRelativeDate(art.date, language)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {(currentSettings.analystDispatches && currentSettings.analystDispatches.length > 0) ? (
                currentSettings.analystDispatches.map((dispatch: any, idx: number) => (
                  <div 
                    key={`${dispatch.id}-${idx}`} 
                    className="group pb-3 border-b border-zinc-200/60 dark:border-zinc-800/30 last:border-0 last:pb-0 text-left"
                  >
                    {dispatch.level && (
                      <span className={`text-[7px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded inline-block mb-1.5 ${
                        dispatch.level === 'crimson' || dispatch.level === 'pulse'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' 
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {dispatch.level === 'pulse' ? 'URGENT' : dispatch.level}
                      </span>
                    )}
                    <p 
                      className="font-extrabold text-xs leading-relaxed dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors text-left block"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {language === 'fr' ? dispatch.contentFr : dispatch.contentEn}
                    </p>
                    <span 
                      className="text-[10px] font-mono font-bold text-[#E85D42] block mt-1.5 text-left" 
                      style={{ color: currentSettings.accentColor }}
                    >
                      {dispatch.time}
                    </span>
                  </div>
                ))
              ) : (
                <div className="space-y-3 font-sans text-left">
                  <div className="group pb-3 border-b border-zinc-200/60 dark:border-zinc-800/30 text-left">
                    <p 
                      className="font-extrabold text-xs leading-relaxed dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors text-left block"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {language === 'fr' 
                        ? "Tensions d'arbitrage levées sur l'axe maritime Dakar-Gorée." 
                        : "Maritime transit clearance issued for the Dakar-Gorée axis."}
                    </p>
                    <span className="text-[10px] font-mono font-bold text-[#E85D42] block mt-1.5 text-left" style={{ color: currentSettings.accentColor }}>14:22 DKR</span>
                  </div>
                  <div className="group pb-3 border-b border-zinc-200/60 dark:border-zinc-800/30 text-left">
                    <p 
                      className="font-extrabold text-xs leading-relaxed dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors text-left block"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {language === 'fr' 
                        ? "Hausse des obligations souveraines suite aux déclarations sur le gaz naturel." 
                        : "Sovereign bonds rise following regional natural gas production updates."}
                    </p>
                    <span className="text-[10px] font-mono font-bold text-[#E85D42] block mt-1.5 text-left" style={{ color: currentSettings.accentColor }}>11:05 ZLR</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Widget 2: Latest News */}
          <div className="glass p-5 border-t-4 border-t-[#E85D42] bg-white/95 dark:bg-zinc-900/80 text-left">
            <div className="flex items-center gap-1.5 mb-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
              <Zap size={14} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
              <span className="text-xs font-serif font-black uppercase tracking-widest text-[#E85D42]">
                {language === 'fr' ? "L'ACTUALITÉ" : 'LATEST NEWS'}
              </span>
            </div>
            <div className="space-y-3 font-sans">
              {[...articles]
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 4)
                .map((article, i) => (
                  <Link key={`${article.id}-${i}`} to={`/article/${article.slug || article.id}`} className="group flex gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/30 last:border-0 last:pb-0">
                    <span className="text-xl font-black text-[#E85D42] group-hover:text-[#E85D42] transition-colors">0{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-extrabold text-[#E85D42] uppercase tracking-widest">{formatCategory(article.category, language)}</span>
                      <h4 
                        className="font-black text-xs leading-tight dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors line-clamp-2 mt-0.5"
                        style={{ color: theme === 'dark' ? undefined : '#000000' }}
                      >
                        {getSafeText(article.title, language) || 'Untitled'}
                      </h4>
                    </div>
                  </Link>
                ))}
            </div>
          </div>

          {/* Widget 4: Le Monde - Global Dispatches */}
          <div className="glass p-5 border-t-4 border-t-[#E85D42] bg-white/95 dark:bg-zinc-900/80 text-left" style={{ borderTopColor: currentSettings.accentColor }}>
            <div className="flex items-center gap-1.5 mb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
              <Globe size={14} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
              <span className="text-xs font-serif font-black uppercase tracking-widest text-[#E85D42]">
                LE MONDE
              </span>
            </div>
            <p 
              className="text-[9px] dark:text-zinc-400 uppercase font-black tracking-widest mb-3"
              style={{ color: theme === 'dark' ? undefined : '#000000' }}
            >
              {language === 'fr' ? 'DÉPÊCHES & SYNTHÈSES GLOBALES' : 'GLOBAL DISPATCHES & BRIEFS'}
            </p>
            <div className="space-y-4 font-sans">
              {(currentSettings.leMondeDispatches && currentSettings.leMondeDispatches.length > 0) ? (
                currentSettings.leMondeDispatches.slice(0, 5).map((item: any, idx: number) => (
                  <div 
                    key={`${item.id}-${idx}`} 
                    className="block border-l-2 border-[#E85D42] pl-3 py-1 bg-zinc-50/50 dark:bg-zinc-950/30 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/20 transition-colors group"
                    style={{ borderLeftColor: currentSettings.accentColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono tracking-wider font-extrabold text-[#E85D42]">
                        {language === 'fr' ? item.tagFr : item.tagEn}
                      </span>
                      <span 
                        className="text-[8px] font-mono tracking-wider font-extrabold dark:text-zinc-400"
                        style={{ color: theme === 'dark' ? undefined : '#000000' }}
                      >
                        {item.time}
                      </span>
                    </div>
                    <p 
                      className="text-xs leading-relaxed font-extrabold mt-0.5 dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {language === 'fr' ? item.titleFr : item.titleEn}
                    </p>
                    {(item.excerptFr || item.excerptEn) && (
                      <p 
                        className="text-[10px] font-medium line-clamp-1 mt-0.5 dark:text-zinc-300"
                        style={{ color: theme === 'dark' ? undefined : '#000000' }}
                      >
                        {language === 'fr' ? item.excerptFr : item.excerptEn}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                articles.filter(a => a.category === 'International' || a.category?.toLowerCase() === 'international').map((art, idx) => {
                  const times = ["14:22 GMT", "11:05 GMT", "08:45 GMT"];
                  const displayTime = times[idx % times.length];
                  return (
                    <Link 
                      key={`${art.id}-${idx}`} 
                      to={`/article/${art.slug}`} 
                      className="block border-l-2 border-[#E85D42] pl-3 py-1 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/20 transition-colors group"
                      style={{ borderLeftColor: currentSettings.accentColor }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono tracking-wider font-extrabold text-[#E85D42]">
                          {art.type || 'International'}
                        </span>
                        <span 
                          className="text-[8px] font-mono tracking-wider font-extrabold dark:text-zinc-400"
                          style={{ color: theme === 'dark' ? undefined : '#000000' }}
                        >
                          {displayTime}
                        </span>
                      </div>
                      <p 
                        className="text-xs leading-relaxed font-extrabold mt-0.5 dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors"
                        style={{ color: theme === 'dark' ? undefined : '#000000' }}
                      >
                        {art.title?.[language] || 'Untitled'}
                      </p>
                      {art.excerpt?.[language] && (
                        <p 
                          className="text-[10px] font-medium line-clamp-1 mt-0.5 dark:text-zinc-300"
                          style={{ color: theme === 'dark' ? undefined : '#000000' }}
                        >
                          {art.excerpt[language]}
                        </p>
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Ad Banner 1 (Café Dakar Touba - Dynamic Ad) */}
          {(() => {
            const cafeAd = ads?.find(a => a.active && (a.position === 'sidebar-cafe' || a.id === 'ad-cafe-touba'));
            if (!cafeAd) return null;
            return (
              <div 
                key={cafeAd.id} 
                className="border p-4 relative overflow-hidden group font-sans text-left transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: cafeAd.bgColor || 'rgba(245, 158, 11, 0.12)',
                  borderColor: 'rgba(217, 119, 6, 0.25)'
                }}
              >
                <span className="absolute right-2 top-2 text-[7px] bg-amber-800/10 text-amber-800 dark:text-amber-300 font-black px-1 tracking-widest uppercase">
                  {getSafeText(cafeAd.tag, language) || 'SPONSORISÉ'}
                </span>
                <a href={cafeAd.targetUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center">
                  {cafeAd.imageUrl ? (
                    <img src={cafeAd.imageUrl} alt="" className="w-8 h-8 object-cover shrink-0 rounded border border-amber-800/20" />
                  ) : (
                    <Coffee className="text-amber-700 dark:text-amber-400 shrink-0" size={18} />
                  )}
                  <div>
                    <h4 className="font-extrabold text-xs text-[#E85D42] uppercase tracking-widest" style={{ color: currentSettings.accentColor }}>
                      {getSafeText(cafeAd.name, language)}
                    </h4>
                    <p 
                      className="text-[10px] dark:text-zinc-200 font-bold leading-relaxed mt-0.5"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {typeof cafeAd.description === 'object'
                        ? ((cafeAd.description as any)[language] || (cafeAd.description as any).fr || (cafeAd.description as any).en || '')
                        : (cafeAd.description || '')}
                    </p>
                  </div>
                </a>
              </div>
            );
          })()}

          {/* Widget 5: Senegal Coasts & Harbors */}
          <div className="glass p-5 border-t-4 border-t-[#E85D42] bg-white/85 dark:bg-zinc-900/80 text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#E85D42] flex items-center gap-1.5">
              <Waves size={10} /> {language === 'fr' ? 'PORTS & HORAIRES' : 'PORTS & TIME'}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#E85D42] mb-4 mt-1">
              {language === 'fr' ? 'Maritime' : 'Maritime'}
            </h2>
            
            <div className="space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-2">
                {/* 1. PORT TIDE CARD */}
                <button 
                  onClick={() => setActiveCoastTab(activeCoastTab === 'tide' ? null : 'tide')}
                  className={`p-2.5 text-left border transition-all duration-200 cursor-pointer focus:outline-none ${activeCoastTab === 'tide' ? 'bg-[#E85D42]/10 border-[#E85D42]' : 'bg-zinc-100/70 hover:bg-zinc-100 dark:bg-zinc-950/50 dark:hover:bg-zinc-950/80 border-zinc-200/60 dark:border-zinc-800/60'}`}
                >
                  <div className="text-[7.5px] uppercase tracking-widest font-black flex items-center gap-1 text-[#E85D42]">
                    <Waves size={8} /> {language === 'fr' ? 'MARÉE DU PORT' : 'PORT TIDE'}
                  </div>
                  <div className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
                    16:48 UT
                  </div>
                  <div 
                    className="text-[8px] text-zinc-600 dark:text-zinc-400 font-extrabold"
                    style={{ color: '#4a4a4f' }}
                  >
                    {language === 'fr' ? '+1,64 Mètre (Montante)' : '+1.64 Meters (Rising)'}
                  </div>
                </button>

                {/* 2. GOREE FERRY CARD */}
                <button 
                  onClick={() => setActiveCoastTab(activeCoastTab === 'goree' ? null : 'goree')}
                  className={`p-2.5 text-left border transition-all duration-200 cursor-pointer focus:outline-none ${activeCoastTab === 'goree' ? 'bg-[#E85D42]/10 border-[#E85D42]' : 'bg-zinc-100/70 hover:bg-zinc-100 dark:bg-zinc-950/50 dark:hover:bg-zinc-950/80 border-zinc-200/60 dark:border-zinc-800/60'}`}
                >
                  <div className="text-[7.5px] uppercase tracking-widest font-black flex items-center gap-1 text-[#E85D42]">
                    <Ship size={8} /> {language === 'fr' ? 'LIAISON GORÉE' : 'GORÉE FERRY'}
                  </div>
                  <div className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
                    {language === 'fr' ? '12 Liaisons / Jour' : '12 Departures / Day'}
                  </div>
                  <div className="text-[8px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {language === 'fr' ? 'Statut : Fluide' : 'Status: Normal'}
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 3. METEOROLOGY CARD */}
                <button 
                  onClick={() => setActiveCoastTab(activeCoastTab === 'meteo' ? null : 'meteo')}
                  className={`p-2.5 text-left border transition-all duration-200 cursor-pointer focus:outline-none ${activeCoastTab === 'meteo' ? 'bg-[#E85D42]/10 border-[#E85D42]' : 'bg-zinc-100/70 hover:bg-zinc-100 dark:bg-zinc-950/50 dark:hover:bg-zinc-950/80 border-zinc-200/60 dark:border-zinc-800/60'}`}
                >
                  <div className="text-[7.5px] uppercase tracking-widest font-black flex items-center gap-1 text-[#E85D42]">
                    <CloudSun size={8} className="text-amber-500" /> {language === 'fr' ? 'MÉTÉOROLOGIE' : 'METEOROLOGY'}
                  </div>
                  <div className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
                    29°C / 84°F
                  </div>
                  <div 
                    className="text-[8px] text-zinc-600 dark:text-zinc-400 font-extrabold"
                    style={{ color: '#434345' }}
                  >
                    {language === 'fr' ? 'Ensoleillé & Venté' : 'Sunny & Windy'}
                  </div>
                </button>

                {/* 4. MARINE GALE CARD */}
                <button 
                  onClick={() => setActiveCoastTab(activeCoastTab === 'gale' ? null : 'gale')}
                  className={`p-2.5 text-left border transition-all duration-200 cursor-pointer focus:outline-none ${activeCoastTab === 'gale' ? 'bg-[#E85D42]/10 border-[#E85D42]' : 'bg-zinc-100/70 hover:bg-zinc-100 dark:bg-zinc-950/50 dark:hover:bg-zinc-950/80 border-zinc-200/60 dark:border-zinc-800/60'}`}
                >
                  <div className="text-[7.5px] uppercase tracking-widest font-black flex items-center gap-1 text-[#E85D42]">
                    <Wind size={8} className="text-blue-500 animate-pulse" /> {language === 'fr' ? 'COUP DE VENT' : 'MARINE GALE'}
                  </div>
                  <div className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
                    18 kt NW (ANACIM)
                  </div>
                  <div className="text-[8px] text-red-600 dark:text-red-400 font-extrabold">
                    {language === 'fr' ? 'Avis : Vigilance Houle' : 'Warning: High Swells'}
                  </div>
                </button>
              </div>

              {/* INTERACTIVE EXPANDABLE DRAWERS */}
              {activeCoastTab === 'tide' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 space-y-2 mt-2"
                >
                  <p className="font-bold text-zinc-900 dark:text-white uppercase text-[9px] tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-1">
                    {language === 'fr' ? 'PRÉVISIONS DES MARÉES - PORT DE DAKAR' : 'TIDE FORECASTS - PORT OF DAKAR'}
                  </p>
                  <div className="space-y-1 font-mono text-[10.5px] text-zinc-800 dark:text-zinc-200">
                    <div className="flex justify-between">
                      <span>{language === 'fr' ? 'Basse Mer :' : 'Low Tide:'}</span>
                      <span className="font-bold">10:35 UT (0,45m)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === 'fr' ? 'Pleine Mer (Pic) :' : 'High Tide (Peak):'}</span>
                      <span className="font-bold text-[#E85D42]">16:48 UT (+1,64m)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === 'fr' ? 'Coefficient :' : 'Tidal Coeff:'}</span>
                      <span className="font-bold">84 (Pleine Lune)</span>
                    </div>
                  </div>
                  <p className="text-[9.5px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium italic mt-1 font-sans">
                    {language === 'fr' 
                      ? "Données de marégraphie corrigées en temps réel d'après les éphémérides de la Capitainerie du Port Autonome de Dakar." 
                      : 'Tidal telemetry corrected in real-time under astronomical tables from the Port Authority of Dakar.'}
                  </p>
                </motion.div>
              )}

              {activeCoastTab === 'goree' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 space-y-2 mt-2"
                >
                  <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-1">
                    <p className="font-bold text-zinc-900 dark:text-white uppercase text-[9px] tracking-widest">
                      {language === 'fr' ? 'HORAIRES OFFICIELS CHALOUPE GORÉE' : 'GORÉE FERRY DEPARTURES (CHALOUPE)'}
                    </p>
                    <a href="https://www.lmdg.sn" target="_blank" rel="noopener noreferrer" className="text-[8.5px] text-[#E85D42] font-bold hover:underline">
                      LMDG ↗
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono leading-relaxed text-zinc-800 dark:text-zinc-200">
                    <div>
                      <span className="font-bold text-[#E85D42] uppercase text-[8px] tracking-wider block mb-1">
                        {language === 'fr' ? '► DE DAKAR :' : '► FROM DAKAR:'}
                      </span>
                      <div className="space-y-0.5">
                        <p>06:15 | 07:30</p>
                        <p>10:00 | 11:00</p>
                        <p>12:30 | 14:30</p>
                        <p>16:00 | 17:00</p>
                        <p>18:30 | 20:00</p>
                        <p className="text-[#E85D42] font-black">22:30 | 23:30</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-[#E85D42] uppercase text-[8px] tracking-wider block mb-1">
                        {language === 'fr' ? '◄ DE GORÉE :' : '◄ FROM GORÉE:'}
                      </span>
                      <div className="space-y-0.5">
                        <p>06:45 | 08:00</p>
                        <p>10:30 | 11:30</p>
                        <p>13:00 | 15:00</p>
                        <p>16:30 | 17:30</p>
                        <p>19:00 | 20:30</p>
                        <p className="text-[#E85D42] font-black">23:00 | 00:00</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeCoastTab === 'meteo' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 space-y-2 mt-2"
                >
                  <p className="font-bold text-zinc-900 dark:text-white uppercase text-[9px] tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-1">
                    {language === 'fr' ? 'OBSERVATIONS MÉTÉOROLOGIQUES' : 'METEOROLOGICAL OBS.'}
                  </p>
                  <div className="space-y-1 font-mono text-[10.5px] text-zinc-800 dark:text-zinc-200">
                    <div className="flex justify-between">
                      <span>{language === 'fr' ? 'Température :' : 'Temperature:'}</span>
                      <span className="font-bold">29°C / 84°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === 'fr' ? 'Vent :' : 'Wind speed:'}</span>
                      <span className="font-bold">18 km/h NW</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === 'fr' ? 'Humidité :' : 'Humidity:'}</span>
                      <span className="font-bold">64%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === 'fr' ? 'Visibilité :' : 'Visibility:'}</span>
                      <span className="font-bold">10 km</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeCoastTab === 'gale' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="bg-red-50 dark:bg-red-950/20 p-3 border border-red-200 dark:border-red-900/40 text-xs text-zinc-800 dark:text-zinc-200 space-y-2 mt-2"
                >
                  <div className="flex justify-between items-center border-b border-red-200 dark:border-red-900/20 pb-1">
                    <p className="font-black text-red-700 dark:text-red-400 uppercase text-[9px] tracking-widest">
                      {language === 'fr' ? '⚠️ BULLETIN SPÉCIAL (ANACIM)' : '⚠️ SPECIAL ADVISORY (ANACIM)'}
                    </p>
                    <a href="https://anacim.sn" target="_blank" rel="noopener noreferrer" className="text-[8.5px] text-red-600 dark:text-red-400 font-bold hover:underline">
                      ANACIM ↗
                    </a>
                  </div>
                  <p className="text-[11px] leading-relaxed font-bold text-zinc-900 dark:text-zinc-100">
                    {language === 'fr' 
                      ? (currentSettings.coastAndHarbor?.galeWarningFr || "Avis de coup de vent et de houle dangereuse de secteur Nord-Ouest dépassant 2,5 mètres de hauteur sur l'axe Saint-Louis - Dakar - Mbour.") 
                      : (currentSettings.coastAndHarbor?.galeWarningEn || "Severe NW gale warning with hazardous offshore swells reaching 2.5 to 3.0 meters along the Saint-Louis - Dakar - Mbour coast.")}
                  </p>
                  <p className="text-[9.5px] leading-relaxed text-red-600 dark:text-red-300 italic">
                    {language === 'fr' 
                      ? 'Recommandation officielle ANACIM : Les sorties en haute mer des pirogues artisanales et bateaux légers sont vivement déconseillées.' 
                      : 'ANACIM official directive: Traditional fishing pirogues and small watercraft operations are advised to suspend high seas navigation.'}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
          {/* Ad Banner 2 (TER - Trans-Dakar - Dynamic Ad) */}
          {(() => {
            const terAd = ads?.find(a => a.active && (a.position === 'sidebar-ter' || a.id === 'ad-ter-trans-dakar'));
            if (!terAd) return null;
            return (
              <div 
                key={terAd.id} 
                className="border p-4 relative overflow-hidden group font-sans text-left transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: terAd.bgColor || 'rgba(59, 130, 246, 0.12)',
                  borderColor: 'rgba(30, 64, 175, 0.2)'
                }}
              >
                <span className="absolute right-2 top-2 text-[7px] bg-blue-800/10 text-blue-700 dark:text-blue-300 font-black px-1 tracking-widest uppercase">
                  {getSafeText(terAd.tag, language) || 'SPONSORISÉ'}
                </span>
                <a href={terAd.targetUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center">
                  {terAd.imageUrl ? (
                    <img src={terAd.imageUrl} alt="" className="w-8 h-8 object-cover shrink-0 rounded border border-blue-800/20" />
                  ) : (
                    <Zap className="text-amber-500 shrink-0" size={18} />
                  )}
                  <div>
                    <h4 className="font-extrabold text-xs text-[#E85D42] uppercase tracking-widest" style={{ color: currentSettings.accentColor }}>
                      {getSafeText(terAd.name, language)}
                    </h4>
                    <p 
                      className="text-[10px] dark:text-zinc-200 font-semibold leading-relaxed mt-0.5"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {typeof terAd.description === 'object'
                        ? ((terAd.description as any)[language] || (terAd.description as any).fr || (terAd.description as any).en || '')
                        : (terAd.description || '')}
                    </p>
                  </div>
                </a>
              </div>
            );
          })()}

          {/* Lateral Box 3: Sahelian Wisdom / Proverb */}
          <div className="glass p-5 border-t-4 border-t-[#E85D42] bg-white/95 dark:bg-zinc-900/80 text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#E85D42] flex items-center gap-1">
              <Quote size={10} /> {language === 'fr' ? 'SAGESSE DU JOUR' : 'DAILY WISDOM'}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#E85D42] mb-4 mt-1">
              {language === 'fr' ? 'Maximes Wolof & Sahel' : 'Sahelian Maxims'}
            </h2>
            <div className="bg-amber-500/5 dark:bg-amber-500/10 p-4 border border-amber-500/15 rounded-none font-sans">
              <span className="text-lg text-[#E85D42] font-black">“</span>
              <p 
                className="text-sm font-black leading-relaxed italic dark:text-zinc-100"
                style={{ color: theme === 'dark' ? undefined : '#000000' }}
              >
                {currentSettings.dailyWisdom?.wolof || (language === 'fr' ? "Cést le Lisan Al Gaïb" : "The steady footstep walks the path with honor.")}
              </p>
              <div className="text-[8px] text-[#E85D42] font-black tracking-widest uppercase mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {language === 'fr' 
                  ? (currentSettings.dailyWisdom?.sourceFr || 'EXP: PROVERBE WOLOF') 
                  : (currentSettings.dailyWisdom?.sourceEn || 'EXP: WOLOF PROVERB')}
              </div>
              <p 
                className="text-xs font-medium leading-relaxed mt-1 font-sans dark:text-zinc-300"
                style={{ color: theme === 'dark' ? undefined : '#000000' }}
              >
                {language === 'fr' 
                  ? (currentSettings.dailyWisdom?.translationFr || "Ceux qui avancent avec sagesse et vérité ne craignent point l'obscurité.") 
                  : (currentSettings.dailyWisdom?.translationEn || "Those who walk in integrity and light never fear the shadow.")}
              </p>
            </div>
          </div>

          {/* Briefings / Dossiers Box (Adapted to Actualités design) */}
          <div className="glass p-5 bg-white/95 dark:bg-zinc-900/80 border-t-4 border-t-[#E85D42] text-left" style={{ borderTopColor: currentSettings.accentColor }}>
            <div className="flex items-center justify-between mb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
              <div className="flex items-center gap-1.5">
                <FolderKanban size={14} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
                <span className="text-xs font-serif font-black uppercase tracking-widest text-[#E85D42]">
                  {language === 'fr' ? 'DOSSIERS & ENQUÊTES' : 'DOSSIERS & INVESTIGATIONS'}
                </span>
              </div>
              <Link to="/category/dossiers" className="text-[9px] font-mono font-black uppercase tracking-widest text-[#E85D42] hover:underline">
                {language === 'fr' ? 'VOIR TOUT →' : 'SEE ALL →'}
              </Link>
            </div>

            <div className="space-y-3 font-sans">
              {dossierItems.map((dossier, idx) => (
                <div 
                  key={dossier.id}
                  onClick={() => setSelectedDossierModal(dossier)}
                  className="group flex gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/30 last:border-0 last:pb-0 cursor-pointer"
                >
                  <span className="text-sm font-mono font-black text-[#E85D42] shrink-0" style={{ color: currentSettings.accentColor }}>
                    0{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[8px] font-mono font-black uppercase tracking-widest text-[#E85D42]">
                        {getSafeText(dossier.tag, language)}
                      </span>
                      <span className="text-[8px] font-mono text-zinc-500 font-bold">
                        {dossier.readTime}
                      </span>
                    </div>
                    <h4 
                      className="font-black text-xs leading-tight dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors line-clamp-2"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {language === 'fr' ? dossier.titleFr : dossier.titleEn}
                    </h4>
                    <p 
                      className="text-[10px] font-medium leading-relaxed line-clamp-1 mt-0.5 dark:text-zinc-400"
                      style={{ color: theme === 'dark' ? undefined : '#000000' }}
                    >
                      {language === 'fr' ? dossier.descFr : dossier.descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* L'Arène (Sports & Lamb) Sidebar Widget */}
          <div className="glass p-5 bg-white/95 dark:bg-zinc-900/80 border-t-4 border-t-[#E85D42] text-left" style={{ borderTopColor: currentSettings.accentColor }}>
            <div className="flex items-center justify-between mb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
              <div className="flex items-center gap-1.5">
                <Trophy size={14} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
                <span className="text-xs font-serif font-black uppercase tracking-widest text-[#E85D42]">
                  {language === 'fr' ? "L'ARÈNE - SPORTS & COMBATS" : "THE ARENA - SPORTS & FIGHTS"}
                </span>
              </div>
              <Link to="/larene" className="text-[9px] font-mono font-black uppercase tracking-widest text-[#E85D42] hover:underline">
                {language === 'fr' ? "ENTRER →" : "ENTER →"}
              </Link>
            </div>

            <div className="space-y-3 font-sans">
              {arenaArticles.length > 0 ? (
                arenaArticles.slice(0, 3).map((art, idx) => (
                  <Link
                    key={`${art.id}-${idx}`}
                    to={`/article/${art.slug || art.id}`}
                    className="group flex gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/30 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-mono font-black text-[#E85D42] shrink-0" style={{ color: currentSettings.accentColor }}>
                      0{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-mono font-black uppercase tracking-widest text-[#E85D42] block mb-0.5">
                        L'ARÈNE
                      </span>
                      <h4 className="font-black text-xs leading-tight dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors line-clamp-2">
                        {art.title?.[language] || art.title?.fr}
                      </h4>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="space-y-2.5">
                  <Link to="/larene" className="group block p-2.5 bg-zinc-50/80 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-[#E85D42] transition-all">
                    <div className="flex justify-between items-center text-[8px] font-mono font-bold text-[#E85D42] uppercase tracking-wider mb-1">
                      <span>ARÈNE NATIONALE • PIKINE</span>
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black">DIRECT</span>
                    </div>
                    <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors">
                      {language === 'fr' ? 'Grand Combat de Lutte avec Frappe : Modou Lô vs Siteu' : 'Grand Lamb Championship Match: Modou Lô vs Siteu'}
                    </h4>
                  </Link>
                  <Link to="/larene" className="group block p-2.5 bg-zinc-50/80 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-[#E85D42] transition-all">
                    <div className="flex justify-between items-center text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      <span>LIGUE 1 SÉNÉGAL</span>
                      <span>18:00 DKR</span>
                    </div>
                    <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors">
                      {language === 'fr' ? 'Jaraaf de Dakar vs Teungueth FC : Choc au Sommet' : 'Jaraaf Dakar vs Teungueth FC: Top Table Clash'}
                    </h4>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Announcements / Annonces Sidebar Widget */}
          <div className="glass p-5 bg-white/95 dark:bg-zinc-900/80 border-t-4 border-t-[#E85D42] text-left mt-6" style={{ borderTopColor: currentSettings.accentColor }}>
            <div className="flex items-center justify-between mb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
              <div className="flex items-center gap-1.5">
                <Megaphone size={14} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
                <span className="text-xs font-serif font-black uppercase tracking-widest text-[#E85D42]">
                  {language === 'fr' ? 'ANNONCES' : 'ANNOUNCEMENTS'}
                </span>
              </div>
            </div>

            <div className="space-y-4 font-sans">
              {(currentSettings.announcements && currentSettings.announcements.length > 0 ? currentSettings.announcements : [
                { id: 'ann-1', titleFr: 'Ouverture du Sommet Économique de Dakar', titleEn: 'Dakar Economic Summit Opening', textFr: 'Retrouvez notre édition spéciale en direct.', textEn: 'Follow our special live coverage.', imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60', link: '#' }
              ]).map((ann: any) => (
                <div key={ann.id} className="group flex flex-col gap-2 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/30 last:border-0 last:pb-0">
                  {ann.imageUrl && ann.imageUrl.trim() !== '' && (
                    <div className="w-full h-36 bg-cover bg-center rounded-xs overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      <img src={ann.imageUrl} alt={language === 'fr' ? ann.titleFr : ann.titleEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-black text-xs leading-tight dark:text-zinc-100 group-hover:text-[#E85D42] transition-colors mb-1">
                      {language === 'fr' ? ann.titleFr : ann.titleEn}
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      {language === 'fr' ? ann.textFr : ann.textEn}
                    </p>
                  </div>
                  {ann.link && ann.link !== '#' && (
                    <a href={ann.link} className="text-[9px] font-mono font-black uppercase tracking-widest text-[#E85D42] hover:underline" style={{ color: currentSettings.accentColor }}>
                      {language === 'fr' ? 'EN SAVOIR PLUS →' : 'LEARN MORE →'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Ad Space Right Offset (Far-right Ad Panel - Matching Far-Left Dimensions) */}
        {hasRightAd && (
          <div className="hidden lg:block lg:col-span-2 relative">
             <div className="sticky top-20 flex flex-col gap-6 items-center">
               {farRightAd ? (
                 <div 
                   key={farRightAd.id} 
                   className="w-full border border-brand-border dark:border-zinc-800 bg-brand-white dark:bg-zinc-900 p-3 flex flex-col items-center justify-center text-center shadow-sm relative group overflow-hidden"
                 >
                    <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2 block">
                      {language === 'fr' ? 'SPONSOR DROITE' : 'RIGHT SPONSOR'}
                    </span>
                    {farRightAd.imageUrl && farRightAd.imageUrl.trim() !== '' ? (
                      <a href={farRightAd.targetUrl || '#'} target="_blank" rel="noreferrer" className="block w-full">
                         <img src={farRightAd.imageUrl} alt="Advertisement" className="w-full h-auto object-contain max-h-[850px] rounded-xs group-hover:opacity-90 transition-opacity" />
                      </a>
                    ) : (
                      <div className="w-full h-40 flex flex-col items-center justify-center p-4 bg-brand-soft/30 dark:bg-zinc-800/40 border border-dashed border-zinc-300 dark:border-zinc-700">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 text-center">{farRightAd.name || t.adSpace}</span>
                      </div>
                    )}
                 </div>
               ) : sidebarAds.length > 0 ? (
                 sidebarAds.map(ad => (
                   <div 
                     key={ad.id} 
                     className="w-full border border-brand-border dark:border-zinc-800 bg-brand-white dark:bg-zinc-900 p-3 flex flex-col items-center justify-center text-center shadow-sm relative group"
                   >
                      <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2 block">{t.adLabel}</span>
                      <a href={ad.targetUrl || '#'} target="_blank" rel="noopener noreferrer" className="block w-full">
                         <img src={ad.imageUrl} alt="Advertisement" className="w-full h-auto object-contain max-h-[600px] border border-brand-border/10 dark:border-zinc-800/40 group-hover:opacity-90 transition-opacity" />
                      </a>
                   </div>
                 ))
               ) : null}
             </div>
          </div>
        )}

      </div>

      {/* INTERACTIVE MODAL 1: Newsletter Registration Confirmation */}
      {showNewsletterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border-2 border-[#E85D42] p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left space-y-4 font-sans">
            <button 
              onClick={() => setShowNewsletterModal(false)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#E85D42]">
                  {language === 'fr' ? 'CONFIRMATION D\'INSCRIPTION' : 'SUBSCRIPTION CONFIRMED'}
                </span>
                <h3 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                  {language === 'fr' ? 'Bienvenue dans le Brief !' : 'Welcome to the Brief!'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold leading-relaxed border-t border-b border-zinc-200 dark:border-zinc-800 py-3">
              {language === 'fr' 
                ? `L'adresse ${subscribedEmail} a été enregistrée avec succès. Vous recevrez désormais notre édition matinale The Perspective Brief.`
                : `The email address ${subscribedEmail} has been successfully registered. You will now receive our morning Perspective Brief.`}
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                {language === 'fr' ? 'Préférences d\'Envoi :' : 'Delivery Preferences:'}
              </label>
              <div className="space-y-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#E85D42]" />
                  <span>{language === 'fr' ? 'Synthèse Matinale Quotidienne (07:00 GMT)' : 'Daily Morning Brief (07:00 GMT)'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#E85D42]" />
                  <span>{language === 'fr' ? 'Alertes de Dernière Minute & Flashes' : 'Breaking News & Flash Alerts'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#E85D42]" />
                  <span>{language === 'fr' ? 'Dossiers Confidentiels Hebdomadaires' : 'Weekly Confidential Dossiers'}</span>
                </label>
              </div>
            </div>

            <button 
              onClick={() => setShowNewsletterModal(false)}
              className="w-full bg-[#E85D42] text-white font-black uppercase tracking-widest text-xs py-2.5 hover:opacity-90 transition-all cursor-pointer mt-2"
              style={{ backgroundColor: currentSettings.accentColor }}
            >
              {language === 'fr' ? 'Valider mes Préférences' : 'Confirm Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* INTERACTIVE MODAL 2: Dossier Detail Summary */}
      {selectedDossierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border-2 border-[#E85D42] p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative text-left space-y-4 max-h-[90vh] overflow-y-auto font-sans">
            <button 
              onClick={() => setSelectedDossierModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2">
              <FolderKanban size={18} className="text-[#E85D42]" style={{ color: currentSettings.accentColor }} />
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#E85D42]">
                {getSafeText(selectedDossierModal.tag, language)}
              </span>
            </div>

            <h2 className="text-xl font-serif font-black text-zinc-900 dark:text-white leading-tight">
              {language === 'fr' ? selectedDossierModal.titleFr : selectedDossierModal.titleEn}
            </h2>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-l-4 border-[#E85D42] space-y-2" style={{ borderLeftColor: currentSettings.accentColor }}>
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                {language === 'fr' ? 'SYNTHÈSE EXÉCUTIVE :' : 'EXECUTIVE SUMMARY:'}
              </h4>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                {language === 'fr' ? selectedDossierModal.fullTextFr : selectedDossierModal.fullTextEn}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
              <div className="p-3 bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                  {language === 'fr' ? 'POINT CLÉ #1' : 'KEY FINDING #1'}
                </span>
                <p className="font-bold text-zinc-900 dark:text-zinc-100">
                  {language === 'fr' ? selectedDossierModal.key1Fr : selectedDossierModal.key1En}
                </p>
              </div>
              <div className="p-3 bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                  {language === 'fr' ? 'POINT CLÉ #2' : 'KEY FINDING #2'}
                </span>
                <p className="font-bold text-zinc-900 dark:text-zinc-100">
                  {language === 'fr' ? selectedDossierModal.key2Fr : selectedDossierModal.key2En}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Link 
                to="/category/dossiers" 
                onClick={() => setSelectedDossierModal(null)}
                className="flex-1 bg-[#E85D42] text-white font-black uppercase tracking-widest text-xs py-2.5 px-4 text-center hover:opacity-90 transition-all"
                style={{ backgroundColor: currentSettings.accentColor }}
              >
                {language === 'fr' ? 'CONSULTER LES ARTICLES DU DOSSIER' : 'EXPLORE DOSSIER ARTICLES'}
              </Link>
              <button 
                onClick={() => alert(language === 'fr' ? 'Téléchargement de la synthèse PDF lancé.' : 'Downloading PDF synthesis report.')}
                className="flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-black uppercase tracking-widest text-xs py-2.5 px-4 transition-all cursor-pointer"
              >
                <FileText size={14} />
                {language === 'fr' ? 'RAPPORT PDF (SYNTHÈSE)' : 'PDF REPORT SUMMARY'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

