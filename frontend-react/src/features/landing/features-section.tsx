import { featureCards } from './landing-content';

export function FeaturesSection() {
  return (
    <section className="pb-20 max-[768px]:pb-16" aria-labelledby="landing-features-heading">
      <div className="mx-auto w-[min(100%-2rem,76rem)] max-w-[50rem] text-center">
        <h2 id="landing-features-heading" className="m-0 text-[clamp(2.2rem,4vw,3rem)] font-bold leading-[1.15] tracking-[-0.04em] text-[var(--ut-landing-heading)]">
          Everything you need to stay compliant
        </h2>
        <p className="mx-auto mt-[1.2rem] max-w-[45rem] text-[1.05rem] leading-[1.7] text-[var(--ut-landing-muted)]">
          Built specifically for healthcare professionals who need to track multiple licenses,
          certifications, and CE requirements.
        </p>
      </div>

      <div className="mx-auto mt-[2.9rem] grid w-[min(100%-2rem,76rem)] grid-cols-[repeat(4,minmax(0,1fr))] gap-[1.4rem] max-[1080px]:grid-cols-[repeat(2,minmax(0,1fr))] max-[640px]:grid-cols-1">
        {featureCards.map((card) => (
          <article key={card.title} className="min-h-full rounded-[1.2rem] border border-[var(--ut-landing-card-border)] bg-[var(--ut-landing-surface)] p-[1.55rem] shadow-[var(--ut-landing-card-shadow)] max-[640px]:p-[1.35rem]">
            <span
              className="mb-[1.25rem] inline-flex h-12 w-12 items-center justify-center rounded-[0.8rem]"
              style={{ background: card.iconBg, color: card.iconColor }}
            >
              <card.icon aria-hidden="true" size={19} />
            </span>
            <h3 className="m-0 text-[1.1rem] leading-[1.35] text-[var(--ut-landing-heading)]">{card.title}</h3>
            <p className="mb-0 mt-[0.95rem] text-[1rem] leading-[1.7] text-[var(--ut-landing-muted)]">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
