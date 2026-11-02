import { Button } from 'flowbite-react';
import { ArrowRight } from 'lucide-react';
import type { LandingTrigger } from './landing-content';

interface CtaSectionProps {
  onGetStarted: LandingTrigger;
}

export function CtaSection({ onGetStarted }: CtaSectionProps) {
  return (
    <section className="pb-[4.8rem]" aria-labelledby="landing-cta-heading">
      <div className="mx-auto w-[min(100%-2rem,76rem)]">
        <div className="rounded-[1.35rem] bg-[linear-gradient(135deg,var(--ut-landing-primary)_0%,color-mix(in_srgb,var(--ut-landing-primary)_78%,#8bb3f1_22%)_100%)] px-8 py-14 text-center shadow-[var(--ut-landing-cta-shadow)] max-[640px]:p-[1.35rem]">
          <h2 id="landing-cta-heading" className="m-0 text-[clamp(2.2rem,4vw,3rem)] font-bold leading-[1.15] tracking-[-0.04em] text-white">
            Start tracking your credentials today
          </h2>
          <p className="mx-auto mb-0 mt-[1.1rem] max-w-[44rem] text-[1rem] leading-[1.7] text-white">
            Join healthcare professionals who have simplified their credential management with
            UpTrack.
          </p>
          <Button
            type="button"
            color="light"
            onClick={onGetStarted}
            className="mx-auto mt-[1.85rem] gap-[0.7rem] border border-white bg-white text-[var(--ut-landing-primary)] hover:-translate-y-px hover:border-[#f3f6fb] hover:bg-[#f3f6fb] hover:text-[var(--ut-landing-primary)] hover:shadow-[0_14px_28px_rgb(15_23_42/0.14)]"
          >
            <span>Get Started for Free</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
