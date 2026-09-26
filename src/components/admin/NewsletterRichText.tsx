import React, { useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline, Link2, List, ListOrdered,
  Heading2, Quote, Minus, Image as ImageIcon, EyeOff,
} from 'lucide-react';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  isFr: boolean;
  placeholder?: string;
  /** Reused media-library picker, so images come from the same source as everywhere else. */
  openMediaSelector?: (onSelect: (url: string) => void) => void;
}

/**
 * A deliberately small rich-text editor — "Mailchimp, but simpler".
 *
 * WHY contentEditable + document.execCommand rather than an editor library:
 * this is a one-file, dependency-free toolbar over a plain HTML string.
 * execCommand is deprecated but is still the only zero-dependency way to apply
 * inline formatting to a selection inside contentEditable, and it works in every
 * current desktop and mobile browser. The alternative was adding a heavy editor
 * package to the bundle for six buttons.
 *
 * The value is admin-authored HTML, so it is treated as trusted markup — the
 * same trust model as any CMS rich-text field.
 */
export function RichTextEditor({
  value,
  onChange,
  isFr,
  placeholder,
  openMediaSelector,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Tracks whether the last change came from the user, so typing is not
  // interrupted by a re-render that would reset the caret.
  const dirty = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    if (!dirty.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const emit = () => {
    dirty.current = true;
    if (ref.current) onChange(ref.current.innerHTML);
  };

  /** Runs a formatting command on the current selection. */
  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    // try/catch: some browsers throw on an unsupported command rather than
    // ignoring it, and a toolbar must never break the page.
    try { document.execCommand(command, false, arg); } catch { /* unsupported */ }
    emit();
  };

  const insertHtml = (html: string) => {
    ref.current?.focus();
    try {
      document.execCommand('insertHTML', false, html);
    } catch {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createRange().createContextualFragment(html));
        sel.collapseToEnd();
      }
    }
    emit();
  };

  const btn = (icon: React.ReactNode, title: string, action: () => void) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()}
      onClick={action}
      className="p-1.5 text-zinc-400 hover:text-[#E85D42] hover:bg-zinc-800 rounded transition-colors cursor-pointer"
    >
      {icon}
    </button>
  );


  return (
    <div className="rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-950 focus-within:border-[#E85D42]">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-800">
        {btn(<Bold size={14} />, isFr ? 'Gras' : 'Bold', () => exec('bold'))}
        {btn(<Italic size={14} />, isFr ? 'Italique' : 'Italic', () => exec('italic'))}
        {btn(<Underline size={14} />, isFr ? 'Souligné' : 'Underline', () => exec('underline'))}
        <span className="w-px h-4 bg-zinc-700 mx-0.5" />
        {btn(<Heading2 size={14} />, isFr ? 'Titre' : 'Heading', () => exec('formatBlock', '<h2>'))}
        {btn(<Quote size={14} />, isFr ? 'Citation' : 'Quote', () => exec('formatBlock', '<blockquote>'))}
        {btn(<List size={14} />, isFr ? 'Liste à puces' : 'Bulleted list', () => exec('insertUnorderedList'))}
        {btn(<ListOrdered size={14} />, isFr ? 'Liste numérotée' : 'Numbered list', () => exec('insertOrderedList'))}
        <span className="w-px h-4 bg-zinc-700 mx-0.5" />
        {btn(<Link2 size={14} />, isFr ? 'Lien' : 'Link', () => {
          const url = window.prompt(isFr ? 'Adresse du lien :' : 'Link URL:');
          if (url) exec('createLink', url);
        })}
        {btn(<Minus size={14} />, isFr ? 'Séparateur' : 'Divider', () => insertHtml('<hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;" />'))}
        {openMediaSelector && btn(<ImageIcon size={14} />, isFr ? 'Insérer une image' : 'Insert image', () =>
          openMediaSelector((url) => insertHtml(`<img src="${url}" alt="" style="max-width:100%;height:auto;display:block;border-radius:6px;margin:12px auto;" />`))
        )}
        <span className="flex-1" />
        {btn(<EyeOff size={14} />, isFr ? 'Effacer la mise en forme' : 'Clear formatting', () => exec('removeFormat'))}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ''}
        onInput={emit}
        onBlur={emit}
        onPaste={e => {
          // Paste as plain text so Word/Sheets markup never enters the email.
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          if (text) insertHtml(text.replace(/\n/g, '<br />').replace(/ {2,}/g, ' &nbsp;'));
        }}
        className="newsletter-editor px-3 py-2.5 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 overflow-y-auto focus:outline-none"
        style={{ minHeight: 180, maxHeight: 420 }}
      />

      <style>{`
        .newsletter-editor:empty::before { content: attr(data-placeholder); color: #a1a1aa; }
        .newsletter-editor h2 { font-size: 17px; font-weight: 700; margin: 14px 0 6px; }
        .newsletter-editor p { margin: 0 0 9px; }
        .newsletter-editor ul, .newsletter-editor ol { margin: 0 0 9px; padding-left: 20px; }
        .newsletter-editor blockquote { margin: 0 0 9px; padding-left: 10px; border-left: 3px solid #E85D42; color: #52525b; }
        .newsletter-editor a { color: #E85D42; text-decoration: underline; }
        .newsletter-editor img { max-width: 100%; height: auto; }
      `}</style>
    </div>
  );
}