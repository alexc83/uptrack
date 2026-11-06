import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const footerLinkClass = 'inline-flex min-h-11 items-center rounded-[0.6rem] px-2 text-[1.02rem] font-semibold text-[var(--ut-landing-subtle)] no-underline underline-offset-4 hover:underline';

export function LandingFooter({ showRoadmapLink = true, showHelpLink = true }: { showRoadmapLink?: boolean; showHelpLink?: boolean }) {
  return (
    <footer className="border-t border-[var(--ut-landing-footer-border)] bg-[var(--ut-landing-surface-soft)] pb-[1.1rem] pt-[1.55rem]">
      <div className="mx-auto flex w-[min(100%-2rem,76rem)] flex-col items-center gap-[0.45rem] text-center">
        <div className="mb-[0.15rem] inline-flex items-center gap-3 text-[var(--ut-landing-heading)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-[var(--ut-landing-primary)] text-white">
            <Shield className="h-[0.82rem] w-[0.82rem]" aria-hidden="true" />
          </span>
          <span className="text-[1.28rem] font-bold tracking-[-0.02em]">UpTrack</span>
        </div>
        <p className="m-0 text-[1.05rem] leading-[1.7] text-[var(--ut-landing-muted)]">
          Designed for healthcare professionals, powered by React and Spring Boot
        </p>
        {(showRoadmapLink || showHelpLink) && (
          <nav aria-label="Public pages" className="mt-[0.35rem] inline-flex items-center gap-[1.25rem]">
            {showRoadmapLink && <Link to="/roadmap" className={footerLinkClass}>Roadmap</Link>}
            {showHelpLink && <Link to="/help" className={footerLinkClass}>Help Center</Link>}
          </nav>
        )}
        <small className="mt-[0.35rem] block w-full text-[var(--ut-landing-footer-copy)]">© 2026 UpTrack</small>
      </div>
    </footer>
  );
}
