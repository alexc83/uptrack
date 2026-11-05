import type { CredentialStatus } from '../../lib/dto/credentials';
import type { CEReportResponse } from '../../lib/dto/ce-report';
import { formatLongDate, formatShortDate } from '../dashboard/dashboard-view';
import { formatCredentialHours } from '../credentials/credential-view';

/**
 * Pure presentation mapping for the CE report (Angular parity: ce-report-page.component.ts).
 * No React or network dependency; the query cache owns the DTO it receives.
 */

export const REPORT_FALLBACK_PATH = '/credentials';
export const REPORT_MISSING_ID_MESSAGE = 'We could not determine which credential report to open.';
export const REPORT_LOAD_ERROR_MESSAGE = 'We could not load this CE report right now.';

/** Back target: Angular accepts any path starting with `/`; protocol-relative `//` stays in-app there, so it falls back here. */
export function normalizeReportReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return REPORT_FALLBACK_PATH;
  return value;
}

export type ReportStatusTone = 'active' | 'expiring' | 'expired';

export function reportStatusTone(status: CredentialStatus): ReportStatusTone {
  if (status === 'EXPIRED') return 'expired';
  if (status === 'EXPIRING_SOON') return 'expiring';
  return 'active';
}

/** Generic underscore-to-title-case label, matching Angular `formatStatus`. */
export function reportStatusLabel(status: CredentialStatus): string {
  return status
    .toLowerCase()
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function reportProgressPercent(report: CEReportResponse): number {
  if (report.credential.requiredCEHours <= 0) return 100;
  return Math.round(Math.min(1, report.summary.progress) * 100);
}

export interface ReportSummaryField {
  label: string;
  value: string;
}

export function reportSummaryFields(report: CEReportResponse): ReportSummaryField[] {
  const { credential, summary } = report;
  const recordWord = summary.recordCount === 1 ? 'record' : 'records';
  return [
    { label: 'Credential Type', value: credential.type === 'LICENSE' ? 'License' : 'Certification' },
    { label: 'Issuing Organization', value: credential.issuingOrganization },
    { label: 'Expiration Date', value: formatShortDate(credential.expirationDate) },
    { label: 'Current Status', value: reportStatusLabel(credential.status) },
    {
      label: 'Required CE Hours',
      value: credential.requiredCEHours > 0 ? `${formatCredentialHours(credential.requiredCEHours)} hours` : 'Not required',
    },
    { label: 'Earned CE Hours', value: `${formatCredentialHours(summary.totalHoursEarned)} hours` },
    {
      label: 'Remaining Hours',
      value: credential.requiredCEHours > 0 ? `${formatCredentialHours(summary.remainingHours)} hours` : '0 hours',
    },
    { label: 'CE Record Count', value: `${summary.recordCount} ${recordWord}` },
  ];
}

export function reportCertificateLabel(certificateUrl: string | null | undefined, certificateAssetId?: string | null): string {
  return certificateUrl || certificateAssetId ? 'On file' : 'Not attached';
}

export function formatReportTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export { formatCredentialHours, formatLongDate, formatShortDate };
