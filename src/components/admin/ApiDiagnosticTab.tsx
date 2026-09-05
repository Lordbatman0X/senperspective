import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, RefreshCw, Key, Server, Cpu, Save, Loader2, Play, Trash2, Zap, Globe, Link, Check, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store';
import { safeFetchJson, getApiBaseUrl, setApiBaseUrl } from '../../lib/apiUtils';
import { clientTestProvider, getClientApiKey } from '../../lib/clientAiEngine';

export function ApiDiagnosticTab() {
  const { language } = useStore();
  const isFr = language === 'fr';
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Custom Backend URL state
  const [backendUrlInput, setBackendUrlInput] = useState(() => getApiBaseUrl());
  const [backendTesting, setBackendTesting] = useState(false);
  const [backendStatusMsg, setBackendStatusMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // State for API Keys Input
  const [keysInput, setKeysInput] = useState({
    gemini: '',
    openai: '',
    groq: '',
    openrouter: '',
    anthropic: '',
    deepseek: ''
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number; message: string; modelUsed?: string }>>({});
  const [resettingLimits, setResettingLimits] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const { ok, data, isStaticFallback } = await safeFetchJson('/api/ai-engine/status');
      
      if (ok && data && !isStaticFallback) {
        setStatus(data);
      } else {
        // Build resilient client status based on browser localStorage keys
        const geminiKey = getClientApiKey('gemini');
        const openaiKey = getClientApiKey('openai');
        const groqKey = getClientApiKey('groq');
        const openrouterKey = getClientApiKey('openrouter');
        const anthropicKey = getClientApiKey('anthropic');
        const deepseekKey = getClientApiKey('deepseek');

        setStatus({
          engine: 'Perspective AI Orchestrator (Mode Client Direct)',
          mode: 'FAILOVER_BROWSER',
          storytellingEngine: 'Direct REST Model API',
          failoverActive: true,
          isClientDirect: true,
          gemini: {
            configured: !!geminiKey,
            rateLimited: false,
            maskedKey: geminiKey ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : undefined,
            models: ['gemini-2.5-flash', 'gemini-1.5-pro'],
            successCount: geminiKey ? 1 : 0,
            errorCount: 0
          },
          openai: {
            configured: !!openaiKey,
            rateLimited: false,
            maskedKey: openaiKey ? `${openaiKey.slice(0, 4)}...${openaiKey.slice(-4)}` : undefined,
            models: ['gpt-4o', 'gpt-4o-mini'],
            successCount: openaiKey ? 1 : 0,
            errorCount: 0
          },
          groq: {
            configured: !!groqKey,
            rateLimited: false,
            maskedKey: groqKey ? `${groqKey.slice(0, 4)}...${groqKey.slice(-4)}` : undefined,
            models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
            successCount: groqKey ? 1 : 0,
            errorCount: 0
          },
          openrouter: {
            configured: !!openrouterKey,
            rateLimited: false,
            maskedKey: openrouterKey ? `${openrouterKey.slice(0, 4)}...${openrouterKey.slice(-4)}` : undefined,
            models: ['meta-llama/llama-3.3-70b-instruct'],
            successCount: openrouterKey ? 1 : 0,
            errorCount: 0
          },
          anthropic: {
            configured: !!anthropicKey,
            rateLimited: false,
            maskedKey: anthropicKey ? `${anthropicKey.slice(0, 4)}...${anthropicKey.slice(-4)}` : undefined,
            models: ['claude-3-5-sonnet-20241022'],
            successCount: anthropicKey ? 1 : 0,
            errorCount: 0
          },
          deepseek: {
            configured: !!deepseekKey,
            rateLimited: false,
            maskedKey: deepseekKey ? `${deepseekKey.slice(0, 4)}...${deepseekKey.slice(-4)}` : undefined,
            models: ['deepseek-chat', 'deepseek-reasoner'],
            successCount: deepseekKey ? 1 : 0,
            errorCount: 0
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to diagnostic endpoint');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBackendUrl = () => {
    setApiBaseUrl(backendUrlInput);
    setBackendStatusMsg({
      ok: true,
      msg: backendUrlInput.trim() 
        ? (isFr ? `URL Backend enregistrée : ${backendUrlInput}` : `Backend URL saved: ${backendUrlInput}`)
        : (isFr ? 'Mode origine par défaut réactivé.' : 'Default origin mode reset.')
    });
    setTimeout(() => {
      setBackendStatusMsg(null);
      checkStatus();
    }, 2000);
  };

  const handleTestBackendConnection = async () => {
    setBackendTesting(true);
    setBackendStatusMsg(null);
    try {
      const target = backendUrlInput.trim() ? `${backendUrlInput.trim().replace(/\/+$/, '')}/api/health` : '/api/health';
      const res = await fetch(target).catch(() => null);
      if (res && res.ok) {
        const text = await res.text();
        if (text.includes('status') || text.includes('ok')) {
          setBackendStatusMsg({
            ok: true,
            msg: isFr ? 'Connexion réussie ! Le serveur backend Express répond.' : 'Connection successful! Express backend is responding.'
          });
        } else {
          setBackendStatusMsg({
            ok: false,
            msg: isFr ? 'Le serveur a répondu mais a renvoyé du HTML au lieu de l\'API JSON.' : 'Server responded with HTML instead of JSON.'
          });
        }
      } else {
        setBackendStatusMsg({
          ok: false,
          msg: isFr ? `Impossible de joindre le serveur (${res ? res.status : 'Erreur réseau/CORS'})` : `Could not reach backend (${res ? res.status : 'Network error'})`
        });
      }
    } catch (e: any) {
      setBackendStatusMsg({
        ok: false,
        msg: e?.message || (isFr ? 'Échec de test de connexion' : 'Connection test failed')
      });
    } finally {
      setBackendTesting(false);
    }
  };

  const handleSaveKey = async (provider: string, inputKeyName: keyof typeof keysInput) => {
    const key = keysInput[inputKeyName];
    if (!key || key.trim() === '') return;
    
    setSavingKey(provider);
    try {
      // 1. Save to local browser storage first to ensure resilience across static/CDN deployments
      localStorage.setItem(`api_key_${provider.toLowerCase()}`, key.trim());
      localStorage.setItem(`${provider.toUpperCase()}_API_KEY`, key.trim());

      // 2. Also attempt server persistence
      await safeFetchJson('/api/ai-engine/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: key.trim() })
      });
      
      // Clear input and refresh status
      setKeysInput(prev => ({ ...prev, [inputKeyName]: '' }));
      await checkStatus();
    } catch (err: any) {
      setError(err.message || `Failed to save ${provider} key`);
    } finally {
      setSavingKey(null);
    }
  };

  const handleRevokeKey = async (provider: string) => {
    if (!window.confirm(isFr ? `Révoquer la clé pour ${provider} ?` : `Revoke API key for ${provider}?`)) return;
    try {
      localStorage.removeItem(`api_key_${provider.toLowerCase()}`);
      localStorage.removeItem(`${provider.toUpperCase()}_API_KEY`);
      await safeFetchJson('/api/ai-engine/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      await checkStatus();
    } catch (err: any) {
      setError(err.message || `Failed to revoke key`);
    }
  };

  const handleTestProvider = async (provider: string) => {
    setTestingProvider(provider);
    try {
      // 1. Try backend test first
      const { ok, data } = await safeFetchJson('/api/ai-engine/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });

      if (ok && data?.success) {
        setTestResults(prev => ({
          ...prev,
          [provider]: {
            success: data.success,
            latencyMs: data.latencyMs,
            message: data.message,
            modelUsed: data.modelUsed
          }
        }));
      } else {
        // 2. Direct browser test fallback
        const clientRes = await clientTestProvider(provider);
        setTestResults(prev => ({
          ...prev,
          [provider]: clientRes
        }));
      }
      await checkStatus();
    } catch (err: any) {
      // 3. Client test on exception
      const clientRes = await clientTestProvider(provider);
      setTestResults(prev => ({
        ...prev,
        [provider]: clientRes
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleResetRateLimits = async () => {
    setResettingLimits(true);
    try {
      await safeFetchJson('/api/ai-engine/reset-rate-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      await checkStatus();
    } catch (err: any) {
      setError(err.message || 'Error resetting rate limits');
    } finally {
      setResettingLimits(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const ProviderCard = ({ name, providerId, inputKeyName, providerData, icon: Icon }: { name: string, providerId: string, inputKeyName: keyof typeof keysInput, providerData: any, icon: any }) => {
    const isConfigured = providerData?.configured;
    const isRateLimited = providerData?.rateLimited;
    const cooldownSec = providerData?.cooldownRemainingSeconds || 0;
    const statusText = !isConfigured ? 'MISSING KEY' : isRateLimited ? `RATE LIMITED (${cooldownSec}s)` : 'ACTIVE / READY';
    const testRes = testResults[providerId];
    
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-zinc-700 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Icon size={64} />
        </div>
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConfigured && !isRateLimited ? 'bg-emerald-500/10 text-emerald-400' : isRateLimited ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
              {isConfigured && !isRateLimited ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg tracking-wide">{name}</h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                Success: {providerData?.successCount || 0} | Errors: {providerData?.errorCount || 0}
                {providerData?.maskedKey && <span className="ml-2 text-zinc-500">[{providerData.maskedKey}]</span>}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md border ${
            isConfigured && !isRateLimited
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : isRateLimited
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {statusText}
          </span>
        </div>
        
        {providerData?.lastError && (
          <div className="bg-red-950/30 border border-red-900/40 p-2.5 rounded-lg text-[11px] text-red-300 font-mono truncate" title={providerData.lastError}>
            <span className="font-bold">Last Error:</span> {providerData.lastError}
          </div>
        )}

        {testRes && (
          <div className={`p-2.5 rounded-lg text-[11px] font-mono border ${
            testRes.success 
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' 
              : 'bg-red-950/30 border-red-800/50 text-red-300'
          }`}>
            <span className="font-bold">{testRes.success ? '✅ Test Réussi :' : '❌ Erreur Test :'}</span> {testRes.message}
            {testRes.latencyMs > 0 && <span className="ml-2 text-zinc-400 font-normal">({testRes.latencyMs}ms{testRes.modelUsed ? ` • ${testRes.modelUsed}` : ''})</span>}
          </div>
        )}

        <div className="z-10 mt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Models Available:</p>
            {isConfigured && (
              <button
                onClick={() => handleTestProvider(providerId)}
                disabled={testingProvider === providerId}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
              >
                {testingProvider === providerId ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                {isFr ? 'Tester le Moteur' : 'Test Provider'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {providerData?.models?.map((model: string) => (
              <span key={model} className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-zinc-300 font-mono">
                {model}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800/50">
            <input
              type="password"
              placeholder={isConfigured ? "Update API Key..." : "Enter API Key..."}
              value={keysInput[inputKeyName]}
              onChange={(e) => setKeysInput(prev => ({ ...prev, [inputKeyName]: e.target.value }))}
              className="flex-1 bg-zinc-950 border border-zinc-800 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#E85D42] font-mono"
            />
            <button
              onClick={() => handleSaveKey(providerId, inputKeyName)}
              disabled={!keysInput[inputKeyName] || savingKey === providerId}
              className="bg-[#E85D42] hover:bg-[#D45037] text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingKey === providerId ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isFr ? 'Sauvegarder' : 'Save'}
            </button>
            {isConfigured && (
              <button
                onClick={() => handleRevokeKey(providerId)}
                title={isFr ? "Révoquer la clé" : "Revoke key"}
                className="p-2 bg-zinc-950 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Cpu size={20} className="text-[#E85D42]" />
            {isFr ? 'Configuration des Modèles IA' : 'AI Models Configuration'}
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            {isFr ? 'Gérez les clés API, testez chaque moteur et vérifiez la santé des IA déployées.' : 'Manage API keys, test individual providers, and inspect AI health.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetRateLimits}
            disabled={resettingLimits}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <Zap size={14} className={resettingLimits ? 'animate-spin' : ''} />
            {isFr ? 'Réinitialiser Quotas' : 'Reset Quotas'}
          </button>
          <button 
            onClick={checkStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {isFr ? 'Rafraîchir' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Backend API Server & Hosting Mode Configuration Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-[#E85D42]" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wide">
              {isFr ? 'Connectivité Serveur Backend API' : 'Backend API Connectivity'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {status?.isClientDirect ? (
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> {isFr ? 'Mode Direct Navigateur (Actif)' : 'Direct Client Mode (Active)'}
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> {isFr ? 'Serveur Backend Connecté' : 'Backend Server Connected'}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          {isFr
            ? 'Si votre application est hébergée sur un domaine statique (ex: Firebase Hosting, Vercel), vous pouvez connecter un serveur backend Express externe ou utiliser directement les clés API depuis le navigateur sans aucun serveur requis.'
            : 'If hosted on a static provider (Firebase Hosting, Vercel), you can specify an external Express backend URL or use direct client keys.'}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isFr ? "URL du backend (ex: https://perspective-api.up.railway.app) ou vide pour le même domaine" : "Backend URL or empty for same-origin"}
              value={backendUrlInput}
              onChange={(e) => setBackendUrlInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#E85D42] font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestBackendConnection}
              disabled={backendTesting}
              className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              {backendTesting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {isFr ? 'Tester' : 'Test'}
            </button>
            <button
              onClick={handleSaveBackendUrl}
              className="px-4 py-2.5 bg-[#E85D42] hover:bg-[#D45037] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <Save size={13} />
              {isFr ? 'Enregistrer' : 'Save'}
            </button>
          </div>
        </div>

        {backendStatusMsg && (
          <div className={`mt-3 p-2.5 rounded-lg text-xs font-mono border flex items-center gap-2 ${
            backendStatusMsg.ok ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
          }`}>
            {backendStatusMsg.ok ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
            <span>{backendStatusMsg.msg}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/50 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-red-400 font-bold text-sm">Diagnostic Info</h4>
            <p className="text-red-300/80 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading && !status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : status && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProviderCard name="Google Gemini" providerId="GEMINI" inputKeyName="gemini" providerData={status.gemini} icon={Server} />
            <ProviderCard name="OpenAI" providerId="OPENAI" inputKeyName="openai" providerData={status.openai} icon={Server} />
            <ProviderCard name="Groq" providerId="GROQ" inputKeyName="groq" providerData={status.groq} icon={Server} />
            <ProviderCard name="OpenRouter" providerId="OPENROUTER" inputKeyName="openrouter" providerData={status.openrouter} icon={Server} />
            <ProviderCard name="Anthropic (Claude)" providerId="ANTHROPIC" inputKeyName="anthropic" providerData={status.anthropic} icon={Server} />
            <ProviderCard name="DeepSeek" providerId="DEEPSEEK" inputKeyName="deepseek" providerData={status.deepseek} icon={Server} />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
              <Key size={16} className="text-[#E85D42]" />
              {isFr ? 'Informations Système' : 'System Information'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Failover Routing</span>
                <span className={`text-xs font-bold ${status.failoverActive ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  {status.failoverActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Orchestrator Mode</span>
                <span className="text-xs font-bold text-[#E85D42]">{status.mode}</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Storytelling Engine</span>
                <span className="text-xs font-bold text-zinc-300">{status.storytellingEngine}</span>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-950/20 border border-blue-900/50 rounded-lg">
              <h4 className="text-blue-400 text-xs font-bold uppercase mb-2">Secrets & Client Resilience</h4>
              <p className="text-zinc-400 text-xs font-mono leading-relaxed">
                Les clés API saisies ci-dessus sont enregistrées localement dans votre navigateur et transmises aux requêtes API sécurisées.
                Même si votre site est déployé de manière statique, les fonctions de réécriture IA, tests de modèles et flux RSS restent 100% opérationnelles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
