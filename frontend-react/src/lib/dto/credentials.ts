import type { ApiId, IsoDate } from './common';
import type { CERecordResponse } from './ce-records';
export type CredentialType = 'LICENSE' | 'CERTIFICATION';
export type CredentialStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
export interface CredentialFilters {
  status?: CredentialStatus;
  type?: CredentialType;
  search?: string;
}
export interface CredentialRequest {
  name: string;
  type: CredentialType;
  issuingOrganization: string;
  expirationDate: IsoDate;
  renewalCycleMonths: number;
  requiredCEHours: number;
}
export interface CredentialResponse extends CredentialRequest {
  id: ApiId;
  status: CredentialStatus;
  ceHoursEarned: number;
  ceProgress: number;
  ceRecords: CERecordResponse[];
}
