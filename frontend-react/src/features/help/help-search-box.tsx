import { useId, useMemo, useState, type KeyboardEvent, type Ref } from 'react';
import { Search, X } from 'lucide-react';
import { searchHelp, type HelpSearchResult } from './help-search';

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (result: HelpSearchResult) => void;
  inputRef?: Ref<HTMLInputElement>;
}

/** Combobox: the results list is rendered by <HelpSearchResults> in the sidebar; this owns the input and keyboard model. */
export function useHelpSearch(query: string) {
  return useMemo(() => searchHelp(query), [query]);
}

export function HelpSearchBox({ query, onQueryChange, onSelect, inputRef }: Props) {
  const results = useHelpSearch(query);
  const [active, setActive] = useState(0);
  const listId = useId();
  const searching = query.trim().length > 0;
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setActive((activeIndex + 1) % results.length); }
    else if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setActive((activeIndex - 1 + results.length) % results.length); }
    else if (event.key === 'Enter') { const r = results[activeIndex]; if (r) { event.preventDefault(); onSelect(r); } }
    else if (event.key === 'Escape' && query) { event.preventDefault(); onQueryChange(''); }
  }

  return <div role="search" aria-label="Help Center">
    <div className="relative">
    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ut-landing-muted)]" />
    <input
      ref={inputRef}
      type="text"
      role="combobox"
      aria-label="Search the Help Center"
      aria-expanded={searching}
      aria-controls={searching ? listId : undefined}
      aria-autocomplete="list"
      aria-activedescendant={searching && results.length ? `${listId}-${activeIndex}` : undefined}
      autoComplete="off"
      spellCheck={false}
      placeholder="Search articles"
      value={query}
      onChange={(e) => { onQueryChange(e.target.value); setActive(0); }}
      onKeyDown={onKeyDown}
      className="min-h-11 w-full rounded-[0.8rem] border border-[var(--ut-landing-toggle-border)] bg-[var(--ut-landing-surface)] py-2 pl-9 pr-10 text-[0.95rem] text-[var(--ut-landing-heading)] placeholder:text-[var(--ut-landing-muted)]"
    />
    {query && <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')} className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--ut-landing-muted)] hover:text-[var(--ut-landing-heading)]"><X aria-hidden="true" className="h-4 w-4" /></button>}
    </div>
    <p role="status" aria-live="polite" className="sr-only">{searching ? (results.length ? `${results.length} ${results.length === 1 ? 'result' : 'results'} found` : 'No results found') : ''}</p>
    {searching && <ul id={listId} role="listbox" aria-label="Search results" className="m-0 mt-3 list-none space-y-1 p-0">
      {/* Options are driven by the combobox input (arrow keys / Enter); the click handler is the pointer equivalent. */}
      {results.map((r, i) => <li // eslint-disable-line jsx-a11y/click-events-have-key-events
        key={r.article.id}
        id={`${listId}-${i}`}
        role="option"
        aria-selected={i === activeIndex}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelect(r)}
        onMouseEnter={() => setActive(i)}
        className={`cursor-pointer rounded-[0.7rem] border px-3 py-2 ${i === activeIndex ? 'border-[var(--ut-landing-primary)] bg-[var(--ut-landing-surface-soft)]' : 'border-transparent'}`}
      >
        <span className="block text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--ut-landing-muted)]">{r.article.categoryTitle}</span>
        <span className="block text-[0.95rem] font-semibold text-[var(--ut-landing-heading)]">{r.article.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-[0.8rem] leading-snug text-[var(--ut-landing-muted)]">{r.snippet}</span>
      </li>)}
      {!results.length && <li className="px-3 py-2 text-[0.9rem] text-[var(--ut-landing-muted)]">No articles match “{query.trim()}”. Try a different word, or browse the categories.</li>}
    </ul>}
  </div>;
}
