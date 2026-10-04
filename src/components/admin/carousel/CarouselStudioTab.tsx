import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../../store';
import type { Article } from '../../../types';
import type { CarouselCardKind, CarouselDraft } from '../../../lib/carousel/types';
import { CAROUSEL_SIZE, MAX_CAROUSEL_PARAGRAPHS } from '../../../lib/carousel/types';
import { buildDraftFromArticle, emptyDraft, normalizeDraft } from '../../../lib/carousel/draft';
import { renderCardToDataUrl } from '../../../lib/carousel/render';
import { collectDraftImages, loadCardImages } from '../../../lib/carousel/images';
import { compressImageFile } from '../../../lib/imageUtils';
import { CarouselPreview } from './CarouselPreview';
import { ArticlePicker } from '../ArticlePicker';
import {
  AlertTriangle, Check, Download, Image as ImageIcon,
  Loader2, RotateCcw, Save, Share2, Upload, X,
} from 'lucide-react';

/** Widest the big editing card may get, so it never overflows a laptop panel. */
const CARD_EDIT_MAX_WIDTH = 520;

const CARD_LABELS: Record<CarouselCardKind, string> = {
  cover: '1 · Couverture',
  body: '2 · Développement',
  closing: '3 · Clôture',
};

/** Turns a data URL into a downloadable PNG. */
function downloadPng(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  const shared = 'w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm p-2.5 rounded-md focus:border-[#E85D42] focus:outline-none';
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
 * Picks one image: upload a new file, or reuse an asset from the media library.
 *
 * Uploaded photos are compressed to the card's real pixel size (1080 wide)
 * before being stored as a data URL. Sending a full-resolution phone photo
 * into Firestore would blow the document limit for no visual gain — the card
 * only ever draws it at 1080px.
 */
function ImagePicker({
  label, value, media, onChange,
}: {
  label: string;
  value?: string;
  media: { id: string; url: string; name: string }[];
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const url = await compressImageFile(file, CAROUSEL_SIZE, CAROUSEL_SIZE, 0.82);
      onChange(url);
    } catch {
      setError('Image illisible. Réessayez avec un autre fichier.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{label}</label>
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 shrink-0 bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden flex items-center justify-center">
          {value
            ? <img src={value} alt="" className="w-full h-full object-cover" />
            : <ImageIcon size={18} className="text-zinc-600" />}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Téléverser
            </button>
            <button
              type="button"
              onClick={() => setShowLibrary(v => !v)}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              <ImageIcon size={13} /> Médiathèque
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                title="Retirer l'image"
                className="p-2 border border-red-900/50 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-md transition-colors cursor-pointer"
              >
                <X size={14} />
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
                  className="aspect-square rounded overflow-hidden hover:ring-2 hover:ring-[#E85D42] cursor-pointer"
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
  const { articles = [], media = [], siteSettings, updateSiteSettings } = useStore();

  const [draft, setDraft] = useState<CarouselDraft>(() =>
    normalizeDraft(siteSettings?.socialCarousel as Partial<CarouselDraft> | undefined),
  );
  const [activeCard, setActiveCard] = useState<CarouselCardKind>('cover');
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

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

  /** Downloads all three cards, one PNG per card. */
  const handleDownloadAll = async () => {
    setStatus({ tone: 'ok', text: 'Génération des PNG…' });
    const kinds: CarouselCardKind[] = ['cover', 'body', 'closing'];
    try {
      const images = await loadDraftImages(draft);
      for (const kind of kinds) {
        downloadPng(renderCardToDataUrl(kind, draft, images), `perspective-carrousel-${kind}.png`);
        // Stagger slightly: some browsers drop rapid successive downloads.
        await new Promise(r => setTimeout(r, 250));
      }
      setStatus({ tone: 'ok', text: 'Les 3 cartes PNG ont été téléchargées.' });
    } catch {
      setStatus({ tone: 'error', text: 'Export impossible : une image n’a pas pu être chargée.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Carrousel Social</h3>
            <p className="text-zinc-500 text-xs mt-1 max-w-2xl leading-relaxed">
              Gabarit fixe en trois cartes (Couverture · Développement · Clôture). Choisissez un
              article publié, ajustez le logo, les photos et les textes, puis téléchargez les PNG.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 bg-[#E85D42] hover:bg-[#c94931] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-md transition-all cursor-pointer"
            >
              <Download size={13} /> Télécharger les 3 PNG
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors cursor-pointer"
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
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
          className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <RotateCcw size={12} /> Repartir d’un gabarit vierge
        </button>
      </div>
      {/* ---------- Previews ----------
          The ARTIFACT is direct-manipulation: you click the text on the card to
          rewrite it, drag the logo, and use the slider for its size. So the
          card itself is the editor; the form below is the fallback for the
          things a canvas cannot host (date, read time, category, socials). */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <ImageIcon size={13} /> Aperçu (1080 × 1080)
          </div>
          <div className="flex gap-1.5">
            {(['cover', 'body', 'closing'] as CarouselCardKind[]).map(kind => (
              <button
                key={kind}
                type="button"
                onClick={() => setActiveCard(kind)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer ${
                  activeCard === kind ? 'bg-[#E85D42] text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {CARD_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Cliquez un texte pour le réécrire. Glissez le logo à l’endroit voulu ; le curseur
          «&nbsp;Taille&nbsp;» ajuste sa taille sur la carte sélectionnée.
        </p>

        {/* The card being edited, large enough to click into. */}
        <div className="flex justify-center">
          <CarouselPreview
            kind={activeCard}
            draft={draft}
            width={Math.min(520, CARD_EDIT_MAX_WIDTH)}
            className="rounded-md shadow-2xl ring-1 ring-white/10"
            editable
            onChange={patch}
          />
        </div>

        {/* The artifact's per-card image buttons. */}
        <div className="grid sm:grid-cols-2 gap-3">
          <ImagePicker
            label="Photo — carte 1 · Couverture"
            value={draft.coverImage}
            media={media}
            onChange={url => patch({ coverImage: url })}
          />
          <ImagePicker
            label="Photo — carte 3 · Clôture (fond)"
            value={draft.closingImage}
            media={media}
            onChange={url => patch({ closingImage: url })}
          />
        </div>

        {/* Read-only thumbnails of the other two cards. */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-zinc-800">
          {(['cover', 'body', 'closing'] as CarouselCardKind[])
            .filter(kind => kind !== activeCard)
            .map(kind => (
              <button
                key={kind}
                type="button"
                onClick={() => setActiveCard(kind)}
                className="text-left cursor-pointer group"
              >
                <CarouselPreview kind={kind} draft={draft} width={168} className="rounded-md ring-1 ring-white/10 group-hover:ring-[#E85D42]" />
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-2 text-center group-hover:text-white">
                  {CARD_LABELS[kind]}
                </p>
              </button>
            ))}
        </div>
      </div>

      {/* ---------- Controls ----------
          Only what the card itself cannot host. All headline/paragraph/quote
          copy is edited in place on the canvas, per the artifact; repeating it
          here would give the editor two places to change one value. */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <ImageIcon size={13} /> Logo
          </div>
          {/*
            One upload per card. The preview thumbnail sits beside each input so
            the editor can see the cut-out against a checkerboard rather than
            discovering a flattened logo only after downloading the PNG.
          */}
          {(['cover', 'body', 'closing'] as CarouselCardKind[]).map(kind => (
            <div key={kind} className="flex items-start gap-3">
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
              <div className="flex-1">
                <ImagePicker
                  label={`Logo ${CARD_LABELS[kind]}`}
                  value={draft.logoUrls?.[kind]}
                  media={media}
                  onChange={url => setCardLogo(kind, url)}
                />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Chaque carte a son propre logo. Les PNG transparents sont conservés tels
            quels&nbsp;; laissez le champ vide pour utiliser le logo «&nbsp;Perspective&nbsp;» dessiné.
            Le logo se positionne et se redimensionne directement sur la carte&nbsp;: glissez-le,
            puis utilisez le curseur «&nbsp;Taille&nbsp;».
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
            className="text-zinc-500 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-500 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Réinitialiser la position des logos
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" value={draft.date} onChange={v => patch({ date: v })} maxLength={32} />
            <Field label="Durée de lecture" value={draft.readingTime} onChange={v => patch({ readingTime: v })} maxLength={16} />
          </div>
        </div>
      </div>
    </div>
  );
}