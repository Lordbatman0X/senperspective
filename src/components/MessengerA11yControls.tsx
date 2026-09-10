import React, { useState, useEffect } from 'react';
import { 
  Volume2, VolumeX, Mic, MicOff, Copy, Check, Smile,
  Type, ZoomIn, ZoomOut, Sparkles
} from 'lucide-react';
import { 
  speakMessage, stopSpeech, getCurrentSpeakingId, isSpeechSynthesisSupported,
  startVoiceRecognition, isSpeechRecognitionSupported, copyTextWithFeedback,
  announceToScreenReader 
} from '../lib/accessibilitySpeech';
import { useStore } from '../store';

/**
 * Top Toolbar for Messenger Accessibility:
 * Text scaling (A- / A / A+), Screen Reader Mode, and active speech controller
 */
export const MessengerA11yToolbar: React.FC<{
  compact?: boolean;
  className?: string;
}> = ({ compact = false, className = '' }) => {
  const { 
    language, 
    messengerTextScale = 'normal', 
    setMessengerTextScale 
  } = useStore();

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(Boolean(getCurrentSpeakingId()));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const handleTextScaleChange = (scale: 'normal' | 'large' | 'xlarge') => {
    setMessengerTextScale(scale);
    const label = scale === 'normal' 
      ? (language === 'fr' ? 'Taille de texte standard activée' : 'Standard text size activated')
      : scale === 'large'
        ? (language === 'fr' ? 'Grande taille de texte activée' : 'Large text size activated')
        : (language === 'fr' ? 'Très grande taille de texte activée' : 'Extra-large text size activated');
    announceToScreenReader(label);
  };

  return (
    <div 
      role="toolbar" 
      aria-label={language === 'fr' ? "Barre d'accessibilité de la messagerie" : "Messenger accessibility toolbar"}
      className={`flex items-center justify-between gap-2 px-3 py-1.5 bg-zinc-100/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-sans ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <Type size={12} aria-hidden="true" />
          <span>{language === 'fr' ? "Lisibilité :" : "Text size:"}</span>
        </span>
        <div className="inline-flex rounded-lg bg-zinc-200 dark:bg-zinc-800 p-0.5" role="radiogroup" aria-label="Taille de police">
          <button
            type="button"
            role="radio"
            aria-checked={messengerTextScale === 'normal'}
            aria-label={language === 'fr' ? "Taille normale" : "Normal size"}
            onClick={() => handleTextScaleChange('normal')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
              messengerTextScale === 'normal'
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            A
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={messengerTextScale === 'large'}
            aria-label={language === 'fr' ? "Grande taille" : "Large size"}
            onClick={() => handleTextScaleChange('large')}
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              messengerTextScale === 'large'
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            A+
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={messengerTextScale === 'xlarge'}
            aria-label={language === 'fr' ? "Très grande taille" : "Extra-large size"}
            onClick={() => handleTextScaleChange('xlarge')}
            className={`px-1.5 py-0.5 rounded text-[12px] font-bold transition-colors cursor-pointer ${
              messengerTextScale === 'xlarge'
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            A++
          </button>
        </div>
      </div>

      {isSpeaking && (
        <button
          type="button"
          onClick={() => {
            stopSpeech();
            setIsSpeaking(false);
            announceToScreenReader(language === 'fr' ? 'Lecture vocale interrompue' : 'Voice playback stopped');
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-500/20 animate-pulse cursor-pointer transition-all"
          aria-label={language === 'fr' ? "Arrêter la lecture vocale" : "Stop voice narration"}
        >
          <VolumeX size={12} aria-hidden="true" />
          <span>{language === 'fr' ? "Arrêter lecture" : "Stop speaking"}</span>
        </button>
      )}
    </div>
  );
};

/**
 * Message Speech Button (Text-to-Speech)
 */
export const A11ySpeechButton: React.FC<{
  messageId: string;
  text: string;
  compact?: boolean;
}> = ({ messageId, text, compact = false }) => {
  const language = useStore(state => state.language);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const check = () => setSpeaking(getCurrentSpeakingId() === messageId);
    const interval = setInterval(check, 250);
    return () => clearInterval(interval);
  }, [messageId]);

  if (!isSpeechSynthesisSupported()) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (speaking) {
          stopSpeech();
          setSpeaking(false);
          announceToScreenReader(language === 'fr' ? 'Lecture vocale arrêtée' : 'Speech stopped');
        } else {
          speakMessage(messageId, text, language, {
            onStart: () => setSpeaking(true),
            onEnd: () => setSpeaking(false),
            onError: () => setSpeaking(false)
          });
          announceToScreenReader(language === 'fr' ? 'Lecture du message en cours' : 'Reading message aloud');
        }
      }}
      aria-label={
        speaking
          ? (language === 'fr' ? "Arrêter la lecture de ce message" : "Stop reading this message")
          : (language === 'fr' ? "Écouter ce message à voix haute" : "Listen to this message aloud")
      }
      title={speaking ? (language === 'fr' ? "Arrêter lecture" : "Stop audio") : (language === 'fr' ? "Écouter à voix haute" : "Listen")}
      className={`p-1 rounded-md transition-colors cursor-pointer ${
        speaking 
          ? "bg-red-500 text-white animate-pulse" 
          : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
      }`}
    >
      {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
    </button>
  );
};

