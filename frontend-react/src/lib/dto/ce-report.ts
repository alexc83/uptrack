import type { IsoDate } from './common';
import type { CredentialResponse } from './credentials';
export type CEReportCredential = Pick<CredentialResponse, 'id' | 'name' | 'type' | 'issuingOrganization' | 'expirationDate' | 'requiredCEHours' | 'status'>;
export interface CEReportSummary { totalHoursEarned: number; remainingHours: number; recordCount: number; progress: number }
export interface CEReportRecord { title: string; provider: string; hours: number; dateCompleted: IsoDate; certificateUrl: string | null }
export interface CEReportResponse { credential: CEReportCredential; summary: CEReportSummary; records: CEReportRecord[] }
