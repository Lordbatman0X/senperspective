import React, { useEffect, useState } from 'react';
import {
  Cpu, Key, Save, Loader2, Play, Trash2, Eye, EyeOff,
  CheckCircle2, XCircle, AlertTriangle, Server, Sparkles, Info,
} from 'lucide-react';
import { useStore } from '../../store';
import {
  AI_PROVIDERS, AI_PROVIDER_IDS, supportsDirectBrowserCall, type AiProviderId,
} from '../../lib/aiProviders';
import {
  getClientApiKey, saveClientApiKey, revokeClientApiKey, clientTestProvider,
} from '../../lib/clientAiEngine';

/**
 * Admin → APIs & IA
 *
 * ONE place for every AI concern: provider keys, the engine Abdel should use,
 * per-provider model overrides, and a real connectivity test.
 *
 * WHY A NEW SECTION
 * -----------------
 * Keys were previously editable in three disconnected places (the Abdel tab had
 * a Gemini-only field, the diagnostics tab hardcoded all six, and the RSS tab had
 * another), and the Abdel section had no way to choose which AI answers readers.
 * Both are symptoms of the same thing: no single registry. This tab renders from
 * `AI_PROVIDERS`, so a provider added there shows up here automatically and can
 * never be selectable in the app while unmanageable here.
 */
