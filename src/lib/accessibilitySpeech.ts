// Accessible Speech Synthesis (Text-to-Speech), Voice Recognition (Speech-to-Text),
// and Screen Reader utilities for Perspective Group Messenger and Abdel

let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentSpeakingId: string | null = null;

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/https?:\/\/\S+/gi, '') // Remove URLs
    .replace(/[*_#`~>\[\]\(\)]/g, ' ') // Strip markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

export function stopSpeech(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    // Ignore
  }
  activeUtterance = null;
  currentSpeakingId = null;
}

export function getCurrentSpeakingId(): string | null {
  return currentSpeakingId;
}

export function speakMessage(
  id: string,
  text: string,
  lang: 'fr' | 'en' = 'fr',
  options?: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (e: any) => void;
  }
): boolean {
  if (!isSpeechSynthesisSupported()) return false;

  // If already speaking this message, toggle stop
  if (currentSpeakingId === id) {
    stopSpeech();
    if (options?.onEnd) options.onEnd();
    return false;
  }

  stopSpeech();

  const clean = cleanTextForSpeech(text);
  if (!clean) return false;

  try {
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;

    // Pick best available native voice
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const targetPrefix = lang === 'fr' ? 'fr' : 'en';
      const bestVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix) && !(v.name ?? '').includes('Google') === false)
        || voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix))
        || voices[0];
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    }

    currentSpeakingId = id;
    activeUtterance = utterance;

    utterance.onstart = () => {
      if (options?.onStart) options.onStart();
    };

    utterance.onend = () => {
      if (currentSpeakingId === id) {
        currentSpeakingId = null;
        activeUtterance = null;
      }
      if (options?.onEnd) options.onEnd();
    };

    utterance.onerror = (err) => {
      if (currentSpeakingId === id) {
        currentSpeakingId = null;
        activeUtterance = null;
      }
      if (options?.onError) options.onError(err);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("[Speech] Synthesis error:", err);
    currentSpeakingId = null;
    activeUtterance = null;
    return false;
  }
}

// Voice Recognition (Speech-to-Text) instance helper
export function startVoiceRecognition(
  lang: 'fr' | 'en',
  onResult: (transcript: string) => void,
  onEnd?: () => void,
  onError?: (error: any) => void
): { stop: () => void } | null {
  if (!isSpeechRecognitionSupported()) return null;

  try {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang === 'fr' ? 'fr-FR' : 'en-US';

    recognition.onresult = (event: any) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[SpeechRecognition] Error:", event.error);
      if (onError) onError(event.error);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  } catch (err) {
    console.warn("[SpeechRecognition] Failed to initialize:", err);
    return null;
  }
}

// Accessible clipboard copy with announcement
export async function copyTextWithFeedback(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    // Fallback for older browsers / iframe
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      announceToScreenReader('Message copié dans le presse-papier');
      return true;
    } catch (e) {
      return false;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    announceToScreenReader('Message copié dans le presse-papier');
    return true;
  } catch (e) {
    console.warn("[Clipboard] Copy failed:", e);
    return false;
  }
}

// Screen reader live announcement
export function announceToScreenReader(message: string): void {
  if (typeof document === 'undefined') return;
  let liveRegion = document.getElementById('a11y-live-announcer');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-live-announcer';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.padding = '0';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0,0,0,0)';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.border = '0';
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = message;
}
