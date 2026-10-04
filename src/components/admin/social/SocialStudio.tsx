/**
 * The Social Studio.
 *
 * A full-screen modal that turns an article — or ad hoc content — into editable
 * cards and bilingual captions.
 *
 * State ownership:
 *  - `design` is the versioned document from `migrateSocialDesign`. It holds
 *    design plus caption overrides ONLY, so nothing here can overwrite the
 *    article's own title, excerpt or date.
 *  - Undo/redo keeps past snapshots. Dragging a layer fires many patches, so
 *    `applyChange` coalesces them within a short window instead of filling the
 *    history with one entry per pointer event.
 *  - Autosave is debounced and writes back through `updateArticle`, so the design
 *    survives a reload without an explicit save button.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Grid3x3,
  Layers as LayersIcon,
  Redo2,
  Save,
  Copy,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import type { Article } from '../../../types';
import type {
  AdHocSource,
  SocialCard,
  SocialDesign,
  SocialLayer,
  SocialMode,
  SocialNetwork,
  TemplateId,
} from '../../../types/social';
import { DEFAULT_FORMAT_ID, getFormat, getNetwork, MAX_CARDS, NETWORK_ORDER, resolveCaptionSlot } from '../../../lib/social/networks';
import { resolveContent, type SocialSource } from '../../../lib/social/content';
import { generateBothCaptions } from '../../../lib/social/captions';
import { createImage, createShape, createText, migrateSocialDesign, uid } from '../../../lib/social/document';
import { buildCard, buildInitialCards, syncAllDots } from '../../../lib/social/templates';
import { downloadCanvasAsPng, downloadTextFile, exportFilename, renderCardToCanvas } from '../../../lib/social/renderer';
import { preloadAssets, ensureFontsReady } from '../../../lib/social/imageLoader';
import { StudioStage } from './StudioStage';
import { LayersPanel } from './LayersPanel';
import { FiltersPanel } from './FiltersPanel';
import { InspectorPanel } from './InspectorPanel';
import { CaptionPanel } from './CaptionPanel';
import { CardThumbnail } from './CardThumbnail';
import { GhostButton } from './StudioPrimitives';
import { MediaSelector } from '../components/MediaSelector';

const TEMPLATES: Array<{ id: TemplateId; labelFr: string; labelEn: string }> = [
  { id: 'cover', labelFr: 'Couverture', labelEn: 'Cover' },
  { id: 'brief', labelFr: 'Le Brief', labelEn: 'Brief' },
  { id: 'closing', labelFr: 'Clôture', labelEn: 'Closing' },
  { id: 'blank', labelFr: 'Vierge', labelEn: 'Blank' },
];

export interface SocialStudioProps {
  article: Article | null;
  adHoc?: AdHocSource | null;
  logoSrc?: string;
  logoLight?: string;
  logoDark?: string;
  language: 'fr' | 'en';
  onSave: (design: SocialDesign) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

type RightTab = 'design' | 'filters' | 'captions' | 'export';

export function SocialStudio({
  article,
  adHoc,
  logoSrc,
  logoLight,
  logoDark,
  language,
  onSave,
  onClose,
}: SocialStudioProps) {
  const source = (adHoc ?? article) as SocialSource | null;
  const content = useMemo(() => (source ? resolveContent(source) : null), [source]);

  // Ad hoc content has no stored design, so it starts empty and the editor picks
  // a template before anything is built.
  const [design, setDesign] = useState<SocialDesign>(() =>
    migrateSocialDesign(article?.social ?? null, 'instagram'),
  );
  const [activeCard, setActiveCard] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('design');
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const history = useRef<SocialDesign[]>([]);
  const future = useRef<SocialDesign[]>([]);
  const lastChangeAt = useRef(0);

  const format = getFormat(design.network, design.formatId);
  const spec = getNetwork(design.network);
  const card = design.cards[activeCard] ?? null;

  const t = useCallback((fr: string, en: string) => (language === 'fr' ? fr : en), [language]);

  // Fonts must be loaded before the first paint, or the canvas measures text in
  // a fallback face and wraps differently from the export.
  useEffect(() => {
    ensureFontsReady([
      { family: 'Playfair Display', weights: [400, 700, 800, 900], styles: ['normal', 'italic'] },
      { family: 'Lora', weights: [400, 700], styles: ['normal', 'italic'] },
      { family: 'Inter', weights: [400, 600, 700, 800], styles: ['normal'] },
      { family: 'Montserrat', weights: [700, 800], styles: ['normal'] },
    ]);
  }, []);

  /**
   * Apply a design change and record one undo entry.
   *
   * Consecutive changes within 500 ms — a drag, a slider, a held arrow key —
   * collapse into a single entry, so undo steps out of the gesture rather than
   * back through every intermediate pixel.
   */
  const applyChange = useCallback((next: SocialDesign | ((d: SocialDesign) => SocialDesign)) => {
    setDesign(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      const now = Date.now();
      if (now - lastChangeAt.current > 500) {
        history.current.push(prev);
        // Bound the history so a long session cannot grow without limit.
        if (history.current.length > 60) history.current.shift();
      }
      lastChangeAt.current = now;
      future.current = [];
      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(design);
    setDesign(prev);
  }, [design]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(design);
    setDesign(next);
  }, [design]);

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const cards = design.cards;

  const updateCard = useCallback((index: number, fn: (c: SocialCard) => SocialCard) => {
    applyChange(d => ({ ...d, cards: d.cards.map((c, i) => (i === index ? fn(c) : c)) }));
  }, [applyChange]);

  const patchLayer = useCallback((id: string, patch: Partial<SocialLayer>) => {
    if (activeCard < 0 || activeCard >= design.cards.length) return;
    updateCard(activeCard, c => ({
      ...c,
      layers: c.layers.map(l => (l.id === id ? ({ ...l, ...patch } as SocialLayer) : l)),
    }));
  }, [activeCard, design.cards.length, updateCard]);

  const addLayer = useCallback((kind: 'text' | 'shape' | 'image') => {
    if (!card) return;
    const newLayer: SocialLayer =
      kind === 'text'
        ? createText({
            name: 'Nouveau texte',
            text: 'Votre texte',
            x: Math.round(format.width * 0.2),
            y: Math.round(format.height * 0.4),
            w: Math.round(format.width * 0.6),
            h: Math.round(format.height * 0.12),
          })
        : kind === 'shape'
          ? createShape({
              name: 'Nouvelle forme',
              x: Math.round(format.width * 0.2),
              y: Math.round(format.height * 0.4),
              w: Math.round(format.width * 0.3),
              h: Math.round(format.height * 0.05),
            })
          : createImage({
              name: 'Nouvelle image',
              src: '',
              x: Math.round(format.width * 0.1),
              y: Math.round(format.height * 0.1),
              w: Math.round(format.width * 0.8),
              h: Math.round(format.height * 0.4),
            });
    // New layers land on top, where an editor expects to grab them.
    updateCard(activeCard, c => ({ ...c, layers: [...c.layers, newLayer] }));
    setSelectedId(newLayer.id);
  }, [card, format, activeCard, updateCard]);

  const reorderLayer = useCallback((id: string, direction: 'up' | 'down' | 'front' | 'back') => {
    updateCard(activeCard, c => {
      const layers = [...c.layers];
      const index = layers.findIndex(l => l.id === id);
      if (index < 0) return c;
      const target =
        direction === 'front' ? layers.length - 1
          : direction === 'back' ? 0
            : direction === 'up' ? Math.min(layers.length - 1, index + 1)
              : Math.max(0, index - 1);
      if (target === index) return c;
      const [item] = layers.splice(index, 1);
      layers.splice(target, 0, item);
      return { ...c, layers };
    });
  }, [activeCard, updateCard]);

  const duplicateLayer = useCallback((id: string) => {
    updateCard(activeCard, c => {
      const index = c.layers.findIndex(l => l.id === id);
      if (index < 0) return c;
      const source = c.layers[index];
      const copy = { ...source, id: uid(), name: `${source.name} (copie)`, x: source.x + 20, y: source.y + 20 };
      const layers = [...c.layers];
      layers.splice(index + 1, 0, copy);
      setSelectedId(copy.id);
      return { ...c, layers };
    });
  }, [activeCard, updateCard]);

  const deleteLayer = useCallback((id: string) => {
    updateCard(activeCard, c => ({ ...c, layers: c.layers.filter(l => l.id !== id) }));
    setSelectedId(null);
  }, [activeCard, updateCard]);

  /** Rebuild every card from the current network format and template. */
  const rebuildCards = useCallback((templateId: TemplateId, mode: SocialMode) => {
    if (!content) return;
    const opts = { format, content, logoSrc, logoLight, logoDark };
    const nextCards = buildInitialCards(templateId, opts, mode, MAX_CARDS);
    applyChange(d => ({ ...d, mode, cards: syncAllDots(nextCards, format) }));
    setActiveCard(0);
    setSelectedId(null);
  }, [content, format, logoSrc, logoLight, logoDark, applyChange]);

  const addCard = useCallback(() => {
    if (!content || design.cards.length >= MAX_CARDS) return;
    const opts = { format, content, logoSrc, logoLight, logoDark };
    applyChange(d => ({ ...d, cards: syncAllDots([...d.cards, buildCard('brief', opts)], format) }));
    setActiveCard(design.cards.length);
  }, [content, format, logoSrc, logoLight, logoDark, design.cards.length, applyChange]);

  const removeCard = useCallback((index: number) => {
    applyChange(d => ({ ...d, cards: syncAllDots(d.cards.filter((_, i) => i !== index), format) }));
    setActiveCard(0);
  }, [format, applyChange]);

  const duplicateCard = useCallback((index: number) => {
    if (design.cards.length >= MAX_CARDS) return;
    applyChange(d => {
      const source = d.cards[index];
      if (!source) return d;
      // Fresh ids for the card and every layer, so selection and per-layer
      // filter state stay independent of the original.
      const copy: SocialCard = {
        ...source,
        id: uid('c'),
        layers: source.layers.map(l => ({ ...l, id: uid() })),
      };
      const nextCards = syncAllDots(
        [...d.cards.slice(0, index + 1), copy, ...d.cards.slice(index + 1)],
        format,
      );
      return { ...d, cards: nextCards };
    });
  }, [design.cards.length, format, applyChange]);
  // ---- Captions ------------------------------------------------------------

  // A network-specific caption wins; otherwise the shared one is edited, so an
  // editor working in two platforms does not have to write the same text twice
  // — and can override one platform without touching the other.
  const captionSlotKey: 'universal' | SocialNetwork = design.captions[design.network]
    ? design.network
    : 'universal';
  const captionSlot = design.captions[captionSlotKey] ?? { fr: '', en: '' };

  const setCaptions = useCallback((caption: { fr: string; en: string }) => {
    applyChange(d => ({ ...d, captions: { ...d.captions, [captionSlotKey]: caption } }));
  }, [applyChange, captionSlotKey]);

  const regenerateBoth = useCallback(() => {
    if (!source) return;
    const drafts = generateBothCaptions(source, design.network);
    applyChange(d => ({
      ...d,
      captions: { ...d.captions, [captionSlotKey]: { fr: drafts.fr.text, en: drafts.en.text } },
      generatedAt: new Date().toISOString(),
    }));
  }, [source, design.network, applyChange, captionSlotKey]);

  // ---- Assets --------------------------------------------------------------

  const applyAsset = useCallback(async (src: string) => {
    const layer = card?.layers.find(l => l.id === selectedId);
    if (!layer) return;
    if (layer.kind === 'logo') {
      patchLayer(selectedId!, {
        src,
        toneSrc: { light: layer.toneSrc?.light || src, dark: layer.toneSrc?.dark || src },
      } as Partial<SocialLayer>);
    } else if (layer.kind === 'background' || layer.kind === 'image') {
      patchLayer(selectedId!, { src } as Partial<SocialLayer>);
    }
    await preloadAssets([src]);
  }, [selectedId, card, patchLayer]);

  /** Device uploads become data URLs so they travel inside the saved document. */
  const handleDeviceFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus(t('Ce fichier n’est pas une image.', 'That file is not an image.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) await applyAsset(dataUrl);
    };
    reader.onerror = () => setStatus(t('Lecture du fichier impossible.', 'Could not read that file.'));
    reader.readAsDataURL(file);
  }, [applyAsset, t]);

  // ---- Persistence ---------------------------------------------------------

  const [dirty, setDirty] = useState(false);
  useEffect(() => { setDirty(true); }, [design]);

  useEffect(() => {
    // An empty document is not worth persisting; opening the studio and closing
    // it must not create a `social` field on every article.
    if (!dirty || !article) return;
    if (design.cards.length === 0 && !Object.keys(design.captions).length) return;
    const timer = setTimeout(async () => {
      const result = await onSave(design);
      if (result?.success) setDirty(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [design, dirty, article, onSave]);

  const saveNow = useCallback(async () => {
    if (!article) return;
    setSaving(true);
    const result = await onSave(design);
    setSaving(false);
    setDirty(false);
    setStatus(result?.success
      ? t('Design enregistré sur l’article.', 'Design saved to the article.')
      : t('Échec de l’enregistrement.', 'Save failed.'));
  }, [article, design, onSave, t]);

  // ---- Export --------------------------------------------------------------

  const captionText = useCallback(() => {
    const slot = resolveCaptionSlot(design.captions, design.network);
    const fmt = getFormat(design.network, design.formatId);
    return [
      content.title,
      '',
      `${fmt.width}x${fmt.height} — ${getNetwork(design.network).label}`,
      '',
      'FRANÇAIS',
      slot.fr || '(aucune légende)',
      '',
      'ENGLISH',
      slot.en || '(aucune légende)',
      '',
      content.url,
    ].filter(line => line !== undefined).join('\n');
  }, [design, content]);

  const exportCard = useCallback(async (index: number) => {
    if (!content) return;
    setExporting(true);
    try {
      const canvas = await renderCardToCanvas(design.cards[index], format, { content });
      const name = exportFilename(content.slug, design.network, index, design.cards.length);
      await downloadCanvasAsPng(canvas, name);
      setStatus(t('Image exportée.', 'Image exported.'));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t('Export impossible.', 'Export failed.'));
    } finally {
      setExporting(false);
    }
  }, [content, design.cards, design.network, format, t]);

  const exportAll = useCallback(async () => {
    // Sequential: parallel downloads get rate-limited and arrive out of order.
    for (let i = 0; i < design.cards.length; i++) {
      await exportCard(i);
      await new Promise(r => setTimeout(r, 350));
    }
  }, [design.cards.length, exportCard]);

  if (!content || !source) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 max-w-md text-center">
          <p className="text-sm font-bold text-zinc-200 mb-2">{t('Aucun contenu source.', 'No source content.')}</p>
          <p className="text-xs text-zinc-500 mb-4">
            {t('Sélectionnez un article ou fournissez un contenu ad hoc.', 'Pick an article or supply ad hoc content.')}
          </p>
          <GhostButton onClick={onClose} tone="accent">{t('Fermer', 'Close')}</GhostButton>
        </div>
      </div>
    );
  }

  const selectedLayer = card?.layers.find(l => l.id === selectedId) ?? null;
  const logoAuto = Boolean(card?.layers.some(l => l.kind === 'logo' && l.tone === 'auto'));
  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white transition-colors" title={t('Retour', 'Back')}>
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#E85D42]">Social Studio</h2>
          <p className="text-[9px] font-mono text-zinc-500 truncate">{content.title || t('Sans titre', 'Untitled')}</p>
        </div>

        <div className="flex-1" />
        {status && <span className="text-[10px] font-mono text-zinc-400 truncate max-w-xs">{status}</span>}

        <GhostButton onClick={undo} disabled={history.current.length === 0} title={t('Annuler (Ctrl+Z)', 'Undo (Ctrl+Z)')}>
          <Undo2 size={12} />
        </GhostButton>
        <GhostButton onClick={redo} disabled={future.current.length === 0} title={t('Rétablir', 'Redo')}>
          <Redo2 size={12} />
        </GhostButton>

        {article && (
          <button
            onClick={saveNow}
            disabled={saving}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E85D42] text-[#E85D42] hover:bg-[#E85D42] hover:text-white transition-colors disabled:opacity-40"
          >
            <Save size={12} className="inline mr-1" />
            {saving ? t('Enregistrement…', 'Saving…') : t('Enregistrer', 'Save')}
          </button>
        )}
        <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white transition-colors" title={t('Fermer', 'Close')}>
          <X size={16} />
        </button>
      </header>

      {/* Mode, network and format */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 shrink-0 flex-wrap">
        <div className="flex gap-1">
          {(['single', 'carousel'] as SocialMode[]).map(m => (
            <button
              key={m}
              onClick={() => { if (design.mode !== m) rebuildCards(card?.templateId ?? 'cover', m); }}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                design.mode === m
                  ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {m === 'single' ? t('Carte unique', 'Single card') : t('Carrousel', 'Carousel')}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-zinc-800" />

        <div className="flex gap-1 flex-wrap">
          {NETWORK_ORDER.map(n => (
            <button
              key={n}
              onClick={() => {
                if (design.network === n) return;
                // The format must be re-resolved: an Instagram format id means
                // nothing to TikTok.
                applyChange(d => ({ ...d, network: n, formatId: DEFAULT_FORMAT_ID[n] }));
                setStatus(t(
                  `Passé sur ${getNetwork(n).label} : la mise en page est conservée, les formats disponibles changent.`,
                  `Switched to ${getNetwork(n).label}: the layout is kept, the available formats change.`,
                ));
              }}
              title={getNetwork(n).label}
              className="px-2 py-1 text-[10px] font-bold border transition-colors"
              style={design.network === n
                ? { backgroundColor: getNetwork(n).accent, borderColor: getNetwork(n).accent, color: '#fff' }
                : { backgroundColor: 'rgb(9 9 11)', borderColor: 'rgb(39 39 42)', color: 'rgb(113 113 122)' }}
            >
              {getNetwork(n).glyph}
            </button>
          ))}
        </div>

        <select
          value={design.formatId}
          onChange={(e) => applyChange(d => ({ ...d, formatId: e.target.value }))}
          className="bg-zinc-950 border border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-200 focus:outline-none focus:border-[#E85D42]"
        >
          {spec.formats.map(f => (
            <option key={f.id} value={f.id}>{f.label} ({f.ratio})</option>
          ))}
        </select>

        <div className="flex-1" />

        <GhostButton
          onClick={() => setShowSafeZones(v => !v)}
          tone={showSafeZones ? 'accent' : 'default'}
          title={t('Zones couvertes par l’interface de la plateforme', 'Regions the platform UI covers')}
        >
          <Eye size={12} /> {t('Zones sûres', 'Safe zones')}
        </GhostButton>
      </div>
      <div className="flex-1 min-h-0 flex">
        {/* Left: templates and the card strip */}
        <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900/40 flex flex-col">
          <div className="p-3 border-b border-zinc-800">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#E85D42] mb-2">
              {t('Modèles', 'Templates')}
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => rebuildCards(tpl.id, design.mode)}
                  className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border transition-colors ${
                    card?.templateId === tpl.id
                      ? 'bg-[#E85D42] border-[#E85D42] text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {language === 'fr' ? tpl.labelFr : tpl.labelEn}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-zinc-600 mt-2 leading-relaxed">
              {t(
                'Appliquer un modèle reconstruit les cartes et écrase les modifications en cours.',
                'Applying a template rebuilds the cards and discards current edits.',
              )}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#E85D42]">
                {t('Cartes', 'Cards')} ({cards.length})
              </h4>
              <GhostButton onClick={addCard} disabled={cards.length >= MAX_CARDS || design.mode === 'single'}>
                + {t('Carte', 'Card')}
              </GhostButton>
            </div>

            <div className="flex flex-col gap-1.5">
              {cards.map((c, index) => (
                <div
                  key={c.id}
                  onClick={() => { setActiveCard(index); setSelectedId(null); }}
                  className={`group cursor-pointer border p-2 transition-colors ${
                    index === activeCard
                      ? 'border-[#E85D42] bg-[#E85D42]/5'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-zinc-300">
                      {index + 1}.{' '}
                      {c.templateId === 'cover' ? t('Couverture', 'Cover')
                        : c.templateId === 'brief' ? t('Brief', 'Brief')
                        : c.templateId === 'closing' ? t('Clôture', 'Closing') : t('Vierge', 'Blank')}
                    </span>
                    <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); duplicateCard(index); }}
                        title={t('Dupliquer', 'Duplicate')}
                        className="text-zinc-500 hover:text-zinc-100"
                      >
                        <Copy size={10} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCard(index); }}
                        title={t('Supprimer', 'Delete')}
                        disabled={cards.length <= 1}
                        className="text-zinc-500 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 size={10} />
                      </button>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden"
                    style={{ aspectRatio: `${format.width} / ${format.height}`, maxHeight: 110 }}
                  >
                    <CardThumbnail
                      card={c}
                      format={format}
                      content={content}
                      logoSrc={logoSrc}
                      logoLight={logoLight}
                      logoDark={logoDark}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
        {/* Centre: the canvas */}
        {card ? (
          <StudioStage
            card={card}
            format={format}
            content={content}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChangeLayer={patchLayer}
            preloadedSources={content.image ? [content.image] : []}
            showSafeZones={showSafeZones}
            logoAuto={logoAuto}
          />
        ) : (
          <div className="flex-1 grid place-items-center text-xs text-zinc-500 text-center px-6">
            {t(
              'Aucune carte. Choisissez un modèle à gauche pour commencer.',
              'No cards yet. Pick a template on the left to begin.',
            )}
          </div>
        )}

        {/* Right: panels */}
        <aside className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/40 flex flex-col">
          <div className="flex border-b border-zinc-800 shrink-0">
            {([
              ['design', t('Calques', 'Layers'), LayersIcon],
              ['filters', t('Effets', 'Filters'), Grid3x3],
              ['captions', t('Légendes', 'Captions'), FileText],
              ['export', t('Export', 'Export'), Download],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setRightTab(id)}
                className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border-b-2 transition-colors inline-flex items-center justify-center gap-1 ${
                  rightTab === id
                    ? 'border-[#E85D42] text-[#E85D42]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {rightTab === 'design' && card && (
              <div className="flex flex-col gap-4">
                <LayersPanel
                  layers={card.layers}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onPatch={patchLayer}
                  onReorder={reorderLayer}
                  onDuplicate={duplicateLayer}
                  onDelete={deleteLayer}
                  onAdd={addLayer}
                />
                <InspectorPanel
                  layer={selectedLayer}
                  formatWidth={format.width}
                  formatHeight={format.height}
                  onPatch={(patch) => { if (selectedId) patchLayer(selectedId, patch); }}
                  onRename={(name) => selectedId && patchLayer(selectedId, { name })}
                  onOpenLibrary={() => setMediaOpen(true)}
                  onDeviceFile={handleDeviceFile}
                />
              </div>
            )}

            {rightTab === 'filters' && (
              <FiltersPanel
                layer={selectedLayer}
                onPatch={(patch) => { if (selectedId) patchLayer(selectedId, patch); }}
              />
            )}

            {rightTab === 'captions' && (
              <CaptionPanel
                source={source}
                network={design.network}
                captions={captionSlot}
                slotLabel={captionSlotKey === 'universal'
                  ? t('Légende commune', 'Shared caption')
                  : getNetwork(design.network).label}
                generatedAt={design.generatedAt}
                onChange={setCaptions}
                onRegenerate={(c) => applyChange(d => ({
                  ...d,
                  captions: { ...d.captions, [captionSlotKey]: c },
                  generatedAt: new Date().toISOString(),
                }))}
                onConfirmRegenerate={() => {
                  if (window.confirm(t(
                    'Régénérer les deux légendes ? Vos modifications seront remplacées.',
                    'Regenerate both captions? Your edits will be replaced.',
                  ))) regenerateBoth();
                }}
              />
            )}
            {rightTab === 'export' && (
              <div className="flex flex-col gap-4">
                <div className="border border-zinc-800 bg-zinc-950 p-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#E85D42] mb-2">
                    {t('Images PNG', 'PNG images')}
                  </h4>
                  <p className="text-[9px] text-zinc-500 mb-3 leading-relaxed">
                    {t(
                      `Chaque carte est exportée à la taille native ${format.width}×${format.height}, identique à l’aperçu.`,
                      `Each card exports at the native ${format.width}×${format.height} size, identical to the preview.`,
                    )}
                  </p>
                  <div className="flex flex-col gap-1">
                    {cards.map((_, i) => (
                      <GhostButton key={i} onClick={() => exportCard(i)} disabled={exporting}>
                        {t('Exporter la carte', 'Export card')} {i + 1}
                      </GhostButton>
                    ))}
                    <GhostButton onClick={exportAll} tone="accent" disabled={exporting || cards.length === 0}>
                      <Download size={11} /> {t('Tout exporter', 'Export all')} ({cards.length})
                    </GhostButton>
                  </div>
                </div>

                <div className="border border-zinc-800 bg-zinc-950 p-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#E85D42] mb-2">
                    {t('Légendes', 'Captions')}
                  </h4>
                  <GhostButton
                    onClick={() => downloadTextFile(captionText(), exportFilename(content.slug, design.network, 0, 1))}
                  >
                    {t('Télécharger les deux langues', 'Download both languages')}
                  </GhostButton>
                </div>

                {!article && (
                  <div className="flex items-start gap-2 p-2 border border-amber-700/60 bg-amber-950/30">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-200 leading-relaxed">
                      {t(
                        'Contenu ad hoc : rien n’est enregistré. Exportez les images avant de fermer.',
                        'Ad hoc content: nothing is saved. Export the images before closing.',
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {mediaOpen && (
        <MediaSelector onSelect={url => applyAsset(url)} onClose={() => setMediaOpen(false)} />
      )}
    </div>
  );
}