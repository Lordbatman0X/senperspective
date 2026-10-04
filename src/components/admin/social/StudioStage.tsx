/**
 * The interactive canvas stage.
 *
 * Built on the pure geometry in `canvasOps`, so this file only turns pointers and
 * keys into those calls and draws the selection chrome.
 *
 * The interaction model follows Figma:
 *  - click to select, shift-click to extend, drag empty canvas to marquee
 *  - arrow keys nudge (shift = 10px), alt-drag resizes from centre
 *  - middle-drag or space-drag pans, ctrl-wheel zooms
 *  - a multi-selection moves as one; group members always move together
 *  - objects snap to each other's edges, not just the card frame
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SocialCard, SocialLayer } from '../../../types/social';
import type { SocialFormat } from '../../../lib/social/networks';
import { renderCard, sampleLogoLuminances, type RenderContext } from '../../../lib/social/renderer';
import {
  boundsOf, computeSnap, hitTest, marqueeSelection, normalizeRect,
  resizeBox, type ResizeHandle,
} from '../../../lib/social/canvasOps';
import { preloadAssets } from '../../../lib/social/imageLoader';

const HANDLE_SIZE = 9;
const SNAP_THRESHOLD = 6;

const HANDLES: Array<{ id: ResizeHandle; fx: number; fy: number; cursor: string }> = [
  { id: 'nw', fx: 0, fy: 0, cursor: 'nwse-resize' },
  { id: 'ne', fx: 1, fy: 0, cursor: 'nesw-resize' },
  { id: 'se', fx: 1, fy: 1, cursor: 'nwse-resize' },
  { id: 'sw', fx: 0, fy: 1, cursor: 'nesw-resize' },
  { id: 'n', fx: 0.5, fy: 0, cursor: 'ns-resize' },
  { id: 'e', fx: 1, fy: 0.5, cursor: 'ew-resize' },
  { id: 's', fx: 0.5, fy: 1, cursor: 'ns-resize' },
  { id: 'w', fx: 0, fy: 0.5, cursor: 'ew-resize' },
];

/** A snapshot of everything a gesture needs, captured when the drag begins. */
type DragState =
  | { kind: 'move'; start: { x: number; y: number }; origins: Map<string, { x: number; y: number }>; group: { x: number; y: number; w: number; h: number } }
  | { kind: 'resize'; handle: ResizeHandle; start: { x: number; y: number }; ids: string[]; orig: Map<string, { x: number; y: number; w: number; h: number }>; keepRatio: boolean }
  | { kind: 'marquee'; start: { x: number; y: number }; additive: boolean }
  | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number };

