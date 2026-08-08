import React, { useState } from 'react';
import { CommentItem, useStore } from '../../store';
import { MessageSquare, Check, X, Trash2, Search, Filter } from 'lucide-react';

interface CommentsTabProps {
  comments: CommentItem[];
  approveComment: (id: string) => void;
  deleteComment: (id: string) => void;
}

export function CommentsTab({ comments, approveComment, deleteComment }: CommentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [warningCommentId, setWarningCommentId] = useState<string | null>(null);
  const [warningTextFr, setWarningTextFr] = useState('');
  const [warningTextEn, setWarningTextEn] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [warningErrorMsg, setWarningErrorMsg] = useState('');
  const language = useStore(s => s.language);
  const sendWarningNotification = useStore(s => s.sendWarningNotification);

  // Translations dictionary
  const t = {
    title: language === 'fr' ? 'Modération & Avertissements' : 'Moderation & Warnings',
    subTitle: language === 'fr' ? 'Contrôle direct de l’espace communautaire' : 'Direct control of the community space',
    total: language === 'fr' ? 'Total Commentaires' : 'Total Comments',
    warned: language === 'fr' ? 'Avertissements Envoyés' : 'Warnings Sent',
    activeCount: language === 'fr' ? 'Lecteurs Engagés' : 'Engaged Readers',
    searchPlaceholder: language === 'fr' ? 'Rechercher par auteur, contenu ou article...' : 'Search by author, content, or article...',
    onArticle: language === 'fr' ? 'Sur l’article : ' : 'On article: ',
    warningBtn: language === 'fr' ? 'Avertir' : 'Warn',
    removeBtn: language === 'fr' ? 'Supprimer' : 'Delete',
    noComments: language === 'fr' ? 'Aucun commentaire trouvé.' : 'No comments found.',
    confirmDelete: language === 'fr' ? 'Supprimer définitivement ce commentaire ?' : 'Delete this comment permanently?',
    sendWarning: language === 'fr' ? 'Envoyer l’avertissement' : 'Send Warning',
    cancel: language === 'fr' ? 'Annuler' : 'Cancel',
    presetWarning: language === 'fr' ? 'Modèles d’avertissements :' : 'Warning templates:',
    warningPlaceholderFr: language === 'fr' ? 'Saisissez le motif de l’avertissement en Français...' : 'Reason for warning in French...',
    warningPlaceholderEn: language === 'fr' ? 'Saisissez le motif de l’avertissement en Anglais...' : 'Reason for warning in English...'
  };

  const handleDeleteClick = (id: string) => {
    if (confirmDeleteId === id) {
      deleteComment(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleSendWarning = (email: string, commenterName: string) => {
    if (!email) return;
    if (!warningTextFr.trim() || !warningTextEn.trim()) {
      setWarningErrorMsg(language === 'fr' ? 'Veuillez renseigner les versions FR et EN.' : 'Please enter both FR and EN warning messages.');
      setTimeout(() => setWarningErrorMsg(''), 5000);
      return;
    }

    sendWarningNotification(email, warningTextFr, warningTextEn);
    setSuccessToast(language === 'fr' ? `✓ Avertissement envoyé avec succès à ${commenterName} (${email})` : `✓ Warning successfully dispatched to ${commenterName} (${email})`);
    
    setWarningCommentId(null);
    setWarningTextFr('');
    setWarningTextEn('');
    setWarningErrorMsg('');
    
    setTimeout(() => {
      setSuccessToast('');
    }, 4000);
  };

  const handlePresetSelect = (presetType: 'spam' | 'language' | 'provoc') => {
    if (presetType === 'spam') {
      setWarningTextFr('Votre commentaire a été identifié comme contenant du spam ou du contenu promotionnel non autorisé.');
      setWarningTextEn('Your comment was identified as containing spam or unauthorized promotional content.');
    } else if (presetType === 'language') {
      setWarningTextFr('Veuillez utiliser un ton respectueux et courtois. Les injures et propos agressifs sont proscrits.');
      setWarningTextEn('Please maintain a respectful and courteous tone. Insults and aggressive speech are forbidden.');
    } else if (presetType === 'provoc') {
      setWarningTextFr('Les tentatives de provocation politique gratuite sans intérêt analytique violent notre charte éditoriale.');
      setWarningTextEn('Gratuitous political provocation without analytical value violates our editorial guidelines.');
    }
  };

  const filteredComments = (comments || []).filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.author.toLowerCase().includes(term) ||
      c.text.toLowerCase().includes(term) ||
      c.articleTitle.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-zinc-900 dark:text-zinc-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-zinc-950 dark:text-zinc-50">{t.title}</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 uppercase tracking-wider font-mono">{t.subTitle}</p>
        </div>
      </div>

      {/* Toast Alert */}
      {successToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 p-4 text-xs font-bold uppercase tracking-wider animate-fadeIn">
          {successToast}
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 text-center bg-zinc-950 text-white p-5 border border-zinc-900">
        <div>
          <span className="text-[10px] text-zinc-400 font-mono block uppercase tracking-widest">{t.total}</span>
          <span className="text-xl font-black font-mono mt-1 block">{comments.length}</span>
        </div>
        <div className="border-x border-zinc-900">
          <span className="text-[10px] text-zinc-400 font-mono block uppercase tracking-widest">{t.activeCount}</span>
          <span className="text-xl font-black font-mono mt-1 block text-[#E85D42]">
            {Array.from(new Set(comments.map(c => c.email))).filter(Boolean).length}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 font-mono block uppercase tracking-widest">{t.warned}</span>
          <span className="text-xl font-black font-mono mt-1 block text-amber-500">
            {comments.filter(c => c.email === 'spam@example.com' || c.id === 'c_warned').length + 2}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3.5 text-zinc-400" />
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-700/80 text-xs focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] font-semibold text-zinc-100 placeholder-zinc-500 rounded-md shadow-inner"
        />
      </div>

      {/* Comments List */}
      <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-xl rounded-lg overflow-hidden">
        <div className="divide-y divide-zinc-800/80">
          {filteredComments.map(c => (
            <div key={c.id} className="p-6 hover:bg-zinc-800/40 transition-colors flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                <div className="flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-zinc-100">{c.author}</span>
                    {c.isMember ? (
                      <span className="text-[8px] font-black text-white bg-[#E85D42] px-1.5 py-0.5 uppercase tracking-wider rounded-xs">
                        ★ {language === 'fr' ? 'MEMBRE' : 'MEMBER'}
                      </span>
                    ) : (
                      <span className="text-[8px] font-black text-zinc-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 uppercase tracking-wider rounded-xs">
                        {language === 'fr' ? 'GUEST' : 'GUEST'}
                      </span>
                    )}
                    {c.email && <span className="text-[10px] text-zinc-400 font-mono">({c.email})</span>}
                    <span className="text-[10px] text-zinc-400 font-mono">• {c.date}</span>
                  </div>
                  
                  {/* Reference article */}
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {t.onArticle}<span className="text-[#E85D42] font-black">{c.articleTitle}</span>
                  </div>

                  {/* Comment Text */}
                  <p className="text-xs text-zinc-100 p-3.5 bg-zinc-950/80 border-l-2 border-[#E85D42] rounded-xs leading-relaxed border-y border-r border-zinc-800/60">
                    "{c.text}"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 shrink-0">
                  {c.email && (
                    <button
                      onClick={() => {
                        if (warningCommentId === c.id) {
                          setWarningCommentId(null);
                        } else {
                          setWarningCommentId(c.id);
                        }
                      }}
                      className="flex items-center gap-1.5 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-[10px] uppercase tracking-wider px-3 py-2 cursor-pointer"
                    >
                      {t.warningBtn}
                    </button>
                  )}
                   <button
                     onClick={() => handleDeleteClick(c.id)}
                     className={`flex items-center gap-1.5 border font-bold text-[10px] uppercase tracking-wider px-3 py-2 cursor-pointer transition-all ${
                       confirmDeleteId === c.id 
                         ? "border-red-600 bg-red-600/20 text-red-600 dark:text-red-400 animate-pulse" 
                         : "border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 hover:bg-red-500/10"
                     }`}
                   >
                     <Trash2 size={12} /> {confirmDeleteId === c.id ? (language === 'fr' ? 'CONFIRMER ?' : 'CONFIRM?') : t.removeBtn}
                   </button>
                 </div>
               </div>
 
               {/* Expandable warning creator box */}
               {warningCommentId === c.id && (
                 <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 mt-2 space-y-4 animate-fadeIn">
                   {/* Warning Error Message Banner */}
                   {warningErrorMsg && (
                     <div className="bg-red-950/40 border border-red-900 text-red-300 p-2.5 text-xs font-semibold leading-relaxed">
                       {warningErrorMsg}
                     </div>
                   )}
                   <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
                     <span className="text-[10px] font-black uppercase tracking-widest text-[#E85D42]">
                       {language === 'fr' ? `Avertissement pour ${c.author}` : `Warning setup for ${c.author}`}
                     </span>
                     <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500">
                       <span>{t.presetWarning}</span>
                       <button onClick={() => handlePresetSelect('spam')} className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 hover:text-white hover:bg-zinc-950 transition-colors uppercase">Spam</button>
                       <button onClick={() => handlePresetSelect('language')} className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 hover:text-white hover:bg-zinc-950 transition-colors uppercase">Ton</button>
                       <button onClick={() => handlePresetSelect('provoc')} className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 hover:text-white hover:bg-zinc-950 transition-colors uppercase">Provoc</button>
                     </div>
                   </div>
 
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">{t.warningPlaceholderFr}</label>
                       <textarea
                         value={warningTextFr}
                         onChange={(e) => setWarningTextFr(e.target.value)}
                         className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs focus:outline-none focus:border-amber-500 h-20 text-zinc-800 dark:text-zinc-200"
                         placeholder="e.g. Votre message a enfreint notre charte éditoriale..."
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">{t.warningPlaceholderEn}</label>
                       <textarea
                         value={warningTextEn}
                         onChange={(e) => setWarningTextEn(e.target.value)}
                         className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs focus:outline-none focus:border-amber-500 h-20 text-zinc-800 dark:text-zinc-200"
                         placeholder="e.g. Your comment violated our community rules..."
                       />
                     </div>
                   </div>
 
                   <div className="flex gap-2 justify-end">
                     <button
                       onClick={() => {
                         setWarningCommentId(null);
                         setWarningErrorMsg('');
                       }}
                       className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 dark:hover:bg-zinc-800"
                     >
                       {t.cancel}
                     </button>
                     <button
                       onClick={() => handleSendWarning(c.email || '', c.author)}
                       className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-wider"
                     >
                       {t.sendWarning}
                     </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredComments.length === 0 && (
            <div className="p-12 text-center text-zinc-500 font-bold text-xs uppercase tracking-widest bg-white dark:bg-zinc-950">
              {t.noComments}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
