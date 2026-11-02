import { Button } from 'flowbite-react';
import { ArrowRight } from 'lucide-react';
import type { LandingTrigger } from './landing-content';

interface HeroSectionProps {
  onGetStarted: LandingTrigger;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="py-[5.25rem] pb-10 max-[768px]:py-[3.8rem] max-[768px]:pb-8">
      <div className="mx-auto w-[min(100%-2rem,76rem)] max-w-[54rem] text-center">
        <h1
          className="mx-auto max-w-[48rem] text-[clamp(3rem,6vw,4.2rem)] font-bold leading-[1.12] tracking-[-0.05em] text-[var(--ut-landing-heading)]"
        >
          Track credentials. Stay compliant. Own your career.
        </h1>
        <p className="mx-auto mt-[1.6rem] max-w-[52rem] text-[clamp(1.05rem,2vw,1.2rem)] leading-[1.65] text-[var(--ut-landing-muted)]">
          A centralized dashboard for healthcare professionals to manage licenses,
          certifications, and continuing education requirements—audit-ready and always up to
          date.
        </p>
        <Button type="button" color="landing" onClick={onGetStarted} className="mx-auto mt-[1.9rem] gap-[0.7rem]">
          <span>Get Started</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
