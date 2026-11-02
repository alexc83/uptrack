import type { CredentialResponse } from '../../lib/dto/credentials';
import { daysUntil, formatShortDate } from '../dashboard/dashboard-view';

export { formatShortDate };
export const formatCredentialHours = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
export function credentialView(credential: CredentialResponse, now = new Date()) {
  const remaining = daysUntil(credential.expirationDate, now);
  const percent = credential.requiredCEHours > 0 ? Math.round(Math.min(1, credential.ceProgress) * 100) : 100;
  const tone = percent >= 100 ? 'active' : credential.status === 'EXPIRED' ? 'expired' : credential.status === 'EXPIRING_SOON' ? 'expiring' : 'primary';
  return {
    typeLabel: credential.type === 'LICENSE' ? 'License' : 'Certification',
    statusLabel: credential.status === 'EXPIRED' || remaining < 0 ? 'Expired' : credential.status === 'EXPIRING_SOON' ? `${remaining}d left` : 'Active',
    expiration: formatShortDate(credential.expirationDate),
    percent,
    tone: tone as 'active' | 'expired' | 'expiring' | 'primary',
    progressLabel: credential.requiredCEHours > 0 ? `${percent}% complete` : 'Complete',
    hoursLabel: credential.requiredCEHours > 0 ? `${formatCredentialHours(credential.ceHoursEarned)} / ${formatCredentialHours(credential.requiredCEHours)} hours` : 'No CE required',
  };
}
export const sortCredentials = (credentials: CredentialResponse[]) => [...credentials].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
export const credentialReportHref = (id: string) => `/credentials/${encodeURIComponent(id)}/ce-report?returnTo=%2Fcredentials`;
