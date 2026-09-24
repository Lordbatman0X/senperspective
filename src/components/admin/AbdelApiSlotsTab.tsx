import React, { useEffect, useState } from 'react';
import { Bot, Save, Sparkles, KeyRound, Eye, EyeOff, Loader2, Play, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../../store';
import { clientTestProvider, getClientApiKey, saveClientApiKey } from '../../lib/clientAiEngine';

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

  // ---------------------------------------------------------- Gemini key
  const [geminiKey, setGeminiKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(() => !!getClientApiKey('gemini'));
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingGeminiKey, setSavingGeminiKey] = useState(false);
  const [testingGeminiKey, setTestingGeminiKey] = useState(false);
  const [geminiKeyTest, setGeminiKeyTest] = useState<{ ok: boolean; message: string } | null>(null);

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

  const handleSaveGeminiKey = async () => {
    const key = geminiKey.trim();
    if (!key) {
      notify(isFr ? 'Collez d’abord votre clé Gemini.' : 'Paste your Gemini key first.');
      return;
    }
    setSavingGeminiKey(true);
    try {
      await saveClientApiKey('gemini', key);
      setGeminiKey('');
      setHasSavedKey(true);
      setGeminiKeyTest(null);
      notify(isFr ? 'Clé Gemini enregistrée. Abdel est prêt.' : 'Gemini key saved. Abdel is ready.');
    } finally {
      setSavingGeminiKey(false);
    }
  };

  const handleTestGeminiKey = async () => {
    setTestingGeminiKey(true);
    setGeminiKeyTest(null);
    try {
      const result = await clientTestProvider('gemini');
      setGeminiKeyTest({ ok: result.success, message: result.message });
    } finally {
      setTestingGeminiKey(false);
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

      {/* ============================ GEMINI API KEY ==================== */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div>
          <h2 className="text-sm font-mono uppercase tracking-wider text-[#E85D42] font-bold flex items-center gap-2">
            <Bot className="w-4 h-4" />
            {isFr ? 'Connexion d’Abdel' : 'Connect Abdel'}
          </h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            {isFr
              ? 'Collez votre clé API Google Gemini, puis cliquez sur Enregistrer. C’est tout — aucune URL ni aucun autre réglage.'
              : 'Paste your Google Gemini API key, then click Save. That’s all — no URL or other setting needed.'}
          </p>
        </div>

        <div className="max-w-2xl space-y-3">
          <label className="block text-xs font-bold text-zinc-300">
            {isFr ? 'Clé API Gemini' : 'Gemini API key'}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={e => {
                  setGeminiKey(e.target.value);
                  setGeminiKeyTest(null);
                }}
                placeholder={hasSavedKey
                  ? (isFr ? 'Une clé est déjà enregistrée' : 'A key is already saved')
                  : 'AIza…'}
                autoComplete="off"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-11 py-3 text-sm text-white focus:outline-none focus:border-[#E85D42]"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                aria-label={showGeminiKey ? 'Hide API key' : 'Show API key'}
              >
                {showGeminiKey ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSaveGeminiKey}
              disabled={savingGeminiKey || !geminiKey.trim()}
              className="bg-[#E85D42] hover:bg-[#c94931] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-lg px-5 py-3 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {savingGeminiKey ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {isFr ? 'Enregistrer' : 'Save'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTestGeminiKey}
              disabled={testingGeminiKey || !hasSavedKey}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg px-4 py-2 transition-colors cursor-pointer flex items-center gap-2"
            >
              {testingGeminiKey ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {isFr ? 'Tester la clé' : 'Test key'}
            </button>
            <span className={`text-xs flex items-center gap-1.5 ${hasSavedKey ? 'text-emerald-400' : 'text-amber-400'}`}>
              {hasSavedKey ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {hasSavedKey
                ? (isFr ? 'Clé enregistrée sur cet appareil' : 'Key saved on this device')
                : (isFr ? 'Aucune clé enregistrée' : 'No key saved')}
            </span>
          </div>

          {geminiKeyTest && (
            <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
              geminiKeyTest.ok
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                : 'text-red-300 bg-red-500/10 border-red-500/30'
            }`}>
              {geminiKeyTest.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
              <span>{geminiKeyTest.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
