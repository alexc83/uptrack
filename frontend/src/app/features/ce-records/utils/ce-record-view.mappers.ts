import { CeRecord } from '../../../models/ce-record.models';
import { formatShortDate } from '../../dashboard/utils/dashboard.helpers';

export interface CeRecordListItemView {
  id: string;
  title: string;
  provider: string;
  completedDateLabel: string;
  hoursLabel: string;
  credentialId: string;
  credentialName: string;
  credentialOrganization: string;
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
      hoursLabel: `${formatHours(record.hours)} hrs`,
      credentialId: record.credentialId,
      credentialName: record.credentialName ?? 'Credential',
      credentialOrganization: record.credentialOrganization ?? 'Linked credential',
      certificateLabel: record.certificateUrl ? 'Certificate on file' : 'No certificate',
    }));
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
