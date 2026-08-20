import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Zap, User, MessageSquare, ExternalLink } from 'lucide-react';
import { useStore } from '../store';

export interface SharedAttachment {
  type: 'article' | 'match' | 'comment' | 'dispatch' | 'profile' | 'general';
  id: string;
  title: string;
  link: string;
  subtitle?: string;
  image?: string;
}

interface SharedItemCardProps {
  attachment: SharedAttachment;
  compact?: boolean;
}

export const SharedItemCard: React.FC<SharedItemCardProps> = ({ attachment, compact = false }) => {
  const language = useStore((s) => s.language);
  const siteSettings = useStore((s) => s.siteSettings);
  const accentColor = siteSettings?.accentColor || '#E85D42';

  const titleStr = typeof attachment?.title === 'object'
    ? ((attachment.title as any)[language] || (attachment.title as any).fr || (attachment.title as any).en || '')
    : (attachment?.title || '');

  const subtitleStr = typeof attachment?.subtitle === 'object'
    ? ((attachment.subtitle as any)[language] || (attachment.subtitle as any).fr || (attachment.subtitle as any).en || '')
    : (attachment?.subtitle || '');

  const getTypeLabel = () => {
    switch (attachment.type) {
      case 'article':
        return language === 'fr' ? '📰 ARTICLE PARTAGÉ' : '📰 SHARED ARTICLE';
      case 'dispatch':
        return language === 'fr' ? '⚡ DÉCRYPTAGE ANALYSTE' : '⚡ ANALYST DISPATCH';
      case 'profile':
        return language === 'fr' ? '👤 PROFIL ANALYSTE' : '👤 ANALYST PROFILE';
      case 'comment':
        return language === 'fr' ? '💬 CITATION DE DISCUSSION' : '💬 DISCUSSION CITATION';
      default:
        return language === 'fr' ? '📄 DOCUMENT PARTAGÉ' : '📄 SHARED DOCUMENT';
    }
  };

  const getIcon = () => {
    switch (attachment.type) {
      case 'article':
        return <Newspaper size={compact ? 12 : 14} style={{ color: accentColor }} />;
      case 'dispatch':
        return <Zap size={compact ? 12 : 14} style={{ color: accentColor }} />;
      case 'profile':
        return <User size={compact ? 12 : 14} style={{ color: accentColor }} />;
      case 'comment':
        return <MessageSquare size={compact ? 12 : 14} style={{ color: accentColor }} />;
      default:
        return <ExternalLink size={compact ? 12 : 14} style={{ color: accentColor }} />;
    }
  };

  return (
    <div className={`my-2 p-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/90 rounded-none text-left shadow-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700 ${compact ? 'max-w-xs' : 'w-full'}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
          {getIcon()}
          <span>{getTypeLabel()}</span>
        </span>
        <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">PERSPECTIVE</span>
      </div>

      <div className="flex gap-3 items-center">
        {attachment.image && (
          <img
            src={attachment.image}
            alt={titleStr}
            className="w-12 h-12 md:w-14 md:h-14 object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-black font-sans leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-2">
            {titleStr}
          </h5>
          {subtitleStr && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-serif italic truncate mt-0.5">
              {subtitleStr}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 flex justify-end">
        <Link
          to={attachment.link}
          className="inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase tracking-wider text-white px-2.5 py-1 transition-opacity hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          <span>{language === 'fr' ? 'Consulter' : 'View Item'}</span>
          <ExternalLink size={9} />
        </Link>
      </div>
    </div>
  );
};
