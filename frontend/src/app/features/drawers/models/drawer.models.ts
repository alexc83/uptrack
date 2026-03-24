export type DrawerType = 'credential-detail' | 'ce-record-detail' | 'credential-list';
export type CredentialListMode = 'expiring' | 'needs-ce';
export type DrawerTone = 'primary' | 'active' | 'expiring' | 'expired';
export type DrawerActionId =
  | 'add-ce-record'
  | 'edit-credential'
  | 'delete-credential'
  | 'export-ce-summary'
  | 'edit-ce-record'
  | 'delete-ce-record';

export interface DrawerMetaFieldView {
  label: string;
  value: string;
}

export interface DrawerActionView {
  id: DrawerActionId;
  label: string;
  variant: 'primary' | 'secondary' | 'text' | 'danger';
}

export interface CredentialCeRecordListItemView {
  id: string;
  title: string;
  subtitle: string;
  hoursLabel: string;
  certificateLabel?: string;
}

export interface CredentialDetailDrawerView {
  id: string;
  icon: string;
  name: string;
  organization: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: DrawerTone;
  metadata: DrawerMetaFieldView[];
  ceHoursLabel: string;
  cePercentLabel: string;
  cePercent: number;
  ceProgressTone: DrawerTone;
  ceRecordsTitle: string;
  ceRecordsDescription: string;
  ceRecords: CredentialCeRecordListItemView[];
  ceRecordsEmptyTitle: string;
  ceRecordsEmptyMessage: string;
  ceSummaryRecordsLabel: string;
  ceSummaryHoursLabel: string;
  actions: DrawerActionView[];
}

export interface CeRecordDetailDrawerView {
  id: string;
  title: string;
  provider: string;
  completedDateLabel: string;
  hoursLabel: string;
  metadata: DrawerMetaFieldView[];
  credentialId: string;
  credentialName: string;
  credentialOrganization: string;
  certificateLabel: string;
  certificateUrl?: string;
  actions: DrawerActionView[];
}

export interface CredentialListDrawerItemView {
  id: string;
  name: string;
  organization: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: DrawerTone;
  supportingText: string;
  progressLabel?: string;
  progressPercent?: number;
  progressTone?: DrawerTone;
  helperLabel?: string;
}

export interface CredentialListDrawerView {
  mode: CredentialListMode;
  title: string;
  subtitle: string;
  items: CredentialListDrawerItemView[];
}
