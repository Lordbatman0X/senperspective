/**
 * The interactive canvas stage.
 *
 * The card is painted by the same `renderCard` used for export, so what is on
 * screen is exactly what gets exported. This component only adds an overlay —
 * selection rectangles, resize handles, safe zones and snap guides — drawn in
 * SCREEN space so the chrome stays crisp at any zoom.
 *
 * Pointer handling uses pointer capture and reads positions from
 * `getBoundingClientRect` rather than accumulating movement deltas, which avoids
 * drift and works for touch.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SocialCard, SocialLayer } from '../../../types/social';
import { renderCard, sampleLogoLuminances, type RenderContext } from '../../../lib/social/renderer';
import type { SocialFormat } from '../../../lib/social/networks';

const HANDLE_SIZE = 9;

type HandleId = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w';

const HANDLES: Array<{ id: HandleId; fx: number; fy: number; cursor: string }> = [
  { id: 'nw', fx: 0, fy: 0, cursor: 'nwse-resize' },
  { id: 'ne', fx: 1, fy: 0, cursor: 'nesw-resize' },
  { id: 'se', fx: 1, fy: 1, cursor: 'nwse-resize' },
  { id: 'sw', fx: 0, fy: 1, cursor: 'nesw-resize' },
  { id: 'n', fx: 0.5, fy: 0, cursor: 'ns-resize' },
  { id: 'e', fx: 1, fy: 0.5, cursor: 'ew-resize' },
  { id: 's', fx: 0.5, fy: 1, cursor: 'ns-resize' },
  { id: 'w', fx: 0, fy: 0.5, cursor: 'ew-resize' },
];

type DragMode =
  | { kind: 'move'; layer: SocialLayer; startX: number; startY: number; orig: { x: number; y: number } }
  | {
      kind: 'resize';
      layer: SocialLayer;
      handle: HandleId;
      startX: number;
      startY: number;
      orig: { x: number; y: number; w: number; h: number };
    };

export interface StudioStageProps {
  card: SocialCard;
  format: SocialFormat;
  content: RenderContext['content'];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeLayer: (id: string, patch: Partial<SocialLayer>) => void;
  /** Extra sources to preload, e.g. the article's featured image. */
  preloadedSources?: string[];
  showSafeZones: boolean;
  /** True when a logo layer is in `auto` tone, so the readback pass is needed. */
  logoAuto: boolean;
}

export function StudioStage({
  card,
  format,
  content,
  selectedId,
  onSelect,
  onChangeLayer,
  preloadedSources = [],
  showSafeZones,
  logoAuto,
}: StudioStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.42);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  /**
   * Double-click a text layer to edit it in place.
   *
   * This is the single biggest difference from the first build: an editor
   * changes a headline by double-clicking it and typing, not by finding the
   * layer in a list and then finding the text box in a properties panel. The
   * rendered canvas text is hidden while editing so the caret is not doubled up.
   */
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Focus the editor as soon as it mounts, so typing can start immediately.
  useEffect(() => {
    if (editingTextId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingTextId]);

  // Preload every asset this card references, including the article image used
  // by the template backgrounds.
  useEffect(() => {
    const sources = new Set<string>();
    for (const layer of card.layers) {
      if (layer.kind === 'background' && layer.src) sources.add(layer.src);
      if (layer.kind === 'image' && layer.src) sources.add(layer.src);
      if (layer.kind === 'logo') {
        if (layer.src) sources.add(layer.src);
        if (layer.toneSrc?.light) sources.add(layer.toneSrc.light);
        if (layer.toneSrc?.dark) sources.add(layer.toneSrc.dark);
      }
    }
    preloadedSources.forEach(s => s && sources.add(s));

    let cancelled = false;
    const load = async () => {
      const { preloadAssets } = await import('../../../lib/social/imageLoader');
      await preloadAssets([...sources]);
      if (!cancelled) setReloadKey(k => k + 1);
    };
    load();
    return () => { cancelled = true; };
    // `reloadKey` is bumped after loading so the paint effect runs again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, preloadedSources.join('|')]);

  const [reloadKey, setReloadKey] = useState(0);

  // Repaint whenever anything that affects pixels changes. The logo luminance
  // pass is only run when a logo is actually in auto mode, because it forces a
  // synchronous readback.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = format.width;
    canvas.height = format.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const base: RenderContext = { content };
    const logoLuminance = logoAuto
      ? sampleLogoLuminances(canvas, card, format, base)
      : undefined;

    ctx.clearRect(0, 0, format.width, format.height);
    renderCard(ctx, card, format, { ...base, logoLuminance });
  }, [card, format, content, logoAuto, reloadKey]);

  const toCardCoords = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  }, [zoom]);

  const onPointerDown = (e: React.PointerEvent, layer: SocialLayer) => {
    e.stopPropagation();
    if (layer.locked) {
      // A locked layer is still selectable, so it can be unlocked â€” but it
      // cannot be dragged.
      onSelect(layer.id);
      return;
    }
    const p = toCardCoords(e.clientX, e.clientY);
    onSelect(layer.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'move', layer, startX: p.x, startY: p.y, orig: { x: layer.x, y: layer.y } });
  };

  const onHandleDown = (e: React.PointerEvent, layer: SocialLayer, handle: HandleId) => {
    e.stopPropagation();
    if (layer.locked) return;
    const p = toCardCoords(e.clientX, e.clientY);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({
      kind: 'resize', layer, handle,
      startX: p.x, startY: p.y,
      orig: { x: layer.x, y: layer.y, w: layer.w, h: layer.h },
    });
  };
