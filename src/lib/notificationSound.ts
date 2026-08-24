// Utility for AI Studio-style notification tones and browser push notifications
export function playNotificationSound(type: 'message' | 'publication' | 'chime' = 'chime') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'message') {
      // Signature Google AI Studio-style notification chime:
      // Soft, warm sequence C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.07);

        gain.gain.setValueAtTime(0, now + index * 0.07);
        gain.gain.linearRampToValueAtTime(0.2, now + index * 0.07 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.36);
      });
    } else if (type === 'publication') {
      // Bright news publication chime: G5 (783.99Hz) -> C6 (1046.50Hz)
      const notes = [783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.09);

        gain.gain.setValueAtTime(0, now + index * 0.09);
        gain.gain.linearRampToValueAtTime(0.22, now + index * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.09);
        osc.stop(now + index * 0.09 + 0.42);
      });
    } else {
      // Standard notification tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch (e) {
    console.warn("[Notification Sound] Play error:", e);
  }
}

export function requestBrowserNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }
}

export function showBrowserPushNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon-32x32.png',
        ...options
      });
    } catch (e) {
      console.warn("[Browser Notification] Push error:", e);
    }
  }
}

// Custom Event bus for triggering in-app toast alerts with sound
export interface ToastEventDetail {
  id: string;
  type: 'message' | 'publication' | 'system';
  title: string;
  body: string;
  avatarUrl?: string;
  actionUrl?: string;
  onClick?: () => void;
  timestamp: number;
}

export function triggerInAppToast(detail: Omit<ToastEventDetail, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return;
  const fullDetail: ToastEventDetail = {
    ...detail,
    id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(4),
    timestamp: Date.now()
  };

  // Play corresponding audio tone
  playNotificationSound(detail.type === 'publication' ? 'publication' : 'message');

  // Trigger browser push notification if permitted
  showBrowserPushNotification(detail.title, {
    body: detail.body,
    tag: fullDetail.id
  });

  // Dispatch custom event for UI toast host
  window.dispatchEvent(new CustomEvent('app-toast-notification', { detail: fullDetail }));
}
