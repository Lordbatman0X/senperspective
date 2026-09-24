import React from 'react';
import { CheckCircle2, Key, Loader2, Play, XCircle, Zap } from 'lucide-react';
import { ABDEL_KEY_PROVIDERS } from '../../lib/abdelRouter';
import type { AbdelApiSlot, AbdelKeyProvider, AbdelSlotRole } from '../../lib/abdelRouter';

const ROLE_LABEL: Record<AbdelSlotRole, { fr: string; en: string }> = {
  primary: { fr: 'Moteur principal', en: 'Primary engine' },
  secondary: { fr: 'Second moteur', en: 'Secondary engine' },
  tertiary: { fr: 'Troisième moteur', en: 'Tertiary engine' },
  fallback: { fr: 'Secours final', en: 'Final fallback' },
};

const ROLE_ACCENT: Record<AbdelSlotRole, string> = {
  primary: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  secondary: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
  tertiary: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  fallback: 'text-zinc-300 border-zinc-600/60 bg-zinc-700/20',
};

export interface AbdelApiSlotsGridProps {
  slots: AbdelApiSlot[];
  isFr: boolean;
  testingSlot: string | null;
  testResult: Record<string, { ok: boolean; message: string }>;
  onUpdate: (id: string, patch: Partial<AbdelApiSlot>) => void;
  onTest: (slot: AbdelApiSlot) => void;
}

/**
 * The four API blocks. Purely presentational: all state lives in
 * `AbdelApiSlotsTab` so a test in flight survives a re-render.
 */
export function AbdelApiSlotsGrid({
  slots,
  isFr,
  testingSlot,
  testResult,
  onUpdate,
  onTest,
}: AbdelApiSlotsGridProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {slots.map(slot => {
        const res = testResult[slot.id];
        const busy = testingSlot === slot.id;
        return (
          <div
            key={slot.id}
            className={`rounded-xl border p-4 space-y-3 transition-colors ${
              slot.enabled ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-950/40 border-zinc-900 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-md bg-[#E85D42]/15 border border-[#E85D42]/30 text-[#E85D42] text-[11px] font-black flex items-center justify-center shrink-0">
                  {slot.priority}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${ROLE_ACCENT[slot.role]}`}
                >
                  {ROLE_LABEL[slot.role][isFr ? 'fr' : 'en']}
                </span>
              </div>
              <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={e => onUpdate(slot.id, { enabled: e.target.checked })}
                  className="accent-[#E85D42]"
                />
                {slot.enabled ? (isFr ? 'Actif' : 'On') : isFr ? 'Inactif' : 'Off'}
              </label>
            </div>

            <input
              type="text"
              value={slot.label}
              onChange={e => onUpdate(slot.id, { label: e.target.value })}
              placeholder={isFr ? 'Nom du moteur (ex: GPT-4o principal)' : 'Engine name (e.g. GPT-4o primary)'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42]"
            />

            <input
              type="text"
              value={slot.endpoint}
              onChange={e => onUpdate(slot.id, { endpoint: e.target.value })}
              placeholder="https://backend.exemple.com/api/chat"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] font-mono text-zinc-100 focus:outline-none focus:border-[#E85D42]"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={slot.model}
                onChange={e => onUpdate(slot.id, { model: e.target.value })}
                placeholder={isFr ? 'Modèle (ex: gpt-4o)' : 'Model (e.g. gpt-4o)'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] font-mono text-zinc-100 focus:outline-none focus:border-[#E85D42]"
              />
              <select
                value={slot.keyProvider}
                onChange={e => onUpdate(slot.id, { keyProvider: e.target.value as AbdelKeyProvider })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] font-mono text-zinc-100 focus:outline-none focus:border-[#E85D42]"
              >
                {ABDEL_KEY_PROVIDERS.map(p => (
                  <option key={p} value={p}>
                    {p === 'none' ? (isFr ? 'clé : aucune' : 'key: none') : `clé: ${p}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 shrink-0 flex items-center gap-1">
                <Zap size={11} className="text-[#E85D42]" />
                {isFr ? 'Créativité' : 'Temperature'}
              </label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={slot.temperature}
                onChange={e => onUpdate(slot.id, { temperature: Number(e.target.value) })}
                className="flex-1 accent-[#E85D42]"
              />
              <span className="text-[11px] font-mono text-zinc-300 w-8 text-right tabular-nums">
                {slot.temperature.toFixed(1)}
              </span>
            </div>

            <textarea
              rows={2}
              value={slot.systemPrompt}
              onChange={e => onUpdate(slot.id, { systemPrompt: e.target.value })}
              placeholder={isFr ? 'Instructions de personnalité (facultatif)…' : 'Persona instructions (optional)…'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-100 focus:outline-none focus:border-[#E85D42] resize-y"
            />

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onTest(slot)}
                disabled={busy || !slot.endpoint.trim()}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                {isFr ? 'Tester' : 'Test'}
              </button>
              {slot.keyProvider !== 'none' && (
                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                  <Key size={10} />
                  {slot.keyProvider}
                </span>
              )}
            </div>

            {res && (
              <div
                className={`flex items-start gap-2 text-[11px] rounded-lg px-3 py-2 border ${
                  res.ok
                    ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-red-300 bg-red-500/10 border-red-500/30'
                }`}
              >
                {res.ok ? (
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={13} className="mt-0.5 shrink-0" />
                )}
                <span className="break-words min-w-0">{res.message}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
