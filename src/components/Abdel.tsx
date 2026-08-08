import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../store";
import { Compass, X, Send, Bot, RefreshCw, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Article } from "../types";
import { Markdown } from "../components/Markdown";

export function Abdel({ contextArticle }: { contextArticle?: Article }) {
  const { language, setLanguage, theme, toggleTheme } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({ left: -600, right: 20, top: -600, bottom: 20 });
  const [messages, setMessages] = useState<{ role: "user" | "abdel"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const buttonRef = useRef<HTMLDivElement>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  const updateButtonRect = () => {
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  };

  const getCardStyle = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const padding = 16;
    const cardWidth = isMobile ? Math.min(340, screenWidth - 32) : 384;

    if (!buttonRect) {
      return {
        position: "fixed" as const,
        bottom: "90px",
        right: isMobile ? "16px" : "24px",
        width: `${cardWidth}px`,
        maxHeight: "500px",
        zIndex: 100,
      };
    }
    
    // Horizontal calculation
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const idealLeft = buttonCenterX - cardWidth / 2;
    const left = Math.max(padding, Math.min(idealLeft, screenWidth - cardWidth - padding));
    
    // Vertical calculation
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;
    const isLowerHalf = buttonCenterY > screenHeight / 2;
    
    const style: React.CSSProperties = {
      position: "fixed" as const,
      width: `${cardWidth}px`,
      left: `${left}px`,
      zIndex: 100,
    };
    
    if (isLowerHalf) {
      // Place above the button
      const bottomVal = screenHeight - buttonRect.top + 12;
      style.bottom = `${bottomVal}px`;
      style.maxHeight = `${Math.min(500, buttonRect.top - padding - 12)}px`;
    } else {
      // Place below the button
      const topVal = buttonRect.bottom + 12;
      style.top = `${topVal}px`;
      style.maxHeight = `${Math.min(500, screenHeight - buttonRect.bottom - padding - 12)}px`;
    }
    
    return style;
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setDragConstraints({
        left: -window.innerWidth + 120,
        right: 20,
        top: -window.innerHeight + 120,
        bottom: 20
      });
      updateButtonRect();
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateButtonRect();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll);
    updateButtonRect();

    // Small delay to ensure accurate positioning after render
    const timer = setTimeout(updateButtonRect, 50);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [isOpen]);

  const t = {
    yourGuide: language === "fr" ? "Votre guide d'information" : "Your guide through the news",
    placeholder: language === "fr" ? "Posez une question..." : "Ask a question...",
    quickSum: language === "fr" ? "Résumer l'article" : "Summarize article",
    quickWhy: language === "fr" ? "Pourquoi est-ce important ?" : "Why it matters",
    quickActors: language === "fr" ? "Acteurs clés" : "Key actors",
    quickExplain: language === "fr" ? "Expliquer pour un enfant" : "Explain simply",
    quickTimeline: language === "fr" ? "Historique" : "Timeline overview",
    quickTranslate: language === "fr" ? "Traduire en Anglais" : "Translate to French",
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          language,
          context: contextArticle ? {
            title: contextArticle.title?.[language] || 'Untitled',
            category: contextArticle.category,
            tags: contextArticle.tags,
            excerpt: contextArticle.excerpt?.[language] || '',
            body: contextArticle.body?.[language] || ''
          } : null
        })
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "abdel", text: data.response || "No response" }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "abdel", text: language === "fr" ? "Erreur de connexion..." : "Connection error..." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.prompt) {
        setIsOpen(true);
        handleSendRef.current(customEvent.detail.prompt);
      }
    };
    window.addEventListener("trigger_abdel_chat", handleTrigger);
    return () => {
      window.removeEventListener("trigger_abdel_chat", handleTrigger);
    };
  }, []);

  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-x-4 bottom-24 glass border border-white/45 dark:border-zinc-800/80 shadow-2xl flex flex-col overflow-hidden leading-relaxed z-[100] rounded-2xl"
              style={{ height: "460px" }}
            >
              {/* Ergonomic Header with Title, Mode Switch, and Language Selectors */}
              <div className="bg-zinc-900/90 dark:bg-zinc-950/80 backdrop-blur-md text-white p-3 px-4 flex justify-between items-center border-b border-zinc-800/40">
                <div className="flex items-center gap-2.5">
                  {/* Custom designed brand logo */}
                  <div className="relative w-7 h-7 shrink-0 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    <svg viewBox="0 0 100 100" className="w-4 h-4 text-[#E85D42]" fill="none" stroke="currentColor">
                      <circle cx="50" cy="50" r="45" stroke="#E85D42" strokeWidth="2.5" opacity="0.15" />
                      <circle cx="50" cy="50" r="35" stroke="#E85D42" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />
                      <path d="M50 20 L24 75 L40 75 L50 45 L60 75 L76 75 Z" fill="url(#abdelMobileGrad)" stroke="#FDA085" strokeWidth="1" strokeLinejoin="round" />
                      <circle cx="50" cy="45" r="4" fill="white" />
                      <defs>
                        <linearGradient id="abdelMobileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#E85D42" />
                          <stop offset="100%" stopColor="#FDA085" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="flex flex-col text-left">
                    <h3 className="font-extrabold font-sans tracking-wide text-xs flex items-center gap-1.5 text-white">
                      Abdel
                      {messages.length > 0 && (
                        <button onClick={() => setMessages([])} className="text-[8px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded-full transition-colors uppercase tracking-widest font-normal">
                          Clear
                        </button>
                      )}
                    </h3>
                    <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-black leading-none">{t.yourGuide}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleTheme}
                    className="p-1 rounded-none hover:bg-white/10 transition-colors text-zinc-300 hover:text-white"
                    title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                  >
                    {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                  </button>
                  <div className="flex bg-black/40 p-0.5 rounded-none border border-zinc-700">
                    <button
                      onClick={() => setLanguage("fr")}
                      className={`px-1 py-0.2 rounded-none text-[8px] font-bold transition-all duration-200 uppercase tracking-widest ${language === "fr" ? "bg-[#E85D42] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                    >
                      FR
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`px-1 py-0.2 rounded-none text-[8px] font-bold transition-all duration-200 uppercase tracking-widest ${language === "en" ? "bg-[#E85D42] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                    >
                      EN
                    </button>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {messages.length === 0 && (
                  <div className="text-center text-sm text-brand-dark mt-8">
                    <Compass size={40} className="mx-auto mb-2 text-brand-primary opacity-80 animate-[spin_60s_linear_infinite]" strokeWidth={1.5} />
                    <p className="font-medium text-brand-muted">
                      {language === "fr" 
                        ? "Je suis Abdel. Comment puis-je vous aider à décrypter l'actualité aujourd'hui ?"
                        : "I am Abdel. How can I help you understand the news today?"}
                    </p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[85%] p-3 text-sm border shadow-sm relative group rounded-xl ${
                      m.role === "user" 
                        ? "bg-[#E85D42] text-white border-[#E85D42] shadow-sm" 
                        : "glass bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md text-zinc-900 dark:text-zinc-100 border-white/40 dark:border-zinc-800/50"
                    }`}>
                      {m.role === "abdel" ? (
                         <>
                           <Markdown>{m.text}</Markdown>
                           <button 
                             onClick={() => navigator.clipboard.writeText(m.text)}
                             className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-[#E85D42] bg-white/50 dark:bg-zinc-900/50 p-1 rounded-sm shadow-sm"
                             title="Copy"
                           >
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                           </button>
                         </>
                      ) : ( 
                        m.text 
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] p-3 text-sm border glass bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md text-zinc-900 dark:text-zinc-100 border-white/40 dark:border-zinc-800/50 flex items-center gap-2 rounded-xl">
                      <RefreshCw className="animate-spin text-brand-primary" size={14} />
                      <span className="text-xs text-brand-muted uppercase tracking-widest">
                        {language === "fr" ? "Analyse..." : "Analyzing..."}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {contextArticle && messages.length === 0 && (
                <div className="px-4 py-3 bg-white/10 dark:bg-black/25 border-t border-white/20 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-widest">Actions Rapides</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleSend(t.quickSum)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickSum}</button>
                    <button onClick={() => handleSend(t.quickWhy)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickWhy}</button>
                    <button onClick={() => handleSend(t.quickActors)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickActors}</button>
                    <button onClick={() => handleSend(t.quickExplain)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickExplain}</button>
                    <button onClick={() => handleSend(t.quickTimeline)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickTimeline}</button>
                    <button onClick={() => handleSend(t.quickTranslate)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickTranslate}</button>
                  </div>
                </div>
              )}

              {!contextArticle && messages.length === 0 && (
                <div className="px-4 py-3 bg-white/10 dark:bg-black/25 border-t border-white/20 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-widest">Sujets Globaux</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleSend(language === 'fr' ? "Quelles sont les actualités majeures aujourd'hui ?" : "What are the major news today?")} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">Top News Focus</button>
                    <button onClick={() => handleSend(language === 'fr' ? "Fait moi un résumé de la situation au Sénégal." : "Summarize the situation in Senegal.")} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">Geopolitics Analysis</button>
                    <button onClick={() => handleSend(language === 'fr' ? "Aide moi à rechercher un sujet précis." : "Help me research a topic.")} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">Research Assistant</button>
                    <button onClick={() => handleSend(language === 'fr' ? "Analyse les marchés financiers actuels." : "Analyze current financial markets.")} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">Market Watch</button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-white/20 dark:bg-zinc-950/20 border-t border-white/20 dark:border-zinc-800/40 flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                  placeholder={t.placeholder}
                  className="flex-1 px-3 py-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded bg-white/50 dark:bg-zinc-900/40 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500/70 focus:outline-none focus:border-brand-primary/70 backdrop-blur-md"
                />
                <button 
                  onClick={() => handleSend(input)}
                  disabled={loading || !input.trim()}
                  className="bg-brand-primary text-white p-2 hover:bg-[#c94931] transition-colors disabled:opacity-40 flex items-center justify-center rounded-sm"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          drag={true}
          dragMomentum={true}
          dragElastic={0.15}
          dragConstraints={{
            left: -window.innerWidth + 80,
            right: 20,
            top: -window.innerHeight + 100,
            bottom: 20
          }}
          className="fixed bottom-6 right-6 z-[99] select-none cursor-grab active:cursor-grabbing"
        >
          <motion.div
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="glass-accent text-[#E85D42] p-4 rounded-full hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative group"
              title={t.yourGuide}
            >
              <span className="absolute inset-0 rounded-full bg-radial from-[#E85D42]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative w-7 h-7 flex items-center justify-center">
                <div className="absolute inset-0 border border-[#E85D42]/20 rounded-full animate-spin [animation-duration:12s]" />
                <svg viewBox="0 0 100 100" className="w-6 h-6 relative z-10 text-[#E85D42] drop-shadow-[0_2px_10px_rgba(232,93,66,0.35)]" fill="none" stroke="currentColor">
                  <circle cx="50" cy="50" r="45" stroke="#E85D42" strokeWidth="1" opacity="0.15" />
                  <circle cx="50" cy="50" r="35" stroke="#E85D42" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                  <path d="M50 20 L24 75 L40 75 L50 45 L60 75 L76 75 Z" fill="url(#abdelBtnGrad1)" stroke="#FDA085" strokeWidth="1" strokeLinejoin="round" />
                  <circle cx="50" cy="45" r="4" fill="white" className="animate-pulse" />
                  <defs>
                    <linearGradient id="abdelBtnGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E85D42" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E85D42] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E85D42] border border-white dark:border-zinc-900 shadow-md"></span>
              </span>
            </button>
          </motion.div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass border border-white/45 dark:border-zinc-800/80 shadow-2xl flex flex-col overflow-hidden leading-relaxed z-[100]"
            style={getCardStyle()}
          >
            {/* Ergonomic Header with Title, Mode Switch, and Language Selectors */}
            <div className="bg-zinc-900/90 dark:bg-zinc-950/80 backdrop-blur-md text-white p-3 px-4 flex justify-between items-center border-b border-zinc-800/40">
              <div className="flex items-center gap-2.5">
                {/* Custom designed brand logo */}
                <div className="relative w-7 h-7 shrink-0 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  <svg viewBox="0 0 100 100" className="w-4 h-4 text-[#E85D42]" fill="none" stroke="currentColor">
                    <circle cx="50" cy="50" r="45" stroke="#E85D42" strokeWidth="2.5" opacity="0.15" />
                    <circle cx="50" cy="50" r="35" stroke="#E85D42" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />
                    <path d="M50 20 L24 75 L40 75 L50 45 L60 75 L76 75 Z" fill="url(#abdelDeskGrad)" stroke="#FDA085" strokeWidth="1" strokeLinejoin="round" />
                    <circle cx="50" cy="45" r="4" fill="white" />
                    <defs>
                      <linearGradient id="abdelDeskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E85D42" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col text-left">
                  <h3 className="font-extrabold font-sans tracking-wide text-xs flex items-center gap-1.5 text-white">
                    Abdel
                    {messages.length > 0 && (
                      <button onClick={() => setMessages([])} className="text-[9px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded-full transition-colors uppercase tracking-widest font-normal">
                        Clear
                      </button>
                    )}
                  </h3>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-black leading-none">{t.yourGuide}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="p-1 rounded-none hover:bg-white/10 transition-colors text-zinc-300 hover:text-white"
                  title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                >
                  {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                </button>
                <div className="flex bg-black/40 p-0.5 rounded-none border border-zinc-700">
                  <button
                    onClick={() => setLanguage("fr")}
                    className={`px-1 py-0.2 rounded-none text-[8px] font-bold transition-all duration-200 uppercase tracking-widest ${language === "fr" ? "bg-[#E85D42] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                  >
                    FR
                  </button>
                  <button
                    onClick={() => setLanguage("en")}
                    className={`px-1 py-0.2 rounded-none text-[8px] font-bold transition-all duration-200 uppercase tracking-widest ${language === "en" ? "bg-[#E85D42] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                  >
                    EN
                  </button>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-1">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
              {messages.length === 0 && (
                <div className="text-center text-sm text-brand-dark mt-8">
                  <Compass size={40} className="mx-auto mb-2 text-brand-primary opacity-80 animate-[spin_60s_linear_infinite]" strokeWidth={1.5} />
                  <p className="font-medium text-brand-muted">
                    {language === "fr" 
                      ? "Je suis Abdel. Comment puis-je vous aider à décrypter l'actualité aujourd'hui ?"
                      : "I am Abdel. How can I help you understand the news today?"}
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] p-3 text-sm border shadow-sm relative group rounded-xl ${
                    m.role === "user" 
                      ? "bg-[#E85D42] text-white border-[#E85D42]" 
                      : "glass bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md text-zinc-900 dark:text-zinc-100 border-white/40 dark:border-zinc-800/50"
                  }`}>
                    {m.role === "abdel" ? (
                       <>
                         <Markdown>{m.text}</Markdown>
                         <button 
                           onClick={() => navigator.clipboard.writeText(m.text)}
                           className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-[#E85D42] bg-white/50 dark:bg-zinc-900/50 p-1 rounded-sm shadow-sm"
                           title="Copy"
                         >
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                         </button>
                       </>
                    ) : ( 
                      m.text 
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-3 text-sm border glass bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md text-zinc-900 dark:text-zinc-100 border-white/40 dark:border-zinc-800/50 flex items-center gap-2 rounded-xl">
                    <RefreshCw className="animate-spin text-brand-primary" size={14} />
                    <span className="text-xs text-brand-muted uppercase tracking-widest">
                      {language === "fr" ? "Analyse..." : "Analyzing..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {contextArticle && messages.length === 0 && (
              <div className="px-4 py-3 bg-white/10 dark:bg-black/25 border-t border-white/20 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-widest">Actions Rapides</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleSend(t.quickSum)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickSum}</button>
                  <button onClick={() => handleSend(t.quickWhy)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickWhy}</button>
                  <button onClick={() => handleSend(t.quickActors)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickActors}</button>
                  <button onClick={() => handleSend(t.quickExplain)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickExplain}</button>
                  <button onClick={() => handleSend(t.quickTimeline)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickTimeline}</button>
                  <button onClick={() => handleSend(t.quickTranslate)} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">{t.quickTranslate}</button>
                </div>
              </div>
            )}

            {!contextArticle && messages.length === 0 && (
              <div className="px-4 py-3 bg-white/10 dark:bg-black/25 border-t border-white/20 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-widest">Sujets Globaux</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleSend(language === 'fr' ? "Quelles sont les actualités majeures aujourd'hui ?" : "What are the major news today?")} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">Top News Focus</button>
                  <button onClick={() => handleSend(language === 'fr' ? "Fait moi un résumé de la situation au Sénégal." : "Summarize the situation in Senegal.")} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">Geopolitics Analysis</button>
                  <button onClick={() => handleSend(language === 'fr' ? "Aide moi à rechercher un sujet précis." : "Help me research a topic.")} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">Research Assistant</button>
                  <button onClick={() => handleSend(language === 'fr' ? "Analyse les marchés financiers actuels." : "Analyze current financial markets.")} className="text-xs border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 hover:bg-[#E85D42] hover:text-white px-2 py-1 text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm rounded-md">Market Watch</button>
                </div>
              </div>
            )}

            <div className="p-3 bg-white/20 dark:bg-zinc-950/20 border-t border-white/20 dark:border-zinc-800/40 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                placeholder={t.placeholder}
                className="flex-1 px-3 py-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded bg-white/50 dark:bg-zinc-900/40 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500/70 focus:outline-none focus:border-brand-primary/70 backdrop-blur-md"
              />
              <button 
                onClick={() => handleSend(input)}
                disabled={loading || !input.trim()}
                className="bg-brand-primary text-white p-2 hover:bg-[#c94931] transition-colors disabled:opacity-40 flex items-center justify-center rounded-sm"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        ref={buttonRef}
        drag={true}
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={dragConstraints}
        onDragEnd={updateButtonRect}
        onDragTransitionEnd={updateButtonRect}
        className="fixed bottom-6 right-6 z-[100] select-none cursor-grab active:cursor-grabbing"
      >
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="glass-accent text-[#E85D42] p-4 rounded-full hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative group"
            title={t.yourGuide}
          >
            <span className="absolute inset-0 rounded-full bg-radial from-[#E85D42]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-[#E85D42]/30 rounded-full animate-spin [animation-duration:8s]" />
              <svg viewBox="0 0 100 100" className="w-5 h-5 relative z-10 text-[#E85D42] drop-shadow-[0_2px_8px_rgba(232,93,66,0.4)]" fill="none" stroke="currentColor">
                <circle cx="50" cy="50" r="45" stroke="#E85D42" strokeWidth="2.5" opacity="0.15" />
                <circle cx="50" cy="50" r="35" stroke="#E85D42" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />
                <path d="M50 20 L24 75 L40 75 L50 45 L60 75 L76 75 Z" fill="url(#abdelBtnGrad2)" stroke="#FDA085" strokeWidth="1" strokeLinejoin="round" />
                <circle cx="50" cy="45" r="4" fill="white" />
                <defs>
                  <linearGradient id="abdelBtnGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E85D42" />
                    <stop offset="100%" stopColor="#FDA085" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E85D42] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E85D42] border border-white dark:border-zinc-900 shadow-md"></span>
            </span>
          </button>
        </motion.div>
      </motion.div>
    </>
  );
}
