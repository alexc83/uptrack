import { useEffect } from 'react';
import { RoadmapHeader } from './roadmap-header';
import { LandingFooter } from '../landing/landing-footer';
import { roadmapAbout, roadmapIntro, roadmapSections, type RoadmapSection, type RoadmapSectionKey } from './roadmap-content';

const sectionAccents: Record<RoadmapSectionKey, string> = {
  now: 'bg-[var(--ut-roadmap-now-bg)] text-[var(--ut-roadmap-now)]',
  next: 'bg-[var(--ut-roadmap-next-bg)] text-[var(--ut-roadmap-next)]',
  later: 'bg-[var(--ut-roadmap-later-bg)] text-[var(--ut-roadmap-later)]',
  completed: 'bg-[var(--ut-roadmap-done-bg)] text-[var(--ut-roadmap-done)]',
};

function RoadmapSectionView({ section }: { section: RoadmapSection }) {
  const Icon = section.icon;
  return (
    <section aria-labelledby={`roadmap-${section.key}-heading`} className="py-[3.2rem] max-[768px]:py-[2.4rem]">
      <div className="mx-auto w-[min(100%-2rem,76rem)]">
        <div className="flex items-center gap-[0.9rem]">
          <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.8rem] ${sectionAccents[section.key]}`}>
            <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={`roadmap-${section.key}-heading`} className="m-0 text-[clamp(1.7rem,3vw,2.2rem)] font-bold leading-[1.15] tracking-[-0.03em] text-[var(--ut-landing-heading)]">{section.title}</h2>
            <p className="m-0 mt-[0.3rem] text-[1.02rem] leading-[1.6] text-[var(--ut-landing-muted)]">{section.subtitle}</p>
          </div>
        </div>
        <div className="mt-[1.8rem] grid grid-cols-2 gap-[1.4rem] max-[768px]:grid-cols-1 max-[768px]:gap-[1rem]">
          {section.entries.map((entry) => (
            <article key={entry.title} className="rounded-[1.2rem] border border-[var(--ut-landing-card-border)] bg-[var(--ut-landing-surface)] p-[1.55rem] shadow-[var(--ut-landing-card-shadow)] transition-transform duration-160 ease-out hover:-translate-y-px max-[640px]:p-[1.35rem]">
              <h3 className="m-0 text-[1.1rem] font-semibold leading-[1.35] text-[var(--ut-landing-heading)]">{entry.title}</h3>
              <p className="mb-0 mt-[0.8rem] text-[1rem] leading-[1.7] text-[var(--ut-landing-muted)]">{entry.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RoadmapPage() {
  useEffect(() => {
    document.title = 'Product Roadmap — UpTrack';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--ut-landing-bg)] text-[var(--ut-landing-text)] ut-fade-in">
      <RoadmapHeader />
      <main>
        <section aria-labelledby="roadmap-heading" className="border-b border-[var(--ut-landing-footer-border)] py-[4rem] max-[768px]:py-[2.8rem]">
          <div className="mx-auto w-[min(100%-2rem,76rem)] max-w-[54rem] text-center">
            <h1 id="roadmap-heading" className="m-0 text-[clamp(2.4rem,5vw,3.4rem)] font-bold leading-[1.12] tracking-[-0.05em] text-[var(--ut-landing-heading)]">{roadmapIntro.title}</h1>
            <p className="mx-auto mt-[1.1rem] max-w-[44rem] text-[clamp(1.05rem,2vw,1.2rem)] font-medium leading-[1.6] text-[var(--ut-landing-subtle)]">{roadmapIntro.tagline}</p>
            <div className="mx-auto mt-[1.6rem] max-w-[46rem] space-y-[0.8rem] text-left text-[1rem] leading-[1.7] text-[var(--ut-landing-muted)]">
              {roadmapIntro.paragraphs.map((paragraph) => <p key={paragraph} className="m-0">{paragraph}</p>)}
            </div>
          </div>
        </section>
        {roadmapSections.map((section) => <RoadmapSectionView key={section.key} section={section} />)}
        <section aria-labelledby="roadmap-about-heading" className="py-[3.2rem] max-[768px]:py-[2.4rem]">
          <div className="mx-auto w-[min(100%-2rem,76rem)]">
            <div className="rounded-[1.2rem] border border-[var(--ut-landing-card-border)] bg-[var(--ut-landing-surface-soft)] p-[1.75rem] max-[640px]:p-[1.35rem]">
              <h2 id="roadmap-about-heading" className="m-0 text-[1.25rem] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--ut-landing-heading)]">{roadmapAbout.title}</h2>
              <div className="mt-[0.7rem] max-w-[46rem] space-y-[0.6rem] text-[0.95rem] leading-[1.7] text-[var(--ut-landing-muted)]">
                {roadmapAbout.paragraphs.map((paragraph) => <p key={paragraph} className="m-0">{paragraph}</p>)}
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
