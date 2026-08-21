import React, { useState } from 'react';
import { 
  Zap, Copy, Check, Send, Sparkles, Globe, Terminal, FileCode2, 
  CheckCircle2, AlertCircle, RefreshCw, ExternalLink, ShieldCheck, Layers, BookOpen, Bot, Trash2
} from 'lucide-react';
import { useStore } from '../../store';

export function MakeWebhookTab() {
  const { language, siteSettings } = useStore();
  const isFr = language === 'fr';

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [promptMode, setPromptMode] = useState<'simple' | 'full'>('simple');

  // Test webhook dispatch state
  const [testLoading, setTestLoading] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; permalink?: string; article?: any } | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookEndpoint = `${origin}/api/webhooks/incoming-rss`;
  const articlesEndpoint = `${origin}/api/articles`;
  const fetchRssEndpoint = `${origin}/api/rss/fetch`;

  const simpleUniversalPrompt = `================================================================================
UNIVERSAL AI JOURNALIST PROMPT — OPEN FOR ANY LLM & AUTOMATION TOOL
(Works with OpenAI, Claude, Gemini, Maia AI, Zapier, N8N, Make, Pipedream, or Python)
================================================================================

Role: You are a Senior AI Journalist writing for Perspective Group (senperspective.com).
Task: Based on the provided news source, URL, RSS item, or text, generate a high-caliber bilingual article (French & English) and output ONLY a raw JSON object matching the schema below.

Output Rules:
- Return ONLY valid raw JSON. No markdown codeblocks (\`\`\`), no text intro or outro.
- Provide both French ('fr') and English ('en') for title, excerpt, body, and perspectiveBrief.
- Format the body using Markdown headings (## and ###).

JSON SCHEMA:

{
  "title": {
    "fr": "Titre captivant en français",
    "en": "Compelling title in English"
  },
  "excerpt": {
    "fr": "Résumé analytique de 2 phrases en français.",
    "en": "Clear 2-sentence analytical lead in English."
  },
  "body": {
    "fr": "## Analyse de la Situation\\n\\nContenu rédigé avec rigueur et clarté en français...",
    "en": "## Situation Analysis\\n\\nDetailed content written with rigor and clarity in English..."
  },
  "category": "Politique",
  "type": "News",
  "author": "Rédaction Perspective",
  "imageUrl": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200",
  "readingTime": 5,
  "isPublished": true,
  "isFeatured": false,
  "isTrending": true,
  "tags": ["Sénégal", "Analyse", "Perspective Group"],
  "sourceUrl": "https://senperspective.com",
  "perspectiveBrief": {
    "whatHappened": {
      "fr": "Ce qu'il s'est passé en 1 à 2 phrases.",
      "en": "What happened in 1 to 2 sentences."
    },
    "whyItMatters": {
      "fr": "Pourquoi cette actualité est importante.",
      "en": "Why this news matters."
    },
    "whatToWatchNext": {
      "fr": "Ce qu'il faut surveiller pour la suite.",
      "en": "What to watch for in the near future."
    }
  }
}`;

  const sampleJsonPayload = {
    title: {
      fr: "Transition Économique au Sénégal : Bilan des Nouvelles Réformes Structurelles",
      en: "Economic Transition in Senegal: Review of New Structural Reforms"
    },
    excerpt: {
      fr: "Une analyse approfondie sur les orientations stratégiques du gouvernement sénégalais et leur impact sur la compétitivité régionale.",
      en: "An in-depth analysis of the Senegalese government's strategic guidelines and their impact on regional competitiveness."
    },
    body: {
      fr: "## Une Vision Stratégique Renouvelée\n\nLe paysage économique sénégalais traverse une phase décisive de transformation. Face aux défis mondiaux, les autorités de Dakar ont engagé une série de réformes visant à renforcer l'attractivité des investissements et la résilience budgétaire.\n\n### Les Piliers du Développement\n\n1. **Souveraineté Énergétique** : Valorisation transparente des ressources naturelles.\n2. **Inclusion Financière** : Modernisation du secteur bancaire et soutien à la jeunesse entrepreneuriale.\n\n> 'La rigueur budgétaire et l'ambition industrielle constituent le socle irréversible de notre croissance.' — Direction Générale du Trésor\n\n## Perspectives Régionales dans la CEDEAO\n\nDans un contexte ouest-africain en pleine mutation, le Sénégal réaffirme sa position de pôle de stabilité et d'innovation.",
      en: "## A Renewed Strategic Vision\n\nThe Senegalese economic landscape is undergoing a decisive phase of transformation. In response to global challenges, authorities in Dakar have launched a series of structural reforms aimed at boosting investment attractiveness and fiscal resilience.\n\n### Pillars of Development\n\n1. **Energy Sovereignty**: Transparent valuation of national natural resources.\n2. **Financial Inclusion**: Modernizing the banking sector and supporting youth entrepreneurship.\n\n> 'Fiscal rigor and industrial ambition form the irreversible bedrock of our growth.' — Directorate General of the Treasury\n\n## Regional Outlook within ECOWAS\n\nIn a rapidly changing West African context, Senegal reaffirms its position as a beacon of stability and innovation."
    },
    category: "Économie",
    type: "Analysis",
    author: "Grand Reporter Perspective",
    imageUrl: "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&q=80&w=1200",
    readingTime: 6,
    isPublished: true,
    isFeatured: true,
    isTrending: true,
    tags: ["Sénégal", "Économie", "Réformes", "Perspective Group"],
    sourceUrl: "https://senperspective.com/articles/reformes-economiques-2026",
    perspectiveBrief: {
      whatHappened: {
        fr: "Annonce officielle du plan quinquennal d'industrialisation et de rationalisation des dépenses publiques à Dakar.",
        en: "Official announcement of the five-year plan for industrialization and public expenditure rationalization in Dakar."
      },
      whyItMatters: {
        fr: "Détermine l'orientation de la croissance économique régionale de l'UEMOA et renforce la crédibilité financière du pays.",
        en: "Determines the direction of WAEMU regional economic growth and boosts the country's financial credibility."
      },
      whatToWatchNext: {
        fr: "Consolidation des premiers partenariats public-privé au 3e trimestre 2026 et évaluation de la notation souveraine.",
        en: "Consolidation of the first public-private partnerships in Q3 2026 and assessment of sovereign credit ratings."
      }
    },
    structuralForces: {
      political: {
        fr: "Stabilité institutionnelle renouvelée et volonté affirmée de bonne gouvernance.",
        en: "Renewed institutional stability and strong commitment to good governance."
      },
      economic: {
        fr: "Diversification accrue du tissu industriel et maîtrise de l'inflation.",
        en: "Increased diversification of the industrial base and controlled inflation."
      },
      social: {
        fr: "Création d'emplois qualifiés ciblés pour la jeunesse sénégalaise.",
        en: "Targeted creation of skilled jobs for Senegalese youth."
      },
      international: {
        fr: "Renforcement des alliances économiques intra-africaines et partenariats bilatéraux.",
        en: "Strengthening of intra-African economic alliances and bilateral partnerships."
      }
    },
    keyActors: [
      {
        name: "Ministère de l'Économie et du Plan",
        role: "Pilotage Stratégique",
        significance: {
          fr: "Organe central de coordination des réformes budgétaires et industrielles.",
          en: "Central coordinating body for fiscal and industrial reforms."
        }
      }
    ],
    timeline: [
      {
        date: "2026-08-01",
        description: {
          fr: "Adoption de la loi de finances rectificative à l'Assemblée Nationale.",
          en: "Adoption of the amended finance bill at the National Assembly."
        }
      }
    ]
  };

  const fullUniversalPrompt = `================================================================================
UNIVERSAL AI JOURNALIST & AUTOMATION SCENARIO PROMPT
================================================================================

[SYSTEM ROLE & PERSONA]
You are a Senior AI Journalist & Editor writing for "Perspective Group" (senperspective.com).
Your editorial standards match leading international investigative journals (such as Le Monde, Financial Times, and Jeune Afrique).
Your writing style is intellectual, analytical, balanced, authoritative, and compelling. You avoid sensationalism, clickbait, and AI clichés.

[PRIMARY TASK]
You receive source content (a news URL, raw text brief, RSS article feed, XML payload, or interview transcript). 
Your task is to analyze, summarize, write a comprehensive deep-dive editorial article, and produce a flawless BILINGUAL JSON PAYLOAD (French & English) formatted specifically for the Perspective Group Webhook Ingestion Engine.

--------------------------------------------------------------------------------
1. WRITING STYLE & JOURNALISTIC STRUCTURE
--------------------------------------------------------------------------------
- TONALITY: High-caliber journalistic voice. Rigorous, objective, articulate.
- STRUCTURE:
  * Headline: Impactful, punchy, intellectual title.
  * Lead / Chapeau (Excerpt): 2 to 3 sentences summarizing the core geopolitical or economic thesis.
  * Main Body: Structured with Markdown headings (## and ###), bullet points, and authoritative pull quotes (> "Quote...").
  * Perspective Brief: 3 bullet pillars (What Happened, Why It Matters, What To Watch Next).
  * Structural Forces: Analytical breakdown across Political, Economic, Social, and International dimensions.
- BILINGUAL REQUIREMENT:
  * French (fr): Primary language. Uses sophisticated Francophone press vocabulary, proper accentuation, and idiomatic phrasing.
  * English (en): Complete, high-level English translation preserving tone, precision, and nuance.

--------------------------------------------------------------------------------
2. ADMIN ARTICLE FILLING FIELDS & SCHEMA
--------------------------------------------------------------------------------
You must output a single, raw JSON object matching this exact field mapping:

{
  "title": {
    "fr": "Titre captivant et analytique en français",
    "en": "Compelling and analytical title in English"
  },
  "excerpt": {
    "fr": "Chapeau journalistique de 2 à 3 phrases synthétisant l'enjeu principal.",
    "en": "Journalistic lead of 2 to 3 sentences summarizing the core issue."
  },
  "body": {
    "fr": "## Premier Titre de Section\\n\\nTexte structuré en français avec paragraphes clairs...\\n\\n### Sous-titre\\n\\n> 'Citation marquante' — Source Officielle",
    "en": "## First Section Heading\\n\\nStructured text in English with clear paragraphs...\\n\\n### Subsection\\n\\n> 'Key pull quote' — Official Source"
  },
  "category": "Politique",
  "type": "Analysis",
  "author": "Grand Reporter Perspective",
  "imageUrl": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200",
  "readingTime": 5,
  "isPublished": true,
  "isFeatured": false,
  "isTrending": true,
  "tags": ["Sénégal", "Analyse", "Perspective Group"],
  "sourceUrl": "[ORIGINAL_SOURCE_URL_HERE]",
  "perspectiveBrief": {
    "whatHappened": {
      "fr": "Synthèse concise des faits marquant l'actualité.",
      "en": "Concise summary of the key breaking facts."
    },
    "whyItMatters": {
      "fr": "Analyse de l'impact géopolitique, économique ou institutionnel.",
      "en": "Analysis of the geopolitical, economic, or institutional impact."
    },
    "whatToWatchNext": {
      "fr": "Perspectives futures et prochaines échéances à surveiller.",
      "en": "Future perspectives and upcoming milestones to monitor."
    }
  },
  "structuralForces": {
    "political": {
      "fr": "Analyse des dynamiques politiques et gouvernementales.",
      "en": "Analysis of political and governmental dynamics."
    },
    "economic": {
      "fr": "Analyse des enjeux financiers et macroéconomiques.",
      "en": "Analysis of financial and macroeconomic stakes."
    },
    "social": {
      "fr": "Impact sur les populations, la jeunesse et la société.",
      "en": "Impact on citizens, youth, and society."
    },
    "international": {
      "fr": "Dimension diplomatique et régionale (CEDEAO, UEMOA, Monde).",
      "en": "Diplomatic and regional dimension (ECOWAS, WAEMU, Global)."
    }
  }
}

[ALLOWED CATEGORIES]
Must be exactly one of: "Politique", "Économie", "International", "Société", "Culture", "Technologie", "Sports", "Opinion".

[ALLOWED TYPES]
Must be exactly one of: "News", "Analysis", "Deep Dive", "Explainer", "Opinion".

--------------------------------------------------------------------------------
3. HTTP POST CONFIGURATION (ZAPIER / N8N / MAKE / PIPEDREAM / PYTHON / CURL)
--------------------------------------------------------------------------------
- Method: POST
- URL: ${webhookEndpoint}
- Headers:
    Content-Type: application/json
- Access: OPEN ACCESS (No Secret Key or Token Required)
- Request Body: Raw JSON output from your AI node or automation script.

[OUTPUT FORMAT]
Output ONLY valid, parseable JSON. Do not surround with triple backticks or markdown text wrappers.`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyPrompt = () => {
    const textToCopy = promptMode === 'simple' ? simpleUniversalPrompt : fullUniversalPrompt;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleJsonPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const handleRunLiveTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhooks/incoming-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleJsonPayload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: isFr 
            ? '✓ Article test reçu et synchronisé avec succès dans la base Firestore !' 
            : '✓ Test article successfully received and synced to Firestore!',
          permalink: data.permalink,
          article: data.article
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Webhook test dispatch failed.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error executing webhook test.'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handlePurgeAll = async () => {
    if (!window.confirm(isFr ? "Voulez-vous vraiment purger et supprimer TOUS les articles RSS de la base de données ?" : "Are you sure you want to purge and delete ALL RSS articles from the database?")) {
      return;
    }
    setPurgeLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/articles/purge', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: isFr 
            ? `✓ Purge réussie : ${data.purgedCount || 0} article(s) supprimé(s) avec succès de la base.` 
            : `✓ Purge successful: ${data.purgedCount || 0} article(s) deleted from database.`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Purge request failed.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error executing purge operation.'
      });
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-zinc-100 animate-in fade-in duration-200">
      
      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-coral/10 text-brand-coral border border-brand-coral/30">
              <Zap size={14} />
              <span>{isFr ? 'Moteur d’Intégration Ouvert & Universel' : 'Universal & Open Integration Engine'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              {isFr ? 'Automatisations, IA & Flux RSS' : 'Automations, AI & RSS Pipeline'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              {isFr
                ? 'Connectez n’importe quel outil d’automatisation (Zapier, N8N, Make.com, Pipedream), agent IA (OpenAI, Claude, Gemini, Maia) ou flux RSS XML. Aucune clé secrète requise — publication directe dans la base de données.'
                : 'Connect any automation app (Zapier, N8N, Make.com, Pipedream), AI model (OpenAI, Claude, Gemini, Maia), or RSS feed. No secret key needed — direct ingestion into Cloud Database.'}
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleRunLiveTest}
              disabled={testLoading || purgeLoading}
              className="bg-brand-coral hover:bg-brand-coral/90 text-white font-bold px-5 py-3 rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {testLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{isFr ? 'Tester Ingestion' : 'Test Ingestion'}</span>
            </button>

            <button
              onClick={handlePurgeAll}
              disabled={testLoading || purgeLoading}
              className="bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 font-bold px-4 py-3 rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {purgeLoading ? <RefreshCw size={16} className="animate-spin text-red-400" /> : <Trash2 size={16} className="text-red-400" />}
              <span>{isFr ? 'Purger la Base' : 'Purge Database'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TEST RESULT NOTIFICATION */}
      {testResult && (
        <div className={`p-4 rounded-xl border flex items-start justify-between gap-4 shadow-xl ${
          testResult.success 
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' 
            : 'bg-red-950/80 border-red-500/50 text-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {testResult.success ? <CheckCircle2 size={20} className="text-emerald-400 mt-0.5" /> : <AlertCircle size={20} className="text-red-400 mt-0.5" />}
            <div>
              <p className="text-xs font-bold font-mono">{testResult.message}</p>
              {testResult.permalink && (
                <a 
                  href={testResult.permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-400 underline hover:text-emerald-300 mt-1 inline-flex items-center gap-1"
                >
                  <span>{isFr ? 'Voir l’article publié' : 'View published article'}</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
          <button 
            onClick={() => setTestResult(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. WEBHOOK CONFIGURATION & ENDPOINT URLS */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="text-emerald-400" size={20} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {isFr ? 'Endpoints Webhook Ouverts (Tout Outil / RSS)' : 'Open Webhook Endpoints (Any Tool / RSS)'}
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            HTTP POST • Open Access
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
              <span>{isFr ? '1. URL Webhook Universel JSON & XML RSS :' : '1. Universal JSON & XML RSS Webhook URL:'}</span>
              <span className="text-zinc-500 text-[10px]">Zapier • N8N • Make • Pipedream • cURL</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookEndpoint}
                className="flex-1 bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono text-xs px-4 py-2.5 rounded-lg outline-none select-all"
              />
              <button
                onClick={handleCopyUrl}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedUrl ? (isFr ? 'Copié !' : 'Copied!') : (isFr ? 'Copier' : 'Copy')}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
              <span>{isFr ? '2. Endpoint Alias Direct Articles :' : '2. Direct Articles Ingestion Endpoint:'}</span>
              <span className="text-zinc-500 text-[10px]">POST /api/articles</span>
            </label>
            <input
              type="text"
              readOnly
              value={articlesEndpoint}
              className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-mono text-xs px-4 py-2 rounded-lg outline-none select-all"
            />
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
              <span>{isFr ? '3. Aspirateur de Flux RSS Externe (Fetch Direct) :' : '3. External RSS Feed Direct Fetcher:'}</span>
              <span className="text-zinc-500 text-[10px]">POST /api/rss/fetch (Body: &#123; "feedUrl": "..." &#125;)</span>
            </label>
            <input
              type="text"
              readOnly
              value={fetchRssEndpoint}
              className="w-full bg-zinc-900/80 border border-zinc-800 text-purple-300 font-mono text-xs px-4 py-2 rounded-lg outline-none select-all"
            />
          </div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-lg flex items-center justify-between text-xs font-mono text-emerald-200">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Accès libre et sécurisé sans clé secrète. Synchronisation base de données instantanée.</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            Tous Outils Autorisés
          </span>
        </div>
      </div>

      {/* 3. UNIVERSAL AI PROMPT SECTION */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                Prompt IA Universel ({promptMode === 'simple' ? (isFr ? 'Simple & Rapide' : 'Simple & Fast') : (isFr ? 'Analyse Avancée' : 'Full Analysis')})
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {isFr ? 'Compatible avec OpenAI (GPT-4), Claude, Gemini, Maia AI ou tout script d’automatisation' : 'Compatible with OpenAI (GPT-4), Claude, Gemini, Maia AI, or custom scripts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-lg flex items-center text-xs">
              <button
                onClick={() => setPromptMode('simple')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  promptMode === 'simple'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isFr ? 'Simple (Efficace)' : 'Simple (Recommended)'}
              </button>
              <button
                onClick={() => setPromptMode('full')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  promptMode === 'full'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isFr ? 'Avancé (Complet)' : 'Advanced (Full)'}
              </button>
            </div>

            <button
              onClick={handleCopyPrompt}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 shrink-0"
            >
              {copiedPrompt ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
              <span>{copiedPrompt ? (isFr ? 'Copié !' : 'Copied!') : (isFr ? 'Copier Prompt' : 'Copy Prompt')}</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            readOnly
            value={promptMode === 'simple' ? simpleUniversalPrompt : fullUniversalPrompt}
            rows={16}
            className="w-full bg-black/90 border border-zinc-800 text-zinc-300 font-mono text-xs p-4 rounded-lg outline-none resize-none leading-relaxed select-all"
          />
        </div>
      </div>

      {/* 4. JSON SCHEMA & FILLING FIELDS DOC */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="text-brand-coral" size={20} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {isFr ? 'Exemple de Payload JSON Bilingue (Modèle de Remplissage)' : 'Bilingual JSON Payload Spec (Filling Template)'}
            </h3>
          </div>

          <button
            onClick={handleCopyJson}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedJson ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedJson ? (isFr ? 'JSON Copié !' : 'JSON Copied!') : (isFr ? 'Copier JSON' : 'Copy JSON')}</span>
          </button>
        </div>

        <pre className="bg-black/90 border border-zinc-800 text-amber-300 font-mono text-xs p-4 rounded-lg overflow-x-auto max-h-96 leading-relaxed">
          {JSON.stringify(sampleJsonPayload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
