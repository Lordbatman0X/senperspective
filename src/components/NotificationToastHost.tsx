import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Newspaper, Users, X } from 'lucide-react';
import { ToastEventDetail, requestBrowserNotificationPermission } from '../lib/notificationSound';
import { useStore } from '../store';

const AUTO_DISMISS_MS = 5000; // Toasts vanish on their own after 5 seconds
const EXIT_ANIM_MS = 220;     // Short fade-out before removal

/**
 * MINIMAL NOTIFICATION HOST
 * -------------------------
 * A quiet, editorial notice: one hairline accent, one bold line of context,
 * one line of detail, a thin 5s life bar and a discreet close button. No
 * gradients, no pulsing badges. The event contract (`app-toast-notification`)
 * is unchanged so every existing emitter keeps working.
 */

export const NotificationToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastEventDetail[]>([]);
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const { language } = useStore();

  // Marks a toast as exiting (triggers the fade-out), then removes it
  const removeToast = useCallback((id: string) => {
    setExitingIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      setExitingIds(prev => prev.filter(x => x !== id));
    }, EXIT_ANIM_MS);
  }, []);

  useEffect(() => {
    // Request push notification permission on mount if default
    requestBrowserNotificationPermission();

    const timers: number[] = [];
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastEventDetail>;
      const detail = customEvent.detail;
      if (detail) {
        setToasts(prev => {
          // The same subject must never stack (a burst from one correspondent
          // collapses into a single visible notice).
          const withoutSameSubject = prev.filter(
            t => !detail.notificationId || t.notificationId !== detail.notificationId
          );
          return [detail, ...withoutSameSubject].slice(0, 3); // Keep at most 3 notices
        });
        // Auto-dismiss after 5 seconds
        timers.push(window.setTimeout(() => removeToast(detail.id), AUTO_DISMISS_MS));
      }
    };

    window.addEventListener('app-toast-notification', handleToastEvent);
    return () => {
      window.removeEventListener('app-toast-notification', handleToastEvent);
      timers.forEach(t => window.clearTimeout(t));
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      className="fixed top-[72px] right-3 sm:right-4 z-[9999] flex flex-col gap-2 w-[calc(100vw-24px)] max-w-[330px] pointer-events-none"
    >
      <style>{`
        @keyframes sp-toast-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes sp-toast-life { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>

      {toasts.map(toast => {
        const isMessage = toast.type === 'message';
        const isPublication = toast.type === 'publication';
        const isSocial = toast.type === 'social';
        const isExiting = exitingIds.includes(toast.id);

        const accent = isPublication
          ? 'bg-amber-500'
          : isSocial
            ? 'bg-emerald-500'
            : isMessage
              ? 'bg-[#E85D42]'
              : 'bg-zinc-400 dark:bg-zinc-600';

        return (
          <div
            key={toast.id}
            role="button"
            tabIndex={0}
            style={{ animation: 'sp-toast-in 200ms ease-out' }}
            onClick={() => {
              // Opening a toast = reading that item: check it off so it never
              // re-announces itself on a later reconnect.
              if (toast.notificationId) {
                useStore.getState().markNotificationRead(toast.notificationId);
              }
              if (toast.onClick) {
                toast.onClick();
              } else if (toast.actionUrl) {
                navigate(toast.actionUrl);
              } else if (isMessage) {
                navigate('/discussion');
              }
              removeToast(toast.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (e.currentTarget as HTMLDivElement).click();
              }
            }}
            className={`group pointer-events-auto relative overflow-hidden cursor-pointer rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm pl-3.5 pr-2 py-2.5 flex items-start gap-2.5 transition-all duration-200 ${
              isExiting ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
            }`}
          >
            {/* Hairline type accent */}
            <span className={`absolute left-0 top-0 bottom-0 w-[2px] ${accent}`} />

            <span className="mt-[1px] shrink-0 text-zinc-400 dark:text-zinc-500">
              {isMessage ? <MessageSquare size={13} />
                : isPublication ? <Newspaper size={13} />
                  : isSocial ? <Users size={13} />
                    : <Bell size={13} />}
            </span>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                {isPublication
                  ? (language === 'fr' ? 'Publication' : 'Publication')
                  : isSocial
                    ? (language === 'fr' ? 'Activité' : 'Activity')
                    : isMessage
                      ? 'Message'
                      : (language === 'fr' ? 'Briefing' : 'Briefing')}
              </span>
              <h4 className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug truncate mt-0.5">
                {toast.title}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug truncate">
                {toast.body}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              aria-label={language === 'fr' ? 'Fermer' : 'Dismiss'}
              className="shrink-0 p-0.5 -mt-0.5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer bg-transparent border-none"
            >
              <X size={13} />
            </button>

            {/* Life bar — the notice's own 5s countdown */}
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-100 dark:bg-zinc-800/60 overflow-hidden">
              <span
                className={`block h-full origin-left ${accent} opacity-60`}
                style={{ animation: `sp-toast-life ${AUTO_DISMISS_MS}ms linear forwards` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
};
