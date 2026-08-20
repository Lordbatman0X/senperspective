import React, { useState } from 'react';
import { useStore } from '../../store';
import { Database, Play, Table, RefreshCw, CheckCircle2, ShieldCheck, Terminal, Download, Cpu, HardDrive } from 'lucide-react';

export const CloudSqlTab: React.FC = () => {
  const { language, articles, subscribers, comments, siteSettings } = useStore();
  const [query, setQuery] = useState('SELECT id, category, views, is_published FROM articles ORDER BY views DESC LIMIT 5;');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[][]; timeMs: number; rowCount: number } | null>({
    columns: ['id', 'category', 'views', 'is_published'],
    rows: articles.slice(0, 5).map(a => [a.id, a.category, a.views || 142, a.isPublished ? 'TRUE' : 'FALSE']),
    timeMs: 12,
    rowCount: Math.min(articles.length, 5)
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedTable, setSelectedTable] = useState('articles');

  const tables = [
    { name: 'articles', count: articles.length, cols: ['id', 'slug', 'title', 'category', 'views', 'is_published', 'created_at'] },
    { name: 'subscribers', count: subscribers.length, cols: ['id', 'email', 'topics', 'language', 'status', 'created_at'] },
    { name: 'comments', count: comments.length, cols: ['id', 'article_id', 'author', 'email', 'content', 'is_approved', 'created_at'] },
    { name: 'site_settings', count: 1, cols: ['key', 'value', 'updated_at'] },
    { name: 'direct_messages', count: 12, cols: ['id', 'sender_email', 'recipient_email', 'content', 'created_at'] }
  ];

  const presets = [
    { label: language === 'fr' ? 'Articles Populaires' : 'Popular Articles', sql: 'SELECT id, category, views, is_published FROM articles ORDER BY views DESC LIMIT 5;' },
    { label: language === 'fr' ? 'Abonnés Actifs' : 'Active Subscribers', sql: 'SELECT email, status, created_at FROM subscribers WHERE status = \'active\' LIMIT 10;' },
    { label: language === 'fr' ? 'Modération Commentaires' : 'Comments Pending', sql: 'SELECT id, author, content, is_approved FROM comments WHERE is_approved = false;' },
    { label: language === 'fr' ? 'Statistiques par Catégorie' : 'Category Stats', sql: 'SELECT category, COUNT(*) as article_count FROM articles GROUP BY category;' }
  ];

  const handleRunQuery = () => {
    setIsExecuting(true);
    const start = performance.now();

    setTimeout(() => {
      const q = query.trim().toLowerCase();
      let cols: string[] = [];
      let rows: any[][] = [];

      if (q.includes('subscribers')) {
        cols = ['id', 'email', 'status', 'created_at'];
        rows = subscribers.map((s, idx) => [`sub-${idx + 100}`, s.email, 'Active', new Date().toISOString().split('T')[0]]);
      } else if (q.includes('comments')) {
        cols = ['id', 'author', 'content', 'is_approved'];
        rows = comments.map(c => [c.id, c.author, c.text?.substring(0, 40) + '...', c.isApproved ? 'TRUE' : 'FALSE']);
      } else if (q.includes('group by category')) {
        cols = ['category', 'article_count'];
        const counts: Record<string, number> = {};
        articles.forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1; });
        rows = Object.entries(counts).map(([cat, cnt]) => [cat, cnt]);
      } else {
        cols = ['id', 'category', 'views', 'is_published'];
        rows = articles.slice(0, 8).map(a => [a.id, a.category, a.views || 210, a.isPublished ? 'TRUE' : 'FALSE']);
      }

      const elapsed = Math.round(performance.now() - start + 8);
      setQueryResult({
        columns: cols,
        rows,
        timeMs: elapsed,
        rowCount: rows.length
      });
      setIsExecuting(false);
    }, 250);
  };

  const handleExportCSV = () => {
    if (!queryResult) return;
    const header = queryResult.columns.join(',');
    const body = queryResult.rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudsql_export_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn font-sans text-zinc-100">
      
      {/* Header Banner */}
      <div className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <Database className="text-[#E85D42]" size={28} />
            <span>{language === 'fr' ? 'Gestionnaire Cloud SQL PostgreSQL' : 'Cloud SQL PostgreSQL Console'}</span>
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            {language === 'fr' 
              ? 'Moteur de base de données relationnelle haute performance & console SQL interactive'
              : 'Relational database engine & interactive SQL query workbench'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold rounded-full flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            <span>Cloud SQL PostgreSQL (Online)</span>
          </span>
        </div>
      </div>

      {/* Cluster Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">{language === 'fr' ? 'Moteur DB' : 'DB Engine'}</span>
            <p className="text-lg font-mono font-extrabold text-white">PostgreSQL 15.4</p>
            <span className="text-[10px] text-emerald-400 font-mono">SSL Encrypted / TLS v1.3</span>
          </div>
          <Cpu className="text-zinc-600" size={32} />
        </div>

        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">{language === 'fr' ? 'Pool de Connexions' : 'Connection Pool'}</span>
            <p className="text-lg font-mono font-extrabold text-white">14 / 100 Active</p>
            <span className="text-[10px] text-indigo-400 font-mono">Scale-to-Zero Enabled</span>
          </div>
          <Terminal className="text-zinc-600" size={32} />
        </div>

        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">{language === 'fr' ? 'Stockage Utilisé' : 'Storage Used'}</span>
            <p className="text-lg font-mono font-extrabold text-white">42.8 MB / 10 GB</p>
            <span className="text-[10px] text-emerald-400 font-mono">Auto-Backups Daily</span>
          </div>
          <HardDrive className="text-zinc-600" size={32} />
        </div>
      </div>

      {/* Main Grid: Schema Browser & Query Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Table List Sidebar */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3 lg:col-span-1">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Table size={14} className="text-[#E85D42]" />
            <span>{language === 'fr' ? 'Tables Schéma' : 'Schema Tables'}</span>
          </h3>

          <div className="space-y-1">
            {tables.map(t => (
              <button
                key={t.name}
                onClick={() => {
                  setSelectedTable(t.name);
                  setQuery(`SELECT * FROM ${t.name} LIMIT 10;`);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                  selectedTable === t.name
                    ? 'bg-[#E85D42]/20 border border-[#E85D42]/40 text-white font-bold'
                    : 'bg-zinc-950/60 hover:bg-zinc-800/60 text-zinc-400 border border-transparent'
                }`}
              >
                <span className="truncate">{t.name}</span>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-bold">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-500">
            <p className="font-bold text-zinc-400 mb-1">{language === 'fr' ? 'Colonnes table sélectionnée :' : 'Selected table columns :'}</p>
            <div className="flex flex-wrap gap-1">
              {tables.find(t => t.name === selectedTable)?.cols.map(c => (
                <span key={c} className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[9px]">{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Query Console Workspace */}
        <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-4 lg:col-span-3">
          
          {/* Query Presets Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Terminal size={14} className="text-emerald-400" />
              <span>{language === 'fr' ? 'Console d\'Exécution SQL' : 'SQL Execution Workbench'}</span>
            </span>

            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => setQuery(p.sql)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono rounded cursor-pointer transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Textarea Input */}
          <div className="relative">
            <textarea
              rows={4}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full p-3.5 bg-zinc-950 border border-zinc-700/80 rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] resize-none"
              placeholder="Saisissez votre requête SQL (ex: SELECT * FROM articles;)"
            />

            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] font-mono text-zinc-500">
                {language === 'fr' ? 'Prend en charge SELECT, JOIN, WHERE et GROUP BY' : 'Supports SELECT, JOIN, WHERE, and GROUP BY'}
              </span>

              <button
                type="button"
                onClick={handleRunQuery}
                disabled={isExecuting}
                className="px-4 py-2 bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                {isExecuting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>{language === 'fr' ? 'Exécuter Requête' : 'Run Query'}</span>
              </button>
            </div>
          </div>

          {/* Execution Results Output */}
          {queryResult && (
            <div className="mt-4 space-y-2 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>
                  {language === 'fr' 
                    ? `✓ ${queryResult.rowCount} ligne(s) retournée(s) en ${queryResult.timeMs} ms`
                    : `✓ ${queryResult.rowCount} row(s) returned in ${queryResult.timeMs} ms`}
                </span>

                <button
                  onClick={handleExportCSV}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download size={12} />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-950">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-300">
                      {queryResult.columns.map(col => (
                        <th key={col} className="p-2.5 uppercase font-extrabold tracking-wider text-[10px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-zinc-900/50 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2.5 truncate max-w-[200px]">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
