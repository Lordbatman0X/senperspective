export function SimpleEditor({
  card,
  content,
  onPatchText,
  onUploadLogo,
  onOpenLibrary,
  onAlignLayer,
}: SimpleEditorProps) {
  const logo = card.layers.find(l => l.kind === 'logo');
  const headline = textByName(card, 'Titre') ?? textByName(card, 'Citation');
  const excerpt = textByName(card, 'Chapô');
  const body1 = textByName(card, 'Paragraphe 1');
  const body2 = textByName(card, 'Paragraphe 2');
  const byline = textByName(card, 'Signature');
  const eyebrow = textByName(card, 'Rubrique');

  const hasLogoFile = Boolean(logo?.src);
  const alignTarget = headline?.id ?? logo?.id;

  return (
    <div>
      {/* 1. Logo first: a card without it is not publishable. */}
      <Row
        icon={<ImageIcon size={13} />}
        label="Logo"
        hint="Le logo en haut de la carte. Un fichier clair sur fond sombre, ou l’inverse."
      >
        <div
          className={`flex items-center justify-center border mb-2 px-2 py-2 ${
            hasLogoFile ? 'border-zinc-700 bg-zinc-950' : 'border-dashed border-amber-600 bg-amber-950/20'
          }`}
        >
          {hasLogoFile ? (
            <span className="text-[10px] font-mono text-emerald-400">Fichier chargé ✓</span>
          ) : (
            <span className="text-[10px] font-mono text-amber-300">Aucun logo — importez-en un</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <label className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#E85D42] text-[#E85D42] hover:bg-[#E85D42] hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer">
            <Upload size={11} /> Importer
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadLogo(f);
                // Reset so re-picking the same file still fires a change.
                e.target.value = '';
              }}
            />
          </label>
          <GhostButton onClick={onOpenLibrary} title="Choisir dans la médiathèque">
            Médiathèque
          </GhostButton>
        </div>
        {logo && (
          <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">
            Taille : {Math.round(logo.w)}×{Math.round(logo.h)} px. Ajustez-la en tirant sur la
            carte ou dans le mode avancé.
          </p>
        )}
      </Row>

      {/* 2. Text, in the order it is read on the card. */}
      {eyebrow && (
        <Row icon={<TypeIcon size={13} />} label="Rubrique">
          <TextField label="Rubrique" value={eyebrow.text} onCommit={(v) => onPatchText(eyebrow.id, v)} />
        </Row>
      )}

      {headline && (
        <Row icon={<TypeIcon size={13} />} label="Titre">
          <TextBlock value={headline.text} onChange={(v) => onPatchText(headline.id, v)} rows={3} />
        </Row>
      )}

      {excerpt && (
        <Row icon={<TypeIcon size={13} />} label="Chapô">
          <TextBlock value={excerpt.text} onChange={(v) => onPatchText(excerpt.id, v)} />
        </Row>
      )}

      {body1 && (
        <Row icon={<TypeIcon size={13} />} label="Texte 1">
          <TextBlock value={body1.text} onChange={(v) => onPatchText(body1.id, v)} />
        </Row>
      )}

      {body2 && (
        <Row icon={<TypeIcon size={13} />} label="Texte 2">
          <TextBlock value={body2.text} onChange={(v) => onPatchText(body2.id, v)} />
        </Row>
      )}

      {byline && (
        <Row icon={<TypeIcon size={13} />} label="Signature">
          <TextField label="Signature" value={byline.text} onCommit={(v) => onPatchText(byline.id, v)} />
        </Row>
      )}

      {/* 3. Alignment — the only positioning control most cards ever need. */}
      {alignTarget && (
        <Row
          icon={<AlignCenterVertical size={13} />}
          label="Position"
          hint="Applique au titre (ou au logo sur la carte de couverture)."
        >
          <div className="flex gap-1.5">
            <GhostButton onClick={() => onAlignLayer(alignTarget, 'left')}>
              <AlignStartVertical size={11} /> Gauche
            </GhostButton>
            <GhostButton onClick={() => onAlignLayer(alignTarget, 'centerH')}>
              <AlignCenterHorizontal size={11} /> Centre
            </GhostButton>
            <GhostButton onClick={() => onAlignLayer(alignTarget, 'centerV')}>
              <AlignCenterVertical size={11} /> Milieu
            </GhostButton>
          </div>
        </Row>
      )}

      {/* 4. Date, read-only, because it comes from the article. */}
      {content.dateLabel && (
        <Row icon={<Calendar size={13} />} label="Date">
          <p className="text-xs font-semibold text-zinc-300">{content.dateLabel}</p>
          <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">
            Reprise automatiquement depuis l’article.
          </p>
        </Row>
      )}
    </div>
  );
}
/**
 * The simple editing surface.
 *
 * This exists because the layered editor is powerful but overwhelming: the
 * first version exposed four tabbed panels, a layer list, a filter stack and an
 * inspector before an editor could change a headline. Most cards never need
 * more than "put the logo on, fix the text, export".
 *
 * So the Studio now leads with this: a short list of named fields matching what
 * is actually on the card, in reading order. Everything it edits is an ordinary
 * layer underneath — nothing is special-cased — and the full layer editor stays
 * one toggle away for the rare card that needs it.
 */

import React from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignStartVertical,
  Calendar,
  Image as ImageIcon,
  Type as TypeIcon,
  Upload,
} from 'lucide-react';
import type { SocialCard, TextLayer } from '../../../types/social';
import type { SocialFormat } from '../../../lib/social/networks';
import { GhostButton, TextField } from './StudioPrimitives';
import type { ResolvedContent } from '../../../lib/social/content';

export interface SimpleEditorProps {
  card: SocialCard;
  format: SocialFormat;
  content: ResolvedContent;
  onPatchText: (layerId: string, text: string) => void;
  onUploadLogo: (file: File) => void;
  onOpenLibrary: () => void;
  onAlign: (mode: 'left' | 'centerH' | 'centerV') => void;
  /** Aligns this layer id; the Studio applies it and reselects. */
  onAlignLayer: (layerId: string, mode: 'left' | 'centerH' | 'centerV') => void;
}

/** Find a text layer by its template name. */
function textByName(card: SocialCard, name: string): TextLayer | undefined {
  return card.layers.find((l): l is TextLayer => l.kind === 'text' && l.name === name);
}

function Row({
  icon,
  label,
  hint,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-800 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-200">{label}</span>
      </div>
      {hint && <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

/** A multi-line field bound to a text layer. */
function TextBlock({
  value,
  onChange,
  rows = 4,
}: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42] resize-y leading-relaxed"
    />
  );
}