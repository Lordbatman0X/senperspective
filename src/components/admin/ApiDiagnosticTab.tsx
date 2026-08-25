import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, RefreshCw, Key, Server, Cpu, Save, Loader2 } from 'lucide-react';
import { useStore } from '../../store';

export function ApiDiagnosticTab() {
  const { language } = useStore();
  const isFr = language === 'fr';
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for API Keys Input
  const [keysInput, setKeysInput] = useState({
    gemini: '',
    openai: '',
    groq: '',
    openrouter: ''
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai-engine/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Error connecting to diagnostic endpoint');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (provider: string, inputKeyName: keyof typeof keysInput) => {
    const key = keysInput[inputKeyName];
    if (!key || key.trim() === '') return;
    
    setSavingKey(provider);
    try {
      const res = await fetch('/api/ai-engine/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key })
      });
      if (!res.ok) throw new Error('Failed to save key');
      
      // Clear input and refresh status
      setKeysInput(prev => ({ ...prev, [inputKeyName]: '' }));
      await checkStatus();
    } catch (err: any) {
      setError(err.message || `Failed to save ${provider} key`);
    } finally {
      setSavingKey(null);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const ProviderCard = ({ name, providerId, inputKeyName, providerData, icon: Icon }: { name: string, providerId: string, inputKeyName: keyof typeof keysInput, providerData: any, icon: any }) => {
    const isReady = providerData?.status === 'ready';
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-zinc-700 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Icon size={64} />
        </div>
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isReady ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {isReady ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            </div>
            <h3 className="font-bold text-white text-lg tracking-wide">{name}</h3>
          </div>
          <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md border ${
            isReady 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isReady ? 'ACTIVE' : 'MISSING KEY'}
          </span>
        </div>
        
        <div className="z-10 mt-2">
          <p className="text-xs text-zinc-400 font-mono mb-2 uppercase tracking-wider">Models Available:</p>
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
              placeholder={isReady ? "Update API Key..." : "Enter API Key..."}
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
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Cpu size={20} className="text-[#E85D42]" />
            {isFr ? 'Configuration des Modèles IA' : 'AI Models Configuration'}
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            {isFr ? 'Gérez les clés API et vérifiez le statut des moteurs d\'IA déployés.' : 'Manage API keys and check the status of deployed AI engines.'}
          </p>
        </div>
        <button 
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {isFr ? 'Rafraîchir' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/50 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-red-400 font-bold text-sm">Diagnostic Error</h4>
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
              <h4 className="text-blue-400 text-xs font-bold uppercase mb-2">Secrets Management</h4>
              <p className="text-zinc-400 text-xs font-mono leading-relaxed">
                API keys entered above are persisted dynamically in the deployment environment and will override base 
                environment variables (<code className="text-zinc-300">process.env</code>). These secrets are encrypted 
                at rest and never exposed to the client.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
