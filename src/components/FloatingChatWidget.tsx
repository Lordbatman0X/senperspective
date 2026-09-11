import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { getSafeText } from '../lib/utils';
import { getMessengerContacts, MessengerContact } from '../lib/messengerContacts';
import { fetchAllUsers } from '../firebase/auth';
import { 
  MessengerA11yToolbar, 
  A11ySpeechButton, 
  A11yCopyButton, 
  A11yVoiceInputButton, 
  A11yMessageReactions 
} from './MessengerA11yControls';
import { 
  MessageSquare, X, Minus, Maximize2, Send, Paperclip, 
  Sparkles, ExternalLink, User, Check, CheckCheck, Newspaper, Bot
} from 'lucide-react';

export const FloatingChatWidget: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { 
    directMessages, 
    sendDirectMessage, 
    markDirectMessagesAsRead,
    readerProfile, 
    language, 
    siteSettings, 
    articles,
    friends,
    activeMessengerContact,
    setActiveMessengerContact,
    messengerTextScale
  } = useStore();

  const auth = useAuth();
  // Merge auth-context users (live fetch, includes online status) with store users
  // (persisted across browsers/devices so contacts always appear even before the
  // auth context finishes loading).
  const authUsers = auth?.allUsers || [];
  const storeUsers = useStore(s => s.users) || [];
  const authUserEmails = new Set(authUsers.map(u => (u.email || '').toLowerCase().trim()));
  const allUsers = [
    ...storeUsers.filter(u => !authUserEmails.has((u.email || '').toLowerCase().trim())),
    ...authUsers
  ];

  // Fetch users from Firebase if not available locally
  useEffect(() => {
    const fetchUsersFromServer = async () => {
      if (authUsers.length === 0 && storeUsers.length === 0) {
        try {
          const serverUsers = await fetchAllUsers();
          if (serverUsers && serverUsers.length > 0) {
            const existingEmails = new Set(storeUsers.map((u: any) => (u.email || '').toLowerCase().trim()));
            const newUsers = serverUsers.filter((u: any) => !existingEmails.has((u.email || '').toLowerCase().trim()));
            if (newUsers.length > 0) {
              useStore.setState({ users: [...storeUsers, ...(newUsers as any)] });
            }
          }
        } catch (err) {
          console.warn('[FloatingChat] Could not fetch users from Firebase:', err);
        }
      }
    };
    fetchUsersFromServer();
  }, [authUsers.length, storeUsers.length]);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [showArticlePicker, setShowArticlePicker] = useState(false);

  const userEmail = readerProfile?.email || "visitor@perspective.sn";
  const userEmailLower = userEmail.toLowerCase().trim();

  // Get full contacts list synchronized across the whole application
  const contacts = getMessengerContacts(allUsers, friends, userEmail, language);

  // Synchronized active contact
  const selectedUser = activeMessengerContact || contacts[0]?.email || "contact@perspective.sn";
  const selectedUserLower = selectedUser.toLowerCase().trim();

  // Global window event listener to open floating chat from Header / Drawer
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e.detail?.email) {
        setActiveMessengerContact(e.detail.email);
      }
    };

    window.addEventListener('open-floating-chat' as any, handleOpenChat as any);
    return () => window.removeEventListener('open-floating-chat' as any, handleOpenChat as any);
  }, [setActiveMessengerContact]);

  // Hide floating chat if on /discussion page or /admin portal to avoid overlap
  const isDiscussionPage = location.pathname === '/discussion';
  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isOpen && !isMinimized && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [(directMessages ?? []).length, isOpen, isMinimized, selectedUser]);

  useEffect(() => {
    if (isOpen && !isMinimized && userEmail) {
      markDirectMessagesAsRead(selectedUser || '', userEmail);
    }
  }, [isOpen, isMinimized, selectedUser, (directMessages ?? []).length, userEmail, markDirectMessagesAsRead]);

  if (isDiscussionPage || isAdminPage) {
    return null;
  }

  // Filter messages for current selected contact with case normalization
  const conversation = (directMessages || []).filter(dm => {
    const sLow = (dm.sender || '').toLowerCase().trim();
    const rLow = (dm.receiver || '').toLowerCase().trim();
    return (sLow === userEmailLower && rLow === selectedUserLower) ||
           (sLow === selectedUserLower && rLow === userEmailLower);
  });

  // Calculate unread count strictly from database directMessages
  const unreadCount = (directMessages || []).filter(
    dm => dm.receiver?.toLowerCase().trim() === userEmailLower && !dm.read
  ).length;

  const showBubbleBadge = unreadCount > 0 && (!isOpen || isMinimized);

  const currentContact: MessengerContact = contacts.find(c => ((c.email ?? '').toLowerCase()).trim() === selectedUserLower) || contacts[0] || {
    email: "contact@perspective.sn",
    name: language === "fr" ? "Admin RÃ©daction" : "Editorial Admin",
    role: "Perspective Group",
    avatar: "P",
    isOnline: true
  };

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
      receiver: selectedUser,
      text: inputText.trim() || (language === "fr" ? "Article PartagÃ©" : "Shared Article"),
      attachment: attachmentObj
    });

    setInputText("");
    setSelectedArticleId("");
    setShowArticlePicker(false);
  };

  const currentAccent = siteSettings?.accentColor || "#E85D42";

  const textScaleClass = messengerTextScale === 'xlarge' 
    ? 'text-base leading-relaxed' 
    : messengerTextScale === 'large' 
      ? 'text-sm leading-relaxed' 
      : 'text-xs leading-relaxed';

  // 1. Render Floating Trigger Button (when closed or minimized)
  if (!isOpen || isMinimized) {
    return (
      <aside 
        aria-label={language === "fr" ? "Bulle de messagerie instantanÃ©e" : "Instant messenger bubble"}
        className="fixed bottom-4 right-4 sm:right-6 z-50 flex items-center gap-2 animate-bounceIn"
      >
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label={language === "fr" ? `Ouvrir la messagerie. ${unreadCount} messages non lus.` : `Open messenger. ${unreadCount} unread messages.`}
          className="relative group p-3.5 bg-zinc-900 dark:bg-zinc-950 text-white rounded-full shadow-2xl border-2 border-[#E85D42] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#E85D42]/40"
          style={{ boxShadow: '0 10px 25px -5px rgba(232, 93, 66, 0.4)' }}
          title={language === "fr" ? "Ouvrir la Messagerie Flottante" : "Open Floating Messenger"}
        >
          <MessageSquare size={22} className="text-[#E85D42] group-hover:rotate-6 transition-transform" aria-hidden="true" />
          
          {showBubbleBadge && (
            <span 
              className="absolute -top-1 -right-1 bg-[#E85D42] text-white text-[10px] font-mono font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-md"
              aria-label={`${unreadCount} nouveaux messages`}
            >
              {unreadCount}
            </span>
          )}

          <span className="hidden sm:inline-block max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold font-mono text-zinc-100 pl-0 group-hover:pl-2">
            {language === "fr" ? "Messagerie RÃ©seau" : "Network Chat"}
          </span>
        </button>
      </aside>
    );
  }

  // 2. Render Full Expanded Floating Chat Box (Facebook Messenger Style with Accessibility)
  return (
    <section 
      role="region"
      aria-label={language === "fr" ? "FenÃªtre de messagerie instantanÃ©e" : "Instant chat window"}
      className="fixed bottom-4 right-4 sm:right-6 z-50 w-[350px] sm:w-[400px] h-[540px] bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-scaleUp font-sans"
      style={{ boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}
    >
      {/* Header Bar */}
      <header className="p-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${currentContact.isAi ? 'bg-purple-600 text-white' : 'bg-[#E85D42] text-white'}`}>
              {currentContact.isAi ? <Bot size={15} /> : currentContact.avatar}
            </div>
            {currentContact.isOnline && (
              <span 
                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" 
                title={language === "fr" ? "En ligne" : "Online"}
                aria-label="En ligne"
              />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-zinc-900 dark:text-white truncate leading-tight flex items-center gap-1">
              <span>{currentContact.name}</span>
              {currentContact.isAi && (
                <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[9px] font-mono rounded">
                  IA
                </span>
              )}
            </h2>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
              {currentContact.role}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            aria-label={language === "fr" ? "RÃ©duire la bulle" : "Minimize window"}
            title={language === "fr" ? "RÃ©duire la bulle" : "Minimize window"}
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMessengerContact(selectedUser);
              navigate('/discussion');
              setIsOpen(false);
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            aria-label={language === "fr" ? "Ouvrir en plein Ã©cran (Discussion)" : "Open in fullscreen (Discussion)"}
            title={language === "fr" ? "Plein Ã‰cran / Discussion" : "Open Full Discussion"}
          >
            <Maximize2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            aria-label={language === "fr" ? "Fermer la fenÃªtre" : "Close chat"}
            title={language === "fr" ? "Fermer" : "Close"}
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Accessibility Toolbar: Text Scaling & Audio Controls */}
      <MessengerA11yToolbar compact />

      {/* Synchronized Contacts Tab Selector */}
      <div 
        role="tablist" 
        aria-label={language === "fr" ? "Liste des contacts" : "Contacts list"}
        className="p-2 bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex gap-1.5 overflow-x-auto shrink-0 no-scrollbar"
      >
        {contacts.slice(0, 8).map(c => {
          const isSelected = selectedUserLower === ((c.email ?? '').toLowerCase()).trim();
          return (
            <button
              key={c.email}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveMessengerContact(c.email)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-sans font-bold shrink-0 cursor-pointer transition-all flex items-center gap-1 border ${
                isSelected 
                  ? "bg-[#E85D42] text-white border-[#E85D42] shadow-xs" 
                  : "bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-300/60 dark:border-zinc-700/60 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {c.isAi ? <Bot size={11} /> : <span>{c.avatar}.</span>}
              <span className="truncate max-w-[85px]">{(c.name ?? '').split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Body with Accessibility Log */}
      <div 
        ref={messagesContainerRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={language === "fr" ? `Historique avec ${currentContact.name}` : `Message history with ${currentContact.name}`}
        className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-zinc-50/50 dark:bg-[#0c0c0e] scrollbar-thin"
      >
        {conversation.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 dark:text-zinc-400 space-y-2">
            <MessageSquare size={28} className="text-zinc-400 dark:text-zinc-600" aria-hidden="true" />
            <p className="text-xs font-semibold">
              {language === "fr" ? "Aucun message encore." : "No messages yet."}
            </p>
            <p className="text-[11px] text-zinc-400 max-w-xs">
              {currentContact.isAi
                ? (language === "fr" ? "Posez n'importe quelle question Ã  Abdel sur l'actualitÃ© de Perspective Group !" : "Ask Abdel any question about Perspective Group coverage!")
                : (language === "fr" ? "Engagez la discussion avec ce contact en temps rÃ©el !" : "Start a live conversation with this contact in real time!")}
            </p>
          </div>
        ) : (
          conversation.map(dm => {
            const isMe = (dm.sender || '').toLowerCase().trim() === userEmailLower;
            return (
              <article
                key={dm.id}
                className={`flex flex-col max-w-[88%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <header className="flex items-center gap-1 text-[9px] text-zinc-400 mb-0.5 px-1">
                  <span>{isMe ? (language === "fr" ? "Vous" : "You") : (currentContact.name || dm.sender.split("@")[0])}</span>
                  <span>â€¢</span>
                  <time>{dm.date || "Aujourd'hui"}</time>
                </header>

                <div
                  className={`group relative px-3.5 py-2.5 transition-all shadow-xs ${textScaleClass} ${
                    isMe 
                      ? "text-white rounded-2xl rounded-br-xs" 
                      : "bg-zinc-200/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-bl-xs border border-zinc-300/50 dark:border-zinc-700/50"
                  }`}
                  style={isMe ? { backgroundColor: currentAccent } : {}}
                >
                  <p className="whitespace-pre-wrap break-words">{getSafeText(dm.text, language)}</p>

                  {/* Attachment Card */}
                  {dm.attachment && (
                    <div className="mt-2 p-2 bg-black/10 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg text-[10px] space-y-1">
                      <div className="flex items-center gap-1 font-mono font-bold text-[9px] uppercase tracking-wider text-[#E85D42]">
                        <Newspaper size={11} aria-hidden="true" />
                        <span>{language === "fr" ? "Article PartagÃ©" : "Shared Article"}</span>
                      </div>
                      <p className="font-bold line-clamp-1">
                        {typeof dm.attachment.title === 'object'
                          ? ((dm.attachment.title as any)[language] || (dm.attachment.title as any).fr || (dm.attachment.title as any).en || '')
                          : (dm.attachment.title || '')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (dm.attachment?.link) {
                            navigate(dm.attachment.link);
                            setIsOpen(false);
                          }
                        }}
                        className="w-full mt-1 py-1 bg-white/20 hover:bg-white/30 text-white font-mono text-[9px] uppercase font-bold tracking-wider rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{language === "fr" ? "Consulter" : "View"}</span>
                        <ExternalLink size={10} aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {/* Accessibility Action Buttons inside Message Bubble */}
                  <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-black/10 dark:border-white/10 opacity-80 group-hover:opacity-100 transition-opacity">
                    <A11ySpeechButton messageId={dm.id} text={dm.text} compact />
                    <A11yCopyButton text={dm.text} />
                  </div>
                </div>

                {/* Reactions */}
                <A11yMessageReactions
                  messageId={dm.id}
                  reactions={dm.reactions}
                  userEmail={userEmail}
                />
              </article>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Article Picker Popover */}
      {showArticlePicker && (
        <div 
          role="dialog"
          aria-label={language === "fr" ? "SÃ©lectionner un article Ã  partager" : "Select an article to share"}
          className="p-2.5 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 max-h-36 overflow-y-auto space-y-1 shrink-0 animate-fadeIn"
        >
          <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mb-1 px-1">
            <span>{language === "fr" ? "Joindre un Article RÃ©cent :" : "Attach Recent Article:"}</span>
            <button 
              type="button"
              onClick={() => setShowArticlePicker(false)} 
              className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              aria-label="Fermer la liste des articles"
            >
              <X size={12} />
            </button>
          </div>
          {(articles ?? []).slice(0, 6).map((art, idx) => (
            <button
              key={`${art.id}-${idx}`}
              type="button"
              onClick={() => {
                setSelectedArticleId(art.id);
                setShowArticlePicker(false);
              }}
              className={`w-full text-left p-1.5 rounded text-[11px] truncate cursor-pointer transition-colors block ${
                selectedArticleId === art.id 
                  ? "bg-[#E85D42]/20 text-[#E85D42] font-bold" 
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {art.title?.[language] || art.title?.fr || "Article"}
            </button>
          ))}
        </div>
      )}

      {/* Input Composer Footer with Accessibility Controls */}
      <footer className="p-2.5 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowArticlePicker(!showArticlePicker)}
            className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
              selectedArticleId 
                ? "bg-[#E85D42] text-white" 
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
            }`}
            aria-label={language === "fr" ? "Joindre un article" : "Attach article"}
            title={language === "fr" ? "Joindre un Article" : "Attach Article"}
          >
            <Paperclip size={16} />
          </button>

          {/* Accessibility Voice Input (Speech-to-Text) Button */}
          <A11yVoiceInputButton
            onTranscript={(transcript) => {
              setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
            }}
          />

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={language === "fr" ? "Ã‰crire un message..." : "Write a message..."}
            aria-label={language === "fr" ? `Message pour ${currentContact.name}` : `Message for ${currentContact.name}`}
            className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-sans text-zinc-900 dark:text-white px-3.5 py-2 rounded-full focus:outline-none focus:border-[#E85D42] transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && !selectedArticleId}
            className="p-2 bg-[#E85D42] hover:bg-[#d04a30] disabled:opacity-30 text-white rounded-full transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
            aria-label={language === "fr" ? "Envoyer le message" : "Send message"}
            title={language === "fr" ? "Envoyer" : "Send"}
          >
            <Send size={15} />
          </button>
        </form>
      </footer>
    </section>
  );
};
