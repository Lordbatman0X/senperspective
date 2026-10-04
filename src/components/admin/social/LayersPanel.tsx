export function LayersPanel({
  layers,
  selectedId,
  onSelect,
  onPatch,
  onReorder,
  onDuplicate,
  onDelete,
  onAdd,
}: LayersPanelProps) {
  const selected = layers.find(l => l.id === selectedId) ?? null;
  const ordered = [...layers].reverse();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#E85D42]">
          Calques ({layers.length})
        </h4>
        <div className="flex gap-1">
          <GhostButton onClick={() => onAdd('text')} title="Ajouter un bloc de texte">+ Texte</GhostButton>
          <GhostButton onClick={() => onAdd('shape')} title="Ajouter une forme">+ Forme</GhostButton>
          <GhostButton onClick={() => onAdd('image')} title="Ajouter une image">+ Image</GhostButton>
        </div>
      </div>

      {layers.length === 0 && (
        <EmptyHint>Cette carte n’a aucun calque. Ajoutez-en un pour commencer.</EmptyHint>
      )}

      <div className="flex flex-col gap-1">
        {ordered.map(layer => {
          const isSelected = layer.id === selectedId;
          return (
            <div
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-[#E85D42] bg-[#E85D42]/10'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
              }`}
            >
              <button
                type="button"
                title={layer.visible ? 'Masquer' : 'Afficher'}
                onClick={(e) => { e.stopPropagation(); onPatch(layer.id, { visible: !layer.visible }); }}
                className="text-zinc-500 hover:text-zinc-200 shrink-0"
              >
                {layer.visible ? <Eye size={12} /> : <EyeOff size={12} className="opacity-40" />}
              </button>

              <span className="text-zinc-500 shrink-0">{kindIcon(layer)}</span>

              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold text-zinc-200 truncate">{layer.name}</span>
                <span className="block text-[9px] font-mono text-zinc-500 tracking-wide">{kindLabel(layer)}</span>
              </span>

              {layer.filters.length + layer.effects.length > 0 && (
                <span
                  className="text-[9px] font-mono text-zinc-500 shrink-0"
                  title="Filtres et effets appliqués"
                >
                  fx{layer.filters.length + layer.effects.length}
                </span>
              )}

              <button
                type="button"
                title={layer.locked ? 'Déverrouiller' : 'Verrouiller'}
                onClick={(e) => { e.stopPropagation(); onPatch(layer.id, { locked: !layer.locked }); }}
                className={`shrink-0 ${layer.locked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-200'}`}
              >
                {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <>
          <div className="grid grid-cols-3 gap-1">
            <GhostButton onClick={() => onReorder(selected.id, 'front')} title="Mettre tout devant">
              <ArrowUpToLine size={12} />
            </GhostButton>
            <GhostButton onClick={() => onReorder(selected.id, 'up')} title="Avancer d’un rang">
              <ArrowUp size={12} />
            </GhostButton>
            <GhostButton onClick={() => onReorder(selected.id, 'down')} title="Reculer d’un rang">
              <ArrowDown size={12} />
            </GhostButton>
            <GhostButton onClick={() => onReorder(selected.id, 'back')} title="Mettre tout derrière">
              <ArrowDownToLine size={12} />
            </GhostButton>
            <GhostButton onClick={() => onDuplicate(selected.id)} title="Dupliquer">
              <Copy size={12} />
            </GhostButton>
            <GhostButton
              onClick={() => onDelete(selected.id)}
              tone="danger"
              title="Supprimer"
              disabled={layers.length <= 1}
            >
              <Trash2 size={12} />
            </GhostButton>
          </div>

          <label className="block pt-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
              Mode de fusion
            </span>
            <select
              value={selected.blend}
              onChange={(e) => onPatch(selected.id, { blend: e.target.value as LayerBlend })}
              className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-[#E85D42]"
            >
              {BLEND_OPTIONS.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
/**
 * The ordered layer list.
 *
 * Shown TOP-FIRST — the reverse of `card.layers`, which is stored bottom-to-top —
 * because that is how a designer reads a stack: whatever is painted last sits at
 * the top of the list and can be picked without hunting.
 */

import React from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers as LayersIcon,
  Lock,
  Square,
  Type as TypeIcon,
  Unlock,
  ArrowDownToLine,
  ArrowUpToLine,
  ArrowDown,
  ArrowUp,
  Trash2,
} from 'lucide-react';
import type { LayerBlend, SocialLayer } from '../../../types/social';
import { GhostButton, EmptyHint } from './StudioPrimitives';

const BLEND_OPTIONS: Array<{ value: LayerBlend; label: string }> = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Produit' },
  { value: 'screen', label: 'Incrustation' },
  { value: 'overlay', label: 'Superposition' },
  { value: 'color', label: 'Couleur' },
  { value: 'luminosity', label: 'Luminosité' },
];

export interface LayersPanelProps {
  layers: SocialLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<SocialLayer>) => void;
  onReorder: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (kind: 'text' | 'shape' | 'image') => void;
}

function kindIcon(layer: SocialLayer) {
  switch (layer.kind) {
    case 'text': return <TypeIcon size={12} />;
    case 'background': return <ImageIcon size={12} />;
    case 'image': return <ImageIcon size={12} />;
    case 'logo': return <LayersIcon size={12} />;
    default: return <Square size={12} />;
  }
}

function kindLabel(layer: SocialLayer): string {
  switch (layer.kind) {
    case 'text': return 'TEXTE';
    case 'background': return layer.src ? 'FOND + IMAGE' : 'FOND';
    case 'image': return 'IMAGE';
    case 'logo': return 'LOGO';
    default: return 'FORME';
  }
}