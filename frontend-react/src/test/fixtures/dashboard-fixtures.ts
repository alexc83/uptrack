import type { CredentialResponse, CredentialStatus } from '../../lib/dto/credentials';
import type { DashboardActivity, DashboardResponse } from '../../lib/dto/dashboard';

/** Fixed local clock used by dashboard tests: Monday 2 November 2026, 10:00. */
export const dashboardNow = new Date(2026, 10, 2, 10, 0, 0);

export function dayOffset(days: number, from: Date = dashboardNow): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const statusFor = (days: number): CredentialStatus => (days < 0 ? 'EXPIRED' : days <= 90 ? 'EXPIRING_SOON' : 'ACTIVE');

export function makeCredential(id: string, name: string, days: number, overrides: Partial<CredentialResponse> = {}): CredentialResponse {
  const required = overrides.requiredCEHours ?? 0;
  const earned = overrides.ceHoursEarned ?? 0;
  return {
    id, name, type: 'LICENSE', issuingOrganization: `${name} Board`, expirationDate: dayOffset(days), renewalCycleMonths: 24,
    requiredCEHours: required, status: statusFor(days), ceHoursEarned: earned, ceProgress: required > 0 ? Math.round((earned / required) * 10_000) / 10_000 : 0, ceRecords: [],
    ...overrides,
  };
}

export const makeActivity = (id: string, days: number, overrides: Partial<DashboardActivity> = {}): DashboardActivity => ({
  id, credentialId: 'c-1', title: 'Added CE record', subtitle: 'Credential - 4 hrs', icon: 'pi pi-plus', activityDate: dayOffset(days), ...overrides,
});

export const emptyDashboard: DashboardResponse = {
  stats: { totalCredentials: 0, activeCount: 0, expiringSoonCount: 0, expiredCount: 0, needsCEAttentionCount: 0 },
  upcomingExpirations: [], ceAttention: [], recentActivity: [],
};

/** Mirrors the shape of demo-main: 2 active, 1 expiring (needs CE), 1 expired, 2 needing CE. */
export function populatedDashboard(tag = 'A'): DashboardResponse {
  const acls = makeCredential(`${tag}-acls`, `${tag} ACLS Certification`, 30, { type: 'CERTIFICATION', requiredCEHours: 8, ceHoursEarned: 4 });
  const rn = makeCredential(`${tag}-rn`, `${tag} RN License`, 365, { requiredCEHours: 20, ceHoursEarned: 15.5 });
  return {
    stats: { totalCredentials: 4, activeCount: 2, expiringSoonCount: 1, expiredCount: 1, needsCEAttentionCount: 2 },
    upcomingExpirations: [acls],
    ceAttention: [acls, rn],
    recentActivity: [
      makeActivity(`${tag}-a1`, -15, { title: 'Uploaded certificate', subtitle: `${tag} Neonatal Program (PDF)`, icon: 'pi pi-file' }),
      makeActivity(`${tag}-a2`, -20, { subtitle: `${tag} ACLS Certification - 4 hrs` }),
      makeActivity(`${tag}-a3`, -30), makeActivity(`${tag}-a4`, -45), makeActivity(`${tag}-a5`, -60),
    ],
  };
}

/** Five expiring and five CE-needing credentials, to exercise the three-row caps and overflow drawers. */
export function overflowDashboard(): DashboardResponse {
  const soon = [10, 20, 30, 40, 50].map((days, index) => makeCredential(`s-${index}`, `Soon ${index + 1}`, days, { requiredCEHours: 10, ceHoursEarned: index }));
  return {
    stats: { totalCredentials: 5, activeCount: 0, expiringSoonCount: 5, expiredCount: 0, needsCEAttentionCount: 5 },
    upcomingExpirations: soon, ceAttention: soon, recentActivity: [],
  };
}
