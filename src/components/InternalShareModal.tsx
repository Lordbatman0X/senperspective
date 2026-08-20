import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  MessageSquare,
  Send,
  Check,
  Search,
  X,
  Star,
  Newspaper,
  Zap,
  User,
  Copy,
  Mail,
  Smartphone,
  ExternalLink,
  Globe
} from 'lucide-react';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { db, safeOnSnapshot } from '../lib/firebase';
import { collection } from 'firebase/firestore';
import { SharedAttachment } from './SharedItemCard';

interface InternalShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: SharedAttachment;
}

export const InternalShareModal: React.FC<InternalShareModalProps> = ({
  isOpen,
  onClose,
  initialItem
}) => {
  const {
    language,
    articles,
    siteSettings,
    subscribers,
    readerProfile,
    sendDirectMessage,
    addComment,
    addNotification,
    setActiveProfileTab,
    setShowProfileDrawer
  } = useStore();

  const navigate = useNavigate();
  const { allUsers } = useAuth();
  const accentColor = siteSettings?.accentColor || '#E85D42';

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Target channel tab: 'dm' (Direct Message) | 'comment' (Discussion) | 'external' (Apps Externes)
  const [targetChannel, setTargetChannel] = useState<'dm' | 'comment' | 'external'>('dm');

  // Friends list from Firestore
  const [friendsList, setFriendsList] = useState<string[]>([]);

  // Item type state
  const [selectedItemType, setSelectedItemType] = useState<'article' | 'dispatch' | 'profile'>(
    initialItem?.type === 'dispatch' || initialItem?.type === 'profile' ? initialItem.type : 'article'
  );

  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    initialItem?.type === 'article' ? initialItem.id : (articles[0]?.id || '')
  );

  const [customDispatchTitle, setCustomDispatchTitle] = useState<string>(
    initialItem?.type === 'dispatch' ? initialItem.title : ''
  );

  const [selectedProfileEmail, setSelectedProfileEmail] = useState<string>(
    initialItem?.type === 'profile'
      ? (initialItem.subtitle || readerProfile?.email || 'admin@perspective.sn')
      : (readerProfile?.email || 'admin@perspective.sn')
  );

  // Selected recipient for DM
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState<string>('admin@perspective.sn');

  // Target article for Discussion
  const [commentArticleId, setCommentArticleId] = useState<string>(
    initialItem?.type === 'article' ? initialItem.id : (articles[0]?.id || '')
  );

  // Caption / Note text
  const [captionNote, setCaptionNote] = useState<string>('');

  // Toast message
  const [toastMessage, setToastMessage] = useState<string>('');

  // 1. Fetch real-time friends
  useEffect(() => {
    if (!isOpen || !readerProfile?.email) return;
    const myEmail = readerProfile.email.toLowerCase().trim();
    const friendsRef = collection(db, "users", myEmail, "friends");

    const unsubscribe = safeOnSnapshot(
      friendsRef,
      (snapshot) => {
        const loadedFriends = snapshot.docs.map((doc: any) => doc.id.toLowerCase().trim());
        setFriendsList(loadedFriends);
        if (loadedFriends.length > 0 && selectedRecipientEmail === 'admin@perspective.sn') {
          setSelectedRecipientEmail(loadedFriends[0]);
        }
      },
      (error) => {
        console.warn("Notice loading friends in InternalShareModal:", error);
      }
    );

    return () => unsubscribe();
  }, [isOpen, readerProfile?.email]);

  // 2. Compute Active Attachment
  const currentAttachment = useMemo((): SharedAttachment => {
    if (initialItem && !selectedItemType) return initialItem;

    if (selectedItemType === 'article') {
      const art = articles.find(a => a.id === selectedArticleId || a.slug === selectedArticleId) || articles[0];
      const title = typeof art?.title === 'string' ? art.title : (art?.title?.[language] || 'Article');
      const subtitle = typeof art?.excerpt === 'string' ? art.excerpt : (art?.excerpt?.[language] || '');
      return {
        type: 'article',
        id: art?.id || 'art-1',
        title,
        link: `/article/${art?.slug || art?.id}`,
        subtitle,
        image: art?.featuredImage
      };
    } else if (selectedItemType === 'dispatch') {
      return {
        type: 'dispatch',
        id: 'dispatch-' + Date.now(),
        title: customDispatchTitle.trim() || (language === 'fr' ? 'Note de Décryptage Analytique' : 'Analytical Dispatch Note'),
        link: '/about',
        subtitle: language === 'fr' ? 'Analyse stratégique - Perspective Group' : 'Strategic intel - Perspective Group'
      };
    } else {
      const targetUser = allUsers.find(u => u.email.toLowerCase().trim() === selectedProfileEmail.toLowerCase().trim())
        || (readerProfile?.email?.toLowerCase().trim() === selectedProfileEmail.toLowerCase().trim() ? readerProfile : null)
        || { name: selectedProfileEmail.split('@')[0], email: selectedProfileEmail, avatarUrl: undefined };

      return {
        type: 'profile',
        id: 'prof-' + (targetUser.email || 'user'),
        title: targetUser.name || 'Analyste Perspective',
        link: `/profile/${encodeURIComponent(targetUser.email || 'admin@perspective.sn')}`,
        subtitle: targetUser.email || 'contact@perspective.sn',
        image: targetUser.avatarUrl
      };
    }
  }, [
    initialItem,
    selectedItemType,
    selectedArticleId,
    articles,
    language,
    customDispatchTitle,
    selectedProfileEmail,
    allUsers,
    readerProfile
  ]);

  // 3. Combine and deduplicate contact list
  const allContacts = useMemo(() => {
    const list: Array<{ email: string; name: string; avatarUrl?: string; isFriend: boolean; role?: string }> = [];
    const addedEmails = new Set<string>();

    // Add friends first
    friendsList.forEach(email => {
      const matched = allUsers.find(u => u.email.toLowerCase().trim() === email);
      list.push({
        email,
        name: matched?.name || email.split('@')[0],
        avatarUrl: matched?.avatarUrl,
        isFriend: true,
        role: matched?.role || 'Ami / Contact'
      });
      addedEmails.add(email);
    });

    // Add editorial team defaults
    const editorialTeam = [
      { email: 'admin@perspective.sn', name: 'Rédaction Perspective (Admin)', role: 'Rédaction' },
      { email: 'member@perspective.sn', name: 'Mariama Diallo', role: 'Analyste Senior' },
      { email: 'kadersdiaz3@gmail.com', name: 'Kader Diaz', role: 'Directeur' },
      { email: 'journalist@perspective.sn', name: 'Mamadou Ndiaye', role: 'Journaliste' }
    ];

    editorialTeam.forEach(e => {
      if (!addedEmails.has(e.email.toLowerCase().trim())) {
        list.push({
          email: e.email,
          name: e.name,
          isFriend: false,
          role: e.role
        });
        addedEmails.add(e.email.toLowerCase().trim());
      }
    });

    // Add all remaining app users
    allUsers.forEach(u => {
      const cleanEmail = u.email.toLowerCase().trim();
      if (!addedEmails.has(cleanEmail) && cleanEmail !== readerProfile?.email?.toLowerCase().trim()) {
        list.push({
          email: u.email,
          name: u.name,
          avatarUrl: u.avatarUrl,
          isFriend: false,
          role: u.role || 'Membre'
        });
        addedEmails.add(cleanEmail);
      }
    });

    // Add remaining subscribers
    subscribers.forEach(s => {
      const cleanEmail = s.email.toLowerCase().trim();
      if (!addedEmails.has(cleanEmail)) {
        list.push({
          email: s.email,
          name: s.email.split('@')[0],
          isFriend: false,
          role: 'Abonné'
        });
        addedEmails.add(cleanEmail);
      }
    });

    return list;
  }, [friendsList, allUsers, subscribers, readerProfile]);

  // 4. Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return allContacts;
    const q = searchQuery.toLowerCase().trim();
    return allContacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [allContacts, searchQuery]);

  // 5. Filtered articles for discussion
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase().trim();
    return articles.filter(a => {
      const titleStr = typeof a.title === 'string' ? a.title : a.title?.[language] || '';
      return titleStr.toLowerCase().includes(q);
    });
  }, [articles, searchQuery, language]);

  // CRITICAL: ALL HOOKS HAVE BEEN CALLED ABOVE!
  if (!isOpen) return null;

  const attachmentTitle = typeof currentAttachment?.title === 'object'
    ? ((currentAttachment.title as any)[language] || (currentAttachment.title as any).fr || (currentAttachment.title as any).en || '')
    : (currentAttachment?.title || '');

  // Full absolute URL for external sharing
  const fullShareUrl = window.location.origin + currentAttachment.link;

  // Action: Send Direct Message
  const handleSendDM = () => {
    if (!selectedRecipientEmail) return;

    const msgText = captionNote.trim()
      ? `[PARTAGE_INTERNE] ${captionNote}\n${attachmentTitle}`
      : `[PARTAGE_INTERNE] ${attachmentTitle}`;

    sendDirectMessage({
      sender: readerProfile?.email || 'member@perspective.sn',
      receiver: selectedRecipientEmail,
      text: msgText,
      attachment: currentAttachment
    });

    addNotification({
      id: 'notif-' + Date.now(),
      email: selectedRecipientEmail,
      text: {
        fr: `💬 ${readerProfile?.name || 'Un membre'} vous a partagé : "${attachmentTitle}"`,
        en: `💬 ${readerProfile?.name || 'A member'} shared intel with you: "${attachmentTitle}"`
      },
      date: new Date().toISOString().split('T')[0],
      isRead: false,
      category: 'messages',
      link: currentAttachment.link
    });

    setToastMessage(language === 'fr' ? '✓ Envoyé en message direct !' : '✓ Sent in Direct Message!');
    setTimeout(() => {
      setToastMessage('');
      onClose();
      setActiveProfileTab('messages');
      setShowProfileDrawer(true);
    }, 1000);
  };

  // Action: Post to Discussion
  const handlePostDiscussion = () => {
    const targetArt = articles.find(a => a.id === commentArticleId || a.slug === commentArticleId) || articles[0];
    if (!targetArt) return;

    const commentText = captionNote.trim()
      ? `📌 ${captionNote}`
      : (language === 'fr' ? `📌 Recommandation : "${attachmentTitle}"` : `📌 Recommended intel: "${attachmentTitle}"`);

    const targetArticleId = targetArt.slug || targetArt.id;

    addComment({
      id: 'c-' + Date.now(),
      articleId: targetArticleId,
      articleTitle: typeof targetArt.title === 'string' ? targetArt.title : (targetArt.title?.[language] || 'Article'),
      author: readerProfile?.name || 'Membre Perspective',
      email: readerProfile?.email || 'member@perspective.sn',
      text: commentText,
      date: new Date().toISOString().split('T')[0],
      isApproved: true,
      avatarUrl: readerProfile?.avatarUrl,
      isMember: true,
      attachment: currentAttachment
    });

    setToastMessage(language === 'fr' ? '✓ Publié dans la discussion !' : '✓ Posted to Discussion!');
    setTimeout(() => {
      setToastMessage('');
      onClose();
      // Navigate directly to the article page and scroll to comments
      navigate(`/article/${targetArticleId}#comments`);
    }, 1000);
  };

  // Action: Copy Citation Link
  const handleCopyCitation = () => {
    const citation = `[${attachmentTitle}](${fullShareUrl})`;
    navigator.clipboard.writeText(citation);
    setToastMessage(language === 'fr' ? '✓ Lien Markdown copié !' : '✓ Markdown link copied!');
    setTimeout(() => setToastMessage(''), 1800);
  };

  // External share helper
  const handleExternalShare = (platform: string) => {
    const title = attachmentTitle;
    const caption = captionNote.trim();
    let url = '';

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent((caption ? caption + ' - ' : '') + title + ' : ' + fullShareUrl)}`;
        window.open(url, '_blank');
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent((caption ? caption + ' - ' : '') + title)}&url=${encodeURIComponent(fullShareUrl)}`;
        window.open(url, '_blank');
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullShareUrl)}`;
        window.open(url, '_blank');
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullShareUrl)}`;
        window.open(url, '_blank');
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent('Perspective: ' + title)}&body=${encodeURIComponent((caption ? caption + '\n\n' : '') + title + '\n' + fullShareUrl)}`;
        window.location.href = url;
        break;
      case 'sms':
        url = `sms:?&body=${encodeURIComponent((caption ? caption + ' - ' : '') + title + ' ' + fullShareUrl)}`;
        window.location.href = url;
        break;
      case 'tiktok':
        navigator.clipboard.writeText(`Perspective Sahel: ${title} #sahel #geopolitique ${fullShareUrl}`);
        setToastMessage(language === 'fr' ? '✓ Citation TikTok copiée !' : '✓ TikTok Citation copied!');
        setTimeout(() => setToastMessage(''), 2000);
        return;
      case 'youtube':
        navigator.clipboard.writeText(`Source: Perspective Sahel - "${title}" - Link: ${fullShareUrl}`);
        setToastMessage(language === 'fr' ? '✓ Citation YouTube copiée !' : '✓ YouTube citation copied!');
        setTimeout(() => setToastMessage(''), 2000);
        return;
      case 'native':
        if (navigator.share) {
          navigator.share({
            title,
            text: caption || title,
            url: fullShareUrl
          }).catch(() => {});
        } else {
          handleCopyCitation();
        }
        return;
      case 'copy':
        handleCopyCitation();
        return;
    }

    setToastMessage(language === 'fr' ? '✓ Ouverture du canal...' : '✓ Launching app...');
    setTimeout(() => setToastMessage(''), 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* WhatsApp-Style Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="relative w-full max-w-md h-[88vh] max-h-[680px] bg-white dark:bg-[#111b21] border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col font-sans z-50 overflow-hidden rounded-2xl"
        >
          {/* HEADER BAR (WhatsApp Forward Style) */}
          <div className="bg-zinc-100 dark:bg-[#202c33] px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                <Share2 size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold font-sans text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  {language === 'fr' ? 'Transférer à...' : 'Forward to...'}
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  {targetChannel === 'dm'
                    ? (language === 'fr' ? 'Contact ou ami abonné' : 'Select contact or friend')
                    : targetChannel === 'comment'
                    ? (language === 'fr' ? 'Discussion d’un article' : 'Share to article discussion')
                    : (language === 'fr' ? 'Réseaux & applications externes' : 'External social apps')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* CHANNEL TABS (WhatsApp Segments) */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#111b21] shrink-0 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setTargetChannel('dm')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                targetChannel === 'dm'
                  ? 'border-[#E85D42] text-[#E85D42] bg-white dark:bg-[#111b21]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              style={targetChannel === 'dm' ? { borderColor: accentColor, color: accentColor } : {}}
            >
              <User size={14} />
              <span>{language === 'fr' ? 'Contacts' : 'Contacts'}</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetChannel('comment')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                targetChannel === 'comment'
                  ? 'border-[#E85D42] text-[#E85D42] bg-white dark:bg-[#111b21]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              style={targetChannel === 'comment' ? { borderColor: accentColor, color: accentColor } : {}}
            >
              <MessageSquare size={14} />
              <span>{language === 'fr' ? 'Discussions' : 'Discussions'}</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetChannel('external')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                targetChannel === 'external'
                  ? 'border-[#E85D42] text-[#E85D42] bg-white dark:bg-[#111b21]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              style={targetChannel === 'external' ? { borderColor: accentColor, color: accentColor } : {}}
            >
              <Globe size={14} />
              <span>{language === 'fr' ? 'Apps Externe' : 'Social Apps'}</span>
            </button>
          </div>

          {/* SEARCH BAR (For Contacts & Discussions) */}
          {targetChannel !== 'external' && (
            <div className="p-2.5 bg-zinc-100/70 dark:bg-[#202c33]/50 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={
                    targetChannel === 'dm'
                      ? (language === 'fr' ? 'Rechercher un contact ou ami...' : 'Search contacts...')
                      : (language === 'fr' ? 'Rechercher une discussion...' : 'Search discussions...')
                  }
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#111b21] border border-zinc-200 dark:border-zinc-700/60 rounded-full text-xs font-sans text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#E85D42]"
                />
              </div>
            </div>
          )}

          {/* Toast Banner */}
          {toastMessage && (
            <div className="mx-3 mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-2 rounded-lg animate-fadeIn">
              <Check size={14} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* SCROLLABLE MAIN CONTENT */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {/* 1. DIRECT MESSAGE (CONTACTS & FRIENDS LIST) */}
            {targetChannel === 'dm' && (
              <div className="p-1">
                {filteredContacts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400 font-mono">
                    {language === 'fr' ? 'Aucun contact trouvé' : 'No contacts found'}
                  </div>
                ) : (
                  filteredContacts.map(contact => {
                    const isSelected = selectedRecipientEmail.toLowerCase().trim() === contact.email.toLowerCase().trim();
                    return (
                      <div
                        key={'contact-' + contact.email}
                        onClick={() => setSelectedRecipientEmail(contact.email)}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors rounded-xl mx-1 my-0.5 ${
                          isSelected
                            ? 'bg-[#E85D42]/10 dark:bg-[#E85D42]/20 font-semibold'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {contact.avatarUrl ? (
                            <img
                              src={contact.avatarUrl}
                              alt={contact.name}
                              className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-black text-xs text-zinc-700 dark:text-zinc-200 uppercase shrink-0">
                              {contact.name.slice(0, 2)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold font-sans text-zinc-900 dark:text-zinc-100 truncate">
                                {contact.name}
                              </h4>
                              {contact.isFriend && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-mono font-bold rounded-full border border-amber-500/30">
                                  <Star size={8} className="fill-amber-500" />
                                  <span>{language === 'fr' ? 'Ami' : 'Friend'}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                              {contact.email}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#E85D42] border-[#E85D42] text-white'
                                : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                            style={isSelected ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 2. DISCUSSION THREAD LIST */}
            {targetChannel === 'comment' && (
              <div className="p-1">
                {filteredArticles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400 font-mono">
                    {language === 'fr' ? 'Aucune discussion trouvée' : 'No discussions found'}
                  </div>
                ) : (
                  filteredArticles.map(art => {
                    const isSelected = commentArticleId === art.id || commentArticleId === art.slug;
                    const titleStr = typeof art.title === 'string' ? art.title : art.title?.[language] || '';
                    return (
                      <div
                        key={'art-discussion-' + art.id}
                        onClick={() => {
                          setCommentArticleId(art.id);
                          setSelectedArticleId(art.id);
                          setSelectedItemType('article');
                        }}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors rounded-xl mx-1 my-0.5 ${
                          isSelected
                            ? 'bg-[#E85D42]/10 dark:bg-[#E85D42]/20 font-semibold'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {art.featuredImage ? (
                            <img
                              src={art.featuredImage}
                              alt={titleStr}
                              className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                              <Newspaper size={16} className="text-zinc-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold font-sans text-zinc-900 dark:text-zinc-100 line-clamp-1">
                              {titleStr}
                            </h4>
                            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono uppercase tracking-wider">
                              {art.category || 'Discussion'}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#E85D42] border-[#E85D42] text-white'
                                : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                            style={isSelected ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 3. EXTERNAL APPS & SOCIAL PLATFORMS */}
            {targetChannel === 'external' && (
              <div className="p-4 space-y-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  {language === 'fr' ? 'Partager via des applications externes :' : 'Share via external apps :'}
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('whatsapp')}
                    className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Send size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">WhatsApp</span>
                  </button>

                  {/* Twitter / X */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('twitter')}
                    className="p-3 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-600 dark:text-sky-400 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Globe size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">X / Twitter</span>
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('facebook')}
                    className="p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 text-blue-600 dark:text-blue-400 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Globe size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">Facebook</span>
                  </button>

                  {/* LinkedIn */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('linkedin')}
                    className="p-3 bg-blue-700/10 hover:bg-blue-700/20 border border-blue-700/30 text-blue-700 dark:text-blue-300 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <ExternalLink size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">LinkedIn</span>
                  </button>

                  {/* Email */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('email')}
                    className="p-3 bg-zinc-200/60 dark:bg-zinc-800/60 hover:bg-zinc-300 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Mail size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">E-mail</span>
                  </button>

                  {/* SMS */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('sms')}
                    className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Smartphone size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">SMS</span>
                  </button>

                  {/* TikTok Citation */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('tiktok')}
                    className="p-3 bg-zinc-900/10 dark:bg-zinc-100/10 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Copy size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">TikTok</span>
                  </button>

                  {/* YouTube Citation */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('youtube')}
                    className="p-3 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-600 dark:text-red-400 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Copy size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">YouTube</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={() => handleExternalShare('copy')}
                    className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Copy size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold">{language === 'fr' ? 'Copier Link' : 'Copy Link'}</span>
                  </button>
                </div>

                {/* Native OS Share button */}
                {typeof navigator !== 'undefined' && (navigator as any).share && (
                  <button
                    type="button"
                    onClick={() => handleExternalShare('native')}
                    className="w-full mt-3 py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-bold uppercase tracking-wider rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Share2 size={15} />
                    <span>{language === 'fr' ? 'Partager via le système mobile...' : 'Share via System...'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ITEM SELECTOR DROPDOWN (If user wants to switch item to share) */}
          {!initialItem && (
            <div className="px-3 py-1.5 bg-zinc-100 dark:bg-[#1f2c34] border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-bold shrink-0">{language === 'fr' ? 'Élément :' : 'Item :'}</span>
                <select
                  value={selectedItemType}
                  onChange={e => setSelectedItemType(e.target.value as any)}
                  className="bg-transparent font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                >
                  <option value="article" className="dark:bg-zinc-900">📰 Article</option>
                  <option value="profile" className="dark:bg-zinc-900">👤 Profil Analyste</option>
                  <option value="dispatch" className="dark:bg-zinc-900">⚡ Décryptage</option>
                </select>
              </div>

              {selectedItemType === 'article' && (
                <div className="flex items-center gap-1.5 min-w-0 max-w-[210px]">
                  <span className="text-zinc-400 shrink-0">{language === 'fr' ? 'Article :' : 'Article :'}</span>
                  <select
                    value={selectedArticleId}
                    onChange={e => {
                      setSelectedArticleId(e.target.value);
                      setCommentArticleId(e.target.value);
                    }}
                    className="bg-transparent font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer truncate max-w-[150px]"
                  >
                    {articles.map(art => {
                      const t = typeof art.title === 'string' ? art.title : art.title?.[language] || 'Article';
                      return (
                        <option key={art.id} value={art.id} className="dark:bg-zinc-900">
                          {t}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* WHATSAPP BOTTOM DOCK (PREVIEW + CAPTION INPUT + SEND BUTTON) */}
          <div className="bg-zinc-100 dark:bg-[#202c33] p-2.5 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-2">
            {/* Compact Item Thumbnail Preview */}
            <div className="flex items-center gap-2.5 p-2 bg-white dark:bg-[#111b21] rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
              {currentAttachment.image ? (
                <img
                  src={currentAttachment.image}
                  alt={attachmentTitle}
                  className="w-9 h-9 rounded-md object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  {currentAttachment.type === 'profile' ? <User size={16} /> : <Newspaper size={16} />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                  {currentAttachment.type === 'article'
                    ? 'Article'
                    : currentAttachment.type === 'profile'
                    ? 'Profil'
                    : 'Décryptage'}
                </span>
                <p className="text-xs font-bold font-sans text-zinc-900 dark:text-zinc-100 truncate">
                  {attachmentTitle}
                </p>
              </div>
            </div>

            {/* Caption Input & Round WhatsApp Send Button (or external launcher) */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={captionNote}
                onChange={e => setCaptionNote(e.target.value)}
                placeholder={
                  language === 'fr'
                    ? 'Ajouter une légende ou commentaire...'
                    : 'Add a caption...'
                }
                className="flex-1 px-3 py-2 bg-white dark:bg-[#111b21] border border-zinc-200 dark:border-zinc-700/60 rounded-full text-xs font-sans text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#E85D42]"
              />

              <button
                type="button"
                onClick={
                  targetChannel === 'dm'
                    ? handleSendDM
                    : targetChannel === 'comment'
                    ? handlePostDiscussion
                    : () => handleExternalShare('whatsapp')
                }
                className="w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                style={{ backgroundColor: accentColor }}
                title={language === 'fr' ? 'Envoyer' : 'Send'}
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
