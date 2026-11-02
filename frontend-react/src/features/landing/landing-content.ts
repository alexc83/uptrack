import { Bell, BookOpen, FileText, Shield, type LucideIcon } from 'lucide-react';
import type { MouseEvent } from 'react';

/** Auth-trigger handler: receives the click so the page can record the trigger for focus restoration. */
export type LandingTrigger = (event: MouseEvent<HTMLButtonElement>) => void;

export interface LandingFeatureCard {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

export interface LandingBenefit {
  title: string;
  description: string;
}

/** Mirrors the Angular `featureCards` content (PrimeIcons mapped to lucide-react). */
export const featureCards: LandingFeatureCard[] = [
  {
    icon: Shield,
    iconBg: '#e8f0ff',
    iconColor: '#3f6fbe',
    title: 'Credential Tracking',
    description:
      'Track all your licenses and certifications in one place. Monitor expiration dates and renewal cycles for RN, NP, MD, DO, RT, and PA credentials.',
  },
  {
    icon: BookOpen,
    iconBg: '#eefaf0',
    iconColor: '#4ca55b',
    title: 'CE Progress Monitoring',
    description:
      "Automatically calculate CE hours earned toward each credential's renewal requirements. See your progress at a glance with visual progress bars.",
  },
  {
    icon: FileText,
    iconBg: '#f4eaff',
    iconColor: '#8b3ff8',
    title: 'Certificate Storage',
    description:
      'Upload and store CE certificates, course documentation, and completion records. Keep everything organized and accessible for audits or credentialing.',
  },
  {
    icon: Bell,
    iconBg: '#fff6e8',
    iconColor: '#d48817',
    title: 'Expiration Alerts',
    description:
      'Get clear visibility into upcoming expirations. Credentials expiring within 90 days are automatically flagged so you can renew before deadlines.',
  },
];

/** Mirrors the Angular `complianceBenefits` content. */
export const complianceBenefits: LandingBenefit[] = [
  {
    title: 'Smart status tracking',
    description:
      'Credentials are automatically categorized as Active, Expiring Soon, or Expired based on expiration dates.',
  },
  {
    title: 'CE progress visualization',
    description:
      "See exactly how many hours you've earned toward each credential's CE requirements.",
  },
  {
    title: 'Upcoming expirations',
    description: 'View all credentials expiring in the next 90 days with days-remaining indicators.',
  },
  {
    title: 'Audit-ready records',
    description:
      'All your credentials and CE documentation in one organized, exportable location.',
  },
];