/**
 * Message Copy Button with Accessible Toast
 */
export const A11yCopyButton: React.FC<{
  text: string;
}> = ({ text }) => {
  const language = useStore(state => state.language);
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyTextWithFeedback(text);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      aria-label={copied 
        ? (language === 'fr' ? "Copié dans le presse-papier" : "Copied to clipboard")
        : (language === 'fr' ? "Copier le texte du message" : "Copy message text")
      }
      title={copied ? (language === 'fr' ? "Copié !" : "Copied!") : (language === 'fr' ? "Copier" : "Copy")}
      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
};

/**
 * Voice Input (Speech-to-Text) Microphone Button
 */
export const A11yVoiceInputButton: React.FC<{
  onTranscript: (text: string) => void;
  className?: string;
}> = ({ onTranscript, className = '' }) => {
  const language = useStore(state => state.language);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<{ stop: () => void } | null>(null);

  if (!isSpeechRecognitionSupported()) return null;

  const toggleRecording = () => {
    if (isRecording && recognitionInstance) {
      recognitionInstance.stop();
      setIsRecording(false);
      setRecognitionInstance(null);
      announceToScreenReader(language === 'fr' ? 'Dictée vocale arrêtée' : 'Voice recording stopped');
    } else {
      announceToScreenReader(language === 'fr' ? 'Dictée vocale démarrée. Parlez maintenant...' : 'Voice dictation started. Speak now...');
      const rec = startVoiceRecognition(
        language,
        (transcript) => {
          onTranscript(transcript);
          announceToScreenReader(
            language === 'fr' 
              ? `Texte reconnu : ${transcript}` 
              : `Recognized text: ${transcript}`
          );
        },
        () => {
          setIsRecording(false);
          setRecognitionInstance(null);
        },
        () => {
          setIsRecording(false);
          setRecognitionInstance(null);
        }
      );

      if (rec) {
        setIsRecording(true);
        setRecognitionInstance(rec);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleRecording}
      aria-label={
        isRecording
          ? (language === 'fr' ? "Arrêter la dictée vocale" : "Stop voice recording")
          : (language === 'fr' ? "Activer la dictée vocale (micro)" : "Start voice dictation")
      }
      title={
        isRecording
          ? (language === 'fr' ? "Arrêter l'enregistrement" : "Stop recording")
          : (language === 'fr' ? "Parler au micro pour dicter" : "Speak to dictate")
      }
      className={`p-2 rounded-full transition-all cursor-pointer shrink-0 flex items-center justify-center ${
        isRecording
          ? "bg-red-500 text-white animate-bounce shadow-md ring-2 ring-red-300 dark:ring-red-900"
          : "hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
      } ${className}`}
    >
      {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
};

/**
 * Message Reactions Component with accessible buttons
 */
export const A11yMessageReactions: React.FC<{
  messageId: string;
  reactions?: Record<string, string[]>;
  userEmail?: string;
  className?: string;
}> = ({ messageId, reactions = {}, userEmail = '', className = '' }) => {
  const { reactToDirectMessage, language } = useStore();
  const [showPicker, setShowPicker] = useState(false);

  const cleanEmail = (userEmail || 'visitor@perspective.sn').toLowerCase().trim();
  const availableEmojis = ['👍', '❤️', '💡', '👏', '🎯'];

  const entries = Object.entries(reactions || {}).filter(([_, users]) => Array.isArray(users) && (users ?? []).length > 0);

  return (
    <div className={`flex items-center flex-wrap gap-1 mt-1 ${className}`}>
      {entries.map(([emoji, users]) => {
        const hasReacted = users.includes(cleanEmail);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => reactToDirectMessage(messageId, emoji, cleanEmail)}
            aria-label={`${(users ?? []).length} réactions ${emoji}. Cliquez pour ${hasReacted ? 'retirer' : 'ajouter'}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-sans transition-transform active:scale-90 cursor-pointer ${
              hasReacted
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold"
                : "bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-transparent"
            }`}
          >
            <span>{emoji}</span>
            <span>{(users ?? []).length}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          aria-label={language === 'fr' ? "Ajouter une réaction émoticône" : "Add emoji reaction"}
          title={language === 'fr' ? "Réagir" : "React"}
          className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
        >
          <Smile size={12} />
        </button>

        {showPicker && (
          <div 
            role="dialog"
            aria-label={language === 'fr' ? "Choisir une réaction" : "Choose reaction"}
            className="absolute bottom-full mb-1 left-0 z-20 flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-800 animate-fadeIn"
          >
            {availableEmojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  reactToDirectMessage(messageId, emoji, cleanEmail);
                  setShowPicker(false);
                }}
                className="p-1 text-sm hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
