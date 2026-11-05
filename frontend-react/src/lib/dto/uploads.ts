export interface CertificateUploadResponse {
  /** Phase 1 (#24): registry asset UUID — the managed reference used for CE attachment. */
  assetId: string;
  // Phase 3 (#23): the permanent public URL is no longer returned (null); viewing uses the delivery endpoint.
  url: string | null;
  publicId: string;
  originalFilename: string | null;
  resourceType: string;
}
