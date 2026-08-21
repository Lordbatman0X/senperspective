import React from 'react';
import { Article } from '../../types';
import { useStore, CommentItem, SubscriberItem } from '../../store';
import { getSafeText } from '../../lib/utils';
import { FileText, Users, MessageSquare, TrendingUp, CheckSquare, Plus, ArrowUpRight, BarChart2, Activity, Eye, Bookmark } from 'lucide-react';

interface DashboardOverviewProps {
  articles: Article[];
  comments: CommentItem[];
  subscribers: SubscriberItem[];
  onNewArticle: () => void;
  onGoToTab: (tab: any) => void;
}

export function DashboardOverview({
  articles,
  comments,
  subscribers,
  onNewArticle,
  onGoToTab,
}: DashboardOverviewProps) {
  const language = useStore(s => s.language);
  const interactions = useStore(s => s.interactions) || [];
  const registeredProfiles = useStore(s => (s as any).registeredProfiles) || [];
  const currentSettings = useStore(s => s.siteSettings);

  const pendingComments = comments.filter(c => !c.isApproved);
  const liveArticles = articles.filter(a => a.isPublished);
  const drafts = articles.filter(a => !a.isPublished);

  // Analyze articles by category for our visual indicator bars
  const categories = ['Politique', 'Économie', 'Société', 'International', 'Tech', 'Sports', 'Gouvernance'];
  const categoryStats = categories.map(cat => {
    const count = articles.filter(a => a.category === cat).length;
    const percentage = articles.length > 0 ? (count / articles.length) * 100 : 0;
    return { name: cat, count, percentage };
  }).filter(c => c.count > 0 || c.name === 'Politique' || c.name === 'Économie' || c.name === 'Société');

  // Real interaction metrics
  const totalReads = interactions.filter(i => i.type === 'read').length;
  const totalLikes = interactions.filter(i => i.type === 'like_article' || i.type === 'like_comment').length;
  const totalShares = interactions.filter(i => i.type === 'share_abdel').length;

  const t = {
    title: language === 'fr' ? 'Tableau de bord' : 'Dashboard Overview',
    headerDesc: language === 'fr' ? 'Aperçu synthétique et gestion globale du journal Perspective' : 'Real-time analytics and publication management dashboard',
    writeBtn: language === 'fr' ? 'Rédiger un article' : 'Write new article',
    liveArts: language === 'fr' ? 'Articles publiés' : 'Published Articles',
    totalFractions: language === 'fr' ? 'sur  total' : ' /  total',
    manageFiles: language === 'fr' ? 'Gérer les articles' : 'Manage articles',
    draftSandbox: language === 'fr' ? 'Brouillons' : 'Drafts',
    reviewDrafts: language === 'fr' ? 'Voir les brouillons' : 'Review drafts',
    activeSubs: language === 'fr' ? 'Abonnés newsletter' : 'Newsletter Subscribers',
    launchNewsletter: language === 'fr' ? 'Gérer la newsletter' : 'Manage newsletter',
    pendingComs: language === 'fr' ? 'Commentaires en attente' : 'Pending Comments',
    moderateNow: language === 'fr' ? 'Modérer' : 'Moderate now',
    coverDist: language === 'fr' ? 'Répartition des articles par catégorie' : 'Articles by Category',
    deviceAnalytics: language === 'fr' ? 'Système & Hébergement' : 'System & Infrastructure',
    engagementActivity: language === 'fr' ? 'Activité & Engagement en direct' : 'Live Engagement & Activity',
    latestSubs: language === 'fr' ? 'Derniers abonnés' : 'Latest Subscribers',
    noSubs: language === 'fr' ? 'Aucun abonné pour le moment.' : 'No subscribers yet.',
    noComsApproval: language === 'fr' ? '✓ Aucun commentaire en attente.' : '✓ No comments waiting approval.',
    recentInteractions: language === 'fr' ? 'Interactions récentes de l\'audience' : 'Recent Audience Interactions'
  };

  const purgeDatabaseAndArticles = useStore(s => s.purgeDatabaseAndArticles);
  const seedSampleArticles = useStore(s => s.seedSampleArticles);
  const [showPurgeConfirm, setShowPurgeConfirm] = React.useState(false);

  const handlePurge = async () => {
    await purgeDatabaseAndArticles();
    setShowPurgeConfirm(false);
  };

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900 text-white p-6 md:p-8 border-l-8 border-[#E85D42] shadow-sm gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight mb-1 text-white">{t.title}</h2>
          <p className="text-xs text-zinc-300 font-mono">{t.headerDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {articles.length === 0 ? (
            <button
              onClick={seedSampleArticles}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md rounded-xs"
            >
              {language === 'fr' ? '🌱 Charger Articles Démo' : '🌱 Seed Sample Articles'}
            </button>
          ) : null}

          <button
            onClick={() => onGoToTab('admin_dashboard')}
            className="flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm rounded-xs"
            title={language === 'fr' ? 'Gérer et purger les collections de la base de données' : 'Manage and wipe database collections'}
          >
            <Activity size={14} className="text-red-400" />
            {language === 'fr' ? 'Gestion Base de Données' : 'Database Manager'}
          </button>

          <button
            onClick={onNewArticle}
            className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md rounded-xs"
          >
            <Plus size={16} /> {t.writeBtn}
          </button>
        </div>
      </div>

      {/* Main Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => onGoToTab('list')}
          className="p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 hover:border-[#E85D42] transition-all cursor-pointer shadow-xl rounded-lg group"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="p-3 bg-blue-950/80 text-blue-400 font-bold border border-blue-800/40 rounded-md">
              <FileText size={20} />
            </span>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 font-mono uppercase rounded-xs">
              EN LIGNE
            </span>
          </div>
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">{t.liveArts}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{liveArticles.length}</span>
            <span className="text-xs text-zinc-400 font-mono">/ {articles.length} total</span>
          </div>
          <p className="text-xs text-zinc-400 mt-4 flex items-center gap-1 group-hover:text-[#E85D42] font-semibold transition-colors">
            {t.manageFiles} <ArrowUpRight size={14} />
          </p>
        </div>

        <div 
          onClick={() => onGoToTab('list')}
          className="p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 hover:border-zinc-500 transition-all cursor-pointer shadow-xl rounded-lg group"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="p-3 bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 rounded-md">
              <CheckSquare size={20} />
            </span>
          </div>
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">{t.draftSandbox}</p>
          <span className="text-3xl font-black text-white">{drafts.length}</span>
          <p className="text-xs text-zinc-400 mt-4 flex items-center gap-1 group-hover:text-white font-semibold transition-colors">
            {t.reviewDrafts} <ArrowUpRight size={14} />
          </p>
        </div>

        <div 
          onClick={() => onGoToTab('subscribers')}
          className="p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 hover:border-[#E85D42] transition-all cursor-pointer shadow-xl rounded-lg group"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="p-3 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded-md">
              <Users size={20} />
            </span>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 font-mono rounded-xs">
              +{subscribers.length > 0 ? subscribers.length : 0}
            </span>
          </div>
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">{t.activeSubs}</p>
          <span className="text-3xl font-black text-white">{subscribers.length}</span>
          <p className="text-xs text-zinc-400 mt-4 flex items-center gap-1 group-hover:text-[#E85D42] font-semibold transition-colors">
            {t.launchNewsletter} <ArrowUpRight size={14} />
          </p>
        </div>

        <div 
          onClick={() => onGoToTab('comments')}
          className="p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 hover:border-red-500 transition-all cursor-pointer shadow-xl rounded-lg group"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="p-3 bg-red-950/80 text-red-400 border border-red-800/40 rounded-md">
              <MessageSquare size={20} />
            </span>
            {pendingComments.length > 0 && (
              <span className="h-2.5 w-2.5 bg-red-500 rounded-full animate-ping" />
            )}
          </div>
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">{t.pendingComs}</p>
          <span className="text-3xl font-black text-red-400">{pendingComments.length}</span>
          <p className="text-xs text-zinc-400 mt-4 flex items-center gap-1 group-hover:text-red-400 font-semibold transition-colors">
            {t.moderateNow} <ArrowUpRight size={14} />
          </p>
        </div>
      </div>

      {/* Main Grid: Visual Analytics & Real-Time Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visual Category Distribution & Real Interaction Summary */}
        <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900/80 backdrop-blur-md p-6 shadow-xl rounded-lg space-y-6">
          <h3 className="text-lg font-extrabold uppercase tracking-tight flex items-center gap-2 border-b border-zinc-800 pb-3 text-white">
            <BarChart2 size={20} className="text-[#E85D42]" /> {t.coverDist}
          </h3>
          <div className="space-y-4">
            {categoryStats.map(stat => (
              <div key={stat.name} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-200">{stat.name}</span>
                  <span className="text-zinc-400 font-mono">{stat.count} articles ({Math.round(stat.percentage)}%)</span>
                </div>
                <div className="w-full bg-zinc-950 h-2.5 rounded-xs overflow-hidden border border-zinc-800">
                  <div 
                    className="bg-[#E85D42] h-full transition-all duration-700" 
                    style={{ width: `${Math.max(4, stat.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Real Engagement Traffic Highlights */}
          <div className="pt-6 border-t border-zinc-800">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 mb-3 flex items-center gap-1.5">
              <Activity size={14} className="text-[#E85D42]" /> {language === 'fr' ? 'Volume des interactions enregistrées' : 'Recorded Audience Activity'}
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-zinc-950/80 p-3 border border-zinc-800 rounded-md">
                <p className="text-[10px] text-zinc-400 uppercase font-mono font-bold flex items-center justify-center gap-1">
                  <Eye size={12} /> {language === 'fr' ? 'Lectures' : 'Reads'}
                </p>
                <p className="text-lg font-black text-white mt-1">{totalReads}</p>
              </div>
              <div className="bg-zinc-950/80 p-3 border border-zinc-800 rounded-md">
                <p className="text-[10px] text-zinc-400 uppercase font-mono font-bold flex items-center justify-center gap-1">
                  <Bookmark size={12} /> {language === 'fr' ? 'Mentions J\'aime' : 'Likes'}
                </p>
                <p className="text-lg font-black text-white mt-1">{totalLikes}</p>
              </div>
              <div className="bg-zinc-950/80 p-3 border border-zinc-800 rounded-md">
                <p className="text-[10px] text-zinc-400 uppercase font-mono font-bold flex items-center justify-center gap-1">
                  <Users size={12} /> {language === 'fr' ? 'Partages' : 'Shares'}
                </p>
                <p className="text-lg font-black text-white mt-1">{totalShares}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Engagement Feed */}
        <div className="border border-zinc-800 bg-zinc-900/80 backdrop-blur-md p-6 shadow-xl rounded-lg space-y-6">
          <h3 className="text-lg font-extrabold uppercase tracking-tight flex items-center gap-2 border-b border-zinc-800 pb-3 text-white">
            <TrendingUp size={20} className="text-[#E85D42]" /> {t.engagementActivity}
          </h3>
          
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">{t.latestSubs}</p>
            <div className="space-y-2">
              {subscribers.slice(0, 3).map((sub, i) => (
                <div key={i} className="flex justify-between items-center bg-zinc-950/80 p-2.5 text-xs border border-zinc-800 rounded-md">
                  <span className="font-semibold truncate max-w-[150px] text-zinc-100">{sub.email}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{sub.date}</span>
                </div>
              ))}
              {subscribers.length === 0 && (
                <p className="text-xs text-zinc-500 italic">{t.noSubs}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">{t.pendingComs}</p>
            <div className="space-y-2">
              {pendingComments.slice(0, 2).map((com) => (
                <div key={com.id} className="bg-red-950/30 p-3 border-l-4 border-red-500 text-xs rounded-r-md border-y border-r border-red-900/40">
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="font-bold text-white">{com.author}</span>
                    <span className="text-zinc-400">{com.date}</span>
                  </div>
                  <p className="text-zinc-200 line-clamp-2 italic">"{getSafeText(com.text, language)}"</p>
                </div>
              ))}
              {pendingComments.length === 0 && (
                <p className="text-xs text-emerald-400 font-semibold italic">{t.noComsApproval}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">{t.recentInteractions}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {interactions.slice(0, 4).map((item) => (
                <div key={item.id} className="p-2.5 bg-zinc-950/80 border border-zinc-800 text-xs rounded-md">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-0.5">
                    <span className="font-bold text-zinc-200 truncate max-w-[120px]">{item.email}</span>
                    <span>{item.date}</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    {language === 'fr' ? item.detail?.fr || item.type : item.detail?.en || item.type}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
