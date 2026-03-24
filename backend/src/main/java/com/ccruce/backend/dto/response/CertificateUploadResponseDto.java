package com.ccruce.backend.dto.response;

public record CertificateUploadResponseDto(
        String url,
        String publicId,
        String originalFilename,
        String resourceType
) {
}
