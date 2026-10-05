import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CarouselCardKind, CarouselDraft, CarouselLogoPlacement } from '../../../lib/carousel/types';
import { CAROUSEL_SIZE } from '../../../lib/carousel/types';
import { logoImageRect, renderCard } from '../../../lib/carousel/render';
import { computeCardLayout, G, logoSnapGuides, type EditableField } from '../../../lib/carousel/layout';
import { collectDraftImages, loadCardImages, logoImageKey } from '../../../lib/carousel/images';
import { AlertTriangle } from 'lucide-react';

interface CarouselPreviewProps {
  kind: CarouselCardKind;
  draft: CarouselDraft;
  /** Display width in CSS pixels; the canvas always renders at full 1080. */
  width?: number;
  className?: string;
  /** Enables the in-place editing handles. Off for read-only thumbnails. */
  editable?: boolean;
  /** Called with the new draft whenever the editor changes something. */
  onChange?: (patch: Partial<CarouselDraft>) => void;
}

/** Maps a layout field id to the draft field it edits. */
function fieldToDraftValue(draft: CarouselDraft, id: string): string {
  if (id.startsWith('paragraph-')) return draft.paragraphs[Number(id.slice(10))] ?? '';
  if (id in draft) return String((draft as unknown as Record<string, unknown>)[id] ?? '');
  return '';
}

/** Writes an edited value back to the draft, whatever shape the field takes. */
function applyFieldValue(draft: CarouselDraft, id: string, value: string): Partial<CarouselDraft> {
  if (id.startsWith('paragraph-')) {
    const index = Number(id.slice(10));
    const paragraphs = [...draft.paragraphs];
    paragraphs[index] = value;
    return { paragraphs };
  }
  return { [id]: value } as Partial<CarouselDraft>;
}

// Bounds match `normalizeDraft`'s clamp (32–220), so the slider can never
// offer a size the stored draft would silently reject on the next load.
const MIN_LOGO_SIZE = 32;
const MAX_LOGO_SIZE = 220;

/**
 * One card, drawn on a canvas with a direct-manipulation overlay on top.
 *
 * The overlay lives in a 1080×1080 box scaled by a CSS transform, and every
 * position it uses comes from `computeCardLayout` — the same function the canvas
 * renderer reads. That is what makes the artifact's "click the text to rewrite
 * it" behaviour trustworthy: the hit-region is not a hand-tuned approximation of
 * the design, it is the layout the pixels were drawn from.
 */
