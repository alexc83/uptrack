import { Shield } from 'lucide-react';

export function LandingFooter() {
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
        <small className="mt-[0.35rem] block w-full text-[var(--ut-landing-footer-copy)]">© 2026 UpTrack</small>
      </div>
    </footer>
  );
}
