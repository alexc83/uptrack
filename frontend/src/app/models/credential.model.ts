export type CredentialType = 'LICENSE' | 'CERTIFICATION';
export type CredentialStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  issuingOrganization: string;
  expirationDate: string; // ISO date string: YYYY-MM-DD
  renewalCycleMonths: number;
  requiredCEHours: number;
  userId: string;
  // Computed by service layer
  status: CredentialStatus;
  ceHoursEarned: number;
  ceProgress: number; // 0.0 – 1.0
}
