import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CarouselCardKind, CarouselDraft, CarouselLogoPlacement } from '../../../lib/carousel/types';
import { CAROUSEL_SIZE } from '../../../lib/carousel/types';
import { logoImageRect, renderCard } from '../../../lib/carousel/render';
import { computeCardLayout, logoSnapGuides, cardAlignmentColumns, cardAlignmentRows, nearestSnap, type EditableField } from '../../../lib/carousel/layout';
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
  const boxRef = useRef<HTMLDivElement>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showLogoHandle, setShowLogoHandle] = useState(false);
  /**
   * Display width actually used, clamped to the space the phone gives us.
   *
   * `width` is the DESIRED size (520 for the editor); on a 360px phone the
   * fixed-size box would overflow the panel and force horizontal scrolling of
   * the whole settings page. Measuring the parent and shrinking keeps the
   * card fully visible, and the 1080-space drag math scales with it because
   * it always divides by the rendered size.
   */
  const [fitWidth, setFitWidth] = useState(width);

  useLayoutEffect(() => {
    setFitWidth(width);
  }, [width]);

  useLayoutEffect(() => {
    const el = boxRef.current?.parentElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const fit = () => {
      const available = el.clientWidth;
      if (available > 0) setFitWidth(Math.min(width, available));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  const scale = fitWidth / CAROUSEL_SIZE;

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
  /**
   * The alignment lines the logo currently sits on, for the live readout.
   *
   * Recomputed from the layout fields so it names the actual item (Titre, Tag,
   * Chapô, Point 1…) the logo is level with, not just a raw coordinate.
   */
  const activeGuides = logoSnapGuides(layout.logo, layout.fields);

  const commitLogo = useCallback((nextIn: Required<CarouselLogoPlacement>) => {
    let next = nextIn;
    // Assisted horizontal movement: snap to the card centre, the two gutters,
    // the tag's right edge, AND every text block's left/centre/right — so an
    // uploaded logo can be lined up with the title, the chapô or a key point,
    // not just the card frame. `nearestSnap` picks the closest line within
    // SNAP px, so several nearby blocks never fight over the logo.
    const cols = cardAlignmentColumns(layout.fields).map(c => c.pos);
    const snapX = nearestSnap(next.cx, cols, SNAP);
    if (snapX !== null) next = { ...next, cx: snapX };
    // Vertical movement is FREE — the logo can be raised all the way to the
    // card's top edge, which is what aligning an uploaded logo with the
    // category pill requires. The rows attract it within SNAP px: the tag's top
    // line, the approved default top, the closing card's wordmark row, y0 (the
    // top edge, so an upward drag lands exactly on it), and every text block's
    // top/centre/bottom. `nearestSnap` resolves ties to the nearest line.
    const rows = cardAlignmentRows(layout.fields).map(r => r.pos);
    const snapY = nearestSnap(next.top, rows, SNAP);
    if (snapY !== null) next = { ...next, top: snapY };
    onChange?.({ logos: { ...(draft.logos || {}), [kind]: next } });
  }, [draft.logos, kind, onChange, layout.fields]);

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
    // Uses the FITTED scale (not the `width` prop): on a phone the card is
    // shrunk to the panel, and dividing by the prop's scale would fling the
    // logo twice as far as the finger moved.
    const dragScale = fitWidth / CAROUSEL_SIZE;
    // Clamped to the card so the logo can never be dragged out of frame and
    // silently disappear from the exported PNG. With the handle on the logo's
    // real bounds (logoImageRect, top-aligned), `top = 0` is where the logo's
    // ink touches the card's edge — the highest export-safe position — and
    // the snap in commitLogo settles the last few pixels exactly onto y0.
    const cx = drag.origin.cx + (e.clientX - drag.startX) / dragScale;
    const top = drag.origin.top + (e.clientY - drag.startY) / dragScale;
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

  /**
   * Resizes the logo by dragging its bottom-right corner.
   *
   * The size is driven by the pointer's distance from the logo's fixed anchor
   * (its horizontal centre `cx` and its top edge `top`), mapped through the
   * placement box's 4.6:1 proportion — the same ratio the renderer uses — so
   * dragging the corner scales the box exactly as the slider does, with no
   * feedback loop (the anchor never moves while resizing). This is the
   * grab-the-box control that sits ALONGSIDE the slider/nudge/number inputs,
   * which are all left in place.
   */
  const resizeState = useRef<{ startX: number; startY: number; origin: Required<CarouselLogoPlacement> } | null>(null);

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    resizeState.current = { startX: e.clientX, startY: e.clientY, origin: { ...layout.logo } };
    setShowLogoHandle(true);
  };

  const onResizePointerMove = (e: React.PointerEvent) => {
    const r = resizeState.current;
    if (!r) return;
    const dragScale = fitWidth / CAROUSEL_SIZE;
    // Pointer position in card pixels, relative to the logo's anchor. The box
    // is `size*4.6` wide and centred on cx, so the half-width from the anchor
    // is `size*2.3`; size is therefore halfWidth/2.3. Clamped to the slider's
    // own 32–220 range so a wild drag can never store a value the draft would
    // reject on the next load.
    const pointerX = r.origin.cx + (e.clientX - r.startX) / dragScale;
    const halfWidth = Math.abs(pointerX - r.origin.cx);
    const size = Math.min(MAX_LOGO_SIZE, Math.max(MIN_LOGO_SIZE, Math.round(halfWidth / 2.3)));
    commitLogo({ ...r.origin, size });
  };

  const onResizePointerUp = (e: React.PointerEvent) => {
    resizeState.current = null;
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
    <div ref={boxRef} className={className} style={{ width: fitWidth, height: fitWidth, maxWidth: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CAROUSEL_SIZE}
        height={CAROUSEL_SIZE}
        style={{ width: fitWidth, height: fitWidth, maxWidth: '100%', display: 'block' }}
      />

      {/* Editing overlay. Scaled down to the preview as one unit, so every child
          coordinate below is in card pixels and lines up with the canvas. */}
      {editable && (
        <div
          className="absolute top-0 left-0"
          style={{
            width: CAROUSEL_SIZE,
            height: CAROUSEL_SIZE,
            transform: `scale(${scale})`,
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

          {/* Resize handle: grab the bottom-right corner of the box to scale the
              logo, complementing the slider / nudge / number controls below
              (all of which stay). Its own pointer handlers stop propagation so a
              resize never also starts a move. */}
          {showLogoHandle && (
            <div
              role="button"
              aria-label="Redimensionner le logo"
              title="Glissez pour redimensionner le logo"
              onPointerDown={onResizePointerDown}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              onPointerCancel={onResizePointerUp}
              className="absolute cursor-nwse-resize touch-none flex items-center justify-center"
              style={{
                // A corner that stays a comfortable tap target at any preview
                // scale: 26px on screen → 26/scale in card pixels.
                left: logoRect.left + logoRect.width - 13 / scale,
                top: logoRect.top + logoRect.height - 13 / scale,
                width: 26 / scale,
                height: 26 / scale,
              }}
            >
              <span
                className="block bg-[#B8471F] border-2 border-white/80 rounded-sm shadow"
                style={{ width: 13 / scale, height: 13 / scale }}
              />
            </div>
          )}

          {/* Snap guides: the alignment rows/columns the logo is currently
              within — the card frame, the category tag, and every text block's
              edges (title, chapô, key points…), which is how an uploaded logo
              gets level with the copy. Purely visual: they show the alignment,
              they never move the logo. */}
          {showLogoHandle && logoSnapGuides(logoAt, layout.fields).map(g => (
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

          {/* Vertical measurement: a dimension line from the card's top edge
              (y = 0) down to the logo's top edge, with tick marks at both ends
              and the exact distance in card pixels. This is the "how far from
              the top is my logo" number made visual — the text readout below
              repeats it, but on the card you can SEE the gap you are judging.
              Drawn to the side of the box (left if there is room, else right)
              so it never covers the logo itself. */}
          {showLogoHandle && logoRect.top >= 8 && (
            (() => {
              const rulerLeft = logoRect.left >= 56
                ? logoRect.left - 28
                : logoRect.left + logoRect.width + 28;
              return (
                <div
                  className="absolute pointer-events-none"
                  style={{ left: rulerLeft, top: 0, width: 1, height: logoRect.top }}
                >
                  {/* The measured line */}
                  <div className="absolute inset-y-0 w-px" style={{ background: '#E8490F' }} />
                  {/* Ticks at the card edge and at the logo edge */}
                  <div className="absolute -left-1.5 top-0 h-px w-4" style={{ background: '#E8490F' }} />
                  <div className="absolute -left-1.5 bottom-0 h-px w-4" style={{ background: '#E8490F' }} />
                  {/* Distance label at the midpoint */}
                  <span
                    className="absolute -translate-y-1/2 left-2 text-[12px] font-bold font-mono tabular-nums text-[#E8490F] bg-black/75 px-1.5 py-0.5 rounded whitespace-nowrap"
                    style={{ top: '50%' }}
                  >
                    ↑ {Math.round(logoRect.top)} px
                  </span>
                </div>
              );
            })()
          )}

          {/* The size slider, as in the artifact.
              Stepped at 1px with −/+ nudge buttons and a numeric field: the
              32–220 range in a 160px track means each touch pixel jumps more
              than a unit, so dragging alone can never land an exact size. */}
          {showLogoHandle && (
            <div
              className="absolute flex items-center gap-1.5 bg-black/70 text-white px-3 py-2 rounded-md"
              style={{
                left: logoRect.left,
                top: logoRect.top + logoRect.height + 12,
              }}
              onPointerDown={e => e.stopPropagation()}
            >
              {/* Live measurement + alignment readout: exact x / y / taille in
                  card pixels, and the named items the logo is currently level
                  with (from the guides above). Updates as you drag or resize,
                  so alignment is something you can read, not just eyeball. */}
              <span
                className="text-[10px] font-mono tabular-nums text-zinc-300 whitespace-nowrap pr-1 border-r border-white/15"
                title="Position et taille exactes (pixels de la carte)"
              >
                x {Math.round(logoAt.cx)} · y {Math.round(logoAt.top)} · {Math.round(logoAt.size)}px
                {activeGuides.length > 0 && (
                  <span className="ml-1.5 text-[#E8490F] font-bold">
                    ⟂ {activeGuides.map(g => g.label).join(' · ')}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Taille</span>
              <button
                type="button"
                aria-label="Réduire le logo"
                title="Réduire le logo (−2)"
                onClick={() => commitLogo({ ...logoAt, size: Math.max(MIN_LOGO_SIZE, Math.round(logoAt.size) - 2) })}
                className="w-7 h-7 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-sm font-bold leading-none cursor-pointer"
              >
                −
              </button>
              <input
                type="range"
                min={MIN_LOGO_SIZE}
                max={MAX_LOGO_SIZE}
                step={1}
                value={Math.round(logoAt.size)}
                onChange={e => commitLogo({ ...logoAt, size: Number(e.target.value) })}
                className="w-40 accent-[#B8471F] cursor-pointer"
              />
              <button
                type="button"
                aria-label="Agrandir le logo"
                title="Agrandir le logo (+2)"
                onClick={() => commitLogo({ ...logoAt, size: Math.min(MAX_LOGO_SIZE, Math.round(logoAt.size) + 2) })}
                className="w-7 h-7 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-sm font-bold leading-none cursor-pointer"
              >
                +
              </button>
              <input
                type="number"
                aria-label="Taille exacte du logo"
                title="Taille exacte du logo"
                min={MIN_LOGO_SIZE}
                max={MAX_LOGO_SIZE}
                step={1}
                value={Math.round(logoAt.size)}
                onChange={e => {
                  const next = Number(e.target.value);
                  if (Number.isFinite(next)) {
                    commitLogo({ ...logoAt, size: Math.min(MAX_LOGO_SIZE, Math.max(MIN_LOGO_SIZE, Math.round(next))) });
                  }
                }}
                className="w-14 bg-white/10 rounded px-1.5 py-1 text-[11px] tabular-nums text-center focus:outline-none focus:ring-1 focus:ring-[#B8471F]"
              />
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
  /**
   * The DOM text we last wrote, so a re-render that carries the SAME value the
   * user just typed is recognised as "already in the DOM" and left alone.
   *
   * Without this, typing ran BACKWARDS: every keystroke fires `onInput` →
   * `onChange` → a new `value` prop → the layout effect below saw
   * `innerText !== displayValue` and reassigned `innerText`, which drops the
   * caret to offset 0. The next character then inserted at the FRONT, so
   * "abc" came out "cba". The DOM is the source of truth while editing; we only
   * ever rewrite it on activation or on a genuinely EXTERNAL change.
   */
  const lastWritten = useRef<string>('');

  // The canvas draws the quote wrapped in guillemets. Those are decoration, not
  // part of the editable value, so they are stripped here and re-added by the
  // renderer.
  const displayValue = field.id === 'quote'
    ? value.replace(/^«\s*/, '').replace(/\s*»$/, '')
    : value;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      // Leaving edit: drop the DOM text so nothing stale lingers, and reset the
      // marker so the next activation re-seeds cleanly.
      if (el.innerText !== '') el.innerText = '';
      lastWritten.current = '';
      return;
    }
    // Activation, or an external value change (e.g. a language switch rewrote
    // the copy): seed the DOM and focus, preserving the caret when we can.
    if (el.innerText !== displayValue) {
      const caret = saveCaretOffset(el);
      el.innerText = displayValue;
      lastWritten.current = displayValue;
      el.focus();
      // On first activation there is no meaningful caret to keep — park it at
      // the end so a click-to-edit starts appending, which is what people
      // expect. On an external change while already focused, restore where the
      // user was.
      restoreCaretOffset(el, caret ?? displayValue.length);
    }
  }, [active, displayValue]);

  return (
    <div
      ref={ref}
      contentEditable={active}
      suppressContentEditableWarning
      onClick={e => { e.stopPropagation(); if (!active) onActivate(); }}
      onInput={() => {
        const next = ref.current?.innerText ?? '';
        lastWritten.current = next;
        onChange(next);
      }}
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
      {/* Intentionally NO React-managed children: while editing, the DOM text is
          the source of truth and is seeded by the effect above. Rendering the
          string as a child made React reconcile it back on every keystroke,
          which (with the innerText reset) is what moved the caret to the front.
          The canvas paints the visible copy and repaints on every `onInput`. */}
    </div>
  );
}

/**
 * The caret's character offset within `el`, or null when it is not focused.
 *
 * Used to restore the caret after an external value change, so re-seeding the
 * DOM does not yank the user back to the start of the line.
 */
function saveCaretOffset(el: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

/** Places the caret at `offset` characters into `el` (clamped to its length). */
function restoreCaretOffset(el: HTMLElement, offset: number): void {
  const sel = window.getSelection();
  if (!sel) return;
  const textNode = el.firstChild;
  const max = el.innerText.length;
  const at = Math.max(0, Math.min(offset, max));
  const range = document.createRange();
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    const len = (textNode.textContent || '').length;
    range.setStart(textNode, Math.min(at, len));
  } else {
    range.selectNodeContents(el);
    range.collapse(false);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}