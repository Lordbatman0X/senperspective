const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { AdItem, useStore } from '../../store';
import { 
  Plus, Edit2, Trash2, ImageIcon, Activity, X, BarChart, 
  Megaphone, RotateCcw, Sparkles, Upload, MonitorPlay, Settings,
  Eye, MousePointerClick, TrendingUp, CheckCircle2, AlertCircle, Play, Pause
} from 'lucide-react';
import { getSafeText } from '../../lib/utils';

interface AdManagerTabProps {
  ads: AdItem[];
  saveAd: (ad: AdItem) => void;
  deleteAd: (id: string) => void;
  openMediaSelector: (onSelect: (url: string) => void) => void;
}

export function AdManagerTab({ ads, saveAd, deleteAd, openMediaSelector }: AdManagerTabProps) {
  const language = useStore(s => s.language);
  const isFr = language === 'fr';
  
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'editor'>('monitor');
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);
  const [previewTab, setPreviewTab] = useState<string>('in-article');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Global Stats
  const totalImpressions = ads.reduce((acc, ad) => acc + (ad.impressions || 0), 0);
  const totalClicks = ads.reduce((acc, ad) => acc + (ad.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const handleEdit = (ad: AdItem) => {
    setEditingAd(ad);
    setPreviewTab(ad.position);
    setActiveSubTab('editor');
  };

  const handleCreateNew = () => {
    setEditingAd({
      id: \`ad-\${Date.now()}\`,
      name: '',
      imageUrl: '',
      targetUrl: 'https://',
      position: 'in-article',
      active: true,
      tag: 'SPONSORISÉ',
      ctaText: 'DÉCOUVRIR',
      impressions: 0,
      clicks: 0
    });
    setPreviewTab('in-article');
    setActiveSubTab('editor');
  };

  const handleToggleStatus = (ad: AdItem) => {
    saveAd({ ...ad, active: !ad.active });
  };

  const placementLabels: Record<string, string> = {
    'in-article': isFr ? "Bannière d'Article (Large)" : "In-Article Banner (Wide)",
    'header': isFr ? "Bannière d'En-tête (Leaderboard)" : "Header Banner (Top Wide)",
    'sidebar': isFr ? "Encart Latéral (Carré)" : "Sidebar Square",
    'homepage-between': isFr ? "Entre-Articles (Accueil)" : "Homepage In-between",
    'sidebar-cafe': isFr ? "Sponsor Latéral #1 (Café)" : "Sidebar Sponsor #1",
    'sidebar-ter': isFr ? "Sponsor Latéral #2 (TER)" : "Sidebar Sponsor #2",
    'far-left': isFr ? "Bannière Extrême Gauche" : "Far Left Panel",
    'far-right': isFr ? "Bannière Extrême Droite" : "Far Right Panel"
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Navigation */}
      <div className="flex border-b border-zinc-800 pb-px">
        <button
          onClick={() => { setActiveSubTab('monitor'); setEditingAd(null); }}
          className={\`pb-4 px-6 font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer \${
            activeSubTab === 'monitor'
              ? 'border-[#E85D42] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }\`}
        >
          <MonitorPlay size={14} />
          <span>{isFr ? 'Régie & Monitor Publicitaire' : 'Ad Monitor'}</span>
          <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono text-[9px]">
            {ads.length}
          </span>
        </button>

        <button
          onClick={() => {
             if (!editingAd) handleCreateNew();
             else setActiveSubTab('editor');
          }}
          className={\`pb-4 px-6 font-extrabold uppercase tracking-widest text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer \${
            activeSubTab === 'editor'
              ? 'border-[#E85D42] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }\`}
        >
          {editingAd && editingAd.name ? <Edit2 size={14} /> : <Plus size={14} />}
          <span>{editingAd && editingAd.name ? (isFr ? 'Modifier la Campagne' : 'Edit Campaign') : (isFr ? 'Nouvelle Campagne' : 'New Campaign')}</span>
        </button>
      </div>

      {activeSubTab === 'monitor' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Global Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Eye size={24} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{isFr ? 'Impressions Globales' : 'Total Impressions'}</p>
                <p className="text-2xl font-black font-mono text-white mt-1">{totalImpressions.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <MousePointerClick size={24} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{isFr ? 'Clics Enregistrés' : 'Total Clicks'}</p>
                <p className="text-2xl font-black font-mono text-white mt-1">{totalClicks.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{isFr ? 'Taux de Clic (CTR)' : 'Avg CTR'}</p>
                <p className="text-2xl font-black font-mono text-white mt-1">{avgCtr.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-sm whitespace-nowrap">
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] uppercase tracking-widest text-[#E85D42] font-black">
                  <tr>
                    <th className="px-6 py-4">{isFr ? 'Campagne' : 'Campaign'}</th>
                    <th className="px-6 py-4">{isFr ? 'Emplacement' : 'Placement'}</th>
                    <th className="px-6 py-4">{isFr ? 'Performances' : 'Performance'}</th>
                    <th className="px-6 py-4 text-right">{isFr ? 'Actions' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {ads.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-zinc-500">
                          <Megaphone size={32} className="mb-4 opacity-50" />
                          <p className="text-sm font-medium">{isFr ? 'Aucune campagne active.' : 'No active campaigns.'}</p>
                          <button 
                            onClick={handleCreateNew}
                            className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                          >
                            {isFr ? 'Créer une campagne' : 'Create a campaign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {ads.map(ad => {
                    const adCtr = (ad.impressions || 0) > 0 ? ((ad.clicks || 0) / (ad.impressions || 0)) * 100 : 0;
                    return (
                      <tr key={ad.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 shrink-0 bg-zinc-950 border border-zinc-800 rounded overflow-hidden flex items-center justify-center">
                              {ad.imageUrl ? (
                                <img src={ad.imageUrl} alt={ad.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={16} className="text-zinc-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-white text-sm truncate max-w-[200px]">{ad.name}</h4>
                              <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px] mt-0.5 hover:text-orange-400">
                                <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer">{ad.targetUrl}</a>
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={\`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border \${
                                  ad.active ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' : 'bg-zinc-900 text-zinc-500 border-zinc-700'
                                }\`}>
                                  {ad.active ? (isFr ? 'EN LIGNE' : 'ACTIVE') : (isFr ? 'SUSPENDU' : 'PAUSED')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-[9px] font-black font-mono border border-zinc-700 bg-zinc-950 text-zinc-300 uppercase rounded-md shadow-sm">
                            {placementLabels[ad.position] || ad.position}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-zinc-400" title="Impressions">
                                <Eye size={12} />
                                <span className="font-bold text-zinc-200">{(ad.impressions || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-zinc-400" title="Clicks">
                                <MousePointerClick size={12} />
                                <span className="font-bold text-zinc-200">{(ad.clicks || 0).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded-sm border border-emerald-800/40 inline-flex items-center gap-1">
                                <TrendingUp size={10} />
                                CTR: {adCtr.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => handleToggleStatus(ad)}
                              className={\`p-2 transition-colors cursor-pointer rounded-full \${
                                ad.active 
                                  ? 'text-emerald-500 hover:bg-emerald-500/10' 
                                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'
                              }\`}
                              title={ad.active ? (isFr ? "Suspendre la campagne" : "Pause campaign") : (isFr ? "Activer la campagne" : "Activate campaign")}
                            >
                              {ad.active ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            <button 
                              onClick={() => handleEdit(ad)} 
                              className="p-2 text-zinc-500 hover:text-[#E85D42] hover:bg-[#E85D42]/10 transition-colors cursor-pointer rounded-full"
                              title={isFr ? "Modifier" : "Edit"}
                            >
                              <Edit2 size={14} />
                            </button>
                            {deleteConfirmId === ad.id ? (
                              <div className="flex items-center gap-1 animate-fadeIn">
                                <button
                                  onClick={() => {
                                    deleteAd(ad.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-1 bg-red-500 text-white text-[9px] font-bold uppercase rounded-sm hover:bg-red-600 transition-colors"
                                >
                                  {isFr ? 'Confirmer' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 bg-zinc-700 text-white text-[9px] font-bold uppercase rounded-sm hover:bg-zinc-600 transition-colors"
                                >
                                  {isFr ? 'Annuler' : 'Cancel'}
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setDeleteConfirmId(ad.id)}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer rounded-full"
                                title={isFr ? "Supprimer" : "Delete"}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'editor' && editingAd && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl relative">
            <h3 className="font-extrabold uppercase tracking-widest text-lg mb-6 text-[#E85D42] flex items-center gap-2">
              <Megaphone size={18} />
              {editingAd.name ? (isFr ? 'Modifier la Campagne' : 'Edit Campaign') : (isFr ? 'Nouvelle Campagne' : 'New Campaign')}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div className="space-y-4 bg-zinc-950/50 p-5 rounded-xl border border-zinc-800/80">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-2 mb-3">
                    {isFr ? 'Informations Générales' : 'General Info'}
                  </h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      {isFr ? 'Nom de la Campagne' : 'Campaign Name'}
                    </label>
                    <input 
                      value={editingAd.name} 
                      onChange={e => setEditingAd({ ...editingAd, name: e.target.value })} 
                      className="w-full bg-zinc-900 border border-zinc-700/80 text-white p-3 text-sm focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-lg shadow-inner" 
                      placeholder="Ex: Orange Promo Été" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      {isFr ? 'Lien de Destination URL' : 'Target URL'}
                    </label>
                    <input 
                      value={editingAd.targetUrl} 
                      onChange={e => setEditingAd({ ...editingAd, targetUrl: e.target.value })} 
                      className="w-full bg-zinc-900 border border-zinc-700/80 text-white p-3 text-sm focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-lg shadow-inner font-mono" 
                      placeholder="https://..." 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      {isFr ? 'Bannière Visuelle (URL)' : 'Visual Banner (URL)'}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={editingAd.imageUrl} 
                        onChange={e => setEditingAd({ ...editingAd, imageUrl: e.target.value })} 
                        className="flex-1 bg-zinc-900 border border-zinc-700/80 text-white p-3 text-sm focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-lg shadow-inner font-mono" 
                        placeholder="https://..." 
                      />
                      <button 
                        type="button" 
                        onClick={() => openMediaSelector((url) => setEditingAd({ ...editingAd, imageUrl: url }))} 
                        className="bg-zinc-800 text-white px-4 py-2 hover:bg-zinc-700 transition-colors flex items-center justify-center rounded-lg border border-zinc-700"
                        title={isFr ? "Choisir depuis la médiathèque" : "Choose from Media Library"}
                      >
                        <ImageIcon size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-zinc-950/50 p-5 rounded-xl border border-zinc-800/80">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-2 mb-3">
                    {isFr ? 'Configuration d\'Affichage' : 'Display Configuration'}
                  </h4>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      {isFr ? 'Positionnement' : 'Placement'}
                    </label>
                    <select 
                      value={editingAd.position} 
                      onChange={e => setEditingAd({ ...editingAd, position: e.target.value as any })} 
                      className="w-full bg-zinc-900 border border-zinc-700/80 text-white p-3 text-sm focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-lg shadow-inner"
                    >
                      {Object.entries(placementLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                        {isFr ? 'Texte du Bouton (CTA)' : 'Button CTA'}
                      </label>
                      <input 
                        type="text" 
                        value={editingAd.ctaText || ''} 
                        onChange={e => setEditingAd({ ...editingAd, ctaText: e.target.value })} 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-white p-3 text-sm focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-lg shadow-inner" 
                        placeholder="DÉCOUVRIR" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                        {isFr ? 'Étiquette Éditoriale' : 'Editorial Tag'}
                      </label>
                      <input 
                        type="text" 
                        value={editingAd.tag || ''} 
                        onChange={e => setEditingAd({ ...editingAd, tag: e.target.value })} 
                        className="w-full bg-zinc-900 border border-zinc-700/80 text-white p-3 text-sm focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-lg shadow-inner" 
                        placeholder="SPONSORISÉ" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      {isFr ? 'Description (Optionnel)' : 'Description (Optional)'}
                    </label>
                    <textarea 
                      value={typeof editingAd.description === 'object' ? ((editingAd.description as any)[language] || (editingAd.description as any).fr || '') : editingAd.description || ''} 
                      onChange={e => setEditingAd({ ...editingAd, description: e.target.value })} 
                      className="w-full bg-zinc-900 border border-zinc-700/80 text-white p-3 text-sm focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-lg shadow-inner resize-none h-20" 
                      placeholder={isFr ? "Texte de la campagne..." : "Campaign text..."}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                        {isFr ? 'Couleur de Fond' : 'Background Color'}
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={editingAd.bgColor || ''} 
                          onChange={e => setEditingAd({ ...editingAd, bgColor: e.target.value })} 
                          className="flex-1 bg-zinc-900 border border-zinc-700/80 text-white p-3 text-xs font-mono focus:outline-none focus:border-[#E85D42] rounded-lg shadow-inner" 
                          placeholder="#0f172a" 
                        />
                        <div 
                          className="w-10 h-10 rounded-lg border border-zinc-700 shrink-0 shadow-inner" 
                          style={{ backgroundColor: editingAd.bgColor || '#18181b' }}
                        />
                      </div>
                    </div>
                    {(editingAd.position === 'far-left' || editingAd.position === 'far-right') && (
                      <div>
                        <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                          {isFr ? 'Largeur (px)' : 'Width (px)'}
                        </label>
                        <input 
                          type="number" 
                          value={editingAd.width || 120} 
                          onChange={e => setEditingAd({ ...editingAd, width: parseInt(e.target.value) || 120 })} 
                          className="w-full bg-zinc-900 border border-zinc-700/80 text-white p-3 text-xs focus:outline-none focus:border-[#E85D42] rounded-lg shadow-inner" 
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={editingAd.active} onChange={(e) => setEditingAd({...editingAd, active: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                  <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                    {editingAd.active ? (isFr ? 'Statut : EN LIGNE' : 'Status: ACTIVE') : (isFr ? 'Statut : SUSPENDU' : 'Status: PAUSED')}
                  </span>
                </div>
              </div>

              {/* Preview Pane */}
              <div className="space-y-4 relative">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-2 mb-3 sticky top-0">
                    {isFr ? 'Aperçu Visuel en Direct' : 'Live Visual Preview'}
                  </h4>

                  <div className="bg-zinc-950/80 border border-zinc-800/60 p-4 rounded-xl min-h-[400px] flex items-center justify-center shadow-inner relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                     
                     {(editingAd.position === 'in-article' || editingAd.position === 'header') && (
                        <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col gap-3 shadow-2xl relative">
                          <span className="absolute top-2 right-2 bg-black/60 text-white text-[8px] uppercase px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                            {editingAd.tag || 'SPONSORISÉ'}
                          </span>
                          <div className="w-full aspect-[21/9] bg-zinc-950 flex items-center justify-center overflow-hidden rounded border border-zinc-800 relative">
                             {editingAd.imageUrl ? (
                               <img src={editingAd.imageUrl} alt={editingAd.name} className="w-full h-full object-cover" />
                             ) : (
                               <ImageIcon size={32} className="text-zinc-700" />
                             )}
                          </div>
                          <div className="flex justify-between items-center px-1">
                             <div className="pr-4">
                               <h4 className="font-extrabold text-sm text-white line-clamp-1">{editingAd.name || 'Nom de l\'annonceur'}</h4>
                               {editingAd.description && (
                                 <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{getSafeText(editingAd.description, language)}</p>
                               )}
                             </div>
                             <span className="bg-[#E85D42] text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-wider rounded shrink-0">
                               {editingAd.ctaText || 'DÉCOUVRIR'}
                             </span>
                          </div>
                        </div>
                     )}

                     {(editingAd.position === 'sidebar') && (
                        <div className="w-64 bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-3 shadow-2xl relative rounded-xl">
                          <span className="absolute top-2 left-2 bg-black/60 text-white text-[8px] uppercase px-1.5 py-0.5 rounded font-bold backdrop-blur-sm z-10">
                            {editingAd.tag || 'SPONSORISÉ'}
                          </span>
                          <div className="w-full aspect-square bg-zinc-950 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-800">
                             {editingAd.imageUrl ? (
                               <img src={editingAd.imageUrl} alt={editingAd.name} className="w-full h-full object-cover" />
                             ) : (
                               <ImageIcon size={32} className="text-zinc-700" />
                             )}
                          </div>
                          <div className="text-center">
                            <h4 className="font-extrabold text-sm text-white line-clamp-1">{editingAd.name || 'Sponsor'}</h4>
                             <button className="w-full mt-2 bg-[#E85D42] text-white text-[10px] font-black px-3 py-2.5 uppercase tracking-wider rounded-lg">
                               {editingAd.ctaText || 'DÉCOUVRIR'}
                             </button>
                          </div>
                        </div>
                     )}

                     {(editingAd.position === 'homepage-between' || editingAd.position === 'sidebar-cafe' || editingAd.position === 'sidebar-ter') && (
                        <div 
                          className="w-full max-w-sm p-4 relative flex flex-row gap-4 items-center justify-between border rounded-xl shadow-2xl"
                          style={{ 
                            backgroundColor: editingAd.bgColor || '#0f172a', 
                            borderColor: 'rgba(255,255,255,0.1)'
                          }}
                        >
                          <span className="absolute top-0 right-0 bg-black/40 text-[7px] uppercase px-2 py-1 font-bold text-white rounded-bl-lg">
                            {editingAd.tag || 'SPONSORISÉ'}
                          </span>
                          {editingAd.imageUrl && (
                            <img src={editingAd.imageUrl} alt={editingAd.name} className="w-14 h-14 object-cover rounded-lg shrink-0 shadow-md" />
                          )}
                          <div className="flex-1 text-left min-w-0 pr-2">
                            <h4 className="font-black text-sm uppercase tracking-wide line-clamp-1 text-white">
                              {editingAd.name || 'PARTENAIRE'}
                            </h4>
                            <p className="text-[10px] text-zinc-300 line-clamp-2 leading-tight mt-1 opacity-90">
                              {getSafeText(editingAd.description, language) || 'Description courte de l\'offre partenaire...'}
                            </p>
                          </div>
                          <span className="px-3 py-2 bg-[#E85D42] hover:bg-[#d05035] text-white text-[9px] font-black uppercase tracking-widest shrink-0 rounded-lg shadow-sm transition-colors cursor-pointer">
                            {editingAd.ctaText || 'VISITER'}
                          </span>
                        </div>
                     )}
                     
                     {(editingAd.position === 'far-left' || editingAd.position === 'far-right') && (
                       <div 
                         className="flex flex-col items-center justify-center border shadow-2xl rounded"
                         style={{ 
                            backgroundColor: editingAd.bgColor || '#18181b', 
                            borderColor: 'rgba(255,255,255,0.1)',
                            width: \`\${editingAd.width || 120}px\`,
                            height: '400px'
                          }}
                       >
                         {editingAd.imageUrl ? (
                           <img src={editingAd.imageUrl} alt={editingAd.name} className="w-full h-full object-cover" />
                         ) : (
                           <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center px-2">PANEL<br/>\${editingAd.width || 120}px</span>
                         )}
                       </div>
                     )}

                  </div>
              </div>
            </div>

            {/* Action Bar Footer */}
            <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
              {editingAd.id && !editingAd.id.startsWith('ad-') && (
                <button 
                  onClick={() => setDeleteConfirmId(editingAd.id)}
                  className="px-4 py-2 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  {isFr ? 'Supprimer la campagne' : 'Delete campaign'}
                </button>
              )}
              <div className="flex-1"></div>
              <button 
                onClick={() => { setActiveSubTab('monitor'); setEditingAd(null); }}
                className="px-6 py-2.5 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors mr-3"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  saveAd({
                    ...editingAd,
                    impressions: editingAd.impressions || 0,
                    clicks: editingAd.clicks || 0
                  });
                  setActiveSubTab('monitor');
                  setEditingAd(null);
                }}
                disabled={!editingAd.name || !editingAd.imageUrl}
                className="bg-[#E85D42] text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#c94931] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                {isFr ? 'Enregistrer & Déployer' : 'Save & Deploy'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/admin/AdManagerTab.tsx', content);
console.log('AdManagerTab successfully updated');
