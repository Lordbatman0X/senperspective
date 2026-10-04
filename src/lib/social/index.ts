/**
 * Single entry point for the Social Studio.
 *
 * The Studio UI imports from the individual modules for tree-shaking; this
 * barrel exists so the node test suite can bundle the whole pure surface with
 * one esbuild pass (see the `test:social-studio` npm script). It contains no
 * logic of its own.
 */

export * from './networks';
// `canvasOps` also exports `Rect`; renderer.ts owns the canonical one used by
// the public API, so canvasOps is re-exported without its duplicate.
export {
  rectsIntersect, rectContains, boundsOf, normalizeRect,
  marqueeSelection, hitTest, computeSnap,
  resizeBox, translateBox, rotatePoint, angleFrom,
  alignBoxes, distributeBoxes,
  groupLayers, ungroupLayers, expandToGroups, groupIdsOf,
  toggleSelection, addToSelection,
} from './canvasOps';
export type { SnapCandidate, SnapOptions, ResizeHandle, Groupable } from './canvasOps';
export * from './captions';
export * from './content';
export * from './fit';
export * from './filters';
export * from './logoTone';
export * from './document';
export * from './templates';
export * from './renderer';