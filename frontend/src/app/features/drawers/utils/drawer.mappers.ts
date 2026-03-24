import { CeRecord } from '../../../models/ce-record.model';
import { Credential } from '../../../models/credential.model';
import { daysUntil, formatShortDate } from '../../dashboard/utils/dashboard.helpers';
import {
  CeRecordDetailDrawerView,
  CredentialDetailDrawerView,
  CredentialListDrawerView,
  DrawerActionView,
  DrawerTone,
} from '../models/drawer.models';

export function buildCredentialDetailDrawerView(params: {
  credential: Credential;
  ceRecords: CeRecord[];
  now: Date;
}): CredentialDetailDrawerView {
  const { credential, ceRecords, now } = params;
  const remainingDays = daysUntil(credential.expirationDate, now);
  const cePercent = Math.round(Math.min(1, credential.ceProgress) * 100);
  const displayPercent = credential.requiredCEHours > 0 ? cePercent : 100;
  const totalHours = ceRecords.reduce((sum, record) => sum + record.hours, 0);

  return {
    id: credential.id,
    icon: credential.type === 'LICENSE' ? 'pi pi-shield' : 'pi pi-verified',
    name: credential.name,
    organization: credential.issuingOrganization,
    typeLabel: credential.type === 'LICENSE' ? 'License' : 'Certification',
    statusLabel: buildStatusLabel(credential, remainingDays),
    statusTone: credentialTone(credential),
    metadata: [
      {
        label: 'Expires',
        value: formatShortDate(credential.expirationDate),
      },
      {
        label: 'Renewal Cycle',
        value: `${credential.renewalCycleMonths} months`,
      },
      {
        label: 'Required CE Hours',
        value: credential.requiredCEHours > 0 ? `${credential.requiredCEHours} hours` : 'Not required',
      },
      {
        label: 'Current Status',
        value: credential.status === 'EXPIRING_SOON' ? 'Expiring Soon' : titleCaseStatus(credential.status),
      },
    ],
    ceHoursLabel:
      credential.requiredCEHours > 0
        ? `${formatHours(credential.ceHoursEarned)} / ${formatHours(credential.requiredCEHours)} hours`
        : 'No CE required',
    cePercentLabel: credential.requiredCEHours > 0 ? `${displayPercent}% complete` : 'Complete',
    cePercent: displayPercent,
    ceProgressTone: ceProgressTone(credential, displayPercent),
    ceRecordsTitle: `CE Records (${ceRecords.length})`,
    ceRecordsDescription:
      credential.requiredCEHours > 0
        ? 'Recent continuing education attached to this credential'
        : 'Continuing education tracking is not required for this credential',
    ceRecords: ceRecords
      .sort((left, right) => right.dateCompleted.localeCompare(left.dateCompleted))
      .map((record) => ({
        id: record.id,
        title: record.title,
        subtitle: `${record.provider} · ${formatShortDate(record.dateCompleted)}`,
        hoursLabel: `${formatHours(record.hours)} hrs`,
        certificateLabel: record.certificateUrl ? 'Certificate on file' : 'No certificate',
      })),
    ceRecordsEmptyTitle:
      credential.requiredCEHours > 0 ? 'No CE records yet' : 'No CE records required',
    ceRecordsEmptyMessage:
      credential.requiredCEHours > 0
        ? "Add a CE record to start building this credential's renewal history."
        : 'This credential does not require continuing education records for renewal.',
    ceSummaryRecordsLabel: `${ceRecords.length} record${ceRecords.length === 1 ? '' : 's'}`,
    ceSummaryHoursLabel: `${formatHours(totalHours)} total hours`,
    actions: buildCredentialActions(),
  };
}

export function buildCeRecordDetailDrawerView(params: {
  record: CeRecord;
  credential: Pick<Credential, 'id' | 'name' | 'issuingOrganization'>;
}): CeRecordDetailDrawerView {
  const { record, credential } = params;

  return {
    id: record.id,
    title: record.title,
    provider: record.provider,
    completedDateLabel: formatShortDate(record.dateCompleted),
    hoursLabel: `${formatHours(record.hours)} hrs`,
    metadata: [
      { label: 'Hours Earned', value: `${formatHours(record.hours)} hours` },
      { label: 'Date Completed', value: formatShortDate(record.dateCompleted) },
      { label: 'Provider', value: record.provider },
    ],
    credentialId: credential.id,
    credentialName: credential.name,
    credentialOrganization: credential.issuingOrganization,
    certificateLabel: record.certificateUrl ? 'View certificate' : 'No certificate uploaded',
    certificateUrl: record.certificateUrl ?? undefined,
    actions: [
      { id: 'edit-ce-record', label: 'Edit CE Record', variant: 'primary' },
      { id: 'delete-ce-record', label: 'Delete CE Record', variant: 'danger' },
    ],
  };
}

