import React, { useEffect, useState } from 'react';
import { useParams, Navigate, Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { Markdown } from '../components/Markdown';
import { renderNeutralAvatar } from '../components/AccountDrawer';
import { SharedItemCard } from '../components/SharedItemCard';
import { InternalShareModal } from '../components/InternalShareModal';
import { Article } from '../types';
import { Bookmark, MessageSquare, Send, User, LogOut, Globe, ShieldCheck, Check, ThumbsUp, ThumbsDown, Edit2, Trash2, Share2, Copy, Play, Pause, Square, Volume2, Mail, Film, ExternalLink } from 'lucide-react';
import { calculateReadingTime, formatRelativeDate, extractYoutubeId, getSafeText, formatCategory } from '../lib/utils';
import { getSafeImageUrl, DEFAULT_FALLBACK_IMAGE } from '../lib/imageUtils';
import { motion, AnimatePresence } from 'motion/react';
import { useSEO } from '../hooks/useSEO';

function MiniCarouselCard({ article }: { article: Article }) {
  const language = useStore((s) => s.language);
  return (
    <Link to={`/article/${article.slug}`} className="group min-w-[240px] w-[240px] flex-shrink-0 square-card block overflow-hidden">
      <div 
        className="w-full h-32 bg-cover bg-center border-b border-zinc-200 dark:border-zinc-800 transition-colors"
        style={{ backgroundImage: `url(${getSafeImageUrl(article.featuredImage || article.imageUrl)})` }}
      />
      <div className="p-4 bg-transparent">
        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">
          {formatCategory(article.category, language)}
        </div>
        <h4 className="font-bold text-sm leading-snug text-brand-muted group-hover:text-[#E85D42] dark:group-hover:text-[#E85D42] transition-colors mb-2 line-clamp-2">
          {article.title?.[language] || article.title?.fr || 'Sans titre'}
        </h4>
        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          {formatRelativeDate(article.date, language)}
        </div>
      </div>
    </Link>
  );
}

export function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { 
    articles, 
    language, 
    savedArticles, 
    toggleSavedArticle, 
    ads, 
    comments, 
    addComment, 
    addSubscriber,
    readerProfile,
    setReaderProfile,
    setShowSignUpModal,
    setAuthTab,
    updateCommentText,
    deleteComment,
    likeComment,
    dislikeComment,
    sendDirectMessage,
    setShowProfileDrawer,
    setActiveProfileTab
  } = useStore();

  useEffect(() => {
    if (location.hash === '#comments' || window.location.hash === '#comments') {
      const timer = setTimeout(() => {
        const el = document.getElementById('comments');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [location.hash, id]);
  const [comment, setComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [articleNewsletterEmail, setArticleNewsletterEmail] = useState('');
  const [articleNewsletterSuccess, setArticleNewsletterSuccess] = useState(false);

  // Sharing local state
  const [showInternalShareModal, setShowInternalShareModal] = useState(false);

  // Comment Control edit states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  
  // Custom reading dynamic comfort controls
  const [fontSize, setFontSize] = useState<number>(17);
  const [scrollPercent, setScrollPercent] = useState(0);

  // Playback & Voice synthesization states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [speechPercent, setSpeechPercent] = useState(0);
  const [selectedActor, setSelectedActor] = useState<any | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Pre-load speech voices reliably across browser engines
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Clear running voice speeches when changing route context
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id]);

  // Automatically restart voice when language changes during active playback
  useEffect(() => {
    if (isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeechPercent(0);
      const timer = setTimeout(() => {
        handlePlayVoice();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [language]);

  // Clean HTML markup & markdown tags so the reader reads natural prose
  const cleanTextForSpeech = (rawText: string) => {
    if (!rawText) return '';
    return rawText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/[#*`_~[\]()]/g, ' ') // Strip markdown syntax symbols
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, language === 'fr' ? ' et ' : ' and ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handlePlayVoice = () => {
    if (!('speechSynthesis' in window) || !article) return;

    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    // Text collection extracted strictly according to active language mode
    const currentLang = language === 'fr' ? 'fr' : 'en';
    const rawTitle = article.title?.[currentLang] || (currentLang === 'en' ? article.title?.en : article.title?.fr) || '';
    const rawExcerpt = article.excerpt?.[currentLang] || (currentLang === 'en' ? article.excerpt?.en : article.excerpt?.fr) || '';
    const rawBody = article.body?.[currentLang] || (currentLang === 'en' ? article.body?.en : article.body?.fr) || '';

    const titleText = cleanTextForSpeech(rawTitle);
    const excerptText = cleanTextForSpeech(rawExcerpt);
    const bodyText = cleanTextForSpeech(rawBody);

    const combinedTexts = `${titleText}. ${excerptText}. ${bodyText}`;
    if (!combinedTexts.trim()) return;

    const utterance = new SpeechSynthesisUtterance(combinedTexts);
    const targetLangCode = language === 'fr' ? 'fr-FR' : 'en-US';
    utterance.lang = targetLangCode;
    utterance.rate = playbackRate;

    // Get freshest list of system voices
    const voicesList = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (voicesList && voicesList.length > 0) {
      const targetLangPrefix = language === 'fr' ? 'fr' : 'en';
      const langVoices = voicesList.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(targetLangPrefix));
      
      let bestVoice: SpeechSynthesisVoice | undefined;

      if (language === 'en') {
        // High quality premium English voice selection
        bestVoice = langVoices.find(v => /google us english|google uk english|samantha|siri|natural|enhanced|premium|daniel|alex|karen|microsoft jenny|microsoft guy|microsoft zira|microsoft david|victoria|fiona/i.test(v.name))
          || langVoices.find(v => v.lang.toLowerCase().includes('en-us') || v.lang.toLowerCase().includes('en-gb'))
          || langVoices[0]
          || voicesList.find(v => v.lang.toLowerCase().startsWith('en'));
      } else {
        // High quality premium French voice selection
        bestVoice = langVoices.find(v => /google français|siri|natural|enhanced|premium|thomas|amelie|audrey|hortense|chloe|denis|sixtine|microsoft paul|microsoft hortense/i.test(v.name))
          || langVoices.find(v => v.lang.toLowerCase().includes('fr-fr') || v.lang.toLowerCase().includes('fr-ca'))
          || langVoices[0]
          || voicesList.find(v => v.lang.toLowerCase().startsWith('fr'));
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang || targetLangCode;
      }
    }

    utterance.onboundary = (e) => {
      if (e.charIndex) {
        setSpeechPercent((e.charIndex / combinedTexts.length) * 100);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeechPercent(0);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeechPercent(0);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleStopVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeechPercent(0);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (isSpeaking && !isPaused) {
      // Re-trigger with speech percent offset simulation
      handleStopVoice();
      setTimeout(() => {
        // Simple restart at new rate speed with standard triggers
        handlePlayVoice();
      }, 100);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollPercent(Math.min(100, Math.max(0, progress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [id]);

  // Registration States for new Reader Profiles
  const [regEmail, setRegEmail] = useState('');
  const [regAvatar, setRegAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&fit=crop');
  const [regRole, setRegRole] = useState(language === 'fr' ? 'Membre Perspective' : 'Perspective Member');
  const [toBeMember, setToBeMember] = useState(true);
  const [activeTab, setActiveTab] = useState<'guest' | 'register'>('guest');
  const regName = commentAuthor;
  const setRegName = setCommentAuthor;

  // Simulated Client IP Address Tracking state
  const [simulatedIp, setSimulatedIp] = useState('');

  useEffect(() => {
    // Generate a Realistic West African (Senegal) Dynamic Client IP Range
    const parts = [
      '197',
      Math.floor(Math.random() * 50 + 200).toString(),
      Math.floor(Math.random() * 254).toString(),
      Math.floor(Math.random() * 254 + 1).toString()
    ];
    setSimulatedIp(parts.join('.'));
  }, []);
  
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!trimmedEmail) {
      setEmailError(language === 'fr' ? 'Veuillez saisir votre adresse e-mail.' : 'Please enter your email address.');
      return;
    }
    
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError(language === 'fr' ? 'Veuillez saisir une adresse e-mail valide (ex: nom@domaine.com).' : 'Please enter a valid email address (e.g. name@domain.com).');
      return;
    }
    
    addSubscriber(trimmedEmail);
    setSubscribed(true);
    setEmail('');
  };

  const decodedId = id ? decodeURIComponent(id) : '';
  const article = articles.find(a => 
    a.slug === id || 
    a.id === id || 
    a.slug === decodedId || 
    a.id === decodedId ||
    (a.slug && decodedId && a.slug.toLowerCase() === decodedId.toLowerCase()) ||
    (a.id && decodedId && a.id.toLowerCase() === decodedId.toLowerCase())
  );

  const [isArticleLoading, setIsArticleLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsArticleLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [id]);

  useSEO({
    title: article ? `${article.title?.[language] || article.title?.fr || 'Article'} | The Perspective Group` : 'Perspective Journal Article',
    description: article ? (article.excerpt?.[language] || article.excerpt?.fr) : undefined,
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!article || !comment.trim() || !readerProfile) return;

    addComment({
      id: "comment-" + Date.now().toString() + Math.random().toString(36).substring(4),
      articleId: article.slug || article.id,
      articleTitle: article.title?.[language] || "Untitled",
      author: readerProfile.name,
      email: readerProfile.email,
      text: comment,
      date: new Date().toISOString().split("T")[0],
      isApproved: true,
      isMember: true,
      avatarUrl: readerProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(readerProfile.name)}`
    });

    setComment("");
    setCommentSuccess(true);
    setTimeout(() => {
      setCommentSuccess(false);
    }, 4000);
  };

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleReplySubmit = (e: React.FormEvent, parentId: string, parentCommenter: string, parentEmail?: string) => {
    e.preventDefault();
    if (!article || !replyText.trim() || !readerProfile) return;

    const replyId = "reply-" + Date.now().toString() + Math.random().toString(36).substring(4);
    
    addComment({
      id: replyId,
      articleId: article.slug || article.id,
      articleTitle: article.title?.[language] || "Untitled",
      author: readerProfile.name,
      email: readerProfile.email,
      text: replyText,
      date: new Date().toISOString().split("T")[0],
      isApproved: true,
      isMember: true,
      avatarUrl: readerProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(readerProfile.name)}`,
      parentId: parentId,
      replyTo: parentCommenter
    });

    if (parentEmail && parentEmail.toLowerCase() !== readerProfile.email.toLowerCase()) {
      useStore.getState().addNotification({
        id: "notif-" + Date.now().toString(),
        email: parentEmail,
        text: {
          fr: `${readerProfile.name} a répondu à votre commentaire sur "${article.title?.[language] || 'Untitled'}"`,
          en: `${readerProfile.name} replied to your comment on "${article.title?.[language] || 'Untitled'}"`
        },
        date: new Date().toISOString().split("T")[0],
        isRead: false,
        link: `/article/${article.slug}`
      });
    }

    setReplyText("");
    setActiveReplyId(null);
  };
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!article && (isArticleLoading || articles.length === 0)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-[#E85D42] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
          Chargement de l'article...
        </p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4 font-sans">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Article non trouvé</h2>
        <p className="text-sm text-zinc-500 max-w-md">Cet article n'existe plus ou l'adresse saisie est incorrecte.</p>
        <Link to="/" className="px-5 py-2.5 bg-[#E85D42] hover:bg-[#D45037] text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const isSaved = savedArticles?.includes(article.id) || false;
  const related = articles.filter(a => article.relatedArticleIds?.includes(a.id));
  const carouselRelated = related.length >= 3 ? related : articles.filter(a => a.category === article.category && a.id !== article.id).slice(0, 5);

  const articleAds = ads?.filter(a => a.active && a.position === 'in-article') || [];
  const globalAd = articleAds.length > 0 ? articleAds[Math.floor(Math.random() * articleAds.length)] : null;
  const adImage = article.adImageUrl || globalAd?.imageUrl;
  const adLink = article.adLink || globalAd?.targetUrl;

  const t = {
    brief: language === 'fr' ? 'BRIEF PERSPECTIVE' : 'PERSPECTIVE BRIEF',
    briefSubtitle: language === 'fr' ? "L'ESSENTIEL" : 'KEY TAKEAWAYS',
    whatHappened: language === 'fr' ? "Ce qui s'est passé" : 'What happened',
    whyItMatters: language === 'fr' ? "Pourquoi c'est important" : 'Why it matters',
    watchNext: language === 'fr' ? 'À surveiller ensuite' : 'What to watch next',
    forces: language === 'fr' ? 'Forces Structurelles' : 'Structural Forces',
    actors: language === 'fr' ? 'Acteurs Clés' : 'Key Actors',
    timeline: language === 'fr' ? 'Chronologie' : 'Timeline',
    related: language === 'fr' ? 'Articles Similaires' : 'Similar Articles',
    back: language === 'fr' ? 'Retour' : 'Back',
    saveWord: language === 'fr' ? 'Sauvegarder' : 'Save',
    savedWord: language === 'fr' ? 'Sauvegardé' : 'Saved',
    commentsTitle: language === 'fr' ? 'Commentaires' : 'Comments',
    leaveComment: language === 'fr' ? 'Laissez un commentaire...' : 'Leave a comment...',
    send: language === 'fr' ? 'Envoyer' : 'Post',
    adLabel: language === 'fr' ? 'Publicité' : 'Advertisement'
  };

  const articleBodyText = article.body?.[language] || article.body?.fr || article.body?.en || '';
  const cleanYoutubeId = extractYoutubeId(article.youtubeVideoId || '');

  return (
    <>
      {/* Dynamic Smooth Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-zinc-200/50 dark:bg-zinc-800/50 z-50">
        <motion.div 
          className="h-full bg-[#E85D42]"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      <motion.article 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl mx-auto px-4 py-8 lg:py-12"
      >
        
        {/* Title & Excerpt above image */}
        <header className="mb-10 text-center max-w-4xl mx-auto relative">
          <Link to={`/category/${formatCategory(article.category, language).toLowerCase()}`} className="inline-block bg-brand-primary text-white text-xs font-bold uppercase tracking-widest px-3 py-1 mb-6 hover:bg-[#c94931] transition-colors">
            {formatCategory(article.category, language)}
          </Link>
          <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight mb-6 text-brand-dark">
            {article.title?.[language] || 'Untitled'}
          </h1>
          <p className="text-xl md:text-2xl text-brand-muted font-medium mb-8 leading-snug">
            {article.excerpt?.[language] || ''}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest text-brand-muted pt-4 mb-6">
            <span>{article.author}</span>
            <span className="w-1 h-1 bg-brand-primary rounded-full"></span>
            <span>{new Date(article.date).toLocaleDateString()}</span>
            <span className="w-1 h-1 bg-brand-primary rounded-full"></span>
            <span>{calculateReadingTime(article, language)}</span>
            <span className="hidden sm:block w-1 h-1 bg-brand-primary rounded-full"></span>
            
             <button 
               onClick={() => toggleSavedArticle(article.id)}
               className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest border px-3 py-1.5 transition-colors ${isSaved ? 'text-brand-primary border-brand-primary bg-brand-primary/10' : 'text-brand-dark border-brand-border hover:bg-brand-white/50'}`}
             >
               <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} strokeWidth={2} />
               {isSaved ? t.savedWord : t.saveWord}
             </button>

             {/* Share Button */}
             <button 
               onClick={() => setShowInternalShareModal(true)}
               className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest border border-brand-border text-brand-dark hover:bg-brand-white/50 px-3 py-1.5 transition-colors cursor-pointer"
             >
               <Share2 size={14} strokeWidth={2} />
               {language === 'fr' ? 'PARTAGER' : 'SHARE'}
             </button>
          </div>

          {/* Subtle Ergonomic Reading Settings */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-y border-zinc-200/50 dark:border-zinc-800/50 py-3 max-w-lg mx-auto select-none">
            {/* Reading Comfort (Font Size) */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-zinc-500 shrink-0">A</span>
              <input 
                type="range"
                min="13"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-24 h-[1px] bg-zinc-300 dark:bg-zinc-800 rounded-none appearance-none cursor-pointer accent-[#E85D42] outline-none"
                style={{
                  background: `linear-gradient(to right, #E85D42 0%, #E85D42 ${((fontSize - 13) / 11) * 100}%, rgba(150, 150, 150, 0.2) ${((fontSize - 13) / 11) * 100}%, rgba(150, 150, 150, 0.2) 100%)`
                }}
              />
              <span className="text-xs font-bold text-[#E85D42] shrink-0 font-sans">A</span>
            </div>

            <span className="w-1.5 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full"></span>

            {/* Live Audio */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <Volume2 size={11} className="text-[#E85D42]" />
                <span className="text-[9px] font-serif font-black tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">
                  {language === 'fr' ? 'AUDIO LIVE' : 'LIVE AUDIO'}
                </span>
                {isSpeaking && !isPaused && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                )}
              </div>

              {/* Progress Bar (Visible only when playing/paused) */}
              {isSpeaking && (
                <div className="w-12 bg-zinc-300 dark:bg-zinc-800 h-[1.5px] rounded-none overflow-hidden relative">
                  <div 
                    className="bg-[#E85D42] h-full transition-all duration-300"
                    style={{ width: `${speechPercent}%` }}
                  />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayVoice}
                  title={isSpeaking && !isPaused ? "Pause" : "Play"}
                  className="p-1 text-zinc-500 hover:text-[#E85D42] dark:hover:text-[#E85D42] transition-colors rounded-none flex items-center justify-center cursor-pointer"
                >
                  {isSpeaking && !isPaused ? (
                    <Pause size={11} />
                  ) : (
                    <Play size={11} />
                  )}
                </button>

                {isSpeaking && (
                  <button
                    onClick={handleStopVoice}
                    title="Stop"
                    className="p-1 text-zinc-500 hover:text-red-600 dark:hover:text-red-500 transition-colors rounded-none flex items-center justify-center cursor-pointer"
                  >
                    <Square size={9} className="fill-current" />
                  </button>
                )}

                {/* Playback Rate Selector */}
                <select 
                  value={playbackRate} 
                  onChange={(e) => handleRateChange(Number(e.target.value))}
                  className="bg-transparent border-0 text-[8.5px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer focus:outline-none"
                >
                  <option value={0.75} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">0.7x</option>
                  <option value={1} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">1.0x</option>
                  <option value={1.25} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">1.2x</option>
                  <option value={1.5} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">1.5x</option>
                  <option value={2} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">2.0x</option>
                </select>
              </div>
            </div>
          </div>
        </header>

      {/* Featured Image & Perspective Brief - WordPress Style layout overlapping upper edge */}
      <div className="relative w-full max-w-6xl xl:max-w-7xl mx-auto -mx-4 sm:mx-auto w-[calc(100%+2rem)] sm:w-full px-0 sm:px-4 my-8 sm:my-14">
        <img 
          src={getSafeImageUrl(article.featuredImage || article.imageUrl)} 
          alt="" 
          className="w-full h-80 sm:h-[450px] md:h-[520px] lg:h-[600px] object-cover sm:rounded-2xl shadow-2xl border-y sm:border border-zinc-200 dark:border-zinc-800 transition-all" 
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
          }}
        />

        {/* Perspective Brief - WordPress style overlapping upper edge of article image */}
        {(() => {
          const pb = article.perspectiveBrief;
          if (!pb) return null;

          const formatText = (val: any) => {
            if (!val) return '';
            if (typeof val === 'string') return val.trim();
            if (typeof val === 'object') return (val[language] || val.fr || val.en || '').trim();
            return String(val).trim();
          };

          const whatHappenedText = formatText(pb.whatHappened);
          const whyItMattersText = formatText(pb.whyItMatters);
          const watchNextText = formatText(pb.whatToWatchNext);

          if (!whatHappenedText && !whyItMattersText && !watchNextText) {
            return null;
          }

          return (
            <div className="relative md:absolute md:-top-20 lg:-top-28 left-0 right-0 z-30 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto px-5 sm:px-6 mt-4 md:mt-0">
            <div className="brief-box border border-zinc-200/90 dark:border-zinc-800/90 border-t-4 border-t-[#E85D42] rounded-xl sm:rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-md text-black dark:text-white bg-white/95 dark:bg-zinc-900/95">
              <h3 style={{ color: '#E85D42', textAlign: 'left', fontSize: '16px' }} className="font-black uppercase tracking-widest mb-4 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-2 flex items-center justify-between">
                <span>{t.brief}</span>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
                  {t.briefSubtitle}
                </span>
              </h3>
              <ul className="space-y-4">
                {whatHappenedText !== '' && (
                  <li>
                    <strong style={{ color: '#E85D42' }} className="block text-[11px] uppercase tracking-widest font-black mb-1">{t.whatHappened}</strong>
                    <span className="text-xs sm:text-sm font-bold text-black dark:text-white leading-relaxed block font-sans">
                      {whatHappenedText}
                    </span>
                  </li>
                )}
                {whyItMattersText !== '' && (
                  <li>
                    <strong style={{ color: '#E85D42' }} className="block text-[11px] uppercase tracking-widest font-black mb-1">{t.whyItMatters}</strong>
                    <span className="text-xs sm:text-sm font-bold text-black dark:text-white leading-relaxed block font-sans">
                      {whyItMattersText}
                    </span>
                  </li>
                )}
                {watchNextText !== '' && (
                  <li>
                    <strong style={{ color: '#E85D42' }} className="block text-[11px] uppercase tracking-widest font-black mb-1">{t.watchNext}</strong>
                    <span className="text-xs sm:text-sm font-bold text-black dark:text-white leading-relaxed block font-sans">
                      {watchNextText}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        );
      })()}
      </div>

      {/* Main Content Box - WordPress style overlap on desktop */}
      <div className="max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto px-4 sm:px-6 relative z-20 mt-6 sm:mt-10 mb-20">
        <div className="w-full">
          {/* Main Article Content */}
          <div 
            style={{ 
              ['--article-font-size' as any]: `${fontSize}px`
            }}
            className="article-box w-full p-5 sm:p-8 md:p-12 shadow-2xl backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl sm:rounded-2xl text-left bg-white/95 dark:bg-zinc-900/95"
          >
            <Markdown className="animate-fadeIn prose-article-reader text-zinc-900 dark:text-white">
              {articleBodyText}
            </Markdown>
          </div>
        </div>
      </div>

      {/* Youtube Video Spot (Clean, full-width video with no outer box/bezel) */}
      {cleanYoutubeId && (
        <section className="max-w-4xl mx-auto mb-12 px-4">
          <div className="relative aspect-video w-full overflow-hidden shadow-2xl bg-black">
            <iframe 
              src={`https://www.youtube.com/embed/${cleanYoutubeId}?rel=0&modestbranding=1`} 
              title="Perspective Video Report" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen 
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </section>
      )}

      {/* Insert Ad Space below the video/content */}
      {adImage && adImage.trim() !== '' && (
        <div className="max-w-4xl mx-auto mb-16 relative">
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest absolute -top-4 right-0">{t.adLabel || 'Advertisement'}</span>
          <a href={adLink || '#'} target="_blank" rel="noopener noreferrer" className="block w-full border border-brand-border/20 dark:border-zinc-800 bg-brand-white/30 p-2 hover:border-[#E85D42] transition-colors shadow-none">
            <img src={adImage} alt="Ad" className="w-full h-auto max-h-[150px] object-cover" />
          </a>
        </div>
      )}

      {/* Comment Section */}
      {article.commentsEnabled !== false && (
      <div id="comments" className="max-w-4xl mx-auto mb-16 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 border-t-4 border-t-[#E85D42] shadow-sm">
         <div className="flex items-center justify-between mb-6 border-b-2 border-zinc-900 dark:border-zinc-100 pb-3">
            <div className="flex items-center gap-3">
               <MessageSquare className="text-[#E85D42]" />
               <h3 className="text-xl font-black uppercase tracking-widest text-[#E85D42]" style={{ color: '#E85D42' }}>{t.commentsTitle}</h3>
            </div>
         </div>

         {/* Real comments list */}
         <div className="space-y-4 mb-8 max-h-[500px] overflow-y-auto pr-2">
            {(comments || [])
              .filter(c => c.articleId === (article.slug || article.id) && (c.isApproved || (readerProfile && c.email === readerProfile.email)) && !c.parentId)
              .map(c => (
                <div key={c.id} className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
                  <div className="bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 p-4 flex gap-4 items-start shadow-xs rounded-none">
                    {/* Avatar */}
                    <div className="shrink-0 animate-fadeIn">
                      {c.email ? (
                        <Link to={`/profile/${encodeURIComponent(c.email)}`} className="hover:opacity-85 transition-opacity block">
                          {c.avatarUrl ? (
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#E85D42]">
                                {renderNeutralAvatar(c.avatarUrl, c.author, 40)}
                              </div>
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" title="Perspective Member" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-bold uppercase text-sm">
                              {c.author.substring(0, 1)}
                            </div>
                          )}
                        </Link>
                      ) : (
                        c.avatarUrl ? (
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#E85D42]">
                              {renderNeutralAvatar(c.avatarUrl, c.author, 40)}
                            </div>
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" title="Perspective Member" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-bold uppercase text-sm">
                            {c.author.substring(0, 1)}
                          </div>
                        )
                      )}
                    </div>

                    {/* Comment Details */}
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {c.email ? (
                            <Link to={`/profile/${encodeURIComponent(c.email)}`} className="font-extrabold text-sm text-zinc-950 dark:text-zinc-50 hover:text-[#E85D42] hover:underline transition-all">
                              {c.author}
                            </Link>
                          ) : (
                            <span className="font-extrabold text-sm text-zinc-950 dark:text-zinc-50">{c.author}</span>
                          )}
                          {c.isMember || c.email ? (
                            <span className="text-[8px] font-black text-white bg-[#E85D42] px-1.5 py-0.5 uppercase tracking-widest rounded-none">
                              ★ {language === 'fr' ? 'MEMBRE' : 'MEMBER'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 uppercase tracking-wider rounded-none">
                                {language === 'fr' ? 'INVITÉ' : 'GUEST'}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">{c.date}</span>
                      </div>

                      {editingCommentId === c.id ? (
                        <div className="mt-2 space-y-2 font-sans">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 p-2 text-xs focus:outline-none focus:border-[#E85D42] text-zinc-900 dark:text-zinc-100 rounded-none font-sans"
                            rows={2}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[9px] font-bold uppercase tracking-wider hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                            >
                              {language === 'fr' ? 'Annuler' : 'Cancel'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingCommentText.trim()) {
                                  updateCommentText(c.id, editingCommentText.trim(), readerProfile?.email);
                                  setEditingCommentId(null);
                                }
                              }}
                              className="px-3 py-1 bg-[#E85D42] text-white text-[9px] font-bold uppercase tracking-wider hover:bg-[#D45037] transition-colors"
                            >
                              {language === 'fr' ? 'Enregistrer' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 p-3.5 leading-relaxed border-l-2 border-[#E85D42] rounded-none border border-zinc-200/60 dark:border-zinc-800/60">
                          <p>"{getSafeText(c.text, language)}"</p>
                          {!c.isApproved && (
                            <span className="block mt-1 text-[8px] text-amber-500 font-bold uppercase tracking-wider animate-pulse">
                              ({language === 'fr' ? 'En attente de modération' : 'Awaiting moderation'})
                            </span>
                          )}
                          {c.attachment && (
                            <div className="mt-2">
                              <SharedItemCard attachment={c.attachment} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reply & Controls Action button */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[10px]">
                        {/* Likes */}
                        <button 
                          onClick={() => {
                            if (!readerProfile) {
                              setShowSignUpModal(true);
                              setAuthTab("login");
                            } else if (readerProfile.email) {
                              likeComment(c.id, readerProfile.email);
                            }
                          }}
                          className={`flex items-center gap-1 font-bold uppercase tracking-wide transition-colors ${readerProfile && c.likedBy?.includes(readerProfile.email) ? "text-emerald-500 font-black" : "text-zinc-500 dark:text-zinc-400 hover:text-emerald-500"}`}
                        >
                          <ThumbsUp size={11} />
                          <span>{c.likes || 0}</span>
                        </button>

                        {/* Dislikes */}
                        <button 
                          onClick={() => {
                            if (!readerProfile) {
                              setShowSignUpModal(true);
                              setAuthTab("login");
                            } else if (readerProfile.email) {
                              dislikeComment(c.id, readerProfile.email);
                            }
                          }}
                          className={`flex items-center gap-1 font-bold uppercase tracking-wide transition-colors ${readerProfile && c.dislikedBy?.includes(readerProfile.email) ? "text-rose-500 font-black" : "text-zinc-500 dark:text-zinc-400 hover:text-rose-500"}`}
                        >
                          <ThumbsDown size={11} />
                          <span>{c.dislikes || 0}</span>
                        </button>

                        {/* Reply Button */}
                        <button 
                          onClick={() => {
                            if (!readerProfile) {
                              setShowSignUpModal(true);
                              setAuthTab("login");
                            } else {
                              setActiveReplyId(activeReplyId === c.id ? null : c.id);
                              setReplyText("");
                            }
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-[#E85D42] hover:underline transition-all cursor-pointer font-sans"
                        >
                          {language === 'fr' ? 'Répondre' : 'Reply'}
                        </button>

                        {/* Edit & Delete Controls - Strictly author only */}
                        {Boolean(readerProfile?.email && c.email && readerProfile.email.trim().toLowerCase() === c.email.trim().toLowerCase()) && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCommentId(c.id);
                                setEditingCommentText(c.text);
                              }}
                              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest"
                            >
                              <Edit2 size={10} />
                              {language === 'fr' ? 'Modifier' : 'Edit'}
                            </button>
                            {deleteCandidateId === c.id ? (
                              <button
                                onClick={() => {
                                  deleteComment(c.id, readerProfile?.email);
                                  setDeleteCandidateId(null);
                                }}
                                className="text-red-600 dark:text-red-400 font-extrabold flex items-center gap-0.5 text-[9px] uppercase tracking-widest animate-pulse"
                              >
                                <Trash2 size={10} />
                                {language === 'fr' ? 'CONFIRMER ?' : 'CONFIRM?'}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeleteCandidateId(c.id);
                                }}
                                className="text-zinc-500 dark:text-zinc-400 hover:text-rose-500 flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest cursor-pointer"
                              >
                                <Trash2 size={10} />
                                {language === 'fr' ? 'Supprimer' : 'Delete'}
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Inline Reply Form */}
                      {activeReplyId === c.id && (
                        <form onSubmit={(e) => handleReplySubmit(e, c.id, c.author, c.email)} className="mt-3 flex gap-2 font-sans">
                          <input 
                            type="text" 
                            placeholder={language === 'fr' ? `Répondre à ${c.author}...` : `Reply to ${c.author}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            required
                            className="flex-grow bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 px-3 py-1.5 text-xs focus:outline-none focus:border-[#E85D42] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                          />
                          <button 
                            type="submit" 
                            className="bg-[#E85D42] text-white hover:bg-zinc-900 dark:hover:bg-zinc-100 dark:hover:text-zinc-950 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            {language === 'fr' ? 'POSTER' : 'POST'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Threaded comments list */}
                  {(comments || [])
                    .filter(reply => reply.articleId === (article.slug || article.id) && (reply.isApproved || (readerProfile && reply.email === readerProfile.email)) && reply.parentId === c.id)
                    .map(reply => (
                      <div key={reply.id} className="ml-8 sm:ml-12 mt-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                         <div className="flex gap-3.5 items-start">
                          <div className="shrink-0">
                            {reply.email ? (
                              <Link to={`/profile/${encodeURIComponent(reply.email)}`} className="hover:opacity-85 transition-opacity block">
                                {reply.avatarUrl ? (
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-800">
                                    {renderNeutralAvatar(reply.avatarUrl, reply.author, 32)}
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase">
                                    {reply.author.substring(0, 1)}
                                  </div>
                                )}
                              </Link>
                            ) : (
                              reply.avatarUrl ? (
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-800">
                                  {renderNeutralAvatar(reply.avatarUrl, reply.author, 32)}
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase">
                                  {reply.author.substring(0, 1)}
                                </div>
                              )
                            )}
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5">
                                {reply.email ? (
                                  <Link to={`/profile/${encodeURIComponent(reply.email)}`} className="font-extrabold text-xs text-zinc-950 dark:text-zinc-50 hover:text-[#E85D42] hover:underline transition-all">
                                    {reply.author}
                                  </Link>
                                ) : (
                                  <span className="font-extrabold text-xs text-zinc-950 dark:text-zinc-50">
                                    {reply.author}
                                  </span>
                                )}
                                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold font-sans">
                                  {language === 'fr' ? 'en réponse à' : 'replying to'} <strong className="text-[#E85D42]">@{reply.replyTo}</strong>
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">{reply.date}</span>
                            </div>

                            {editingCommentId === reply.id ? (
                              <div className="mt-2 space-y-2 font-sans">
                                <textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 p-2 text-xs focus:outline-none focus:border-[#E85D42] text-zinc-900 dark:text-zinc-100 rounded-none font-sans"
                                  rows={2}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCommentId(null)}
                                    className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[9px] font-bold uppercase tracking-wider hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                                  >
                                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editingCommentText.trim()) {
                                        updateCommentText(reply.id, editingCommentText.trim(), readerProfile?.email);
                                        setEditingCommentId(null);
                                      }
                                    }}
                                    className="px-3 py-1 bg-[#E85D42] text-white text-[9px] font-bold uppercase tracking-wider hover:bg-[#D45037] transition-colors"
                                  >
                                    {language === 'fr' ? 'Enregistrer' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 leading-relaxed border-l border-zinc-300 dark:border-zinc-700 p-2.5 rounded-none font-sans border border-zinc-200/50 dark:border-zinc-800/50">
                                "{getSafeText(reply.text, language)}"
                                {!reply.isApproved && (
                                  <span className="block mt-1 text-[8px] text-amber-500 font-bold uppercase tracking-wider animate-pulse">
                                    ({language === 'fr' ? 'En attente de modération' : 'Awaiting moderation'})
                                  </span>
                                )}
                              </p>
                            )}

                            {/* Likes, Dislikes, Edit, Delete for threaded replies */}
                            <div className="mt-1.5 flex items-center gap-3 text-[10px]">
                              {/* Likes */}
                              <button 
                                onClick={() => {
                                  if (!readerProfile) {
                                    setShowSignUpModal(true);
                                    setAuthTab("login");
                                  } else if (readerProfile.email) {
                                    likeComment(reply.id, readerProfile.email);
                                  }
                                }}
                                className={`flex items-center gap-1 transition-colors ${readerProfile && reply.likedBy?.includes(readerProfile.email) ? "text-emerald-500 font-extrabold" : "text-zinc-500 dark:text-zinc-400 hover:text-emerald-500"}`}
                              >
                                <ThumbsUp size={10} />
                                <span>{reply.likes || 0}</span>
                              </button>

                              {/* Dislikes */}
                              <button 
                                onClick={() => {
                                  if (!readerProfile) {
                                    setShowSignUpModal(true);
                                    setAuthTab("login");
                                  } else if (readerProfile.email) {
                                    dislikeComment(reply.id, readerProfile.email);
                                  }
                                }}
                                className={`flex items-center gap-1 transition-colors ${readerProfile && reply.dislikedBy?.includes(readerProfile.email) ? "text-rose-500 font-extrabold" : "text-zinc-500 hover:text-rose-500"}`}
                              >
                                <ThumbsDown size={10} />
                                <span>{reply.dislikes || 0}</span>
                              </button>

                              {/* Edit & Delete for reply - Strictly author only */}
                              {Boolean(readerProfile?.email && reply.email && readerProfile.email.trim().toLowerCase() === reply.email.trim().toLowerCase()) && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(reply.id);
                                      setEditingCommentText(reply.text);
                                    }}
                                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center gap-0.5 text-[8.5px] uppercase tracking-wider"
                                  >
                                    <Edit2 size={9} />
                                    {language === 'fr' ? 'Modifier' : 'Edit'}
                                  </button>
                                   {deleteCandidateId === reply.id ? (
                                     <button
                                       onClick={() => {
                                         deleteComment(reply.id, readerProfile?.email);
                                         setDeleteCandidateId(null);
                                       }}
                                       className="text-red-600 dark:text-red-400 font-extrabold flex items-center gap-0.5 text-[8.5px] uppercase tracking-wider animate-pulse"
                                     >
                                       <Trash2 size={9} />
                                       {language === 'fr' ? 'CONFIRMER ?' : 'CONFIRM?'}
                                     </button>
                                   ) : (
                                     <button
                                       onClick={() => {
                                         setDeleteCandidateId(reply.id);
                                       }}
                                       className="text-zinc-500 hover:text-rose-500 flex items-center gap-0.5 text-[8.5px] uppercase tracking-wider cursor-pointer"
                                     >
                                       <Trash2 size={9} />
                                       {language === 'fr' ? 'Supprimer' : 'Delete'}
                                     </button>
                                   )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            {(comments || [])
              .filter(c => c.articleId === (article.slug || article.id) && (c.isApproved || (readerProfile && c.email === readerProfile.email))).length === 0 && (
              <p style={{ color: '#67676b' }} className="text-xs font-bold text-center py-8">
                {language === 'fr' 
                  ? 'Aucun commentaire pour le moment. Soyez le premier !' 
                  : 'No comments yet. Be the first to express your voice!'}
              </p>
            )}
         </div>

         <div className="border-t border-brand-border pt-6">
           <h4 className="text-xs font-bold uppercase tracking-widest text-[#E85D42] mb-4">
             {language === 'fr' ? 'Laisser un commentaire' : 'Leave a Comment'}
           </h4>
           {commentSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 py-3 px-4 text-xs font-bold mb-4">
                {language === 'fr'
                  ? '✓ Votre commentaire a été soumis et est en attente de modération par l’équipe d’édition.'
                  : '✓ Your comment was submitted successfully and is awaiting editorial moderation.'}
              </div>
           )}
           <form onSubmit={handleCommentSubmit} className="space-y-5">
            {/* Profile Picker Block */}
            {readerProfile ? (
              // Connected Profile Area
              <div className="mb-5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0">
                    {renderNeutralAvatar(readerProfile.avatarUrl, readerProfile.name, 48)}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm flex items-center gap-1.5 font-sans text-black dark:text-zinc-100">
                      <span className="text-black dark:text-zinc-100 font-black">{readerProfile.name}</span>
                      <span className="text-[8px] font-black text-white bg-[#E85D42] px-1.5 py-0.5 rounded-none uppercase tracking-widest font-sans">★ MEMBRE</span>
                    </h5>
                    <p className="text-[10px] font-mono font-bold uppercase text-zinc-700 dark:text-zinc-400">
                      {((readerProfile.email === 'kadersdiaz3@gmail.com' || readerProfile.email === 'admin@perspective.sn' || readerProfile.email?.toLowerCase().includes('admin'))) 
                        ? (language === 'fr' ? 'Administrateur - Groupe Perspective' : 'Perspective Group Admin') 
                        : (language === 'fr' ? 'Membre Perspective' : 'Perspective Member')} • {readerProfile.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReaderProfile(null)}
                  className="flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
                >
                  <LogOut size={12} /> {language === 'fr' ? 'Se déconnecter' : 'Log Out'}
                </button>
              </div>
            ) : (
              // Not Registered Tabbed Area
              <div className="mb-6 glass p-6 text-center flex flex-col items-center justify-center gap-4 py-8 relative overflow-hidden font-sans rounded-none animate-fadeIn" id="unauthenticated-comment-form-root">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-yellow-500 via-[#E85D42] to-rose-600" />
                <MessageSquare size={24} className="text-[#E85D42] mb-1" />
                <div className="max-w-md">
                  <h5 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1 font-sans">
                    {language === 'fr' ? 'REJOINDRE LA DISCUSSION' : 'JOIN THE DISCUSSION'}
                  </h5>
                  <p className="text-xs text-zinc-600 dark:text-zinc-200 font-medium leading-relaxed font-sans mt-2">
                    {language === 'fr' 
                      ? 'Pour écrire un commentaire, veuillez vous connecter ou vous inscrire gratuitement.' 
                      : 'To leave a comment on this article, please log in or sign up.'}
                  </p>
                </div>
                <div className="flex gap-4 items-center justify-center font-sans mt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthTab('login'); setShowSignUpModal(true); }}
                    className="px-5 py-2.5 bg-[#E85D42] text-white hover:bg-[#c94931] border border-[#E85D42] hover:border-[#c94931] transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest font-sans"
                  >
                    {language === 'fr' ? 'Se Connecter' : 'Log In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('register'); setShowSignUpModal(true); }}
                    className="px-5 py-2.5 bg-[#E85D42] text-white hover:bg-[#c94931] border border-[#E85D42] hover:border-[#c94931] transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest font-sans"
                  >
                    {language === 'fr' ? "S'inscrire" : 'Register'}
                  </button>
                </div>
              </div>
            )}
               <div>
                  <textarea 
                     value={comment}
                     required
                     onChange={(e) => setComment(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         if (comment.trim() && readerProfile) {
                           const form = e.currentTarget.form;
                           if (form) form.requestSubmit();
                         }
                       }
                     }}
                     placeholder={readerProfile 
                       ? (language === 'fr' ? 'Saisissez votre commentaire (Entrée pour publier, Maj+Entrée pour saut de ligne)...' : 'Enter your comment (Press Enter to post, Shift+Enter for line break)...')
                       : (language === 'fr' ? 'Veuillez vous connecter pour écrire un commentaire' : 'Please log in to add a comment')}
                     className="w-full bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 p-4 text-xs focus:outline-none focus:border-[#E85D42] resize-none h-24 transition-colors font-semibold shadow-xs disabled:opacity-60 disabled:cursor-not-allowed text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-sans"
                     disabled={!readerProfile}
                  />
               </div>
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2">
                 <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans font-medium">
                   {language === 'fr' 
                     ? '💡 Appuyez sur Entrée pour publier (Maj + Entrée pour un saut de ligne)' 
                     : '💡 Press Enter to post (Shift + Enter for line break)'}
                 </span>
                 <button 
                   type="submit" 
                   disabled={!comment.trim() || (!readerProfile && !commentAuthor.trim()) || (!readerProfile && toBeMember && !regEmail.trim())}
                   style={{ backgroundColor: '#e85d42', color: '#ffffff' }}
                   className="flex items-center gap-2 border border-black dark:border-zinc-800 px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-900 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-md disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed rounded-xs font-sans"
                 >
                   <Send size={12} />
                   {language === 'fr' ? 'Publier' : 'Post'}
                 </button>
               </div>
           </form>
         </div>
      </div>
      )}

      {/* After Article: Actors & Timeline */}
       {/* Similar Articles Carousel (placed right after comments) */}
       {carouselRelated.length > 0 && (
          <div className="max-w-6xl mx-auto mb-16">
             <h3 style={{ color: '#444646' }} className="text-xl font-black uppercase tracking-widest mb-6 border-b-2 border-zinc-950 dark:border-zinc-200 pb-2">{t.related}</h3>
             <div className="flex overflow-x-auto hide-scrollbar gap-6 pt-3 pb-4 -mt-3 scroll-smooth">
               {carouselRelated.map((article, idx) => (
                  <MiniCarouselCard key={`${article.id}-${idx}`} article={article} />
               ))}
             </div>
          </div>
       )}

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 px-4">
          {/* Key Actors */}
          {article.keyActors && article.keyActors.length > 0 && (
            <div className="brief-box border border-zinc-200/80 dark:border-zinc-800/80 border-t-4 border-t-[#E85D42] p-6 shadow-2xl backdrop-blur-md text-black dark:text-white">
              <h3 style={{ color: '#E85D42', textAlign: 'left', fontSize: '17px' }} className="font-black uppercase tracking-widest mb-4 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-2 flex items-center justify-between">
                <span>{t.actors}</span>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-bold">
                  {article.keyActors.length} {language === 'fr' ? 'PROTAGONISTES' : 'FIGURES'}
                </span>
              </h3>
              <div className="space-y-4">
                 {article.keyActors.map((actor, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedActor(actor)}
                    className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-[#E85D42] dark:hover:border-[#E85D42] cursor-pointer transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-black text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-[#E85D42] dark:group-hover:text-[#E85D42] transition-colors mb-0.5">
                          {actor.name}
                        </h4>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#E85D42] mb-2">
                          {actor.role}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold uppercase text-[#E85D42] bg-[#E85D42]/10 border border-[#E85D42]/20 px-1.5 py-0.5 tracking-wider opacity-70 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                        {language === 'fr' ? 'EXPLORER' : 'EXPLORE'} →
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mt-1 font-medium font-sans">
                      {typeof actor.significance === 'object'
                        ? ((actor.significance as any)[language] || (actor.significance as any).fr || (actor.significance as any).en || '')
                        : (actor.significance || '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {article.timeline && article.timeline.length > 0 && (
            <div className="brief-box border border-zinc-200/80 dark:border-zinc-800/80 border-t-4 border-t-[#E85D42] p-6 shadow-2xl backdrop-blur-md text-black dark:text-white">
              <h3 style={{ color: '#E85D42', textAlign: 'left', fontSize: '17px' }} className="font-black uppercase tracking-widest mb-4 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-2 flex items-center justify-between">
                <span>{t.timeline}</span>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-bold">
                  {article.timeline.length} {language === 'fr' ? 'REPÈRES' : 'EVENTS'}
                </span>
              </h3>
              <div className="border-l-2 border-[#E85D42] pl-4 space-y-4 relative ml-2">
                {article.timeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className="absolute w-3 h-3 bg-[#E85D42] rounded-full -left-[23px] top-1 border-2 border-white dark:border-zinc-950"></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#E85D42] mb-1 font-mono">
                      {event.date}
                    </div>
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-50/80 dark:bg-zinc-900/60 p-3 border border-zinc-200/80 dark:border-zinc-800/80 leading-relaxed font-sans">
                      {typeof event.description === 'object'
                        ? ((event.description as any)[language] || (event.description as any).fr || (event.description as any).en || '')
                        : (event.description || '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Selected Actor Modal Dialog */}
      <AnimatePresence>
        {selectedActor && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedActor(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-[#E85D42] p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedActor(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold w-8 h-8 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>

              <div className="mb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E85D42] block mb-1">
                  {language === 'fr' ? 'FICHE ACTEUR CLÉ' : 'KEY ACTOR PROFILE'}
                </span>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white">
                  {selectedActor.name}
                </h3>
                <p className="text-xs font-black uppercase tracking-wider text-[#E85D42] mt-1">
                  {selectedActor.role}
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/80 p-4 border border-zinc-200 dark:border-zinc-800 mb-6">
                <strong className="block text-[11px] font-black uppercase tracking-widest text-[#E85D42] mb-1.5">
                  {language === 'fr' ? 'Rôle & Positionnement Stratégique' : 'Strategic Role & Positioning'}
                </strong>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {typeof selectedActor.significance === 'object'
                    ? ((selectedActor.significance as any)[language] || (selectedActor.significance as any).fr || (selectedActor.significance as any).en || '')
                    : (selectedActor.significance || '')}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedActor(null)}
                  className="px-5 py-2.5 bg-[#E85D42] hover:bg-[#D45037] text-white text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  {language === 'fr' ? 'Fermer' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      <InternalShareModal
        isOpen={showInternalShareModal}
        onClose={() => setShowInternalShareModal(false)}
        initialItem={article ? {
          type: "article",
          id: article.slug || article.id,
          title: typeof article.title === "string" ? article.title : article.title?.[language] || "",
          link: `/article/${article.slug || article.id}`,
          subtitle: typeof article.excerpt === "string" ? article.excerpt : article.excerpt?.[language] || "",
          image: article.featuredImage || article.imageUrl
        } : undefined}
      />

    </motion.article>
    </>
  );
}
