import React, { useState } from 'react';
import { AdItem, useStore } from '../../store';
import { Plus, Edit2, Trash2, ImageIcon, Activity, X, BarChart, Megaphone, RotateCcw, Sparkles } from 'lucide-react';

interface AdManagerTabProps {
  ads: AdItem[];
  saveAd: (ad: AdItem) => void;
  deleteAd: (id: string) => void;
  openMediaSelector: (onSelect: (url: string) => void) => void;
}

export function AdManagerTab({ ads, saveAd, deleteAd, openMediaSelector }: AdManagerTabProps) {
  const language = useStore(s => s.language);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);
  const [previewTab, setPreviewTab] = useState<string>('in-article');
  const [trafficApplied, setTrafficApplied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const t = {
    title: language === 'fr' ? 'Campagnes Publicitaires' : 'Advertising Campaigns',
    newCampaign: language === 'fr' ? 'Nouvelle Campagne' : 'New Ad Campaign',
    editCampaign: language === 'fr' ? 'Modifier la Campagne' : 'Modify Campaign Details',
    createCampaign: language === 'fr' ? 'Créer une Campagne Éditrice' : 'Create Publisher Campaign',
    campaignName: language === 'fr' ? 'Nom de la Campagne' : 'Campaign Name',
    placement: language === 'fr' ? 'Positionnement' : 'Position Placement',
    targetUrl: language === 'fr' ? 'Lien de Destination URL' : 'Ad Target URL Link',
    status: language === 'fr' ? 'Statut de Diffusion' : 'Campaign Status',
    tag: language === 'fr' ? 'Étiquette Éditoriale (ex: PARTENAIRE)' : 'Editorial Tag (e.g. PARTENAIRE, SPONSOR)',
    cta: language === 'fr' ? 'Phrase d\'Action du Bouton (CTA)' : 'CTA Button Phrase',
    desc: language === 'fr' ? 'Description Courte (Optionnel)' : 'Campaign Description Copy (Optional)',
    visual: language === 'fr' ? 'Bannière Visuelle (Image ou GIF)' : 'Campaign Visual banner (GIF or Image)',
    mediaLib: language === 'fr' ? 'Choisir depuis la Médiathèque' : 'Choose from Media Library',
    pasteUrl: language === 'fr' ? 'Ou coller l\'URL de l\'image...' : 'Or paste external banner image URL...',
    cancel: language === 'fr' ? 'Annuler' : 'Cancel',
    save: language === 'fr' ? 'Enregistrer la Campagne' : 'Save Campaign',
    tableName: language === 'fr' ? 'Nom de la Campagne' : 'Campaign Name',
    tablePlacement: language === 'fr' ? 'Position' : 'Placement',
    tableStatus: language === 'fr' ? 'Statut' : 'Status',
    tablePreview: language === 'fr' ? 'Bannière' : 'Banner Preview',
    tableStats: language === 'fr' ? 'Rapports de Diffusion' : 'Performance Report',
    tableActions: language === 'fr' ? 'Actions' : 'Actions',
    serving: language === 'fr' ? 'En Ligne' : 'Serving',
    paused: language === 'fr' ? 'Suspendu' : 'Paused',
    noAds: language === 'fr' ? 'Aucune campagne active. Cliquez sur "Nouvelle Campagne" pour commencer.' : 'No publisher ad campaigns loaded. Click Create to launch an orange/societe campaign.',
    previewTitle: language === 'fr' ? 'Aperçu Visuel en Direct' : 'Live Visual Ad Sandbox',
    simulateTraffic: language === 'fr' ? 'Simuler du Trafic Publicitaire' : 'Simulate Delivery Traffic',
    resetTraffic: language === 'fr' ? 'Réinitialiser les Statistiques' : 'Reset Performance Stats',
    headerDesc: language === 'fr' ? 'Gérez et liez les bannières publicitaires interactives affichées à travers le journal.' : 'Manage and direct interactive sponsor and publisher banner campaigns across the platform.',
    performanceSuite: language === 'fr' ? 'Performance Globale des Annonces' : 'Universal Delivery Metrics'
  };

  const handleEdit = (ad?: AdItem) => {
    if (ad) {
      setEditingAd({ ...ad });
      setPreviewTab(ad.position as any);
    } else {
      setEditingAd({
        id: Date.now().toString(),
        name: '',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&fit=crop',
        targetUrl: 'https://google.com',
        position: 'in-article',
        active: true,
        tag: 'SPONSORISÉ',
        description: language === 'fr' ? 'Découvrez notre offre exclusive réservée aux lecteurs de Perspective.' : 'Discover our exclusive publisher package tailored for Perspective readers.',
        ctaText: language === 'fr' ? 'Découvrir' : 'Learn More',
        impressions: 0,
        clicks: 0
      });
      setPreviewTab('in-article');
    }
  };

  const selectAdImage = () => {
    openMediaSelector((url) => {
      if (editingAd) {
        setEditingAd({ ...editingAd, imageUrl: url });
      }
    });
  };

  // Traffic generator simulation helper
  const handleSimulateTraffic = () => {
    ads.forEach(ad => {
      const addedImpressions = Math.floor(Math.random() * 3000) + 500;
      const addedClicks = Math.floor(addedImpressions * (Math.random() * 0.04 + 0.015)); // 1.5% to 5.5% CTR
      saveAd({
        ...ad,
        impressions: (ad.impressions || 0) + addedImpressions,
        clicks: (ad.clicks || 0) + addedClicks
      });
    });
    setTrafficApplied(true);
    setTimeout(() => setTrafficApplied(false), 2000);
  };

  // Reset metrics helper
  const handleResetMetrics = () => {
    if (confirm(language === 'fr' ? 'Voulez-vous réinitialiser toutes les impressions et clics à zéro ?' : 'Reset all campaign impressions and click tracking back to zero?')) {
      ads.forEach(ad => {
        saveAd({
          ...ad,
          impressions: 0,
          clicks: 0
        });
      });
    }
  };

  // Compute total platform metrics to display in a summary block
  const totalImpressions = ads.reduce((acc, curr) => acc + (curr.impressions || 0), 0);
  const totalClicks = ads.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-brand-dark pb-3">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{t.title}</h2>
          <p className="text-xs text-brand-muted uppercase font-semibold mt-1">{t.headerDesc}</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
          <button 
            onClick={handleSimulateTraffic}
            className={`flex items-center gap-2 border border-[#E85D42] text-[#E85D42] hover:bg-[#E85D42]/5 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${trafficApplied ? 'scale-95 bg-orange-50 dark:bg-orange-950/20' : ''}`}
            title="Simulate impressions and clicks randomly"
          >
            <Sparkles size={14} className={trafficApplied ? 'animate-spin' : ''} />
            {trafficApplied ? (language === 'fr' ? 'Trafic Généré !' : 'Traffic Injected!') : t.simulateTraffic}
          </button>
          
          <button 
            onClick={handleResetMetrics}
            className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-3 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer"
            title="Reset statistics to zero"
          >
            <RotateCcw size={14} />
          </button>

          <button 
            onClick={() => handleEdit()} 
            className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus size={16} /> {t.newCampaign}
          </button>
        </div>
      </div>

      {/* Global Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950 text-white p-6 border-b-4 border-[#E85D42] shadow-md">
        <div>
          <span className="text-[10px] text-zinc-400 font-black block uppercase tracking-wider">{language === 'fr' ? 'Impressions Globales' : 'Total Deliveries (Impressions)'}</span>
          <span className="text-2xl font-black font-mono text-[#E85D42]">{totalImpressions.toLocaleString()}</span>
        </div>
        <div className="border-t md:border-t-0 md:border-x border-zinc-800 pt-4 md:pt-0 md:px-6">
          <span className="text-[10px] text-zinc-400 font-black block uppercase tracking-wider">{language === 'fr' ? 'Clics Enregistrés' : 'Total Conversions (Clicks)'}</span>
          <span className="text-2xl font-black font-mono text-white">{totalClicks.toLocaleString()}</span>
        </div>
        <div className="border-t md:border-t-0 pt-4 md:pt-0 md:pl-6">
          <span className="text-[10px] text-zinc-400 font-black block uppercase tracking-wider">{language === 'fr' ? 'Taux de Clic Moyen (CTR)' : 'Average Click-Through (CTR)'}</span>
          <span className="text-2xl font-black font-mono text-emerald-400">{avgCtr.toFixed(2)}%</span>
        </div>
      </div>

      {/* Campaign Editor Pane */}
      {editingAd && (
        <div className="bg-zinc-900/90 backdrop-blur-md p-6 shadow-2xl border border-zinc-800 rounded-lg relative animate-fadeIn">
          <button 
            onClick={() => setEditingAd(null)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
          >
            <X size={18} />
          </button>
          
          <h3 className="font-extrabold uppercase tracking-widest text-lg mb-6 text-[#E85D42] flex items-center gap-2">
            <Megaphone size={18} />
            {editingAd.name ? t.editCampaign : t.createCampaign}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">{t.campaignName}</label>
                  <input 
                    value={editingAd.name} 
                    onChange={e => setEditingAd({ ...editingAd, name: e.target.value })} 
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md" 
                    placeholder="e.g. Orange Senegal Promo Été" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">{t.placement}</label>
                  <select 
                    value={editingAd.position} 
                    onChange={e => {
                      const pos = e.target.value as any;
                      setEditingAd({ ...editingAd, position: pos });
                      setPreviewTab(pos);
                    }} 
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-md"
                  >
                    <option value="in-article">{language === 'fr' ? 'Bannière d\'Article (Large)' : 'In-Article Banner (Wide)'}</option>
                    <option value="header">{language === 'fr' ? 'Bannière d\'En-tête (Leaderboard)' : 'Header Banner (Top Wide)'}</option>
                    <option value="sidebar">{language === 'fr' ? 'Encart Latéral (Carré Sidebar Général)' : 'Sidebar Square (General Box)'}</option>
                    <option value="homepage-between">{language === 'fr' ? 'Annonce Entre-Articles (ex: Senegal Maritime)' : 'Homepage In-between Articles Ad'}</option>
                    <option value="sidebar-cafe">{language === 'fr' ? 'Sponsor Latéral #1 (ex: Café Sénégal Touba)' : 'Sidebar Sponsor #1 (e.g. Café Sénégal)'}</option>
                    <option value="sidebar-ter">{language === 'fr' ? 'Sponsor Latéral #2 (ex: TER Trans-Dakar)' : 'Sidebar Sponsor #2 (e.g. TER Trans-Dakar)'}</option>
                    <option value="far-left">{language === 'fr' ? 'Bannière Extrême Gauche' : 'Far Left Panel Ad'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                    {language === 'fr' ? 'Couleur de Fond de la Carte' : 'Card Background Color / Style'}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={editingAd.bgColor || ''} 
                      onChange={e => setEditingAd({ ...editingAd, bgColor: e.target.value })} 
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-mono focus:outline-none focus:border-[#E85D42] rounded-md" 
                      placeholder="#0f172a or rgba(245, 158, 11, 0.12)" 
                    />
                    <div 
                      className="w-8 h-8 rounded border border-zinc-700 shrink-0" 
                      style={{ backgroundColor: editingAd.bgColor || '#18181b' }}
                      title="Color Preview"
                    />
                  </div>
                </div>
                {editingAd.position === 'far-left' && (
                  <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                        {language === 'fr' ? 'Largeur (px)' : 'Width (px)'}
                      </label>
                      <input 
                        type="number"
                        value={editingAd.width || 120} 
                        onChange={e => setEditingAd({ ...editingAd, width: parseInt(e.target.value) || 120 })} 
                        className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] rounded-md" 
                        placeholder="e.g. 120" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                        {language === 'fr' ? 'Hauteur (px)' : 'Height (px)'}
                      </label>
                      <input 
                        type="number"
                        value={editingAd.height || 600} 
                        onChange={e => setEditingAd({ ...editingAd, height: parseInt(e.target.value) || 600 })} 
                        className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] rounded-md" 
                        placeholder="e.g. 600" 
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">{t.targetUrl}</label>
                  <input 
                    type="url" 
                    value={editingAd.targetUrl} 
                    onChange={e => setEditingAd({ ...editingAd, targetUrl: e.target.value })} 
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md" 
                    placeholder="https://orange.sn/promo" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">{t.status}</label>
                  <select 
                    value={editingAd.active ? 'active' : 'paused'} 
                    onChange={e => setEditingAd({ ...editingAd, active: e.target.value === 'active' })} 
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-md"
                  >
                    <option value="active">{language === 'fr' ? 'Active (Diffusion immédiate)' : 'Active (Serving)'}</option>
                    <option value="paused">{language === 'fr' ? 'Suspendu / Brouillon' : 'Paused / Draft'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">{t.tag}</label>
                  <input 
                    value={editingAd.tag || ''} 
                    onChange={e => setEditingAd({ ...editingAd, tag: e.target.value })} 
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md" 
                    placeholder="e.g. SPONSORISÉ or EXCLUSIVE METRICS" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">{t.cta}</label>
                  <input 
                    value={editingAd.ctaText || ''} 
                    onChange={e => setEditingAd({ ...editingAd, ctaText: e.target.value })} 
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md" 
                    placeholder="e.g. En savoir plus or Learn More" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">{t.desc}</label>
                <textarea 
                  value={editingAd.description || ''} 
                  onChange={e => setEditingAd({ ...editingAd, description: e.target.value })} 
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs leading-relaxed focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md" 
                  rows={2}
                  placeholder="Write a brief description copy for native blocks..." 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">{t.visual}</label>
                <div className="flex flex-col sm:flex-row gap-4 items-start bg-zinc-950/80 p-3.5 border border-zinc-800 rounded-md">
                  {editingAd.imageUrl && (
                    <img src={editingAd.imageUrl} alt="Ad Preview" className="h-20 w-32 border border-zinc-800 object-cover bg-zinc-900 shadow-sm rounded-xs" />
                  )}
                  <div className="flex flex-col gap-2 flex-grow w-full">
                    <button 
                      type="button"
                      onClick={selectAdImage} 
                      className="border border-[#E85D42] text-[#E85D42] font-extrabold hover:bg-[#E85D42]/10 flex items-center justify-center gap-2 py-2 text-[10px] uppercase cursor-pointer rounded-xs"
                    >
                      <ImageIcon size={14} /> {t.mediaLib}
                    </button>
                    <input 
                      value={editingAd.imageUrl} 
                      onChange={e => setEditingAd({ ...editingAd, imageUrl: e.target.value })} 
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs focus:outline-none focus:border-[#E85D42] placeholder-zinc-500 rounded-md" 
                      placeholder={t.pasteUrl} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sandbox Live Layout Preview Column */}
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-brand-border p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-brand-border pb-2.5 mb-4">
                  <h4 className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300 tracking-wider flex items-center gap-1.5">
                    <Activity size={12} className="text-[#E85D42]" />
                    {t.previewTitle}
                  </h4>
                  <div className="flex flex-wrap bg-black p-0.5 border border-zinc-700 text-[8px] font-black rounded-sm gap-0.5">
                    {(['header', 'sidebar', 'in-article', 'homepage-between', 'sidebar-cafe', 'far-left'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setPreviewTab(p)}
                        className={`px-1.5 py-0.5 uppercase transition-all ${previewTab === p ? 'bg-[#E85D42] text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rendered Mock Canvas */}
                <div className="bg-grid-ambient p-4 min-h-[220px] flex items-center justify-center border border-dashed border-zinc-300/60 dark:border-zinc-700 bg-white dark:bg-zinc-950 relative overflow-hidden">
                  <span className="absolute bottom-1 right-2 text-[8px] font-mono font-bold tracking-widest text-[#E85D42] uppercase animate-pulse">{previewTab} preview</span>
                  
                  {previewTab === 'header' && (
                    <div className="w-full relative group">
                      <div className="absolute top-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm text-[6px] tracking-widest px-1 font-bold text-zinc-400 border-l border-b border-brand-border uppercase">Publicité • Header</div>
                      {editingAd.imageUrl && editingAd.imageUrl.trim() !== '' ? (
                        <img src={editingAd.imageUrl} className="w-full h-12 object-cover border border-brand-border bg-zinc-50" alt="Preview Header" />
                      ) : (
                        <div className="w-full h-12 border border-brand-border bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-500 font-mono">HEADER IMAGE PLACEHOLDER</div>
                      )}
                      <div className="text-[9px] font-bold text-zinc-700 dark:text-zinc-300 mt-1.5 line-clamp-1">{editingAd.name}</div>
                    </div>
                  )}

                  {previewTab === 'sidebar' && (
                    <div className="w-full max-w-[200px] bg-zinc-50 dark:bg-zinc-900 border border-brand-border p-3 flex flex-col gap-2 relative shadow-sm">
                      <div className="absolute right-0 top-0 text-[6px] font-black uppercase bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 border-b border-l border-brand-border">AD SPACE</div>
                      {editingAd.imageUrl && (
                        <img src={editingAd.imageUrl} alt={editingAd.name} className="w-full h-24 object-cover border border-zinc-100 dark:border-zinc-800" />
                      )}
                      <div>
                        {editingAd.tag && <span className="text-[7px] font-black uppercase text-[#E85D42] tracking-widest block">{editingAd.tag}</span>}
                        <h5 className="font-extrabold text-[11px] leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-1">{editingAd.name}</h5>
                        {editingAd.description && <p className="text-[9px] text-zinc-500 line-clamp-2 leading-snug">{editingAd.description}</p>}
                      </div>
                      {editingAd.ctaText && (
                        <div className="w-full bg-[#E85D42] text-white py-1 text-center text-[7px] font-black uppercase tracking-widest leading-none">
                          {editingAd.ctaText}
                        </div>
                      )}
                    </div>
                  )}

                  {previewTab === 'in-article' && (
                    <div className="w-full bg-brand-soft border border-brand-border p-3.5 relative flex flex-col sm:flex-row gap-3 shadow-inner">
                      <span className="absolute top-0 right-0 bg-brand-white/80 dark:bg-zinc-900 text-[6px] uppercase px-1.5 py-0.5 font-bold text-brand-muted border-l border-b border-brand-border">{editingAd.tag || 'SPONSORISÉ'}</span>
                      {editingAd.imageUrl && (
                        <div className="w-full sm:w-24 h-16 shrink-0 overflow-hidden border border-brand-border bg-zinc-50">
                          <img src={editingAd.imageUrl} alt="Ad text preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1">{editingAd.name || 'Sample Ad Name'}</h4>
                          {editingAd.description && (
                            <p className="text-[10px] text-zinc-500 line-clamp-2 leading-tight mt-0.5">{editingAd.description}</p>
                          )}
                        </div>
                        <div className="flex justify-end mt-2">
                          <span className="bg-[#E85D42] text-white text-[8px] font-extrabold px-2 py-1 uppercase tracking-widest">
                            {editingAd.ctaText || 'En savoir plus'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(previewTab === 'homepage-between' || previewTab === 'sidebar-cafe' || previewTab === 'far-left') && (
                    <div 
                      className="w-full p-3.5 relative flex flex-col sm:flex-row gap-3 items-center justify-between border"
                      style={{ 
                        backgroundColor: editingAd.bgColor || '#0f172a', 
                        color: editingAd.textColor || '#ffffff',
                        borderColor: '#334155'
                      }}
                    >
                      <span className="absolute top-0 right-0 bg-black/40 text-[6px] uppercase px-1.5 py-0.5 font-bold text-zinc-300">
                        {editingAd.tag || 'SPONSORISÉ'}
                      </span>
                      {editingAd.imageUrl && (
                        <img src={editingAd.imageUrl} alt={editingAd.name} className="w-12 h-12 object-cover rounded shrink-0 border border-white/10" />
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <h4 className="font-black text-xs uppercase tracking-wider line-clamp-1" style={{ color: editingAd.textColor || '#ffffff' }}>
                          {editingAd.name || 'PARTENAIRE SPONSOR'}
                        </h4>
                        <p className="text-[9px] opacity-80 line-clamp-2 leading-tight mt-0.5">
                          {editingAd.description || 'Description de la campagne publicitaire'}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-[#E85D42] text-white text-[8px] font-extrabold uppercase tracking-widest shrink-0">
                        {editingAd.ctaText || 'RÉSERVER'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Panel Save/Cancel controls */}
              <div className="flex gap-2 justify-end pt-4 mt-4 border-t border-brand-border">
                <button 
                  onClick={() => setEditingAd(null)} 
                  className="px-4 py-2 border border-zinc-200 text-[10px] font-black uppercase tracking-wider hover:bg-zinc-50 cursor-pointer dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={() => { 
                    saveAd({
                      ...editingAd,
                      impressions: editingAd.impressions || 0,
                      clicks: editingAd.clicks || 0
                    }); 
                    setEditingAd(null); 
                  }} 
                  className="bg-[#E85D42] text-white hover:bg-[#c94931] px-5 py-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  disabled={!editingAd.name || !editingAd.imageUrl}
                >
                  {t.save}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Campaigns Listing Block */}
      <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-xl overflow-x-auto rounded-lg">
        <table className="w-full text-left font-sans text-sm whitespace-nowrap">
          <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] uppercase tracking-widest text-[#E85D42] font-black">
            <tr>
              <th className="px-6 py-4">{t.tableName}</th>
              <th className="px-6 py-4">{t.tablePlacement}</th>
              <th className="px-6 py-4">{t.tableStatus}</th>
              <th className="px-6 py-4">{t.tablePreview}</th>
              <th className="px-6 py-4">{t.tableStats}</th>
              <th className="px-6 py-4 text-right">{t.tableActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {ads.map(ad => {
              const adCtr = (ad.impressions || 0) > 0 ? ((ad.clicks || 0) / (ad.impressions || 0)) * 100 : 0;
              return (
                <tr key={ad.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-extrabold text-zinc-100 block">{ad.name}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[200px] block font-mono">{ad.targetUrl}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 text-[9px] font-black font-mono border border-zinc-700 bg-zinc-950 text-zinc-300 uppercase rounded-xs">
                      {ad.position}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border rounded-xs ${
                      ad.active 
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}>
                      {ad.active ? t.serving : t.paused}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-8 w-20 border border-zinc-800 overflow-hidden bg-zinc-950 shadow-sm rounded-xs flex items-center justify-center">
                      {ad.imageUrl && ad.imageUrl.trim() !== '' ? (
                        <img src={ad.imageUrl} alt={ad.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-zinc-600 font-mono">NO IMAGE</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">{language === 'fr' ? 'Impressions • Clics' : 'Imps • Clicks'}</span>
                      <span className="font-bold text-zinc-200">
                        {(ad.impressions || 0).toLocaleString()} <span className="text-zinc-500 font-light">•</span> {(ad.clicks || 0).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold mt-0.5 bg-emerald-950/60 px-1 py-0.2 w-fit rounded-xs border border-emerald-800/40">
                        CTR: {adCtr.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => handleEdit(ad)} 
                        className="p-2 text-zinc-500 hover:text-[#E85D42] dark:text-zinc-400 dark:hover:text-white hover:bg-[#E85D42]/5 transition-colors cursor-pointer rounded-sm" 
                        title="Edit Campaign"
                      >
                        <Edit2 size={14} />
                      </button>
                      {deleteConfirmId === ad.id ? (
                        <div className="flex items-center gap-1.5 animate-fadeIn">
                          <button
                            onClick={() => {
                              deleteAd(ad.id);
                              setDeleteConfirmId(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-black text-[9px] px-2 py-1 uppercase tracking-wider cursor-pointer"
                          >
                            {language === 'fr' ? 'Confirmer' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-[9px] px-2 py-1 uppercase tracking-wider cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700"
                          >
                            {language === 'fr' ? 'Annuler' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirmId(ad.id)} 
                          className="p-2 text-zinc-400 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer rounded-sm" 
                          title="Delete Campaign"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {ads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-extrabold text-xs uppercase tracking-widest bg-white dark:bg-zinc-950 border-b border-brand-border">
                  {t.noAds}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