export function buildCredentialListDrawerView(params: {
  mode: 'expiring' | 'needs-ce';
  credentials: Credential[];
  now: Date;
}): CredentialListDrawerView {
  const { mode, credentials, now } = params;

  if (mode === 'expiring') {
    const items = [...credentials]
      .sort((left, right) => {
        const leftDays = daysUntil(left.expirationDate, now);
        const rightDays = daysUntil(right.expirationDate, now);

        if (leftDays < 0 && rightDays >= 0) {
          return -1;
        }

        if (leftDays >= 0 && rightDays < 0) {
          return 1;
        }

        return left.expirationDate.localeCompare(right.expirationDate);
      })
      .map((credential) => {
        const remainingDays = daysUntil(credential.expirationDate, now);

        return {
          id: credential.id,
          name: credential.name,
          organization: credential.issuingOrganization,
          typeLabel: credential.type === 'LICENSE' ? 'License' : 'Certification',
          statusLabel: buildStatusLabel(credential, remainingDays),
          statusTone: credentialTone(credential),
          supportingText: `Expires ${formatShortDate(credential.expirationDate)}`,
          helperLabel:
            credential.requiredCEHours > 0 && credential.ceHoursEarned < credential.requiredCEHours
              ? `${formatHours(credential.requiredCEHours - credential.ceHoursEarned)} hrs remaining`
              : undefined,
        };
      });

    return {
      mode,
      title: 'All Upcoming Expirations',
      subtitle: `${items.length} credential${items.length === 1 ? '' : 's'} · sorted by urgency`,
      items,
    };
  }

  const items = [...credentials]
    .filter((credential) => credential.requiredCEHours > 0 && credential.ceProgress < 1)
    .sort((left, right) => {
      const progressDelta = left.ceProgress - right.ceProgress;
      return progressDelta !== 0 ? progressDelta : left.expirationDate.localeCompare(right.expirationDate);
    })
    .map((credential) => {
      const remainingHours = Math.max(credential.requiredCEHours - credential.ceHoursEarned, 0);
      const percent = Math.round(Math.min(1, credential.ceProgress) * 100);

      return {
        id: credential.id,
        name: credential.name,
        organization: credential.issuingOrganization,
        typeLabel: credential.type === 'LICENSE' ? 'License' : 'Certification',
        statusLabel: `${percent}%`,
        statusTone: ceProgressTone(credential, percent),
        supportingText: `${formatHours(credential.ceHoursEarned)} / ${formatHours(credential.requiredCEHours)} hours`,
        progressLabel: `${percent}% complete`,
        progressPercent: percent,
        progressTone: ceProgressTone(credential, percent),
        helperLabel: `${formatHours(remainingHours)} hrs remaining`,
      };
    });

  return {
    mode,
    title: 'Credentials Needing CE Attention',
    subtitle: `${items.length} credential${items.length === 1 ? '' : 's'} · lowest completion first`,
    items,
  };
}

function buildCredentialActions(): DrawerActionView[] {
  return [
    { id: 'add-ce-record', label: 'Add CE Record', variant: 'primary' },
    { id: 'edit-credential', label: 'Edit Credential', variant: 'secondary' },
    { id: 'delete-credential', label: 'Delete Credential', variant: 'danger' },
    { id: 'export-ce-summary', label: 'Export CE Summary', variant: 'text' },
  ];
}

function credentialTone(credential: Credential): DrawerTone {
  if (credential.status === 'EXPIRED') {
    return 'expired';
  }

  if (credential.status === 'EXPIRING_SOON') {
    return 'expiring';
  }

  return 'active';
}

function ceProgressTone(credential: Credential, percent: number): DrawerTone {
  if (percent >= 100) {
    return 'active';
  }

  if (credential.status === 'EXPIRED') {
    return 'expired';
  }

  if (credential.status === 'EXPIRING_SOON') {
    return 'expiring';
  }

  return 'primary';
}

function buildStatusLabel(credential: Credential, remainingDays: number): string {
  if (credential.status === 'EXPIRED' || remainingDays < 0) {
    return 'Expired';
  }

  if (credential.status === 'EXPIRING_SOON') {
    return `${remainingDays}d left`;
  }

  return 'Active';
}

function titleCaseStatus(status: Credential['status']): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
