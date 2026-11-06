import { BadgeCheck, Compass, Lightbulb, Zap, type LucideIcon } from 'lucide-react';

export interface RoadmapEntry {
  title: string;
  description: string;
}

export type RoadmapSectionKey = 'now' | 'next' | 'later' | 'completed';

export interface RoadmapSection {
  key: RoadmapSectionKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  entries: RoadmapEntry[];
}

export const roadmapIntro = {
  title: 'Product Roadmap',
  tagline: "See what we've built, what we're improving, and where UpTrack is headed.",
  paragraphs: [
    'UpTrack is an evolving application for organizing professional credentials, tracking continuing education, and staying on top of renewal requirements.',
    "This roadmap highlights what's been completed, what we're working toward next, and ideas we're exploring for the future.",
  ],
};

export const roadmapAbout = {
  title: 'About This Roadmap',
  paragraphs: [
    'Priorities may change as UpTrack develops. Planned features are not guaranteed, and no release dates are implied.',
    'UpTrack is an independently developed project, built and improved over time.',
  ],
};

export const roadmapSections: RoadmapSection[] = [
  {
    key: 'now',
    title: 'Now',
    subtitle: 'Current and immediately committed priorities',
    icon: Zap,
    entries: [
      {
        title: 'Help Center',
        description: "Building practical guides to help users get started, manage credentials, track continuing education, and use UpTrack's features with confidence.",
      },
    ],
  },
  {
    key: 'next',
    title: 'Next',
    subtitle: 'Planned near-term improvements',
    icon: Compass,
    entries: [
      {
        title: 'Installable Mobile Experience (PWA)',
        description: 'Make UpTrack easier to access from a phone, with the ability to add it to your home screen for a more app-like experience.',
      },
      {
        title: 'Expiration Reminders',
        description: 'Help users prepare for upcoming credential renewals with timely reminders about important expiration dates.',
      },
    ],
  },
  {
    key: 'later',
    title: 'Later',
    subtitle: "Ideas we're exploring",
    icon: Lightbulb,
    entries: [
      {
        title: 'Dedicated iPhone App',
        description: 'Explore a dedicated iPhone app for accessing credentials, continuing education records, and professional information on the go.',
      },
      {
        title: 'Professional Development Portfolio',
        description: 'Explore ways to organize professional accomplishments, education, certifications, and career milestones in one place.',
      },
      {
        title: 'Expanded Reporting and Insights',
        description: 'Explore additional ways to review continuing education history and understand professional development progress over time.',
      },
      {
        title: 'Data Export and Portability',
        description: 'Explore options for downloading credential information and continuing education records for personal use or recordkeeping.',
      },
    ],
  },
  {
    key: 'completed',
    title: 'Completed',
    subtitle: 'Capabilities already built and verified',
    icon: BadgeCheck,
    entries: [
      {
        title: 'Public Product Roadmap',
        description: "Explore what's available in UpTrack today, see which improvements are coming next, and discover ideas being considered for the future.",
      },
      {
        title: 'Professional Credential Tracking',
        description: 'Add and manage professional licenses and certifications, with important details and expiration dates organized in one place.',
      },
      {
        title: 'Continuing Education Tracking',
        description: 'Record completed continuing education activities, connect them to relevant credentials, and track progress toward renewal requirements.',
      },
      {
        title: 'Dashboard and Reports',
        description: 'View upcoming credential expirations, review continuing education progress, and access detailed reports of completed learning activities.',
      },
      {
        title: 'Refreshed Application Experience',
        description: 'Navigate UpTrack through an updated interface designed for desktop and mobile screens.',
      },
    ],
  },
];

/** Sections shown on the page: a section with no entries (for example Now between releases) is hidden. */
export function visibleRoadmapSections(sections: RoadmapSection[] = roadmapSections): RoadmapSection[] {
  return sections.filter((section) => section.entries.length > 0);
}
