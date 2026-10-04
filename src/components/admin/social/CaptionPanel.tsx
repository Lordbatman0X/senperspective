/**
 * The FR / EN caption editor.
 *
 * Captions are generated once, then belong to the editor. Two rules matter:
 *
 *  1. Generation is EXPLICIT. Nothing re-runs on open or on every keystroke, and
 *     regenerating over manual work is confirmed first.
 *  2. A missing translation is shown as a warning badge, never silently filled
 *     from the other language. A French caption under an English headline is a
 *     translation bug that ships; hiding it is worse than showing it.
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Languages, RotateCcw, Sparkles } from 'lucide-react';
import type { CaptionLanguage, SocialNetwork } from '../../../types/social';
import { generateCaption } from '../../../lib/social/captions';
import { getNetwork } from '../../../lib/social/networks';
import type { SocialSource } from '../../../lib/social/content';
import { GhostButton, PANEL_LABEL } from './StudioPrimitives';

export interface CaptionPanelProps {
  source: SocialSource;
  network: SocialNetwork;
  captions: { fr: string; en: string };
  /** Slot the captions are written to: the network, or `universal`. */
  slotLabel: string;
  generatedAt?: string;
  onChange: (caption: { fr: string; en: string }) => void;
  onRegenerate: (caption: { fr: string; en: string }) => void;
  /** Called when manual work would be overwritten, so the studio can confirm. */
  onConfirmRegenerate: () => void;
}

export function CaptionPanel({
  source,
  network,
  captions,
  slotLabel,
  generatedAt,
  onChange,
  onRegenerate,
  onConfirmRegenerate,
}: CaptionPanelProps) {
  const [lang, setLang] = useState<CaptionLanguage>('fr');
  const spec = getNetwork(network);
  const value = captions[lang] ?? '';
  const limit = spec.captionLimit;

  // Computed during render purely to drive the "missing translation" badge.
  const fallbackWarning = useMemo(
    () => generateCaption(source, network, lang).usedFallback,
    [source, network, lang],
  );

  const otherLang: CaptionLanguage = lang === 'fr' ? 'en' : 'fr';
  const overWarn = value.length > spec.captionWarnAt;
  const overHard = value.length > limit;

  const counterColor = overHard
    ? 'text-rose-400'
    : overWarn
      ? 'text-amber-400'
      : value.length > limit * 0.85
        ? 'text-zinc-300'
        : 'text-zinc-500';

  const hasManualWork = Boolean(captions.fr || captions.en);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['fr', 'en'] as CaptionLanguage[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                lang === l
                  ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {l === 'fr' ? 'Français' : 'English'}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-mono text-zinc-600 text-right">{slotLabel}</span>
      </div>

      {fallbackWarning && (
        <div className="flex items-start gap-2 p-2 border border-amber-700/60 bg-amber-950/30">
          <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-200 leading-relaxed">
            L’article n’a pas de version {lang === 'fr' ? 'française' : 'anglaise'}. Ce texte a été
            produit à partir de l’autre langue — relisez-le avant publication.
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={PANEL_LABEL.replace('mb-1.5', '')}>
            Légende {lang.toUpperCase()}
          </span>
          <span className={`text-[10px] font-mono font-bold ${counterColor}`}>
            {value.length} / {limit}
          </span>
        </div>
        <textarea
          value={value}
          rows={9}
          onChange={(e) => onChange({ ...captions, [lang]: e.target.value })}
          className={`w-full bg-zinc-950 border px-2.5 py-2 text-xs text-zinc-100 focus:outline-none resize-y leading-relaxed ${
            overHard ? 'border-rose-700 focus:border-rose-500' : 'border-zinc-800 focus:border-[#E85D42]'
          }`}
        />
        {overHard && (
          <p className="text-[10px] text-rose-400 mt-1 leading-relaxed">
            {spec.label} tronquera cette légende à {limit} caractères. Raccourcissez-la pour éviter
            une coupure en pleine phrase.
          </p>
        )}
        {!overHard && overWarn && (
          <p className="text-[10px] text-amber-400 mt-1 leading-relaxed">
            Au-delà de {spec.captionWarnAt} caractères, la portée pratique est dépassée même si la
            plateforme l’accepte.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <GhostButton
          onClick={() => navigator.clipboard?.writeText(value)}
          disabled={!value}
          title="Copier cette légende dans le presse-papiers"
        >
          <Copy size={11} /> Copier {lang.toUpperCase()}
        </GhostButton>

        {hasManualWork && (
          <GhostButton
            onClick={onConfirmRegenerate}
            title="Régénérer les deux langues — remplace vos modifications"
          >
            <RotateCcw size={11} /> Régénérer
          </GhostButton>
        )}

        {/* Per-language regeneration replaces only that language. */}
        <GhostButton
          onClick={() => {
            const draft = generateCaption(source, network, lang);
            onRegenerate({ ...captions, [lang]: draft.text });
          }}
          title={`Reprendre le texte généré en ${lang === 'fr' ? 'français' : 'anglais'}`}
        >
          <Sparkles size={11} /> Texte {lang.toUpperCase()}
        </GhostButton>

        <GhostButton
          onClick={() => onChange({ ...captions, [lang]: captions[otherLang] })}
          disabled={!captions[otherLang] || captions[otherLang] === value}
          title={`Copier la version ${otherLang.toUpperCase()} dans la version ${lang.toUpperCase()}`}
        >
          <Languages size={11} /> Depuis {otherLang.toUpperCase()}
        </GhostButton>
      </div>

      <div className="flex items-start gap-1.5 text-[9px] text-zinc-600 leading-relaxed">
        <Check size={10} className="shrink-0 mt-0.5" />
        <span>
          {generatedAt
            ? `Dernière génération le ${new Date(generatedAt).toLocaleString('fr-FR')}. `
            : 'Aucune légende générée. '}
          Vos modifications sont conservées jusqu’à une régénération explicite.
        </span>
      </div>
    </div>
  );
}