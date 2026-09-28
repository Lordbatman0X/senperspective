import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../store";
import { Compass, X, Send, Bot, RefreshCw, Sun, Moon, Sparkles, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Article } from "../types";
import { Markdown } from "../components/Markdown";
import { getAbdelContextualPrompts, resolveAbdelGreeting } from "../lib/abdelPrompts";
import { getSafeText } from "../lib/utils";
import { askAbdel, normalizeAbdelSlots } from "../lib/abdelRouter";

/**
 * The composer and status strip, defined ONCE.
 *
 * WHY THIS IS A COMPONENT
 * -----------------------
 * The input row, its send button and the suggestion chips were duplicated
 * verbatim between the mobile and desktop panels. Any fix applied to one copy
 * silently left the other broken, and the two could drift apart visually. One
 * component means one implementation, so mobile and desktop behave identically
 * by construction.
 */
function AbdelComposer({
  value,
  onChange,
  onSubmit,
  loading,
  error,
  source,
  onRetry,
  onClear,
  hasMessages,
  placeholder,
  clearLabel,
  retryLabel,
  failLabel,
  viaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  source: string;
  onRetry: () => void;
  onClear: () => void;
  hasMessages: boolean;
  placeholder: string;
  clearLabel: string;
  retryLabel: string;
  failLabel: string;
  viaLabel: string;
}) {
  return (
    <>
      {/*
        Status strip. Shows which backend actually answered, or the precise reason
        it could not. Without this the reader had no way to tell a working answer
        from a silent fallback to the browser engine, and an admin had no way to
        see a misconfigured endpoint.
      */}
      {(error || source) && (
        <div
          className={`px-3 py-2 text-[10.5px] font-mono leading-snug border-t flex items-start gap-2 ${
            error
              ? 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900'
              : 'bg-zinc-100/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-800'
          }`}
        >
          <div className="flex-1 min-w-0 break-words">
            {error ? (
              <>
                <span className="font-bold uppercase tracking-wider">{failLabel} — </span>
                {error}
              </>
            ) : (
              <>
                <span className="font-bold uppercase tracking-wider">{viaLabel} — </span>
                {source}
              </>
            )}
          </div>
          {error ? (
            <button
              onClick={onRetry}
              className="shrink-0 font-bold uppercase tracking-wider underline hover:no-underline cursor-pointer"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      )}

      <div className="p-2.5 bg-white/20 dark:bg-zinc-950/20 border-t border-white/20 dark:border-zinc-800/50 flex items-center gap-2">
        {hasMessages && (
          <button
            onClick={onClear}
            title={clearLabel}
            aria-label={clearLabel}
            className="shrink-0 p-2 text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <RotateCcw size={15} />
          </button>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 min-w-0 px-3 py-2 bg-transparent border border-zinc-200/50 dark:border-zinc-800/50 text-sm outline-none focus:border-[#E85D42] transition-colors"
        />
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          aria-label="Envoyer"
          className="shrink-0 bg-brand-primary text-white p-2 hover:bg-[#c94931] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send size={18} />
        </button>
      </div>
    </>
  );
}

export function Abdel({ contextArticle }: { contextArticle?: Article }) {
  const location = useLocation();
  const { language, setLanguage, theme, toggleTheme, abdelPrompts, siteSettings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({ left: -600, right: 20, top: -600, bottom: 20 });
  const [messages, setMessages] = useState<{ role: "user" | "abdel"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // The real reason Abdel could not answer, and where the answer came from.
  // askAbdel already produces precise diagnostics ("HTTP 401 — invalid key",
  // "timeout 25s", "endpoint a renvoyé du HTML"); previously they were all
  // discarded and replaced by a generic "temporarily unavailable" sentence, which
  // made a misconfiguration impossible to diagnose from the UI.
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contextualData = getAbdelContextualPrompts(
    location.pathname,
    contextArticle,
    abdelPrompts
  );
  const currentPrompts = contextualData.prompts[language] || contextualData.prompts.fr || [];
  const currentSectionLabel = contextualData.sectionLabel[language] || contextualData.sectionLabel.fr;
  
  // ---------------------------------------------------------------------
  // WELCOME MESSAGE — single source of truth: resolveAbdelGreeting().
  // Fixes the old behaviour where the store's hardcoded intro text was
  // indistinguishable from an admin-set value and therefore overrode EVERY
  // contextual greeting (article, admin, sports, saved, search…), and where
  // the custom text bled across languages.
  // ---------------------------------------------------------------------
  const currentGreeting = resolveAbdelGreeting({
    context: contextualData,
    language,
    settings: siteSettings as any
  });

  /**
   * The welcome message is part of the CONVERSATION, not a one-off block that
   * vanished as soon as the reader asked something. It is the first Abdel
   * bubble, stays in the history, and can be copied like any other answer.
   */
  const conversation = React.useMemo(
    () => [
      { role: "abdel" as const, text: currentGreeting, isWelcome: true },
      ...messages.map(m => ({ ...m, isWelcome: false }))
    ],
    [currentGreeting, messages]
  );

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
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [conversation.length, isOpen]);

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
    setError(null);
    setSource("");

    try {
      // ABDEL ROUTER: the four AI backends linked in Admin →
      // "Assistant Abdel & Chat" are tried in priority order (each with its
      // own endpoint, model, provider key and persona), then the in-browser
      // engine as a last resort. Replaces the single hardcoded /api/chat call.
      const result = await askAbdel(
        {
          message: text,
          language,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          contextArticle,
          locationInfo: {
            pathname: location.pathname,
            section: currentSectionLabel,
            isArticle: !!contextArticle,
            articleTitle: contextArticle?.title?.[language] || contextArticle?.title?.fr || null,
            category: contextArticle?.category || null
          }
        },
        normalizeAbdelSlots((siteSettings as any)?.abdelApiSlots),
        // Engine chosen in Admin → APIs & IA. Honoured by the in-browser
        // fallback, which previously had no way to be told which AI to use.
        { preferredProvider: (siteSettings as any)?.abdelPreferredProvider || '' }
      );

      // Surface WHY, not just that it failed. `source` tells the reader whether the
      // answer came from a configured backend or the in-browser engine, so a silent
      // fallback is no longer invisible.
      setSource(result?.source === 'slot'
        ? (result?.slotLabel || result?.slotId || 'backend')
        : (result?.source === 'client' ? 'navigateur' : ''));

      const reply = result?.text?.trim();
      if (reply) {
        setMessages((prev) => [...prev, { role: "abdel", text: reply }]);
      } else {
        // Keep the conversation honest: show the actual cause instead of a
        // friendly sentence that hides a broken endpoint or an expired key.
        const why = result?.error || '';
        setError(why || 'aucune réponse');
        setMessages((prev) => [...prev, {
          role: "abdel",
          text: language === "fr"
            ? "Je n'ai pas pu répondre. Le détail technique est affiché sous la conversation — si vous administrez le site, il indique précisément quoi corriger."
            : "I could not answer. The technical detail is shown below the conversation — if you run the site, it says exactly what to fix."
        }]);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      setMessages((prev) => [...prev, {
        role: "abdel",
        text: language === "fr"
          ? "Une difficulté de connexion est survenue. Veuillez réessayer dans quelques instants."
          : "A connection issue occurred. Please try again in a few moments."
      }]);
    } finally {
      setLoading(false);
    }
  };

  // One-click reset. Previously a conversation could only be discarded by closing
  // and reopening the panel, which on a phone meant finding the launcher again.
  const clearConversation = () => {
    setMessages([]);
    setInput("");
    setError(null);
    setSource("");
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
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
              className="fixed inset-x-4 bottom-24 glass border border-white/45 dark:border-zinc-800/80 shadow-2xl flex flex-col overflow-hidden leading-relaxed z-[100] rounded-2xl"
              style={{ height: "460px" }}
            >
              {/* Ergonomic Header with Title, Mode Switch, and Language Selectors */}
              <div className="bg-zinc-900/90 dark:bg-zinc-950/80 backdrop-blur-md text-white p-3 px-4 flex justify-between items-center border-b border-zinc-800/40">
                <div className="flex items-center gap-2.5">
                  {/* Custom designed brand logo */}
                  <div className="w-7 h-7 rounded-full bg-[#E85D42] text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                    A
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
                  <div className="text-center py-4 px-3 space-y-2.5">
                    <div className="w-10 h-10 mx-auto rounded-full bg-[#E85D42] text-white font-mono font-black text-sm flex items-center justify-center shadow-md">
                      A
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E85D42]/10 border border-[#E85D42]/20 text-[#E85D42] text-[10px] font-mono font-bold uppercase tracking-wider">
                      <Sparkles size={10} />
                      <span className="truncate max-w-[220px]">{currentSectionLabel}</span>
                    </div>
                    {/* The welcome message is now the FIRST bubble of the
                        conversation (see `conversation`), so it stays in the
                        history instead of vanishing on the first question. */}
                  </div>
                )}
                {conversation.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[85%] p-3.5 text-sm border shadow-md relative group rounded-xl ${
                      m.role === "user" 
                        ? "bg-[#E85D42] text-white border-[#E85D42] shadow-sm font-sans" 
                        : "bg-zinc-50 text-zinc-900 border-zinc-200 font-medium abdel-response-bubble"
                    }`}>
                      {m.role === "abdel" ? (
                         <>
                           <div className="markdown-body abdel-text-content text-black font-sans">
                             <Markdown invertInDark={false}>{typeof m.text === 'string' ? m.text : getSafeText(m.text, language)}</Markdown>
                           </div>
                           <button 
                             onClick={() => navigator.clipboard.writeText(typeof m.text === 'string' ? m.text : getSafeText(m.text, language))}
                             className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-[#E85D42] bg-zinc-100 p-1 rounded-sm shadow-xs border border-zinc-200"
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
                    <div className="max-w-[85%] p-3 text-sm border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-zinc-200 dark:border-zinc-700 shadow-md flex items-center gap-2 rounded-xl abdel-response-bubble">
                      <RefreshCw className="animate-spin text-[#E85D42]" size={14} />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">
                        {language === "fr" ? "Analyse..." : "Analyzing..."}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messages.length > 0 && currentPrompts.length > 0 && (
                <div className="px-3 py-2 bg-zinc-950/80 border-t border-zinc-800/60 overflow-x-auto flex gap-1.5 no-scrollbar">
                  {currentPrompts.map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(promptText)}
                      className="shrink-0 text-[10px] bg-zinc-900 border border-zinc-700/70 hover:border-[#E85D42] hover:bg-zinc-800 px-2.5 py-1 rounded-full text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 font-sans"
                    >
                      <Sparkles size={9} className="text-[#E85D42] shrink-0" />
                      <span className="truncate max-w-[200px]">{promptText}</span>
                    </button>
                  ))}
                </div>
              )}

              {messages.length === 0 && (
                <div className="px-4 py-3 bg-white/10 dark:bg-black/40 border-t border-white/20 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#E85D42]" />
                      <span>{currentSectionLabel}</span>
                    </p>
                    {contextArticle && (
                      <span className="text-[9px] font-mono bg-[#E85D42]/20 text-[#E85D42] border border-[#E85D42]/30 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                        {contextArticle.category}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {currentPrompts.map((promptText, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(promptText)}
                        className="text-left text-xs bg-zinc-900/80 border border-zinc-800 hover:border-[#E85D42] px-2.5 py-1.5 rounded-lg text-zinc-200 hover:text-white transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <span className="line-clamp-1">{promptText}</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-[#E85D42]">&rarr;</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AbdelComposer
                value={input}
                onChange={setInput}
                onSubmit={() => handleSend(input)}
                loading={loading}
                error={error}
                source={source}
                onRetry={() => handleSend(input)}
                onClear={clearConversation}
                hasMessages={messages.length > 0}
                placeholder={t.placeholder}
                clearLabel={language === "fr" ? "Effacer la conversation" : "Clear conversation"}
                retryLabel={language === "fr" ? "Réessayer" : "Retry"}
                failLabel={language === "fr" ? "Échec" : "Failed"}
                viaLabel={language === "fr" ? "Réponse via" : "Answered by"}
              />
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
              y: [0, -4, 0],
            }}
            transition={{
              duration: 3,
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
            className="glass border border-white/45 dark:border-zinc-800/80 shadow-2xl flex flex-col overflow-hidden leading-relaxed z-[100]"
            style={getCardStyle()}
          >
            {/* Ergonomic Header with Title, Mode Switch, and Language Selectors */}
            <div className="bg-zinc-900/90 dark:bg-zinc-950/80 backdrop-blur-md text-white p-3 px-4 flex justify-between items-center border-b border-zinc-800/40">
              <div className="flex items-center gap-2.5">
                {/* Custom designed brand logo */}
                <div className="w-7 h-7 rounded-full bg-[#E85D42] text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                  A
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
                <div className="text-center py-4 px-3 space-y-2.5">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#E85D42] text-white font-mono font-black text-sm flex items-center justify-center shadow-md">
                    A
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E85D42]/10 border border-[#E85D42]/20 text-[#E85D42] text-[10px] font-mono font-bold uppercase tracking-wider">
                    <Sparkles size={10} />
                    <span className="truncate max-w-[240px]">{currentSectionLabel}</span>
                  </div>
                  {/* The welcome message is now the FIRST bubble of the
                      conversation (see `conversation`), so it stays in the
                      history instead of vanishing on the first question. */}
                </div>
              )}
              {conversation.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] p-3.5 text-sm border shadow-md relative group rounded-xl ${
                    m.role === "user" 
                      ? "bg-[#E85D42] text-white border-[#E85D42] shadow-sm font-sans" 
                      : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-600 font-medium abdel-response-bubble"
                  }`}>
                    {m.role === "abdel" ? (
                       <>
                         <div className="markdown-body abdel-text-content text-zinc-900 dark:text-zinc-100 font-sans">
                           <Markdown invertInDark={false}>{typeof m.text === 'string' ? m.text : getSafeText(m.text, language)}</Markdown>
                         </div>
                         <button 
                           onClick={() => navigator.clipboard.writeText(typeof m.text === 'string' ? m.text : getSafeText(m.text, language))}
                           className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-[#E85D42] bg-zinc-100 p-1 rounded-sm shadow-xs border border-zinc-200"
                           title="Copy"
                         >
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                         </button>
                       </>
                    ) : ( 
                      getSafeText(m.text, language)
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-3 text-sm border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-600 shadow-md flex items-center gap-2 rounded-xl abdel-response-bubble">
                    <RefreshCw className="animate-spin text-[#E85D42]" size={14} />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      {language === "fr" ? "Analyse..." : "Analyzing..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length > 0 && currentPrompts.length > 0 && (
              <div className="px-3 py-2 bg-zinc-950/80 border-t border-zinc-800/60 overflow-x-auto flex gap-1.5 no-scrollbar">
                {currentPrompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(promptText)}
                    className="shrink-0 text-[10px] bg-zinc-900 border border-zinc-700/70 hover:border-[#E85D42] hover:bg-zinc-800 px-2.5 py-1 rounded-full text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 font-sans"
                  >
                    <Sparkles size={9} className="text-[#E85D42] shrink-0" />
                    <span className="truncate max-w-[200px]">{promptText}</span>
                  </button>
                ))}
              </div>
            )}

            {messages.length === 0 && (
              <div className="px-4 py-3 bg-white/10 dark:bg-black/40 border-t border-white/20 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#E85D42]" />
                    <span>{currentSectionLabel}</span>
                  </p>
                  {contextArticle && (
                    <span className="text-[9px] font-mono bg-[#E85D42]/20 text-[#E85D42] border border-[#E85D42]/30 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                      {contextArticle.category}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {currentPrompts.map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(promptText)}
                      className="text-left text-xs bg-zinc-900/80 border border-zinc-800 hover:border-[#E85D42] px-2.5 py-1.5 rounded-lg text-zinc-200 hover:text-white transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <span className="line-clamp-1">{promptText}</span>
                      <span className="text-[10px] text-zinc-500 group-hover:text-[#E85D42]">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

              <AbdelComposer
                value={input}
                onChange={setInput}
                onSubmit={() => handleSend(input)}
                loading={loading}
                error={error}
                source={source}
                onRetry={() => handleSend(input)}
                onClear={clearConversation}
                hasMessages={messages.length > 0}
                placeholder={t.placeholder}
                clearLabel={language === "fr" ? "Effacer la conversation" : "Clear conversation"}
                retryLabel={language === "fr" ? "Réessayer" : "Retry"}
                failLabel={language === "fr" ? "Échec" : "Failed"}
                viaLabel={language === "fr" ? "Réponse via" : "Answered by"}
                />
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
