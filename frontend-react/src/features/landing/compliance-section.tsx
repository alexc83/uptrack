import { Check } from 'lucide-react';
import { useTheme } from '../../core/theme/use-theme';
import { complianceBenefits } from './landing-content';

export function ComplianceSection() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <section className="bg-[var(--ut-landing-compliance-bg)] py-[5.6rem] pb-24 max-[768px]:pb-16" aria-labelledby="landing-compliance-heading">
      <div className="mx-auto grid w-[min(100%-2rem,76rem)] grid-cols-[minmax(0,1fr)_minmax(22rem,24rem)] items-center gap-12 max-[1080px]:grid-cols-1">
        <div className="max-[1080px]:order-1">
          <h2 id="landing-compliance-heading" className="m-0 text-[clamp(2.2rem,4vw,3rem)] font-bold leading-[1.15] tracking-[-0.04em] text-[var(--ut-landing-heading)]">
            Your compliance status, at a glance
          </h2>
          <p className="mb-0 mt-6 max-w-[38rem] text-[1.05rem] leading-[1.7] text-[var(--ut-landing-muted)]">
            The UpTrack dashboard gives you instant visibility into your credential status. See
            what&apos;s active, what&apos;s expiring soon, and what needs attention—all in one clean
            interface.
          </p>

          <div className="mt-[2.3rem] grid gap-[1.55rem]">
            {complianceBenefits.map((benefit) => (
              <article key={benefit.title} className="flex items-start gap-[0.9rem]">
                <span className="mt-[0.18rem] inline-flex h-[1.35rem] w-[1.35rem] flex-none items-center justify-center rounded-full border-2 border-[var(--ut-landing-check)] text-[var(--ut-landing-check)]">
                  <Check aria-hidden="true" size={10} strokeWidth={3} />
                </span>
                <div>
                  <h3 className="m-0 text-[1.1rem] leading-[1.35] text-[var(--ut-landing-heading)]">{benefit.title}</h3>
                  <p className="mb-0 mt-[0.15rem] text-[1rem] leading-[1.7] text-[var(--ut-landing-muted)]">{benefit.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="flex justify-end max-[1080px]:justify-center">
          <div className="h-[clamp(24rem,38vw,34rem)] w-[min(100%,24rem)] overflow-hidden rounded-[1.4rem]">
            <picture>
              <source
                media="(max-width: 768px)"
                srcSet={dark ? '/landing/mobile-dark-mode-drawer.png' : '/landing/mobile-light-mode-drawer.png'}
              />
              <img
                src={dark ? '/landing/dark-mode-drawer.png' : '/landing/light-mode-drawer.png'}
                alt="UpTrack credential drawer preview"
                className="mt-[-0.75rem] block h-auto w-[min(100%,24rem)] drop-shadow-[0_24px_30px_rgb(15_23_42/0.12)]"
              />
            </picture>
          </div>
        </div>
      </div>
    </section>
  );
}
