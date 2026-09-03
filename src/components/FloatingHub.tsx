import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../store";
import { db, collection, safeOnSnapshot } from "../lib/mongodb";
import { useAuth } from "../contexts/AuthContext";
import { Bot, MessageSquare, X, Send, Trash2, Paperclip, Check, ChevronDown, Sparkles, RefreshCw, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Article } from "../types";
import { Markdown } from "./Markdown";
import { getAbdelContextualPrompts } from "../lib/abdelPrompts";
import { getSafeText } from "../lib/utils";
import { safeFetchJson } from "../lib/apiUtils";

export function FloatingHub({ contextArticle }: { contextArticle?: Article }) {
  const location = useLocation();
  const {
    language,
    theme,
    toggleTheme,
    readerProfile,
    directMessages,
    sendDirectMessage,
    deleteDirectMessage,
    markDirectMessagesAsRead,
    articles,
    friends,
    abdelPrompts,
    siteSettings,
    updateSiteSettings
  } = useStore();

  const auth = useAuth();
  const allUsers = auth?.allUsers || [];

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"abdel" | "chat">("abdel");
  const [selectedAbdelAi, setSelectedAbdelAi] = useState(siteSettings?.abdelAiProvider || 'auto');

  useEffect(() => {
    if (siteSettings?.abdelAiProvider) {
      setSelectedAbdelAi(siteSettings.abdelAiProvider);
    }
  }, [siteSettings?.abdelAiProvider]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [realFriendsList, setRealFriendsList] = useState<string[]>([]);
  useEffect(() => {
    if (!readerProfile?.email) return;
    const friendsRef = collection(db, "users", readerProfile.email.toLowerCase().trim(), "friends");
    const unsubscribe = safeOnSnapshot(friendsRef, (snapshot) => {
      const list: string[] = [];
      snapshot.forEach((docSnap: any) => list.push(docSnap.id.toLowerCase().trim()));
      setRealFriendsList(list);
    }, (err) => console.warn(err));
    return () => unsubscribe();
  }, [readerProfile?.email]);

  // Compute location-aware Abdel prompts dynamically
  const contextualData = getAbdelContextualPrompts(
    location.pathname,
    contextArticle,
    abdelPrompts
  );
  const currentPrompts = contextualData.prompts[language] || contextualData.prompts.fr || [];
  const currentSectionLabel = contextualData.sectionLabel[language] || contextualData.sectionLabel.fr;
  const currentGreeting = contextualData.greeting[language] || contextualData.greeting.fr;

  // Click outside to close floating window
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Abdel state
  const [abdelMessages, setAbdelMessages] = useState<{ role: "user" | "abdel"; text: string }[]>([]);
  const [abdelInput, setAbdelInput] = useState("");
  const [abdelLoading, setAbdelLoading] = useState(false);
  const abdelEndRef = useRef<HTMLDivElement>(null);
  const abdelMessagesContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  // Contacts: combine real users from Firestore database with friends list
  const userEmail = readerProfile?.email || "visitor@perspective.sn";
  const myEmailLower = userEmail.toLowerCase().trim();

  const contactMap = new Map<string, { name: string; email: string; avatar?: string; role?: string; isOnline?: boolean }>();

  // Only add friends to the FloatingHub chat contact list
  allUsers.forEach(u => {
    const emailLow = u.email.toLowerCase().trim();
    if (emailLow && emailLow !== myEmailLower && realFriendsList.includes(emailLow)) {
      contactMap.set(emailLow, {
        name: u.name || emailLow.split("@")[0],
        email: u.email,
        avatar: (u.name || "U").charAt(0).toUpperCase(),
        role: u.role || "Member",
        isOnline: Boolean(u.isOnline)
      });
    }
  });


  const contactsList = Array.from(contactMap.values());
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const filteredContacts = contactsList.filter(c => 
    c.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (c.role || "").toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Chat state
  const [selectedContact, setSelectedContact] = useState<string>(contactsList[0]?.email || "admin@perspective.sn");
  const [chatInput, setChatInput] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [showArticlePicker, setShowArticlePicker] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync selected contact if contacts change and current isn't valid
  useEffect(() => {
    if (contactsList.length > 0 && !contactsList.some(c => c.email.toLowerCase() === selectedContact.toLowerCase())) {
      setSelectedContact(contactsList[0].email);
    }
  }, [allUsers, friends]);

  const notifications = useStore().notifications || [];
  const unreadNotifsCount = notifications.filter(n => (n.email === userEmail || !n.email) && !n.isRead).length;

  // Unread chat messages count directly from database
  const unreadDMsCount = (directMessages || []).filter(
    dm => dm.receiver?.toLowerCase().trim() === (userEmail || '').toLowerCase().trim() && !dm.read
  ).length;

  const unreadCount = unreadDMsCount + unreadNotifsCount;

  // Conditionally hide the message bubble immediately when the user opens the chat section
  const isChatOpen = isOpen && activeTab === "chat";
  const showLauncherMessageBadge = unreadDMsCount > 0 && !isChatOpen;

  const conversation = (directMessages || []).filter(
    dm => (dm.sender === userEmail && dm.receiver === selectedContact) ||
          (dm.sender === selectedContact && dm.receiver === userEmail)
  );

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === "abdel") {
      if (abdelMessagesContainerRef.current) {
        abdelMessagesContainerRef.current.scrollTo({
          top: abdelMessagesContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      } else {
        abdelEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      if (chatMessagesContainerRef.current) {
        chatMessagesContainerRef.current.scrollTo({
          top: chatMessagesContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [abdelMessages.length, conversation.length, activeTab, isOpen, selectedContact]);

  // Mark unread messages as read when user opens the chat tab or views conversation
  useEffect(() => {
    if (isOpen && activeTab === "chat" && userEmail) {
      markDirectMessagesAsRead(selectedContact, userEmail);
      markDirectMessagesAsRead("", userEmail);
    }
  }, [isOpen, activeTab, selectedContact, conversation.length, userEmail, markDirectMessagesAsRead]);

  // Listen for custom trigger events from the app
  useEffect(() => {
    const handleAbdelTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.prompt) {
        setIsOpen(true);
        setActiveTab("abdel");
        handleSendAbdel(customEvent.detail.prompt);
      }
    };

    const handleChatTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.email) {
        setIsOpen(true);
        setActiveTab("chat");
        setSelectedContact(customEvent.detail.email);
      }
    };

    window.addEventListener("trigger_abdel_chat", handleAbdelTrigger);
    window.addEventListener("open-floating-chat", handleChatTrigger);

    return () => {
      window.removeEventListener("trigger_abdel_chat", handleAbdelTrigger);
      window.removeEventListener("open-floating-chat", handleChatTrigger);
    };
  }, []);

  const handleSendAbdel = async (text: string) => {
    if (!text.trim()) return;
    setAbdelMessages(prev => [...prev, { role: "user", text }]);
    setAbdelInput("");
    setAbdelLoading(true);

    try {
      const { ok, data, error } = await safeFetchJson<{ response?: string }>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          language,
          aiProvider: selectedAbdelAi,
          history: abdelMessages.map(m => ({ role: m.role, text: m.text })),
          locationInfo: {
            pathname: location.pathname,
            section: currentSectionLabel,
            isArticle: !!contextArticle,
            articleTitle: contextArticle?.title?.[language] || contextArticle?.title?.fr || null,
            category: contextArticle?.category || null
          },
          context: contextArticle ? {
            title: contextArticle.title?.[language] || contextArticle.title?.fr || "Untitled",
            category: contextArticle.category,
            tags: contextArticle.tags,
            author: typeof contextArticle.author === "string" ? contextArticle.author : "Perspective Group",
            date: contextArticle.date || "",
            excerpt: contextArticle.excerpt?.[language] || contextArticle.excerpt?.fr || "",
            body: contextArticle.body?.[language] || contextArticle.body?.fr || ""
          } : null
        })
      });

      if (ok && data?.response) {
        setAbdelMessages(prev => [
          ...prev,
          { role: "abdel", text: data.response }
        ]);
      } else {
        setAbdelMessages(prev => [
          ...prev,
          {
            role: "abdel",
            text: data?.response || (language === "fr"
              ? "Abdel est momentanément indisponible. Réessayez dans un instant."
              : "Abdel is temporarily unavailable. Please try again in a moment.")
          }
        ]);
      }
    } catch (err: any) {
      console.error("Abdel chat fetch error:", err);
      setAbdelMessages(prev => [
        ...prev,
        {
          role: "abdel",
          text: language === "fr"
            ? "Une difficulté de connexion est survenue. Veuillez réessayer dans quelques instants."
            : "A connection issue occurred. Please try again in a few moments."
        }
      ]);
    } finally {
      setAbdelLoading(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !selectedArticleId) return;

    let attachmentObj = undefined;
    if (selectedArticleId) {
      const art = articles.find(a => a.id === selectedArticleId);
      if (art) {
        attachmentObj = {
          type: "article" as const,
          title: art.title?.[language] || art.title?.fr || "Article",
          subtitle: art.category,
          link: "/article/" + (art.slug || art.id)
        };
      }
    }

    sendDirectMessage({
      sender: userEmail,
      receiver: selectedContact,
      text: chatInput.trim() || (language === "fr" ? "Article Partagé" : "Shared Article"),
      attachment: attachmentObj
    });

    setChatInput("");
    setSelectedArticleId("");
    setShowArticlePicker(false);
  };

  const t = {
    title: language === "fr" ? "Hub Assistant & Discussion" : "Assistant & Chat Hub",
    abdelTab: language === "fr" ? "Abdel AI" : "Abdel AI",
    chatTab: language === "fr" ? "Messagerie" : "Messenger",
    askAbdelPlaceholder: language === "fr" ? "Posez une question à Abdel..." : "Ask Abdel a question...",
    chatPlaceholder: language === "fr" ? "Écrivez un message..." : "Type a message...",
    sumQuick: language === "fr" ? "Résumer l'article" : "Summarize article",
    whyQuick: language === "fr" ? "Pourquoi est-ce important ?" : "Why it matters",
  };

  return (
    <motion.div 
      ref={containerRef}
      drag={true}
      dragConstraints={{ left: -1000, right: 50, top: -800, bottom: 50 }}
      dragElastic={0.08}
      dragMomentum={false}
      className="fixed bottom-4 right-6 sm:right-10 z-[120] flex flex-col items-end font-sans touch-none select-none cursor-grab active:cursor-grabbing"
    >
      {/* Floating Trigger Bubbles - Abdel AI & Reader Messenger */}
      {!isOpen && (
        <div className="flex items-center gap-2 p-1.5 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl transition-all">
          <button
            type="button"
            onClick={() => {
              setActiveTab("abdel");
              setIsOpen(true);
            }}
            className="group relative flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E85D42] text-white hover:bg-[#d04a30] transition-all cursor-pointer shadow-md"
            title={language === "fr" ? "Discuter avec Abdel AI" : "Chat with Abdel AI"}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800 }}>A</span>
            <span className="text-[11px] tracking-tight hidden sm:inline" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800 }}>Abdel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("chat");
              setIsOpen(true);
            }}
            className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-zinc-800 text-zinc-100 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
            title={language === "fr" ? "Messagerie Lecteurs" : "Reader Messenger"}
          >
            <Send size={15} className="translate-x-[-0.5px] translate-y-[0.5px]" />

            {/* Chat Indicator */}
            {showLauncherMessageBadge && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md">
                {unreadDMsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Expanded Floating Hub Window with Transparent Glass Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[380px] sm:w-[420px] h-[560px] bg-black/65 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
          >
            {/* Header with Tabs */}
            <div className="bg-zinc-900/95 dark:bg-zinc-900/95 px-4 py-3 flex items-center justify-between border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setActiveTab("abdel")}
                    className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "abdel"
                        ? "bg-[#E85D42] text-white shadow-md"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px]" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800 }}>A</span>
                    <span style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800 }} className="text-xs tracking-tight">Abdel</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`relative px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "chat"
                        ? "bg-[#E85D42] text-white shadow-md"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <MessageSquare size={13} />
                    <span>{language === "fr" ? "Messagerie" : "Messenger"}</span>
                    {unreadDMsCount > 0 && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white text-[8px] font-bold rounded-full">
                        {unreadDMsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
                  title={language === "fr" ? "Fermer" : "Close"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB 1: ABDEL AI */}
            {activeTab === "abdel" ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
                {/* Greeting banner */}
                <div className="p-3 bg-zinc-900/80 border-b border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#E85D42]/20 text-[#E85D42] flex items-center justify-center text-xs" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800 }}>
                      A
                    </div>
                    <div>
                      <p className="text-xs text-zinc-100" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800 }}>Abdel — {currentSectionLabel}</p>
                      <p className="text-[10px] text-zinc-400">{currentGreeting}</p>
                    </div>
                  </div>

                  {/* Quick Contextual Prompts */}
                  {currentPrompts.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {currentPrompts.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendAbdel(p)}
                          className="shrink-0 text-[10px] bg-zinc-950 border border-zinc-800 hover:border-[#E85D42] text-zinc-300 hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Messages area */}
                <div ref={abdelMessagesContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
                  {abdelMessages.length === 0 ? (
                    <div className="text-center py-12 px-4 text-zinc-400 text-xs space-y-2">
                      <Bot size={28} className="mx-auto text-[#E85D42] opacity-80" />
                      <p className="font-bold text-zinc-200">
                        {language === "fr" ? "Bonjour, je suis Abdel, votre assistant éditorial." : "Hello, I'm Abdel, your editorial assistant."}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {language === "fr" ? "Posez-moi des questions sur les articles, la géopolitique ou le Sénégal." : "Ask me anything about articles, geopolitics, or Senegal."}
                      </p>
                    </div>
                  ) : (
                    abdelMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            m.role === "user"
                              ? "bg-[#E85D42] text-white rounded-br-none"
                              : "bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none font-sans"
                          }`}
                        >
                          {m.role === "abdel" ? (
                            <div className="markdown-body text-xs text-zinc-200">
                              <Markdown>{m.text}</Markdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{m.text}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {abdelLoading && (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs py-2">
                      <div className="w-4 h-4 rounded-full border-2 border-[#E85D42] border-t-transparent animate-spin" />
                      <span>{language === "fr" ? "Abdel réfléchit..." : "Abdel is thinking..."}</span>
                    </div>
                  )}
                  <div ref={abdelEndRef} />
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAbdel(abdelInput);
                  }}
                  className="p-3 bg-zinc-900/80 border-t border-zinc-800/80 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={abdelInput}
                    onChange={(e) => setAbdelInput(e.target.value)}
                    placeholder={t.askAbdelPlaceholder}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#E85D42]"
                  />
                  <button
                    type="submit"
                    disabled={abdelLoading || !abdelInput.trim()}
                    className="p-2.5 bg-[#E85D42] hover:bg-[#d04a30] disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* TAB 2: MESSENGER / CHAT */
              <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
                {/* Contact Search & Slidable Friends Carousel */}
                <div className="p-3 bg-zinc-900/80 border-b border-zinc-800/80 space-y-2.5">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder={language === "fr" ? "Rechercher un contact..." : "Search user or friend..."}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#E85D42]"
                  />

                  {filteredContacts.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 text-center py-1">
                      {language === "fr" ? "Aucun contact trouvé" : "No contacts found"}
                    </p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {filteredContacts.map((c) => {
                        const contactUnread = (directMessages || []).filter(
                          dm => dm.sender.toLowerCase() === c.email.toLowerCase() && dm.receiver.toLowerCase() === userEmail.toLowerCase() && !dm.read
                        ).length;

                        return (
                          <button
                            key={c.email}
                            onClick={() => setSelectedContact(c.email)}
                            className={`shrink-0 w-36 flex items-center gap-2 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                              selectedContact === c.email
                                ? "bg-zinc-800/90 border-[#E85D42] text-white shadow-sm"
                                : "bg-zinc-950/60 border-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                            }`}
                          >
                            <div className="relative w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-xs text-[#E85D42] shrink-0">
                              {c.avatar}
                              {c.isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-pulse" title={language === "fr" ? "En ligne" : "Online"} />
                              )}
                              {contactUnread > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-xs">
                                  {contactUnread}
                                </span>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold truncate text-zinc-200">{c.name}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{c.role}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Messages list */}
                <div ref={chatMessagesContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
                  {conversation.length === 0 ? (
                    <div className="text-center py-12 px-4 text-zinc-400 text-xs">
                      {language === "fr" ? "Aucun message avec ce contact. Envoyez le premier message !" : "No messages with this contact yet. Say hello!"}
                    </div>
                  ) : (
                    conversation.map((dm) => {
                      const isMe = dm.sender.toLowerCase() === userEmail.toLowerCase();
                      return (
                        <div
                          key={dm.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed relative group ${
                              isMe
                                ? "bg-[#E85D42] text-white rounded-br-none"
                                : "bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{getSafeText(dm.text, language)}</p>
                            {dm.attachment && (
                              <div className="mt-2 p-2 bg-black/20 rounded border border-white/10">
                                <span className="text-[9px] uppercase tracking-wider font-bold block opacity-75">
                                  {typeof dm.attachment.subtitle === 'object'
                                    ? ((dm.attachment.subtitle as any)[language] || (dm.attachment.subtitle as any).fr || (dm.attachment.subtitle as any).en || '')
                                    : (dm.attachment.subtitle || "Article Partagé")}
                                </span>
                                <p className="text-xs font-bold">
                                  {typeof dm.attachment.title === 'object'
                                    ? ((dm.attachment.title as any)[language] || (dm.attachment.title as any).fr || (dm.attachment.title as any).en || '')
                                    : (dm.attachment.title || '')}
                                </p>
                              </div>
                            )}

                            {/* Delete Message Button */}
                            <button
                              onClick={() => deleteDirectMessage(dm.id)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-black/40 hover:bg-red-600 rounded text-zinc-300 hover:text-white transition-all cursor-pointer"
                              title={language === "fr" ? "Supprimer le message" : "Delete message"}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[9px] text-zinc-500 mt-1 px-1">
                            {dm.date}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Article attachment preview if selected */}
                {selectedArticleId && (
                  <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-300 truncate">
                      📎 {language === "fr" ? "Article attaché" : "Attached article"}
                    </span>
                    <button
                      onClick={() => setSelectedArticleId("")}
                      className="text-red-400 hover:text-red-300 text-[10px] font-bold cursor-pointer"
                    >
                      {language === "fr" ? "Retirer" : "Remove"}
                    </button>
                  </div>
                )}

                {/* Article picker popup */}
                {showArticlePicker && (
                  <div className="p-3 bg-zinc-900 border-t border-zinc-800 max-h-40 overflow-y-auto space-y-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono uppercase text-zinc-400">
                        {language === "fr" ? "Sélectionner un article" : "Select an article"}
                      </span>
                      <button onClick={() => setShowArticlePicker(false)} className="text-zinc-400 hover:text-white text-xs">✕</button>
                    </div>
                    {articles.slice(0, 10).map(art => (
                      <button
                        key={art.id}
                        onClick={() => {
                          setSelectedArticleId(art.id);
                          setShowArticlePicker(false);
                        }}
                        className="w-full text-left p-1.5 rounded hover:bg-zinc-800 text-xs text-zinc-300 truncate"
                      >
                        {art.title?.[language] || art.title?.fr || "Article"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chat input form */}
                <form onSubmit={handleSendChat} className="p-3 bg-zinc-900/80 border-t border-zinc-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowArticlePicker(!showArticlePicker)}
                    className="p-2 text-zinc-400 hover:text-[#E85D42] hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                    title={language === "fr" ? "Attacher un article" : "Attach article"}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={t.chatPlaceholder}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#E85D42]"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#E85D42] hover:bg-[#d04a30] text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