export function CarouselPreview({
  kind, draft, width = 320, className, editable = false, onChange,
}: CarouselPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showLogoHandle, setShowLogoHandle] = useState(false);

  /**
   * Set when an image in the draft could not be loaded at all.
   *
   * Previously a failed load was swallowed and the card simply drew without
   * its photo, which is indistinguishable from a design choice. Surfacing it
   * turns a silent gap into something the editor can act on.
   */
  const [imageError, setImageError] = useState('');

  /**
   * Bumped whenever the loaded image set changes.
   *
   * The images live in a ref (the canvas painter reads them without
   * re-running the load effect), but the logo handle's rect is computed from
   * that ref during render — so without this tick a logo that finished
   * loading would keep showing the placement-box handle until the next
   * unrelated re-render.
   */
  const [imagesTick, setImagesTick] = useState(0);

  // Images are loaded in an effect so a slow network repaints the card when
  // they arrive, instead of rendering a card with its photo missing.
  const imagesRef = useRef<Record<string, CanvasImageSource>>({});

  const layout = useMemo(() => computeCardLayout(kind, draft), [kind, draft]);

  /**
   * Re-measured after webfonts settle.
   *
   * Layout is computed by measuring text in canvas, and canvas measures the
   * fallback font until Playfair/Inter have loaded. Without this the first
   * measurement — and therefore the whole editor overlay — would be laid out for
   * Georgia and sit slightly off the rendered glyphs.
   */
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const ready = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!ready) return;
    ready.ready.then(() => { if (!cancelled) setFontsReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sources = collectDraftImages(draft);

    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderCard(ctx, { kind, draft, images: imagesRef.current });
    };

    if (!sources.length) {
      imagesRef.current = {};
      setImagesTick(v => v + 1);
      setImageError('');
      paint();
      return () => { cancelled = true; };
    }

    /**
     * Images are loaded through the shared two-step loader rather than with a
     * bare `crossOrigin = 'anonymous'`.
     *
     * That bare assignment made any host without CORS headers fail the load
     * outright, which is why article photos silently vanished from the cover
     * card; the loader falls back to a plain load so the preview still shows
     * them, and reports failures so the editor is told rather than left
     * guessing why a card is empty.
     */
    loadCardImages(sources).then(({ images, failed }) => {
      if (cancelled) return;
      imagesRef.current = images;
      setImagesTick(v => v + 1);
      setImageError(
        failed.length
          ? `${failed.length} image(s) n'a pas pu être chargée. Vérifiez l'URL ou téléversez-la depuis l'appareil.`
          : '',
      );
      paint();
    });

    return () => { cancelled = true; };
  }, [kind, draft, fontsReady]);

  const commitField = useCallback((id: string, value: string) => {
    onChange?.(applyFieldValue(draft, id, value));
  }, [draft, onChange]);

  const SNAP = 14;
  const commitLogo = useCallback((next: Required<CarouselLogoPlacement>) => {
    // Assisted horizontal movement: snap to the card centre and the 78/1002 gutters.
    if (Math.abs(next.cx - 540) < SNAP) next = { ...next, cx: 540 };
    else if (Math.abs(next.cx - 78) < SNAP) next = { ...next, cx: 78 };
    else if (Math.abs(next.cx - 1002) < SNAP) next = { ...next, cx: 1002 };
    // Vertical movement is FREE — the logo can be raised all the way to the
    // card's top edge, which is what aligning an uploaded logo with the
    // category pill requires. Only the alignment rows attract it, and only
    // within 6px: the pill's top line (checked first, so the two rows never
    // fight), the approved default top, the closing card's wordmark row, and
    // y0 — the top edge itself, so the last few pixels of an upward drag land
    // exactly on the edge instead of stopping just short of it.
    // The previous rule — "anything above y60 snaps back to 46" — made
    // raising the logo past the default impossible however carefully it was
    // dragged, which is exactly the complaint this replaces.
    const rows = [G.pillY, 46, 928, 0];
    const near = rows.find(row => Math.abs(next.top - row) < 6);
    if (near !== undefined) next = { ...next, top: near };
    onChange?.({ logos: { ...(draft.logos || {}), [kind]: next } });
  }, [draft.logos, kind, onChange]);

  /**
   * Drags the logo. Pointer deltas are converted from screen pixels back into
   * card pixels by dividing by the preview scale, so the logo lands under the
   * cursor at any zoom level.
   */
  const dragState = useRef<{
    startX: number;
    startY: number;
    origin: Required<CarouselLogoPlacement>;
  } | null>(null);

  const onLogoPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: { ...layout.logo } };
    setShowLogoHandle(true);
  };

  const onLogoPointerMove = (e: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    const scale = width / CAROUSEL_SIZE;
    // Clamped to the card so the logo can never be dragged out of frame and
    // silently disappear from the exported PNG. With the handle on the logo's
    // real bounds (logoImageRect, top-aligned), `top = 0` is where the logo's
    // ink touches the card's edge — the highest export-safe position — and
    // the snap in commitLogo settles the last few pixels exactly onto y0.
    const cx = drag.origin.cx + (e.clientX - drag.startX) / scale;
    const top = drag.origin.top + (e.clientY - drag.startY) / scale;
    commitLogo({
      ...drag.origin,
      cx: Math.min(CAROUSEL_SIZE - 20, Math.max(20, cx)),
      top: Math.min(CAROUSEL_SIZE - 40, Math.max(0, top)),
    });
  };

  const onLogoPointerUp = (e: React.PointerEvent) => {
    dragState.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const logoAt = layout.logo;
  /**
   * The handle sits on the logo's REAL bounds: the contain-fitted image once
   * it has loaded, the placement box for the drawn wordmark or while the
   * source is still in flight. It used to be a hand-tuned size·3.2 × size·1.2
   * box frozen in the first drag commit while the renderer's box moved to
   * 4.6 × 1.6 — the frame would hit the card's top edge while the logo's ink
   * still floated below it, which reads as "the frame is stopping me from
   * raising the logo". `imagesTick` is read here so a freshly loaded image
   * recomputes the rect without waiting for an unrelated re-render.
   */
  const logoRect = useMemo(
    () => logoImageRect(logoAt, imagesRef.current[logoImageKey(kind)]),
    [logoAt, kind, imagesTick],
  );

  return (
    <div className={className} style={{ width, height: width, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CAROUSEL_SIZE}
        height={CAROUSEL_SIZE}
        style={{ width, height: width, display: 'block' }}
      />

      {/* Editing overlay. Scaled down to the preview as one unit, so every child
          coordinate below is in card pixels and lines up with the canvas. */}
      {editable && (
        <div
          className="absolute top-0 left-0"
          style={{
            width: CAROUSEL_SIZE,
            height: CAROUSEL_SIZE,
            transform: `scale(${width / CAROUSEL_SIZE})`,
            transformOrigin: 'top left',
          }}
        >
          {layout.fields.map(f => (
            <EditableText
              key={f.id}
              field={f}
              value={fieldToDraftValue(draft, f.id)}
              active={activeField === f.id}
              onActivate={() => setActiveField(f.id)}
              onChange={v => commitField(f.id, v)}
              onBlur={() => setActiveField(null)}
            />
          ))}

          {/* Draggable logo, above the text handles so it can be grabbed. */}
          <button
            type="button"
            aria-label="Déplacer le logo"
            onPointerDown={onLogoPointerDown}
            onPointerMove={onLogoPointerMove}
            onPointerUp={onLogoPointerUp}
            onPointerCancel={onLogoPointerUp}
            className="absolute cursor-move border-2 border-dashed border-[#B8471F] bg-[#B8471F]/5 rounded-sm touch-none"
            style={{
              left: logoRect.left,
              top: logoRect.top,
              width: logoRect.width,
              height: logoRect.height,
            }}
          />

          {/* Snap guides: the alignment rows/columns the logo is currently
              within — including the category pill's top line, which is how an
              uploaded logo gets level with the tag. Purely visual: they show
              the alignment, they never move the logo. */}
          {showLogoHandle && logoSnapGuides(logoAt).map(g => (
            <div
              key={`${g.axis}-${g.pos}`}
              className="absolute pointer-events-none"
              style={g.axis === 'y'
                ? { left: 0, width: CAROUSEL_SIZE, top: g.pos - 1, borderTop: '1px dashed #E8490F' }
                : { top: 0, height: CAROUSEL_SIZE, left: g.pos - 1, borderLeft: '1px dashed #E8490F' }}
            >
              <span className="absolute -top-4 left-1 text-[10px] font-bold uppercase tracking-wider text-[#E8490F] bg-black/70 px-1 rounded whitespace-nowrap">
                {g.label}
              </span>
            </div>
          ))}

          {/* The size slider, as in the artifact. */}
          {showLogoHandle && (
            <div
              className="absolute flex items-center gap-2 bg-black/70 text-white px-3 py-2 rounded-md"
              style={{
                left: logoRect.left,
                top: logoRect.top + logoRect.height + 12,
              }}
              onPointerDown={e => e.stopPropagation()}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Taille</span>
              <input
                type="range"
                min={MIN_LOGO_SIZE}
                max={MAX_LOGO_SIZE}
                value={Math.round(logoAt.size)}
                onChange={e => commitLogo({ ...logoAt, size: Number(e.target.value) })}
                className="w-40 accent-[#B8471F]"
              />
              <span className="text-[11px] tabular-nums w-8">{Math.round(logoAt.size)}</span>
            </div>
          )}
        </div>
      )}

      {/* Load failures, shown as an overlay badge so the card's own box — which
          the drag coordinates are derived from — is left untouched. */}
      {imageError && (
        <div
          role="status"
          title={imageError}
          className="absolute bottom-2 left-2 right-2 flex items-start gap-1.5 bg-amber-950/90 text-amber-200 border border-amber-700/60 rounded px-2 py-1.5 text-[10px] leading-snug"
        >
          <AlertTriangle size={12} className="shrink-0 mt-px" />
          <span>{imageError}</span>
        </div>
      )}
    </div>
  );
}

/**
 * A click-to-edit text run.
 *
 * Uses `contentEditable` so the caret behaves like a normal text field while the
 * card stays visible behind it. The element's own text is always transparent —
 * the canvas underneath is what you actually read, so the editor can never show
 * text that differs from what gets exported.
 */
function EditableText({
  field, value, active, onActivate, onChange, onBlur,
}: {
  field: EditableField;
  value: string;
  active: boolean;
  onActivate: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // The canvas draws the quote wrapped in guillemets. Those are decoration, not
  // part of the editable value, so they are stripped here and re-added by the
  // renderer.
  const displayValue = field.id === 'quote'
    ? value.replace(/^«\s*/, '').replace(/\s*»$/, '')
    : value;

  useLayoutEffect(() => {
    if (active && ref.current && ref.current.innerText !== displayValue) {
      ref.current.innerText = displayValue;
      ref.current.focus();
    }
  }, [active, displayValue]);

  return (
    <div
      ref={ref}
      contentEditable={active}
      suppressContentEditableWarning
      onClick={e => { e.stopPropagation(); if (!active) onActivate(); }}
      onInput={() => onChange(ref.current?.innerText ?? '')}
      onBlur={onBlur}
      onPointerDown={e => e.stopPropagation()}
      title={active ? undefined : 'Cliquez pour réécrire'}
      className={`absolute ${active ? 'outline-none' : 'cursor-text'}`}
      style={{
        left: field.align === 'center' ? field.x - field.width / 2 : field.x,
        top: field.y,
        width: field.width,
        minHeight: field.height,
        font: field.font,
        lineHeight: `${field.lineHeight}px`,
        // Always transparent: the canvas underneath is the display. Drawing the
        // same words twice (canvas + DOM) visibly doubles the glyphs, because
        // DOM and canvas shape a font's edges slightly differently. Keeping the
        // editable text invisible means the editor can only ever show exactly
        // what will be exported, and the caret still shows where you are typing.
        color: 'transparent',
        textAlign: field.align,
        background: active ? 'rgba(232,73,15,0.14)' : 'transparent',
        outline: active ? '2px solid #E8490F' : 'none',
        borderRadius: 2,
        whiteSpace: 'pre-wrap',
        caretColor: '#E8490F',
      }}
    >
      {/* The text lives in the DOM while editing so the caret has something to
          sit in, but stays invisible — the canvas paints the visible copy and
          repaints on every keystroke via `onInput`. */}
      {active ? displayValue : ''}
    </div>
  );
}