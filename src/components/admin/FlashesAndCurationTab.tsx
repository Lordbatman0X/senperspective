import React, { useState } from 'react';
import { useStore } from '../../store';
import { Zap, Globe, Quote, Plus, Trash2, Edit2, Check, X, Sparkles, Clock, AlertCircle, FolderKanban, Megaphone, Upload, TrendingUp, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

export function FlashesAndCurationTab() {
  const { siteSettings, updateSiteSettings, language, media, articles } = useStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Abdel Intro Message state
  const [abdelIntroFr, setAbdelIntroFr] = useState(siteSettings?.abdelIntroMessageFr || "Bonjour ! Je suis Abdel, votre guide d'actualité sur Perspective Group. Que souhaitez-vous décrypter aujourd'hui ?");
  const [abdelIntroEn, setAbdelIntroEn] = useState(siteSettings?.abdelIntroMessageEn || "Hello! I am Abdel, your news guide on Perspective Group. What would you like to unpack today?");

  const handleSaveAbdelIntro = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteSettings({
      abdelIntroMessageFr: abdelIntroFr,
      abdelIntroMessageEn: abdelIntroEn
    });
    showToast(language === 'fr' ? 'Message d\'introduction d\'Abdel mis à jour et enregistré !' : 'Abdel introduction message updated and saved!');
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
    showToast(language === 'fr' ? 'Flash info ajouté et enregistré en MongoDB !' : 'Flash bulletin added and saved in MongoDB!');
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
    showToast(language === 'fr' ? 'Actualité internationale ajoutée et enregistrée !' : 'International brief added and saved!');
  };

  const handleDeleteInternational = (id: string) => {
    const updated = internationalNews.filter(i => i.id !== id);
    setInternationalNews(updated);
    updateSiteSettings({ leMondeDispatches: updated });
    showToast(language === 'fr' ? 'Actualité internationale supprimée.' : 'International brief deleted.');
  };

  // 3. Dossiers & Enquêtes Management State
  const [dossiersList, setDossiersList] = useState<any[]>(siteSettings?.dossiers || []);
  const [dosTagFr, setDosTagFr] = useState('Dossier Macro');
  const [dosTagEn, setDosTagEn] = useState('Macro Dossier');
  const [dosTitleFr, setDosTitleFr] = useState('');
  const [dosTitleEn, setDosTitleEn] = useState('');
  const [dosDescFr, setDosDescFr] = useState('');
  const [dosDescEn, setDosDescEn] = useState('');
  const [dosReadTime, setDosReadTime] = useState('10 MIN');
  const [dosFullFr, setDosFullFr] = useState('');
  const [dosFullEn, setDosFullEn] = useState('');

  const handleAddDossier = () => {
    if (!dosTitleFr.trim() || !dosTitleEn.trim()) {
      showToast(language === 'fr' ? 'Le titre du dossier est requis.' : 'Dossier title is required.');
      return;
    }
    const updated = [
      {
        id: `dos-${Date.now()}`,
        tag: { fr: dosTagFr, en: dosTagEn },
        titleFr: dosTitleFr.trim(),
        titleEn: dosTitleEn.trim(),
        descFr: dosDescFr.trim(),
        descEn: dosDescEn.trim(),
        readTime: dosReadTime || '10 MIN',
        fullTextFr: dosFullFr.trim() || dosDescFr.trim(),
        fullTextEn: dosFullEn.trim() || dosDescEn.trim(),
        key1Fr: 'Analyse sectorielle approfondie',
        key1En: 'In-depth sector analysis',
        key2Fr: 'Enjeux économiques et stratégiques majeurs',
        key2En: 'Major economic and strategic stakes'
      },
      ...dossiersList
    ];
    setDossiersList(updated);
    updateSiteSettings({ dossiers: updated });
    setDosTitleFr('');
    setDosTitleEn('');
    setDosDescFr('');
    setDosDescEn('');
    setDosFullFr('');
    setDosFullEn('');
    showToast(language === 'fr' ? 'Dossier ajouté et enregistré en MongoDB !' : 'Dossier added and saved in MongoDB!');
  };

  const handleDeleteDossier = (id: string) => {
    const updated = dossiersList.filter(d => d.id !== id);
    setDossiersList(updated);
    updateSiteSettings({ dossiers: updated });
    showToast(language === 'fr' ? 'Dossier supprimé.' : 'Dossier deleted.');
  };

  // 4. Announcements / Annonces Management State
  const [announcementsList, setAnnouncementsList] = useState<any[]>(siteSettings?.announcements || []);
  const [annTitleFr, setAnnTitleFr] = useState('');
  const [annTitleEn, setAnnTitleEn] = useState('');
  const [annTextFr, setAnnTextFr] = useState('');
  const [annTextEn, setAnnTextEn] = useState('');
  const [annImageUrl, setAnnImageUrl] = useState('');
  const [annLink, setAnnLink] = useState('#');

  const handleAddAnnouncement = () => {
    if (!annTitleFr.trim() || !annTitleEn.trim()) {
      showToast(language === 'fr' ? 'Le titre de l\'annonce est requis.' : 'Announcement title is required.');
      return;
    }
    const updated = [
      {
        id: `ann-${Date.now()}`,
        titleFr: annTitleFr.trim(),
        titleEn: annTitleEn.trim(),
        textFr: annTextFr.trim(),
        textEn: annTextEn.trim(),
        imageUrl: annImageUrl.trim() || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
        link: annLink.trim() || '#'
      },
      ...announcementsList
    ];
    setAnnouncementsList(updated);
    updateSiteSettings({ announcements: updated });
    setAnnTitleFr('');
    setAnnTitleEn('');
    setAnnTextFr('');
    setAnnTextEn('');
    setAnnImageUrl('');
    setAnnLink('#');
    showToast(language === 'fr' ? 'Annonce publiée et enregistrée en MongoDB !' : 'Announcement published and saved in MongoDB!');
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcementsList.filter(a => a.id !== id);
    setAnnouncementsList(updated);
    updateSiteSettings({ announcements: updated });
    showToast(language === 'fr' ? 'Annonce supprimée.' : 'Announcement deleted.');
  };

  // 5. Daily Wisdom (Proverbe du Jour) State
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

  // 6. Curation des Sections Latérales (Trendings & Latest News)
  const [curatedTrendingIds, setCuratedTrendingIds] = useState<string[]>(
    siteSettings?.curatedTrendingArticleIds || []
  );
  const [curatedLatestIds, setCuratedLatestIds] = useState<string[]>(
    siteSettings?.curatedLatestNewsArticleIds || []
  );

  const [selectedTrendingToAdd, setSelectedTrendingToAdd] = useState('');
  const [selectedLatestToAdd, setSelectedLatestToAdd] = useState('');

  const handleAddTrendingArticle = () => {
    if (!selectedTrendingToAdd) return;
    if (curatedTrendingIds.includes(selectedTrendingToAdd)) {
      showToast(language === 'fr' ? 'Cet article est déjà dans la section Tendances.' : 'Article is already in Trendings.');
      return;
    }
    const updated = [...curatedTrendingIds, selectedTrendingToAdd];
    setCuratedTrendingIds(updated);
    updateSiteSettings({ curatedTrendingArticleIds: updated });
    setSelectedTrendingToAdd('');
    showToast(language === 'fr' ? 'Article ajouté aux Tendances !' : 'Article added to Trendings!');
  };

  const handleRemoveTrendingArticle = (id: string) => {
    const updated = curatedTrendingIds.filter(i => i !== id);
    setCuratedTrendingIds(updated);
    updateSiteSettings({ curatedTrendingArticleIds: updated });
    showToast(language === 'fr' ? 'Article retiré des Tendances.' : 'Article removed from Trendings.');
  };

  const handleMoveTrending = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= curatedTrendingIds.length) return;
    const updated = [...curatedTrendingIds];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setCuratedTrendingIds(updated);
    updateSiteSettings({ curatedTrendingArticleIds: updated });
  };

  const handleReplaceTrending = (index: number, newArticleId: string) => {
    if (!newArticleId) return;
    const updated = [...curatedTrendingIds];
    updated[index] = newArticleId;
    setCuratedTrendingIds(updated);
    updateSiteSettings({ curatedTrendingArticleIds: updated });
    showToast(language === 'fr' ? 'Article remplacé dans les Tendances !' : 'Article replaced in Trendings!');
  };

  const handleAddLatestArticle = () => {
    if (!selectedLatestToAdd) return;
    if (curatedLatestIds.includes(selectedLatestToAdd)) {
      showToast(language === 'fr' ? 'Cet article est déjà dans Dernières Actualités.' : 'Article is already in Latest News.');
      return;
    }
    const updated = [...curatedLatestIds, selectedLatestToAdd];
    setCuratedLatestIds(updated);
    updateSiteSettings({ curatedLatestNewsArticleIds: updated });
    setSelectedLatestToAdd('');
    showToast(language === 'fr' ? 'Article ajouté aux Dernières Actualités !' : 'Article added to Latest News!');
  };

  const handleRemoveLatestArticle = (id: string) => {
    const updated = curatedLatestIds.filter(i => i !== id);
    setCuratedLatestIds(updated);
    updateSiteSettings({ curatedLatestNewsArticleIds: updated });
    showToast(language === 'fr' ? 'Article retiré des Dernières Actualités.' : 'Article removed from Latest News.');
  };

  const handleMoveLatest = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= curatedLatestIds.length) return;
    const updated = [...curatedLatestIds];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setCuratedLatestIds(updated);
    updateSiteSettings({ curatedLatestNewsArticleIds: updated });
  };

  const handleReplaceLatest = (index: number, newArticleId: string) => {
    if (!newArticleId) return;
    const updated = [...curatedLatestIds];
    updated[index] = newArticleId;
    setCuratedLatestIds(updated);
    updateSiteSettings({ curatedLatestNewsArticleIds: updated });
    showToast(language === 'fr' ? 'Article remplacé dans Dernières Actualités !' : 'Article replaced in Latest News!');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn font-sans text-zinc-100 pb-12">
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
          {language === 'fr' ? 'Flashes, Actualités, Dossiers & Abdel' : 'Flashes, Curation, Dossiers & Abdel'}
        </h2>
        <p className="text-xs text-zinc-400 uppercase tracking-wider font-mono mt-1">
          {language === 'fr' 
            ? "Gestion centralisée et persistance MongoDB des alertes flash, brèves internationales, dossiers, annonces et message d'Abdel."
            : "Centralized management and MongoDB persistence for flash alerts, international briefs, dossiers, announcements, and Abdel's intro."}
        </p>
      </div>

      {/* SECTION 0: Abdel Introduction Message Configuration */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
          <Sparkles className="text-[#E85D42]" size={20} />
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">
            {language === 'fr' ? '0. Message d\'Introduction d\'Abdel (AI Guide)' : '0. Abdel Introduction Message (AI Guide)'}
          </h3>
        </div>

        <form onSubmit={handleSaveAbdelIntro} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Message d'accueil (FR)
              </label>
              <textarea 
                value={abdelIntroFr}
                onChange={e => setAbdelIntroFr(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-3 text-xs font-medium rounded h-24 resize-none focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Greeting Message (EN)
              </label>
              <textarea 
                value={abdelIntroEn}
                onChange={e => setAbdelIntroEn(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-3 text-xs font-medium rounded h-24 resize-none focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>
          <div>
            <button 
              type="submit"
              className="px-6 py-3 bg-[#E85D42] text-white font-black text-xs uppercase tracking-widest hover:bg-[#d04930] transition-all cursor-pointer rounded shadow-md"
            >
              {language === 'fr' ? 'Enregistrer le Message d\'Abdel' : 'Save Abdel Message'}
            </button>
          </div>
        </form>
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Heure / Horodatage</label>
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
                <option value="standard">Standard Amber</option>
                <option value="pulse">Pulse Glass</option>
                <option value="crimson">Crimson Flash</option>
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

        <div className="space-y-3">
          {analystDispatches.map((d: any) => (
            <div key={d.id} className="flex items-start justify-between gap-4 p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-[#E85D42]">{d.time}</span>
                  <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                    {d.level || 'standard'}
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-100">FR: {d.contentFr}</p>
                <p className="text-xs text-zinc-400">EN: {d.contentEn}</p>
              </div>
              <button 
                onClick={() => handleDeleteFlash(d.id)}
                className="p-2 text-rose-400 hover:bg-rose-950/40 rounded transition-all cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: International News (Le Monde) */}
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

        <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-lg space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42]">
            {language === 'fr' ? '+ Ajouter une brève internationale' : '+ Add International Brief'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Horodatage</label>
              <input 
                type="text"
                value={intTime}
                onChange={e => setIntTime(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Tag (FR)</label>
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Titre (FR)</label>
              <input 
                type="text"
                value={intTitleFr}
                onChange={e => setIntTitleFr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Title (EN)</label>
              <input 
                type="text"
                value={intTitleEn}
                onChange={e => setIntTitleEn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Extrait (FR)</label>
              <textarea 
                value={intExcerptFr}
                onChange={e => setIntExcerptFr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-16 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Excerpt (EN)</label>
              <textarea 
                value={intExcerptEn}
                onChange={e => setIntExcerptEn(e.target.value)}
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
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Dossiers & Enquêtes Management */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <FolderKanban className="text-[#E85D42]" size={18} />
            {language === 'fr' ? '3. Dossiers & Enquêtes (Sidebar Section)' : '3. Dossiers & Investigations'}
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800">
            {dossiersList.length} {language === 'fr' ? 'dossiers' : 'dossiers'}
          </span>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-lg space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42]">
            {language === 'fr' ? '+ Créer un nouveau Dossier' : '+ Create New Dossier'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Tag FR</label>
              <input 
                type="text"
                value={dosTagFr}
                onChange={e => setDosTagFr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Tag EN</label>
              <input 
                type="text"
                value={dosTagEn}
                onChange={e => setDosTagEn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Temps de lecture</label>
              <input 
                type="text"
                value={dosReadTime}
                onChange={e => setDosReadTime(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Titre (FR)</label>
              <input 
                type="text"
                value={dosTitleFr}
                onChange={e => setDosTitleFr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Title (EN)</label>
              <input 
                type="text"
                value={dosTitleEn}
                onChange={e => setDosTitleEn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Description courte (FR)</label>
              <textarea 
                value={dosDescFr}
                onChange={e => setDosDescFr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-16 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Short Description (EN)</label>
              <textarea 
                value={dosDescEn}
                onChange={e => setDosDescEn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-16 resize-none"
              />
            </div>
          </div>
          <button 
            onClick={handleAddDossier}
            className="px-5 py-2.5 bg-[#E85D42] text-white font-black text-xs uppercase tracking-widest hover:bg-[#d04930] transition-all cursor-pointer rounded"
          >
            {language === 'fr' ? 'Enregistrer le Dossier' : 'Save Dossier'}
          </button>
        </div>

        <div className="space-y-3">
          {dossiersList.map((d: any) => (
            <div key={d.id} className="flex items-start justify-between gap-4 p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                  {typeof d.tag === 'object' ? d.tag.fr : d.tag}
                </span>
                <p className="text-xs font-extrabold text-zinc-100">{d.titleFr}</p>
                <p className="text-xs text-zinc-400">{d.descFr}</p>
              </div>
              <button 
                onClick={() => handleDeleteDossier(d.id)}
                className="p-2 text-rose-400 hover:bg-rose-950/40 rounded transition-all cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: Announcements / Annonces Management */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <Megaphone className="text-[#E85D42]" size={18} />
            {language === 'fr' ? '4. Annonces / Annonces (Sidebar Section)' : '4. Announcements Section'}
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-950/60 text-purple-400 border border-purple-800">
            {announcementsList.length} {language === 'fr' ? 'annonces' : 'announcements'}
          </span>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-lg space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42]">
            {language === 'fr' ? '+ Publier une Annonce (avec image moyenne)' : '+ Publish Announcement (with medium image)'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Titre de l'annonce (FR)</label>
              <input 
                type="text"
                value={annTitleFr}
                onChange={e => setAnnTitleFr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Announcement Title (EN)</label>
              <input 
                type="text"
                value={annTitleEn}
                onChange={e => setAnnTitleEn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Contenu / Texte (FR)</label>
              <textarea 
                value={annTextFr}
                onChange={e => setAnnTextFr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-16 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Content / Text (EN)</label>
              <textarea 
                value={annTextEn}
                onChange={e => setAnnTextEn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42] h-16 resize-none"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                {language === 'fr' ? 'Image de l\'annonce (URL, Fichier Appareil ou Médiathèque)' : 'Announcement Image (URL, Device File or Media Library)'}
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={annImageUrl}
                  onChange={e => setAnnImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or upload"
                  className="flex-grow bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
                />
                <label className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded cursor-pointer flex items-center gap-1.5 shrink-0 transition-all">
                  <Upload size={14} className="text-[#E85D42]" />
                  <span>{language === 'fr' ? 'Appareil' : 'Device'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (uploadEvent) => {
                          if (uploadEvent.target?.result) {
                            setAnnImageUrl(uploadEvent.target.result as string);
                            showToast(language === 'fr' ? 'Image chargée depuis l\'appareil avec succès !' : 'Image loaded from device successfully!');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {media && media.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  {language === 'fr' ? 'Ou sélectionner depuis la Médiathèque' : 'Or select from Media Library'}
                </label>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      setAnnImageUrl(e.target.value);
                      showToast(language === 'fr' ? 'Image sélectionnée depuis la médiathèque' : 'Image selected from media library');
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 p-2 text-xs rounded focus:outline-none focus:border-[#E85D42]"
                >
                  <option value="" disabled>{language === 'fr' ? '-- Choisir une image de la médiathèque --' : '-- Choose image from media library --'}</option>
                  {media.map((m: any) => (
                    <option key={m.id || m.url} value={m.url}>{m.title || m.name || m.url}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Lien de redirection (URL / Cible)</label>
              <input 
                type="text"
                value={annLink}
                onChange={e => setAnnLink(e.target.value)}
                placeholder="/category/... ou https://..."
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>
          <button 
            onClick={handleAddAnnouncement}
            className="px-5 py-2.5 bg-[#E85D42] text-white font-black text-xs uppercase tracking-widest hover:bg-[#d04930] transition-all cursor-pointer rounded"
          >
            {language === 'fr' ? 'Publier l\'Annonce' : 'Publish Announcement'}
          </button>
        </div>

        <div className="space-y-3">
          {announcementsList.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between gap-4 p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-3">
                {a.imageUrl && (
                  <img src={a.imageUrl} alt="" className="w-16 h-12 object-cover rounded border border-zinc-700 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-extrabold text-zinc-100">{a.titleFr}</p>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">{a.textFr}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteAnnouncement(a.id)}
                className="p-2 text-rose-400 hover:bg-rose-950/40 rounded transition-all cursor-pointer shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: Daily Wisdom (Proverbe du Jour) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
          <Quote className="text-[#E85D42]" size={20} />
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">
            {language === 'fr' ? '5. Proverbe du Jour (Daily Wisdom)' : '5. Daily Wisdom Proverb'}
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

      {/* SECTION 6: Curation des Articles de la Barre Latérale (Trendings & Dernières Actualités) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-8">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
          <TrendingUp className="text-[#E85D42]" size={20} />
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">
            {language === 'fr' ? '6. Curation des Articles de la Barre Latérale (Trendings & Dernières Actualités)' : '6. Sidebar Articles Curation (Trendings & Latest News)'}
          </h3>
        </div>

        {/* 6A. Tendances (Trendings) */}
        <div className="space-y-4 bg-zinc-950/60 p-5 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#E85D42] flex items-center gap-2">
              <TrendingUp size={16} />
              {language === 'fr' ? 'Section Tendances (Trendings Sidebar)' : 'Trendings Section'}
            </h4>
            <span className="text-xs font-mono text-zinc-400">
              {curatedTrendingIds.length} {language === 'fr' ? 'article(s) sélectionné(s)' : 'article(s) selected'}
            </span>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedTrendingToAdd}
              onChange={e => setSelectedTrendingToAdd(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
            >
              <option value="">{language === 'fr' ? '-- Choisir un article à ajouter aux Tendances --' : '-- Choose article to add to Trendings --'}</option>
              {articles.map(art => (
                <option key={art.id} value={art.id}>
                  {art.title?.[language] || art.title?.fr || art.id}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddTrendingArticle}
              className="px-4 py-2.5 bg-[#E85D42] text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-[#d04930] transition-colors shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} />
              <span>{language === 'fr' ? 'Ajouter' : 'Add'}</span>
            </button>
          </div>

          {/* List of Curated Trendings */}
          <div className="space-y-2 mt-4">
            {curatedTrendingIds.map((artId, idx) => {
              const foundArt = articles.find(a => a.id === artId || a.slug === artId);
              return (
                <div key={`${artId}-${idx}`} className="flex items-center justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-xs font-extrabold text-[#E85D42] w-6 shrink-0">#{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-100 truncate">
                        {foundArt ? (foundArt.title?.[language] || foundArt.title?.fr) : `Article ID: ${artId}`}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">{foundArt?.category || 'General'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value=""
                      onChange={e => handleReplaceTrending(idx, e.target.value)}
                      className="bg-zinc-950 border border-zinc-700 text-zinc-300 text-[11px] p-1.5 rounded focus:outline-none focus:border-[#E85D42]"
                      title={language === 'fr' ? 'Remplacer cet article' : 'Replace article'}
                    >
                      <option value="">{language === 'fr' ? 'Remplacer...' : 'Replace...'}</option>
                      {articles.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.title?.[language] || a.title?.fr}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleMoveTrending(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded cursor-pointer"
                      title={language === 'fr' ? 'Monter' : 'Move up'}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => handleMoveTrending(idx, 'down')}
                      disabled={idx === curatedTrendingIds.length - 1}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded cursor-pointer"
                      title={language === 'fr' ? 'Descendre' : 'Move down'}
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      onClick={() => handleRemoveTrendingArticle(artId)}
                      className="p-1.5 bg-rose-950/60 text-rose-400 hover:bg-rose-900/80 rounded cursor-pointer"
                      title={language === 'fr' ? 'Supprimer' : 'Remove'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6B. Dernières Actualités (Latest News) */}
        <div className="space-y-4 bg-zinc-950/60 p-5 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#E85D42] flex items-center gap-2">
              <Zap size={16} />
              {language === 'fr' ? 'Section Dernières Actualités (Latest News Sidebar)' : 'Latest News Section'}
            </h4>
            <span className="text-xs font-mono text-zinc-400">
              {curatedLatestIds.length} {language === 'fr' ? 'article(s) sélectionné(s)' : 'article(s) selected'}
            </span>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedLatestToAdd}
              onChange={e => setSelectedLatestToAdd(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
            >
              <option value="">{language === 'fr' ? '-- Choisir un article à ajouter aux Dernières Actualités --' : '-- Choose article to add to Latest News --'}</option>
              {articles.map(art => (
                <option key={art.id} value={art.id}>
                  {art.title?.[language] || art.title?.fr || art.id}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddLatestArticle}
              className="px-4 py-2.5 bg-[#E85D42] text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-[#d04930] transition-colors shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} />
              <span>{language === 'fr' ? 'Ajouter' : 'Add'}</span>
            </button>
          </div>

          {/* List of Curated Latest */}
          <div className="space-y-2 mt-4">
            {curatedLatestIds.map((artId, idx) => {
              const foundArt = articles.find(a => a.id === artId || a.slug === artId);
              return (
                <div key={`${artId}-${idx}`} className="flex items-center justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-xs font-extrabold text-[#E85D42] w-6 shrink-0">0{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-100 truncate">
                        {foundArt ? (foundArt.title?.[language] || foundArt.title?.fr) : `Article ID: ${artId}`}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">{foundArt?.category || 'General'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value=""
                      onChange={e => handleReplaceLatest(idx, e.target.value)}
                      className="bg-zinc-950 border border-zinc-700 text-zinc-300 text-[11px] p-1.5 rounded focus:outline-none focus:border-[#E85D42]"
                      title={language === 'fr' ? 'Remplacer cet article' : 'Replace article'}
                    >
                      <option value="">{language === 'fr' ? 'Remplacer...' : 'Replace...'}</option>
                      {articles.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.title?.[language] || a.title?.fr}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleMoveLatest(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded cursor-pointer"
                      title={language === 'fr' ? 'Monter' : 'Move up'}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => handleMoveLatest(idx, 'down')}
                      disabled={idx === curatedLatestIds.length - 1}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded cursor-pointer"
                      title={language === 'fr' ? 'Descendre' : 'Move down'}
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      onClick={() => handleRemoveLatestArticle(artId)}
                      className="p-1.5 bg-rose-950/60 text-rose-400 hover:bg-rose-900/80 rounded cursor-pointer"
                      title={language === 'fr' ? 'Supprimer' : 'Remove'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
