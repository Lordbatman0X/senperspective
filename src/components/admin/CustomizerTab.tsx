import React, { useState } from 'react';
import { useStore } from '../../store';
import { Palette, Phone, Mail, MapPin, ShieldCheck, HelpCircle, Save, Megaphone, TrendingUp, Sparkles, AlertCircle, Ship, Quote, Layers, Globe, Wrench, Menu, ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff, Navigation } from 'lucide-react';

export function CustomizerTab() {
  const { language, siteSettings, updateSiteSettings } = useStore();

  // Header Navigation Bar state
  const defaultNavItems = [
    { id: 'politique', labelFr: 'Politique', labelEn: 'Politics', url: '/category/politique', enabled: true },
    { id: 'economie', labelFr: 'Économie', labelEn: 'Economy', url: '/category/economie', enabled: true },
    { id: 'societe', labelFr: 'Société', labelEn: 'Society', url: '/category/societe', enabled: true },
    { id: 'international', labelFr: 'International', labelEn: 'International', url: '/category/international', enabled: true },
    { id: 'tech', labelFr: 'Tech', labelEn: 'Tech', url: '/category/tech', enabled: true },
    { id: 'sante', labelFr: 'Santé', labelEn: 'Health', url: '/category/sante', enabled: true },
    { id: 'sports', labelFr: "L'Arène", labelEn: 'The Arena', url: '/larene', enabled: true },
    { id: 'gouvernance', labelFr: 'Gouvernance', labelEn: 'Governance', url: '/category/gouvernance', enabled: true },
  ];

  const [headerNavItems, setHeaderNavItems] = useState(
    siteSettings?.headerNavItems && siteSettings.headerNavItems.length > 0
      ? siteSettings.headerNavItems
      : defaultNavItems
  );
  const [showHeaderTopBar, setShowHeaderTopBar] = useState(siteSettings?.showHeaderTopBar !== false);

  const handleUpdateNavItem = (index: number, field: string, value: any) => {
    const updated = [...headerNavItems];
    updated[index] = { ...updated[index], [field]: value };
    setHeaderNavItems(updated);
  };

  const handleToggleNavItem = (index: number) => {
    const updated = [...headerNavItems];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setHeaderNavItems(updated);
  };

  const handleMoveNavItemUp = (index: number) => {
    if (index === 0) return;
    const updated = [...headerNavItems];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setHeaderNavItems(updated);
  };

  const handleMoveNavItemDown = (index: number) => {
    if (index === headerNavItems.length - 1) return;
    const updated = [...headerNavItems];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setHeaderNavItems(updated);
  };

  const handleRemoveNavItem = (index: number) => {
    setHeaderNavItems(headerNavItems.filter((_, i) => i !== index));
  };

  const handleAddNavItem = () => {
    const newId = 'nav-' + Date.now();
    setHeaderNavItems([
      ...headerNavItems,
      { id: newId, labelFr: 'Nouveau Lien', labelEn: 'New Link', url: '/category/politique', enabled: true }
    ]);
  };

  // Maintenance mode state
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(siteSettings?.isMaintenanceMode || false);
  const [maintenanceMessageFr, setMaintenanceMessageFr] = useState(siteSettings?.maintenanceMessageFr || "Notre site est actuellement en cours de maintenance et de mise à jour. Nous serons de retour très prochainement.");
  const [maintenanceMessageEn, setMaintenanceMessageEn] = useState(siteSettings?.maintenanceMessageEn || "Our site is currently undergoing scheduled maintenance and updates. We will be back online shortly.");

  // Local state for form submission values
  const [siteName, setSiteName] = useState(siteSettings?.siteName || 'Perspective');
  const [boukariCorpLogo, setBoukariCorpLogo] = useState(siteSettings?.boukariCorpLogo || '');
  const [glassIntensity, setGlassIntensity] = useState(siteSettings?.glassIntensity || 'Medium');
  const [categories, setCategories] = useState(siteSettings?.categories || []);
  const handleAddCategory = () => setCategories([...categories, { id: "new", fr: "Nouveau", en: "New" }]);
  const handleUpdateCategory = (index: number, key: string, value: string) => {
    const newCats = [...categories];
    newCats[index] = { ...newCats[index], [key]: value };
    setCategories(newCats);
  };
  const handleRemoveCategory = (index: number) => setCategories(categories.filter((_, i) => i !== index));
  const [homeSections, setHomeSections] = useState(siteSettings?.homeSections?.join(', ') || 'hero, trending, categories, videos, ads');
  const [accentColor, setAccentColor] = useState(siteSettings?.accentColor || "#E85D42");
  const [fontPairing, setFontPairing] = useState(siteSettings?.fontPairing || "Playfair / Lora");
  const [editorialPhone, setEditorialPhone] = useState(siteSettings?.editorialPhone || '+221 33 824 55 55');
  const [supportEmail, setSupportEmail] = useState(siteSettings?.supportEmail || 'contact@perspective.sn');
  const [officeAddress, setOfficeAddress] = useState(siteSettings?.officeAddress || 'Immeuble Tamaro, Rue Mohamed V, Dakar');
  const [paywallThreshold, setPaywallThreshold] = useState(siteSettings?.paywallThreshold || 9999);
  const [paywallEnabled, setPaywallEnabled] = useState(siteSettings?.paywallEnabled === true);

  // Local state for customizable sidebar dispatches (Flash Info)
  const [disp1Time, setDisp1Time] = useState(siteSettings?.analystDispatches?.[0]?.time || '14:22 DKR');
  const [disp1Fr, setDisp1Fr] = useState(siteSettings?.analystDispatches?.[0]?.contentFr || "Tensions d'arbitrage levées sur l'axe maritime Dakar-Gorée.");
  const [disp1En, setDisp1En] = useState(siteSettings?.analystDispatches?.[0]?.contentEn || "Maritime transit clearance issued for the Dakar-Gorée axis.");

  const [disp2Time, setDisp2Time] = useState(siteSettings?.analystDispatches?.[1]?.time || '11:05 ZLR');
  const [disp2Fr, setDisp2Fr] = useState(siteSettings?.analystDispatches?.[1]?.contentFr || "Hausse des obligations souveraines suite aux déclarations sur le gaz naturel.");
  const [disp2En, setDisp2En] = useState(siteSettings?.analystDispatches?.[1]?.contentEn || "Sovereign bonds rise following regional natural gas production updates.");

  // Local state for Le Monde dispatches
  const [lm1Time, setLm1Time] = useState(siteSettings?.leMondeDispatches?.[0]?.time || '14:22 GMT');
  const [lm1TagFr, setLm1TagFr] = useState(siteSettings?.leMondeDispatches?.[0]?.tagFr || 'Sommet CEDEAO');
  const [lm1TagEn, setLm1TagEn] = useState(siteSettings?.leMondeDispatches?.[0]?.tagEn || 'ECOWAS Summit');
  const [lm1TitleFr, setLm1TitleFr] = useState(siteSettings?.leMondeDispatches?.[0]?.titleFr || 'Négociations commerciales & accords de libre-échange Ouest-Africains.');
  const [lm1TitleEn, setLm1TitleEn] = useState(siteSettings?.leMondeDispatches?.[0]?.titleEn || 'West African trade negotiations and free trade agreements update.');
  const [lm1ExcerptFr, setLm1ExcerptFr] = useState(siteSettings?.leMondeDispatches?.[0]?.excerptFr || 'Les ministres des Finances se sont réunis à Abuja.');
  const [lm1ExcerptEn, setLm1ExcerptEn] = useState(siteSettings?.leMondeDispatches?.[0]?.excerptEn || 'Finance ministers convened in Abuja for tariff consensus.');

  const [lm2Time, setLm2Time] = useState(siteSettings?.leMondeDispatches?.[1]?.time || '11:05 GMT');
  const [lm2TagFr, setLm2TagFr] = useState(siteSettings?.leMondeDispatches?.[1]?.tagFr || 'Marchés Financiers');
  const [lm2TagEn, setLm2TagEn] = useState(siteSettings?.leMondeDispatches?.[1]?.tagEn || 'Financial Markets');
  const [lm2TitleFr, setLm2TitleFr] = useState(siteSettings?.leMondeDispatches?.[1]?.titleFr || 'Stabilité de la BRVM et obligations souveraines de la zone UEMOA.');
  const [lm2TitleEn, setLm2TitleEn] = useState(siteSettings?.leMondeDispatches?.[1]?.titleEn || 'BRVM market stability and WAEMU sovereign bonds report.');
  const [lm2ExcerptFr, setLm2ExcerptFr] = useState(siteSettings?.leMondeDispatches?.[1]?.excerptFr || 'Ajustements de liquidité enregistrés en fin de séance.');
  const [lm2ExcerptEn, setLm2ExcerptEn] = useState(siteSettings?.leMondeDispatches?.[1]?.excerptEn || 'Liquidity adjustments noted at market close.');

  // Local state for coast & harbor
  const [tideTime, setTideTime] = useState(siteSettings?.coastAndHarbor?.tideTime || '16:48 UT');
  const [tideValue, setTideValue] = useState(siteSettings?.coastAndHarbor?.tideValue || '+1.64 Meter');
  const [goreeCount, setGoreeCount] = useState(siteSettings?.coastAndHarbor?.goreeCount || '12 Navettes');
  const [goreeStatus, setGoreeStatus] = useState(siteSettings?.coastAndHarbor?.goreeStatus || 'Status: Fluide');
  const [meteoTemp, setMeteoTemp] = useState(siteSettings?.coastAndHarbor?.meteoTemp || '29°C / 84°F');
  const [meteoCondFr, setMeteoCondFr] = useState(siteSettings?.coastAndHarbor?.meteoCondFr || 'Ensoleillé & Venté');
  const [meteoCondEn, setMeteoCondEn] = useState(siteSettings?.coastAndHarbor?.meteoCondEn || 'Sunny & Windy');
  const [windValue, setWindValue] = useState(siteSettings?.coastAndHarbor?.windValue || '18 km/h NW');
  const [windGusts, setWindGusts] = useState(siteSettings?.coastAndHarbor?.windGusts || 'Gusts: 22 km/h');

  // Local state for daily wisdom
  const [wisdomWolof, setWisdomWolof] = useState(siteSettings?.dailyWisdom?.wolof || "Nila lay doxé, sa gënëg du lënk.");
  const [wisdomFr, setWisdomFr] = useState(siteSettings?.dailyWisdom?.translationFr || "Ceux qui avancent avec sagesse et vérité ne craignent point l'obscurité.");
  const [wisdomEn, setWisdomEn] = useState(siteSettings?.dailyWisdom?.translationEn || "Those who walk in integrity and light never fear the shadow.");
  const [wisdomSrcFr, setWisdomSrcFr] = useState(siteSettings?.dailyWisdom?.sourceFr || "EXP: PROVERBE WOLOF");
  const [wisdomSrcEn, setWisdomSrcEn] = useState(siteSettings?.dailyWisdom?.sourceEn || "EXP: WOLOF PROVERB");

  // Local state for trending and most read counts
  const [trendingCount, setTrendingCount] = useState(siteSettings?.trendingCount || 4);
  const [mostReadCount, setMostReadCount] = useState(siteSettings?.mostReadCount || 5);

  const [showToast, setShowToast] = useState(false);

  const presets = [
    { name: 'Red Orange', value: '#E85D42' },
    { name: 'Deep Emerald', value: '#10B981' },
    { name: 'Royal Blue', value: '#3B82F6' },
    { name: 'Regal Purple', value: '#8B5CF6' },
    { name: 'Noble Gold', value: '#D97706' }
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteSettings({
      siteName,
      boukariCorpLogo,
      isMaintenanceMode,
      maintenanceMessageFr,
      maintenanceMessageEn,
      glassIntensity,
      categories,
      headerNavItems,
      showHeaderTopBar,
      homeSections: homeSections.split(',').map(s => s.trim()),
      accentColor,
      editorialPhone,
      supportEmail,
      officeAddress,
      paywallThreshold: Number(paywallThreshold),
      paywallEnabled,
      analystDispatches: [
        { id: 'disp-1', time: disp1Time, contentFr: disp1Fr, contentEn: disp1En, level: 'standard' },
        { id: 'disp-2', time: disp2Time, contentFr: disp2Fr, contentEn: disp2En, level: 'pulse' }
      ],
      leMondeDispatches: [
        {
          id: 'lm-1',
          time: lm1Time,
          tagFr: lm1TagFr,
          tagEn: lm1TagEn,
          titleFr: lm1TitleFr,
          titleEn: lm1TitleEn,
          excerptFr: lm1ExcerptFr,
          excerptEn: lm1ExcerptEn
        },
        {
          id: 'lm-2',
          time: lm2Time,
          tagFr: lm2TagFr,
          tagEn: lm2TagEn,
          titleFr: lm2TitleFr,
          titleEn: lm2TitleEn,
          excerptFr: lm2ExcerptFr,
          excerptEn: lm2ExcerptEn
        }
      ],
      coastAndHarbor: {
        tideTime,
        tideValue,
        goreeCount,
        goreeStatus,
        meteoTemp,
        meteoCondFr,
        meteoCondEn,
        windValue,
        windGusts
      },
      dailyWisdom: {
        wolof: wisdomWolof,
        translationFr: wisdomFr,
        translationEn: wisdomEn,
        sourceFr: wisdomSrcFr,
        sourceEn: wisdomSrcEn
      },
      trendingCount: Number(trendingCount),
      mostReadCount: Number(mostReadCount)
    });
    setShowToast(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const t = {
    title: language === 'fr' ? 'Apparence & Style du Journal' : 'Appearance & Theme Settings',
    subtitle: language === 'fr' ? 'Personnalisez le nom, la couleur d\'accent, la typographie et les modules' : 'Customize site title, accent color, typography, and modules',
    brandSection: language === 'fr' ? 'Identité Visuelle & Thème' : 'Visual Brand Identity',
    siteNameLabel: language === 'fr' ? 'Nom du Journal' : 'Site Name',
    accentColorLabel: language === 'fr' ? 'Couleur d\'Accent Principale' : 'Primary Accent Color',
    contactsSection: language === 'fr' ? 'Coordonnées & Support' : 'Contact Information',
    phoneLabel: language === 'fr' ? 'Téléphone Rédaction' : 'Editorial Phone',
    emailLabel: language === 'fr' ? 'Email Support' : 'Support Email',
    addressLabel: language === 'fr' ? 'Adresse du Siège' : 'Office Address',
    
    dispatchesTitle: language === 'fr' ? 'Dépêches d\'Analystes (Barre Latérale)' : 'Analyst Dispatches (Sidebar)',
    coastHarborTitle: language === 'fr' ? 'Météo & Port de Dakar' : 'Dakar Weather & Marine Info',
    wisdomTitle: language === 'fr' ? 'Proverbe du Jour (Daily Wisdom)' : 'Daily Wisdom Proverb',
    limitsTitle: language === 'fr' ? 'Nombre d\'Articles Affichés' : 'Article Display Limits',
    
    commercialSection: language === 'fr' ? 'Gestion du Paywall & Inscription' : 'Paywall & Subscription Control',
    paywallEnableLabel: language === 'fr' ? 'Activer le Paywall d\'articles' : 'Enable Paywall Overlay',
    paywallThresholdLabel: language === 'fr' ? 'Articles gratuits autorisés' : 'Free articles allowed',
    paywallDesc: language === 'fr' ? 'Affiche un écran d\'invitation à l\'inscription après épuisement du quota d\'articles gratuits.' : 'Prompt visitors to register or subscribe after exceeding free reading limit.',
    saveBtn: language === 'fr' ? 'Enregistrer les modifications' : 'Save Changes',
    toastSuccess: language === 'fr' ? '✓ Modification de l\'apparence enregistrée !' : '✓ Appearance settings updated successfully!'
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-3">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-zinc-100">{t.title}</h2>
        <p className="text-xs text-zinc-400 font-mono">{t.subtitle}</p>
      </div>

      {showToast && (
        <div className="bg-emerald-600 text-white p-4 font-bold uppercase tracking-wider text-xs animate-fade-in shadow-xl rounded-md flex items-center gap-3">
          <Sparkles size={16} />
          {t.toastSuccess}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Maintenance Mode Panel */}
        <div className={`p-6 sm:p-8 rounded-lg border transition-all shadow-xl space-y-6 ${isMaintenanceMode ? 'bg-amber-950/40 border-amber-600/50' : 'bg-zinc-900/80 border-zinc-800'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-md ${isMaintenanceMode ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                <Wrench size={22} className={isMaintenanceMode ? 'animate-spin-slow' : ''} />
              </div>
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                  <span>{language === 'fr' ? 'Mode Maintenance du Site' : 'Site Maintenance Mode'}</span>
                  {isMaintenanceMode && (
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/40 uppercase tracking-widest font-bold">
                      ACTIF / ACTIVE
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                  {language === 'fr' 
                    ? 'Masque le site public pour les visiteurs non-administrateurs et affiche une page de maintenance dédiée.'
                    : 'Hides the public site from visitors and displays a dedicated maintenance page.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md flex items-center gap-2 ${
                isMaintenanceMode 
                  ? 'bg-amber-500 hover:bg-amber-600 text-black font-extrabold' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              <span>
                {isMaintenanceMode 
                  ? (language === 'fr' ? 'DÉSACTIVER MAINTENANCE' : 'DISABLE MAINTENANCE')
                  : (language === 'fr' ? 'ACTIVER MAINTENANCE' : 'ENABLE MAINTENANCE')}
              </span>
            </button>
          </div>

          {isMaintenanceMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1.5">
                  {language === 'fr' ? 'Message de Maintenance (Français)' : 'Maintenance Message (French)'}
                </label>
                <textarea
                  rows={3}
                  value={maintenanceMessageFr}
                  onChange={e => setMaintenanceMessageFr(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-amber-500 rounded-md"
                  placeholder="Notre site est actuellement en cours de maintenance..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1.5">
                  {language === 'fr' ? 'Message de Maintenance (Anglais)' : 'Maintenance Message (English)'}
                </label>
                <textarea
                  rows={3}
                  value={maintenanceMessageEn}
                  onChange={e => setMaintenanceMessageEn(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-amber-500 rounded-md"
                  placeholder="Our site is currently undergoing scheduled maintenance..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Brand Identity Panel */}
        <div className="p-6 sm:p-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Palette className="text-[#E85D42]" size={20} />
            <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">{t.brandSection}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">{t.siteNameLabel}</label>
              <input
                type="text"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                required
              />
            </div>

            {/* Boukari Corporation Logo Upload */}
            <div className="md:col-span-2 p-4 bg-zinc-950 border border-zinc-800 rounded-md space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-200">
                    {language === 'fr' ? 'Logo Boukari Corporation (BC Logo)' : 'Boukari Corporation Logo (BC Logo)'}
                  </label>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {language === 'fr' 
                      ? 'Image carrée affichée au pied de page au niveau de la mention « Unité Opérationnelle de Boukari Corporation ».'
                      : 'Square logo displayed in the footer next to the "Operational Unit of Boukari Corporation" precision.'}
                  </p>
                </div>
                <div 
                  className="h-16 max-w-[160px] bg-transparent flex items-center justify-center overflow-hidden shrink-0"
                >
                  {boukariCorpLogo ? (
                    <img src={boukariCorpLogo} alt="BC Preview" className="h-16 w-auto max-w-full object-contain block" />
                  ) : (
                    <div className="h-12 px-3 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center">
                      <span className="font-mono font-black text-sm text-zinc-100 tracking-wider">BC</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={boukariCorpLogo}
                  onChange={e => setBoukariCorpLogo(e.target.value)}
                  placeholder={language === 'fr' ? "https://... ou téléchargez ci-contre" : "https://... or upload image"}
                  className="flex-1 w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-mono focus:outline-none focus:border-[#E85D42] rounded-md"
                />
                <label className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 cursor-pointer rounded-md shrink-0 transition-colors border border-zinc-700">
                  {language === 'fr' ? 'Importer Image...' : 'Upload Image...'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setBoukariCorpLogo(evt.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {boukariCorpLogo && (
                  <button
                    type="button"
                    onClick={() => setBoukariCorpLogo('')}
                    className="px-2.5 py-2 text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/50 rounded-md transition-colors cursor-pointer"
                  >
                    {language === 'fr' ? 'Effacer' : 'Clear'}
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">{t.accentColorLabel}</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {presets.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setAccentColor(color.value)}
                    className="w-8 h-8 rounded-full border-2 cursor-pointer transition-all hover:scale-110 flex items-center justify-center"
                    style={{ 
                      backgroundColor: color.value, 
                      borderColor: accentColor === color.value ? '#ffffff' : 'transparent',
                      boxShadow: accentColor === color.value ? '0 0 0 2px #000000' : 'none'
                    }}
                    title={color.name}
                  >
                    {accentColor === color.value && <span className="text-xs font-bold text-white">✓</span>}
                  </button>
                ))}
              </div>
              <input
                type="color"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                className="w-full h-10 cursor-pointer bg-transparent border-0 p-0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Design System & Typography</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-zinc-200 mb-1 block">Combinaison de Polices / Font Pairing</span>
                  <select
                    value={fontPairing}
                    onChange={e => setFontPairing(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  >
                    <option value="Playfair / Lora">Playfair Display & Lora (Éditorial Journal)</option>
                    <option value="Inter / Inter">Inter & Inter (Moderne Épuré)</option>
                    <option value="Space Grotesk / JetBrains">Space Grotesk & JetBrains Mono (Tech / Moderne)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-zinc-200 mb-1 block">Intensité de l'Effet Verre / Glass Effect</span>
                  <select
                    value={glassIntensity}
                    onChange={e => setGlassIntensity(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  >
                    <option value="Low">Low (Opaque)</option>
                    <option value="Medium">Medium (Standard)</option>
                    <option value="High">High (Translucide)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Header Navigation Bar Settings */}
        <div className="p-6 sm:p-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <Navigation className="text-[#E85D42]" size={20} />
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">
                  {language === 'fr' ? "Barre de Navigation d'En-Tête" : 'Header Navigation Bar'}
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {language === 'fr' ? 'Gérez les rubriques, liens, ordre et visibilité du menu principal' : 'Manage categories, links, reorder and visibility in main menu'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddNavItem}
              className="px-3 py-1.5 bg-[#E85D42] hover:bg-[#d44c33] text-white text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus size={14} />
              {language === 'fr' ? 'Ajouter un Lien' : 'Add Link'}
            </button>
          </div>

          <div className="space-y-3">
            {headerNavItems.map((item, index) => (
              <div 
                key={item.id}
                className={`p-3.5 rounded-md border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  item.enabled !== false ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveNavItemUp(index)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-20 disabled:hover:text-zinc-400 transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={index === headerNavItems.length - 1}
                      onClick={() => handleMoveNavItemDown(index)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-20 disabled:hover:text-zinc-400 transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 w-5 text-center">{index + 1}.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">
                      {language === 'fr' ? 'Libellé (FR)' : 'Label (FR)'}
                    </label>
                    <input
                      type="text"
                      value={item.labelFr}
                      onChange={(e) => handleUpdateNavItem(index, 'labelFr', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">
                      {language === 'fr' ? 'Libellé (EN)' : 'Label (EN)'}
                    </label>
                    <input
                      type="text"
                      value={item.labelEn}
                      onChange={(e) => handleUpdateNavItem(index, 'labelEn', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-200 mb-1">
                      {language === 'fr' ? 'Lien / URL' : 'Link / Path'}
                    </label>
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) => handleUpdateNavItem(index, 'url', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-mono focus:outline-none focus:border-[#E85D42] rounded-md"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleNavItem(index)}
                    className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded-md flex items-center gap-1 border transition-colors cursor-pointer ${
                      item.enabled !== false
                        ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400 hover:bg-emerald-900/60'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {item.enabled !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span className="uppercase text-[9px] tracking-wider">
                      {item.enabled !== false ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Masqué' : 'Hidden')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveNavItem(index)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Analyst Dispatches Configuration */}
        <div className="p-6 sm:p-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Layers className="text-[#E85D42]" size={20} />
            <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">{t.dispatchesTitle}</h3>
          </div>

          <div className="space-y-6">
            <div className="border border-zinc-800 p-4 bg-zinc-950 rounded-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42] mb-3">Dépêche #1</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Horaire</label>
                  <input
                    type="text"
                    value={disp1Time}
                    onChange={e => setDisp1Time(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                    placeholder="ex: 14:22 DKR"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Texte (FR)</label>
                  <input
                    type="text"
                    value={disp1Fr}
                    onChange={e => setDisp1Fr(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Texte (EN)</label>
                  <input
                    type="text"
                    value={disp1En}
                    onChange={e => setDisp1En(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="border border-zinc-800 p-4 bg-zinc-950 rounded-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42] mb-3">Dépêche #2</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Horaire</label>
                  <input
                    type="text"
                    value={disp2Time}
                    onChange={e => setDisp2Time(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                    placeholder="ex: 11:05 ZLR"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Texte (FR)</label>
                  <input
                    type="text"
                    value={disp2Fr}
                    onChange={e => setDisp2Fr(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Texte (EN)</label>
                  <input
                    type="text"
                    value={disp2En}
                    onChange={e => setDisp2En(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1.5. Section "Le Monde" (Global Dispatches) */}
        <div className="p-6 sm:p-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Globe className="text-[#E85D42]" size={20} />
            <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">
              {language === 'fr' ? 'Section "Le Monde" (Dépêches Globales)' : 'Le Monde Section (Global Briefs)'}
            </h3>
          </div>

          <p className="text-xs text-zinc-400">
            {language === 'fr' 
              ? 'Configurez les dépêches synthétiques affichées dans la rubrique "Le Monde" sur le panneau latéral de la page d’accueil.' 
              : 'Configure brief dispatches displayed under the "Le Monde" sidebar section.'}
          </p>

          <div className="space-y-4">
            {/* Le Monde Item 1 */}
            <div className="border border-zinc-800 p-4 bg-zinc-950 rounded-md space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42]">Dépêche Internationale #1</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Horaire</label>
                  <input
                    type="text"
                    value={lm1Time}
                    onChange={e => setLm1Time(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Tag (FR)</label>
                  <input
                    type="text"
                    value={lm1TagFr}
                    onChange={e => setLm1TagFr(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Tag (EN)</label>
                  <input
                    type="text"
                    value={lm1TagEn}
                    onChange={e => setLm1TagEn(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Titre (FR)</label>
                  <input
                    type="text"
                    value={lm1TitleFr}
                    onChange={e => setLm1TitleFr(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Titre (EN)</label>
                  <input
                    type="text"
                    value={lm1TitleEn}
                    onChange={e => setLm1TitleEn(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Résumé (FR)</label>
                  <input
                    type="text"
                    value={lm1ExcerptFr}
                    onChange={e => setLm1ExcerptFr(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Résumé (EN)</label>
                  <input
                    type="text"
                    value={lm1ExcerptEn}
                    onChange={e => setLm1ExcerptEn(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Le Monde Item 2 */}
            <div className="border border-zinc-800 p-4 bg-zinc-950 rounded-md space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E85D42]">Dépêche Internationale #2</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Horaire</label>
                  <input
                    type="text"
                    value={lm2Time}
                    onChange={e => setLm2Time(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Tag (FR)</label>
                  <input
                    type="text"
                    value={lm2TagFr}
                    onChange={e => setLm2TagFr(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Tag (EN)</label>
                  <input
                    type="text"
                    value={lm2TagEn}
                    onChange={e => setLm2TagEn(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Titre (FR)</label>
                  <input
                    type="text"
                    value={lm2TitleFr}
                    onChange={e => setLm2TitleFr(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Titre (EN)</label>
                  <input
                    type="text"
                    value={lm2TitleEn}
                    onChange={e => setLm2TitleEn(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Résumé (FR)</label>
                  <input
                    type="text"
                    value={lm2ExcerptFr}
                    onChange={e => setLm2ExcerptFr(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-200 mb-1">Résumé (EN)</label>
                  <input
                    type="text"
                    value={lm2ExcerptEn}
                    onChange={e => setLm2ExcerptEn(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. DKR Coast & Harbor Configuration */}
        <div className="p-6 sm:p-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Ship className="text-[#E85D42]" size={20} />
            <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">{t.coastHarborTitle}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Heure Marée</label>
              <input
                type="text"
                value={tideTime}
                onChange={e => setTideTime(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Hauteur Marée</label>
              <input
                type="text"
                value={tideValue}
                onChange={e => setTideValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Navettes Gorée</label>
              <input
                type="text"
                value={goreeCount}
                onChange={e => setGoreeCount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Statut Navettes</label>
              <input
                type="text"
                value={goreeStatus}
                onChange={e => setGoreeStatus(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Température</label>
              <input
                type="text"
                value={meteoTemp}
                onChange={e => setMeteoTemp(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Vent & Rafales</label>
              <input
                type="text"
                value={windValue}
                onChange={e => setWindValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
              />
            </div>
          </div>
        </div>

        {/* 3. Daily Wisdom Proverb Configuration */}
        <div className="p-6 sm:p-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Quote className="text-[#E85D42]" size={20} />
            <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">{t.wisdomTitle}</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Proverbe Wolof (Texte d'origine)</label>
              <input
                type="text"
                value={wisdomWolof}
                onChange={e => setWisdomWolof(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Traduction (FR)</label>
                <textarea
                  value={wisdomFr}
                  onChange={e => setWisdomFr(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md h-20 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">Traduction (EN)</label>
                <textarea
                  value={wisdomEn}
                  onChange={e => setWisdomEn(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md h-20 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Contact Points Panel */}
        <div className="p-6 sm:p-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Mail className="text-[#E85D42]" size={20} />
            <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">{t.contactsSection}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                <span className="flex items-center gap-1.5"><Phone size={12} /> {t.phoneLabel}</span>
              </label>
              <input
                type="text"
                value={editorialPhone}
                onChange={e => setEditorialPhone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                <span className="flex items-center gap-1.5"><Mail size={12} /> {t.emailLabel}</span>
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                <span className="flex items-center gap-1.5"><MapPin size={12} /> {t.addressLabel}</span>
              </label>
              <input
                type="text"
                value={officeAddress}
                onChange={e => setOfficeAddress(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                required
              />
            </div>
          </div>
        </div>

        {/* Paywall Control Panel */}
        <div className="p-6 sm:p-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Megaphone className="text-[#E85D42]" size={20} />
            <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">{t.commercialSection}</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-md">
              <div className="space-y-1 pr-4">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-100">
                  {t.paywallEnableLabel}
                </label>
                <p className="text-xs text-zinc-400">{t.paywallDesc}</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={paywallEnabled}
                  onChange={e => setPaywallEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E85D42]" />
              </label>
            </div>

            {paywallEnabled && (
              <div className="p-4 bg-[#E85D42]/10 border border-dashed border-[#E85D42]/40 rounded-md space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                    {t.paywallThresholdLabel}
                  </label>
                  <select
                    value={paywallThreshold}
                    onChange={e => setPaywallThreshold(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md max-w-xs"
                  >
                    <option value={1}>1 {language === 'fr' ? 'Article gratuit' : 'Free article'}</option>
                    <option value={2}>2 {language === 'fr' ? 'Articles gratuits' : 'Free articles'}</option>
                    <option value={3}>3 {language === 'fr' ? 'Articles gratuits' : 'Free articles'}</option>
                    <option value={5}>5 {language === 'fr' ? 'Articles gratuits' : 'Free articles'}</option>
                    <option value={10}>10 {language === 'fr' ? 'Articles gratuits' : 'Free articles'}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Submission Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] text-white font-bold uppercase tracking-wider text-xs px-8 py-3.5 cursor-pointer transition-all shadow-xl active:scale-95 rounded-md"
            style={{ backgroundColor: accentColor }}
          >
            <Save size={16} />
            {t.saveBtn}
          </button>
        </div>
      </form>
    </div>
  );
}
