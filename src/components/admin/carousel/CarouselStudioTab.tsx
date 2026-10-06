import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../../store';
import type { Article } from '../../../types';
import type { CarouselCardKind, CarouselDraft, CarouselImageFit } from '../../../lib/carousel/types';
import { CAROUSEL_SIZE, MAX_CAROUSEL_PARAGRAPHS } from '../../../lib/carousel/types';
import { buildDraftFromArticle, emptyDraft, normalizeDraft } from '../../../lib/carousel/draft';
import { defaultFontSize, textSizeRange } from '../../../lib/carousel/layout';
import { renderCardToDataUrl } from '../../../lib/carousel/render';
import { collectDraftImages, loadCardImages } from '../../../lib/carousel/images';
import { compressImageFile, trimTransparentLogo } from '../../../lib/imageUtils';
import { CarouselPreview } from './CarouselPreview';
import { ArticlePicker } from '../ArticlePicker';
import {
  AlertTriangle, Check, Crop, Download, Image as ImageIcon,
  Loader2, Plus, RotateCcw, Save, Share2, Trash2, Type, Upload, X,
} from 'lucide-react';

/** Widest the big editing card may get, so it never overflows a laptop panel. */
const CARD_EDIT_MAX_WIDTH = 520;

const CARD_LABELS: Record<CarouselCardKind, string> = {
  cover: '1 · Couverture',
  body: '2 · Développement',
  closing: '3 · Clôture',
};

/**
 * Downloads PNGs straight to the device's Downloads folder.
 *
 * Pure download path on purpose: it NEVER opens the native share sheet, so
 * "Télécharger" and "Partager" stay two separate outcomes. Blobs are revoked
 * late and downloads are staggered — rapid-fire clicks get collapsed into one
 * file by mobile browsers, and revoking too early aborts large PNGs.
 *
 * Returns true when every file was handed to the browser.
 */
async function downloadPngBlobs(items: Array<{ dataUrl: string; filename: string }>): Promise<boolean> {
  const toFile = async ({ dataUrl, filename }: { dataUrl: string; filename: string }): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
  };

  const clickDownload = async (file: File | { name: string; dataUrl: string }) => {
    const url = 'dataUrl' in file ? file.dataUrl : URL.createObjectURL(file);
    const ownsUrl = !('dataUrl' in file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    // Let the download start before cleaning up: phones drop downloads whose
    // URL dies in the same task.
    await new Promise(r => setTimeout(r, 900));
    if (link.parentNode) link.parentNode.removeChild(link);
    if (ownsUrl) setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  try {
    const files = await Promise.all(items.map(toFile));
    for (const file of files) await clickDownload(file);
    return true;
  } catch {
    // Fallback: direct anchor clicks off the data URLs, one per card.
    try {
      for (const { dataUrl, filename } of items) {
        await clickDownload({ name: filename, dataUrl });
      }
      return true;
    } catch {
      return false;
    }
  }
}

/** Share-sheet result: shared, dismissed, or not supported on this device. */
type ShareOutcome = 'shared' | 'dismissed' | 'unsupported';

/**
 * Shares PNGs through the native share sheet ONLY — never downloads.
 *
 * All files go through ONE `navigator.share({ files })` call, so the sheet
 * holds every card at once (no sheet-per-card race where the first cards get
 * replaced before the user saves them). Returns 'unsupported' when the device
 * cannot share files, so the caller can say so instead of silently doing
 * nothing or falling back to a download the user did not ask for.
 */
async function sharePngFiles(
  items: Array<{ dataUrl: string; filename: string }>,
  title: string,
): Promise<ShareOutcome> {
  try {
    const files = await Promise.all(items.map(async ({ dataUrl, filename }) => {
      const res = await fetch(dataUrl);
      return new File([await res.blob()], filename, { type: 'image/png' });
    }));
    if (
      typeof navigator === 'undefined'
      || !('canShare' in navigator)
      || !(navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }).canShare?.({ files })
    ) {
      return 'unsupported';
    }
    try {
      await (navigator as Navigator & { share: (d: { files: File[]; title?: string }) => Promise<void> }).share({
        files,
        title,
      });
      return 'shared';
    } catch (shareErr: unknown) {
      // Dismissed by the user: nothing was shared, but that is the user's
      // choice — not a failure of the export.
      return shareErr instanceof DOMException && shareErr.name === 'AbortError' ? 'dismissed' : 'unsupported';
    }
  } catch {
    return 'unsupported';
  }
}

