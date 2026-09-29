import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Article } from '../types';
import { calculateReadingTime, formatRelativeDate, getSafeText, formatCategory } from '../lib/utils';
import { motion } from 'motion/react';
import { SlidersHorizontal, Filter, Bookmark, Coffee, Zap, Quote, TrendingUp, Hash, Globe, Mail, Send, FolderKanban, FileText, X, CheckCircle, Trophy, Megaphone } from 'lucide-react';
import { SportsSlider } from '../components/SportsSlider';
import { SportsQuadrant } from '../components/SportsQuadrant';
import { ArenaSidebarLive } from '../components/arena/ArenaSidebarLive';
import { useSEO } from '../hooks/useSEO';
import { getSafeImageUrl, DEFAULT_FALLBACK_IMAGE } from '../lib/imageUtils';
import { visibleAds, isAdPubliclyVisible } from '../lib/adCampaign';
import { resolveCuratedRow } from '../lib/curatedRows';
import { NewsletterInline } from '../components/NewsletterSignup';
import { NowBar } from '../components/home/NowBar';
import { SocietyPeopleSection } from '../components/home/SocietyPeopleSection';
import { DossiersSection } from '../components/home/DossiersSection';
import { SportsArenaSection } from '../components/home/SportsArenaSection';
import { UtilitySection } from '../components/home/UtilitySection';

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
        className="w-full max-w-full flex-shrink-0 group relative overflow-hidden flex flex-row h-[16rem] sm:h-[18rem] md:h-[19rem] cursor-pointer square-card bg-white dark:bg-zinc-900 border border-brand-border dark:border-zinc-800" 
        onClick={() => { navigate(`/article/${article.slug || article.id}`); }}
      >
        {/* Left Side: Image */}
        <div className="w-1/2 sm:w-[52%] md:w-[55%] h-full shrink-0 relative overflow-hidden bg-brand-black">
           <div 
              className="w-full h-full bg-cover bg-center opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-transform duration-700"
              style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
           />
           <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent opacity-80 pointer-events-none" />
           <div className="absolute top-3 left-3 bg-brand-primary text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 shadow-md z-10">
              {formatCategory(article.category, language)}
           </div>
        </div>

        {/* Right Side: Title & Content */}
        <div className="w-1/2 sm:w-[48%] md:w-[45%] h-full shrink-0 flex flex-col justify-between p-3.5 sm:p-5 md:p-6 lg:p-7 z-10 relative bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 overflow-hidden">
           <div className="flex-1 min-w-0 flex flex-col justify-center">
             <h3 className="relative text-brand-dark dark:text-zinc-100 font-black text-xs sm:text-base md:text-xl lg:text-2xl leading-tight mb-1.5 sm:mb-2 group-hover:text-brand-primary transition-colors line-clamp-2 md:line-clamp-3">
               {getSafeText(article.title, language) || 'Sans titre'}
             </h3>
             <p className="relative text-brand-muted dark:text-zinc-400 font-medium text-[10px] sm:text-xs md:text-sm line-clamp-2 sm:line-clamp-3 mb-2 leading-relaxed">
               {getSafeText(article.excerpt, language) || ''}
             </p>
           </div>
           <div className="mt-auto flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-2.5 relative">
              <span className="text-[9px] sm:text-[10px] font-bold text-brand-muted dark:text-zinc-400 uppercase tracking-wider truncate mr-1">
                {article.author} • {formatRelativeDate(article.date, language)}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSavedArticle(article.id);
                }}
                className={`p-2 -mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-brand-dark dark:text-zinc-300 hover:text-brand-primary transition-all shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center ${isSaved ? 'text-brand-primary dark:text-brand-primary' : ''}`}
                title={isSaved ? "Article sauvegardé" : "Sauvegarder l'article"}
                aria-label="Save article"
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
            className={`p-2 -mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-brand-dark dark:text-zinc-300 hover:text-brand-primary transition-all shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center ${isSaved ? 'text-brand-primary dark:text-brand-primary' : ''}`}
            title={isSaved ? "Article sauvegardé" : "Sauvegarder l'article"}
            aria-label="Save article"
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
  if ((articles ?? []).length === 0) return null;
  
  // Show first 8 articles in a grid
  const mainGrid = (articles ?? []).slice(0, 8);
  // Show rest in a horizontal mini-carousel
  const subCarousel = (articles ?? []).slice(8, 14);

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
    if ((articles ?? []).length <= 1) return;
    const timer = setInterval(() => {
      setActiveHero(prev => {
        const next = (prev + 1) % (articles ?? []).length;
        scrollTo(next);
        return next;
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [(articles ?? []).length]);

  if ((articles ?? []).length === 0) return null;

  return (
        <section className="block mb-8 relative group overflow-hidden bg-white dark:bg-zinc-900 shadow-sm border border-brand-border dark:border-zinc-800" >
          {/* Navigation Arrows */}
          <button 
             onClick={(e) => { e.stopPropagation(); scrollTo(activeHero === 0 ? (articles ?? []).length - 1 : activeHero - 1); }} 
             className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 bg-black/40 hover:bg-black/70 text-white flex justify-center items-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-xs border border-white/20 rounded-none shadow-md cursor-pointer"
             aria-label="Previous slide"
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button 
             onClick={(e) => { e.stopPropagation(); scrollTo((activeHero + 1) % (articles ?? []).length); }} 
             className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 bg-black/40 hover:bg-black/70 text-white flex justify-center items-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-xs border border-white/20 rounded-none shadow-md cursor-pointer"
             aria-label="Next slide"
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><path d="m9 18 6-6-6-6"/></svg>
          </button>

          {/* Indication Dots */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 backdrop-blur-xs border border-white/20 shadow-md">
             {(articles ?? []).map((_, idx) => (
                <button 
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollTo(idx);
                  }}
                  className={`h-1.5 transition-all duration-300 cursor-pointer ${idx === activeHero ? 'w-6 bg-[#E85D42]' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
             ))}
          </div>

          <div 
             ref={containerRef}
             onScroll={handleScroll}
             className="flex w-full max-w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
          >
             {(articles ?? []).map((article, idx) => (
                <div 
                  key={`${article.id}-${idx}`} 
                  className="w-full min-w-full max-w-full shrink-0 flex-shrink-0 snap-start" 
                  style={{ width: '100%', minWidth: '100%', maxWidth: '100%', scrollSnapAlign: 'start' }}
                >
                  <ArticleCard article={article} large />
                </div>
             ))}
          </div>
        </section>
  );
}

export function HomePage() {
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');
  
  const rawArticles = useStore((s) => s.articles);
  const articles = (Array.isArray(rawArticles) ? rawArticles : [])
    .filter(a => a && a.isPublished !== false && (a as any).status !== 'draft')
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

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    addSubscriber(newsletterEmail);
    setSubscribedEmail(newsletterEmail);
    setShowNewsletterModal(true);
    setNewsletterEmail('');
  };
  
  useSEO({
    title: language === 'fr' 
      ? 'SenPerspective — Actualités du Sénégal, analyses et décryptages' 
      : 'SenPerspective — Senegal News, In-Depth Analysis & Decryptions',
    description: language === 'fr' 
      ? "Grand journal d’information, de décryptage et d’analyse basé à Dakar : Politique, Économie, Société, Tech, Culture, Sports, Santé et International au Sénégal." 
      : "Major independent news, analysis, and investigation journal based in Dakar covering Politics, Economics, Tech, Culture, Sports, Health, and World news in Senegal.",
    canonical: "https://senperspective.com/",
    type: 'website'
  });

  // Editor/seeded matches (the Senegalese competitions: Lutte, Navétanes, D1,
  // BAL). These are passed to the sidebar so editorial rows always outrank
  // provider rows, and so the newsroom keeps control of the local fixtures.
  const arenaMatches = useStore((s) => s.matches) || [];

  const currentSettings: any = useStore((s) => s.siteSettings) || {
    siteName: 'Perspective',
    accentColor: '#E85D42',
    trendingCount: 4,
    mostReadCount: 5,
    analystDispatches: [],
    coastAndHarbor: {},
    dailyWisdom: {}
  };
  
  // Head carousel: 10 lead stories (featured first, then the most recent to fill)
  const HERO_CAROUSEL_SIZE = 10;
  let featuredArticles = (articles ?? []).filter(a => a.isFeatured).slice(0, HERO_CAROUSEL_SIZE);
  if (featuredArticles.length < HERO_CAROUSEL_SIZE) {
    const existingIds = new Set(featuredArticles.map(a => a.id));
    const additional = (articles ?? []).filter(a => !existingIds.has(a.id)).slice(0, HERO_CAROUSEL_SIZE - featuredArticles.length);
    featuredArticles = [...featuredArticles, ...additional];
  }
  const flashArticles = (articles ?? []).filter(a => a.category === 'Flash Info' || a.category === 'Flash' || (a as any).type === 'flash');
  const arenaArticles = (articles ?? []).filter(a => a.category === 'Sports' || a.category?.toLowerCase().includes('sport') || a.category?.toLowerCase().includes('arène'));

  const largeSet = [...articles, ...articles, ...articles]; // Mock more articles for layout
  const allMixedSet = [...largeSet].sort(() => Math.random() - 0.5);

  // Campaign-aware filtering. `visibleAds` replaces the old `a.active` test so
  // paused, expired and not-yet-started campaigns are hidden while legacy ads
  // with only `active: true` keep showing exactly as before.
  const visibleCampaignAds = visibleAds(ads);

  const sidebarAds = visibleCampaignAds.filter(a => a.position === 'sidebar' && a.imageUrl && a.imageUrl.trim() !== '');
  const activeBetweenAds = visibleCampaignAds.filter(a => a.position === 'homepage-between');

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

  const farLeftAd = visibleCampaignAds.find(a => a.position === 'far-left');
  const farRightAd = visibleCampaignAds.find(a => a.position === 'far-right');
  const hasLeftAd = !!farLeftAd;
  const hasRightAd = !!(farRightAd || (sidebarAds && sidebarAds.length > 0));

  const mainColSpan = hasLeftAd && hasRightAd 
    ? 'lg:col-span-10' 
    : hasLeftAd || hasRightAd 
    ? 'lg:col-span-11' 
    : 'lg:col-span-12';

  return (
    <main id="main-content" className="max-w-[1280px] mx-auto px-4 py-4 md:py-6">
      {/* Primary Accessible Title for Document Outline & SEO */}
      <h1 className="sr-only">
        {language === 'fr' 
          ? 'SenPerspective — Grand journal d’information, de décryptage et d’analyse au Sénégal' 
          : 'SenPerspective — Independent journal of news, analysis and investigations in Senegal'}
      </h1>

      {/* LEVEL 1: WHAT IS HAPPENING NOW */}
      <NowBar 
        flashArticles={flashArticles} 
        analystDispatches={currentSettings.analystDispatches} 
        articles={articles}
      />

      {/* LEVEL 2: THE MAIN STORIES */}
      <section id="section-main-stories" aria-labelledby="heading-main-stories" className="mb-12">
        <h2 id="heading-main-stories" className="sr-only">
          {language === 'fr' ? 'Les Grands Titres' : 'Main Stories'}
        </h2>

        {/* Big Carousel of HotTopics (Lead Stories) */}
        <HeroCarousel articles={featuredArticles} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        
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
              .slice(0, 14) // main feed scale
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
              {(() => {
                const curatedIds: string[] = currentSettings.curatedTrendingArticleIds || [];
                const curatedList = curatedIds
                  .map(id => (articles ?? []).find(a => a.id === id || a.slug === id))
                  .filter((a): a is any => Boolean(a));
                const listToRender = curatedList.length > 0
                  ? curatedList
                  : (articles ?? []).slice(1, (currentSettings.trendingCount || 4));

                return listToRender.map((article, idx) => (
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
                ));
              })()}
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
              {(() => {
                const curatedIds: string[] = currentSettings.curatedLatestNewsArticleIds || [];
                const curatedList = curatedIds
                  .map(id => (articles ?? []).find(a => a.id === id || a.slug === id))
                  .filter((a): a is any => Boolean(a));
                const listToRender = curatedList.length > 0
                  ? curatedList
                  : [...articles].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

                return listToRender.map((article, i) => (
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
                ));
              })()}
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
                currentSettings.leMondeDispatches.slice(0, 5).map((item: any, idx: number) => {
                  // Briefs may point at an existing article. The title/excerpt
                  // then follow that article, and the row links to the story.
                  const row = resolveCuratedRow(item, articles, language, { kind: 'brief' });
                  const inner = (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono tracking-wider font-extrabold text-[#E85D42]">
                          {row.tag}
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
                        {row.text}
                      </p>
                      {row.excerpt && (
                        <p 
                          className="text-[10px] font-medium line-clamp-1 mt-0.5 dark:text-zinc-300"
                          style={{ color: theme === 'dark' ? undefined : '#000000' }}
                        >
                          {row.excerpt}
                        </p>
                      )}
                    </>
                  );
                  const cls =
                    'block border-l-2 border-[#E85D42] pl-3 py-1 bg-zinc-50/50 dark:bg-zinc-950/30 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/20 transition-colors group';
                  const style = { borderLeftColor: currentSettings.accentColor };
                  return row.url ? (
                    <Link key={`${item.id}-${idx}`} to={row.url} className={cls} style={style}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={`${item.id}-${idx}`} className={cls} style={style}>
                      {inner}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500 italic">No updates</p>
              )}
            </div>
          </div>

          {/* Ad Banner 1 (Café Dakar Touba - Dynamic Ad) */}
          {(() => {
            // The id fallback is retained so the existing seeded banners keep
            // rendering, but the campaign gate is applied either way.
            const cafeAd = ads?.find(a =>
              isAdPubliclyVisible(a) && (a.position === 'sidebar-cafe' || a.id === 'ad-cafe-touba')
            );
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

          {/* Ad Banner 2 (TER - Trans-Dakar - Dynamic Ad) */}
          {(() => {
            const terAd = ads?.find(a =>
              isAdPubliclyVisible(a) && (a.position === 'sidebar-ter' || a.id === 'ad-ter-trans-dakar')
            );
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

          {/* L'Arène Sidebar Widget — LIVE verified scores.
              Replaces the previous hardcoded box, which rendered invented
              fixtures ("Modou Lô vs Siteu", "Jaraaf vs Teungueth") that could
              never reflect a real result. */}
          <ArenaSidebarLive
            editorialMatches={arenaMatches}
            language={language === 'en' ? 'en' : 'fr'}
            accentColor={currentSettings.accentColor}
          />

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

          {/* NEWSLETTER CTA — last item in the sidebar.
              Placed at the bottom deliberately: a reader has scrolled past the
              trending list, the wisdom quote, live scores and the announcements
              by this point, so the ask arrives once the page has earned some
              attention instead of competing with the news at the top. */}
          <NewsletterInline className="mt-6" />

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
      </section>

      {/*
        SECTION: DÉCRYPTAGES — removed.

        This block duplicated coverage the homepage already has. Decryptages were
        also being pulled into the Dossiers section below (its filter matches the
        "décryptage" category), so the same articles could appear twice on one
        page. The /category/decryptages page is untouched and still lists them.
      */}

      {/* SECTION: SOCIÉTÉ & PEOPLE */}
      <SocietyPeopleSection articles={articles} />

      {/* SECTION: GRANDS DOSSIERS */}
      <DossiersSection />

      {/* SECTION: L'ARÈNE (SPORTS) */}
      <SportsArenaSection articles={articles} />

      {/* SECTION: MÉTÉO MARITIME */}
      <UtilitySection />
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

    </main>
  );
}


