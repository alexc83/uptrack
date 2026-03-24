import { ApiId, IsoDate } from './common.models';

export interface CeRecordResponse {
  id: ApiId;
  title: string;
  provider: string;
  hours: number;
  dateCompleted: IsoDate;
  certificateUrl?: string | null;
}

export interface CeRecordRequest {
  title: string;
  provider: string;
  hours: number;
  dateCompleted: IsoDate;
  certificateUrl?: string | null;
  credentialId: ApiId;
  userId: ApiId;
}

export interface CeRecordFilters {
  credentialId?: ApiId;
  search?: string;
}

export interface CredentialCeRecord extends CeRecordResponse {
  credentialId: ApiId;
  userId?: ApiId;
}

export type CeRecord = CredentialCeRecord;
export type CeRecordSummary = CeRecordResponse;
export type CeRecordDetail = CeRecordResponse;
