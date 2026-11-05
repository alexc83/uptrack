import type { ApiId, IsoDate } from './common';
export interface CertificateMetadata {
  certificateUrl: string | null;
  certificatePublicId: string | null;
  certificateResourceType: string | null;
  certificateOriginalFilename: string | null;
}
interface CERecordFields { title: string; provider: string; hours: number; dateCompleted: IsoDate }
export interface CERecordRequest extends CERecordFields, Partial<CertificateMetadata> {
  credentialId: ApiId
  /** Phase 1 (#24): managed attachment by registry asset UUID; when set, legacy fields are ignored by the backend. */
  certificateAssetId?: ApiId | null
}
export interface CertificateDeliveryUrl { url: string; expiresAt: string }
export interface CERecordResponse extends CERecordFields, CertificateMetadata {
  id: ApiId
  /** Phase 1 (#24): additive; legacy certificate fields stay until Phase 3 (safeguard 1). */
  certificateAssetId: string | null
  /** MANAGED_VERIFIED | LEGACY_UNVERIFIED | EXTERNAL_LINK | null */
  certificateClassification: string | null
}
