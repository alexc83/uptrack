import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { RoadmapHeader } from './roadmap-header';
import { LandingFooter } from '../landing/landing-footer';
import { roadmapAbout, roadmapIntro, visibleRoadmapSections, type RoadmapEntry, type RoadmapSection, type RoadmapSectionKey } from './roadmap-content';

const sectionAccents: Record<RoadmapSectionKey, { chip: string; rule: string }> = {
  now: { chip: 'bg-[var(--ut-roadmap-now-bg)] text-[var(--ut-roadmap-now)]', rule: 'border-t-[var(--ut-roadmap-now)]' },
  next: { chip: 'bg-[var(--ut-roadmap-next-bg)] text-[var(--ut-roadmap-next)]', rule: 'border-t-[var(--ut-roadmap-next)]' },
  later: { chip: 'bg-[var(--ut-roadmap-later-bg)] text-[var(--ut-roadmap-later)]', rule: 'border-t-[var(--ut-roadmap-later)]' },
  completed: { chip: 'bg-[var(--ut-roadmap-done-bg)] text-[var(--ut-roadmap-done)]', rule: 'border-t-[var(--ut-roadmap-done)]' },
};

/** Shared two-track grid: a left rail for headings and a right track for content. */
const railGrid = 'mx-auto grid w-[min(100%-2rem,76rem)] grid-cols-1 gap-x-[3.5rem] gap-y-[1.6rem] lg:grid-cols-[15rem_minmax(0,1fr)]';

const titleClass = 'm-0 text-[1.08rem] font-semibold leading-[1.4] text-[var(--ut-landing-heading)]';
const bodyClass = 'm-0 mt-[0.55rem] text-[1rem] leading-[1.7] text-pretty text-[var(--ut-landing-muted)]';

/** Now / Next: lifted cards with a colored top rule. "Now" carries the shadow; "Next" is flat. */
function PlannedEntry({ entry, sectionKey }: { entry: RoadmapEntry; sectionKey: RoadmapSectionKey }) {
  const elevated = sectionKey === 'now';
  return (
    <article
      className={`rounded-[1rem] border border-t-[3px] border-[var(--ut-landing-card-border)] ${sectionAccents[sectionKey].rule} bg-[var(--ut-landing-surface)] p-[1.5rem] max-[640px]:p-[1.25rem] ${elevated ? 'shadow-[var(--ut-landing-card-shadow)]' : ''}`}
    >
      <h3 className={titleClass}>{entry.title}</h3>
      <p className={bodyClass}>{entry.description}</p>
    </article>
  );
}

/** Later: quiet, borderless entries on hairlines, signalling ideas rather than commitments. */
function ExploringEntry({ entry }: { entry: RoadmapEntry }) {
  return (
    <article className="border-t border-[var(--ut-landing-card-border)] pt-[1.25rem]">
      <h3 className={titleClass}>{entry.title}</h3>
      <p className={bodyClass}>{entry.description}</p>
    </article>
  );
}

/** Completed: hairline rows with a check marker. */
function CompletedEntry({ entry }: { entry: RoadmapEntry }) {
  return (
    <article className="flex gap-[0.9rem] border-t border-[var(--ut-landing-card-border)] pt-[1.25rem]">
      <span className="mt-[0.15rem] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ut-roadmap-done-bg)] text-[var(--ut-roadmap-done)]">
        <Check className="h-[0.8rem] w-[0.8rem]" strokeWidth={3} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className={titleClass}>{entry.title}</h3>
        <p className={bodyClass}>{entry.description}</p>
      </div>
    </article>
  );
}

function RoadmapSectionView({ section }: { section: RoadmapSection }) {
  const Icon = section.icon;
  const compact = section.key === 'later' || section.key === 'completed';
  return (
    <section
      aria-labelledby={`roadmap-${section.key}-heading`}
      className="border-b border-[var(--ut-landing-footer-border)] py-[3.4rem] max-[768px]:py-[2.6rem]"
    >
      <div className={railGrid}>
        <div className="lg:sticky lg:top-[6.5rem] lg:self-start">
          <div className="flex items-center gap-[0.8rem] lg:flex-col lg:items-start lg:gap-[1rem]">
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.7rem] ${sectionAccents[section.key].chip}`}>
              <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
            </span>
            <h2
              id={`roadmap-${section.key}-heading`}
              className="m-0 text-[clamp(1.7rem,3vw,2.1rem)] font-bold leading-[1.15] tracking-[-0.035em] text-[var(--ut-landing-heading)]"
            >
              {section.title}
            </h2>
          </div>
          <p className="m-0 mt-[0.6rem] max-w-[16rem] text-[0.98rem] leading-[1.6] text-pretty text-[var(--ut-landing-muted)]">{section.subtitle}</p>
        </div>
        <div className={`grid grid-cols-2 max-[768px]:grid-cols-1 ${compact ? 'gap-x-[2.5rem] gap-y-[1.75rem]' : 'gap-[1.25rem]'}`}>
          {section.entries.map((entry) => {
            if (section.key === 'completed') return <CompletedEntry key={entry.title} entry={entry} />;
            if (section.key === 'later') return <ExploringEntry key={entry.title} entry={entry} />;
            return <PlannedEntry key={entry.title} entry={entry} sectionKey={section.key} />;
          })}
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
        <section
          aria-labelledby="roadmap-heading"
          className="border-b border-[var(--ut-landing-footer-border)] bg-[var(--ut-landing-surface-soft)] py-[3.6rem] max-[768px]:py-[2.5rem]"
        >
          <div className="mx-auto grid w-[min(100%-2rem,76rem)] grid-cols-1 items-end gap-x-[4rem] gap-y-[1.75rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              <h1
                id="roadmap-heading"
                className="m-0 text-[clamp(2.4rem,5vw,3.4rem)] font-bold leading-[1.08] tracking-[-0.05em] text-[var(--ut-landing-heading)]"
              >
                {roadmapIntro.title}
              </h1>
              <p className="m-0 mt-[1rem] max-w-[30rem] text-[clamp(1.08rem,2vw,1.25rem)] font-medium leading-[1.55] text-balance text-[var(--ut-landing-subtle)]">
                {roadmapIntro.tagline}
              </p>
            </div>
            <div className="flex flex-col gap-[0.85rem] border-l-2 border-[var(--ut-landing-primary)] pl-[1.4rem] text-[1rem] leading-[1.7] text-pretty text-[var(--ut-landing-muted)] max-[640px]:pl-[1rem]">
              {roadmapIntro.paragraphs.map((paragraph) => (
                <p key={paragraph} className="m-0 max-w-[34rem]">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>

        {visibleRoadmapSections().map((section) => (
          <RoadmapSectionView key={section.key} section={section} />
        ))}

        <section aria-labelledby="roadmap-about-heading" className="py-[3rem] max-[768px]:py-[2.4rem]">
          <div className={railGrid}>
            <h2 id="roadmap-about-heading" className="m-0 text-[1.08rem] font-semibold leading-[1.4] text-[var(--ut-landing-heading)]">
              {roadmapAbout.title}
            </h2>
            <div className="flex max-w-[40rem] flex-col gap-[0.75rem] text-[0.97rem] leading-[1.7] text-pretty text-[var(--ut-landing-muted)]">
              {roadmapAbout.paragraphs.map((paragraph) => (
                <p key={paragraph} className="m-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      </main>
      <LandingFooter showRoadmapLink={false} />
    </div>
  );
}
