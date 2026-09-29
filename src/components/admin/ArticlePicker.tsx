import React, { useMemo, useState } from 'react';
import { Search, Link2, X, FileText } from 'lucide-react';

export interface PickerArticle {
  id?: string;
  slug?: string;
  title?: any;
  excerpt?: any;
  category?: string;
  date?: string;
}

interface ArticlePickerProps {
  articles: PickerArticle[];
  language: 'fr' | 'en';
  /** Currently selected article id (or slug). */
  value?: string;
  onSelect: (article: PickerArticle | null) => void;
  label?: string;
  /** Optional override text currently set by the admin. */
  overrideValue?: string;
  onOverrideChange?: (value: string) => void;
}

function titleOf(a: PickerArticle, language: 'fr' | 'en'): string {
  const t = a?.title;
  if (!t) return '(sans titre)';
  if (typeof t === 'string') return t;
  return String(t[language] ?? t.fr ?? t.en ?? '(sans titre)');
}

/**
 * Lets the admin pick an EXISTING article instead of retyping its headline.
 *
 * The row created by this picker stores a reference to the article, so the
 * public ticker / briefs derive their text from the live article. That is the
 * point of the change: the copy already exists, and retyping it was how the two
 * drifted apart.
 *
 * The override box is intentionally secondary. Leaving it empty means the row
 * always shows the article's current title; filling it lets the admin write a
 * shorter ticker line for that story.
 */
export function ArticlePicker({
  articles,
  language,
  value,
  onSelect,
  label,
  overrideValue = '',
  onOverrideChange,
}: ArticlePickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => articles.find((a) => a?.id === value || a?.slug === value) || null,
    [articles, value]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? articles.filter((a) =>
          titleOf(a, language).toLowerCase().includes(q) ||
          String(a?.category || '').toLowerCase().includes(q)
        )
      : articles;
    return list.slice(0, 40);
  }, [articles, query, language]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {label || (language === 'fr' ? 'Article existant' : 'Existing article')}
        </label>
        {selected && (
          <span className="text-[9px] font-mono uppercase text-emerald-400 flex items-center gap-1">
            <Link2 size={10} />
            {language === 'fr' ? 'lié' : 'linked'}
          </span>
        )}
      </div>

      {selected ? (
        <div className="flex items-start justify-between gap-3 p-3 bg-zinc-900 border border-emerald-800/50 rounded">
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-100 truncate">{titleOf(selected, language)}</p>
            <p className="text-[10px] font-mono text-zinc-500 truncate">
              {selected.category || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { onSelect(null); setQuery(''); }}
            className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded cursor-pointer shrink-0"
            title={language === 'fr' ? "Détacher l'article" : 'Unlink article'}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-3 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 160)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            placeholder={
              language === 'fr'
                ? 'Rechercher un article existant...'
                : 'Search existing articles...'
            }
            className="w-full pl-8 bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
          />

          {open && (
            <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded shadow-2xl">
              {results.length === 0 ? (
                <p className="p-3 text-[11px] text-zinc-500 italic">
                  {language === 'fr' ? 'Aucun article trouvé.' : 'No articles found.'}
                </p>
              ) : (
                results.map((a) => (
                  <button
                    type="button"
                    key={a.id || a.slug}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onSelect(a); setOpen(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#E85D42]/15 border-b border-zinc-800/60 last:border-0 cursor-pointer flex items-start gap-2"
                  >
                    <FileText size={12} className="text-zinc-500 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold text-zinc-100 truncate">
                        {titleOf(a, language)}
                      </span>
                      <span className="block text-[9px] font-mono text-zinc-500 truncate">
                        {a.category || '—'}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {onOverrideChange && (
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            {language === 'fr'
              ? "Texte personnalisé (optionnel — sinon le titre de l'article)"
              : "Custom text (optional — otherwise the article title)"}
          </label>
          <input
            type="text"
            value={overrideValue}
            onChange={(e) => onOverrideChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2.5 text-xs font-medium rounded focus:outline-none focus:border-[#E85D42]"
          />
        </div>
      )}
    </div>
  );
}

