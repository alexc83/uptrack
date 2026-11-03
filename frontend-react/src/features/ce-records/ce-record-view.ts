import type { CERecordResponse } from '../../lib/dto/ce-records';
import type { CredentialResponse } from '../../lib/dto/credentials';
import { formatShortDate } from '../dashboard/dashboard-view';

export { formatShortDate };

/** Angular parity: ce-record-view.mappers.ts — flatten credential-embedded CE records, newest first. */
export interface CERecordListItem {
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
export interface CERecordCredentialOption {
  credentialId: string;
  credentialName: string;
  credentialOrganization: string;
}
export interface CERecordFilters {
  search: string;
  credentialId: string;
  certificate: 'all' | 'on-file' | 'missing';
}

export const formatCEHours = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);

export function buildCERecordCredentialOptions(credentials: CredentialResponse[]): CERecordCredentialOption[] {
  return credentials.map(credential => ({
    credentialId: credential.id,
    credentialName: credential.name,
    credentialOrganization: credential.issuingOrganization,
  }));
}

export function flattenCERecords(credentials: CredentialResponse[]): CERecordListItem[] {
  return credentials
    .flatMap(credential => (credential.ceRecords ?? []).map(record => ({ record, credential })))
    .sort((left, right) => right.record.dateCompleted.localeCompare(left.record.dateCompleted))
    .map(({ record, credential }) => ({
      id: record.id,
      title: record.title,
      provider: record.provider,
      completedDateLabel: formatShortDate(record.dateCompleted),
      hours: record.hours,
      hoursLabel: `${formatCEHours(record.hours)} hrs`,
      credentialId: credential.id,
      credentialName: credential.name,
      credentialOrganization: credential.issuingOrganization,
      hasCertificate: Boolean(record.certificateUrl),
      certificateLabel: record.certificateUrl ? 'On file' : 'Missing',
    }));
}

export function filterCERecords(records: CERecordListItem[], filters: CERecordFilters): CERecordListItem[] {
  const search = filters.search.toLowerCase();
  return records.filter(record => {
    if (search && !record.title.toLowerCase().includes(search) && !record.provider.toLowerCase().includes(search)) return false;
    if (filters.credentialId && record.credentialId !== filters.credentialId) return false;
    if (filters.certificate === 'on-file' && !record.hasCertificate) return false;
    if (filters.certificate === 'missing' && record.hasCertificate) return false;
    return true;
  });
}

export const CE_PAGE_SIZE = 10;

export function paginateCERecords(records: CERecordListItem[], page: number) {
  const totalPages = Math.ceil(records.length / CE_PAGE_SIZE);
  const safePage = Math.min(Math.max(page, 0), Math.max(totalPages - 1, 0));
  const items = records.slice(safePage * CE_PAGE_SIZE, (safePage + 1) * CE_PAGE_SIZE);
  const total = records.length;
  const showingLabel = `Showing ${total === 0 ? 0 : safePage * CE_PAGE_SIZE + 1}–${Math.min((safePage + 1) * CE_PAGE_SIZE, total)} of ${total} record${total === 1 ? '' : 's'}`;
  return { items, totalPages, page: safePage, showingLabel };
}

export function summarizeCERecords(records: CERecordListItem[]) {
  const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
  return {
    recordCount: records.length,
    totalHoursLabel: formatCEHours(totalHours),
    missingCertificates: records.filter(record => !record.hasCertificate).length,
  };
}

/** Angular parity: drawer.mappers.ts buildCeRecordDetailDrawerView. */
export interface CERecordDetailView {
  title: string;
  provider: string;
  completedDateLabel: string;
  hoursLabel: string;
  metadata: { label: string; value: string }[];
  credentialId: string;
  credentialName: string;
  credentialOrganization: string;
  certificateLabel: string;
  certificateUrl: string | null;
}
export function buildCERecordDetailView(record: CERecordResponse, context: CERecordCredentialOption): CERecordDetailView {
  return {
    title: record.title,
    provider: record.provider,
    completedDateLabel: formatShortDate(record.dateCompleted),
    hoursLabel: `${formatCEHours(record.hours)} hrs`,
    metadata: [
      { label: 'Hours Earned', value: `${formatCEHours(record.hours)} hours` },
      { label: 'Date Completed', value: formatShortDate(record.dateCompleted) },
      { label: 'Provider', value: record.provider },
    ],
    credentialId: context.credentialId,
    credentialName: context.credentialName,
    credentialOrganization: context.credentialOrganization,
    certificateLabel: record.certificateUrl ? 'View certificate' : 'No certificate uploaded',
    certificateUrl: record.certificateUrl,
  };
}

/** Angular parity: the client-side guard in ce-record-form-dialog / detail-drawer-container. Backend: CertificateUploadServiceImpl. */
export const CERTIFICATE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/jpeg,image/png,image/webp,image/gif';
export const CERTIFICATE_HELP = 'Accepted file types: PDF, JPG, JPEG, PNG, WEBP, GIF.';
export const CERTIFICATE_TYPE_ERROR = 'Unsupported file type. Please choose a PDF or common image file.';
const SUPPORTED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export function isSupportedCertificateFile(file: File): boolean {
  if (SUPPORTED_MIME.has(file.type)) return true;
  return /\.(pdf|jpe?g|png|webp|gif)$/.test(file.name.toLowerCase());
}
