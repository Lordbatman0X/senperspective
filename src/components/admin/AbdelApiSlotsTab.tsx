import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Server, Save, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { callAbdelSlot, normalizeAbdelSlots } from '../../lib/abdelRouter';
import type { AbdelApiSlot, AbdelKeyProvider } from '../../lib/abdelRouter';
import { AbdelApiSlotsGrid } from './AbdelApiSlotsGrid';

interface AbdelApiSlotsTabProps {
  /** Admin toast hook — falls back to an inline banner when not provided. */
  onNotify?: (message: string) => void;
}

/**
 * ADMIN → ASSISTANT ABDEL & CHAT
 * ------------------------------
 * Two things live here:
 *   1. The WELCOME MESSAGE (with its scope + opt-out rules, see
 *      `resolveAbdelGreeting`).
 *   2. FOUR independent API blocks that link Abdel to four separate AI
 *      backends. Each block owns its endpoint, model, provider key and
 *      persona; the router tries them in priority order and fails over to the
 *      next one whenever a backend errors, times out or is disabled.
 */
export function AbdelApiSlotsTab({ onNotify }: AbdelApiSlotsTabProps) {
  const { language, siteSettings, updateSiteSettings } = useStore();
  const isFr = language === 'fr';

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
    else console.info('[AbdelApiSlotsTab]', msg);
  };

  // ---------------------------------------------------------------- slots
  const storedSlots = useMemo(
    () => normalizeAbdelSlots((siteSettings as any)?.abdelApiSlots),
    [siteSettings]
  );
  const [slots, setSlots] = useState<AbdelApiSlot[]>(storedSlots);
  const [testingSlot, setTestingSlot] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});

  // Re-sync when the cloud settings hydrate (another device saved something).
  useEffect(() => {
    setSlots(normalizeAbdelSlots((siteSettings as any)?.abdelApiSlots));
  }, [siteSettings]);

  // ------------------------------------------------------- welcome message
  const [welcomeFr, setWelcomeFr] = useState(String(siteSettings?.abdelIntroMessageFr || ''));
  const [welcomeEn, setWelcomeEn] = useState(String(siteSettings?.abdelIntroMessageEn || ''));
  const [useCustomWelcome, setUseCustomWelcome] = useState(
    siteSettings?.abdelUseCustomWelcome === true
  );
  const [welcomeOnlyOnHome, setWelcomeOnlyOnHome] = useState(
    siteSettings?.abdelWelcomeOnlyOnHome !== false
  );

  useEffect(() => {
    setWelcomeFr(String(siteSettings?.abdelIntroMessageFr || ''));
    setWelcomeEn(String(siteSettings?.abdelIntroMessageEn || ''));
    setUseCustomWelcome(siteSettings?.abdelUseCustomWelcome === true);
    setWelcomeOnlyOnHome(siteSettings?.abdelWelcomeOnlyOnHome !== false);
  }, [siteSettings]);

  const handleSaveWelcome = () => {
    updateSiteSettings({
      abdelIntroMessageFr: welcomeFr.trim(),
      abdelIntroMessageEn: welcomeEn.trim(),
      abdelUseCustomWelcome: useCustomWelcome,
      abdelWelcomeOnlyOnHome: welcomeOnlyOnHome,
    } as any);
    notify(
      isFr
        ? useCustomWelcome
          ? 'Message d’accueil enregistré et activé.'
          : 'Message d’accueil enregistré (désactivé : les messages contextuels sont utilisés).'
        : useCustomWelcome
          ? 'Welcome message saved and enabled.'
          : 'Welcome message saved (disabled: contextual greetings are used).'
    );
  };

  const updateSlot = (id: string, patch: Partial<AbdelApiSlot>) => {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSaveSlots = () => {
    updateSiteSettings({ abdelApiSlots: slots } as any);
    const active = slots.filter(s => s.enabled).length;
    notify(
      isFr
        ? `Configuration Abdel enregistrée — ${active} moteur(s) actif(s).`
        : `Abdel configuration saved — ${active} active engine(s).`
    );
  };

  const handleTestSlot = async (slot: AbdelApiSlot) => {
    setTestingSlot(slot.id);
    setTestResult(prev => ({ ...prev, [slot.id]: { ok: false, message: '…' } }));
    try {
      const res = await callAbdelSlot(
        slot,
        {
          message: isFr ? 'Bonjour Abdel, confirme que tu es en ligne.' : 'Hello Abdel, confirm you are online.',
          language,
        },
        15000
      );
      setTestResult(prev => ({
        ...prev,
        [slot.id]: res.ok
          ? { ok: true, message: res.text.slice(0, 180) }
          : { ok: false, message: res.error || (isFr ? 'Échec' : 'Failed') },
      }));
    } catch (err: any) {
      setTestResult(prev => ({
        ...prev,
        [slot.id]: { ok: false, message: err?.message || 'Error' },
      }));
    } finally {
      setTestingSlot(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================ WELCOME MESSAGE ==================== */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-mono uppercase tracking-wider text-[#E85D42] font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {isFr ? 'Message d’accueil d’Abdel' : 'Abdel welcome message'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              {isFr
                ? 'Texte affiché en première bulle de la conversation. Laissé vide, Abdel utilise le message contextuel de la page (article, admin, sports, recherche…). Le message s’affiche par défaut sur la page d’accueil uniquement.'
                : 'Text shown as the first bubble of the conversation. When empty, Abdel uses the page-contextual greeting (article, admin, sports, search…). By default it is shown on the homepage only.'}
            </p>
          </div>
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              useCustomWelcome
                ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                : 'text-zinc-400 border-zinc-700 bg-zinc-800/40'
            }`}
          >
            {useCustomWelcome ? (isFr ? 'Personnalisé' : 'Custom') : isFr ? 'Contextuel' : 'Contextual'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-zinc-300 block">
              {isFr ? 'Message en Français' : 'French message'}
            </label>
            <textarea
              rows={4}
              value={welcomeFr}
              onChange={e => setWelcomeFr(e.target.value)}
              placeholder="Bonjour ! Je suis Abdel…"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42] resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-zinc-300 block">
              {isFr ? 'Message en Anglais' : 'English message'}
            </label>
            <textarea
              rows={4}
              value={welcomeEn}
              onChange={e => setWelcomeEn(e.target.value)}
              placeholder="Hello! I am Abdel…"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42] resize-y"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={useCustomWelcome}
              onChange={e => setUseCustomWelcome(e.target.checked)}
              className="accent-[#E85D42]"
            />
            {isFr ? 'Utiliser ce message personnalisé' : 'Use this custom message'}
          </label>
          <label
            className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
              useCustomWelcome
                ? 'text-zinc-300 cursor-pointer bg-zinc-950 border-zinc-800'
                : 'text-zinc-600 bg-zinc-950/40 border-zinc-900'
            }`}
          >
            <input
              type="checkbox"
              disabled={!useCustomWelcome}
              checked={welcomeOnlyOnHome}
              onChange={e => setWelcomeOnlyOnHome(e.target.checked)}
              className="accent-[#E85D42]"
            />
            {isFr ? 'Page d’accueil uniquement' : 'Homepage only'}
          </label>
          <button
            onClick={handleSaveWelcome}
            className="ml-auto bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-bold uppercase tracking-wider rounded-lg px-4 py-2 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Save size={14} />
            {isFr ? 'Enregistrer' : 'Save'}
          </button>
        </div>
      </div>

      {/* ======================== FOUR API BLOCKS ======================= */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-mono uppercase tracking-wider text-[#E85D42] font-bold flex items-center gap-2">
              <Server className="w-4 h-4" />
              {isFr ? 'Moteurs IA d’Abdel (4 blocs API)' : 'Abdel AI engines (4 API blocks)'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              {isFr
                ? 'Liez Abdel à quatre backends distincts. Ils sont appelés dans l’ordre de priorité : dès qu’un moteur répond, les suivants sont ignorés ; en cas d’erreur, de délai dépassé ou de bloc désactivé, le moteur suivant prend le relais. Si aucun ne répond, le moteur local du navigateur est utilisé.'
                : 'Link Abdel to four separate backends. They are called in priority order: the first engine that answers wins; on error, timeout or disabled block, the next one takes over. If none responds, the in-browser engine is used.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
              {slots.filter(s => s.enabled).length} {isFr ? 'actif(s)' : 'active'}
            </span>
            <button
              onClick={handleSaveSlots}
              className="bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-bold uppercase tracking-wider rounded-lg px-4 py-2 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Save size={14} />
              {isFr ? 'Enregistrer tout' : 'Save all'}
            </button>
          </div>
        </div>

        <AbdelApiSlotsGrid
          slots={slots}
          isFr={isFr}
          testingSlot={testingSlot}
          testResult={testResult}
          onUpdate={updateSlot}
          onTest={handleTestSlot}
        />

        <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-4">
          <h4 className="text-blue-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
            <Bot size={13} />
            {isFr ? 'Contrat attendu par le backend' : 'Backend contract'}
          </h4>
          <p className="text-zinc-400 text-[11px] font-mono leading-relaxed">
            POST{' '}
            {`{ message, language, model, temperature, systemPrompt, history[], locationInfo, context, slot }`}
            <br />
            {isFr ? 'Réponse acceptée' : 'Accepted response'}: {`{ response }`} · {`{ reply }`} · {`{ text }`} ·{' '}
            {`{ output }`} · OpenAI {`{ choices[0].message.content }`} · Gemini{' '}
            {`{ candidates[0].content.parts[0].text }`}
            <br />
            {isFr ? 'Clés transmises via' : 'Keys sent as'}: x-gemini-key · x-openai-key · x-groq-key ·
            x-openrouter-key · x-anthropic-key · x-deepseek-key · x-abdel-slot
          </p>
        </div>
      </div>
    </div>
  );
}
