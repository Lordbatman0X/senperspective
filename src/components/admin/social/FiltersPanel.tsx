/**
 * The filter and effect stack for the selected layer.
 *
 * Entries are an ORDERED list the editor can reorder, bypass and delete. Order
 * is the whole point: CSS filter functions compose left to right, so
 * "contrast, then sepia" is genuinely a different result from "sepia, then
 * contrast". Reordering here reorders the render.
 *
 * Filters use the CSS filter primitives; effects (tint, duotone, vignette,
 * shadow, stroke) are composite passes and appear as a second group.
 */

import React from 'react';
import { ChevronDown, ChevronUp, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { EffectEntry, EffectKind, FilterEntry, FilterKind, SocialLayer } from '../../../types/social';
import {
  EFFECT_DEF_BY_KIND,
  FILTER_DEF_BY_KIND,
  makeEffectEntry,
  makeFilterEntry,
} from '../../../lib/social/filters';
import { uid } from '../../../lib/social/document';
import { ColorField, GhostButton, PANEL_LABEL, Section } from './StudioPrimitives';

/** Only the effects that make sense for a given layer kind. */
const EFFECTS_BY_KIND: Record<SocialLayer['kind'], EffectKind[]> = {
  background: ['tint', 'duotone', 'vignette', 'shadow'],
  image: ['tint', 'duotone', 'vignette', 'shadow'],
  text: ['shadow', 'stroke'],
  logo: ['shadow'],
  shape: ['tint', 'stroke'],
};

/** Move an entry within its array; out-of-range moves return the same list. */
function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function StackRow({
  label,
  enabled,
  onToggle,
  onMove,
  onRemove,
  canMoveUp,
  canMoveDown,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`border p-2 mb-1.5 transition-colors ${enabled ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-900 bg-zinc-950/40'}`}>
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          onClick={onToggle}
          title={enabled ? 'Désactiver' : 'Activer'}
          className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${
            enabled ? 'bg-[#E85D42] border-[#E85D42]' : 'border-zinc-700'
          }`}
        >
          {enabled && <span className="w-1.5 h-1.5 bg-white" />}
        </button>
        <span className={`text-[10px] font-black uppercase tracking-widers flex-1 ${enabled ? 'text-zinc-200' : 'text-zinc-600'}`}>
          {label}
        </span>
        <button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)} title="Monter dans la pile" className="text-zinc-500 hover:text-zinc-200 disabled:opacity-25">
          <ChevronUp size={12} />
        </button>
        <button type="button" disabled={!canMoveDown} onClick={() => onMove(1)} title="Descendre dans la pile" className="text-zinc-500 hover:text-zinc-200 disabled:opacity-25">
          <ChevronDown size={12} />
        </button>
        <button type="button" onClick={onRemove} title="Retirer" className="text-zinc-500 hover:text-rose-400">
          <Trash2 size={12} />
        </button>
      </div>
      <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>{children}</div>
    </div>
  );
}

export interface FiltersPanelProps {
  layer: SocialLayer | null;
  onPatch: (patch: Partial<SocialLayer>) => void;
}

export function FiltersPanel({ layer, onPatch }: FiltersPanelProps) {
  if (!layer) {
    return (
      <p className="text-[10px] text-zinc-500 italic leading-relaxed py-4 text-center">
        Sélectionnez un calque pour lui appliquer des filtres et des effets.
      </p>
    );
  }

  const filters = layer.filters ?? [];
  const effects = layer.effects ?? [];
  const availableEffects = EFFECTS_BY_KIND[layer.kind] ?? [];

  const setFilters = (next: FilterEntry[]) => onPatch({ filters: next });
  const setEffects = (next: EffectEntry[]) => onPatch({ effects: next });

  return (
    <div>
      <Section
        title="Filtres photographiques"
        action={
          <GhostButton
            onClick={() => setFilters(filters.map(f => ({ ...f, enabled: true })))}
            title="Réactiver tous les filtres"
          >
            <RotateCcw size={11} />
          </GhostButton>
        }
      >
        {filters.length === 0 && (
          <p className="text-[10px] text-zinc-500 italic mb-2">
            Aucun filtre. Ajoutez-en un ci-dessous — l’ordre s’applique au rendu.
          </p>
        )}

        {filters.map((filter, index) => {
          const def = FILTER_DEF_BY_KIND[filter.kind];
          if (!def) return null;
          const changed = filter.value !== def.neutral;
          return (
            <StackRow
              key={filter.id}
              label={`${def.label}${changed ? '' : ' (neutre)'}`}
              enabled={filter.enabled}
              onToggle={() => setFilters(filters.map((f, i) => (i === index ? { ...f, enabled: !f.enabled } : f)))}
              onMove={(dir) => setFilters(move(filters, index, dir))}
              onRemove={() => setFilters(filters.filter((_, i) => i !== index))}
              canMoveUp={index > 0}
              canMoveDown={index < filters.length - 1}
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={filter.value}
                  onChange={(e) => setFilters(filters.map((f, i) => (i === index ? { ...f, value: Number(e.target.value) } : f)))}
                  className="flex-1 accent-[#E85D42]"
                />
                <input
                  type="number"
                  value={filter.value}
                  onChange={(e) => setFilters(filters.map((f, i) => (i === index ? { ...f, value: Number(e.target.value) } : f)))}
                  className="w-14 bg-zinc-900 border border-zinc-800 px-1 py-0.5 text-[10px] font-mono text-zinc-100 focus:outline-none focus:border-[#E85D42]"
                />
                <span className="text-[9px] font-mono text-zinc-500 w-4">{def.unit}</span>
              </div>
              {changed && (
                <div className="mt-1.5">
                  <GhostButton onClick={() => setFilters(filters.map((f, i) => (i === index ? { ...f, value: def.neutral } : f)))}>
                    <X size={10} /> Réinitialiser
                  </GhostButton>
                </div>
              )}
            </StackRow>
          );
        })}

        <div className="flex flex-wrap gap-1 mt-2">
          {(Object.keys(FILTER_DEF_BY_KIND) as FilterKind[]).map(kind => (
            <GhostButton
              key={kind}
              onClick={() => setFilters([...filters, makeFilterEntry(kind, uid('f'))])}
              title={`Ajouter ${FILTER_DEF_BY_KIND[kind].label}`}
            >
              <Plus size={10} /> {FILTER_DEF_BY_KIND[kind].label}
            </GhostButton>
          ))}
        </div>
      </Section>
      <Section title="Effets et étalonnage">
        {effects.length === 0 && (
          <p className="text-[10px] text-zinc-500 italic mb-2">
            Aucun effet. La teinte et le duotone donnent l’air éditorial de la marque.
          </p>
        )}

        {effects.map((effect, index) => {
          const def = EFFECT_DEF_BY_KIND[effect.kind];
          if (!def) return null;
          return (
            <StackRow
              key={effect.id}
              label={def.label}
              enabled={effect.enabled}
              onToggle={() => setEffects(effects.map((e, i) => (i === index ? { ...e, enabled: !e.enabled } : e)))}
              onMove={(dir) => setEffects(move(effects, index, dir))}
              onRemove={() => setEffects(effects.filter((_, i) => i !== index))}
              canMoveUp={index > 0}
              canMoveDown={index < effects.length - 1}
            >
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(effect.value * 100)}
                  onChange={(e) => setEffects(effects.map((x, i) => (i === index ? { ...x, value: Number(e.target.value) / 100 } : x)))}
                  className="flex-1 accent-[#E85D42]"
                />
                <span className="text-[9px] font-mono text-zinc-500 w-8 text-right">
                  {Math.round(effect.value * 100)}%
                </span>
              </div>

              {def.colors !== 'none' && (
                <ColorField
                  label={effect.kind === 'duotone' ? 'Ombres' : 'Couleur'}
                  value={effect.color ?? '#E85D42'}
                  onCommit={(v) => setEffects(effects.map((x, i) => (i === index ? { ...x, color: v } : x)))}
                />
              )}
              {def.colors === 'twoColors' && (
                <div className="mt-2">
                  <ColorField
                    label="Lumières"
                    value={effect.color2 ?? '#F6D5C4'}
                    onCommit={(v) => setEffects(effects.map((x, i) => (i === index ? { ...x, color2: v } : x)))}
                  />
                </div>
              )}
              {def.auxLabel !== undefined && (
                <label className="block mt-2">
                  <span className={PANEL_LABEL}>{def.auxLabel}</span>
                  <input
                    type="number"
                    min={def.auxMin}
                    max={def.auxMax}
                    value={effect.aux ?? def.auxNeutral ?? 0}
                    onChange={(e) => setEffects(effects.map((x, i) => (i === index ? { ...x, aux: Number(e.target.value) } : x)))}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs font-mono text-zinc-100 focus:outline-none focus:border-[#E85D42]"
                  />
                </label>
              )}
            </StackRow>
          );
        })}

        <div className="flex flex-wrap gap-1 mt-2">
          {availableEffects.map(kind => (
            <GhostButton
              key={kind}
              onClick={() => setEffects([...effects, makeEffectEntry(kind, uid('e'))])}
              title={`Ajouter ${EFFECT_DEF_BY_KIND[kind].label}`}
            >
              <Plus size={10} /> {EFFECT_DEF_BY_KIND[kind].label}
            </GhostButton>
          ))}
        </div>
      </Section>
    </div>
  );
}