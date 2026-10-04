/**
 * Align boxes to a shared edge.
 *
 * With one box this is "align to the frame"; with several it is "align
 * selection", which is the reason to multi-select at all. The frame is ignored
 * for the multi-box case, because the boxes themselves define the shared edge.
 *
 * Returns per-index deltas rather than new rects so the caller can apply them to
 * whatever it holds (layers, group members) without reconstructing anything.
 */
export function alignBoxes(
  boxes: Rect[],
  mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom',
  frame: { width: number; height: number },
): Array<{ dx: number; dy: number }> {
  if (!boxes.length) return [];
  const useFrame = boxes.length === 1;
  const b = boundsOf(boxes)!;

  return boxes.map(r => {
    switch (mode) {
      case 'left':
        return { dx: useFrame ? 0 - r.x : b.x - r.x, dy: 0 };
      case 'centerH':
        return {
          dx: useFrame
            ? (frame.width - r.w) / 2 - r.x
            : b.x + b.w / 2 - (r.x + r.w / 2),
          dy: 0,
        };
      case 'right':
        return {
          dx: useFrame ? frame.width - r.w - r.x : b.x + b.w - (r.x + r.w),
          dy: 0,
        };
      case 'top':
        return { dx: 0, dy: useFrame ? 0 - r.y : b.y - r.y };
      case 'centerV':
        return {
          dx: 0,
          dy: useFrame
            ? (frame.height - r.h) / 2 - r.y
            : b.y + b.h / 2 - (r.y + r.h / 2),
        };
      case 'bottom':
        return {
          dx: 0,
          dy: useFrame ? frame.height - r.h - r.y : b.y + b.h - (r.y + r.h),
        };
    }
  });
}

/**
 * Evenly distribute boxes along an axis.
 *
 * Fewer than three boxes have nothing to distribute between, so the call is a
 * no-op rather than collapsing everything onto one edge.
 */
