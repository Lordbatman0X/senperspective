import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  FileText, 
  Radio, 
  Check, 
  X, 
  Shield, 
  Sparkles, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  Volume2,
  VolumeX,
  Sliders
} from 'lucide-react';
import { useStore, NotificationPreferences } from '../store';

interface NotificationSetupPanelProps {
  onClose?: () => void;
  className?: string;
}

export const NotificationSetupPanel: React.FC<NotificationSetupPanelProps> = ({ onClose, className = '' }) => {
  const { 
    language, 
    readerProfile, 
    siteSettings, 
    notificationPreferences, 
    updateNotificationPreferences,
    addNotification
  } = useStore();

  const accentColor = siteSettings?.accentColor || '#E85D42';

  // Push notification permission state
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [testSent, setTestSent] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    const currentVal = !!notificationPreferences[key];
    updateNotificationPreferences({ [key]: !currentVal });
  };

  const handleEnableAll = () => {
    updateNotificationPreferences({
      messages: true,
      newsletters: true,
      newPublishes: true,
      generalNews: true,
      emailAlerts: true
    });
  };

  const handleDisableAll = () => {
    updateNotificationPreferences({
      messages: false,
      newsletters: false,
      newPublishes: false,
      generalNews: false,
      emailAlerts: false
    });
  };

  const requestBrowserPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushStatus(perm);
        if (perm === 'granted') {
          updateNotificationPreferences({ browserPush: true });
          new Notification("Perspective Group", {
            body: language === 'fr' ? "Notifications Push activées avec succès !" : "Push notifications successfully enabled!",
            icon: "/favicon.png"
          });
        } else {
          updateNotificationPreferences({ browserPush: false });
        }
      } catch (err) {
        console.error("Browser push error:", err);
      }
    }
  };

  const sendTestNotification = (category: 'messages' | 'newsletters' | 'newPublishes' | 'generalNews') => {
    const targetEmail = readerProfile?.email || 'kadersdiaz3@gmail.com';
    const timeStr = new Date().toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    let titleFr = "";
    let titleEn = "";

    if (category === 'messages') {
      titleFr = `💬 Test Messagerie [${timeStr}] : Nouveau message reçu d'un analyste du réseau Perspective.`;
      titleEn = `💬 DM Test [${timeStr}]: New direct message received from a network analyst.`;
    } else if (category === 'newsletters') {
      titleFr = `📬 Test Newsletter [${timeStr}] : Édition spéciale - Briefing Économique et Géopolitique Dakar.`;
      titleEn = `📬 Newsletter Test [${timeStr}]: Special edition - Economic Briefing Dakar.`;
    } else if (category === 'newPublishes') {
      titleFr = `📰 Test Parution [${timeStr}] : Nouvel article publié - Enquête exclusive sur le Corridor de Saly.`;
      titleEn = `📰 New Publish Test [${timeStr}]: New article released - Exclusive investigation on Saly Corridor.`;
    } else {
      titleFr = `⚡ Test Actualités [${timeStr}] : FLASH INFO - Communiqué en direct de la Rédaction de Dakar.`;
      titleEn = `⚡ General News Test [${timeStr}]: BREAKING NEWS - Live dispatch from Dakar newsroom.`;
    }

    addNotification({
      id: `test-${category}-${Date.now()}`,
      email: targetEmail,
      text: { fr: titleFr, en: titleEn },
      date: new Date().toISOString().split('T')[0],
      isRead: false,
      category
    });

    // Browser Push if enabled
    if (pushStatus === 'granted' && notificationPreferences.browserPush) {
      try {
        new Notification("Perspective Group Alert", {
          body: language === 'fr' ? titleFr : titleEn,
          icon: "/favicon.png"
        });
      } catch (e) {
        // ignore iframe push restriction
      }
    }

    setTestSent(category);
    setTimeout(() => setTestSent(null), 3500);
  };

  const categories = [
    {
      key: 'messages' as keyof NotificationPreferences,
      category: 'messages' as const,
      icon: MessageSquare,
      titleFr: "Messagerie & Échanges Membres",
      titleEn: "Direct Messages & Member Chat",
      descFr: "Alertes instantanées lorsqu'un membre, rédacteur ou analyste vous envoie un message direct ou répond à vos dispatches.",
      descEn: "Real-time alerts when a member or analyst sends you a direct message or replies to your dispatches.",
      badgeColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
    },
    {
      key: 'newsletters' as keyof NotificationPreferences,
      category: 'newsletters' as const,
      icon: Mail,
      titleFr: "Infolettres & Newsletters de la Rédaction",
      titleEn: "Newsletters & Editorial Briefings",
      descFr: "Briefings hebdomadaires, éditions spéciales de la rédaction de Dakar et analyses réservées aux abonnés.",
      descEn: "Weekly digests, special editor dispatches, and subscriber-only analytical briefings.",
      badgeColor: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
    },
    {
      key: 'newPublishes' as keyof NotificationPreferences,
      category: 'newPublishes' as const,
      icon: FileText,
      titleFr: "Nouvelles Parutions & Articles",
      titleEn: "New Article Publishes & Releases",
      descFr: "Notifications directes dès qu'un nouvel article, tribune ou grande enquête est mise en ligne sur la plateforme.",
      descEn: "Instant notifications whenever a new article, opinion piece, or major report is published.",
      badgeColor: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
    },
    {
      key: 'generalNews' as keyof NotificationPreferences,
      category: 'generalNews' as const,
      icon: Radio,
      titleFr: "Actualités Générales & Flashs d'Information",
      titleEn: "Breaking News & General Alerts",
      descFr: "Dépêches d'urgence en direct de Dakar, alertes marées, communiqués officiels et faits marquants socio-économiques.",
      descEn: "Urgent dispatches, tide/weather warnings, official press releases, and breaking headlines.",
      badgeColor: "bg-[#E85D42]/10 text-[#E85D42] border-[#E85D42]/30"
    }
  ];

  const activeCount = [
    notificationPreferences.messages,
    notificationPreferences.newsletters,
    notificationPreferences.newPublishes,
    notificationPreferences.generalNews
  ].filter(Boolean).length;

  return (
    <div className={`p-5 sm:p-6 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-6 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 mt-0.5"
            style={{ backgroundColor: accentColor }}
          >
            <Sliders size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-serif font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                {language === 'fr' ? 'Configuration des Notifications' : 'Notification Setup & Preferences'}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                {activeCount}/4 {language === 'fr' ? 'Canaux Actifs' : 'Active Channels'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-1 leading-snug">
              {language === 'fr' 
                ? "Personnalisez vos alertes en temps réel pour la messagerie, les infolettres, les parutions et l'actualité." 
                : "Customize your real-time notification streams for messages, newsletters, releases, and general news."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={handleEnableAll}
            className="text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            {language === 'fr' ? 'Tout Activer' : 'Enable All'}
          </button>
          <button
            type="button"
            onClick={handleDisableAll}
            className="text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            {language === 'fr' ? 'Tout Désactiver' : 'Disable All'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Core Notification Channels Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Bell size={14} className="text-[#E85D42]" style={{ color: accentColor }} />
          <span>{language === 'fr' ? '4 Canaux d’Alerte Principaux' : '4 Core Alert Categories'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            const isEnabled = !!notificationPreferences[cat.key];

            return (
              <div
                key={cat.key}
                className={`p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isEnabled 
                    ? 'bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-700/80 shadow-xs' 
                    : 'bg-zinc-100/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800/60 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                      <div className={`p-1.5 rounded-lg border shrink-0 ${cat.badgeColor}`}>
                        <IconComponent size={14} />
                      </div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug truncate">
                        {language === 'fr' ? cat.titleFr : cat.titleEn}
                      </h4>
                    </div>

                    {/* Custom Compact Toggle Switch */}
                    <button
                      onClick={() => handleToggle(cat.key)}
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed pl-0.5">
                    {language === 'fr' ? cat.descFr : cat.descEn}
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold uppercase ${isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                    {isEnabled 
                      ? (language === 'fr' ? '✓ Actif' : '✓ Active')
                      : (language === 'fr' ? '✕ Mute' : '✕ Muted')}
                  </span>

                  <button
                    onClick={() => sendTestNotification(cat.category)}
                    disabled={!isEnabled}
                    className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-[#E85D42] hover:text-white dark:hover:bg-[#E85D42] text-zinc-700 dark:text-zinc-300 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Send size={9} />
                    <span>{language === 'fr' ? 'Test' : 'Test'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Test confirmation message if triggered */}
      {testSent && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {language === 'fr'
              ? `Notification de test (${testSent}) envoyée au centre de notification !`
              : `Test alert (${testSent}) dispatched to your notifications panel!`}
          </span>
          <span className="text-[10px] underline cursor-pointer" onClick={() => setTestSent(null)}>OK</span>
        </div>
      )}

      {/* Advanced Delivery Channels (Browser Push & Email Copy) */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <Shield size={14} className="text-indigo-500" />
          <span>{language === 'fr' ? 'Canaux de Transmission Avancés' : 'Advanced Delivery Channels'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Browser Web Push Permission */}
          <div className="p-3 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Smartphone size={18} className="text-indigo-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {language === 'fr' ? 'Notifications Web Push' : 'Browser Web Push'}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                  {pushStatus === 'granted' 
                    ? (language === 'fr' ? 'Permission accordée' : 'Permission granted')
                    : (language === 'fr' ? 'Alertes bureau / mobile' : 'Desktop & mobile alerts')}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {pushStatus === 'granted' ? (
                <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block">
                  ✓ Granted
                </span>
              ) : pushStatus === 'denied' ? (
                <span className="text-[9px] font-mono font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-md inline-block">
                  Blocked
                </span>
              ) : (
                <button
                  onClick={requestBrowserPushPermission}
                  className="text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  {language === 'fr' ? 'Autoriser' : 'Allow'}
                </button>
              )}
            </div>
          </div>

          {/* Email Mirroring Toggle */}
          <div className="p-3 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Mail size={18} className="text-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {language === 'fr' ? 'Copie Courriel' : 'Email Forwarding'}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                  {readerProfile?.email || 'kadersdiaz3@gmail.com'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => handleToggle('emailAlerts')}
                type="button"
                role="switch"
                aria-checked={!!notificationPreferences.emailAlerts}
                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notificationPreferences.emailAlerts ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    notificationPreferences.emailAlerts ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
