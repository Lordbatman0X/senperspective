import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownProps {
  children: string;
  style?: React.CSSProperties;
}

export function Markdown({ children, style }: MarkdownProps) {
  return (
    <div style={style} className="prose prose-sm prose-brand max-w-none prose-p:leading-relaxed prose-p:mb-2 prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p style={style} {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
