export interface CertificateUploadResponse {
  /** Phase 1 (#24): registry asset UUID — the managed reference used for CE attachment. */
  assetId: string;
  // Legacy fields kept for backward-compatible viewing until Phase 3 (owner safeguard 1).
  url: string;
  publicId: string;
  originalFilename: string | null;
  resourceType: string;
}
