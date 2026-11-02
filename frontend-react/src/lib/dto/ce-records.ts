import type { ApiId, IsoDate } from './common';
export interface CertificateMetadata {
  certificateUrl: string | null;
  certificatePublicId: string | null;
  certificateResourceType: string | null;
  certificateOriginalFilename: string | null;
}
interface CERecordFields { title: string; provider: string; hours: number; dateCompleted: IsoDate }
export interface CERecordRequest extends CERecordFields, Partial<CertificateMetadata> { credentialId: ApiId }
export interface CERecordResponse extends CERecordFields, CertificateMetadata { id: ApiId }
