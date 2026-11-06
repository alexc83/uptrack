import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Menu, Moon, Shield, Sun, X } from 'lucide-react';
import { useTheme } from '../../core/theme/use-theme';
import { LandingFooter } from '../landing/landing-footer';
import { findHelpArticle, helpArticlePath } from './help-content';
import { HelpSearchBox } from './help-search-box';
import { HelpCategoryNav } from './help-sidebar';
import type { HelpSearchResult } from './help-search';

const headerButton = 'inline-flex min-h-11 items-center gap-[0.45rem] whitespace-nowrap rounded-[0.95rem] border border-[var(--ut-landing-toggle-border)] bg-[var(--ut-landing-toggle-bg)] px-[0.95rem] font-semibold text-[var(--ut-landing-subtle)] no-underline hover:bg-[var(--ut-landing-surface-soft)]';
const roundButton = 'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--ut-landing-toggle-border)] bg-[var(--ut-landing-toggle-bg)] p-0 text-[var(--ut-landing-subtle)]';

function HelpHeader({ menuOpen, onMenu, menuButtonRef }: { menuOpen: boolean; onMenu: () => void; menuButtonRef: React.Ref<HTMLButtonElement> }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return <header className="sticky top-0 z-20 border-b border-[var(--ut-landing-header-border)] bg-[var(--ut-landing-header-bg)] backdrop-blur-[14px]">
    <div className="mx-auto flex min-h-[4.25rem] w-[min(100%-2rem,84rem)] items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button ref={menuButtonRef} type="button" aria-label="Open Help Center menu" aria-expanded={menuOpen} aria-controls="help-sidebar" onClick={onMenu} className={`${roundButton} lg:hidden`}><Menu className="h-4 w-4" aria-hidden="true" /></button>
        <Link to="/" aria-label="UpTrack home" className="inline-flex items-center gap-3 text-[var(--ut-landing-heading)] no-underline">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-[var(--ut-landing-primary)] text-white"><Shield className="h-[0.82rem] w-[0.82rem]" aria-hidden="true" /></span>
          <span className="text-[1.28rem] font-bold tracking-[-0.02em] max-[640px]:text-[0.95rem]">UpTrack</span>
        </Link>
        <span aria-hidden="true" className="h-5 w-px bg-[var(--ut-landing-header-border)]" />
        <Link to="/help" className="text-[1.05rem] font-semibold text-[var(--ut-landing-subtle)] no-underline hover:text-[var(--ut-landing-heading)] max-[420px]:hidden">Help Center</Link>
      </div>
      <nav aria-label="Help Center header" className="inline-flex items-center gap-3">
        <Link to="/" className={headerButton}><ArrowLeft className="h-4 w-4" aria-hidden="true" /><span className="max-[640px]:sr-only">Back to UpTrack</span></Link>
        <button type="button" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark} onClick={toggleTheme} className={roundButton}>
          {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </nav>
    </div>
  </header>;
}

/** Public Help Center shell. Lives outside the authenticated AppShell and never touches the session. */
export function HelpLayout() {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const article = findHelpArticle(category, slug);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); menuRef.current?.focus(); return; }
      if (event.key !== 'Tab') return;
      const items = Array.from(asideRef.current?.querySelectorAll<HTMLElement>('a[href], button, input') ?? []);
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null;
    const onChange = () => { if (media?.matches) setOpen(false); };
    media?.addEventListener('change', onChange);
    return () => { media?.removeEventListener('change', onChange); document.removeEventListener('keydown', onKeyDown); };
  }, [open, close]);

  function closeMenu() { close(); menuRef.current?.focus(); }

  function selectResult(result: HelpSearchResult) {
    close();
    void navigate(helpArticlePath(result.article));
  }

  return <div className="min-h-screen bg-[var(--ut-landing-bg)] text-[var(--ut-landing-text)] ut-fade-in">
    <a href="#help-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-40 focus:rounded-lg focus:bg-[var(--ut-landing-surface)] focus:px-4 focus:py-2 focus:font-semibold focus:text-[var(--ut-landing-heading)]">Skip to content</a>
    <HelpHeader menuOpen={open} onMenu={() => setOpen((v) => !v)} menuButtonRef={menuRef} />
    {open && <div aria-hidden="true" onClick={closeMenu} className="fixed inset-0 z-20 bg-black/50 lg:hidden" />}
    <div className="mx-auto grid w-[min(100%-2rem,84rem)] grid-cols-1 gap-x-10 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_14rem]">
      <aside
        id="help-sidebar"
        ref={asideRef}
        aria-label="Help Center navigation"
        className={`z-30 overflow-y-auto border-r border-[var(--ut-landing-card-border)] bg-[var(--ut-landing-bg)] p-4 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-[min(20rem,88vw)] max-lg:shadow-xl max-lg:transition-transform lg:sticky lg:top-[4.25rem] lg:h-[calc(100vh-4.25rem)] lg:pl-0 ${open ? 'max-lg:translate-x-0' : 'max-lg:invisible max-lg:-translate-x-full'}`}
      >
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <span className="font-semibold text-[var(--ut-landing-heading)]">Help Center</span>
          <button type="button" aria-label="Close Help Center menu" onClick={closeMenu} className={roundButton}><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        <HelpSearchBox query={query} onQueryChange={setQuery} onSelect={selectResult} inputRef={searchRef} />
        {!query.trim() && <HelpCategoryNav activeArticleId={article?.id} activeCategory={category} onNavigate={close} />}
      </aside>
      <div inert={open} className="contents">
        <Outlet />
      </div>
    </div>
    <LandingFooter showRoadmapLink={false} showHelpLink={false} />
  </div>;
}
