import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Server, 
  Cloud, 
  HardDrive, 
  ArrowRight, 
  ShieldCheck, 
  FileJson,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  getVercelStorageStatus, 
  exportFirebaseSnapshot, 
  downloadSnapshotFile, 
  importSnapshotToVercel,
  VercelStorageStatus,
  DatabaseSnapshot
} from '../../lib/migrationService';

export function VercelMigrationTab() {
  const [status, setStatus] = useState<VercelStorageStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    const res = await getVercelStorageStatus();
    setStatus(res);
    setLoadingStatus(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Handle Export Firebase -> Snapshot
  const handleExport = async () => {
    setExporting(true);
    setResultMessage(null);
    try {
      const snap = await exportFirebaseSnapshot();
      setSnapshot(snap);
      downloadSnapshotFile(snap);
      setResultMessage({
        type: 'success',
        text: `Exportation réussie ! ${snap.articles.length} articles, ${snap.users.length} comptes et ${snap.comments.length} commentaires exportés dans le fichier JSON.`
      });
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: 'Erreur d\'exportation: ' + (err?.message || err)
      });
    } finally {
      setExporting(false);
    }
  };

  // Handle Direct 1-Click Migration to Vercel
  const handleDirectMigration = async () => {
    setImporting(true);
    setResultMessage(null);
    try {
      let snapToImport = snapshot;
      if (!snapToImport) {
        snapToImport = await exportFirebaseSnapshot();
        setSnapshot(snapToImport);
      }

      const res = await importSnapshotToVercel(snapToImport);
      if (res.success) {
        setResultMessage({
          type: 'success',
          text: `Migration vers Vercel Storage réussie ! Base synchronisée avec Vercel ${status?.storage.vercelKv ? 'KV' : status?.storage.vercelPostgres ? 'Postgres' : 'Serverless'}.`
        });
        fetchStatus();
      } else {
        setResultMessage({
          type: 'error',
          text: res.error || 'Erreur lors de l\'importation vers Vercel Storage.'
        });
      }
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: 'Échec de la migration: ' + (err?.message || err)
      });
    } finally {
      setImporting(false);
    }
  };

  // Handle File Upload Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        if (!jsonContent || typeof jsonContent !== 'object') {
          throw new Error('Fichier JSON invalide.');
        }

        setImporting(true);
        setResultMessage(null);

        const res = await importSnapshotToVercel(jsonContent);
        if (res.success) {
          setResultMessage({
            type: 'success',
            text: `Importation du fichier JSON réussie ! Toutes les données ont été injectées dans Vercel Storage.`
          });
          fetchStatus();
        } else {
          setResultMessage({
            type: 'error',
            text: res.error || 'Échec de l\'importation.'
          });
        }
      } catch (err: any) {
        setResultMessage({
          type: 'error',
          text: 'Fichier JSON invalide ou corrompu: ' + (err?.message || err)
        });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 font-sans text-brand-dark dark:text-zinc-100 max-w-6xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white p-6 sm:p-8 rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cloud className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs px-3 py-1 rounded-full font-mono mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Module d'interconnexion & Migration Vercel Storage</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Migration Firebase vers Vercel
            </h2>
            <p className="text-zinc-400 text-sm mt-2 max-w-2xl leading-relaxed">
              Transférez gratuitement et en 1 clic l'intégralité de vos articles, utilisateurs, commentaires, messages directs et réglages depuis votre base de données document vers la base de données Vercel (Postgres ou Vercel KV / Redis).
            </p>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loadingStatus}
            className="self-start md:self-auto flex items-center gap-2 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 text-xs px-4 py-2.5 rounded-xl transition font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Actualiser le statut</span>
          </button>
        </div>
      </div>

      {/* Connection Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Vercel KV */}
        <div className={`p-5 rounded-xl border transition-all ${
          status?.storage.vercelKv 
            ? 'bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/20' 
            : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Vercel KV (Redis)
            </span>
            {status?.storage.vercelKv ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Connecté
              </span>
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                Non lié
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            {status?.storage.vercelKv 
              ? 'Performance maximale pour le stockage d’articles et la mémoire vive.' 
              : 'Créer une base KV sur Vercel pour l’activer automatiquement.'}
          </p>
        </div>

        {/* Vercel Postgres */}
        <div className={`p-5 rounded-xl border transition-all ${
          status?.storage.vercelPostgres 
            ? 'bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/20' 
            : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Vercel Postgres (Neon SQL)
            </span>
            {status?.storage.vercelPostgres ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Connecté
              </span>
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                Non lié
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            {status?.storage.vercelPostgres 
              ? 'Base relationnelle PostgreSQL active pour vos tables de données.' 
              : 'Créer une base Postgres dans Vercel Storage.'}
          </p>
        </div>

        {/* Local Serverless Persistence */}
        <div className="p-5 rounded-xl border bg-orange-500/5 border-orange-500/20 dark:bg-orange-950/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Serveur Vercel local / Fallback
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Prêt
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            Sauvegarde universelle dans la mémoire du serveur et l’espace local pour prévenir toute rupture de service.
          </p>
        </div>

      </div>

      {/* Result Message Toast */}
      {resultMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
          resultMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}>
          {resultMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-medium leading-relaxed">
            {resultMessage.text}
          </div>
        </div>
      )}

      {/* Guided 3-Step Migration Process */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-500" />
            <span>Guide de Migration en 3 Étapes</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Suivez ces instructions pour lier la base Vercel et importer vos données Firebase sans perte.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center">1</span>
                <h4 className="font-bold text-sm text-brand-dark dark:text-zinc-100">Créer la DB Vercel</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Dans l'onglet <strong className="text-brand-dark dark:text-white">Storage</strong> de Vercel (celui affiché sur votre écran), cliquez sur <span className="underline decoration-orange-500">« Create Database »</span> et choisissez <strong>Vercel Postgres</strong> ou <strong>Vercel KV</strong>.
              </p>
            </div>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
            >
              <span>Ouvrir Vercel Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center">2</span>
                <h4 className="font-bold text-sm text-brand-dark dark:text-zinc-100">Exporter Firebase</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Téléchargez l'intégralité de la base de données cloud sous forme de snapshot JSON sécurisé contenant tous vos contenus.
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs py-2.5 px-3 rounded-lg font-bold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exportation...' : 'Exporter Snapshot JSON'}</span>
            </button>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-orange-500/5 dark:bg-orange-950/20 border border-orange-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                <h4 className="font-bold text-sm text-brand-dark dark:text-zinc-100">Injecter dans Vercel</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Migrez automatiquement le snapshot extrait vers les serveurs Vercel Storage en 1 seul clic.
              </p>
            </div>
            <button
              onClick={handleDirectMigration}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs py-2.5 px-3 rounded-lg font-bold transition shadow-md"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{importing ? 'Migration en cours...' : 'Lancer la Migration Directe'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Manual File Upload Import & Backup Management */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <h3 className="text-base font-bold text-brand-dark dark:text-white flex items-center gap-2">
          <FileJson className="w-5 h-5 text-orange-500" />
          <span>Restauration manuelle depuis un fichier JSON</span>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Si vous possédez déjà une sauvegarde au format `.json`, vous pouvez l'importer directement ici pour alimenter la base Vercel.
        </p>

        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-zinc-100/50 transition relative">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={importing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Upload className="w-8 h-8 text-zinc-400" />
            <p className="text-xs font-bold text-brand-dark dark:text-zinc-200">
              Glissez-déposez un fichier `.json` ici ou cliquez pour choisir
            </p>
            <p className="text-[11px] text-zinc-400">
              Format supporté: JSON Snapshot Perspective (articles, utilisateurs, messages, commentaires)
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
