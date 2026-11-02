import type { CredentialResponse } from '../../lib/dto/credentials';
import type { DashboardActivity, DashboardResponse } from '../../lib/dto/dashboard';

/**
 * Pure presentation mapping for the dashboard (Angular parity: dashboard.helpers.ts / dashboard.mappers.ts).
 * It never mutates the DTO arrays it receives (the cache owns them) and has no React or network dependency.
 */

export type DashboardTone = 'primary' | 'active' | 'expiring' | 'expired';
export type ActivityIconKey = 'file' | 'plus' | 'generic';

export const PANEL_ROW_LIMIT = 3;
export const ACTIVITY_LIMIT = 4;
const MS_PER_DAY = 86_400_000;

export interface StatCardView { key: 'total' | 'active' | 'expiring' | 'expired'; label: string; value: number; tone: DashboardTone }
export interface ExpirationRowView {
  id: string; name: string; organization: string; typeLabel: string;
  badgeLabel: string; badgeTone: 'expiring' | 'expired'; dateLabel: string; highlighted: boolean;
  /** Formatted hours still needed, or null when no CE attention applies. */
  ceStillNeeded: string | null;
  href: string;
}
export interface CeNeededRowView {
  id: string; name: string; organization: string; typeLabel: string;
  percent: number; percentLabel: string; hoursLabel: string; tone: DashboardTone; dueLabel: string;
  remainingHours: string; href: string;
}
export interface ActivityRowView { id: string; title: string; subtitle: string; icon: ActivityIconKey; relativeTime: string }
export interface ListDrawerView<Row> { title: string; subtitle: string; rows: Row[] }

export interface DashboardView {
  greeting: string;
  firstName: string;
  dateLabel: string;
  isEmpty: boolean;
  stats: StatCardView[];
  expirations: ExpirationRowView[];
  expirationsOverflow: number;
  ceNeeded: CeNeededRowView[];
  ceNeededOverflow: number;
  /** Real number of credentials needing CE attention (not the number of visible rows). */
  ceNeededTotal: number;
  activity: ActivityRowView[];
  expirationsDrawer: ListDrawerView<ExpirationRowView>;
  ceNeededDrawer: ListDrawerView<CeNeededRowView>;
}

export function buildGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatLongDate(now: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
}