export function distributeBoxes(boxes: Rect[], axis: 'x' | 'y'): Array<{ dx: number; dy: number }> {
  const zero = boxes.map(() => ({ dx: 0, dy: 0 }));
  if (boxes.length < 3) return zero;

  const size = axis === 'x' ? 'w' : 'h';
  const pos = axis === 'x' ? 'x' : 'y';
  const bounds = boundsOf(boxes)!;

  const totalSize = boxes.reduce((s, b) => s + b[size], 0);
  const gap = (bounds[size] - totalSize) / (boxes.length - 1);

  // Deltas are computed against the caller's original ordering, so the result
  // lines up index-for-index with the input.
  const ordered = boxes
    .map((b, index) => ({ b, index }))
    .sort((p, q) => p.b[pos] - q.b[pos]);

  const out = [...zero];
  let cursor = ordered[0].b[pos];
  for (const { b, index } of ordered) {
    out[index] = axis === 'x'
      ? { dx: cursor - b[pos], dy: 0 }
      : { dx: 0, dy: cursor - b[pos] };
    cursor += b[size] + gap;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Groups and selection
//
// Groups are membership tags (`LayerBase.group`), not a nested tree, so these are
// plain array operations rather than a recursive walk. Keeping them pure means
// the keyboard shortcuts — group, ungroup, select all — are testable without a
// canvas.
// ---------------------------------------------------------------------------

export interface Groupable {
  id: string;
  group?: string;
}

/** Group the given ids, returning the new list and the group id. */
export function groupLayers<T extends Groupable>(
  layers: T[],
  ids: string[],
): { layers: T[]; groupId: string } {
  if (ids.length < 2) return { layers, groupId: '' };
  // Derived from the members rather than random, so undo/redo stays reproducible.
  const groupId = `g${ids.slice().sort().join('_').slice(0, 24)}`;
  const set = new Set(ids);
  return {
    groupId,
    layers: layers.map(l => (set.has(l.id) ? { ...l, group: groupId } : l)),
  };
}

/**
 * Remove group membership.
 *
 * With no ids, clears every group. With ids, only those layers are released,
 * which is how a single member is pulled out of a group.
 */
export function ungroupLayers<T extends Groupable>(layers: T[], ids?: string[]): T[] {
  if (!ids || !ids.length) return layers.map(l => ({ ...l, group: undefined }));
  const set = new Set(ids);
  return layers.map(l => (set.has(l.id) ? { ...l, group: undefined } : l));
}

/** Ids of every layer in the same group as any of `ids`. */
export function expandToGroups<T extends Groupable>(layers: T[], ids: string[]): string[] {
  const groups = new Set(
    layers.filter(l => ids.includes(l.id) && l.group).map(l => l.group!),
  );
  if (!groups.size) return ids;
  // Selecting any member selects the whole group, so dragging never splits it.
  return layers.filter(l => (l.group ? groups.has(l.group) : ids.includes(l.id))).map(l => l.id);
}

/** Distinct group ids present, in first-seen order. */
export function groupIdsOf<T extends Groupable>(layers: T[]): string[] {
  const seen: string[] = [];
  for (const l of layers) {
    if (l.group && !seen.includes(l.group)) seen.push(l.group);
  }
  return seen;
}

/** Toggle one id in a selection, preserving click order. */
export function toggleSelection(selection: string[], id: string): string[] {
  return selection.includes(id) ? selection.filter(s => s !== id) : [...selection, id];
}

/** Add ids not already present (shift-click enlarges a selection). */
export function addToSelection(selection: string[], ids: string[]): string[] {
  const set = new Set(selection);
  return [...selection, ...ids.filter(id => !set.has(id))];
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Resize a box by dragging a handle.
 *
 * `fromCentre` backs the layer out symmetrically (alt-drag in Figma), and
 * `keepRatio` is how a logo stays undistorted.
 */
export function resizeBox(
  start: Rect,
  handle: ResizeHandle,
  delta: Point,
  opts: { min?: number; keepRatio?: boolean; fromCentre?: boolean } = {},
): Rect {
  const min = opts.min ?? 4;
  const ratio = start.w / Math.max(1, start.h);

  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.includes('n');
  const south = handle.includes('s');

  let dw = (east ? delta.x : 0) - (west ? delta.x : 0);
  let dh = (south ? delta.y : 0) - (north ? delta.y : 0);

  if (opts.keepRatio && west !== east && north !== south) {
    // Corner drag on a locked-aspect layer: follow whichever axis moved more.
    if (Math.abs(dw) / ratio > Math.abs(dh)) dh = (Math.abs(dw) / ratio) * (dh < 0 ? -1 : 1);
    else dw = Math.abs(dh) * ratio * (dw < 0 ? -1 : 1);
  }

  const w = Math.max(min, start.w + dw);
  const h = Math.max(min, start.h + dh);

  let x = west && !opts.fromCentre ? start.x + (start.w - w) : start.x;
  let y = north && !opts.fromCentre ? start.y + (start.h - h) : start.y;

  if (opts.fromCentre) {
    x = start.x + (start.w - w) / 2;
    y = start.y + (start.h - h) / 2;
  }

  return { x, y, w, h };
}

/** Move a box by a delta, keeping it reachable on the card. */
export function translateBox(
  box: Rect,
  delta: Point,
  frame?: { width: number; height: number },
): Rect {
  let x = box.x + delta.x;
  let y = box.y + delta.y;

  if (frame) {
    // Allow an overhang, but never let an object be dragged fully off-canvas
    // where it can no longer be grabbed.
    const margin = 24;
    x = Math.min(frame.width - margin, Math.max(margin - box.w, x));
    y = Math.min(frame.height - margin, Math.max(margin - box.h, y));
  }

  return { ...box, x, y };
}

/** Rotate a point around a pivot. */
export function rotatePoint(p: Point, pivot: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  };
}

/** Angle in degrees from `pivot` to `p`, in the range (-180, 180]. */
export function angleFrom(pivot: Point, p: Point): number {
  const rad = Math.atan2(p.y - pivot.y, p.x - pivot.x) * (180 / Math.PI);
  return rad > 180 ? rad - 360 : rad < -180 ? rad + 360 : rad;
}
export interface SnapCandidate {
  /** The coordinate being snapped (an edge or centre of the dragged box). */
  value: number;
  /** Where it lands after snapping. */
  snapped: number;
  axis: 'x' | 'y';
  kind: 'edge' | 'center' | 'gap';
}

export interface SnapOptions {
  /** Threshold in card pixels. */
  threshold: number;
  /** Other boxes on the card. */
  others: BoxLike[];
  frame: { width: number; height: number };
  /** Include the frame in the snap pass. */
  includeFrame?: boolean;
  /**
   * Snap to other objects' edges, not just the frame. This is the single biggest
   * reason hand-placed elements line up in a tool like Figma.
   */
  toObjects?: boolean;
}

/**
 * Snap a dragged box to the nearest candidates.
 *
 * Returns at most one candidate per axis, choosing the closest, so a single drag
 * cannot fight two different guides at once. Ties resolve toward the frame edge,
 * which keeps the card's outer margin winning over an interior object.
 */
export function computeSnap(
  box: Rect,
  opts: SnapOptions,
): { dx: number; dy: number; guides: SnapCandidate[] } {
  const { threshold, others, frame } = opts;

  interface Target { v: number; kind: SnapCandidate['kind']; weight: number }
  const xTargets: Target[] = [];
  const yTargets: Target[] = [];

  const addTargets = (b: Rect, weight: number) => {
    xTargets.push(
      { v: b.x, kind: 'edge', weight },
      { v: b.x + b.w / 2, kind: 'center', weight },
      { v: b.x + b.w, kind: 'edge', weight },
    );
    yTargets.push(
      { v: b.y, kind: 'edge', weight },
      { v: b.y + b.h / 2, kind: 'center', weight },
      { v: b.y + b.h, kind: 'edge', weight },
    );
  };

  if (opts.toObjects !== false) {
    for (const o of others) addTargets(o, 1);
  }
  if (opts.includeFrame !== false) {
    addTargets({ x: 0, y: 0, w: frame.width, h: frame.height }, 2);
  }

  const sourcesX = [box.x, box.x + box.w / 2, box.x + box.w];
  const sourcesY = [box.y, box.y + box.h / 2, box.y + box.h];

  const best = (sources: number[], targets: Target[]) => {
    let winner: { delta: number; target: number; kind: SnapCandidate['kind']; weight: number } | null = null;
    for (const s of sources) {
      for (const t of targets) {
        const delta = t.v - s;
        if (Math.abs(delta) > threshold) continue;
        if (!winner) {
          winner = { delta, target: t.v, kind: t.kind, weight: t.weight };
          continue;
        }
        const closer = Math.abs(delta) < Math.abs(winner.delta);
        const sameDistance = Math.abs(delta) === Math.abs(winner.delta);
        // Frame edges win ties, so the outer margin stays authoritative.
        if (closer || (sameDistance && t.weight > winner.weight)) {
          winner = { delta, target: t.v, kind: t.kind, weight: t.weight };
        }
      }
    }
    return winner;
  };

  const bx = best(sourcesX, xTargets);
  const by = best(sourcesY, yTargets);

  const guides: SnapCandidate[] = [];
  if (bx) guides.push({ value: bx.delta, snapped: box.x + bx.delta, axis: 'x', kind: bx.kind });
  if (by) guides.push({ value: by.delta, snapped: box.y + by.delta, axis: 'y', kind: by.kind });

  return { dx: bx ? bx.delta : 0, dy: by ? by.delta : 0, guides };
}
/**
 * Canvas interaction geometry.
 *
 * This is the heart of the editor and it is deliberately pure: hit-testing,
 * marquee selection, snapping and resize maths are computed here with no React
 * and no DOM, so they can be unit tested. The stage component is then a thin
 * layer that turns pointers into calls on these functions — which is the
 * difference between an editor that feels right and one that fights the user.
 *
 * Everything is in CARD pixels, matching the document, so nothing has to be
 * converted back and forth between zoomed screen space and the stored geometry.
 */

export interface Rect { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }

/** A layer as far as geometry is concerned. */
export interface BoxLike extends Rect { id: string; visible?: boolean }

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when `inner` sits fully inside `outer`. */
export function rectContains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.w <= outer.x + outer.w
    && inner.y + inner.h <= outer.y + outer.h;
}

/** The bounding box of a set of boxes, or null for an empty set. */
export function boundsOf(boxes: Rect[]): Rect | null {
  if (!boxes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Normalise a drag into a positive-size rect. */
export function normalizeRect(start: Point, end: Point): Rect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}

/**
 * Which boxes a marquee captures.
 *
 * Figma's default is "touch": a box counts as selected as soon as the marquee
 * touches it. `enclosed` requires full containment, which is what you want when
 * picking one small element out of a dense cluster.
 */
export function marqueeSelection(
  marquee: Rect,
  boxes: BoxLike[],
  mode: 'touch' | 'enclosed',
): string[] {
  return boxes
    .filter(b => b.visible !== false)
    .filter(b => (mode === 'touch'
      ? rectsIntersect(marquee, b)
      : rectContains(marquee, b)))
    .map(b => b.id);
}

/**
 * Pick the topmost box under a point.
 *
 * `boxes` must be in bottom-to-top paint order, and the LAST box containing the
 * point wins — that is what makes a small element sitting on a full-bleed
 * background selectable. Picking the largest match instead would let the
 * background swallow every click on the layers above it, which is the single
 * most important thing this function has to get right.
 */
export function hitTest(boxes: BoxLike[], p: Point): string | null {
  let found: string | null = null;
  for (const b of boxes) {
    if (b.visible === false) continue;
    if (p.x < b.x || p.x > b.x + b.w || p.y < b.y || p.y > b.y + b.h) continue;
    found = b.id;
  }
  return found;
}