export function AiProvidersTab() {
  const { language, siteSettings, updateSiteSettings } = useStore();
  const isFr = language === 'fr';

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<
    Record<string, { success: boolean; message: string; latencyMs?: number }>
  >({});

  const [preferred, setPreferred] = useState<string>(
    siteSettings?.abdelPreferredProvider || 'auto'
  );
  const [models, setModels] = useState<Record<string, string>>(
    siteSettings?.aiModelOverrides || {}
  );
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Which providers currently hold a key in this browser.
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const id of AI_PROVIDER_IDS) next[id] = !!getClientApiKey(id);
    setConfigured(next);
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const handleSaveKey = async (id: string) => {
    const value = (keys[id] || '').trim();
    if (!value) return;
    setBusy(id);
    await saveClientApiKey(id, value);
    setKeys((k) => ({ ...k, [id]: '' }));
    setConfigured((c) => ({ ...c, [id]: true }));
    setBusy(null);
    flash(
      isFr
        ? `Clé ${AI_PROVIDERS[id as AiProviderId].label} enregistrée.`
        : `${AI_PROVIDERS[id as AiProviderId].label} key saved.`
    );
  };

  const handleRevoke = (id: string) => {
    setBusy(id);
    revokeClientApiKey(id);
    setConfigured((c) => ({ ...c, [id]: false }));
    setResults((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
    setBusy(null);
    flash(isFr ? 'Clé supprimée de ce navigateur.' : 'Key removed from this browser.');
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    const res = await clientTestProvider(id);
    setResults((r) => ({ ...r, [id]: res }));
    setTesting(null);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      // Only these two keys are written. `updateSiteSettings` merges, but sending
      // nothing else guarantees the AI settings can never disturb articles,
      // categories or any other site configuration.
      await updateSiteSettings({
        abdelPreferredProvider: preferred,
        aiModelOverrides: models,
      } as any);
      flash(isFr ? 'Réglages IA enregistrés.' : 'AI settings saved.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const configuredCount = AI_PROVIDER_IDS.filter((id) => configured[id]).length;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[#E85D42]/10 p-2 text-[#E85D42]">
          <Cpu size={18} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            {isFr ? 'APIs & intelligences artificielles' : 'APIs & artificial intelligence'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {isFr
              ? 'Gérez les clés de chaque fournisseur, choisissez le moteur d’Abdel, et testez la connexion réelle.'
              : 'Manage every provider key, choose Abdel’s engine, and test the real connection.'}
          </p>
        </div>
      </header>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-[#E85D42]/30 bg-[#E85D42]/5 px-3 py-2 text-xs font-semibold text-[#E85D42]">
          <CheckCircle2 size={14} />
          {notice}
        </div>
      )}

      <AbdelEnginePicker
        isFr={isFr}
        preferred={preferred}
        setPreferred={setPreferred}
        configured={configured}
      />

      <button
        onClick={handleSavePrefs}
        disabled={savingPrefs}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {savingPrefs ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {isFr ? 'Enregistrer le moteur' : 'Save engine'}
      </button>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Key size={15} className="text-[#E85D42]" />
            {isFr ? 'Clés API' : 'API keys'}
          </h4>
          <span className="text-[11px] font-semibold text-slate-500">
            {configuredCount}/{AI_PROVIDER_IDS.length} {isFr ? 'configurés' : 'configured'}
          </span>
        </div>

        <p className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          <Info size={13} className="mt-px shrink-0 text-slate-400" />
          {isFr
            ? 'Les clés sont stockées dans ce navigateur et ne sont jamais écrites dans la base publique. Elles ne sont donc pas partagées avec les autres administrateurs : chacun colle sa propre clé sur sa machine.'
            : 'Keys are stored in this browser and never written to the public database, so they are not shared with other admins: each person pastes their own key on their own machine.'}
        </p>

        {AI_PROVIDER_IDS.map((id) => (
          <ProviderCard
            key={id}
            id={id}
            isFr={isFr}
            isSet={!!configured[id]}
            value={keys[id] || ''}
            revealed={!!reveal[id]}
            busy={busy === id}
            testing={testing === id}
            model={models[id] ?? ''}
            result={results[id]}
            onValue={(v) => setKeys((k) => ({ ...k, [id]: v }))}
            onToggleReveal={() => setReveal((r) => ({ ...r, [id]: !r[id] }))}
            onSave={() => handleSaveKey(id)}
            onRevoke={() => handleRevoke(id)}
            onTest={() => handleTest(id)}
            onModel={(v) => setModels((m) => ({ ...m, [id]: v }))}
          />
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Server size={15} className="text-[#E85D42]" />
          {isFr ? 'Proxy backend (optionnel)' : 'Backend proxy (optional)'}
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          {isFr
            ? 'Obligatoire pour Anthropic, qui bloque les appels navigateur. Recommandé si vous préférez garder les clés côté serveur. L’URL se configure dans l’onglet Diagnostic ; les blocs d’API d’Abdel se gèrent dans « Assistant Abdel & Chat ».'
            : 'Required for Anthropic, which blocks browser calls. Recommended if you prefer keeping keys server-side. The URL is set in the Diagnostics tab; Abdel’s API blocks live in “Assistant Abdel & Chat”.'}
        </p>
      </section>
    </div>
  );
}

/** The engine Abdel (and auto generation) should prefer. */
function AbdelEnginePicker({
  isFr,
  preferred,
  setPreferred,
  configured,
}: {
  isFr: boolean;
  preferred: string;
  setPreferred: (v: string) => void;
  configured: Record<string, boolean>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <Sparkles size={15} className="text-[#E85D42]" />
        {isFr ? 'Moteur d’Abdel' : 'Abdel’s engine'}
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        {isFr
          ? 'Utilisé quand aucun bloc API configuré ne répond, et pour la génération d’articles lorsque le choix est sur « automatique ».'
          : 'Used when no configured API block answers, and for article generation when the choice is “auto”.'}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => setPreferred('auto')}
          className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
            preferred === 'auto'
              ? 'border-[#E85D42] bg-[#E85D42]/5 font-bold text-[#E85D42]'
              : 'border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          {isFr ? 'Automatique' : 'Automatic'}
          <span className="mt-0.5 block text-[11px] font-normal opacity-80">
            {isFr
              ? 'Essaye chaque fournisseur configuré, dans l’ordre, jusqu’à une réponse.'
              : 'Tries each configured provider in order until one answers.'}
          </span>
        </button>

        {AI_PROVIDER_IDS.map((id) => {
          const p = AI_PROVIDERS[id];
          const on = preferred === id;
          const ready = !!configured[id];
          return (
            <button
              key={id}
              onClick={() => setPreferred(id)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                on
                  ? 'border-[#E85D42] bg-[#E85D42]/5 font-bold text-[#E85D42]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {p.label}
              <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                {ready
                  ? isFr
                    ? 'Clé enregistrée'
                    : 'Key saved'
                  : isFr
                  ? 'Aucune clé — ce moteur échouera'
                  : 'No key — this engine will fail'}
              </span>
            </button>
          );
        })}
      </div>

      {preferred !== 'auto' && !configured[preferred] && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-amber-700">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          {isFr
            ? 'Ce moteur est sélectionné mais aucune clé n’est enregistrée. Ajoutez-la ci-dessous, sinon Abdel basculera sur un autre fournisseur.'
            : 'This engine is selected but has no saved key. Add one below, or Abdel will fall through to another provider.'}
        </p>
      )}
    </section>
  );
}

/** One provider: key field, test button, and an optional model override. */
function ProviderCard({
  id, isFr, isSet, value, revealed, busy, testing, model, result,
  onValue, onToggleReveal, onSave, onRevoke, onTest, onModel,
}: {
  id: AiProviderId;
  isFr: boolean;
  isSet: boolean;
  value: string;
  revealed: boolean;
  busy: boolean;
  testing: boolean;
  model: string;
  result?: { success: boolean; message: string; latencyMs?: number };
  onValue: (v: string) => void;
  onToggleReveal: () => void;
  onSave: () => void;
  onRevoke: () => void;
  onTest: () => void;
  onModel: (v: string) => void;
}) {
  const p = AI_PROVIDERS[id];
  const canDirect = supportsDirectBrowserCall(id);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-slate-900">{p.label}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isSet ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isSet ? (isFr ? 'Clé présente' : 'Key present') : isFr ? 'Aucune clé' : 'No key'}
          </span>
          {!canDirect && (
            <span
              title={p.directBlockedReason}
              className="cursor-help rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"
            >
              {isFr ? 'Proxy requis' : 'Proxy required'}
            </span>
          )}
        </div>
        <a
          href={p.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-semibold text-slate-400 underline hover:text-slate-600"
        >
          {isFr ? 'Obtenir une clé' : 'Get a key'}
        </a>
      </div>

      <p className="mt-1.5 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-600">{p.header}</span>
        {p.directBlockedReason ? ` — ${p.directBlockedReason}` : ''}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <input
            type={revealed ? 'text' : 'password'}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            placeholder={isSet ? '••••••••••••••••' : isFr ? 'collez la clé API' : 'paste the API key'}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-xs outline-none transition focus:border-[#E85D42]"
          />
          <button
            onClick={onToggleReveal}
            aria-label={revealed ? 'Hide key' : 'Show key'}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <button
          onClick={onSave}
          disabled={busy || !value.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {isFr ? 'Enregistrer' : 'Save'}
        </button>

        <button
          onClick={onTest}
          disabled={testing || !isSet}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 disabled:opacity-40"
        >
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {isFr ? 'Tester' : 'Test'}
        </button>

        {isSet && (
          <button
            onClick={onRevoke}
            disabled={busy}
            aria-label="Remove key"
            className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-semibold text-slate-500">
          {isFr ? 'Modèle' : 'Model'}
        </label>
        <input
          value={model}
          onChange={(e) => onModel(e.target.value)}
          placeholder={p.defaultModel}
          className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] outline-none focus:border-[#E85D42]"
        />
      </div>

      {result && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] ${
            result.success ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {result.success ? (
            <CheckCircle2 size={13} className="mt-px shrink-0" />
          ) : (
            <XCircle size={13} className="mt-px shrink-0" />
          )}
          <span>
            {result.message}
            {typeof result.latencyMs === 'number' ? ` (${result.latencyMs} ms)` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