export interface StudioStageProps {
  card: SocialCard;
  format: SocialFormat;
  content: RenderContext['content'];
  selection: string[];
  onSelectionChange: (ids: string[]) => void;
  onPatchLayers: (patches: Array<{ id: string; patch: Partial<SocialLayer> }>) => void;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  preloadedSources?: string[];
  showSafeZones: boolean;
  logoAuto: boolean;
  brandLogo?: { src?: string; light?: string; dark?: string };
  snapToObjects?: boolean;
}
export function StudioStage({
  card,
  format,
  content,
  selection,
  onSelectionChange,
  onPatchLayers,
  onDeleteSelection,
  onDuplicateSelection,
  onGroup,
  onUngroup,
  preloadedSources = [],
  showSafeZones,
  logoAuto,
  brandLogo,
  snapToObjects = true,
}: StudioStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.42);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState<Array<{ axis: 'x' | 'y'; at: number }>>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Live gesture state lives in a ref so the pointer handlers always read the
  // current value without re-subscribing on every move.
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (editingTextId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingTextId]);

  // ---- asset preloading ----------------------------------------------------
  useEffect(() => {
    const sources = new Set<string>();
    for (const layer of card.layers) {
      if ((layer.kind === 'background' || layer.kind === 'image') && layer.src) sources.add(layer.src);
      if (layer.kind === 'logo') {
        if (layer.src) sources.add(layer.src);
        if (layer.toneSrc?.light) sources.add(layer.toneSrc.light);
        if (layer.toneSrc?.dark) sources.add(layer.toneSrc.dark);
      }
    }
    preloadedSources.forEach(s => s && sources.add(s));
    let cancelled = false;
    preloadAssets([...sources]).then(() => { if (!cancelled) setReloadKey(k => k + 1); });
    return () => { cancelled = true; };
  }, [card, preloadedSources.join('|')]);

  // ---- paint ---------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = format.width;
    canvas.height = format.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const base: RenderContext = { content, brandLogo };
    const logoLuminance = logoAuto ? sampleLogoLuminances(canvas, card, format, base) : undefined;
    ctx.clearRect(0, 0, format.width, format.height);
    renderCard(ctx, card, format, { ...base, logoLuminance });
  }, [card, format, content, logoAuto, brandLogo, reloadKey]);

  // ---- geometry helpers ----------------------------------------------------
  const toCardCoords = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  /** Every selectable box in paint order (bottom-to-top) for hit/marquee. */
  const boxes = useMemo(
    () => card.layers
      .filter(l => l.visible && !l.locked)
      .map(l => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.h, visible: l.visible })),
    [card.layers],
  );

  /** Selected, unlocked layers — the set every gesture acts on. */
  const selectedLayers = useMemo(
    () => card.layers.filter(l => selection.includes(l.id) && !l.locked),
    [card.layers, selection],
  );

  /** The Figma multi-select box drawn once around the whole selection. */
  const selectionBounds = useMemo(
    () => boundsOf(selectedLayers.map(l => ({ x: l.x, y: l.y, w: l.w, h: l.h }))),
    [selectedLayers],
  );

  const frameBox = useMemo(
    () => ({ width: format.width, height: format.height }),
    [format.width, format.height],
  );

  const displayW = Math.round(format.width * zoom);
  const displayH = Math.round(format.height * zoom);
  // ---- pointer handling ----------------------------------------------------
  const beginDrag = (e: React.PointerEvent, state: DragState) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = state;
  };

  const onLayerPointerDown = (e: React.PointerEvent, layer: SocialLayer) => {
    e.stopPropagation();
    if (editingTextId) setEditingTextId(null);
    if (layer.locked) return;

    const additive = e.shiftKey;
    // Shift-click toggles; a plain click on an already-selected layer keeps the
    // selection so a multi-layer drag still works.
    const nextSelection = additive
      ? (selection.includes(layer.id) ? selection.filter(id => id !== layer.id) : [...selection, layer.id])
      : (selection.includes(layer.id) ? selection : [layer.id]);

    onSelectionChange(nextSelection);
    if (!nextSelection.length) return;

    const p = toCardCoords(e.clientX, e.clientY);
    const origins = new Map<string, { x: number; y: number }>();
    const memberBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const id of nextSelection) {
      const l = card.layers.find(x => x.id === id);
      if (l && !l.locked) {
        origins.set(id, { x: l.x, y: l.y });
        memberBoxes.push({ x: l.x, y: l.y, w: l.w, h: l.h });
      }
    }
    beginDrag(e, { kind: 'move', start: p, origins, group: boundsOf(memberBoxes) ?? { x: p.x, y: p.y, w: 0, h: 0 } });
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (editingTextId) setEditingTextId(null);
    // Middle mouse or space held pans; otherwise a marquee begins.
    if (e.button === 1 || spaceDown) {
      beginDrag(e, { kind: 'pan', startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y });
      return;
    }
    if (!e.shiftKey) onSelectionChange([]);
    const p = toCardCoords(e.clientX, e.clientY);
    beginDrag(e, { kind: 'marquee', start: p, additive: e.shiftKey });
    setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onHandlePointerDown = (e: React.PointerEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    const p = toCardCoords(e.clientX, e.clientY);
    const movable = selectedLayers.filter(l => !l.locked);
    if (!movable.length) return;
    const orig = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const l of movable) orig.set(l.id, { x: l.x, y: l.y, w: l.w, h: l.h });
    // Aspect locks only for a lone logo, so a multi-selection stays free to resize.
    const keepRatio = movable.length === 1 && movable[0].kind === 'logo' && movable[0].lockAspect;
    beginDrag(e, { kind: 'resize', handle, start: p, ids: movable.map(l => l.id), orig, keepRatio });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toCardCoords(e.clientX, e.clientY);

    if (drag.kind === 'pan') {
      setPan({ x: drag.originX + (e.clientX - drag.startX), y: drag.originY + (e.clientY - drag.startY) });
      return;
    }
    if (drag.kind === 'marquee') { setMarquee(normalizeRect(drag.start, p)); return; }

    if (drag.kind === 'move') {
      const delta = { x: p.x - drag.start.x, y: p.y - drag.start.y };
      let dx = delta.x;
      let dy = delta.y;
      if (snapToObjects) {
        // Snap the group's bounds, then apply the correction to every member so
        // the whole selection stays rigid.
        const moved = { ...drag.group, x: drag.group.x + delta.x, y: drag.group.y + delta.y };
        const others = boxes.filter(b => !drag.origins.has(b.id));
        const snap = computeSnap(moved, { threshold: SNAP_THRESHOLD, others, frame: frameBox, toObjects: true });
        dx = delta.x + snap.dx;
        dy = delta.y + snap.dy;
        setGuides(snap.guides.map(g => ({ axis: g.axis, at: g.snapped })));
      }
      onPatchLayers([...drag.origins.entries()].map(([id, o]) => ({
        id,
        patch: { x: Math.round(o.x + dx), y: Math.round(o.y + dy) },
      })));
      return;
    }

    // resize: scale every selected layer by the ratio the first one moved by.
    const delta = { x: p.x - drag.start.x, y: p.y - drag.start.y };
    const first = drag.orig.get(drag.ids[0]);
    if (!first) return;
    const resized = resizeBox(first, drag.handle, delta, { keepRatio: drag.keepRatio, fromCentre: e.altKey });
    const scaleX = first.w ? resized.w / first.w : 1;
    const scaleY = first.h ? resized.h / first.h : 1;
    onPatchLayers(drag.ids.map(id => {
      const o = drag.orig.get(id)!;
      return {
        id,
        patch: {
          x: Math.round(resized.x + (o.x - first.x) * scaleX),
          y: Math.round(resized.y + (o.y - first.y) * scaleY),
          w: Math.max(1, Math.round(o.w * scaleX)),
          h: Math.max(1, Math.round(o.h * scaleY)),
        },
      };
    }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    if (drag.kind === 'marquee') {
      const rect = normalizeRect(drag.start, toCardCoords(e.clientX, e.clientY));
      // A click without a drag selects nothing; a real drag commits the marquee.
      if (rect.w > 2 || rect.h > 2) {
        const hits = marqueeSelection(rect, boxes, e.altKey ? 'enclosed' : 'touch');
        onSelectionChange(drag.additive ? [...new Set([...selection, ...hits])] : hits);
      }
    }
    setMarquee(null);
    setGuides([]);
  };

  const onDoubleClickLayer = (e: React.MouseEvent, layer: SocialLayer) => {
    e.stopPropagation();
    if (layer.kind !== 'text' || layer.locked) return;
    onSelectionChange([layer.id]);
    setEditingTextId(layer.id);
  };
  // ---- keyboard -----------------------------------------------------------
  // These are the shortcuts an editor expects from any canvas tool. Backspace /
  // delete, arrows, ctrl+A / G / D, Escape. Text inputs opt out via the target
  // check so typing a space in a caption does not pan the canvas.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === ' ' && !spaceDown) { setSpaceDown(true); e.preventDefault(); return; }
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); onSelectionChange(boxes.map(b => b.id)); return; }
      if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); if (e.shiftKey) onUngroup(); else onGroup(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); onDuplicateSelection(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onDeleteSelection(); return; }
      if (e.key === 'Escape') { onSelectionChange([]); setEditingTextId(null); return; }

      const step = e.shiftKey ? 10 : 1;
      const nudge: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0],
        ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      const move = nudge[e.key];
      if (move && selection.length) {
        e.preventDefault();
        const patches: Array<{ id: string; patch: Partial<SocialLayer> }> = [];
        for (const id of selection) {
          const l = card.layers.find(x => x.id === id);
          if (l) patches.push({ id, patch: { x: l.x + move[0], y: l.y + move[1] } });
        }
        onPatchLayers(patches);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ') setSpaceDown(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [spaceDown, selection, boxes, card.layers, onSelectionChange, onPatchLayers, onDeleteSelection, onDuplicateSelection, onGroup, onUngroup]);

  // ---- zoom / fit ---------------------------------------------------------
  // Fit the card to the viewport on mount and on format change, so switching to
  // a tall 9:16 never leaves the card running off the bottom.
  const fitToView = useCallback(() => {
    const host = wrapRef.current?.parentElement;
    if (!host) return;
    const pad = 64;
    const next = Math.min((host.clientWidth - pad) / format.width, (host.clientHeight - pad) / format.height, 1);
    setZoom(Math.max(0.1, Math.min(1, Math.round(next * 100) / 100)));
    setPan({ x: 0, y: 0 });
  }, [format.width, format.height]);

  useEffect(() => { fitToView(); }, [fitToView]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(2, z - e.deltaY * 0.0015)));
  }, []);
  // ---- render --------------------------------------------------------------
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-zinc-950">
      {/* Toolbar: zoom + live selection measurement */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0">
            {format.width}×{format.height}
          </span>
          {selectionBounds && (
            <span className="text-[10px] font-mono text-zinc-400 truncate">
              {selectedLayers.length > 1 ? `${selectedLayers.length} sélectionnés` : selectedLayers[0]?.name}
              {' · '}{Math.round(selectionBounds.w)}×{Math.round(selectionBounds.h)} @ {Math.round(selectionBounds.x)},{Math.round(selectionBounds.y)}
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
            type="range" min={10} max={200}
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-24 accent-[#E85D42]"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-9 text-right">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden grid place-items-center" onWheel={onWheel}>
        <div
          className="relative shrink-0 outline-none"
          style={{ width: displayW, height: displayH, transform: `translate(${pan.x}px, ${pan.y}px)`, cursor: spaceDown ? 'grab' : 'default' }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="block w-full h-full shadow-2xl" style={{ width: displayW, height: displayH }} />

          {/* Safe zones: what the platform UI covers. */}
          {showSafeZones && format.safeZones?.map((zone, i) => {
            const style: React.CSSProperties = zone.side === 'top'
              ? { left: 0, top: 0, width: '100%', height: `${zone.size * 100}%` }
              : zone.side === 'bottom'
                ? { left: 0, bottom: 0, width: '100%', height: `${zone.size * 100}%` }
                : zone.side === 'left'
                  ? { left: 0, top: 0, height: '100%', width: `${zone.size * 100}%` }
                  : { right: 0, top: 0, height: '100%', width: `${zone.size * 100}%` };
            return (
              <div key={`${zone.side}-${i}`} className="absolute pointer-events-none border-dashed border-amber-400/40 bg-amber-400/5" style={style}>
                {zone.label && (
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono uppercase tracking-widest text-amber-400/70">{zone.label}</span>
                )}
              </div>
            );
          })}

          {/* Snap guides */}
          {guides.map((g, i) => g.axis === 'x' ? (
            <div key={i} className="absolute pointer-events-none bg-[#E85D42]" style={{ left: g.at * zoom, top: 0, width: 1, height: '100%' }} />
          ) : (
            <div key={i} className="absolute pointer-events-none bg-[#E85D42]" style={{ top: g.at * zoom, left: 0, height: 1, width: '100%' }} />
          ))}
          {/* Layer hit targets, painted top-most first so the top layer wins a click. */}
          {[...card.layers].reverse().map(layer => {
            if (!layer.visible) return null;
            const isSelected = selection.includes(layer.id);
            const isEditing = layer.id === editingTextId;
            return (
              <div
                key={layer.id}
                onPointerDown={(e) => { if (!isEditing) onLayerPointerDown(e, layer); }}
                onDoubleClick={(e) => onDoubleClickLayer(e, layer)}
                className={`absolute ${layer.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
                style={{
                  left: layer.x * zoom, top: layer.y * zoom,
                  width: Math.max(4, layer.w * zoom), height: Math.max(4, layer.h * zoom),
                  transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                }}
              >
                <div className={`w-full h-full border transition-colors ${
                  isSelected || isEditing
                    ? 'border-[#E85D42] bg-[#E85D42]/5'
                    : 'border-transparent hover:border-white/40'
                }`} />
                {layer.locked && (
                  <span className="absolute top-0 right-0 text-[8px] font-mono bg-zinc-900 text-amber-400 px-1 pointer-events-none">LOCK</span>
                )}
                {isEditing && (
                  <textarea
                    ref={editRef}
                    value={layer.kind === 'text' ? layer.text : ''}
                    onChange={(e) => onPatchLayers([{ id: layer.id, patch: { text: e.target.value, binding: undefined } as Partial<SocialLayer> }])}
                    onBlur={() => setEditingTextId(null)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setEditingTextId(null); } e.stopPropagation(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute inset-0 w-full h-full bg-zinc-950/80 border border-[#E85D42] px-2 py-1 text-white resize-none outline-none"
                    style={{
                      // Match the rendered face and size at the current zoom so the
                      // text does not jump when the editor opens.
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

          {/* Marquee rectangle */}
          {marquee && (
            <div
              className="absolute pointer-events-none border border-[#E85D42] bg-[#E85D42]/10"
              style={{ left: marquee.x * zoom, top: marquee.y * zoom, width: marquee.w * zoom, height: marquee.h * zoom }}
            />
          )}

          {/* Figma multi-select box: drawn once around the whole selection, with
              the eight resize handles on its border. */}
          {selectionBounds && !editingTextId && (
            <>
              <div
                className="absolute pointer-events-none border border-[#E85D42]"
                style={{
                  left: selectionBounds.x * zoom,
                  top: selectionBounds.y * zoom,
                  width: selectionBounds.w * zoom,
                  height: selectionBounds.h * zoom,
                }}
              />
              {HANDLES.map(h => (
                <div
                  key={h.id}
                  onPointerDown={(e) => onHandlePointerDown(e, h.id)}
                  className="absolute bg-white border border-[#E85D42] z-10"
                  style={{
                    width: HANDLE_SIZE, height: HANDLE_SIZE,
                    left: (selectionBounds.x + selectionBounds.w * h.fx) * zoom - HANDLE_SIZE / 2,
                    top: (selectionBounds.y + selectionBounds.h * h.fy) * zoom - HANDLE_SIZE / 2,
                    cursor: h.cursor,
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}