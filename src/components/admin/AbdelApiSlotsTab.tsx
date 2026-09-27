import React, { useEffect, useState } from 'react';
import { Bot, Save, Sparkles, KeyRound, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { ANTHROPIC_PROXY_SNIPPET } from '../../lib/abdelRouter';

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

  // The Gemini-only key field was removed: it duplicated the centralized
  // "APIs & IA" section and wrongly implied Gemini was the only engine.
  // Keys now live in src/lib/aiProviders.ts -> Admin -> APIs & IA.

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

      {/* ANTHROPIC PROXY GUIDE
          Anthropic is the one provider that cannot be called from a browser: its
          API returns no Access-Control-Allow-Origin header, so the request is
          blocked before it leaves the page. It therefore REQUIRES a small server
          of your own. This states the exact contract instead of leaving it to be
          guessed, and the snippet below is the whole server. */}
      <div className="bg-zinc-900/60 border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
        <div>
          <h2 className="text-sm font-mono uppercase tracking-wider text-amber-400 font-bold">
            {isFr ? 'Anthropic (Claude) — relais obligatoire' : 'Anthropic (Claude) — proxy required'}
          </h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            {isFr
              ? "Anthropic n'envoie aucun en-tête CORS : un appel direct depuis le navigateur est bloqué. Il faut donc un petit serveur relais. Voici exactement ce que le site attend de ce serveur."
              : "Anthropic sends no CORS header, so a direct browser call is blocked. A small relay server is therefore required. This is exactly what the site expects from it."}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 font-mono text-[11px]">
          <p className="text-zinc-300 font-bold">{isFr ? '1. Route à exposer' : '1. Route to expose'}</p>
          <p className="text-emerald-300">POST /api/chat</p>

          <p className="text-zinc-300 font-bold pt-1">{isFr ? '2. En-têtes reçus' : '2. Headers received'}</p>
          <p className="text-zinc-400">x-anthropic-key: sk-ant-...</p>
          <p className="text-zinc-400">Content-Type: application/json</p>

          <p className="text-zinc-300 font-bold pt-1">{isFr ? '3. Corps envoyé' : '3. Body sent'}</p>
          <p className="text-zinc-400">{'{ message, language, model, systemPrompt, history[] }'}</p>

          <p className="text-zinc-300 font-bold pt-1">{isFr ? '4. Réponse attendue' : '4. Expected response'}</p>
          <p className="text-emerald-300">{'{ "response": "..." }'}</p>
          <p className="text-zinc-500">{'(or "reply" / "text" / "answer" are accepted too)'}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-zinc-300 font-mono text-[11px] font-bold">
              {isFr ? '5. Serveur minimal (Express)' : '5. Minimal server (Express)'}
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(ANTHROPIC_PROXY_SNIPPET);
                  notify(isFr ? 'Serveur copié dans le presse-papiers.' : 'Server copied to clipboard.');
                } catch { /* clipboard blocked */ }
              }}
              className="rounded-lg border border-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              {isFr ? 'Copier' : 'Copy'}
            </button>
          </div>
          <pre className="overflow-x-auto text-[10px] leading-relaxed text-zinc-400">
            <code>{ANTHROPIC_PROXY_SNIPPET}</code>
          </pre>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          {isFr
            ? "Déployez-le (Render, Railway, Fly.io, Cloud Run), puis : 1) collez la clé Anthropic dans Admin → APIs & IA, 2) renseignez l'URL du backend dans le même écran, 3) dans un bloc ci-dessus, mettez l'endpoint sur /api/chat et la clé sur « Anthropic », puis Testez."
            : "Deploy it (Render, Railway, Fly.io, Cloud Run), then: 1) paste the Anthropic key in Admin → APIs & AI, 2) set the backend URL in the same screen, 3) in a block above set the endpoint to /api/chat and the key to “Anthropic”, then Test."}
        </p>
      </div>

      {/* Keys moved to Admin -> APIs & IA.
          This block used to hold a Gemini-only key field. That duplicated the
          centralized section and wrongly implied Gemini was the only engine. */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-mono uppercase tracking-wider text-[#E85D42] font-bold flex items-center gap-2">
          <Bot className="w-4 h-4" />
          {isFr ? 'Connexion d’Abdel' : 'Connect Abdel'}
        </h2>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          {isFr
            ? 'Les clés API se gèrent désormais dans la section APIs & IA, qui regroupe tous les fournisseurs (Gemini, OpenAI, Claude, DeepSeek, Groq, OpenRouter), le choix du moteur d’Abdel et l’URL du proxy backend.'
            : 'API keys are now managed in the APIs & AI section, which covers every provider (Gemini, OpenAI, Claude, DeepSeek, Groq, OpenRouter), Abdel’s engine choice and the backend proxy URL.'
          }
        </p>
      </div>
    </div>
  );
}

