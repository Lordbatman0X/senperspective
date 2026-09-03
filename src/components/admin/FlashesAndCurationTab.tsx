import React, { useState } from 'react';
import { useStore } from '../../store';
import { Zap, Globe, Quote, Plus, Trash2, Edit2, Check, X, Sparkles, Clock, AlertCircle } from 'lucide-react';

export function FlashesAndCurationTab() {
  const { siteSettings, updateSiteSettings, language } = useStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Flash Info (Analyst Dispatches) State
  const [analystDispatches, setAnalystDispatches] = useState<any[]>(siteSettings?.analystDispatches || [
    { id: 'disp-0', time: '16:00 DKR', contentFr: "Lancement des travaux de curage des canaux à Wakhinane, Yeumbeul et Rufisque par la DPGI et la SONAGED face aux risques d'inondations.", contentEn: "Launch of canal dredging operations in Wakhinane, Yeumbeul, and Rufisque by DPGI and SONAGED ahead of flood risks.", level: 'pulse' },
    { id: 'disp-1', time: '14:22 DKR', contentFr: "Tensions d'arbitrage levées sur l'axe maritime Dakar-Gorée.", contentEn: "Maritime transit clearance issued for the Dakar-Gorée axis.", level: 'standard' }
  ]);

  const [newFlashFr, setNewFlashFr] = useState('');
  const [newFlashEn, setNewFlashEn] = useState('');
  const [newFlashLevel, setNewFlashLevel] = useState('standard');
  const [newFlashTime, setNewFlashTime] = useState('16:30 DKR');

  const handleAddFlash = () => {
    if (!newFlashFr.trim() || !newFlashEn.trim()) {
      showToast(language === 'fr' ? 'Veuillez remplir le flash en français et en anglais.' : 'Please provide flash text in both languages.');
      return;
    }
    const updated = [
      {
        id: `disp-${Date.now()}`,
        time: newFlashTime || '16:00 DKR',
        contentFr: newFlashFr.trim(),
        contentEn: newFlashEn.trim(),
        level: newFlashLevel
      },
      ...analystDispatches
    ];
    setAnalystDispatches(updated);
    updateSiteSettings({ analystDispatches: updated });
    setNewFlashFr('');
    setNewFlashEn('');
    showToast(language === 'fr' ? 'Flash info ajouté et diffusé avec succès !' : 'Flash bulletin added and broadcasted successfully!');
  };

  const handleDeleteFlash = (id: string) => {
    const updated = analystDispatches.filter(d => d.id !== id);
    setAnalystDispatches(updated);
    updateSiteSettings({ analystDispatches: updated });
    showToast(language === 'fr' ? 'Flash info supprimé.' : 'Flash bulletin deleted.');
  };

  // 2. International News (Le Monde Global Briefs) State
  const [internationalNews, setInternationalNews] = useState<any[]>(siteSettings?.leMondeDispatches || [
    {
      id: 'lm-1',
      time: '14:22 GMT',
      tagFr: 'Sommet CEDEAO',
      tagEn: 'ECOWAS Summit',
      titleFr: 'Négociations commerciales & accords de libre-échange Ouest-Africains.',
      titleEn: 'West African trade negotiations and free trade agreements update.',
      excerptFr: 'Les ministres des Finances se sont réunis à Abuja.',
      excerptEn: 'Finance ministers convened in Abuja for tariff consensus.'
    }
  ]);

  const [intTime, setIntTime] = useState('14:30 GMT');
  const [intTagFr, setIntTagFr] = useState('Géopolitique');
  const [intTagEn, setIntTagEn] = useState('Geopolitics');
  const [intTitleFr, setIntTitleFr] = useState('');
  const [intTitleEn, setIntTitleEn] = useState('');
  const [intExcerptFr, setIntExcerptFr] = useState('');
  const [intExcerptEn, setIntExcerptEn] = useState('');

  const handleAddInternational = () => {
    if (!intTitleFr.trim() || !intTitleEn.trim()) {
      showToast(language === 'fr' ? 'Le titre international en français et anglais est requis.' : 'International title in FR and EN is required.');
      return;
    }
    const updated = [
      {
        id: `lm-${Date.now()}`,
        time: intTime || '14:00 GMT',
        tagFr: intTagFr || 'International',
        tagEn: intTagEn || 'International',
        titleFr: intTitleFr.trim(),
        titleEn: intTitleEn.trim(),
        excerptFr: intExcerptFr.trim(),
        excerptEn: intExcerptEn.trim()
      },
      ...internationalNews
    ];
    setInternationalNews(updated);
    updateSiteSettings({ leMondeDispatches: updated });
    setIntTitleFr('');
    setIntTitleEn('');
    setIntExcerptFr('');
    setIntExcerptEn('');
    showToast(language === 'fr' ? 'Actualité internationale ajoutée avec succès !' : 'International brief added successfully!');
  };

  const handleDeleteInternational = (id: string) => {
    const updated = internationalNews.filter(i => i.id !== id);
    setInternationalNews(updated);
    updateSiteSettings({ leMondeDispatches: updated });
    showToast(language === 'fr' ? 'Actualité internationale supprimée.' : 'International brief deleted.');
  };

  // 3. Daily Wisdom (Proverbe du Jour) State
  const [wisdomWolof, setWisdomWolof] = useState(siteSettings?.dailyWisdom?.wolof || "Nila lay doxé, sa gënëg du lënk.");
  const [wisdomFr, setWisdomFr] = useState(siteSettings?.dailyWisdom?.translationFr || "Ceux qui avancent avec sagesse et vérité ne craignent point l'obscurité.");
  const [wisdomEn, setWisdomEn] = useState(siteSettings?.dailyWisdom?.translationEn || "Those who walk in integrity and light never fear the shadow.");
  const [wisdomSrcFr, setWisdomSrcFr] = useState(siteSettings?.dailyWisdom?.sourceFr || "EXP: PROVERBE WOLOF");
  const [wisdomSrcEn, setWisdomSrcEn] = useState(siteSettings?.dailyWisdom?.sourceEn || "EXP: WOLOF PROVERB");

  const handleSaveWisdom = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedWisdom = {
      wolof: wisdomWolof,
      translationFr: wisdomFr,
      translationEn: wisdomEn,
      sourceFr: wisdomSrcFr,
      sourceEn: wisdomSrcEn
    };
    updateSiteSettings({ dailyWisdom: updatedWisdom });
    showToast(language === 'fr' ? 'Proverbe du jour mis à jour et enregistré définitivement !' : 'Daily wisdom updated and permanently saved!');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn font-sans text-zinc-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#E85D42] text-white px-5 py-3 shadow-2xl font-mono text-xs font-black uppercase tracking-widest border border-white/20 animate-pulse">
          ✓ {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-100 flex items-center gap-3">
          <Zap className="text-[#E85D42]" size={32} />
          {language === 'fr' ? 'Flashes, Actualités Internationales & Sagesse' : 'Flashes, International & Daily Wisdom'}
        </h2>
        <p className="text-xs text-zinc-400 uppercase tracking-wider font-mono mt-1">
          {language === 'fr' 
            ? "Gestion centralisée des alertes flash en direct, des brèves internationales et du proverbe wolof quotidien."
            : "Centralized management of live flash alerts, international briefs, and daily Wolof wisdom."}
        </p>
      </div>

      {/* SECTION 1: Flash Infos (Live Ticker) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <Zap className="text-[#E85D42]" size={18} />
            {language === 'fr' ? '1. Flashes d\'Actualité en Direct (Live Ticker)' : '1. Live Breaking Flash Ticker'}
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-orange-950/60 text-orange-400 border border-orange-800">
            {analystDispatches.length} {language === 'fr' ? 'actifs' : 'active'}
          </span>
        </div>

        {/* Add Flash Form */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-lg space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42]">
            {language === 'fr' ? '+ Diffuser un nouveau Flash Info' : '+ Broadcast New Flash Bulletin'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Texte Flash (FR)</label>
              <textarea 
                value={newFlashFr}
                onChange={e => setNewFlashFr(e.target.value)}
                placeholder="Ex: Tensions d'arbitrage levées..."
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Flash Text (EN)</label>
              <textarea 
                value={newFlashEn}
                onChange={e => setNewFlashEn(e.target.value)}
                placeholder="Ex: Maritime transit clearance issued..."
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-20 resize-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Heure / Horodatage (ex: 16:30 DKR)</label>
              <input 
                type="text"
                value={newFlashTime}
                onChange={e => setNewFlashTime(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Niveau d'Alerte</label>
              <select 
                value={newFlashLevel}
                onChange={e => setNewFlashLevel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-bold rounded focus:outline-none focus:border-[#E85D42]"
              >
                <option value="standard">Standard Amber (Information générale)</option>
                <option value="pulse">Pulse Glass (Mise à jour économique)</option>
                <option value="crimson">Crimson Flash (Urgence Politique / Géopolitique)</option>
              </select>
            </div>
          </div>
          <button 
            onClick={handleAddFlash}
            className="px-5 py-2.5 bg-[#E85D42] text-white font-black text-xs uppercase tracking-widest hover:bg-[#d04930] transition-all cursor-pointer rounded"
          >
            {language === 'fr' ? 'Publier et diffuser le flash' : 'Publish & Broadcast Flash'}
          </button>
        </div>

        {/* List of current flashes */}
        <div className="space-y-3">
          {analystDispatches.map((d: any) => (
            <div key={d.id} className="flex items-start justify-between gap-4 p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-[#E85D42]">{d.time}</span>
                  <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded ${d.level === 'crimson' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {d.level || 'standard'}
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-100">FR: {d.contentFr}</p>
                <p className="text-xs text-zinc-400">EN: {d.contentEn}</p>
              </div>
              <button 
                onClick={() => handleDeleteFlash(d.id)}
                className="p-2 text-rose-400 hover:bg-rose-950/40 rounded transition-all cursor-pointer"
                title="Supprimer ce flash"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: International News (Le Monde / Global Briefs) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <Globe className="text-[#E85D42]" size={18} />
            {language === 'fr' ? '2. Actualités Internationales (Le Monde / Global Briefs)' : '2. International News & Global Briefs'}
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-950/60 text-blue-400 border border-blue-800">
            {internationalNews.length} {language === 'fr' ? 'en ligne' : 'online'}
          </span>
        </div>

        {/* Add International Brief Form */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-lg space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42]">
            {language === 'fr' ? '+ Ajouter une brève internationale' : '+ Add International Brief'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Horodatage (ex: 14:22 GMT)</label>
              <input 
                type="text"
                value={intTime}
                onChange={e => setIntTime(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Étiquette (FR)</label>
              <input 
                type="text"
                value={intTagFr}
                onChange={e => setIntTagFr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Tag (EN)</label>
              <input 
                type="text"
                value={intTagEn}
                onChange={e => setIntTagEn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Titre de la brève (FR)</label>
              <input 
                type="text"
                value={intTitleFr}
                onChange={e => setIntTitleFr(e.target.value)}
                placeholder="Titre principal..."
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Brief Title (EN)</label>
              <input 
                type="text"
                value={intTitleEn}
                onChange={e => setIntTitleEn(e.target.value)}
                placeholder="Main title..."
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Extrait / Synthèse (FR)</label>
              <textarea 
                value={intExcerptFr}
                onChange={e => setIntExcerptFr(e.target.value)}
                placeholder="Résumé ou détail..."
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-16 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Excerpt / Summary (EN)</label>
              <textarea 
                value={intExcerptEn}
                onChange={e => setIntExcerptEn(e.target.value)}
                placeholder="Summary or details..."
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-16 resize-none"
              />
            </div>
          </div>
          <button 
            onClick={handleAddInternational}
            className="px-5 py-2.5 bg-[#E85D42] text-white font-black text-xs uppercase tracking-widest hover:bg-[#d04930] transition-all cursor-pointer rounded"
          >
            {language === 'fr' ? 'Ajouter la brève internationale' : 'Add International Brief'}
          </button>
        </div>

        {/* List of international briefs */}
        <div className="space-y-3">
          {internationalNews.map((item: any) => (
            <div key={item.id} className="flex items-start justify-between gap-4 p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-blue-400">{item.time}</span>
                  <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                    {item.tagFr}
                  </span>
                </div>
                <p className="text-xs font-extrabold text-zinc-100">FR: {item.titleFr}</p>
                <p className="text-xs text-zinc-400">EN: {item.titleEn}</p>
              </div>
              <button 
                onClick={() => handleDeleteInternational(item.id)}
                className="p-2 text-rose-400 hover:bg-rose-950/40 rounded transition-all cursor-pointer"
                title="Supprimer cette brève"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Daily Wisdom (Proverbe du Jour) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
          <Quote className="text-[#E85D42]" size={20} />
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">
            {language === 'fr' ? '3. Proverbe du Jour (Daily Wisdom)' : '3. Daily Wisdom Proverb'}
          </h3>
        </div>

        <form onSubmit={handleSaveWisdom} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
              Proverbe Wolof (Texte d'origine)
            </label>
            <input 
              type="text"
              value={wisdomWolof}
              onChange={e => setWisdomWolof(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-3 text-xs font-bold rounded focus:outline-none focus:border-[#E85D42]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Traduction (FR)</label>
              <textarea 
                value={wisdomFr}
                onChange={e => setWisdomFr(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-3 text-xs font-bold rounded h-20 resize-none focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Traduction (EN)</label>
              <textarea 
                value={wisdomEn}
                onChange={e => setWisdomEn(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-3 text-xs font-bold rounded h-20 resize-none focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Source (FR)</label>
              <input 
                type="text"
                value={wisdomSrcFr}
                onChange={e => setWisdomSrcFr(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-bold rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Source (EN)</label>
              <input 
                type="text"
                value={wisdomSrcEn}
                onChange={e => setWisdomSrcEn(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-bold rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              className="px-6 py-3 bg-[#E85D42] text-white font-black text-xs uppercase tracking-widest hover:bg-[#d04930] transition-all cursor-pointer rounded shadow-md"
            >
              {language === 'fr' ? 'Enregistrer le Proverbe du Jour' : 'Save Daily Wisdom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
