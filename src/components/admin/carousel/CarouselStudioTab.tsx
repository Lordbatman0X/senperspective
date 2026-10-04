import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../../store';
import type { Article } from '../../../types';
import type { CarouselCardKind, CarouselDraft } from '../../../lib/carousel/types';
import { CAROUSEL_SIZE, MAX_CAROUSEL_PARAGRAPHS } from '../../../lib/carousel/types';
import { buildDraftFromArticle, emptyDraft, normalizeDraft } from '../../../lib/carousel/draft';
import { renderCardToDataUrl } from '../../../lib/carousel/render';
import { compressImageFile } from '../../../lib/imageUtils';
import { CarouselPreview } from './CarouselPreview';
import { ArticlePicker } from '../ArticlePicker';
import {
  AlertTriangle, Check, Download, Image as ImageIcon,
  Loader2, RotateCcw, Save, Share2, Upload, X,
} from 'lucide-react';

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
 * Loads every image the draft references.
 *
 * The PNG export needs real, decoded images: a card drawn from an unloaded
 * Image draws an empty box, so we wait for all of them before exporting rather
 * than letting a slow photo silently produce a broken card.
 */
async function loadDraftImages(draft: CarouselDraft): Promise<Record<string, CanvasImageSource>> {
  const sources: Array<[string, string]> = [];
  if (draft.coverImage) sources.push(['coverImage', draft.coverImage]);
  if (draft.closingImage) sources.push(['closingImage', draft.closingImage]);
  if (draft.logoUrl) sources.push(['logo', draft.logoUrl]);

  const entries = await Promise.all(sources.map(([key, url]) => new Promise<[string, CanvasImageSource] | null>(
    (resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve([key, img]);
      img.onerror = () => resolve(null); // a broken URL must not abort the export
      img.src = url;
    },
  )));
  return Object.fromEntries(entries.filter(Boolean) as Array<[string, CanvasImageSource]>);
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
      logoUrl: draft.logoUrl,
      closingImage: draft.closingImage,
    }));
    setStatus({ tone: 'ok', text: 'Carte remplie depuis l’article (logo et photo de clôture conservés).' });
  };

  const handleSave = async () => {
    setSaving(true);
    await updateSiteSettings({ socialCarousel: draft });
    setSaving(false);
    setStatus({ tone: 'ok', text: 'Gabarit enregistré.' });
  };

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
          onClick={() => { setDraft({ ...emptyDraft(draft.socials), logoUrl: draft.logoUrl }); setStatus(null); }}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <RotateCcw size={12} /> Repartir d’un gabarit vierge
        </button>
      </div>
      {/* ---------- Previews ---------- */}
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
        <div className="flex flex-wrap gap-4">
          {(['cover', 'body', 'closing'] as CarouselCardKind[]).map(kind => (
            <div key={kind} className={activeCard === kind ? 'block' : 'hidden sm:block'}>
              <CarouselPreview kind={kind} draft={draft} width={240} className="rounded-md" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-2 text-center">{CARD_LABELS[kind]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Controls ---------- */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <ImageIcon size={13} /> Logo & photos
          </div>
          <ImagePicker
            label="Logo (vide = logo Perspective)"
            value={draft.logoUrl}
            media={media}
            onChange={url => patch({ logoUrl: url })}
          />
          <ImagePicker
            label="Photo de couverture (carte 1)"
            value={draft.coverImage}
            media={media}
            onChange={url => patch({ coverImage: url })}
          />
          <ImagePicker
            label="Photo de clôture (carte 3)"
            value={draft.closingImage}
            media={media}
            onChange={url => patch({ closingImage: url })}
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <Share2 size={13} /> Textes
          </div>
          <Field label="Catégorie" value={draft.category} onChange={v => patch({ category: v })} maxLength={24} />
          <Field label="Titre (carte 1)" value={draft.title} onChange={v => patch({ title: v })} multiline rows={2} maxLength={120} />
          <Field label="Chapô (carte 1)" value={draft.lede} onChange={v => patch({ lede: v })} multiline rows={3} maxLength={280} />
          <Field label="Sous-titre (carte 2)" value={draft.bodyHeading} onChange={v => patch({ bodyHeading: v })} maxLength={48} />
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
          <Field label="Citation (carte 3)" value={draft.quote} onChange={v => patch({ quote: v })} multiline rows={4} maxLength={280} />
          <Field label="Signature de la citation" value={draft.quoteAttribution} onChange={v => patch({ quoteAttribution: v })} maxLength={40} />
          <Field label="Accroche (carte 3)" value={draft.tagline} onChange={v => patch({ tagline: v })} multiline rows={2} maxLength={160} />
          <Field label="Titre des réseaux" value={draft.socialHeading} onChange={v => patch({ socialHeading: v })} maxLength={32} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" value={draft.date} onChange={v => patch({ date: v })} maxLength={32} />
            <Field label="Durée de lecture" value={draft.readingTime} onChange={v => patch({ readingTime: v })} maxLength={16} />
          </div>
        </div>
      </div>
    </div>
  );
}