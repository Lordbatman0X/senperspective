import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { getSafeText } from '../lib/utils';
import { getMessengerContacts, MessengerContact } from '../lib/messengerContacts';
import { 
  MessengerA11yToolbar, 
  A11ySpeechButton, 
  A11yCopyButton, 
  A11yVoiceInputButton, 
  A11yMessageReactions 
} from '../components/MessengerA11yControls';
import { 
  MessageSquare, Send, Paperclip, Search, User, Check, CheckCheck, 
  Sparkles, ExternalLink, Newspaper, Phone, Video, Trash2, ArrowLeft, Bot
} from 'lucide-react';

export const DiscussionPage: React.FC = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { 
    directMessages, 
    sendDirectMessage, 
    deleteDirectMessage,
    markDirectMessagesAsRead,
    readerProfile, 
    language, 
    siteSettings, 
    articles = [],
    friends = [],
    activeMessengerContact,
    setActiveMessengerContact,
    messengerTextScale
  } = useStore();

  const auth = useAuth();
  const allUsers = auth?.allUsers || [];

  useSEO({
    title: 'Messenger',
    description: language === 'fr' 
      ? 'Messagerie directe et échanges synchronisés avec le réseau Perspective.'
      : 'Direct messaging and synchronized exchanges with the Perspective network.'
  });

  const userEmail = readerProfile?.email || "visitor@senperspective.com";
  const myEmailLower = userEmail.toLowerCase().trim();

  // Get contacts synchronized across all 3 messenger interfaces
  const contacts = getMessengerContacts(allUsers, friends, userEmail, language);

  // Synchronized active contact state
  const activeContactEmail = activeMessengerContact || contacts[0]?.email || "contact@senperspective.com";
  const activeContactEmailLow = activeContactEmail.toLowerCase().trim();

  const [mobileTab, setMobileTab] = useState<'list' | 'chat'>('list');
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [showArticlePicker, setShowArticlePicker] = useState(false);

  const activeContact: MessengerContact = contacts.find(c => ((c.email ?? '').toLowerCase()).trim() === activeContactEmailLow) || contacts[0] || {
    email: "contact@senperspective.com", 
    name: language === "fr" ? "Admin Rédaction" : "Editorial Admin", 
    role: "Perspective Group", 
    avatar: "P", 
    isOnline: true
  };

  const conversation = (directMessages || []).filter(dm => {
    const sLow = (dm.sender || "").toLowerCase().trim();
    const rLow = (dm.receiver || "").toLowerCase().trim();
    return (sLow === myEmailLower && rLow === activeContactEmailLow) ||
           (sLow === activeContactEmailLow && rLow === myEmailLower);
  });

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [conversation.length, activeContactEmail]);

  useEffect(() => {
    if (activeContact?.email && userEmail) {
      markDirectMessagesAsRead(activeContact.email, userEmail);
    }
  }, [activeContact?.email, conversation.length, userEmail, markDirectMessagesAsRead]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedArticleId) return;

    let attachmentObj = undefined;
    if (selectedArticleId) {
      const art = (articles ?? []).find(a => a.id === selectedArticleId || a.slug === selectedArticleId);
      if (art) {
        attachmentObj = {
          type: "article",
          title: art.title?.[language] || art.title?.fr || "Article",
          subtitle: art.category,
          link: "/article/" + (art.slug || art.id)
        };
      }
    }

    sendDirectMessage({
      sender: userEmail,
      receiver: activeContact.email,
      text: inputText.trim() || (language === "fr" ? "Article Partagé" : "Shared Article"),
      attachment: attachmentObj
    });

    setInputText("");
    setSelectedArticleId("");
    setShowArticlePicker(false);
  };

  const currentAccent = siteSettings?.accentColor || "#E85D42";

  const textScaleClass = messengerTextScale === 'xlarge' 
    ? 'text-base sm:text-lg leading-relaxed' 
    : messengerTextScale === 'large' 
      ? 'text-sm sm:text-base leading-relaxed' 
      : 'text-xs sm:text-sm leading-relaxed';

  // Filter contacts by search query
  const filteredContacts = contacts.filter(c => 
    (c.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    ((c.email ?? '').toLowerCase()).includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pt-16">
      {/* Top Messenger Breadcrumb & Switcher */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label={language === 'fr' ? 'Retour' : 'Back'}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E85D42] animate-pulse" />
            <h1 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
              {language === 'fr' ? 'Messagerie Réseau Synchrone' : 'Synchronous Network Messenger'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="hidden sm:inline">{userEmail}</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
            {language === 'fr' ? 'Temps Réel Cloud' : 'Cloud Realtime'}
          </span>
        </div>
      </div>

      {/* Main Split Grid (Sidebar Contacts + Active Chat) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 max-w-7xl w-full mx-auto border-x border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden min-h-[calc(100vh-120px)]">
        
        {/* Left Sidebar Directory (Visible on desktop or when mobileTab is 'list') */}
        <div className={`md:col-span-4 border-r border-zinc-800 flex flex-col bg-zinc-950 ${mobileTab === 'chat' ? 'hidden md:flex' : 'flex'}`}>
          {/* Contacts Search Bar */}
          <div className="p-3 border-b border-zinc-800 bg-zinc-900/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input
                type="text"
                placeholder={language === 'fr' ? "Rechercher un contact..." : "Search contacts..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-[#E85D42] transition-colors"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div 
            role="tablist"
            aria-label={language === 'fr' ? 'Annuaire des contacts' : 'Contacts directory'}
            className="flex-1 overflow-y-auto divide-y divide-zinc-800/40"
          >
            {filteredContacts.map(c => {
              const isSelected = ((c.email ?? '').toLowerCase()).trim() === activeContactEmailLow;
              const contactUnread = (directMessages || []).filter(
                dm => (dm.sender || '').toLowerCase().trim() === ((c.email ?? '').toLowerCase()).trim() &&
                      (dm.receiver || '').toLowerCase().trim() === myEmailLower &&
                      !dm.read
              ).length;

              const lastMsg = (directMessages || []).filter(
                dm => ((dm.sender || '').toLowerCase().trim() === ((c.email ?? '').toLowerCase()).trim() && (dm.receiver || '').toLowerCase().trim() === myEmailLower) ||
                      ((dm.sender || '').toLowerCase().trim() === myEmailLower && (dm.receiver || '').toLowerCase().trim() === ((c.email ?? '').toLowerCase()).trim())
              ).slice(-1)[0];

              return (
                <button
                  key={c.email}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setActiveMessengerContact(c.email);
                    setMobileTab('chat');
                  }}
                  className={`w-full p-3.5 flex items-center gap-3 transition-colors text-left cursor-pointer ${
                    isSelected ? "bg-zinc-800/90 border-l-4 border-[#E85D42]" : "hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                      c.isAi ? 'bg-purple-600 text-white' : 'bg-[#E85D42] text-white'
                    }`}>
                      {c.isAi ? <Bot size={18} /> : c.avatar}
                    </div>
                    {c.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {c.isAi && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 text-[9px] font-mono">IA</span>
                        )}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-1">{lastMsg.date}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">{c.role}</p>
                    {lastMsg && (
                      <p className="text-[11px] text-zinc-500 truncate mt-1">{getSafeText(lastMsg.text, language)}</p>
                    )}
                  </div>

                  {contactUnread > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm animate-pulse">
                      {contactUnread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Discussion Area (Visible on desktop or when mobileTab is 'chat') */}
        <div className={`md:col-span-8 flex flex-col bg-[#0b0b0d] ${mobileTab === 'list' ? 'hidden md:flex' : 'flex'}`}>
          {/* Active Contact Header */}
          <div className="p-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {/* Back button on mobile */}
              <button
                type="button"
                onClick={() => setMobileTab('list')}
                className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-800 cursor-pointer"
                aria-label="Retour aux contacts"
              >
                ←
              </button>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                activeContact.isAi ? 'bg-purple-600 text-white' : 'bg-[#E85D42] text-white'
              }`}>
                {activeContact.isAi ? <Bot size={16} /> : activeContact.avatar}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeContact.name}</span>
                  {activeContact.isAi && (
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 text-[9px] font-mono">IA Abdel</span>
                  )}
                  {activeContact.isOnline && (
                    <span className="text-[10px] font-mono font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {language === "fr" ? "En ligne" : "Online"}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">{activeContact.role} • {activeContact.email}</p>
              </div>
            </div>
            {activeContact.email && (
              <button
                type="button"
                onClick={() => navigate(`/profile/${encodeURIComponent(activeContact.email)}`)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-[#E85D42] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <User size={12} />
                <span>{language === 'fr' ? 'Voir Profil' : 'View Profile'}</span>
              </button>
            )}
          </div>

          {/* Accessibility Toolbar: Text Scaling & Narration */}
          <MessengerA11yToolbar />

          {/* Messages Stream */}
          <div 
            ref={messagesContainerRef} 
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label={language === 'fr' ? `Messages avec ${activeContact.name}` : `Messages with ${activeContact.name}`}
            className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#08080a]"
          >
            {conversation.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-3">
                <MessageSquare size={40} className="text-zinc-700" />
                <h3 className="text-sm font-bold text-zinc-300 font-mono">
                  {language === 'fr' ? 'Début de la conversation' : 'Start of conversation'}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  {activeContact.isAi
                    ? (language === 'fr' 
                        ? 'Abdel est votre assistant éditorial IA. Posez vos questions sur la géopolitique, l\'économie et la culture africaine.'
                        : 'Abdel is your editorial AI assistant. Ask questions on African geopolitics, economics, and culture.')
                    : (language === 'fr' 
                        ? 'Transmettez directement vos analyses, questions ou pièces jointes en temps réel.' 
                        : 'Send your analysis, inquiries, or attachments directly in real-time.')}
                </p>
              </div>
            ) : (
              conversation.map(dm => {
                const isMe = (dm.sender || '').toLowerCase().trim() === myEmailLower;
                return (
                  <article
                    key={dm.id}
                    className={`flex flex-col max-w-[78%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                  >
                    <span className="text-[10px] font-mono text-zinc-500 mb-1 px-1">
                      {isMe ? (language === "fr" ? "Vous" : "You") : dm.sender.split("@")[0]} • {dm.date}
                    </span>

                    <div className="relative group">
                      <div
                        className={`p-4 transition-all shadow-md ${textScaleClass} ${
                          isMe ? "text-white rounded-2xl rounded-br-xs" : "bg-zinc-900 text-zinc-100 rounded-2xl rounded-bl-xs border border-zinc-800"
                        }`}
                        style={isMe ? { backgroundColor: currentAccent } : {}}
                      >
                        <p className="whitespace-pre-wrap break-words">{getSafeText(dm.text, language)}</p>

                        {dm.attachment && (
                          <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[#E85D42] font-mono font-bold text-xs uppercase">
                              <Newspaper size={13} />
                              <span>{language === "fr" ? "Article Partagé" : "Shared Article"}</span>
                            </div>
                            <p className="font-bold text-white text-xs">
                              {typeof dm.attachment.title === 'object'
                                ? ((dm.attachment.title as any)[language] || (dm.attachment.title as any).fr || (dm.attachment.title as any).en || '')
                                : (dm.attachment.title || '')}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (dm.attachment?.link) navigate(dm.attachment.link);
                              }}
                              className="mt-2 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs uppercase font-bold tracking-wider rounded-lg border border-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>{language === "fr" ? "Ouvrir l'Article" : "Open Article"}</span>
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        )}

                        {/* Accessibility Actions */}
                        <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-white/10 opacity-80 group-hover:opacity-100 transition-opacity">
                          <A11ySpeechButton messageId={dm.id} text={dm.text} />
                          <A11yCopyButton text={dm.text} />
                        </div>
                      </div>

                      {/* Message Reactions */}
                      <A11yMessageReactions
                        messageId={dm.id}
                        reactions={dm.reactions}
                        userEmail={userEmail}
                      />

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => deleteDirectMessage(dm.id)}
                        className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-zinc-800/80 hover:bg-rose-600 text-zinc-300 hover:text-white rounded-full transition-all cursor-pointer ${isMe ? "-left-7" : "-right-7"}`}
                        title={language === "fr" ? "Supprimer" : "Delete"}
                        aria-label="Supprimer le message"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Article Picker Tray */}
          {showArticlePicker && (
            <div className="p-3 bg-zinc-900 border-t border-zinc-800 max-h-48 overflow-y-auto space-y-1 shrink-0 animate-fadeIn">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-2 px-1">
                <span>{language === "fr" ? "Sélectionnez un article de la rédaction à joindre :" : "Select article to attach:"}</span>
                <button type="button" onClick={() => setShowArticlePicker(false)} className="text-zinc-400 hover:text-white">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(articles ?? []).slice(0, 8).map(art => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => {
                      setSelectedArticleId(art.id);
                      setShowArticlePicker(false);
                    }}
                    className={`text-left p-2 rounded-lg text-xs truncate cursor-pointer transition-colors border ${selectedArticleId === art.id ? "bg-[#E85D42]/20 border-[#E85D42] text-[#E85D42] font-bold" : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"}`}
                  >
                    {art.title?.[language] || art.title?.fr || "Article"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Composer Input with Accessibility Controls */}
          <form onSubmit={handleSend} className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowArticlePicker(!showArticlePicker)}
              className={`p-3 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-mono font-bold ${selectedArticleId ? "bg-[#E85D42] text-white" : "bg-zinc-800 text-zinc-300 hover:text-white"}`}
              title={language === 'fr' ? 'Joindre un article' : 'Attach an article'}
            >
              <Paperclip size={16} />
              <span className="hidden sm:inline">{selectedArticleId ? (language === 'fr' ? 'Article Joint' : 'Article Attached') : (language === 'fr' ? 'Joindre Article' : 'Attach')}</span>
            </button>

            {/* Voice Input Microphone Button */}
            <A11yVoiceInputButton
              onTranscript={(transcript) => {
                setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
              }}
            />

            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={language === "fr" ? `Écrire à ${activeContact.name}...` : `Message ${activeContact.name}...`}
              aria-label={language === "fr" ? `Message pour ${activeContact.name}` : `Message for ${activeContact.name}`}
              className="flex-1 bg-zinc-950 border border-zinc-800 text-sm font-sans text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#E85D42] transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && !selectedArticleId}
              className="px-5 py-3 bg-[#E85D42] hover:bg-[#d04a30] disabled:opacity-40 text-white font-mono font-bold uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-md flex items-center gap-2"
              aria-label={language === "fr" ? "Envoyer le message" : "Send message"}
            >
              <span>{language === "fr" ? "Envoyer" : "Send"}</span>
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
