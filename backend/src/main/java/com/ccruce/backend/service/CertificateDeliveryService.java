package com.ccruce.backend.service;

import com.ccruce.backend.dto.response.CertificateDeliveryUrlDto;

import java.util.UUID;

public interface CertificateDeliveryService {

    /**
     * Issue a short-lived authenticated Cloudinary delivery URL for the managed certificate attached
     * to a CE record. 404 for missing/foreign records or records without a managed asset; 409 when the
     * asset is not in a deliverable state. Never falls back to a permanent public URL.
     */
    CertificateDeliveryUrlDto issueDeliveryUrl(UUID ceRecordId);
}
