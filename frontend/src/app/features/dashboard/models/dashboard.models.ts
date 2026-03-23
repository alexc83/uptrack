import { Credential } from '../../../models/credential.model';

export type DashboardTone = 'primary' | 'active' | 'expiring' | 'expired';

export interface DashboardHeaderView {
  greeting: string;
  firstName: string;
  formattedDate: string;
}

export interface DashboardStatCardView {
  title: string;
  value: number;
  icon: string;
  tone: DashboardTone;
}

export interface UpcomingExpirationRowView {
  id: string;
  name: string;
  organization: string;
  typeLabel: string;
  badgeLabel: string;
  badgeTone: 'expiring' | 'expired';
  formattedDate: string;
  highlighted: boolean;
  ceAttentionLabel?: string;
}

export interface CeProgressRowView {
  id: string;
  name: string;
  percent: number;
  percentLabel: string;
  hoursLabel: string;
  tone: DashboardTone;
  dueDateLabel: string;
}

export interface RecentActivityRowView {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  relativeTime: string;
}

export interface DashboardPageView {
  header: DashboardHeaderView;
  stats: DashboardStatCardView[];
  expirations: UpcomingExpirationRowView[];
  progress: CeProgressRowView[];
  recentActivity: RecentActivityRowView[];
  expirationsOverflowCount: number;
  progressOverflowCount: number;
}

export interface DashboardActivitySource {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  relativeTime: string;
}

export type DashboardCredential = Credential;
