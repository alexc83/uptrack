import { CeRecord } from '../../../models/ce-record.models';
import { formatShortDate } from '../../dashboard/utils/dashboard.helpers';

export interface CeRecordListItemView {
  id: string;
  title: string;
  provider: string;
  completedDateLabel: string;
  hours: number;
  hoursLabel: string;
  credentialId: string;
  credentialName: string;
  credentialOrganization: string;
  hasCertificate: boolean;
  certificateLabel: string;
}

export function buildCeRecordListItemViews(records: CeRecord[]): CeRecordListItemView[] {
  return [...records]
    .sort((left, right) => right.dateCompleted.localeCompare(left.dateCompleted))
    .map((record) => ({
      id: record.id,
      title: record.title,
      provider: record.provider,
      completedDateLabel: formatShortDate(record.dateCompleted),
      hours: record.hours,
      hoursLabel: `${formatHours(record.hours)} hrs`,
      credentialId: record.credentialId,
      credentialName: record.credentialName ?? 'Credential',
      credentialOrganization: record.credentialOrganization ?? 'Linked credential',
      hasCertificate: !!record.certificateUrl,
      certificateLabel: record.certificateUrl ? 'On file' : 'Missing',
    }));
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
