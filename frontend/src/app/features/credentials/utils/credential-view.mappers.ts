import { Credential } from '../../../models/credential.models';
import { daysUntil, formatShortDate } from '../../dashboard/utils/dashboard.helpers';
import { DrawerTone } from '../../drawers/models/drawer.models';

export interface CredentialListCardView {
  id: string;
  name: string;
  organization: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: DrawerTone;
  expirationLabel: string;
  renewalCycleLabel: string;
  ceHoursLabel: string;
  cePercentLabel: string;
  cePercent: number;
  ceProgressTone: DrawerTone;
}

export function buildCredentialListCardViews(
  credentials: Credential[],
  now: Date,
): CredentialListCardView[] {
  return [...credentials]
    .sort((left, right) => left.expirationDate.localeCompare(right.expirationDate))
    .map((credential) => {
      const remainingDays = daysUntil(credential.expirationDate, now);
      const cePercent = Math.round(Math.min(1, credential.ceProgress) * 100);
      const displayPercent = credential.requiredCEHours > 0 ? cePercent : 100;

      return {
        id: credential.id,
        name: credential.name,
        organization: credential.issuingOrganization,
        typeLabel: credential.type === 'LICENSE' ? 'License' : 'Certification',
        statusLabel: buildStatusLabel(credential.status, remainingDays),
        statusTone: buildStatusTone(credential.status),
        expirationLabel: formatShortDate(credential.expirationDate),
        renewalCycleLabel: `${credential.renewalCycleMonths} months`,
        ceHoursLabel:
          credential.requiredCEHours > 0
            ? `${formatHours(credential.ceHoursEarned)} / ${formatHours(credential.requiredCEHours)} hours`
            : 'No CE required',
        cePercentLabel: credential.requiredCEHours > 0 ? `${displayPercent}% complete` : 'Complete',
        cePercent: displayPercent,
        ceProgressTone: buildProgressTone(credential.status, displayPercent),
      };
    });
}

function buildStatusLabel(status: Credential['status'], remainingDays: number): string {
  if (status === 'EXPIRED' || remainingDays < 0) {
    return 'Expired';
  }

  if (status === 'EXPIRING_SOON') {
    return `${remainingDays}d left`;
  }

  return 'Active';
}

function buildStatusTone(status: Credential['status']): DrawerTone {
  if (status === 'EXPIRED') {
    return 'expired';
  }

  if (status === 'EXPIRING_SOON') {
    return 'expiring';
  }

  return 'active';
}

function buildProgressTone(status: Credential['status'], percent: number): DrawerTone {
  if (percent >= 100) {
    return 'active';
  }

  if (status === 'EXPIRED') {
    return 'expired';
  }

  if (status === 'EXPIRING_SOON') {
    return 'expiring';
  }

  return 'primary';
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
