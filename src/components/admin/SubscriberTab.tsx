import React, { useState } from 'react';
import { SubscriberItem, useStore } from '../../store';
import { Users, Trash2, Search, Send, Check, Sparkles, Megaphone } from 'lucide-react';

interface SubscriberTabProps {
  subscribers: SubscriberItem[];
  deleteSubscriber: (email: string) => void;
}

export function SubscriberTab({ subscribers, deleteSubscriber }: SubscriberTabProps) {
  const language = useStore(s => s.language);
  const [searchTerm, setSearchTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [campaignSuccess, setCampaignSuccess] = useState<string | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<{ subject: string; date: string; count: number }[]>([
    { subject: 'Focus Hebdo: L’Élan Économique Sénégalais', date: '2026-06-12', count: 3 },
    { subject: 'Perspectives News: Les Chantiers de la Cohabitation', date: '2026-06-18', count: 3 }
  ]);

  const handleDeleteClick = (email: string) => {
    if (confirmDeleteEmail === email) {
      deleteSubscriber(email);
      setConfirmDeleteEmail(null);
    } else {
      setConfirmDeleteEmail(email);
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    if (subscribers.length === 0) {
      setBroadcastError(language === 'fr' ? 'Aucun abonné actif pour le moment.' : 'You have no active newsletter subscribers to send to!');
      setTimeout(() => setBroadcastError(null), 5000);
      return;
    }

    const newLog = {
      subject: subject.trim(),
      date: new Date().toISOString().split('T')[0],
      count: subscribers.length
    };

    setCampaignLogs([newLog, ...campaignLogs]);
    setCampaignSuccess(subject.trim());
    setBroadcastError(null);
    setSubject('');
    setBody('');

    setTimeout(() => {
      setCampaignSuccess(null);
    }, 5000);
  };

  const filtered = (subscribers || []).filter(s =>
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
          {language === 'fr' ? 'Gestion des Newsletters' : 'Newsletter Management'}
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
          {language === 'fr' ? 'Diffusion de courriels et gestion des abonnés' : 'Email broadcast and subscriber directory'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Publisher broadcast form */}
        <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900/80 backdrop-blur-md p-6 shadow-xl rounded-lg">
          <h3 className="text-base font-bold uppercase tracking-wider mb-4 border-b border-zinc-800 pb-3 flex items-center gap-2 text-white">
            <Megaphone size={18} className="text-[#E85D42]" /> 
            {language === 'fr' ? 'Envoyer une Newsletter' : 'Broadcast Campaign'}
          </h3>
          
          {campaignSuccess && (
            <div className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 py-3 px-4 text-xs font-bold mb-6 rounded-md">
              <span className="flex items-center gap-2">
                <Check size={16} /> {language === 'fr' ? `Newsletter "${campaignSuccess}" envoyée avec succès à ${subscribers.length} abonnés !` : `Newsletter "${campaignSuccess}" dispatched to ${subscribers.length} subscribers!`}
              </span>
            </div>
          )}

          {broadcastError && (
            <div className="bg-red-950/80 text-red-300 border border-red-500/30 py-3 px-4 text-xs font-bold mb-6 rounded-md">
              <span>⚠️ {broadcastError}</span>
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                {language === 'fr' ? 'Objet de l\'email' : 'Subject Line'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'fr' ? "ex: Perspective Spécial : Économie & Décryptage" : "e.g. Perspective Special : Economic Brief"}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  {language === 'fr' ? 'Contenu de la newsletter' : 'Newsletter Body'}
                </label>
                <span className="text-[10px] text-[#E85D42] font-bold uppercase flex items-center gap-1">
                  <Sparkles size={10} /> {language === 'fr' ? 'Variable personnalisée : {EMAIL}' : 'Variable: {EMAIL}'}
                </span>
              </div>
              <textarea
                rows={9}
                required
                placeholder={language === 'fr' ? `Chers lecteurs de Perspective,\n\nVoici notre décryptage exclusif des réalités socio-économiques...\n\nL'équipe de Rédaction.` : `Dear Perspective readers,\n\nHere is our weekly analysis...\n\nEditorial Team.`}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-3 text-xs leading-relaxed focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={subscribers.length === 0}
                className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] disabled:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 shadow-md transition-all cursor-pointer rounded-xs"
              >
                <Send size={14} /> {language === 'fr' ? 'Diffuser la campagne' : 'Send Broadcast'}
              </button>
            </div>
          </form>

          {/* Past Campaigns Log */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-3">
              {language === 'fr' ? 'Historique des envois' : 'Broadcast History'}
            </h4>
            <div className="space-y-2">
              {campaignLogs.map((log, i) => (
                <div key={i} className="flex justify-between items-center bg-zinc-950/80 p-3 text-xs border border-zinc-800 rounded-md">
                  <div>
                    <span className="font-bold block text-zinc-100">{log.subject}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{language === 'fr' ? 'Envoyé sans erreur' : 'Dispatched'}</span>
                  </div>
                  <div className="text-right text-[10px] text-zinc-400 font-mono">
                    <span className="block font-bold">{log.date}</span>
                    <span>{log.count} {language === 'fr' ? 'destinataires' : 'recipients'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Subscriber List */}
        <div className="border border-zinc-800 bg-zinc-900/80 backdrop-blur-md p-6 shadow-xl rounded-lg flex flex-col justify-between h-fit">
          <div className="space-y-4">
            <h3 className="text-base font-bold uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2 text-white">
              <Users size={18} className="text-[#E85D42]" /> {language === 'fr' ? `Abonnés (${filtered.length})` : `Subscribers (${filtered.length})`}
            </h3>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder={language === 'fr' ? "Rechercher un abonné..." : "Search subscribers..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-xs focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filtered.map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-zinc-950/80 p-3 text-xs border border-zinc-800 hover:border-zinc-700 transition-colors rounded-md">
                  <div>
                    <span className="font-bold truncate text-zinc-100 block max-w-[150px]" title={s.email}>{s.email}</span>
                    <span className="text-[10px] text-zinc-400 block font-mono">{language === 'fr' ? 'Inscrit le' : 'Since'} {s.date}</span>
                  </div>
                  {confirmDeleteEmail === s.email ? (
                    <button
                      onClick={() => handleDeleteClick(s.email)}
                      className="p-1 px-2 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 uppercase animate-pulse transition-all cursor-pointer rounded-xs"
                    >
                      {language === 'fr' ? 'Supprimer ?' : 'Confirm?'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteClick(s.email)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer rounded-xs"
                      title="Supprimer abonné"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}

              {filtered.length === 0 && (
                <p className="text-xs text-zinc-400 italic text-center py-6">{language === 'fr' ? 'Aucun abonné trouvé.' : 'No subscribers found.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
