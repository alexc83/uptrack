package com.ccruce.backend.dto.response;

import java.util.UUID;

public record CertificateUploadResponseDto(
        // Phase 1: the registry asset UUID is the managed reference; url/publicId remain for
        // backward-compatible viewing until Phase 3 authenticated delivery (owner safeguard 1).
        UUID assetId,
        String url,
        String publicId,
        String originalFilename,
        String resourceType
) {
}
