import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Newspaper, X, Volume2 } from 'lucide-react';
import { ToastEventDetail, requestBrowserNotificationPermission } from '../lib/notificationSound';
import { useStore } from '../store';

export const NotificationToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastEventDetail[]>([]);
  const navigate = useNavigate();
  const { language } = useStore();

  useEffect(() => {
    // Request push notification permission on mount if default
    requestBrowserNotificationPermission();

    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastEventDetail>;
      if (customEvent.detail) {
        setToasts(prev => [customEvent.detail, ...prev].slice(0, 5)); // Keep max 5 toasts
      }
    };

    window.addEventListener('app-toast-notification', handleToastEvent);
    return () => {
      window.removeEventListener('app-toast-notification', handleToastEvent);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const isMessage = toast.type === 'message';
        const isPublication = toast.type === 'publication';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto relative overflow-hidden flex items-start gap-3.5 p-4 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-md transition-all transform animate-slide-in"
          >
            {/* Top red accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

            {/* Icon with animated red notification badge */}
            <div className="relative shrink-0 mt-0.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isMessage 
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                  : isPublication 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                  : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
              }`}>
                {isMessage && <MessageSquare size={18} />}
                {isPublication && <Newspaper size={18} />}
                {!isMessage && !isPublication && <Bell size={18} />}
              </div>

              {/* Pulsing Red Notification Badge Dot */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 border-2 border-white dark:border-zinc-900"></span>
              </span>
            </div>

            {/* Content */}
            <div 
              className="flex-1 cursor-pointer pr-4"
              onClick={() => {
                if (toast.onClick) {
                  toast.onClick();
                } else if (toast.actionUrl) {
                  navigate(toast.actionUrl);
                } else if (isMessage) {
                  navigate('/discussion');
                }
                removeToast(toast.id);
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  {isPublication ? (language === 'fr' ? 'FLASH INFO' : 'NEW PUBLICATION') : (language === 'fr' ? 'NOUVEAU MESSAGE' : 'NEW MESSAGE')}
                </span>
                <Volume2 size={12} className="text-zinc-400 animate-pulse" />
              </div>

              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                {toast.title}
              </h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5">
                {toast.body}
              </p>
              
              <span className="inline-block mt-2 text-[10px] font-medium text-red-600 dark:text-red-400 hover:underline">
                {language === 'fr' ? 'Cliquez pour ouvrir →' : 'Click to view →'}
              </span>
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
