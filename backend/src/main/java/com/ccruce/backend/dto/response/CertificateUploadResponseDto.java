package com.ccruce.backend.dto.response;

import java.util.UUID;

public record CertificateUploadResponseDto(
        // Phase 1: the registry asset UUID is the managed reference. Phase 3 (#23): url is null for
        // managed uploads — the permanent public URL is never exposed; viewing uses the delivery endpoint.
        UUID assetId,
        String url,
        String publicId,
        String originalFilename,
        String resourceType
) {
}
