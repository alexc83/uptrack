package com.ccruce.backend.service;

import com.ccruce.backend.exception.UploadBusyException;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.impl.CertificateUploadServiceImpl;
import com.ccruce.backend.validation.CertificateFileValidator;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CertificateUploadConcurrencyTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void excessConcurrentUploadsAreRejectedImmediatelyAndNeverQueued() throws Exception {
        Cloudinary cloudinary = mock(Cloudinary.class);
        Uploader uploader = mock(Uploader.class);
        CertificateFileValidator validator = mock(CertificateFileValidator.class);
        CertificateAssetService assetService = mock(CertificateAssetService.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(validator.validate(any())).thenReturn(new byte[]{1, 2, 3});
        when(assetService.reserve(any(), anyString())).thenAnswer(invocation -> {
            com.ccruce.backend.entity.CertificateAsset asset = new com.ccruce.backend.entity.CertificateAsset();
            asset.setId(UUID.randomUUID());
            asset.setUserId(invocation.getArgument(0));
            asset.setPublicId("uptrack/users/%s/certificates/%s".formatted(invocation.getArgument(0), UUID.randomUUID()));
            asset.setResourceType(invocation.getArgument(1));
            return asset;
        });
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        when(uploader.upload(any(), anyMap())).thenAnswer(invocation -> {
            entered.countDown();
            assertTrue(release.await(10, TimeUnit.SECONDS));
            return Map.of("resource_type", "image", "public_id", "uptrack/test/x",
                    "secure_url", "https://res.example.test/x.png");
        });

        var service = new CertificateUploadServiceImpl(cloudinary, validator, assetService, 1);
        var user = new AuthenticatedUser(UUID.randomUUID(), "u@example.test", "User");
        var pool = Executors.newSingleThreadExecutor();
        var inFlight = pool.submit(() -> {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(user, null, List.of()));
            return service.uploadCertificate(new MockMultipartFile("file", "a.png", "image/png", new byte[]{1}));
        });
        assertTrue(entered.await(10, TimeUnit.SECONDS), "first upload should occupy the single slot");

        // While the slot is busy, another client is rejected immediately with 503 semantics,
        // not queued behind the first request.
        var busyStart = System.nanoTime();
        assertThrows(UploadBusyException.class, () -> {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(user, null, List.of()));
            service.uploadCertificate(new MockMultipartFile("file", "b.png", "image/png", new byte[]{2}));
        });
        assertTrue(System.nanoTime() - busyStart < TimeUnit.SECONDS.toNanos(5), "must not block");

        release.countDown();
        assertNotNull(inFlight.get(10, TimeUnit.SECONDS));
        pool.shutdown();
        // After the slot frees up, uploads work again.
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
        assertNotNull(service.uploadCertificate(new MockMultipartFile("file", "c.png", "image/png", new byte[]{3})));
    }
}
