import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { getSafeText } from '../lib/utils';
import { 
  MessageSquare, X, Minus, Maximize2, Send, Paperclip, 
  Sparkles, ExternalLink, User, Check, CheckCheck, Newspaper
} from 'lucide-react';

export const FloatingChatWidget: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    directMessages, 
    sendDirectMessage, 
    markDirectMessagesAsRead,
    readerProfile, 
    language, 
    siteSettings, 
    articles 
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedUser, setSelectedUser] = useState("contact@perspective.sn");
  const [inputText, setInputText] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [showArticlePicker, setShowArticlePicker] = useState(false);

  // Contacts directory
  const contacts = [
    { email: "contact@perspective.sn", name: language === "fr" ? "Admin Rédaction" : "Editorial Admin", role: "Perspective Group", avatar: "P" },
    { email: "member@perspective.sn", name: "Mariama Diallo", role: language === "fr" ? "Analyste Éco" : "Eco Analyst", avatar: "M" },
    { email: "kadersdiaz3@gmail.com", name: "Kader Diaz", role: "Directeur Éditorial", avatar: "K" },
    { email: "journalist@perspective.sn", name: language === "fr" ? "Journaliste Sahel" : "Sahel Journalist", role: "Correspondant", avatar: "J" }
  ];

  // Global window event listener to open floating chat from Header / Drawer
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e.detail?.email) {
        setSelectedUser(e.detail.email);
      }
    };

    window.addEventListener('open-floating-chat' as any, handleOpenChat as any);
    return () => window.removeEventListener('open-floating-chat' as any, handleOpenChat as any);
  }, []);

  // Hide floating chat if on /discussion page or /admin portal to avoid overlap
  const isDiscussionPage = location.pathname === '/discussion';
  const isAdminPage = location.pathname.startsWith('/admin');

  const userEmail = readerProfile?.email || "visitor@perspective.sn";

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [directMessages, isOpen, isMinimized, selectedUser]);

  useEffect(() => {
    if (isOpen && !isMinimized && userEmail) {
      markDirectMessagesAsRead(selectedUser || '', userEmail);
    }
  }, [isOpen, isMinimized, selectedUser, directMessages.length, userEmail, markDirectMessagesAsRead]);

  if (isDiscussionPage || isAdminPage) {
    return null;
  }

  // Filter messages for current selected contact
  const conversation = (directMessages || []).filter(
    dm => (dm.sender === userEmail && dm.receiver === selectedUser) ||
          (dm.sender === selectedUser && dm.receiver === userEmail)
  );

  // Calculate unread count strictly from database directMessages
  const unreadCount = (directMessages || []).filter(
    dm => dm.receiver?.toLowerCase().trim() === (userEmail || '').toLowerCase().trim() && !dm.read
  ).length;

  const showBubbleBadge = unreadCount > 0 && (!isOpen || isMinimized);

  const currentContact = contacts.find(c => c.email === selectedUser) || contacts[0];

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
      receiver: selectedUser,
      text: inputText.trim() || (language === "fr" ? "Article Partagé" : "Shared Article"),
      attachment: attachmentObj
    });

    setInputText("");
    setSelectedArticleId("");
    setShowArticlePicker(false);
  };

  const currentAccent = siteSettings?.accentColor || "#E85D42";

  // 1. Render Floating Trigger Button (when closed or minimized)
  if (!isOpen || isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 sm:right-6 z-50 flex items-center gap-2 animate-bounceIn">
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="relative group p-3.5 bg-zinc-900 dark:bg-zinc-950 text-white rounded-full shadow-2xl border-2 border-[#E85D42] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          style={{ boxShadow: '0 10px 25px -5px rgba(232, 93, 66, 0.4)' }}
          title={language === "fr" ? "Ouvrir la Messagerie Flottante" : "Open Floating Messenger"}
        >
          <MessageSquare size={22} className="text-[#E85D42] group-hover:rotate-6 transition-transform" />
          
          {showBubbleBadge && (
            <span className="absolute -top-1 -right-1 bg-[#E85D42] text-white text-[10px] font-mono font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-md">
              {unreadCount}
            </span>
          )}

          <span className="hidden sm:inline-block max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold font-mono text-zinc-100 pl-0 group-hover:pl-2">
            {language === "fr" ? "Discussion Directe" : "Direct Chat"}
          </span>
        </button>
      </div>
    );
  }

  // 2. Render Full Expanded Floating Chat Box (Facebook Messenger Style)
  return (
    <div 
      className="fixed bottom-4 right-4 sm:right-6 z-50 w-[340px] sm:w-[380px] h-[500px] bg-zinc-900 dark:bg-zinc-950 text-zinc-100 rounded-2xl shadow-2xl border border-zinc-800 flex flex-col overflow-hidden animate-scaleUp"
      style={{ boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}
    >
      {/* Header Bar */}
      <div className="p-3 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#E85D42] text-white font-black text-xs font-mono flex items-center justify-center shadow-sm">
              {currentContact.avatar}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate leading-tight">
              {currentContact.name}
            </h4>
            <p className="text-[10px] text-zinc-400 truncate font-mono">
              {currentContact.role}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={language === "fr" ? "Réduire la bulle" : "Minimize tab"}
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => {
              navigate('/discussion');
              setIsOpen(false);
            }}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={language === "fr" ? "Plein Écran / Discussion" : "Open Full Discussion"}
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={language === "fr" ? "Fermer" : "Close"}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Contacts Tab Selector */}
      <div className="p-2 bg-zinc-950/60 border-b border-zinc-800/60 flex gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
        {contacts.map(c => (
          <button
            key={c.email}
            onClick={() => setSelectedUser(c.email)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider shrink-0 cursor-pointer transition-all flex items-center gap-1 ${selectedUser === c.email ? "bg-[#E85D42] text-white shadow-xs" : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"}`}
          >
            <span>{c.avatar}.</span>
            <span className="truncate max-w-[80px]">{c.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#0a0a0c]">
        {conversation.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 space-y-2">
            <MessageSquare size={28} className="text-zinc-700" />
            <p className="text-xs font-mono">
              {language === "fr" ? "Aucun message encore." : "No messages yet."}
            </p>
            <p className="text-[11px] text-zinc-600">
              {language === "fr" ? "Engagez la discussion avec la rédaction !" : "Start a conversation with the team!"}
            </p>
          </div>
        ) : (
          conversation.map(dm => {
            const isMe = dm.sender === readerProfile.email;
            return (
              <div
                key={dm.id}
                className={`flex flex-col max-w-[88%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <span className="text-[8px] font-mono text-zinc-500 mb-0.5 px-1">
                  {isMe ? (language === "fr" ? "Vous" : "You") : dm.sender.split("@")[0]} • {dm.date}
                </span>

                <div
                  className={`px-3 py-2 text-xs leading-relaxed transition-all ${isMe ? "text-white rounded-2xl rounded-br-xs shadow-xs" : "bg-zinc-800/90 text-zinc-100 rounded-2xl rounded-bl-xs border border-zinc-700/50 shadow-xs"}`}
                  style={isMe ? { backgroundColor: currentAccent } : {}}
                >
                  <p className="whitespace-pre-wrap break-words">{getSafeText(dm.text, language)}</p>

                  {/* Attachment Card */}
                  {dm.attachment && (
                    <div className="mt-2 p-2 bg-zinc-950/90 border border-zinc-800 rounded-lg text-[10px] space-y-1">
                      <div className="flex items-center gap-1 text-[#E85D42] font-mono font-bold text-[9px] uppercase">
                        <Newspaper size={11} />
                        <span>{language === "fr" ? "Article Partagé" : "Shared Article"}</span>
                      </div>
                      <p className="font-bold text-zinc-100 line-clamp-1">
                        {typeof dm.attachment.title === 'object'
                          ? ((dm.attachment.title as any)[language] || (dm.attachment.title as any).fr || (dm.attachment.title as any).en || '')
                          : (dm.attachment.title || '')}
                      </p>
                      <button
                        onClick={() => {
                          if (dm.attachment?.link) {
                            navigate(dm.attachment.link);
                            setIsOpen(false);
                          }
                        }}
                        className="w-full mt-1 py-1 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-[9px] uppercase font-bold tracking-wider rounded border border-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>{language === "fr" ? "Lire l'Article" : "Read Article"}</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Article Picker Popover */}
      {showArticlePicker && (
        <div className="p-2.5 bg-zinc-950 border-t border-zinc-800 max-h-36 overflow-y-auto space-y-1 shrink-0 animate-fadeIn">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1 px-1">
            <span>{language === "fr" ? "Joindre un Article :" : "Attach Article:"}</span>
            <button onClick={() => setShowArticlePicker(false)} className="text-zinc-500 hover:text-zinc-300">
              <X size={12} />
            </button>
          </div>
          {articles.slice(0, 6).map((art, idx) => (
            <button
              key={`${art.id}-${idx}`}
              onClick={() => {
                setSelectedArticleId(art.id);
                setShowArticlePicker(false);
              }}
              className={`w-full text-left p-1.5 rounded text-[11px] truncate cursor-pointer transition-colors block ${selectedArticleId === art.id ? "bg-[#E85D42]/20 text-[#E85D42] font-bold" : "text-zinc-300 hover:bg-zinc-900"}`}
            >
              {art.title?.[language] || art.title?.fr || "Article"}
            </button>
          ))}
        </div>
      )}

      {/* Input Composer Footer */}
      <form onSubmit={handleSend} className="p-2.5 bg-zinc-950 border-t border-zinc-800/80 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setShowArticlePicker(!showArticlePicker)}
          className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${selectedArticleId ? "bg-[#E85D42] text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}
          title={language === "fr" ? "Joindre un Article" : "Attach Article"}
        >
          <Paperclip size={14} />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={language === "fr" ? "Écrire un message..." : "Write a message..."}
          className="flex-1 bg-zinc-900 border border-zinc-800 text-xs font-sans text-white px-3 py-2 rounded-xl focus:outline-none focus:border-[#E85D42] transition-colors"
        />

        <button
          type="submit"
          disabled={!inputText.trim() && !selectedArticleId}
          className="p-2 bg-[#E85D42] hover:bg-[#d04a30] disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