/** A small labelled field, matching the admin's uppercase-label style. */
function Field({
  label, value, onChange, multiline, rows, maxLength, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  hint?: string;
}) {
  const shared = 'w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm p-2.5 rounded-md focus:border-[#B8471F] focus:outline-none';
  return (
    <div>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
        {label}
        {maxLength ? <span className="text-zinc-600 normal-case tracking-normal ml-1">({value.length}/{maxLength})</span> : null}
      </label>
      {multiline ? (
        <textarea
          value={value}
          rows={rows || 3}
          maxLength={maxLength}
          onChange={e => onChange(e.target.value)}
          className={`${shared} resize-y leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={value}
          maxLength={maxLength}
          onChange={e => onChange(e.target.value)}
          className={shared}
        />
      )}
      {hint ? <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{hint}</p> : null}
    </div>
  );
}

/**
 * One per-block font-size slider, bounded by the approved geometry.
 *
 * Bounds come from `textSizeRange` — the same ranges the renderer clamps to —
 * so the slider can never offer a value the canvas would reject. Clearing the
 * override (reset button) returns the block to its approved size, which is the
 * default for a freshly built draft.
 */
function SizeSlider({
  label, fieldId, draft, onChange,
}: {
  label: string;
  fieldId: string;
  draft: CarouselDraft;
  onChange: (patch: Partial<CarouselDraft>) => void;
}) {
  const { min, max } = textSizeRange(fieldId);
  const approved = defaultFontSize(fieldId);
  const value = draft.textSizes?.[fieldId] ?? approved;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          {label} <span className="text-zinc-600 normal-case tracking-normal ml-1">({Math.round(value)}px)</span>
        </label>
        {draft.textSizes?.[fieldId] !== undefined && (
          <button
            type="button"
            onClick={() => {
              const next = { ...(draft.textSizes ?? {}) };
              delete next[fieldId];
              onChange({ textSizes: Object.keys(next).length ? next : undefined });
            }}
            className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={Math.round(value)}
        onChange={e => onChange({ textSizes: { ...(draft.textSizes ?? {}), [fieldId]: Number(e.target.value) } })}
        className="w-full accent-[#B8471F]"
        aria-label={`${label} size in pixels`}
      />
    </div>
  );
}

/**
 * Cover/contain switch for a background photo.
 *
 * Mirrors CSS `object-fit`: fill crops to fill the box (the reference look),
 * fit letterboxes the whole photo. Unset behaves as fill, which is the
 * approved default a fresh draft uses.
 */
function FitToggle({
  label, value, onChange,
}: {
  label: string;
  value?: CarouselImageFit;
  onChange: (fit: CarouselImageFit) => void;
}) {
  const current = value ?? 'cover';
  const btn = (fit: CarouselImageFit, text: string) => (
    <button
      key={fit}
      type="button"
      onClick={() => onChange(fit)}
      aria-pressed={current === fit}
      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
        current === fit ? 'bg-[#B8471F] text-white' : 'text-zinc-400 hover:text-white'
      }`}
    >
      {text}
    </button>
  );
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
      <div className="flex gap-1 bg-zinc-950 border border-zinc-800 rounded-md p-0.5" role="group" aria-label={label}>
        {btn('cover', 'Fill')}
        {btn('contain', 'Fit')}
      </div>
    </div>
  );
}
/**
 * Picks one image: upload a new file, or reuse an asset from the media library.
 *
 * Uploaded photos are compressed to the card's real pixel size (1080 wide)
 * before being stored as a data URL. Sending a full-resolution phone photo
 * into Firestore would blow the document limit for no visual gain — the card
 * only ever draws it at 1080px.
 */
function ImagePicker({
  label, value, media, onChange, transparent, maxSize, trim,
}: {
  label: string;
  value?: string;
  media: { id: string; url: string; name: string }[];
  onChange: (url: string) => void;
  /**
   * Cut-out artwork (brand logos, social icons): the preview sits on a
   * checkerboard and contain-fits, so transparency reads as transparency
   * instead of being mistaken for a solid fill.
   */
  transparent?: boolean;
  /** Longest edge the upload is scaled to before storage (default 1080). */
  maxSize?: number;
  /**
   * Logo slots: uploads are cropped to their non-transparent bounds so the
   * stored image IS the mark — the placement box, the drag handle and the
   * exported pixels then agree, and the logo can be dragged flush to the
   * card's edge. Also offers a "Rogner" button that applies the same crop to
   * an already-stored logo, so existing files benefit without a re-upload.
   */
  trim?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setNote('');
    try {
      let url = await compressImageFile(file, maxSize ?? CAROUSEL_SIZE, maxSize ?? CAROUSEL_SIZE, 0.82);
      if (trim) url = await trimTransparentLogo(url);
      onChange(url);
    } catch {
      setError('Image illisible. Réessayez avec un autre fichier.');
    } finally {
      setBusy(false);
    }
  };

  /** Crops an already-stored logo, so the current file benefits without a re-upload. */
  const handleTrim = async () => {
    if (!value) return;
    setBusy(true);
    setError('');
    setNote('');
    try {
      const trimmed = await trimTransparentLogo(value);
      if (trimmed === value) {
        setNote('Rien à rogner : les marges sont déjà serrées.');
      } else {
        onChange(trimmed);
        setNote('Marges transparentes rognées.');
      }
    } catch {
      setError('Le rognage a échoué. Réessayez avec un autre fichier.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{label}</label>
      <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-start gap-3 min-w-0">
        <div
          className="w-20 h-20 shrink-0 bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden flex items-center justify-center"
          style={transparent ? {
            // Checkerboard behind cut-out artwork, same trick the Logo panel
            // uses: a transparent PNG must not read as a black square here.
            backgroundImage:
              'linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)',
            backgroundSize: '12px 12px',
            backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
          } : undefined}
        >
          {value
            ? <img src={value} alt="" className={`w-full h-full ${transparent ? 'object-contain p-1' : 'object-cover'}`} />
            : <ImageIcon size={18} className="text-zinc-600" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 min-h-[40px] rounded-md transition-colors cursor-pointer"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Téléverser
            </button>
            <button
              type="button"
              onClick={() => setShowLibrary(v => !v)}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 min-h-[40px] rounded-md transition-colors cursor-pointer"
            >
              <ImageIcon size={13} /> Médiathèque
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                title="Retirer l'image"
                aria-label="Retirer l'image"
                className="p-2 min-h-[40px] min-w-[40px] border border-red-900/50 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-md transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
            {trim && value?.startsWith('data:') && (
              <button
                type="button"
                onClick={handleTrim}
                disabled={busy}
                title="Rogner les marges transparentes du logo"
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 min-h-[40px] rounded-md transition-colors cursor-pointer"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Crop size={13} />} Rogner
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          {error ? <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle size={11} />{error}</p> : null}
          {note ? <p className="text-[10px] text-zinc-400">{note}</p> : null}
          {showLibrary && (
            <div className="max-h-40 overflow-y-auto grid grid-cols-4 gap-1.5 bg-zinc-950 border border-zinc-800 rounded-md p-2">
              {media.length === 0 ? (
                <p className="col-span-4 text-[10px] text-zinc-500 py-2 text-center">Médiathèque vide.</p>
              ) : media.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onChange(item.url); setShowLibrary(false); }}
                  title={item.name}
                  className="aspect-square rounded overflow-hidden hover:ring-2 hover:ring-[#B8471F] cursor-pointer"
                >
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/**
 * Loads every image the draft references, for export.
 *
 * The PNG export needs real, decoded images: a card drawn from an unloaded
 * Image draws an empty box, so we wait for all of them before exporting rather
 * than letting a slow photo silently produce a broken card.
 *
 * Unlike the preview this deliberately reuses `collectDraftImages` so the two
 * agree on the exact key set — the preview showing a logo the export then
 * dropped (or vice versa) is what a duplicated list here would reintroduce.
 */
async function loadDraftImages(draft: CarouselDraft): Promise<Record<string, CanvasImageSource>> {
  const { images } = await loadCardImages(collectDraftImages(draft));
  return images;
}

/**
 * Builds the article options the picker expects from the CMS articles.
 * Only published articles are offered: promoting an unpublished draft to the
 * public timeline is not a decision this tab should be making for the editor.
 */
function pickerArticles(articles: Article[]) {
  return articles
    .filter(a => a.isPublished)
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      date: a.date,
    }));
}

/**
 * The social carousel editor.
 *
 * One fixed, approved design in three formats — Couverture, Développement,
 * Clôture — with only three kinds of control: the logo, the photos, and the
 * text. There are no position, size or colour-per-element controls, because the
 * previous free-form editor produced cards that did not match the brand.
 *
 * Editing updates the previews immediately; "Save" only persists the draft so
 * the next session starts from the same content.
 */
export function CarouselStudioTab() {
  const { articles = [], media = [], siteSettings, updateSiteSettings, addMedia, addMediaBatch } = useStore();

  const [draft, setDraft] = useState<CarouselDraft>(() =>
    normalizeDraft(siteSettings?.socialCarousel as Partial<CarouselDraft> | undefined),
  );
  const [activeCard, setActiveCard] = useState<CarouselCardKind>('cover');
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingKind, setDownloadingKind] = useState<CarouselCardKind | 'all' | 'mediatheque' | null>(null);
  /**
   * Which share action is running, if any — tracked separately from downloads
   * so "Partager" and "Télécharger" disable independently and show their own
   * spinner. Either busy state locks the other action's buttons below.
   */
  const [sharingKind, setSharingKind] = useState<CarouselCardKind | 'all' | null>(null);
  const exportBusy = downloadingKind !== null || sharingKind !== null;

  const patch = (changes: Partial<CarouselDraft>) =>
    setDraft(prev => ({ ...prev, ...changes }));

  const articlesForPicker = useMemo(() => pickerArticles(articles), [articles]);

  /** Rebuilds the draft from the picked article, keeping the logo & closing photo. */
  const handlePickArticle = (picked: { id?: string } | null) => {
    if (!picked?.id) return;
    const article = articles.find(a => a.id === picked.id);
    if (!article) return;
    setDraft(buildDraftFromArticle(article, draft.socials, {
      logoUrls: draft.logoUrls,
      closingImage: draft.closingImage,
    }));
    setStatus({ tone: 'ok', text: 'Carte remplie depuis l’article (logos et photo de clôture conservés).' });
  };

  const handleSave = async () => {
    setSaving(true);
    await updateSiteSettings({ socialCarousel: draft });
    setSaving(false);
    setStatus({ tone: 'ok', text: 'Gabarit enregistré.' });
  };

  /** A blank template, keeping the brand assets (logos) the editor uploaded. */
  const handleResetTemplate = () => {
    setDraft({ ...emptyDraft(draft.socials), logoUrls: draft.logoUrls });
    setStatus(null);
  };

  /**
   * The logo file for one card.
   *
   * Each card has its own slot: a dark cover and a light body card often need
   * different logo artwork, and forcing one file on all three meant uploading
   * twice and then losing one of the choices on the next save.
   */
  function setCardLogo(kind: CarouselCardKind, url: string) {
    setDraft(prev => {
      const logoUrls = { ...(prev.logoUrls || {}) };
      if (url) logoUrls[kind] = url;
      else delete logoUrls[kind];
      return { ...prev, logoUrls };
    });
  }

  const uploadedCardCount = (['cover', 'body', 'closing'] as CarouselCardKind[])
    .filter(kind => !!draft.logoUrls?.[kind]).length;

  /**
   * The text blocks (and their size sliders) belonging to the selected card,
   * so the Textes panel always edits what the big preview is showing.
   */
  const activeTextFields: { id: string; label: string }[] =
    activeCard === 'cover'
      ? [
          { id: 'title', label: 'Titre' },
          { id: 'lede', label: 'Chapô' },
        ]
      : activeCard === 'body'
        ? [
            { id: 'bodyHeading', label: 'Titre de section' },
            ...draft.paragraphs.map((_, i) => ({ id: `paragraph-${i}`, label: `Paragraphe ${i + 1}` })),
          ]
        : [
            { id: 'quote', label: 'Citation' },
            { id: 'quoteAttribution', label: 'Attribution' },
            { id: 'tagline', label: 'Accroche' },
            { id: 'socialHeading', label: 'Rangée sociale' },
          ];

  /** Rewrites one cell of a social row (label, URL, or the uploaded icon). */
  const setSocial = (index: number, field: 'label' | 'url' | 'iconImage', value: string) => {
    setDraft(prev => ({
      ...prev,
      socials: prev.socials.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  /**
   * Sets one uploaded icon's size, relative to the badge box.
   *
   * Contain-fitting gives a wide wordmark and a square glyph very different
   * visual sizes, so a row of logos cannot read as one set; this is what lets
   * the editor match them. Clamped here as well as in `normalizeDraft`, so a
   * dragged slider can never store a 0 (icon erased) or a 9 (icon blown past
   * its neighbours).
   */
  const setSocialIconScale = (index: number, value: number) => {
    const iconScale = Math.min(1.4, Math.max(0.4, Math.round(value * 100) / 100));
    setDraft(prev => ({
      ...prev,
      socials: prev.socials.map((s, i) => (i === index ? { ...s, iconScale } : s)),
    }));
  };

  /** Removes one social row; the last one falls back to the house defaults. */
  const removeSocial = (index: number) => {
    setDraft(prev => {
      const socials = prev.socials.filter((_, i) => i !== index);
      return { ...prev, socials: socials.length ? socials : emptyDraft().socials };
    });
  };

  const addSocial = () => {
    setDraft(prev => ({ ...prev, socials: [...prev.socials, { label: '', url: '', icon: 'globe' }] }));
  };

  /**
   * Renders the requested cards to PNG data URLs, up front.
   *
   * Both the download and the share actions call this first, so the canvases
   * are fully painted before either outcome starts — sharing never races the
   * renderer, and every action works from the same pixels.
   */
  const renderPngItems = async (kinds: CarouselCardKind[]) => {
    const images = await loadDraftImages(draft);
    return kinds.map(kind => ({
      dataUrl: renderCardToDataUrl(kind, draft, images),
      filename: `perspective-carrousel-${kind}.png`,
    }));
  };

  /** Downloads a single card as PNG to the Downloads folder — never shares. */
  const handleDownloadSingle = async (kind: CarouselCardKind) => {
    setDownloadingKind(kind);
    setStatus({ tone: 'ok', text: `Génération de la carte ${CARD_LABELS[kind]}…` });
    try {
      const items = await renderPngItems([kind]);
      const ok = await downloadPngBlobs(items);
      setStatus(ok
        ? { tone: 'ok', text: `Carte ${CARD_LABELS[kind]} téléchargée (dossier Téléchargements).` }
        : { tone: 'error', text: `Téléchargement de la carte ${CARD_LABELS[kind]} impossible.` });
    } catch (err) {
      console.error('Erreur export carte:', err);
      setStatus({ tone: 'error', text: `Export de la carte ${CARD_LABELS[kind]} impossible.` });
    } finally {
      setDownloadingKind(null);
    }
  };

  /** Shares a single card through the native share sheet — never downloads. */
  const handleShareSingle = async (kind: CarouselCardKind) => {
    setSharingKind(kind);
    setStatus({ tone: 'ok', text: `Préparation du partage — ${CARD_LABELS[kind]}…` });
    try {
      const items = await renderPngItems([kind]);
      const outcome = await sharePngFiles(items, `Carrousel Perspective — ${CARD_LABELS[kind]}`);
      if (outcome === 'shared') {
        setStatus({ tone: 'ok', text: `Carte ${CARD_LABELS[kind]} partagée.` });
      } else if (outcome === 'dismissed') {
        setStatus({ tone: 'ok', text: 'Partage annulé.' });
      } else {
        setStatus({ tone: 'error', text: 'Partage indisponible sur cet appareil — utilisez « Télécharger ».' });
      }
    } catch (err) {
      console.error('Erreur partage carte:', err);
      setStatus({ tone: 'error', text: `Partage de la carte ${CARD_LABELS[kind]} impossible.` });
    } finally {
      setSharingKind(null);
    }
  };

  /** Downloads all three cards to the Downloads folder — never shares. */
  const handleDownloadAll = async () => {
    setDownloadingKind('all');
    setStatus({ tone: 'ok', text: 'Génération des 3 cartes PNG…' });
    const kinds: CarouselCardKind[] = ['cover', 'body', 'closing'];
    try {
      const items = await renderPngItems(kinds);
      const ok = await downloadPngBlobs(items);
      setStatus(ok
        ? { tone: 'ok', text: 'Les 3 cartes PNG ont été téléchargées (Couverture + Développement + Clôture).' }
        : { tone: 'error', text: 'Export incomplet : vérifiez les images du carrousel.' });
    } catch (err) {
      console.error('Erreur export carrousel:', err);
      setStatus({ tone: 'error', text: 'Export incomplet : vérifiez les images du carrousel.' });
    } finally {
      setDownloadingKind(null);
    }
  };

  /** Shares all three cards through ONE share sheet — never downloads. */
  const handleShareAll = async () => {
    setSharingKind('all');
    setStatus({ tone: 'ok', text: 'Préparation du partage des 3 cartes…' });
    const kinds: CarouselCardKind[] = ['cover', 'body', 'closing'];
    try {
      // Rendered up front so the single sheet holds every card at once.
      const items = await renderPngItems(kinds);
      const outcome = await sharePngFiles(items, 'Carrousel Perspective — 3 cartes PNG');
      if (outcome === 'shared') {
        setStatus({ tone: 'ok', text: 'Les 3 cartes ont été partagées (Couverture + Développement + Clôture).' });
      } else if (outcome === 'dismissed') {
        setStatus({ tone: 'ok', text: 'Partage annulé.' });
      } else {
        setStatus({ tone: 'error', text: 'Partage indisponible sur cet appareil — utilisez « Télécharger les 3 PNG ».' });
      }
    } catch (err) {
      console.error('Erreur partage carrousel:', err);
      setStatus({ tone: 'error', text: 'Partage impossible : vérifiez les images du carrousel.' });
    } finally {
      setSharingKind(null);
    }
  };

  /** Saves rendered cards into Médiathèque. */
  const handleSaveToMediatheque = async (kind?: CarouselCardKind) => {
    setDownloadingKind('mediatheque');
    setStatus({ tone: 'ok', text: 'Sauvegarde dans la Médiathèque…' });
    try {
      const images = await loadDraftImages(draft);
      const targetKinds: CarouselCardKind[] = kind ? [kind] : ['cover', 'body', 'closing'];
      const newItems: any[] = [];
      const today = new Date().toISOString().split('T')[0];
      for (const k of targetKinds) {
        const dataUrl = renderCardToDataUrl(k, draft, images);
        newItems.push({
          id: `carousel-${Date.now()}-${k}-${Math.random().toString(36).substring(7)}`,
          url: dataUrl,
          type: 'image',
          name: `Carrousel Social - ${CARD_LABELS[k]} (${draft.category || 'Éditorial'})`,
          date: today,
        });
      }
      if (addMediaBatch) {
        await addMediaBatch(newItems);
      } else if (addMedia) {
        newItems.forEach(item => addMedia(item));
      }
      setStatus({ tone: 'ok', text: `${newItems.length} carte(s) enregistrée(s) dans la Médiathèque.` });
    } catch {
      setStatus({ tone: 'error', text: 'Erreur lors de la sauvegarde dans la Médiathèque.' });
    } finally {
      setDownloadingKind(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 min-w-0">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 mb-1">
          <div className="min-w-0">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Carrousel Social</h3>
            <p className="text-zinc-500 text-xs mt-1 max-w-2xl leading-relaxed">
              Gabarit fixe en trois cartes (Couverture · Développement · Clôture). Éditez les textes et visuels,
              puis <strong className="text-zinc-300">téléchargez</strong> les PNG (dossier Téléchargements) ou{' '}
              <strong className="text-zinc-300">partagez</strong>-les (feuille de partage : Photos, WhatsApp…) — une par une ou les trois d'un coup.
            </p>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleDownloadSingle(activeCard)}
              disabled={exportBusy}
              className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2.5 min-h-[40px] rounded-md transition-all cursor-pointer border border-zinc-700 hover:border-zinc-600"
              title="Télécharger la carte actuellement sélectionnée (dossier Téléchargements)"
            >
              {downloadingKind === activeCard ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="text-[#E8490F]" />}
              Télécharger {CARD_LABELS[activeCard]}
            </button>
            <button
              type="button"
              onClick={() => handleShareSingle(activeCard)}
              disabled={exportBusy}
              className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2.5 min-h-[40px] rounded-md transition-all cursor-pointer border border-zinc-700 hover:border-zinc-600"
              title="Partager la carte actuellement sélectionnée (feuille de partage)"
            >
              {sharingKind === activeCard ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} className="text-[#E8490F]" />}
              Partager {CARD_LABELS[activeCard]}
            </button>
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={exportBusy}
              className="flex items-center justify-center gap-1.5 bg-[#B8471F] hover:bg-[#c94931] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 min-h-[40px] rounded-md transition-all cursor-pointer shadow-md"
              title="Télécharger les 3 cartes PNG (dossier Téléchargements)"
            >
              {downloadingKind === 'all' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Télécharger les 3 PNG
            </button>
            <button
              type="button"
              onClick={handleShareAll}
              disabled={exportBusy}
              className="flex items-center justify-center gap-1.5 bg-[#B8471F] hover:bg-[#c94931] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 min-h-[40px] rounded-md transition-all cursor-pointer shadow-md"
              title="Partager les 3 cartes PNG (feuille de partage)"
            >
              {sharingKind === 'all' ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
              Partager les 3 PNG
            </button>
            <button
              type="button"
              onClick={() => handleSaveToMediatheque()}
              disabled={exportBusy}
              className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 hover:text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 min-h-[40px] rounded-md transition-colors cursor-pointer border border-zinc-700"
              title="Ajouter les 3 cartes générées à la Médiathèque"
            >
              {downloadingKind === 'mediatheque' ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
              + Médiathèque
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 min-h-[40px] rounded-md transition-colors cursor-pointer border border-zinc-700"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Enregistrer
            </button>
          </div>
        </div>

        {status && (
          <p className={`mt-3 text-xs flex items-center gap-1.5 ${status.tone === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {status.tone === 'ok' ? <Check size={13} /> : <AlertTriangle size={13} />}
            {status.text}
          </p>
        )}
      </div>

      {/* ---------- Article source ---------- */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-4 min-w-0">
        <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
          <Share2 size={13} /> Source du contenu
        </div>
        <ArticlePicker
          articles={articlesForPicker}
          language="fr"
          value={draft.articleId}
          onSelect={handlePickArticle}
          label="Article à promouvoir"
        />
        <button
          type="button"
          onClick={handleResetTemplate}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer min-h-[40px]"
        >
          <RotateCcw size={12} /> Repartir d’un gabarit vierge
        </button>
      </div>
      {/* ---------- Previews ----------
          The ARTIFACT is direct-manipulation: you click the text on the card to
          rewrite it, drag the logo, and use the slider for its size. The
          Textes panel below mirrors every text block for comfortable typing,
          and the forms around it hold the things a canvas cannot host (date,
          read time, category, photos). */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-4 min-w-0">
        <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-2">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <ImageIcon size={13} /> Aperçu (1080 × 1080)
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="grid grid-cols-3 gap-1.5">
              {(['cover', 'body', 'closing'] as CarouselCardKind[]).map(kind => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActiveCard(kind)}
                  className={`px-2 sm:px-3 py-2 min-h-[40px] text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer ${
                    activeCard === kind ? 'bg-[#B8471F] text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {CARD_LABELS[kind]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleDownloadSingle(activeCard)}
              disabled={exportBusy}
              className="flex items-center justify-center gap-1.5 bg-[#E8490F]/20 hover:bg-[#E8490F]/30 text-[#E8490F] border border-[#E8490F]/40 text-[10px] font-bold uppercase tracking-wider px-3 py-2 min-h-[40px] rounded-md transition-all cursor-pointer"
              title="Télécharger cette carte seule (dossier Téléchargements)"
            >
              {downloadingKind === activeCard ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Télécharger cette carte (PNG)
            </button>
            <button
              type="button"
              onClick={() => handleShareSingle(activeCard)}
              disabled={exportBusy}
              className="flex items-center justify-center gap-1.5 bg-[#E8490F]/20 hover:bg-[#E8490F]/30 text-[#E8490F] border border-[#E8490F]/40 text-[10px] font-bold uppercase tracking-wider px-3 py-2 min-h-[40px] rounded-md transition-all cursor-pointer"
              title="Partager cette carte seule (feuille de partage)"
            >
              {sharingKind === activeCard ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
              Partager cette carte
            </button>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Cliquez un texte pour le réécrire. Glissez le logo à l’endroit voulu ; le curseur
          «&nbsp;Taille&nbsp;» ajuste sa taille sur la carte sélectionnée.
        </p>

        {/* The card being edited, large enough to click into. */}
        <div className="flex justify-center min-w-0">
          <CarouselPreview
            kind={activeCard}
            draft={draft}
            width={Math.min(520, CARD_EDIT_MAX_WIDTH)}
            className="rounded-md shadow-2xl ring-1 ring-white/10 max-w-full"
            editable
            onChange={patch}
          />
        </div>

        {/* The artifact's per-card image buttons. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ImagePicker
            label="Photo — carte 1 · Couverture"
            value={draft.coverImage}
            media={media}
            onChange={url => patch({ coverImage: url })}
          />
          <FitToggle label="Cover photo fit" value={draft.coverImageFit} onChange={fit => patch({ coverImageFit: fit })} />
          <ImagePicker
            label="Photo — carte 3 · Clôture (fond)"
            value={draft.closingImage}
            media={media}
            onChange={url => patch({ closingImage: url })}
          />
          <FitToggle label="Closing photo fit" value={draft.closingImageFit} onChange={fit => patch({ closingImageFit: fit })} />
        </div>

        {/* Serie des 3 cartes avec option de téléchargement carte par carte */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Download size={12} className="text-[#E8490F]" />
              Enregistrement carte par carte (3 cartes)
            </span>
            <span className="text-[10px] text-zinc-500">
              Cliquez pour éditer ou enregistrez chaque carte une par une sur votre appareil
            </span>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3 sm:gap-4">
            {(['cover', 'body', 'closing'] as CarouselCardKind[]).map(kind => (
              <div
                key={kind}
                className={`bg-zinc-950/60 p-3 rounded-lg border transition-all flex flex-col justify-between min-w-0 ${
                  activeCard === kind ? 'border-[#E8490F] ring-1 ring-[#E8490F]/30' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div
                  onClick={() => setActiveCard(kind)}
                  className="cursor-pointer group flex flex-col items-center"
                >
                  <CarouselPreview
                    kind={kind}
                    draft={draft}
                    width={180}
                    className="rounded-md ring-1 ring-white/10 group-hover:ring-[#B8471F] transition-all max-w-full"
                  />
                  <div className="flex items-center justify-between w-full mt-2 px-1">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider group-hover:text-white">
                      {CARD_LABELS[kind]}
                    </span>
                    {activeCard === kind && (
                      <span className="bg-[#E8490F]/20 text-[#E8490F] text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                        Actif
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 mt-3 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(kind)}
                    disabled={exportBusy}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#B8471F] hover:bg-[#c94931] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider py-2.5 min-h-[40px] px-2 rounded transition-colors cursor-pointer"
                    title={`Télécharger ${CARD_LABELS[kind]} (dossier Téléchargements)`}
                  >
                    {downloadingKind === kind ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Download size={11} />
                    )}
                    Télécharger
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareSingle(kind)}
                    disabled={exportBusy}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider py-2.5 min-h-[40px] px-2 rounded transition-colors cursor-pointer"
                    title={`Partager ${CARD_LABELS[kind]} (feuille de partage)`}
                  >
                    {sharingKind === kind ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Share2 size={11} />
                    )}
                    Partager
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveToMediatheque(kind)}
                    disabled={exportBusy}
                    className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 hover:text-white rounded text-[10px] transition-colors cursor-pointer"
                    title="Ajouter cette carte à la Médiathèque"
                  >
                    <ImageIcon size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Text copy ----------
          The canvas still accepts click-to-edit, but every text block is ALSO
          editable here: rewriting a whole quote against a caret on a scaled
          canvas is painful, and the sidebar is where editors expect to find
          the copy. Both surfaces write to the same draft, so they cannot
          drift apart. */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-5 min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <Type size={13} /> Textes — {CARD_LABELS[activeCard]}
          </div>
          <p className="text-[10px] text-zinc-500">
            Aussi modifiables sur l'aperçu : cliquez directement sur un texte.
          </p>
        </div>

        {activeCard === 'cover' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            <Field
              label="Titre (carte 1)"
              value={draft.title}
              onChange={v => patch({ title: v })}
              multiline
              rows={2}
              maxLength={140}
            />
            <Field
              label="Chapô (carte 1)"
              value={draft.lede}
              onChange={v => patch({ lede: v })}
              multiline
              rows={3}
              maxLength={280}
            />
          </div>
        )}

        {activeCard === 'body' && (
          <Field
            label="Titre de section (carte 2)"
            value={draft.bodyHeading}
            onChange={v => patch({ bodyHeading: v })}
            maxLength={60}
          />
        )}

        {activeCard === 'closing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            <Field
              label="Citation (carte 3)"
              value={draft.quote}
              onChange={v => patch({ quote: v })}
              multiline
              rows={3}
              maxLength={300}
              hint="Les guillemets « » sont ajoutés à l'affichage."
            />
            <div className="space-y-4">
              <Field
                label="Attribution"
                value={draft.quoteAttribution}
                onChange={v => patch({ quoteAttribution: v })}
                maxLength={60}
              />
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">
                Voile rouge (carte 3) — {Math.round((draft.closingTint ?? 0.85) * 100)}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((draft.closingTint ?? 0.85) * 100)}
                  onChange={e => patch({ closingTint: Number(e.target.value) / 100 })}
                  className="w-full accent-[#B8471F]"
                />
              </label>
            </div>
            <Field
              label="Accroche en gras"
              value={draft.tagline}
              onChange={v => patch({ tagline: v })}
              multiline
              rows={2}
              maxLength={220}
            />
            <Field
              label="Titre de la rangée sociale"
              value={draft.socialHeading}
              onChange={v => patch({ socialHeading: v })}
              maxLength={40}
            />
          </div>
        )}

        {/* Per-block type sizes for the selected card — the sliders that used
            to be defined but never rendered anywhere. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 pt-4 border-t border-zinc-800 min-w-0">
          {activeTextFields.map(f => (
            <SizeSlider key={f.id} label={f.label} fieldId={f.id} draft={draft} onChange={patch} />
          ))}
        </div>

        {activeCard === 'closing' && (
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Réseaux sociaux — icônes personnalisées + libellés
              </p>
              <p className="text-[11px] text-zinc-500">
                Téléversez votre logo (PNG transparent conseillé) : il remplace
                l'icône dessinée sur la carte de clôture. Sans logo, l'icône du
                modèle s'affiche. Le curseur «&nbsp;Taille&nbsp;» sert à aligner
                tous les logos sur une même taille.
              </p>
            </div>
            {draft.socials.map((social, i) => (
              <div key={i} className="border border-zinc-800 rounded-md p-3 space-y-3 min-w-0">
                <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Field
                      label={`Libellé ${i + 1}`}
                      value={social.label}
                      onChange={v => setSocial(i, 'label', v)}
                      maxLength={40}
                    />
                  </div>
                  <div className="flex-[1.4] min-w-0">
                    <Field
                      label="URL"
                      value={social.url}
                      onChange={v => setSocial(i, 'url', v)}
                      maxLength={300}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSocial(i)}
                    disabled={draft.socials.length <= 1}
                    aria-label={`Retirer le réseau ${i + 1}`}
                    className="p-2.5 min-h-[40px] min-w-[40px] self-start min-[480px]:self-auto text-zinc-500 hover:text-red-400 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <ImagePicker
                  label={`Icône ${i + 1} (PNG transparent conseillé)`}
                  value={social.iconImage}
                  media={media}
                  onChange={url => setSocial(i, 'iconImage', url)}
                  transparent
                  maxSize={512}
                />
                {social.iconImage && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        Taille du logo {i + 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Réduire le logo ${i + 1}`}
                          title="Réduire (−2 %)"
                          onClick={() => setSocialIconScale(i, (social.iconScale ?? 1) - 0.02)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold leading-none cursor-pointer"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          aria-label={`Taille exacte du logo ${i + 1} (pourcent)`}
                          title="Taille exacte (40–140 %)"
                          min={40}
                          max={140}
                          step={1}
                          value={Math.round((social.iconScale ?? 1) * 100)}
                          onChange={e => {
                            const next = Number(e.target.value);
                            if (Number.isFinite(next)) setSocialIconScale(i, next / 100);
                          }}
                          className="w-14 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[11px] tabular-nums text-zinc-100 text-center focus:outline-none focus:border-[#B8471F]"
                        />
                        <span className="text-[10px] text-zinc-500">%</span>
                        <button
                          type="button"
                          aria-label={`Agrandir le logo ${i + 1}`}
                          title="Agrandir (+2 %)"
                          onClick={() => setSocialIconScale(i, (social.iconScale ?? 1) + 0.02)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold leading-none cursor-pointer"
                        >
                          +
                        </button>
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label={`Taille du logo ${i + 1}`}
                      min={40}
                      max={140}
                      step={1}
                      value={Math.round((social.iconScale ?? 1) * 100)}
                      onChange={e => setSocialIconScale(i, Number(e.target.value) / 100)}
                      className="w-full accent-[#B8471F] cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addSocial}
              className="flex items-center gap-1 text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus size={12} /> Ajouter un réseau
            </button>
          </div>
        )}
      </div>

      {/* ---------- Controls ----------
          Only what the card itself cannot host: the logo, the photos and the
          footer facts (date, read time, category). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-5 min-w-0">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <ImageIcon size={13} /> Logo
          </div>
          {/*
            One upload per card. The preview thumbnail sits beside each input so
            the editor can see the cut-out against a checkerboard rather than
            discovering a flattened logo only after downloading the PNG.
          */}
          {(['cover', 'body', 'closing'] as CarouselCardKind[]).map(kind => (
            <div key={kind} className="flex flex-col min-[420px]:flex-row min-[420px]:items-start gap-3 min-w-0">
              <div
                className="w-20 h-20 shrink-0 border border-zinc-800 rounded-md overflow-hidden flex items-center justify-center"
                style={{
                  // Checkerboard, so transparent artwork is visibly transparent
                  // rather than merely looking dark on the panel background.
                  backgroundColor: '#18181b',
                  backgroundImage:
                    'linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                }}
              >
                {draft.logoUrls?.[kind]
                  ? <img src={draft.logoUrls[kind]} alt="" className="w-full h-full object-contain p-1" />
                  : <span className="text-[9px] uppercase tracking-wider text-zinc-600 text-center px-1">
                      Logo<br />Perspective
                    </span>}
              </div>
              <div className="flex-1 min-w-0">
                <ImagePicker
                  label={`Logo ${CARD_LABELS[kind]}`}
                  value={draft.logoUrls?.[kind]}
                  media={media}
                  onChange={url => setCardLogo(kind, url)}
                  transparent
                  trim
                />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Chaque carte a son propre logo. Les PNG transparents gardent leur
            transparence&nbsp;; leurs marges vides sont rognées au téléversement (bouton
            «&nbsp;Rogner&nbsp;» pour un logo déjà enregistré), pour que le logo puisse
            toucher le bord de la carte. Laissez le champ vide pour utiliser le logo
            «&nbsp;Perspective&nbsp;» dessiné. Le logo se positionne et se redimensionne
            directement sur la carte&nbsp;: glissez-le, puis utilisez le curseur
            «&nbsp;Taille&nbsp;».
            {uploadedCardCount > 0 && (
              <span className="block mt-1 text-zinc-400">
                {uploadedCardCount} carte{uploadedCardCount > 1 ? 's' : ''} sur 3 utilise
                {uploadedCardCount > 1 ? 'nt' : ''} un logo importé.
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => patch({ logos: undefined })}
            disabled={!draft.logos}
            className="text-zinc-500 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-500 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer min-h-[40px]"
          >
            Réinitialiser la position des logos
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-5 min-w-0">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <Share2 size={13} /> Pied de page & paragraphes
          </div>
            <Field label="Catégorie" value={draft.category} onChange={v => patch({ category: v })} maxLength={24} />
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Paragraphes (carte 2) — {MAX_CAROUSEL_PARAGRAPHS} maximum
            </p>
            {draft.paragraphs.slice(0, MAX_CAROUSEL_PARAGRAPHS).map((para, i) => (
              <Field
                key={i}
                label={`Paragraphe ${i + 1}`}
                value={para}
                multiline
                rows={3}
                maxLength={400}
                onChange={v => {
                  const next = [...draft.paragraphs];
                  next[i] = v;
                  patch({ paragraphs: next });
                }}
              />
            ))}
            {draft.paragraphs.length < MAX_CAROUSEL_PARAGRAPHS && (
              <button
                type="button"
                onClick={() => patch({ paragraphs: [...draft.paragraphs, ''] })}
                className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                + Ajouter un paragraphe
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
            <Field label="Date" value={draft.date} onChange={v => patch({ date: v })} maxLength={32} />
            <Field label="Durée de lecture" value={draft.readingTime} onChange={v => patch({ readingTime: v })} maxLength={16} />
          </div>
        </div>
      </div>
    </div>
  );
}