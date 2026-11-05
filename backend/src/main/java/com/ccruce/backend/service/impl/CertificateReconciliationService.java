package com.ccruce.backend.service.impl;

import com.ccruce.backend.config.CloudinaryProperties;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.cloudinary.Api;
import com.cloudinary.Cloudinary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Phase 2 (issue #20) reconciliation foundation — CONSERVATIVE: read-only inventory classification
 * and dry-run reporting only. It never deletes anything. Automatic deletion of unknown Cloudinary
 * assets requires complete inventory evidence and is a future, separately authorized decision
 * (Phase 4).
 *
 * <p>Completeness guarantees: both the provider listing and the registry are traversed with bounded
 * pagination; ANY pagination failure, exception, or page-cap overrun marks the inventory incomplete
 * and the run returns null — a partial inventory is never classified as complete. Asset identity is
 * the unambiguous tuple (cloud_name, resource_type, public_id).
 *
 * <p>Classification: managed-listed / missing-in-cloudinary (registry-known, active states, not
 * listed) / unknown-provider-assets (listed, absent from the registry — never auto-deleted).
 */
@Component
public class CertificateReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(CertificateReconciliationService.class);
    private static final String PREFIX = "uptrack/";
    private static final int PROVIDER_PAGE_SIZE = 500;
    private static final int REGISTRY_PAGE_SIZE = 500;
    /** Safety caps so a runaway listing can never loop forever; exceeding a cap = incomplete. */
    private static final int MAX_PROVIDER_PAGES = 2000;
    private static final int MAX_REGISTRY_PAGES = 2000;

    private final boolean enabled;
    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;
    private final CertificateAssetRepository repository;

    public CertificateReconciliationService(
            @Value("${app.cleanup.reconcile.enabled:false}") boolean enabled,
            Cloudinary cloudinary,
            CloudinaryProperties cloudinaryProperties,
            CertificateAssetRepository repository) {
        this.enabled = enabled;
        this.cloudinary = cloudinary;
        this.cloudinaryProperties = cloudinaryProperties;
        this.repository = repository;
    }

    @Scheduled(fixedDelayString = "${app.cleanup.reconcile.interval-ms:86400000}")
    public void runScheduled() {
        if (!enabled) {
            return;
        }
        InventoryReport report = dryRunInventory();
        if (report == null) {
            log.warn("Certificate reconciliation dry-run aborted: incomplete inventory (never acted on).");
        } else {
            log.info("Certificate reconciliation dry-run: {}", report.summary());
        }
    }

    /** Read-only inventory classification. Returns null if ANY side of the inventory was incomplete. */
    public InventoryReport dryRunInventory() {
        Map<String, String> listed = listProviderAssets();
        if (listed == null) {
            return null;
        }
        RegistryInventory registry = readRegistryInventory();
        if (registry == null) {
            return null;
        }

        List<String> unknownProviderAssets = new ArrayList<>();
        List<String> missingInCloudinary = new ArrayList<>();
        int managed = 0;
        for (String key : listed.keySet()) {
            if (registry.keys.contains(key)) {
                managed++;
            } else {
                unknownProviderAssets.add(key);
            }
        }
        for (String key : registry.keys) {
            if (!listed.containsKey(key)) {
                CertificateAsset asset = registry.byKey.get(key);
                if (asset.getStatus() == AssetStatus.ATTACHED || asset.getStatus() == AssetStatus.PENDING) {
                    missingInCloudinary.add(key); // only active-looking states; deletions in flight are normal
                }
            }
        }
        return new InventoryReport(managed, registry.total, registry.duplicates, unknownProviderAssets, missingInCloudinary);
    }

    /** Complete, bounded, paginated provider listing under the configured cloud and prefix; null = incomplete. */
    private Map<String, String> listProviderAssets() {
        Api api = cloudinary.api();
        Map<String, String> listed = new HashMap<>();
        try {
            for (String resourceType : List.of("image", "raw")) {
              for (String deliveryType : List.of("upload", "authenticated")) {
                String cursor = null;
                int pages = 0;
                do {
                    if (++pages > MAX_PROVIDER_PAGES) {
                        log.warn("Reconciliation: provider page cap exceeded; inventory incomplete.");
                        return null;
                    }
                    Map<String, Object> options = new HashMap<>(Map.of(
                            "resource_type", resourceType,
                            "type", deliveryType,
                            "prefix", PREFIX,
                            "max_results", PROVIDER_PAGE_SIZE));
                    if (cursor != null) {
                        options.put("next_cursor", cursor);
                    }
                    @SuppressWarnings("unchecked")
                    Map<String, Object> response = (Map<String, Object>) api.resources(options);
                    if (!(response.get("resources") instanceof List<?> items)) {
                        log.warn("Reconciliation: unexpected provider listing shape; inventory incomplete.");
                        return null;
                    }
                    for (Object item : items) {
                        if (item instanceof Map<?, ?> resource && resource.get("public_id") instanceof String publicId) {
                            listed.put(identityKey(cloudinaryProperties.cloudName(), resourceType, deliveryType, publicId), deliveryType);
                        }
                    }
                    cursor = response.get("next_cursor") instanceof String next && !next.isBlank() ? next : null;
                } while (cursor != null);
              }
            }
            return listed;
        } catch (Exception exception) {
            log.warn("Reconciliation: provider listing failed; inventory incomplete (never acted on).");
            return null;
        }
    }

    /** Complete, bounded, paginated registry traversal; null = incomplete. Duplicates are detected, not double-counted. */
    private RegistryInventory readRegistryInventory() {
        try {
            Set<String> keys = new HashSet<>();
            Map<String, CertificateAsset> byKey = new HashMap<>();
            List<String> duplicates = new ArrayList<>();
            int total = 0;
            int page = 0;
            while (page < MAX_REGISTRY_PAGES) {
                Page<CertificateAsset> batch = repository.findAll(PageRequest.of(page, REGISTRY_PAGE_SIZE));
                if (batch.isEmpty()) {
                    return new RegistryInventory(keys, byKey, duplicates, total);
                }
                for (CertificateAsset asset : batch) {
                    String key = identityKey(asset.getCloudName(), asset.getResourceType(), asset.getDeliveryType(), asset.getPublicId());
                    if (!keys.add(key)) {
                        duplicates.add(key);
                    }
                    byKey.put(key, asset);
                    total++;
                }
                if (batch.getNumberOfElements() < REGISTRY_PAGE_SIZE) {
                    return new RegistryInventory(keys, byKey, duplicates, total);
                }
                page++;
            }
            log.warn("Reconciliation: registry page cap exceeded; inventory incomplete.");
            return null;
        } catch (Exception exception) {
            log.warn("Reconciliation: registry traversal failed; inventory incomplete (never acted on).");
            return null;
        }
    }

    /** Unambiguous asset identity across both inventories: cloud name + resource type + public id. */
    private static String identityKey(String cloudName, String resourceType, String deliveryType, String publicId) {
        return cloudName + "\n" + resourceType + "\n" + deliveryType + "\n" + publicId;
    }

    private record RegistryInventory(Set<String> keys, Map<String, CertificateAsset> byKey,
                                     List<String> duplicates, int total) {
    }

    public record InventoryReport(int managedListed, int registryTotal, List<String> duplicateRegistryKeys,
                                  List<String> unknownProviderAssets, List<String> missingInCloudinary) {
        public String summary() {
            return "managed=%d registryTotal=%d duplicates=%d unknownProviderAssets=%d (never auto-deleted) missingInCloudinary=%d"
                    .formatted(managedListed, registryTotal, duplicateRegistryKeys.size(),
                            unknownProviderAssets.size(), missingInCloudinary.size());
        }
    }
}
