import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { getSafeText } from '../lib/utils';
import { 
  MessageSquare, Send, Paperclip, Search, User, Check, CheckCheck, 
  Sparkles, ExternalLink, Newspaper, Phone, Video, Trash2, ArrowLeft
} from 'lucide-react';

export const DiscussionPage: React.FC = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    directMessages, 
    sendDirectMessage, 
    deleteDirectMessage,
    markDirectMessagesAsRead,
    readerProfile, 
    language, 
    siteSettings, 
    articles,
    friends
  } = useStore();

  const auth = useAuth();
  const allUsers = auth?.allUsers || [];

  useSEO({
    title: 'Messenger',
    description: language === 'fr' 
      ? 'Messagerie directe et échanges avec le réseau Perspective.'
      : 'Direct messaging and dispatches with the Perspective network.'
  });

  const userEmail = readerProfile?.email || "visitor@perspective.sn";
  const myEmailLower = userEmail.toLowerCase().trim();

  // Construct contacts list from real users database + friends list + default contacts
  const contactMap = new Map<string, { email: string; name: string; role: string; avatar: string; status: string }>();

  // Registered Firestore users
  allUsers.forEach(u => {
    const emailLow = u.email.toLowerCase().trim();
    if (emailLow && emailLow !== myEmailLower) {
      contactMap.set(emailLow, {
        email: u.email,
        name: u.name || emailLow.split("@")[0],
        role: u.role || "Member",
        avatar: (u.name || "U").charAt(0).toUpperCase(),
        status: language === "fr" ? "En ligne" : "Online"
      });
    }
  });

  // Friends list
  (friends || []).forEach(f => {
    const emailLow = f.email.toLowerCase().trim();
    if (emailLow && emailLow !== myEmailLower && !contactMap.has(emailLow)) {
      contactMap.set(emailLow, {
        email: f.email,
        name: f.name || emailLow.split("@")[0],
        role: f.role || "Member",
        avatar: (f.name || "U").charAt(0).toUpperCase(),
        status: language === "fr" ? "Ami" : "Friend"
      });
    }
  });

  // Default Editorial / Support contacts
  const defaultContacts = [
    { email: "contact@perspective.sn", name: language === "fr" ? "Admin Rédaction" : "Editorial Admin", role: "Perspective Group", avatar: "P", status: "En ligne" },
    { email: "member@perspective.sn", name: "Mariama Diallo", role: language === "fr" ? "Analyste Éco" : "Eco Analyst", avatar: "M", status: "En ligne" },
    { email: "journalist@perspective.sn", name: language === "fr" ? "Journaliste Sahel" : "Sahel Journalist", role: "Correspondant", avatar: "J", status: "En mission" }
  ];

  defaultContacts.forEach(dc => {
    const emailLow = dc.email.toLowerCase().trim();
    if (emailLow !== myEmailLower && !contactMap.has(emailLow)) {
      contactMap.set(emailLow, dc);
    }
  });

  const contacts = Array.from(contactMap.values());

  const [activeContactEmail, setActiveContactEmail] = useState<string>(contacts[0]?.email || "contact@perspective.sn");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [showArticlePicker, setShowArticlePicker] = useState(false);

  // Sync active contact if search or list updates
  useEffect(() => {
    if (contacts.length > 0 && !contacts.some(c => c.email.toLowerCase() === activeContactEmail.toLowerCase())) {
      setActiveContactEmail(contacts[0].email);
    }
  }, [allUsers, friends]);

  const activeContact = contacts.find(c => c.email.toLowerCase() === activeContactEmail.toLowerCase()) || contacts[0] || {
    email: "contact@perspective.sn", name: "Admin Rédaction", role: "Perspective Group", avatar: "P", status: "En ligne"
  };

  const conversation = (directMessages || []).filter(
    dm => (dm.sender === userEmail && dm.receiver === activeContact.email) ||
          (dm.sender === activeContact.email && dm.receiver === userEmail)
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

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
      const art = articles.find(a => a.id === selectedArticleId || a.slug === selectedArticleId);
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

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentAccent = siteSettings?.accentColor || "#E85D42";

  return (
    <div className="min-h-[calc(100vh-140px)] bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Banner Navigation */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
          >
            <ArrowLeft size={16} />
            <span>{language === 'fr' ? 'Retour' : 'Back'}</span>
          </button>
          <div>
            <h1 className="text-xl font-serif font-black uppercase tracking-wider text-white">
              Messenger
            </h1>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 bg-zinc-950 border-x border-zinc-900 overflow-hidden min-h-[600px]">
        {/* Left Contacts Sidebar */}
        <div className="md:col-span-4 border-r border-zinc-800/80 bg-zinc-900/60 flex flex-col">
          <div className="p-4 border-b border-zinc-800/80 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'fr' ? 'Rechercher un interlocuteur...' : 'Search contacts...'}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-sans text-white focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
            {filteredContacts.map(c => {
              const lastMsg = (directMessages || []).filter(
                dm => (dm.sender === userEmail && dm.receiver === c.email) ||
                      (dm.sender === c.email && dm.receiver === userEmail)
              ).slice(-1)[0];

              const contactUnread = (directMessages || []).filter(
                dm => dm.sender.toLowerCase() === c.email.toLowerCase() && dm.receiver.toLowerCase() === userEmail.toLowerCase() && !dm.read
              ).length;

              const isSelected = activeContactEmail === c.email;

              return (
                <button
                  key={c.email}
                  onClick={() => setActiveContactEmail(c.email)}
                  className={`w-full p-3.5 text-left transition-all cursor-pointer flex items-center gap-3 ${isSelected ? "bg-zinc-800/90 border-l-4 border-[#E85D42]" : "hover:bg-zinc-800/40"}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#E85D42] text-white font-black text-sm font-mono flex items-center justify-center shadow-md">
                      {c.avatar}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-xs font-bold text-white truncate">{c.name}</h4>
                      {lastMsg && (
                        <span className="text-[9px] font-mono text-zinc-500 shrink-0">{lastMsg.date}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">{c.role}</p>
                    {lastMsg && (
                      <p className="text-[11px] text-zinc-500 truncate mt-1">{getSafeText(lastMsg.text, language)}</p>
                    )}
                  </div>

                  {contactUnread > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm">
                      {contactUnread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Discussion Area */}
        <div className="md:col-span-8 flex flex-col bg-[#0b0b0d]">
          {/* Active Contact Header */}
          <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E85D42] text-white font-black text-sm font-mono flex items-center justify-center shadow-md">
                {activeContact.avatar}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeContact.name}</span>
                  <span className="text-[10px] font-mono font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {activeContact.status}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono">{activeContact.role} • {activeContact.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => alert(language === 'fr' ? 'Appel vocal chiffré en cours d\'initialisation...' : 'Encrypted voice call initializing...')}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Voice Call"
              >
                <Phone size={16} />
              </button>
              <button 
                onClick={() => alert(language === 'fr' ? 'Visioconférence sécurisée en cours...' : 'Secured video meeting...')}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Video Meeting"
              >
                <Video size={16} />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#08080a]">
            {conversation.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-3">
                <MessageSquare size={40} className="text-zinc-700" />
                <h3 className="text-sm font-bold text-zinc-300 font-mono">
                  {language === 'fr' ? 'Début de la conversation' : 'Start of conversation'}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  {language === 'fr' 
                    ? 'Transmettez directement vos analyses, questions ou pièces jointes au bureau de rédaction.' 
                    : 'Send your analysis, inquiries, or attachments directly to the editorial team.'}
                </p>
              </div>
            ) : (
              conversation.map(dm => {
                const isMe = dm.sender === readerProfile.email;
                return (
                  <div
                    key={dm.id}
                    className={`flex flex-col max-w-[75%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                  >
                    <span className="text-[10px] font-mono text-zinc-500 mb-1 px-1">
                      {isMe ? (language === "fr" ? "Vous" : "You") : dm.sender.split("@")[0]} • {dm.date}
                    </span>

                    <div className="relative group">
                      <div
                        className={`p-4 text-xs sm:text-sm leading-relaxed transition-all ${isMe ? "text-white rounded-2xl rounded-br-xs shadow-md" : "bg-zinc-900 text-zinc-100 rounded-2xl rounded-bl-xs border border-zinc-800 shadow-md"}`}
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
                      </div>
                      <button
                        onClick={() => deleteDirectMessage(dm.id)}
                        className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-zinc-800/80 hover:bg-rose-600 text-zinc-300 hover:text-white rounded-full transition-all cursor-pointer ${isMe ? "-left-7" : "-right-7"}`}
                        title={language === "fr" ? "Supprimer" : "Delete"}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
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
                <button onClick={() => setShowArticlePicker(false)} className="text-zinc-400 hover:text-white">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {articles.slice(0, 8).map(art => (
                  <button
                    key={art.id}
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

          {/* Message Composer Input */}
          <form onSubmit={handleSend} className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowArticlePicker(!showArticlePicker)}
              className={`p-3 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-mono font-bold ${selectedArticleId ? "bg-[#E85D42] text-white" : "bg-zinc-800 text-zinc-300 hover:text-white"}`}
            >
              <Paperclip size={16} />
              <span className="hidden sm:inline">{selectedArticleId ? (language === 'fr' ? 'Article Joint' : 'Article Attached') : (language === 'fr' ? 'Joindre Article' : 'Attach')}</span>
            </button>

            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={language === "fr" ? "Rédigez votre message..." : "Type your message..."}
              className="flex-1 bg-zinc-950 border border-zinc-800 text-sm font-sans text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#E85D42] transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && !selectedArticleId}
              className="px-5 py-3 bg-[#E85D42] hover:bg-[#d04a30] disabled:opacity-40 text-white font-mono font-bold uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-md flex items-center gap-2"
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
