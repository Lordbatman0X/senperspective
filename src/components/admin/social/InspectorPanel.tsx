/**
 * Contextual properties for the selected layer.
 *
 * Every control writes through `onPatch`, which the Studio records as one undo
 * step. Geometry is in CARD pixels, with the percentage shown as a hint, because
 * card pixels are what the export actually uses.
 *
 * Editing the text of a BOUND layer clears its binding: once an editor types,
 * their words must win over the live article field, permanently.
 */

import React, { useRef } from 'react';
import { Link2, Link2Off, Upload } from 'lucide-react';
import type {
  ImageFit,
  LogoTone,
  SocialFont,
  SocialLayer,
  TextBinding,
  TextLayer,
} from '../../../types/social';
import { SOCIAL_FONTS } from '../../../types/social';
import {
  ColorField,
  GhostButton,
  INPUT_CLASS,
  NumberField,
  OpacityField,
  PANEL_LABEL,
  Section,
  SegmentedControl,
  SelectField,
  TextField,
  Toggle,
} from './StudioPrimitives';

const FONT_OPTIONS = SOCIAL_FONTS.map(f => ({ value: f, label: f }));
const WEIGHTS = [400, 500, 600, 700, 800, 900];
const FITS: Array<{ value: ImageFit; label: string }> = [
  { value: 'cover', label: 'Remplir' },
  { value: 'contain', label: 'Entier' },
  { value: 'fill', label: 'Ã‰tirer' },
  { value: 'original', label: 'Original' },
];

const BINDING_LABELS: Record<TextBinding, string> = {
  title: 'Titre de lâ€™article',
  excerpt: 'ChapÃ´ de lâ€™article',
  category: 'Rubrique',
  author: 'Auteur',
  date: 'Date de publication',
  readingTime: 'Temps de lecture',
  sectionHeading: 'Titre de section',
  sectionBody: 'Corps de section',
};

export interface AssetPickerProps {
  onPickLibrary: () => void;
  onPickDevice: (file: File) => void;
  currentSrc?: string;
  label?: string;
}

export function AssetPicker({ onPickLibrary, onPickDevice, currentSrc, label = 'Image' }: AssetPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <span className={PANEL_LABEL}>{label}</span>
      <div className="flex gap-1.5 flex-wrap">
        <GhostButton onClick={onPickLibrary} title="Ouvrir la mÃ©diathÃ¨que">MÃ©diathÃ¨que</GhostButton>
        <GhostButton onClick={() => inputRef.current?.click()} title="Importer depuis cet appareil">
          <Upload size={11} /> Appareil
        </GhostButton>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickDevice(file);
            // Reset so re-picking the same file still fires a change event.
            e.target.value = '';
          }}
        />
      </div>
      {currentSrc && (
        <p className="text-[9px] font-mono text-zinc-500 truncate mt-1.5" title={currentSrc}>
          {currentSrc.startsWith('data:') ? 'image importÃ©e (donnÃ©e locale)' : currentSrc}
        </p>
      )}
    </div>
  );
}

