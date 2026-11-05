package com.ccruce.backend.service;

import com.ccruce.backend.dto.response.CertificateUploadResponseDto;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.exception.UploadFailedException;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.CertificateAssetService;
import com.ccruce.backend.service.impl.CertificateUploadServiceImpl;
import com.ccruce.backend.validation.CertificateFileValidator;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.cloudinary.api.exceptions.BadRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Cloudinary is always a Mockito mock here; nothing contacts the real service. */
class CertificateUploadServiceImplTest {

    private final Cloudinary cloudinary = mock(Cloudinary.class);
    private final Uploader uploader = mock(Uploader.class);
    private final CertificateFileValidator validator = mock(CertificateFileValidator.class);
    private final CertificateAssetService assetService = mock(CertificateAssetService.class);
    private final CertificateUploadServiceImpl service = new CertificateUploadServiceImpl(cloudinary, validator, assetService, new com.ccruce.backend.config.CertificateDeliveryProperties(false, 60), 2);

    @BeforeEach
    void setUp() throws IOException {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(validator.validate(any())).thenReturn(new byte[]{1, 2, 3});
        when(assetService.reserve(any(), anyString(), any(), anyString())).thenAnswer(invocation -> {
            CertificateAsset asset = new CertificateAsset();
            asset.setId(UUID.randomUUID());
            asset.setUserId(invocation.getArgument(0));
            asset.setResourceType(invocation.getArgument(1));
            asset.setDeliveryType(invocation.getArgument(3));
            asset.setPublicId("uptrack/x");
            return asset;
        });
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(UUID.randomUUID(), "u@example.test", "User"), null, List.of()));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static MockMultipartFile png() {
        return new MockMultipartFile("file", "a.png", "image/png", new byte[]{1});
    }

    private static Map<String, Object> result(String key, Object missingOrBad) {
        Map<String, Object> map = new HashMap<>(Map.of("resource_type", "image", "type", "upload", "public_id", "uptrack/x",
                "secure_url", "https://res.example.test/x.png"));
        if (missingOrBad == null) map.remove(key); else map.put(key, missingOrBad);
        return map;
    }

    @Test
    void uploadIoExceptionBecomesGenericUploadFailure() throws IOException {
        when(uploader.upload(any(), anyMap())).thenThrow(new IOException("socket reset to api.cloudinary.com"));

        UploadFailedException thrown = assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()));

        assertEquals("Certificate upload failed.", thrown.getMessage());
    }

    @Test
    void reservationIsPersistedBeforeTheProviderCallAndSuccessMarksPending() throws IOException {
        when(uploader.upload(any(), anyMap())).thenReturn(result(null, null));

        CertificateUploadResponseDto response = service.uploadCertificate(png());

        InOrder order = inOrder(assetService, uploader);
        order.verify(assetService).reserve(any(), eq("image"), eq("a.png"), eq("upload"));
        order.verify(uploader).upload(any(), anyMap());
        order.verify(assetService).markUploaded(eq(response.assetId()), any(), eq("https://res.example.test/x.png"), eq("a.png"));
        assertNotNull(response.assetId());
        // Flag OFF (default): the Phase 2 response contract is preserved — the URL is present.
        assertEquals("https://res.example.test/x.png", response.url());
        assertEquals("uptrack/x", response.publicId());
    }

    @Test
    void uncertainProviderFailureSchedulesReconciliationInsteadOfFailingTheReservation() throws IOException {
        when(uploader.upload(any(), anyMap())).thenThrow(new IOException("read timeout"));

        assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()));

        verify(assetService).scheduleReconciliation(any());
        verify(assetService, never()).markDefinitivelyFailed(any());
        verify(assetService, never()).markUploaded(any(), any(), any(), any());
    }

    @Test
    void definitiveProviderRejectionMarksUploadFailed() throws Exception {
        // The SDK wraps provider 4xx rejections; the service walks the cause chain.
        when(uploader.upload(any(), anyMap()))
                .thenThrow(new IOException("provider rejected", new BadRequest("invalid file")));

        assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()));

        verify(assetService).markDefinitivelyFailed(any());
        verify(assetService, never()).scheduleReconciliation(any());
    }

    @Test
    void providerErrorMapWith4xxIsDefinitiveAnd5xxIsUncertain() throws IOException {
        when(uploader.upload(any(), anyMap())).thenReturn(Map.of(
                "error", Map.of("message", "bad", "http_code", 400)));
        assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()));
        verify(assetService).markDefinitivelyFailed(any());

        when(uploader.upload(any(), anyMap())).thenReturn(Map.of(
                "error", Map.of("message", "oops", "http_code", 500)));
        assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()));
        verify(assetService).scheduleReconciliation(any());
    }

    @Test
    void databaseFailureAtReservationNeverCallsTheProvider() throws IOException {
        when(assetService.reserve(any(), anyString(), any(), anyString())).thenThrow(new RuntimeException("db down"));

        assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()));

        verify(uploader, never()).upload(any(), anyMap());
    }

    @Test
    void uploadWithoutAuthenticatedUserIsRejectedBeforeCallingCloudinary() throws IOException {
        SecurityContextHolder.clearContext();

        assertThrows(UnauthorizedException.class, () -> service.uploadCertificate(png()));

        verify(uploader, never()).upload(any(), anyMap());
    }

    @Test
    void incompleteProviderResponsesAreRejected() throws IOException {
        for (String key : List.of("resource_type", "public_id", "secure_url", "type")) {
            when(uploader.upload(any(), anyMap())).thenReturn(result(key, null));
            assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()), "missing " + key);
            when(uploader.upload(any(), anyMap())).thenReturn(result(key, "  "));
            assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()), "blank " + key);
            when(uploader.upload(any(), anyMap())).thenReturn(result(key, 42));
            assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()), "non-string " + key);
        }
    }

    @Test
    void mismatchedProviderIdentityIsReconciledWithoutAttachingOrDeletingAnotherAsset() throws IOException {
        for (var mismatch : Map.of("public_id", "another-asset", "resource_type", "raw", "type", "authenticated").entrySet()) {
            Map<String, Object> response = result(null, null);
            response.put(mismatch.getKey(), mismatch.getValue());
            when(uploader.upload(any(), anyMap())).thenReturn(response);
            assertThrows(UploadFailedException.class, () -> service.uploadCertificate(png()));
        }
        verify(assetService, org.mockito.Mockito.times(3)).scheduleReconciliation(any());
        verify(assetService, never()).markUploaded(any(), any(), any(), any());
        verify(uploader, never()).destroy(anyString(), anyMap());
    }

    @Test
    void rawResourceKeepsProviderUrlWithoutInventingFormatSuffix() throws IOException {
        Map<String, Object> raw = new HashMap<>(Map.of("resource_type", "raw", "type", "upload", "public_id", "uptrack/x",
                "secure_url", "https://res.example.test/raw/x", "format", "pdf"));
        when(uploader.upload(any(), anyMap())).thenReturn(raw);
        assertEquals("raw", service.uploadCertificate(pdf()).resourceType());
        // Provider URLs are authoritative; do not infer an extension from metadata.
        verify(assetService).markUploaded(any(), any(), eq("https://res.example.test/raw/x"), any());

        raw.put("secure_url", "https://res.example.test/raw/x.PDF");
        service.uploadCertificate(pdf());
        verify(assetService).markUploaded(any(), any(), eq("https://res.example.test/raw/x.PDF"), any());

        raw.remove("format");
        raw.put("secure_url", "https://res.example.test/raw/x");
        CertificateUploadResponseDto noFormat = service.uploadCertificate(pdf());
        verify(assetService, org.mockito.Mockito.times(2)).markUploaded(any(), any(), eq("https://res.example.test/raw/x"), any());
        assertEquals("https://res.example.test/raw/x", noFormat.url());
        assertEquals("raw", noFormat.resourceType());
    }

    private static MockMultipartFile pdf() {
        return new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[]{1});
    }

    @Test
    void deleteCertificateCallsCloudinaryWithInvalidateAndResourceType() throws IOException {
        service.deleteCertificate("uptrack/users/u/certificates/c", "raw");

        verify(uploader).destroy("uptrack/users/u/certificates/c", Map.of("resource_type", "raw", "invalidate", true));
    }

    @Test
    void deleteCertificateIgnoresBlankOrNullArgumentsWithoutCallingCloudinary() throws IOException {
        service.deleteCertificate(null, "raw");
        service.deleteCertificate(" ", "raw");
        service.deleteCertificate("id", null);
        service.deleteCertificate("id", "  ");

        verify(uploader, never()).destroy(anyString(), anyMap());
    }

    @Test
    void deleteCertificateIoExceptionBecomesGenericCleanupFailure() throws IOException {
        when(uploader.destroy(anyString(), anyMap())).thenThrow(new IOException("timeout talking to api.cloudinary.com"));

        UploadFailedException thrown = assertThrows(UploadFailedException.class,
                () -> service.deleteCertificate("id", "raw"));

        assertEquals("Certificate cleanup failed.", thrown.getMessage());
    }

    @Test
    void deleteCertificateProviderRuntimeFailureBecomesGenericCleanupFailure() throws IOException {
        when(uploader.destroy(anyString(), anyMap())).thenThrow(new IllegalStateException("provider 500 key=abc"));

        UploadFailedException thrown = assertThrows(UploadFailedException.class,
                () -> service.deleteCertificate("id", "image"));

        assertEquals("Certificate cleanup failed.", thrown.getMessage());
    }
}
