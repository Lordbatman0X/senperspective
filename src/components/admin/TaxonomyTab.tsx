import React, { useState } from 'react';
import { useStore } from '../../store';
import { Tag, Plus, Edit2, Trash2, Check, X, FolderPlus, Hash, Globe, Search, Layers, Sparkles, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

interface CategoryItem {
  id: string;
  fr: string;
  en: string;
  icon?: string;
}

interface TagItem {
  id: string;
  fr: string;
  en: string;
}

export function TaxonomyTab() {
  const { siteSettings, updateSiteSettings, articles, language } = useStore();

  const categories: CategoryItem[] = siteSettings.categories || [
    { id: 'politique', fr: 'Politique', en: 'Politics' },
    { id: 'economie', fr: 'Économie', en: 'Economics' },
    { id: 'societe', fr: 'Société', en: 'Society' },
    { id: 'international', fr: 'International', en: 'International' },
    { id: 'tech', fr: 'Tech', en: 'Tech' },
    { id: 'sante', fr: 'Santé', en: 'Health' },
    { id: 'sports', fr: 'Sports', en: 'Sports' },
    { id: 'people', fr: 'People', en: 'People' },
    { id: 'gouvernance', fr: 'Gouvernance', en: 'Governance' },
    { id: 'decryptages', fr: 'Décryptages', en: 'Decryptions' }
  ];

  const tags: TagItem[] = siteSettings.tags || [
    { id: 'senegal', fr: 'Sénégal', en: 'Senegal' },
    { id: 'dakar', fr: 'Dakar', en: 'Dakar' },
    { id: 'cedeao', fr: 'CEDEAO', en: 'ECOWAS' },
    { id: 'uemoa', fr: 'UEMOA', en: 'WAEMU' },
    { id: 'gouvernance', fr: 'Gouvernance', en: 'Governance' },
    { id: 'petrole-gaz', fr: 'Pétrole & Gaz', en: 'Oil & Gas' },
    { id: 'infrastructures', fr: 'Infrastructures', en: 'Infrastructures' },
    { id: 'agriculture', fr: 'Agriculture', en: 'Agriculture' },
    { id: 'elections', fr: 'Élections', en: 'Elections' }
  ];

  const keywords: string[] = siteSettings.keywords !== undefined ? siteSettings.keywords : [
    'Sénégal', 'Dakar', 'Perspective Group', 'L\'Arène', 'politique', 'géopolitique', 'économie', 'afrique', 'investigation', 'décryptage'
  ];

  const [activeSection, setActiveSection] = useState<'categories' | 'tags' | 'keywords' | 'navigation'>('categories');

  // HEADER NAVIGATION — the same `siteSettings.headerNavItems` the header reads
  // and the Customizer tab edits. It now lives here, beside the categories it
  // points at, so the menu and the category list can be maintained together.
  interface NavItem {
    id: string;
    labelFr: string;
    labelEn: string;
    url: string;
    enabled: boolean;
  }
  const [navItems, setNavItems] = useState<NavItem[]>(
    (siteSettings as any)?.headerNavItems && (siteSettings as any).headerNavItems.length > 0
      ? (siteSettings as any).headerNavItems
      : []
  );

  const handleUpdateNavItem = (index: number, field: string, value: any) => {
    setNavItems(prev => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };
  const handleToggleNavItem = (index: number) => {
    setNavItems(prev => prev.map((it, i) => (i === index ? { ...it, enabled: !it.enabled } : it)));
  };
  const handleMoveNavItem = (index: number, dir: -1 | 1) => {
    setNavItems(prev => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[target];
      next[target] = next[index];
      next[index] = tmp;
      return next;
    });
  };
  const handleRemoveNavItem = (index: number) => {
    setNavItems(prev => prev.filter((_, i) => i !== index));
  };
  const handleAddNavItem = () => {
    setNavItems(prev => [
      ...prev,
      { id: 'nav-' + Date.now(), labelFr: 'Nouveau Lien', labelEn: 'New Link', url: '/category/politique', enabled: true },
    ]);
  };

  /**
   * Rebuilds the menu from the category list, preserving any manual
   * arrangement (order, custom labels, hidden entries) for categories that are
   * still present, and appending only genuinely new ones.
   *
   * A full rebuild would silently discard the admin's custom order and labels
   * every time a category was added, so this is additive.
   */
  const handleSyncNavFromCategories = () => {
    const existing = new Map(navItems.map(n => [n.id, n]));
    const next: NavItem[] = [];
    categories.forEach(c => {
      const prev = existing.get(c.id);
      if (prev) {
        next.push({ ...prev, labelFr: prev.labelFr || c.fr, labelEn: prev.labelEn || c.en });
      } else {
        next.push({ id: c.id, labelFr: c.fr, labelEn: c.en, url: `/category/${c.id}`, enabled: true });
      }
    });
    // Keep any custom links that are not categories (e.g. /larene).
    navItems.forEach(n => {
      if (!categories.some(c => c.id === n.id)) next.push(n);
    });
    setNavItems(next);
    showToast(language === 'fr' ? 'Menu synchronisé avec les catégories' : 'Menu synced with categories');
  };

  const handleSaveNav = () => {
    // Only the nav key is written, so saving the menu can never disturb
    // categories, tags or any other stored setting.
    updateSiteSettings({ headerNavItems: navItems });
    showToast(language === 'fr' ? 'Menu de navigation enregistré' : 'Navigation menu saved');
  };
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Category Modal Form State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catFr, setCatFr] = useState('');
  const [catEn, setCatEn] = useState('');
  const [catId, setCatId] = useState('');
  const [catIcon, setCatIcon] = useState('Folder');

  // Tag Modal Form State
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagFr, setTagFr] = useState('');
  const [tagEn, setTagEn] = useState('');

  // Keyword Quick Add / Edit State
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null);
  const [keywordEditValue, setKeywordEditValue] = useState('');

  // Open Category Add/Edit
  const handleOpenCategoryModal = (cat?: CategoryItem) => {
    if (cat) {
      setEditingCategory(cat);
      setCatId(cat.id);
      setCatFr(cat.fr);
      setCatEn(cat.en);
      setCatIcon(cat.icon || 'Folder');
    } else {
      setEditingCategory(null);
      setCatId('');
      setCatFr('');
      setCatEn('');
      setCatIcon('Folder');
    }
    setIsCategoryModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = () => {
    if (!catFr.trim()) {
      showToast(language === 'fr' ? 'Le nom en français est requis.' : 'French category name is required.');
      return;
    }

    const slugId = catId.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') || catFr.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    let updated: CategoryItem[];

    if (editingCategory) {
      updated = categories.map(c => (c.id === editingCategory.id ? { ...c, id: slugId, fr: catFr.trim(), en: catEn.trim() || catFr.trim(), icon: catIcon } : c));
    } else {
      if (categories.some(c => c.id === slugId)) {
        showToast(language === 'fr' ? 'Cette catégorie existe déjà.' : 'Category ID already exists.');
        return;
      }
      updated = [...categories, { id: slugId, fr: catFr.trim(), en: catEn.trim() || catFr.trim(), icon: catIcon }];
    }

    updateSiteSettings({ categories: updated });
    setIsCategoryModalOpen(false);
    showToast(language === 'fr' ? 'Catégorie enregistrée avec succès !' : 'Category saved successfully!');
  };

  // Delete Category
  const handleDeleteCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    updateSiteSettings({ categories: updated });
    showToast(language === 'fr' ? 'Catégorie supprimée avec succès !' : 'Category deleted successfully!');
  };

  // Open Tag Add/Edit
  const handleOpenTagModal = (t?: TagItem) => {
    if (t) {
      setEditingTag(t);
      setTagFr(t.fr);
      setTagEn(t.en);
    } else {
      setEditingTag(null);
      setTagFr('');
      setTagEn('');
    }
    setIsTagModalOpen(true);
  };

  // Save Tag
  const handleSaveTag = () => {
    if (!tagFr.trim()) {
      showToast(language === 'fr' ? 'Le nom du tag est requis.' : 'Tag name is required.');
      return;
    }

    const slugId = tagFr.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    let updated: TagItem[];

    if (editingTag) {
      updated = tags.map(t => (t.id === editingTag.id ? { ...t, fr: tagFr.trim(), en: tagEn.trim() || tagFr.trim() } : t));
    } else {
      updated = [...tags, { id: slugId, fr: tagFr.trim(), en: tagEn.trim() || tagFr.trim() }];
    }

    updateSiteSettings({ tags: updated });
    setIsTagModalOpen(false);
    showToast(language === 'fr' ? 'Tag enregistré avec succès !' : 'Tag saved successfully!');
  };

  // Delete Tag
  const handleDeleteTag = (id: string) => {
    const updated = tags.filter(t => t.id !== id);
    updateSiteSettings({ tags: updated });
    showToast(language === 'fr' ? 'Tag supprimé avec succès !' : 'Tag deleted successfully!');
  };

  // Add Keyword
  const handleAddKeyword = () => {
    if (!newKeywordInput.trim()) return;
    const val = newKeywordInput.trim();
    if (keywords.includes(val)) {
      showToast(language === 'fr' ? 'Ce mot-clé existe déjà.' : 'Keyword already exists.');
      return;
    }
    const updated = [...keywords, val];
    updateSiteSettings({ keywords: updated });
    setNewKeywordInput('');
    showToast(language === 'fr' ? 'Mot-clé ajouté.' : 'Keyword added.');
  };

  // Delete Keyword
  const handleDeleteKeyword = (kw: string) => {
    const updated = keywords.filter(k => k !== kw);
    updateSiteSettings({ keywords: updated });
    showToast(language === 'fr' ? 'Mot-clé supprimé.' : 'Keyword deleted.');
  };

  // Edit Keyword
  const handleOpenKeywordEdit = (kw: string) => {
    setEditingKeyword(kw);
    setKeywordEditValue(kw);
  };

  const handleSaveKeywordEdit = () => {
    if (!editingKeyword || !keywordEditValue.trim()) return;
    const trimmed = keywordEditValue.trim();
    const updated = keywords.map(k => (k === editingKeyword ? trimmed : k));
    updateSiteSettings({ keywords: updated });
    setEditingKeyword(null);
    setKeywordEditValue('');
    showToast(language === 'fr' ? 'Mot-clé modifié avec succès !' : 'Keyword updated successfully!');
  };

  const filteredKeywords = keywords.filter(k => k.toLowerCase().includes(keywordSearch.toLowerCase()));

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn font-sans text-zinc-100">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 shadow-2xl font-mono text-xs font-black uppercase tracking-widest border border-white/20 animate-bounce">
          ✓ {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-[#E85D42]" size={24} />
            <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-white">
              {language === 'fr' ? 'Gestion de la Taxonomie' : 'Taxonomy & Tag Manager'}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            {language === 'fr' 
              ? 'Créez, modifiez, organisez et supprimez les catégories, étiquettes (tags) et mots-clés du journal.'
              : 'Add, edit, structure, and purge editorial categories, article tags, and search keywords.'}
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex bg-zinc-900 p-1 border border-zinc-800 rounded-lg shrink-0">
          <button
            onClick={() => setActiveSection('categories')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center gap-2 cursor-pointer ${
              activeSection === 'categories' ? 'bg-[#E85D42] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FolderPlus size={14} />
            {language === 'fr' ? `Catégories (${categories.length})` : `Categories (${categories.length})`}
          </button>

          <button
            onClick={() => setActiveSection('tags')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center gap-2 cursor-pointer ${
              activeSection === 'tags' ? 'bg-[#E85D42] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tag size={14} />
            {language === 'fr' ? `Tags (${tags.length})` : `Tags (${tags.length})`}
          </button>

          <button
            onClick={() => setActiveSection('keywords')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center gap-2 cursor-pointer ${
              activeSection === 'keywords' ? 'bg-[#E85D42] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Hash size={14} />
            {language === 'fr' ? `Mots-clés (${keywords.length})` : `Keywords (${keywords.length})`}
          </button>

          {/* Navigation lives here now. The header menu is built from the same
              category ids, so editing one and the other in different admin
              sections was the source of most "my menu/categories drifted apart"
              reports. */}
          <button
            onClick={() => setActiveSection('navigation')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center gap-2 cursor-pointer ${
              activeSection === 'navigation' ? 'bg-[#E85D42] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe size={14} />
            {language === 'fr' ? 'Menu de navigation' : 'Navigation menu'}
          </button>
        </div>
      </div>

      {/* SECTION 1: CATEGORIES */}
      {activeSection === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-zinc-900 p-4 border border-zinc-800 rounded-lg">
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                {language === 'fr' ? 'Catégories Éditables du Journal' : 'Editable Journal Categories'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {language === 'fr' 
                  ? 'Ces catégories sont synchronisées avec le sélecteur d’articles, les filtres et les menus principaux.'
                  : 'These categories populate article filters, creation selectors, and main navigation.'}
              </p>
            </div>
            <button
              onClick={() => handleOpenCategoryModal()}
              className="bg-[#E85D42] hover:bg-[#c94931] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer rounded-md shadow"
            >
              <Plus size={16} />
              {language === 'fr' ? 'Nouvelle Catégorie' : 'Add Category'}
            </button>
          </div>

          {/* Categories Grid Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto shadow-xl">
            <table className="w-full text-left font-sans text-xs whitespace-nowrap">
              <thead className="bg-black border-b border-zinc-800 text-[10px] uppercase tracking-widest text-[#E85D42] font-black">
                <tr>
                  <th className="px-6 py-4">ID (Slug)</th>
                  <th className="px-6 py-4">Français (FR)</th>
                  <th className="px-6 py-4">English (EN)</th>
                  <th className="px-6 py-4 text-center">Articles Associés</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {categories.map(c => {
                  const count = (articles ?? []).filter(a => 
                    (a.category as string)?.toLowerCase() === c.id.toLowerCase() || 
                    (a.category as string)?.toLowerCase() === c.fr.toLowerCase()
                  ).length;

                  return (
                    <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-zinc-400">
                        <span className="bg-zinc-950 px-2 py-1 border border-zinc-800 rounded text-[11px]">
                          {c.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-white text-sm">
                        {c.fr}
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-300 italic">
                        {c.en}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-full border ${
                          count > 0 
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' 
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                        }`}>
                          {count} {count === 1 ? 'article' : 'articles'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => handleOpenCategoryModal(c)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-2 text-rose-400 hover:text-white hover:bg-rose-600 rounded-md transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: TAGS */}
      {activeSection === 'tags' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-zinc-900 p-4 border border-zinc-800 rounded-lg">
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                {language === 'fr' ? 'Étiquettes / Tags Thématiques' : 'Topic Tags Registry'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {language === 'fr'
                  ? 'Gérez les tags réutilisables dans la création d’article et la recherche.'
                  : 'Manage re-usable tags suggested during article editing and search indexing.'}
              </p>
            </div>
            <button
              onClick={() => handleOpenTagModal()}
              className="bg-[#E85D42] hover:bg-[#c94931] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer rounded-md shadow"
            >
              <Plus size={16} />
              {language === 'fr' ? 'Nouveau Tag' : 'Add Tag'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map(t => {
              const count = (articles ?? []).filter(a => a.tags?.some(tag => tag.toLowerCase() === t.fr.toLowerCase() || tag.toLowerCase() === t.id.toLowerCase())).length;

              return (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex justify-between items-center hover:border-zinc-700 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Tag size={13} className="text-[#E85D42]" />
                      <span className="font-bold text-white text-sm">{t.fr}</span>
                      {t.en && t.en !== t.fr && (
                        <span className="text-xs text-zinc-400 font-mono">({t.en})</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {count} {count === 1 ? 'article associé' : 'articles associés'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenTagModal(t)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(t.id)}
                      className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: NAVIGATION MENU. Edited here, next to the categories it
          points at — the two used to live in separate admin sections, which is
          how the header menu and the category list drifted apart. */}
      {activeSection === 'navigation' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-100">
                {language === 'fr' ? 'Menu de navigation principal' : 'Main navigation menu'}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                {language === 'fr'
                  ? 'Réordonnez, renommez, masquez ou ajoutez un lien.'
                  : 'Reorder, rename, hide or add a link.'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSyncNavFromCategories}
                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md cursor-pointer flex items-center gap-1.5"
                title={language === 'fr' ? 'Reconstruire depuis les catégories' : 'Rebuild from categories'}
              >
                <RefreshCw size={12} className="text-[#E85D42]" />
                {language === 'fr' ? 'Sync' : 'Sync'}
              </button>
              <button
                onClick={handleAddNavItem}
                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-[#E85D42] hover:bg-[#c94931] text-white rounded-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={12} />
                {language === 'fr' ? 'Ajouter' : 'Add'}
              </button>
            </div>
          </div>

          {navItems.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-6 text-center">
              {language === 'fr' ? 'Aucun lien. Utilisez « Sync » pour construire le menu.' : 'No links. Use "Sync" to build the menu.'}
            </p>
          ) : (
            <div className="space-y-2">
              {navItems.map((item, index) => (
                <div key={item.id} className="flex flex-col lg:flex-row lg:items-center gap-2 p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleMoveNavItem(index, -1)} disabled={index === 0}
                      className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                      title={language === 'fr' ? 'Monter' : 'Move up'}>
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => handleMoveNavItem(index, 1)} disabled={index === navItems.length - 1}
                      className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                      title={language === 'fr' ? 'Descendre' : 'Move down'}>
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <input type="text" value={item.labelFr || ''} onChange={e => handleUpdateNavItem(index, 'labelFr', e.target.value)}
                    placeholder="FR" className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-[#E85D42] rounded" />
                  <input type="text" value={item.labelEn || ''} onChange={e => handleUpdateNavItem(index, 'labelEn', e.target.value)}
                    placeholder="EN" className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-[#E85D42] rounded" />
                  <input type="text" value={item.url || ''} onChange={e => handleUpdateNavItem(index, 'url', e.target.value)}
                    placeholder="/category/..." className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 text-[11px] font-mono focus:outline-none focus:border-[#E85D42] rounded" />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleToggleNavItem(index)}
                      className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded cursor-pointer border ${item.enabled !== false ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                      {item.enabled !== false ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => handleRemoveNavItem(index)} className="p-1.5 text-zinc-400 hover:text-red-400 cursor-pointer" title={language === 'fr' ? 'Supprimer' : 'Remove'}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-zinc-800">
            <button onClick={handleSaveNav}
              className="px-5 py-2 text-[10px] font-black uppercase tracking-wider bg-[#E85D42] hover:bg-[#c94931] text-white rounded-md cursor-pointer">
              {language === 'fr' ? 'Enregistrer le menu' : 'Save menu'}
            </button>
          </div>
        </div>
      )}

      {activeSection === 'keywords' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 p-6 border border-zinc-800 rounded-lg space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Hash className="text-[#E85D42]" size={16} />
                {language === 'fr' ? 'Mots-Clés SEO & Référencement' : 'SEO & Metadata Keyword Index'}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {language === 'fr'
                  ? 'Mots-clés automatiques injectés dans les meta-tags de recherche Google et OpenGraph.'
                  : 'Automated keywords injected into Google meta tags and social preview crawlers.'}
              </p>
            </div>

            {/* Quick Add Bar */}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={language === 'fr' ? 'Tapez un nouveau mot-clé (ex: "Géopolitique", "Pétrole")...' : 'Type a new keyword...'}
                value={newKeywordInput}
                onChange={e => setNewKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                className="flex-1 bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white rounded-md focus:outline-none focus:border-[#E85D42] font-semibold"
              />
              <button
                onClick={handleAddKeyword}
                className="bg-[#E85D42] hover:bg-[#c94931] text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} />
                {language === 'fr' ? 'Ajouter' : 'Add Keyword'}
              </button>
            </div>

            {/* Filter Search */}
            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder={language === 'fr' ? 'Filtrer les mots-clés...' : 'Search keywords...'}
                value={keywordSearch}
                onChange={e => setKeywordSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-md focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>

          {/* Keywords Pills Grid */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
            <div className="flex flex-wrap gap-2.5">
              {filteredKeywords.map(kw => (
                <div
                  key={kw}
                  className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-1.5 text-xs font-bold font-mono rounded-full transition-all group"
                >
                  <span className="text-[#E85D42]">#</span>
                  <span>{kw}</span>
                  <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-800 pl-1.5">
                    <button
                      onClick={() => handleOpenKeywordEdit(kw)}
                      className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Edit keyword"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={() => handleDeleteKeyword(kw)}
                      className="p-0.5 hover:bg-rose-600 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Remove keyword"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {filteredKeywords.length === 0 && (
                <p className="text-zinc-500 text-xs italic font-mono py-4">
                  {language === 'fr' ? 'Aucun mot-clé trouvé.' : 'No keywords found.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-full max-w-md space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                <FolderPlus className="text-[#E85D42]" size={16} />
                {editingCategory 
                  ? (language === 'fr' ? 'Modifier la Catégorie' : 'Edit Category')
                  : (language === 'fr' ? 'Créer une Catégorie' : 'Create New Category')}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Nom en Français (FR) *
                </label>
                <input
                  type="text"
                  placeholder="ex: Géopolitique, Culture..."
                  value={catFr}
                  onChange={e => setCatFr(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white rounded-md focus:outline-none focus:border-[#E85D42] font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Name in English (EN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Geopolitics, Culture..."
                  value={catEn}
                  onChange={e => setCatEn(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white rounded-md focus:outline-none focus:border-[#E85D42]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Identifiant / Slug ID (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="ex: geopolitique"
                  value={catId}
                  onChange={e => setCatId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-zinc-300 font-mono rounded-md focus:outline-none focus:border-[#E85D42]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer"
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-5 py-2 bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer flex items-center gap-1.5"
              >
                <Check size={15} />
                {language === 'fr' ? 'Enregistrer' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAG MODAL */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-full max-w-md space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Tag className="text-[#E85D42]" size={16} />
                {editingTag 
                  ? (language === 'fr' ? 'Modifier le Tag' : 'Edit Tag')
                  : (language === 'fr' ? 'Créer un Tag' : 'Create New Tag')}
              </h3>
              <button
                onClick={() => setIsTagModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Nom du Tag (FR) *
                </label>
                <input
                  type="text"
                  placeholder="ex: UEMOA, Gaz naturel..."
                  value={tagFr}
                  onChange={e => setTagFr(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white rounded-md focus:outline-none focus:border-[#E85D42] font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Tag Name (EN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. WAEMU, Natural Gas..."
                  value={tagEn}
                  onChange={e => setTagEn(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white rounded-md focus:outline-none focus:border-[#E85D42]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setIsTagModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer"
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveTag}
                className="px-5 py-2 bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer flex items-center gap-1.5"
              >
                <Check size={15} />
                {language === 'fr' ? 'Enregistrer' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KEYWORD EDIT MODAL */}
      {editingKeyword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-full max-w-md space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Hash className="text-[#E85D42]" size={16} />
                {language === 'fr' ? 'Modifier le Mot-Clé' : 'Edit Keyword'}
              </h3>
              <button
                onClick={() => setEditingKeyword(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  {language === 'fr' ? 'Intitulé du Mot-Clé *' : 'Keyword Text *'}
                </label>
                <input
                  type="text"
                  value={keywordEditValue}
                  onChange={e => setKeywordEditValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveKeywordEdit()}
                  className="w-full bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white rounded-md focus:outline-none focus:border-[#E85D42] font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setEditingKeyword(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer"
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveKeywordEdit}
                className="px-5 py-2 bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer flex items-center gap-1.5"
              >
                <Check size={15} />
                {language === 'fr' ? 'Enregistrer' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
