package com.ccruce.backend.service.impl;

import com.ccruce.backend.entity.CertificateAsset;
import java.util.Map;

/** Never adopt or deliver a different identity than the durable pre-upload reservation. */
final class CloudinaryAssetIdentity {
    private CloudinaryAssetIdentity() { }

    static boolean matches(CertificateAsset asset, Map<String, Object> resource) {
        return resource != null
                && asset.getPublicId() != null && asset.getPublicId().equals(resource.get("public_id"))
                && asset.getResourceType() != null && asset.getResourceType().equals(resource.get("resource_type"))
                && asset.getDeliveryType() != null && asset.getDeliveryType().equals(resource.get("type"));
    }
}
