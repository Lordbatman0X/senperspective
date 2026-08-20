import React from 'react';
import ReactMarkdown from 'react-markdown';
import { getSafeImageUrl, DEFAULT_FALLBACK_IMAGE } from '../lib/imageUtils';

interface MarkdownProps {
  children: string;
  style?: React.CSSProperties;
  className?: string;
  invertInDark?: boolean;
}

export function Markdown({ children, style, className = "", invertInDark = true }: MarkdownProps) {
  return (
    <div 
      style={style} 
      className={`${invertInDark ? "prose prose-zinc dark:prose-invert" : "prose prose-zinc"} max-w-none prose-p:leading-relaxed prose-p:mb-4 prose-headings:font-serif prose-headings:font-black prose-a:text-[#E85D42] prose-a:font-semibold hover:prose-a:underline ${className}`}
    >
      <ReactMarkdown
        components={{
          a: ({ href, children: aChildren, ...props }) => {
            const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
            return (
              <a
                href={href || '#'}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-[#E85D42] font-semibold underline underline-offset-2 decoration-1 hover:text-[#ff7459] hover:decoration-2 transition-colors cursor-pointer"
                {...props}
              >
                {aChildren}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            const safeSrc = getSafeImageUrl(src || '');
            return (
              <figure className="my-8 block w-full text-center">
                <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 shadow-md bg-zinc-100 dark:bg-zinc-900 inline-block w-full">
                  <img
                    src={safeSrc}
                    alt={alt || "Article illustration"}
                    className="w-full max-h-[550px] object-cover block mx-auto transition-transform duration-500 hover:scale-[1.01]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                    }}
                    {...props}
                  />
                </div>
                {alt && alt.trim() !== '' && alt !== 'Image' && alt !== 'illustration' && (
                  <figcaption className="mt-2 text-center text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 italic">
                    {alt}
                  </figcaption>
                )}
              </figure>
            );
          },
          p: ({ children: pChildren, ...props }) => (
            <p className="text-inherit leading-relaxed mb-4" {...props}>
              {pChildren}
            </p>
          ),
          blockquote: ({ children: bChildren, ...props }) => (
            <blockquote className="border-l-4 border-[#E85D42] pl-4 italic text-zinc-700 dark:text-zinc-300 my-6 bg-zinc-50 dark:bg-zinc-900/50 py-3 pr-4" {...props}>
              {bChildren}
            </blockquote>
          )
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

