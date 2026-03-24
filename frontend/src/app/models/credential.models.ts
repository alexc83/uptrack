import { ApiId, IsoDate } from './common.models';
import { CeRecordResponse } from './ce-record.models';

export type CredentialType = 'LICENSE' | 'CERTIFICATION';
export type CredentialStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export interface CredentialRequest {
  name: string;
  type: CredentialType;
  issuingOrganization: string;
  expirationDate: IsoDate;
  renewalCycleMonths: number;
  requiredCEHours: number;
  userId: ApiId;
}

export interface CredentialFilters {
  userId?: ApiId;
  status?: CredentialStatus;
  type?: CredentialType;
  search?: string;
}

export interface CredentialResponse {
  id: ApiId;
  name: string;
  type: CredentialType;
  issuingOrganization: string;
  expirationDate: IsoDate;
  renewalCycleMonths: number;
  requiredCEHours: number;
  status: CredentialStatus;
  ceHoursEarned: number;
  ceProgress: number;
  ceRecords: CeRecordResponse[];
}

export type Credential = Omit<CredentialResponse, 'ceRecords'> & {
  ceRecords?: CeRecordResponse[];
  userId?: ApiId;
};
export type CredentialSummary = CredentialResponse;
export type CredentialDetail = CredentialResponse;
