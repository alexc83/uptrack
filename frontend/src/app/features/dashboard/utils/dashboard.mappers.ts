import { Credential } from '../../../models/credential.model';
import { Dashboard, DashboardActivity } from '../../../models/dashboard.model';
import { User } from '../../../models/user.model';
import {
  CeProgressRowView,
  DashboardPageView,
  DashboardStatCardView,
  DashboardTone,
  RecentActivityRowView,
  UpcomingExpirationRowView,
} from '../models/dashboard.models';
import {
  buildGreeting,
  daysUntil,
  formatLongDate,
  formatRelativeDayLabel,
  formatShortDate,
} from './dashboard.helpers';

export function buildDashboardPageView(params: {
  user: User;
  dashboard: Dashboard;
  now: Date;
}): DashboardPageView {
  const { user, dashboard, now } = params;
  const expirations = buildExpirations(dashboard, now);
  const progress = buildProgress(dashboard.ceAttention);

  return {
    header: {
      greeting: buildGreeting(now),
      firstName: user.name.split(' ')[0] ?? user.name,
      formattedDate: formatLongDate(now),
    },
    stats: buildStats(dashboard),
    expirations: expirations.slice(0, 3),
    progress: progress.slice(0, 3),
    recentActivity: buildRecentActivity(dashboard.recentActivity, now),
    expirationsOverflowCount: Math.max(0, expirations.length - 3),
    progressOverflowCount: Math.max(0, progress.length - 3),
  };
}

function buildStats(dashboard: Dashboard): DashboardStatCardView[] {
  return [
    {
      title: 'Total Credentials',
      value: dashboard.stats.totalCredentials,
      icon: 'pi pi-shield',
      tone: 'primary',
    },
    {
      title: 'Active',
      value: dashboard.stats.activeCount,
      icon: 'pi pi-check-circle',
      tone: 'active',
    },
    {
      title: 'Expiring Soon',
      value: dashboard.stats.expiringSoonCount,
      icon: 'pi pi-exclamation-triangle',
      tone: 'expiring',
    },
    {
      title: 'Expired',
      value: dashboard.stats.expiredCount,
      icon: 'pi pi-times-circle',
      tone: 'expired',
    },
  ];
}

function buildExpirations(dashboard: Dashboard, now: Date): UpcomingExpirationRowView[] {
  return dashboard.upcomingExpirations.map((credential, index) => {
    const remainingDays = daysUntil(credential.expirationDate, now);
    const ceNeeded =
      credential.requiredCEHours > 0 && credential.ceHoursEarned < credential.requiredCEHours;

    return {
      id: credential.id,
      name: credential.name,
      organization: credential.issuingOrganization,
      typeLabel: credential.type === 'LICENSE' ? 'License' : 'Certification',
      badgeLabel: remainingDays < 0 ? 'Expired' : `${remainingDays}d left`,
      badgeTone: remainingDays < 0 ? 'expired' : 'expiring',
      formattedDate: formatShortDate(credential.expirationDate),
      highlighted: index === 0,
      ceAttentionLabel: ceNeeded
        ? `${credential.requiredCEHours - credential.ceHoursEarned} CE hrs still needed`
        : undefined,
    };
  });
}

function buildProgress(credentials: Credential[]): CeProgressRowView[] {
  return credentials
    .sort((left, right) => {
      const dateRank = left.expirationDate.localeCompare(right.expirationDate);
      return dateRank !== 0 ? dateRank : left.ceProgress - right.ceProgress;
    })
    .map((credential) => {
      const percent = Math.round(Math.min(1, credential.ceProgress) * 100);

      return {
        id: credential.id,
        name: credential.name,
        percent,
        percentLabel: `${percent}%`,
        hoursLabel: `${credential.ceHoursEarned}/${credential.requiredCEHours} hrs`,
        tone: progressTone(credential, percent),
        dueDateLabel: `Due ${formatShortDate(credential.expirationDate)}`,
      };
    });
}

function progressTone(credential: Credential, percent: number): DashboardTone {
  if (percent >= 100) {
    return 'active';
  }

  if (credential.status === 'EXPIRING_SOON') {
    return 'expiring';
  }

  if (credential.status === 'EXPIRED') {
    return 'expired';
  }

  return 'primary';
}

function buildRecentActivity(activityItems: DashboardActivity[], now: Date): RecentActivityRowView[] {
  return [...activityItems]
    .sort((a, b) => b.activityDate.localeCompare(a.activityDate))
    .slice(0, 4)
    .map((activity) => {
      const activityDate = new Date(`${activity.activityDate}T12:00:00`);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const recordDay = new Date(
        activityDate.getFullYear(),
        activityDate.getMonth(),
        activityDate.getDate(),
      );
      const daysAgo = Math.floor((today.getTime() - recordDay.getTime()) / 86_400_000);

      return {
        id: activity.id,
        title: activity.title,
        subtitle: activity.subtitle,
        icon: activity.icon,
        relativeTime: formatRelativeDayLabel(daysAgo),
      };
    });
}
