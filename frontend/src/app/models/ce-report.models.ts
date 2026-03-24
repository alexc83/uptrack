import { ApiId, IsoDate } from './common.models';
import { CredentialStatus, CredentialType } from './credential.models';

export interface CeReportCredential {
  id: ApiId;
  name: string;
  type: CredentialType;
  issuingOrganization: string;
  expirationDate: IsoDate;
  requiredCEHours: number;
  status: CredentialStatus;
}

export interface CeReportSummary {
  totalHoursEarned: number;
  remainingHours: number;
  recordCount: number;
  progress: number;
}

export interface CeReportRecord {
  title: string;
  provider: string;
  hours: number;
  dateCompleted: IsoDate;
  certificateUrl?: string | null;
}

export interface CeReportResponse {
  credential: CeReportCredential;
  summary: CeReportSummary;
  records: CeReportRecord[];
}
