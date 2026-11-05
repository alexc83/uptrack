package com.ccruce.backend.service;

import com.ccruce.backend.config.CloudinaryProperties;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.impl.CertificateReconciliationService;
import com.cloudinary.Api;
import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Finding 2 regression tests: the dry-run inventory must traverse the complete registry with bounded
 * pagination, qualify identity by (cloud_name, resource_type, public_id), detect duplicates, and
 * return null (incomplete — never acted on) on any provider or registry pagination failure.
 */
class CertificateReconciliationServiceTest {

    private final Cloudinary cloudinary = mock(Cloudinary.class);
    private final Api api = mock(Api.class);
    private final CertificateAssetRepository repository = mock(CertificateAssetRepository.class);
    private final CertificateReconciliationService service = new CertificateReconciliationService(
            false, cloudinary, new CloudinaryProperties("test-cloud", "key", "secret"), repository);

    @BeforeEach
    void setUp() {
        when(cloudinary.api()).thenReturn(api);
    }

    private static CertificateAsset asset(String cloud, String resourceType, String publicId) {
        CertificateAsset asset = new CertificateAsset();
        asset.setId(UUID.randomUUID());
        asset.setCloudName(cloud);
        asset.setResourceType(resourceType);
        asset.setPublicId(publicId);
        asset.setStatus(AssetStatus.PENDING);
        asset.setDeliveryType("upload");
        return asset;
    }

    private static List<CertificateAsset> assets(int count) {
        List<CertificateAsset> list = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            list.add(asset("test-cloud", "raw", "uptrack/users/u/certificates/a-" + i));
        }
        return list;
    }

    /** Registry serves the given assets page by page (page size 500); provider lists nothing. */
    private void stubRegistry(List<CertificateAsset> all) {
        when(repository.findAll(any(Pageable.class))).thenAnswer(invocation -> {
            Pageable pageable = invocation.getArgument(0);
            int from = (int) pageable.getOffset();
            int to = Math.min(from + pageable.getPageSize(), all.size());
            List<CertificateAsset> content = from >= all.size() ? List.of() : all.subList(from, to);
            return new PageImpl<>(content, pageable, all.size());
        });
    }

    private void stubEmptyProviderListing() throws Exception {
        com.cloudinary.api.ApiResponse response = mock(com.cloudinary.api.ApiResponse.class);
        org.mockito.Mockito.doReturn(List.of()).when(response).get("resources");
        org.mockito.Mockito.doReturn(null).when(response).get("next_cursor");
        org.mockito.Mockito.doReturn(response).when(api).resources(anyMap());
    }

    @Test
    void registryWithMoreThan1000AssetsIsFullyTraversed() throws Exception {
        stubEmptyProviderListing();
        List<CertificateAsset> all = assets(1001); // spans 3 pages of 500
        stubRegistry(all);

        CertificateReconciliationService.InventoryReport report = service.dryRunInventory();

        assertNotNull(report);
        assertEquals(1001, report.registryTotal(), "all 1001 registry assets must be inventoried, not truncated at 1000");
        assertEquals(0, report.duplicateRegistryKeys().size());
        assertEquals(1001, report.missingInCloudinary().size(), "all are PENDING and not listed at the provider");
    }

    @Test
    void registryPaginationFailureMarksInventoryIncomplete() throws Exception {
        stubEmptyProviderListing();
        when(repository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(assets(500), PageRequest0(), 1001))
                .thenThrow(new RuntimeException("db read failed on page 2"));

        assertNull(service.dryRunInventory(), "a partial registry inventory must never be classified as complete");
    }

    private static Pageable PageRequest0() {
        return org.springframework.data.domain.PageRequest.of(0, 500);
    }

    @Test
    void providerPaginationFailureMarksInventoryIncomplete() throws Exception {
        stubRegistry(assets(3));
        when(api.resources(anyMap())).thenThrow(new RuntimeException("listing failed"));

        assertNull(service.dryRunInventory());
    }

    @Test
    void providerPageCapExceededMarksInventoryIncomplete() throws Exception {
        stubRegistry(assets(1));
        // Provider keeps returning a next_cursor forever → page cap must stop the run as incomplete.
        com.cloudinary.api.ApiResponse response = mock(com.cloudinary.api.ApiResponse.class);
        org.mockito.Mockito.doReturn(List.of(Map.of("public_id", "uptrack/users/u/certificates/x")))
                .when(response).get("resources");
        org.mockito.Mockito.doReturn("cursor-forever").when(response).get("next_cursor");
        org.mockito.Mockito.doReturn(response).when(api).resources(anyMap());

        assertNull(service.dryRunInventory(), "unbounded provider pagination must be capped and marked incomplete");
    }

    @Test
    void identityIncludesCloudNameAndResourceTypeAndDuplicatesAreDetected() throws Exception {
        // Provider lists the shared public id only as raw; the image listing is empty.
        com.cloudinary.api.ApiResponse rawResponse = mock(com.cloudinary.api.ApiResponse.class);
        org.mockito.Mockito.doReturn(List.of(Map.of("public_id", "uptrack/users/u/certificates/shared")))
                .when(rawResponse).get("resources");
        org.mockito.Mockito.doReturn(null).when(rawResponse).get("next_cursor");
        com.cloudinary.api.ApiResponse imageResponse = mock(com.cloudinary.api.ApiResponse.class);
        org.mockito.Mockito.doReturn(List.of()).when(imageResponse).get("resources");
        org.mockito.Mockito.doReturn(null).when(imageResponse).get("next_cursor");
        org.mockito.Mockito.doAnswer(invocation -> {
            Map<String, Object> options = invocation.getArgument(0);
            boolean raw = "raw".equals(options.get("resource_type"));
            boolean authenticated = "authenticated".equals(options.get("type"));
            return raw && !authenticated ? rawResponse : imageResponse;
        }).when(api).resources(anyMap());

        List<CertificateAsset> registryAssets = List.of(
                asset("test-cloud", "raw", "uptrack/users/u/certificates/shared"),
                asset("test-cloud", "image", "uptrack/users/u/certificates/shared"), // distinct identity: different resource type
                asset("other-cloud", "raw", "uptrack/users/u/certificates/shared"), // distinct identity: different cloud
                asset("test-cloud", "raw", "uptrack/users/u/certificates/shared")); // duplicate identity (same cloud+type+public id)
        stubRegistry(registryAssets);

        CertificateReconciliationService.InventoryReport report = service.dryRunInventory();

        assertNotNull(report);
        assertEquals(4, report.registryTotal());
        assertEquals(1, report.duplicateRegistryKeys().size(), "duplicate identity must be detected, not double-counted");
        assertTrue(report.duplicateRegistryKeys().get(0).contains("test-cloud"));
        // Only the raw+test-cloud listing matches a registry key.
        assertEquals(1, report.managedListed());
        assertEquals(0, report.unknownProviderAssets().size());
        // The image+test-cloud and raw+other-cloud registry assets were not listed → missing (distinct identities).
        assertEquals(2, report.missingInCloudinary().size());
        verify(api, never()).deleteResources(any(), anyMap());
    }

    @Test
    void dryRunIsStrictlyReadOnly() throws Exception {
        stubEmptyProviderListing();
        stubRegistry(assets(2));
        assertNotNull(service.dryRunInventory());
        verify(api, never()).deleteResources(any(), anyMap());
        verify(api, never()).deleteResourcesByPrefix(anyString(), anyMap());
    }
}
