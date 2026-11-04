import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Shield, Sun } from 'lucide-react';
import { useTheme } from '../../core/theme/use-theme';

export function RoadmapHeader() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--ut-landing-header-border)] bg-[var(--ut-landing-header-bg)] backdrop-blur-[14px]">
      <div className="mx-auto flex min-h-[4.25rem] w-[min(100%-3.25rem,76rem)] items-center justify-between gap-4 max-[768px]:min-h-16 max-[768px]:w-[min(100%-2rem,76rem)]">
        <Link to="/" aria-label="UpTrack home" className="inline-flex items-center gap-3 text-[var(--ut-landing-heading)] no-underline">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-[var(--ut-landing-primary)] text-white">
            <Shield className="h-[0.82rem] w-[0.82rem]" aria-hidden="true" />
          </span>
          <span className="text-[1.28rem] font-bold tracking-[-0.02em] max-[640px]:text-[0.95rem]">UpTrack</span>
        </Link>
        <nav aria-label="Roadmap" className="inline-flex items-center gap-[1.1rem] max-[640px]:gap-[0.65rem]">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-[0.45rem] whitespace-nowrap rounded-[0.95rem] border border-[var(--ut-landing-toggle-border)] bg-[color-mix(in_srgb,var(--ut-landing-header-bg)_72%,var(--ut-landing-toggle-bg)_28%)] px-[0.95rem] py-[0.62rem] font-semibold text-[var(--ut-landing-subtle)] no-underline transition-[background-color,border-color,color,transform] duration-160 ease-out hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--ut-landing-toggle-bg)_72%,var(--ut-landing-surface)_28%)] max-[640px]:px-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to UpTrack
          </Link>
          <button
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={dark}
            onClick={toggleTheme}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--ut-landing-toggle-border)] bg-[var(--ut-landing-toggle-bg)] p-0 text-[var(--ut-landing-subtle)] transition-[background-color,border-color,color,transform] duration-160 ease-out hover:-translate-y-px"
          >
            {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