function TextInspector({
  layer,
  onPatch,
  onOpenLibrary,
  onDeviceFile,
}: {
  layer: TextLayer;
  onPatch: (patch: Partial<TextLayer>) => void;
  onOpenLibrary: () => void;
  onDeviceFile: (file: File) => void;
}) {
  return (
    <>
      <Section title="Contenu">
        {layer.binding && (
          <div className="flex items-center justify-between gap-2 mb-2 p-2 border border-[#E85D42]/40 bg-[#E85D42]/5">
            <span className="text-[10px] font-bold text-[#E85D42] uppercase tracking-wider min-w-0 truncate">
              <Link2 size={11} className="inline mr-1" />
              {BINDING_LABELS[layer.binding.field]}
            </span>
            <button
              type="button"
              onClick={() => onPatch({ binding: undefined })}
              title="DÃ©tacher de lâ€™article et garder ce texte tel quel"
              className="text-zinc-400 hover:text-white shrink-0"
            >
              <Link2Off size={13} />
            </button>
          </div>
        )}
        <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed">
          {layer.binding
            ? 'Ce bloc suit automatiquement lâ€™article. Modifier le texte ci-dessous le dÃ©tache dÃ©finitivement.'
            : 'Texte libre, non liÃ© Ã  lâ€™article.'}
        </p>
        <textarea
          value={layer.text}
          rows={4}
          // Typing clears the binding: once an editor writes here, their words
          // must win over the live article field from then on.
          onChange={(e) => onPatch({ text: e.target.value, binding: undefined })}
          className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42] resize-y leading-relaxed"
        />
      </Section>

      <Section title="Typographie">
        <SelectField
          label="Police"
          value={layer.fontFamily}
          options={FONT_OPTIONS}
          onChange={(v) => onPatch({ fontFamily: v as SocialFont })}
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <SelectField
            label="Graisse"
            value={String(layer.fontWeight)}
            options={WEIGHTS.map(w => ({ value: String(w), label: String(w) }))}
            onChange={(v) => onPatch({ fontWeight: Number(v) })}
          />
          <SelectField
            label="Style"
            value={layer.fontStyle}
            options={[
              { value: 'normal' as const, label: 'Normal' },
              { value: 'italic' as const, label: 'Italique' },
            ]}
            onChange={(v) => onPatch({ fontStyle: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <NumberField label="Corps" suffix="px" min={4} value={layer.fontSize} onCommit={(v) => onPatch({ fontSize: Math.max(4, v) })} />
          <NumberField label="Interligne" suffix="Ã—" step={0.05} min={0.5} value={layer.lineHeight} onCommit={(v) => onPatch({ lineHeight: Math.max(0.5, v) })} />
          <NumberField label="Interlettrage" suffix="px" step={0.5} value={layer.letterSpacing} onCommit={(v) => onPatch({ letterSpacing: v })} />
          <ColorField label="Couleur" value={layer.color} onCommit={(v) => onPatch({ color: v })} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <SelectField
            label="Alignement"
            value={layer.align}
            options={[
              { value: 'left' as const, label: 'Gauche' },
              { value: 'center' as const, label: 'Centre' },
              { value: 'right' as const, label: 'Droite' },
            ]}
            onChange={(v) => onPatch({ align: v })}
          />
          <SelectField
            label="Position verticale"
            value={layer.valign}
            options={[
              { value: 'top' as const, label: 'En haut' },
              { value: 'center' as const, label: 'CentrÃ©' },
              { value: 'bottom' as const, label: 'En bas' },
            ]}
            onChange={(v) => onPatch({ valign: v })}
          />
        </div>

        <div className="mt-2">
          <Toggle
            label="Tout en capitales"
            checked={layer.transform === 'uppercase'}
            onChange={(v) => onPatch({ transform: v ? 'uppercase' : 'none' })}
          />
        </div>
      </Section>

      <Section title="Ajustement automatique">
        <Toggle
          label="RÃ©duire le corps pour tenir"
          checked={layer.autoFit.enabled}
          onChange={(v) => onPatch({ autoFit: { ...layer.autoFit, enabled: v } })}
        />
        <p className="text-[9px] text-zinc-500 mt-1 mb-3 leading-relaxed">
          Quand cette option est active, le bloc rÃ©duit sa taille jusquâ€™Ã  ce que le texte tienne
          dans le cadre. Sinon le texte peut dÃ©border.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Corps minimum"
            suffix="px"
            min={4}
            value={layer.autoFit.min}
            onCommit={(v) => onPatch({ autoFit: { ...layer.autoFit, min: Math.max(4, v) } })}
          />
          <NumberField
            label="Corps maximum"
            suffix="px"
            min={4}
            value={layer.autoFit.max}
            onCommit={(v) => onPatch({ autoFit: { ...layer.autoFit, max: Math.max(4, v) } })}
          />
        </div>
      </Section>

      <Section title="Texture du bloc">
        <AssetPicker
          label="Image optionnelle"
          onPickLibrary={onOpenLibrary}
          onPickDevice={onDeviceFile}
        />
        <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">
          Pour placer une image derriÃ¨re ce texte, ajoutez un calque image sous le bloc et
          appliquez-lui un effet Â« voile Â».
        </p>
      </Section>
    </>
  );
}
  export interface InspectorPanelProps {
  layer: SocialLayer | null;
  formatWidth: number;
  formatHeight: number;
  onPatch: (patch: Partial<SocialLayer>) => void;
  onRename: (name: string) => void;
  onOpenLibrary: () => void;
  onDeviceFile: (file: File) => void;
}

export function InspectorPanel({
  layer,
  formatWidth,
  formatHeight,
  onPatch,
  onRename,
  onOpenLibrary,
  onDeviceFile,
}: InspectorPanelProps) {
  if (!layer) {
    return (
      <p className="text-[10px] text-zinc-500 italic leading-relaxed py-4 text-center">
        Cliquez sur un Ã©lÃ©ment de la carte pour en modifier les propriÃ©tÃ©s.
      </p>
    );
  }

  const pct = (v: number, total: number) => `${Math.round((v / Math.max(1, total)) * 100)}%`;

  return (
    <div>
      <Section title="Calque">
        <TextField label="Nom" value={layer.name} onCommit={onRename} />
        <div className="mt-3">
          <OpacityField value={layer.opacity} onCommit={(v) => onPatch({ opacity: v })} />
        </div>
      </Section>

      <Section title="Position et dimensions">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="X"
            suffix={pct(layer.x, formatWidth)}
            value={layer.x}
            onCommit={(v) => onPatch({ x: v })}
          />
          <NumberField
            label="Y"
            suffix={pct(layer.y, formatHeight)}
            value={layer.y}
            onCommit={(v) => onPatch({ y: v })}
          />
          <NumberField
            label="Largeur"
            suffix={pct(layer.w, formatWidth)}
            value={layer.w}
            min={1}
            onCommit={(v) => onPatch({ w: Math.max(1, v) })}
          />
          <NumberField
            label="Hauteur"
            suffix={pct(layer.h, formatHeight)}
            value={layer.h}
            min={1}
            onCommit={(v) => onPatch({ h: Math.max(1, v) })}
          />
        </div>
        <div className="mt-2">
          <NumberField
            label="Rotation"
            suffix="Â°"
            value={layer.rotation}
            step={0.5}
            onCommit={(v) => onPatch({ rotation: v })}
          />
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <GhostButton onClick={() => onPatch({ rotation: 0 })} disabled={layer.rotation === 0}>
            Remettre droit
          </GhostButton>
          <GhostButton
            onClick={() => onPatch({ x: (formatWidth - layer.w) / 2 })}
            title="Centrer horizontalement"
          >
            Centrer H
          </GhostButton>
          <GhostButton
            onClick={() => onPatch({ y: (formatHeight - layer.h) / 2 })}
            title="Centrer verticalement"
          >
            Centrer V
          </GhostButton>
        </div>
      </Section>
      {layer.kind === 'text' && (
        <TextInspector
          layer={layer}
          onPatch={(patch) => onPatch(patch as Partial<SocialLayer>)}
          onOpenLibrary={onOpenLibrary}
          onDeviceFile={onDeviceFile}
        />
      )}

      {(layer.kind === 'background' || layer.kind === 'image') && (
        <Section title={layer.kind === 'background' ? 'Photo de fond' : 'Image'}>
          <AssetPicker
            label="Fichier"
            currentSrc={layer.src || undefined}
            onPickLibrary={onOpenLibrary}
            onPickDevice={onDeviceFile}
          />
          <div className="grid grid-cols-2 gap-2 mt-3">
            {/* Only a background has a fallback colour; a plain image layer is
                drawn as a dashed placeholder when its file fails to load. */}
            {layer.kind === 'background' && (
              <ColorField
                label="Couleur de repli"
                value={layer.fill}
                onCommit={(v) => onPatch({ fill: v } as Partial<SocialLayer>)}
              />
            )}
            <SelectField label="Ajustement" value={layer.fit} options={FITS} onChange={(v) => onPatch({ fit: v } as Partial<SocialLayer>)} />
          </div>
          {layer.fit === 'cover' && (
            <div className="mt-3 p-2 border border-zinc-800 bg-zinc-950">
              <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed">
                Point focal : positionne ce qui doit rester visible quand lâ€™image est rognÃ©e.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Focal X"
                  step={0.05} min={0} max={1}
                  value={layer.focalX}
                  onCommit={(v) => onPatch({ focalX: Math.min(1, Math.max(0, v)) } as Partial<SocialLayer>)}
                />
                <NumberField
                  label="Focal Y"
                  step={0.05} min={0} max={1}
                  value={layer.focalY}
                  onCommit={(v) => onPatch({ focalY: Math.min(1, Math.max(0, v)) } as Partial<SocialLayer>)}
                />
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <GhostButton onClick={() => onPatch({ focalX: 0.5, focalY: 0.5 } as Partial<SocialLayer>)}>Recentrer</GhostButton>
                <GhostButton onClick={() => onPatch({ focalX: 0.5, focalY: 0.25 } as Partial<SocialLayer>)}>Haut</GhostButton>
                <GhostButton onClick={() => onPatch({ focalX: 0.5, focalY: 0.75 } as Partial<SocialLayer>)}>Bas</GhostButton>
              </div>
            </div>
          )}
          {layer.kind === 'image' && (
            <div className="mt-3">
              <NumberField
                label="Angles arrondis"
                suffix="px"
                min={0}
                value={layer.radius}
                onCommit={(v) => onPatch({ radius: Math.max(0, v) } as Partial<SocialLayer>)}
              />
            </div>
          )}
        </Section>
      )}
      {layer.kind === 'logo' && (
        <Section title="Logo">
          <AssetPicker
            label="Fichier du logo"
            currentSrc={layer.src || undefined}
            onPickLibrary={onOpenLibrary}
            onPickDevice={onDeviceFile}
          />

          <div className="mt-3">
            <SelectField
              label="Variante de couleur"
              value={layer.tone}
              options={[
                { value: 'auto' as LogoTone, label: 'Automatique (selon le fond)' },
                { value: 'light' as LogoTone, label: 'Version claire' },
                { value: 'dark' as LogoTone, label: 'Version sombre' },
                { value: 'custom' as LogoTone, label: 'Fichier personnalisÃ©' },
              ]}
              onChange={(v) => onPatch({ tone: v } as Partial<SocialLayer>)}
            />
            <p className="text-[9px] text-zinc-500 mt-1.5 leading-relaxed">
              En mode automatique, le logo choisit la variante qui contraste le mieux avec la zone
              oÃ¹ il est posÃ©. Les deux variantes se rÃ¨glent juste en dessous.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <NumberField
              label="Marge intÃ©rieure"
              suffix="px"
              min={0}
              value={layer.padding}
              onCommit={(v) => onPatch({ padding: Math.max(0, v) } as Partial<SocialLayer>)}
            />
            <div className="flex items-end pb-1.5">
              <Toggle
                label="Conserver le ratio"
                checked={layer.lockAspect}
                onChange={(v) => onPatch({ lockAspect: v } as Partial<SocialLayer>)}
              />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800">
            <span className={PANEL_LABEL}>Variantes pour le mode auto</span>
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-[9px] font-mono text-zinc-500">Version claire</span>
                <input
                  type="text"
                  value={layer.toneSrc?.light ?? ''}
                  placeholder="URL du logo clair"
                  onChange={(e) => onPatch({ toneSrc: { ...layer.toneSrc, light: e.target.value } } as Partial<SocialLayer>)}
                  className={`${INPUT_CLASS} mt-1`}
                />
              </div>
              <div>
                <span className="text-[9px] font-mono text-zinc-500">Version sombre</span>
                <input
                  type="text"
                  value={layer.toneSrc?.dark ?? ''}
                  placeholder="URL du logo sombre"
                  onChange={(e) => onPatch({ toneSrc: { ...layer.toneSrc, dark: e.target.value } } as Partial<SocialLayer>)}
                  className={`${INPUT_CLASS} mt-1`}
                />
              </div>
            </div>
          </div>
        </Section>
      )}

      {layer.kind === 'shape' && (
        <Section title="Forme">
          <SegmentedControl
            value={layer.shape}
            onChange={(v) => onPatch({ shape: v } as Partial<SocialLayer>)}
            options={[
              { value: 'rect' as const, label: 'Rectangle' },
              { value: 'pill' as const, label: 'Pilule' },
              { value: 'line' as const, label: 'Ligne' },
            ]}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ColorField label="Remplissage" value={layer.fill} onCommit={(v) => onPatch({ fill: v } as Partial<SocialLayer>)} />
            {layer.shape === 'rect' && (
              <NumberField
                label="Angles"
                suffix="px"
                min={0}
                value={layer.radius}
                onCommit={(v) => onPatch({ radius: Math.max(0, v) } as Partial<SocialLayer>)}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <ColorField
              label="Contour"
              value={layer.strokeColor ?? '#000000'}
              onCommit={(v) => onPatch({ strokeColor: v } as Partial<SocialLayer>)}
            />
            <NumberField
              label="Ã‰paisseur"
              suffix="px"
              min={0}
              value={layer.strokeWidth ?? 0}
              onCommit={(v) => onPatch({ strokeWidth: Math.max(0, v) } as Partial<SocialLayer>)}
            />
          </div>
        </Section>
      )}
    </div>
  );
}
