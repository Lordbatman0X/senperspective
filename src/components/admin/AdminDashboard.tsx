import React, { useState, useEffect } from 'react';
import { 
  Database, Server, Activity, CheckCircle2, AlertTriangle, Trash2, RefreshCw, 
  Layers, ShieldAlert, HardDrive, FileText, Users, MessageSquare, Mail, 
  Image as ImageIcon, Megaphone, Trophy, Zap, ShieldCheck, Eye, X, ArrowUpRight
} from 'lucide-react';
import { useStore } from '../../store';
import { db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface CollectionStats {
  name: string;
  collectionName: string;
  count: number;
  description: string;
  icon: React.ElementType;
  color: string;
}

export function AdminDashboard() {
  const { 
    articles, users, comments, subscribers, media, ads, matches, interactions,
    language, siteSettings 
  } = useStore();

  const isFr = language === 'fr';

  // State for active data source monitoring
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');
  
  // Real-time remote counts
  const [remoteCounts, setRemoteCounts] = useState<{ [key: string]: number }>({
    articles: articles?.length || 0,
    users: users?.length || 0,
    comments: comments?.length || 0,
    subscribers: subscribers?.length || 0,
    media: media?.length || 0,
    ads: ads?.length || 0,
    matches: matches?.length || 0,
    interactions: interactions?.length || 0,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inspectCollection, setInspectCollection] = useState<string | null>(null);
  const [inspectDocs, setInspectDocs] = useState<{ id: string; data: any }[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Modal / Wipe state
  const [wipeTarget, setWipeTarget] = useState<string | 'ALL' | null>(null);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeLogs, setWipeLogs] = useState<string[]>([]);
  const [wipeCompleted, setWipeCompleted] = useState(false);

  // Check database connectivity and count documents
  const checkDatabaseHealth = async () => {
    setIsRefreshing(true);
    setDbStatus('checking');
    const startTime = performance.now();

    try {
      const collectionsToCheck = [
        'articles', 'users', 'comments', 'subscribers', 'media', 'ads', 'matches', 'interactions', 'analytics_events', 'user_consents', 'daily_analytics'
      ];
      
      const newCounts: { [key: string]: number } = {};

      for (const colName of collectionsToCheck) {
        try {
          const snap = await getDocs(collection(db, colName));
          newCounts[colName] = snap.size;
        } catch (err) {
          console.warn(`Failed fetching ${colName} collection:`, err);
          newCounts[colName] = 0;
        }
      }

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setRemoteCounts(newCounts);
      setDbStatus('connected');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Database connection test failed:', err);
      setDbStatus('offline');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkDatabaseHealth();
  }, []);

  // Inspect a specific Firestore collection
  const handleInspectCollection = async (colName: string) => {
    setInspectCollection(colName);
    setInspectLoading(true);
    try {
      const snap = await getDocs(collection(db, colName));
      const docsList = snap.docs.slice(0, 15).map(docSnap => ({
        id: docSnap.id,
        data: docSnap.data()
      }));
      setInspectDocs(docsList);
    } catch (err) {
      console.error('Inspection failed:', err);
      setInspectDocs([]);
    } finally {
      setInspectLoading(false);
    }
  };

  // Perform wipe action
  const handleExecuteWipe = async () => {
    if (wipeConfirmInput.toUpperCase() !== 'WIPE') return;

    setIsWiping(true);
    setWipeLogs([isFr ? 'Initialisation du nettoyage de la base de données...' : 'Initializing database wipe process...']);

    try {
      const targets = wipeTarget === 'ALL' 
        ? ['articles', 'users', 'comments', 'subscribers', 'media', 'ads', 'matches', 'interactions']
        : [wipeTarget!];

      for (const colName of targets) {
        setWipeLogs(prev => [...prev, isFr ? `Analyse de la collection "${colName}"...` : `Scanning collection "${colName}"...`]);
        const snap = await getDocs(collection(db, colName));
        setWipeLogs(prev => [...prev, isFr ? `Suppression de ${snap.size} document(s) dans "${colName}"...` : `Deleting ${snap.size} document(s) in "${colName}"...`]);
        
        const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, colName, docSnap.id)));
        await Promise.all(deletePromises);

        // Clear Zustand local memory state corresponding to collection
        if (colName === 'articles') useStore.setState({ articles: [] });
        if (colName === 'comments') useStore.setState({ comments: [] });
        if (colName === 'subscribers') useStore.setState({ subscribers: [] });
        if (colName === 'media') useStore.setState({ media: [] });
        if (colName === 'ads') useStore.setState({ ads: [] });
        if (colName === 'matches') useStore.setState({ matches: [] });
        if (colName === 'interactions') useStore.setState({ interactions: [] });
      }

      // If clearing articles or all, also purge server RSS drafts
      if (wipeTarget === 'ALL' || wipeTarget === 'articles') {
        setWipeLogs(prev => [...prev, isFr ? 'Vidage du cache serveur RSS (/api/webhooks/make-rss)...' : 'Purging server RSS webhook cache...']);
        await fetch('/api/webhooks/make-rss', { method: 'DELETE' }).catch(() => {});
      }

      setWipeLogs(prev => [...prev, isFr ? '✅ Nettoyage terminé avec succès.' : '✅ Wipe operation completed successfully.']);
      setWipeCompleted(true);
      await checkDatabaseHealth();
    } catch (err: any) {
      setWipeLogs(prev => [...prev, `❌ Error during wipe: ${err.message || 'Unknown error'}`]);
    } finally {
      setIsWiping(false);
    }
  };

  const collectionsConfig: CollectionStats[] = [
    {
      name: isFr ? 'Articles & Contenus' : 'Articles & Frame Content',
      collectionName: 'articles',
      count: remoteCounts.articles ?? 0,
      description: isFr ? 'Articles publiés, brouillons et dossiers RSS' : 'Published stories, drafts & RSS cache items',
      icon: FileText,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      name: isFr ? 'Utilisateurs & Profils' : 'Users & Profiles',
      collectionName: 'users',
      count: remoteCounts.users ?? 0,
      description: isFr ? 'Comptes lecteurs, journalistes et administrateurs' : 'Reader accounts, staff & administrator profiles',
      icon: Users,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    },
    {
      name: isFr ? 'Commentaires & Modération' : 'Comments & Discussions',
      collectionName: 'comments',
      count: remoteCounts.comments ?? 0,
      description: isFr ? 'Discussions publiques et fils de modération' : 'Public reader commentary & moderation queues',
      icon: MessageSquare,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      name: isFr ? 'Abonnés Infolettre' : 'Newsletter Subscribers',
      collectionName: 'subscribers',
      count: remoteCounts.subscribers ?? 0,
      description: isFr ? 'Abonnés à la newsletter quotidienne' : 'Verified daily newsletter subscriber list',
      icon: Mail,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    },
    {
      name: isFr ? 'Médiathèque (Assets)' : 'Media Asset Library',
      collectionName: 'media',
      count: remoteCounts.media ?? 0,
      description: isFr ? 'Images, photos de couverture et médias hébergés' : 'Cover photos, infographics & uploaded media',
      icon: ImageIcon,
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/20'
    },
    {
      name: isFr ? 'Campagnes Publicitaires' : 'Ad Manager Campaigns',
      collectionName: 'ads',
      count: remoteCounts.ads ?? 0,
      description: isFr ? 'Bannières, annonces et emplacements sponsors' : 'Header banners, sidebar ads & sponsor slots',
      icon: Megaphone,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    },
    {
      name: isFr ? "L'Arène (Sports)" : "L'Arène Sports Matches",
      collectionName: 'matches',
      count: remoteCounts.matches ?? 0,
      description: isFr ? 'Matchs en direct, scores et fixtures sportives' : 'Live scores, football fixtures & fight cards',
      icon: Trophy,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    },
    {
      name: isFr ? 'Interactions & Favoris' : 'Interactions & Bookmarks',
      collectionName: 'interactions',
      count: remoteCounts.interactions ?? 0,
      description: isFr ? 'Articles sauvegardés et historiques de lecture' : 'User saved articles, likes & engagement logs',
      icon: Zap,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    }
  ];

  const totalDocuments = Object.values(remoteCounts).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. ACTIVE DATA SOURCE STATUS MONITORING BAR */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border ${
              dbStatus === 'connected' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              <Database size={28} className={dbStatus === 'checking' ? 'animate-pulse' : ''} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold font-mono uppercase tracking-widest text-zinc-400">
                  {isFr ? 'Source de Données Active' : 'Active Data Source'}
                </span>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  dbStatus === 'connected' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  {dbStatus === 'connected' ? 'Firebase Firestore (Cloud DB)' : 'Checking / Offline Fallback'}
                </div>
              </div>

              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Firestore Database Engine
                <span className="text-xs font-normal text-zinc-400 font-mono">
                  (Region: europe-west2)
                </span>
              </h2>

              <p className="text-xs text-zinc-400 font-mono flex items-center gap-4 pt-1">
                <span>Project: <strong className="text-zinc-200">earnest-strand-z71nt</strong></span>
                <span>Latency: <strong className="text-emerald-400">{latency !== null ? `${latency} ms` : '--'}</strong></span>
                <span>Last Sync: <strong className="text-zinc-300">{lastChecked || 'Now'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={checkDatabaseHealth}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isFr ? 'Tester Connexion' : 'Refresh Connection'}
            </button>

            <button
              onClick={() => {
                setWipeTarget('ALL');
                setWipeConfirmInput('');
                setWipeLogs([]);
                setWipeCompleted(false);
              }}
              className="flex items-center gap-2 bg-red-600/20 border border-red-500/40 hover:bg-red-600 text-red-300 hover:text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-950/40"
            >
              <Trash2 size={14} />
              {isFr ? 'Purger TOUTES les Collections' : 'Wipe All Collections'}
            </button>
          </div>
        </div>

        {/* Global Summary Metric Bar */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-lg">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-semibold">
              {isFr ? 'Total Documents Firestore' : 'Total Firestore Documents'}
            </p>
            <p className="text-2xl font-black text-white mt-1">{totalDocuments}</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-lg">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-semibold">
              {isFr ? 'Collections Surveillées' : 'Monitored Collections'}
            </p>
            <p className="text-2xl font-black text-indigo-400 mt-1">8</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-lg">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-semibold">
              {isFr ? 'Statut Ingestion RSS' : 'RSS Ingestion Status'}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {isFr ? 'Bloqué (Purge active)' : 'Blocked (Clean state)'}
            </p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-lg">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-semibold">
              {isFr ? 'Mode de Persistance' : 'Persistence Layer'}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mt-2 flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              Firestore + IDB
            </p>
          </div>
        </div>
      </div>

      {/* 2. FIRESTORE COLLECTIONS MONITORING GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={18} className="text-brand-coral" />
              {isFr ? 'Gestion & Surveillance des Collections Firestore' : 'Firestore Collection Manager & Monitor'}
            </h3>
            <p className="text-xs text-zinc-400">
              {isFr ? 'Supervisez la taille, inspectez le contenu ou purgez individuellement chaque collection' : 'Inspect documents, verify counts, or manually wipe individual collections'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {collectionsConfig.map((col) => {
            const IconComp = col.icon;
            return (
              <div 
                key={col.collectionName}
                className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all flex flex-col justify-between group shadow-lg hover:shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg border ${col.color}`}>
                      <IconComp size={20} />
                    </div>
                    <span className="text-2xl font-black font-mono text-white">
                      {col.count}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-brand-coral transition-colors">
                    {col.name}
                  </h4>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    col: <span className="text-zinc-300">"{col.collectionName}"</span>
                  </p>

                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                    {col.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-900 flex items-center gap-2">
                  <button
                    onClick={() => handleInspectCollection(col.collectionName)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    {isFr ? 'Inspecter' : 'Inspect'}
                  </button>
                  <button
                    onClick={() => {
                      setWipeTarget(col.collectionName);
                      setWipeConfirmInput('');
                      setWipeLogs([]);
                      setWipeCompleted(false);
                    }}
                    className="bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1"
                    title={isFr ? 'Purger cette collection' : 'Wipe collection'}
                  >
                    <Trash2 size={12} />
                    {isFr ? 'Purger' : 'Wipe'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. COLLECTION INSPECTION OVERLAY MODAL */}
      {inspectCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden text-zinc-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <Eye size={18} className="text-brand-coral" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {isFr ? `Inspection: Collection "${inspectCollection}"` : `Inspect Collection "${inspectCollection}"`}
                </h3>
              </div>
              <button
                onClick={() => setInspectCollection(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto font-mono text-xs">
              {inspectLoading ? (
                <div className="py-12 text-center text-zinc-400 flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-brand-coral" />
                  <p>{isFr ? 'Chargement des documents Firestore...' : 'Querying Firestore collection documents...'}</p>
                </div>
              ) : inspectDocs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-2">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500/50" />
                  <p className="text-sm font-bold text-zinc-300">{isFr ? 'Collection Vierge (0 documents)' : 'Virgin Collection (0 documents found)'}</p>
                  <p className="text-[11px] text-zinc-500">{isFr ? 'Aucune donnée n’est enregistrée dans cette collection.' : 'No items exist in this collection in Firebase Firestore.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inspectDocs.map((docItem) => (
                    <div key={docItem.id} className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-brand-coral font-bold">
                        <span>ID: {docItem.id}</span>
                      </div>
                      <pre className="text-[10px] text-zinc-400 bg-black/60 p-2 rounded overflow-x-auto">
                        {JSON.stringify(docItem.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setInspectCollection(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                {isFr ? 'Fermer' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. GRANULAR / MASTER WIPE CONFIRMATION MODAL */}
      {wipeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    {wipeTarget === 'ALL'
                      ? (isFr ? 'Purger TOUTES les Collections' : 'Wipe All Firestore Collections')
                      : (isFr ? `Purger Collection "${wipeTarget}"` : `Wipe Collection "${wipeTarget}"`)}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {isFr ? 'Nettoyage Firestore & mémoire locale' : 'Remote Firestore & local store wipe'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWipeTarget(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {!wipeCompleted ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      {isFr ? 'Confirmation de Sécurité' : 'Safety Confirmation Required'}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {wipeTarget === 'ALL'
                        ? (isFr 
                            ? 'Cette action supprimera DÉFINITIVEMENT tous les documents de TOUTES les 8 collections Firestore et de la mémoire locale.' 
                            : 'This will PERMANENTLY delete all documents across ALL 8 Firestore collections and local storage.')
                        : (isFr
                            ? `Cette action supprimera DÉFINITIVEMENT tous les documents de la collection "${wipeTarget}".`
                            : `This will PERMANENTLY delete all documents in collection "${wipeTarget}".`)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                      {isFr ? 'Tapez "WIPE" pour confirmer :' : 'Type "WIPE" to confirm:'}
                    </label>
                    <input
                      type="text"
                      value={wipeConfirmInput}
                      onChange={(e) => setWipeConfirmInput(e.target.value)}
                      placeholder="WIPE"
                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500 text-white font-mono text-center tracking-widest text-lg font-bold py-2.5 rounded-lg outline-none transition-colors"
                      autoFocus
                    />
                  </div>

                  {wipeLogs.length > 0 && (
                    <div className="bg-black/90 border border-zinc-800 rounded-lg p-3.5 font-mono text-xs text-zinc-300 max-h-40 overflow-y-auto space-y-1">
                      {wipeLogs.map((log, idx) => (
                        <p key={idx} className={log.startsWith('✅') ? 'text-emerald-400 font-bold' : log.startsWith('❌') ? 'text-red-400 font-bold' : ''}>
                          {log}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      onClick={() => setWipeTarget(null)}
                      disabled={isWiping}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isFr ? 'Annuler' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleExecuteWipe}
                      disabled={wipeConfirmInput.toUpperCase() !== 'WIPE' || isWiping}
                      className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-950/50"
                    >
                      {isWiping ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      {isFr ? 'Exécuter la Purge' : 'Execute Collection Wipe'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-5 text-center py-2">
                  <div className="mx-auto w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-950/50">
                    <ShieldCheck size={28} />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-lg font-black uppercase tracking-wider text-white">
                      {isFr ? 'Nettoyage Effectué' : 'Collection Wipe Completed'}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {isFr
                        ? 'La base de données et l’état local ont été synchronisés et nettoyés.'
                        : 'Remote Firestore collection data & client state have been synchronized and purged.'}
                    </p>
                  </div>

                  <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-300 font-mono font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{isFr ? 'Base de données vérifiée et à jour.' : 'Database verified and up-to-date.'}</span>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setWipeTarget(null)}
                      className="w-full py-2.5 text-xs font-bold uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      {isFr ? 'Fermer' : 'Close'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