function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function formatShortDate(value: string): string {
  const date = parseDay(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

/** Whole days from the start of the browser's local "today" to the date (negative when past). */
export function daysUntil(value: string, now: Date): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((parseDay(value).getTime() - start.getTime()) / MS_PER_DAY);
}

export function formatRelativeDayLabel(daysAgo: number): string {
  if (daysAgo <= 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 14) return '1 week ago';
  return `${Math.round(daysAgo / 7)} weeks ago`;
}

/** At most two decimals, no trailing zeros, immune to float noise such as 8 - 3.3. */
export function formatHours(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

const typeLabel = (credential: CredentialResponse) => (credential.type === 'LICENSE' ? 'License' : 'Certification');
const credentialHref = (id: string) => `/credentials?credentialId=${encodeURIComponent(id)}`;
const needsCe = (credential: CredentialResponse) => credential.requiredCEHours > 0 && credential.ceHoursEarned < credential.requiredCEHours;
const percentOf = (credential: CredentialResponse) => {
  const percent = Math.round(Math.min(1, credential.ceProgress) * 100);
  return Number.isFinite(percent) ? Math.max(0, percent) : 0;
};

function ceTone(credential: CredentialResponse, percent: number): DashboardTone {
  if (percent >= 100) return 'active';
  if (credential.status === 'EXPIRING_SOON') return 'expiring';
  if (credential.status === 'EXPIRED') return 'expired';
  return 'primary';
}

function expirationRow(credential: CredentialResponse, index: number, now: Date): ExpirationRowView {
  const remaining = daysUntil(credential.expirationDate, now);
  return {
    id: credential.id,
    name: credential.name,
    organization: credential.issuingOrganization,
    typeLabel: typeLabel(credential),
    badgeLabel: remaining < 0 ? 'Expired' : `${remaining}d left`,
    badgeTone: remaining < 0 ? 'expired' : 'expiring',
    dateLabel: formatShortDate(credential.expirationDate),
    highlighted: index === 0,
    ceStillNeeded: needsCe(credential) ? formatHours(credential.requiredCEHours - credential.ceHoursEarned) : null,
    href: credentialHref(credential.id),
  };
}

function ceRow(credential: CredentialResponse): CeNeededRowView {
  const percent = percentOf(credential);
  return {
    id: credential.id,
    name: credential.name,
    organization: credential.issuingOrganization,
    typeLabel: typeLabel(credential),
    percent,
    percentLabel: `${percent}%`,
    hoursLabel: `${formatHours(credential.ceHoursEarned)}/${formatHours(credential.requiredCEHours)} hrs`,
    tone: ceTone(credential, percent),
    dueLabel: `Due ${formatShortDate(credential.expirationDate)}`,
    remainingHours: formatHours(Math.max(credential.requiredCEHours - credential.ceHoursEarned, 0)),
    href: credentialHref(credential.id),
  };
}

export function activityIconKey(icon: string): ActivityIconKey {
  if (icon === 'pi pi-file') return 'file';
  if (icon === 'pi pi-plus') return 'plus';
  return 'generic';
}

function activityRow(activity: DashboardActivity, now: Date): ActivityRowView {
  const day = new Date(`${activity.activityDate}T12:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const recordDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const daysAgo = Math.floor((today.getTime() - recordDay.getTime()) / MS_PER_DAY);
  return {
    id: activity.id,
    title: activity.title,
    subtitle: activity.subtitle,
    icon: activityIconKey(activity.icon),
    relativeTime: Number.isFinite(daysAgo) ? formatRelativeDayLabel(daysAgo) : '',
  };
}

const plural = (count: number, singular: string) => `${count} ${singular}${count === 1 ? '' : 's'}`;

export function buildDashboardView(data: DashboardResponse, user: { name: string } | null, now: Date): DashboardView {
  const name = user?.name?.trim() || 'UpTrack User';
  // Every sort below runs on a copy: the DTO arrays belong to the query cache.
  const upcoming = [...data.upcomingExpirations].map((credential, index) => expirationRow(credential, index, now));
  const ceByDate = [...data.ceAttention]
    .sort((left, right) => left.expirationDate.localeCompare(right.expirationDate) || left.ceProgress - right.ceProgress)
    .map(ceRow);
  const ceByCompletion = [...data.ceAttention]
    .filter(credential => credential.requiredCEHours > 0 && credential.ceProgress < 1)
    .sort((left, right) => left.ceProgress - right.ceProgress || left.expirationDate.localeCompare(right.expirationDate))
    .map(ceRow);
  const drawerExpirations = [...data.upcomingExpirations]
    .sort((left, right) => {
      const leftPast = daysUntil(left.expirationDate, now) < 0;
      const rightPast = daysUntil(right.expirationDate, now) < 0;
      if (leftPast !== rightPast) return leftPast ? -1 : 1;
      return left.expirationDate.localeCompare(right.expirationDate);
    })
    .map((credential, index) => expirationRow(credential, index, now));
  const { stats } = data;
  return {
    greeting: buildGreeting(now),
    firstName: name.split(/\s+/)[0] || name,
    dateLabel: formatLongDate(now),
    isEmpty: stats.totalCredentials === 0,
    stats: [
      { key: 'total', label: 'Total Credentials', value: stats.totalCredentials, tone: 'primary' },
      { key: 'active', label: 'Active', value: stats.activeCount, tone: 'active' },
      { key: 'expiring', label: 'Expiring Soon', value: stats.expiringSoonCount, tone: 'expiring' },
      { key: 'expired', label: 'Expired', value: stats.expiredCount, tone: 'expired' },
    ],
    expirations: upcoming.slice(0, PANEL_ROW_LIMIT),
    expirationsOverflow: Math.max(0, upcoming.length - PANEL_ROW_LIMIT),
    ceNeeded: ceByDate.slice(0, PANEL_ROW_LIMIT),
    ceNeededOverflow: Math.max(0, ceByDate.length - PANEL_ROW_LIMIT),
    ceNeededTotal: stats.needsCEAttentionCount,
    activity: [...data.recentActivity]
      .sort((a, b) => b.activityDate.localeCompare(a.activityDate))
      .slice(0, ACTIVITY_LIMIT)
      .map(activity => activityRow(activity, now)),
    expirationsDrawer: { title: 'All Upcoming Expirations', subtitle: `${plural(drawerExpirations.length, 'credential')} · sorted by urgency`, rows: drawerExpirations },
    ceNeededDrawer: { title: 'Credentials Needing CE Attention', subtitle: `${plural(ceByCompletion.length, 'credential')} · lowest completion first`, rows: ceByCompletion },
  };
}
