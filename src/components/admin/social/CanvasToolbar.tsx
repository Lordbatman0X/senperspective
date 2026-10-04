/**
 * The canvas toolbar: Insert on the left, Align on the right.
 *
 * This is the Canva/Figma pattern — the two things you do most (add an element,
 * line it up) live on a bar directly above the canvas, not buried in a side
 * panel. The side panel is then only for the properties of what is already
 * selected.
 *
 * `Insert` is deliberately dumb: each button creates a sensible default element
 * and selects it, so the editor can immediately drag it. Nothing here requires
 * understanding the layer model first.
 */

import React from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  Image as ImageIcon,
  Square,
  Type as TypeIcon,
  Upload,
  BadgeCheck,
} from 'lucide-react';

import type { AlignMode } from '../../../lib/social/document';

export type { AlignMode };

function ToolbarButton({
  icon,
  label,
  onClick,
  hint,
  disabled,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hint?: string;
  disabled?: boolean;
  tone?: 'default' | 'accent';
}) {
  return (
    <button
      type="button"
      title={hint}
      disabled={disabled}
      onClick={onClick}
      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1 transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
        tone === 'accent'
          ? 'border-[#E85D42] text-[#E85D42] hover:bg-[#E85D42] hover:text-white'
          : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export interface InsertBarProps {
  onAddText: () => void;
  onAddShape: () => void;
  onAddImage: () => void;
  onAddLogo: () => void;
  onUploadLogo: (file: File) => void;
  onOpenLibraryForLogo: () => void;
  hasLogo: boolean;
  disabled?: boolean;
}

export function InsertBar({
  onAddText,
  onAddShape,
  onAddImage,
  onAddLogo,
  onUploadLogo,
  onOpenLibraryForLogo,
  hasLogo,
  disabled,
}: InsertBarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-1">Ajouter</span>

      <ToolbarButton icon={<TypeIcon size={13} />} label="Texte" onClick={onAddText} disabled={disabled}
        hint="Ajoute un bloc de texte que vous pouvez ensuite déplacer" />
      <ToolbarButton icon={<Square size={13} />} label="Forme" onClick={onAddShape} disabled={disabled}
        hint="Ajoute un rectangle, une pilule ou une ligne" />
      <ToolbarButton icon={<ImageIcon size={13} />} label="Image" onClick={onAddImage} disabled={disabled}
        hint="Ajoute une image que vous pourrez remplir depuis le panneau" />

      {/* Logo is a first-class citizen: it is required on every card, and
          uploading it was the single most confusing part of the first build. */}
      <span className="w-px h-5 bg-zinc-800 mx-1" />
      <ToolbarButton
        icon={<BadgeCheck size={13} />}
        label={hasLogo ? 'Ajouter un logo' : 'Logo'}
        onClick={onAddLogo}
        disabled={disabled}
        tone={hasLogo ? 'default' : 'accent'}
        hint="Ajoute un calque logo à la carte"
      />
      <label
        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors inline-flex items-center gap-1 cursor-pointer ${
          disabled
            ? 'border-zinc-800 text-zinc-600 opacity-50 cursor-not-allowed'
            : 'border-[#E85D42] text-[#E85D42] hover:bg-[#E85D42] hover:text-white'
        }`}
        title="Importer le fichier du logo depuis cet appareil"
      >
        <Upload size={12} />
        Importer le logo
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadLogo(file);
            // Reset so picking the same file again still fires a change.
            e.target.value = '';
          }}
        />
      </label>

      <ToolbarButton
        icon={<ImageIcon size={13} />}
        label="Médiathèque"
        onClick={onOpenLibraryForLogo}
        disabled={disabled}
        hint="Choisir le logo dans la médiathèque"
      />
    </div>
  );
}

export interface AlignBarProps {
  onAlign: (mode: AlignMode) => void;
  selectedName?: string;
}

export function AlignBar({ onAlign, selectedName }: AlignBarProps) {
  if (!selectedName) {
    return (
      <span className="text-[10px] text-zinc-600 italic">
        Cliquez sur un élément de la carte pour l’aligner.
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-1">
        Aligner « {selectedName} »
      </span>
      <ToolbarButton icon={<AlignStartVertical size={13} />} label="Gauche" onClick={() => onAlign('left')}
        hint="Coller au bord gauche de la carte" />
      <ToolbarButton icon={<AlignCenterHorizontal size={13} />} label="Centre H" onClick={() => onAlign('centerH')}
        hint="Centrer horizontalement" />
      <ToolbarButton icon={<AlignEndVertical size={13} />} label="Droite" onClick={() => onAlign('right')}
        hint="Coller au bord droit de la carte" />
      <ToolbarButton icon={<AlignHorizontalDistributeCenter size={13} />} label="Marge" onClick={() => onAlign('gutterH')}
        hint="Aligner sur la marge intérieure du modèle" />

      <span className="w-px h-5 bg-zinc-800 mx-1" />

      <ToolbarButton icon={<AlignStartHorizontal size={13} />} label="Haut" onClick={() => onAlign('top')}
        hint="Coller en haut de la carte" />
      <ToolbarButton icon={<AlignCenterVertical size={13} />} label="Centre V" onClick={() => onAlign('centerV')}
        hint="Centrer verticalement" />
      <ToolbarButton icon={<AlignEndHorizontal size={13} />} label="Bas" onClick={() => onAlign('bottom')}
        hint="Coller en bas de la carte" />
    </div>
  );
}