const SNAP = 6;

  /** Snap a value to a card edge or centre; returns the snapped value. */
  const applySnap = (value: number, size: number, low: number, high: number) => {
    for (const target of [low, (low + high) / 2, high]) {
      if (Math.abs(value - target) <= SNAP) return target;
    }
    if (Math.abs(value + size - high) <= SNAP) return high - size;
    return value;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toCardCoords(e.clientX, e.clientY);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;

    if (drag.kind === 'move') {
      const { layer, orig } = drag;
      const rawX = orig.x + dx;
      const rawY = orig.y + dy;
      const nx = applySnap(rawX, layer.w, 0, format.width);
      const ny = applySnap(rawY, layer.h, 0, format.height);
      setGuides({
        x: nx !== rawX ? nx : undefined,
        y: ny !== rawY ? ny : undefined,
      });
      // Allow a deliberate overhang, but never let a layer be dragged entirely
      // off the card and become unreachable.
      onChangeLayer(layer.id, {
        x: Math.round(Math.max(-layer.w + 10, Math.min(format.width - 10, nx))),
        y: Math.round(Math.max(-layer.h + 10, Math.min(format.height - 10, ny))),
      });
      return;
    }

    const { layer, handle, orig } = drag;
    // A logo with `lockAspect` must not be stretched out of proportion.
    const keepRatio = layer.kind === 'logo' && layer.lockAspect && handle.length === 2;

    let x = orig.x;
    let y = orig.y;
    let w = orig.w;
    let h = orig.h;

    if (handle.includes('w')) { x = orig.x + dx; w = orig.w - dx; }
    if (handle.includes('e')) { w = orig.w + dx; }
    if (handle.includes('n')) { y = orig.y + dy; h = orig.h - dy; }
    if (handle.includes('s')) { h = orig.h + dy; }

    // Floor the size, then push the origin back so the opposite edge stays put.
    if (w < 8) { w = 8; if (handle.includes('w')) x = orig.x + orig.w - 8; }
    if (h < 8) { h = 8; if (handle.includes('n')) y = orig.y + orig.h - 8; }

    if (keepRatio) {
      const ratio = orig.w / Math.max(1, orig.h);
      const newH = h / ratio;
      y = orig.y + orig.h - newH;
      h = newH;
      if (handle.includes('w')) x = orig.x + orig.w - w;
    }

    setGuides({});
    onChangeLayer(layer.id, {
      x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h),
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setDrag(null);
    setGuides({});
  };

  /** Arrow-key nudge, Shift for a coarse step. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const layer = card.layers.find(l => l.id === selectedId);
    if (!layer || layer.locked) return;
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onChangeLayer(layer.id, { x: layer.x + move[0], y: layer.y + move[1] });
  };

  // Fit the card to the available area whenever the format changes.
  //
  // Without this, switching Instagram 4:5 -> TikTok 9:16 leaves the tall card
  // running off the bottom of the screen, and the editor has to hunt for the
  // zoom slider to find it again. This is the single biggest "where did my card
  // go" fix in this revision.
  const fitRef = useRef<HTMLDivElement>(null);
  const fitToView = useCallback(() => {
    const host = fitRef.current?.parentElement;
    if (!host) return;
    const pad = 64;
    const w = host.clientWidth - pad;
    const h = host.clientHeight - pad;
    if (w <= 0 || h <= 0) return;
    const next = Math.min(w / format.width, h / format.height, 1);
    setZoom(Math.max(0.1, Math.min(1, Math.round(next * 100) / 100)));
  }, [format.width, format.height]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  // Ctrl/Cmd+wheel zooms, as in every design tool. Plain wheel is left alone so
  // the page still scrolls normally.
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(1, z - e.deltaY * 0.0015)));
  }, []);

  const selected = card.layers.find(l => l.id === selectedId) ?? null;
  const displayW = Math.round(format.width * zoom);
  const displayH = Math.round(format.height * zoom);
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-zinc-950">
      {/* Zoom + measurement bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0">
            {format.width}Ã—{format.height}
          </span>
          {selected && (
            <span className="text-[10px] font-mono text-zinc-400 truncate">
              {selected.name} Â· x {Math.round(selected.x)} Â· y {Math.round(selected.y)} Â· {Math.round(selected.w)}Ã—{Math.round(selected.h)}
              <span className="text-zinc-600">
                {' '}({Math.round((selected.x / format.width) * 100)}% Â· {Math.round((selected.y / format.height) * 100)}%)
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={fitToView}
            title="Ajuster la carte à l’écran"
            className="px-2 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-[#E85D42] border border-zinc-800 hover:border-[#E85D42] transition-colors"
          >
            AJUSTER
          </button>
          <span className="text-[10px] font-mono text-zinc-500">ZOOM</span>
          <input
            type="range"
            min={10}
            max={150}
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-24 accent-[#E85D42]"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-9 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      <div ref={fitRef} className="flex-1 min-h-0 overflow-auto grid place-items-center p-8" onWheel={onWheel}>
        <div
          ref={wrapRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (editingTextId) return;
            onKeyDown(e);
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerDown={(e) => {
            // A click on empty canvas exits text editing, the way clicking away
            // does in every other editor.
            if (editingTextId) setEditingTextId(null);
            onSelect(null);
          }}
          className="relative shrink-0 outline-none shadow-2xl"
          style={{ width: displayW, height: displayH }}
        >
          <canvas ref={canvasRef} className="block w-full h-full" style={{ width: displayW, height: displayH }} />

          {/* Safe zones: the regions the platform's own UI will cover. */}
          {showSafeZones && format.safeZones?.map((zone, i) => {
            const style: React.CSSProperties = zone.side === 'top'
              ? { left: 0, top: 0, width: '100%', height: `${zone.size * 100}%` }
              : zone.side === 'bottom'
                ? { left: 0, bottom: 0, width: '100%', height: `${zone.size * 100}%` }
                : zone.side === 'left'
                  ? { left: 0, top: 0, height: '100%', width: `${zone.size * 100}%` }
                  : { right: 0, top: 0, height: '100%', width: `${zone.size * 100}%` };
            return (
              <div
                key={`${zone.side}-${i}`}
                className="absolute pointer-events-none border-dashed border-amber-400/40 bg-amber-400/5"
                style={style}
              >
                {zone.label && (
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono uppercase tracking-widest text-amber-400/70">
                    {zone.label}
                  </span>
                )}
              </div>
            );
          })}

          {guides.x !== undefined && (
            <div className="absolute pointer-events-none bg-[#E85D42]" style={{ left: guides.x, top: 0, width: 1, height: '100%' }} />
          )}
          {guides.y !== undefined && (
            <div className="absolute pointer-events-none bg-[#E85D42]" style={{ top: guides.y, left: 0, height: 1, width: '100%' }} />
          )}
          {/* Layer hit targets, painted top-most first so the top layer wins a click. */}
          {[...card.layers].reverse().map(layer => {
            if (!layer.visible) return null;
            const isSelected = layer.id === selectedId;
            const isEditing = layer.id === editingTextId;
            return (
              <div
                key={layer.id}
                onPointerDown={(e) => {
                  // While editing text, clicks belong to the textarea.
                  if (isEditing) return;
                  onPointerDown(e, layer);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (layer.kind !== 'text' || layer.locked) return;
                  onSelect(layer.id);
                  setEditingTextId(layer.id);
                }}
                title={layer.locked ? 'Calque verrouillé' : undefined}
                className={`absolute ${layer.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
                style={{
                  left: layer.x * zoom,
                  top: layer.y * zoom,
                  width: Math.max(4, layer.w * zoom),
                  height: Math.max(4, layer.h * zoom),
                  transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                }}
              >
                <div
                  className={`w-full h-full border transition-colors ${
                    isSelected || isEditing
                      ? 'border-[#E85D42] bg-[#E85D42]/5'
                      : 'border-transparent hover:border-white/40'
                  }`}
                />
                {layer.locked && (
                  <span className="absolute top-0 right-0 text-[8px] font-mono bg-zinc-900 text-amber-400 px-1 pointer-events-none">
                    LOCK
                  </span>
                )}
                {/* A small badge tells the editor that a double-click edits text,
                    instead of leaving it to be discovered. */}
                {layer.kind === 'text' && isSelected && !isEditing && (
                  <span className="absolute -top-5 left-0 text-[9px] font-mono bg-[#E85D42] text-white px-1.5 py-0.5 pointer-events-none whitespace-nowrap">
                    double-clic pour modifier
                  </span>
                )}

                {/* In-place text editor */}
                {isEditing && (
                  <textarea
                    ref={editRef}
                    value={layer.kind === 'text' ? layer.text : ''}
                    onChange={(e) => onChangeLayer(layer.id, { text: e.target.value, binding: undefined } as Partial<SocialLayer>)}
                    onBlur={() => setEditingTextId(null)}
                    onKeyDown={(e) => {
                      // Escape leaves editing without moving the layer.
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingTextId(null);
                      }
                      // Enter inserts a newline; the block is multi-line.
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute inset-0 w-full h-full bg-zinc-950/80 border border-[#E85D42] px-2 py-1 text-white resize-none outline-none"
                    style={{
                      // Match the rendered face and size, scaled to the zoom, so
                      // the text does not jump when the editor opens.
                      fontFamily: layer.kind === 'text' ? layer.fontFamily : undefined,
                      fontStyle: layer.kind === 'text' ? layer.fontStyle : undefined,
                      fontWeight: layer.kind === 'text' ? layer.fontWeight : undefined,
                      fontSize: layer.kind === 'text' ? Math.max(8, layer.fontSize * zoom) : undefined,
                      lineHeight: layer.kind === 'text' ? layer.lineHeight : undefined,
                      textAlign: layer.kind === 'text' ? layer.align : undefined,
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Resize handles, drawn in screen space so they stay grabbable at any zoom. */}
          {selected && !selected.locked && HANDLES.map(h => (
            <div
              key={h.id}
              onPointerDown={(e) => onHandleDown(e, selected, h.id)}
              className="absolute bg-white border border-[#E85D42] z-10"
              style={{
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                left: (selected.x + selected.w * h.fx) * zoom - HANDLE_SIZE / 2,
                top: (selected.y + selected.h * h.fy) * zoom - HANDLE_SIZE / 2,
                cursor: h.cursor,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
