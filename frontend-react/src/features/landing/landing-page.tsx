import { useEffect, useRef, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthDialog, type AuthMode } from '../auth/auth-dialog';
import { LandingHeader } from './landing-header';
import { HeroSection } from './hero-section';
import { DashboardPreview } from './dashboard-preview';
import { FeaturesSection } from './features-section';
import { ComplianceSection } from './compliance-section';
import { CtaSection } from './cta-section';
import { LandingFooter } from './landing-footer';

const parseMode = (value: string | null): AuthMode | null =>
  value === 'login' || value === 'register' ? value : null;

/**
 * Public landing page. Guest-only via the route guard; authenticated visitors
 * never reach this component. The auth dialog is controlled by the optional
 * `auth` and `returnTo` query parameters (migrated from the temporary AuthHost).
 */
export function LandingPage() {
  const [params, setParams] = useSearchParams();
  // Focus returns here after the dialog closes. Mounted to the header Log In
  // button (M06 deep-link parity) and updated by whichever trigger is clicked.
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const mode = parseMode(params.get('auth'));

  useEffect(() => {
    document.title = 'UpTrack — Credential & CE Tracking';
    window.scrollTo(0, 0);
  }, []);

  const update = (change: (next: URLSearchParams) => void) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        change(next);
        return next;
      },
      { replace: true },
    );

  const openLogin = (event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    update((next) => next.set('auth', 'login'));
  };
  const openSignup = (event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    update((next) => next.set('auth', 'register'));
  };

  return (
    <div className="min-h-screen bg-[var(--ut-landing-bg)] text-[var(--ut-landing-text)] ut-fade-in">
      <LandingHeader onLogin={openLogin} onSignup={openSignup} loginButtonRef={triggerRef} />
      <main>
        <HeroSection onGetStarted={openSignup} />
        <DashboardPreview />
        <FeaturesSection />
        <ComplianceSection />
        <CtaSection onGetStarted={openSignup} />
      </main>
      <LandingFooter />
      <AuthDialog
        mode={mode}
        returnTo={params.get('returnTo')}
        onClose={() => update((next) => next.delete('auth'))}
        onModeChange={(nextMode) => update((next) => next.set('auth', nextMode))}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}
