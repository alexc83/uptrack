package com.ccruce.backend.service;

import com.ccruce.backend.config.CertificateDeliveryProperties;
import com.ccruce.backend.config.CloudinaryAuthTokenProperties;
import com.ccruce.backend.dto.response.CertificateDeliveryUrlDto;
import com.ccruce.backend.entity.CERecord;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.exception.UploadFailedException;
import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.impl.CertificateDeliveryServiceImpl;
import com.cloudinary.AuthToken;
import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real SDK URL generation/HMAC, zero provider I/O. Assertions never dump URLs/tokens/keys. */
@ExtendWith(OutputCaptureExtension.class)
class CertificateDeliverySigningTest {
    // Public synthetic vectors. API secret deliberately differs and is not hex.
    private static final String KEY = "0123456789abcdef0123456789abcdef";
    private static final String API_SECRET = "local-fixture-api-secret";
    private final CERecordRepository records = mock(CERecordRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final CertificateAssetService assets = mock(CertificateAssetService.class);
    private final Cloudinary sdk = spy(new Cloudinary(Map.of("cloud_name", "local-fixture-cloud",
            "api_key", "local-fixture-key", "api_secret", API_SECRET)));
    private final UUID userId = UUID.randomUUID(), recordId = UUID.randomUUID(), assetId = UUID.randomUUID();
    private CertificateAsset asset;

    @BeforeEach void setUp() {
        User user = new User(); user.setId(userId);
        CERecord record = new CERecord(); record.setId(recordId); record.setUser(user); record.setCertificateAssetId(assetId);
        asset = new CertificateAsset();
        asset.setId(assetId); asset.setUserId(userId); asset.setStatus(AssetStatus.ATTACHED); asset.setCeRecordId(recordId);
        asset.setResourceType("raw"); asset.setPublicId("uptrack/users/u/certificates/sample");
        asset.setOriginalFilename("certificate.pdf"); asset.setDeliveryType("authenticated");
        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(records.findById(recordId)).thenReturn(Optional.of(record));
        when(assets.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(asset));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, "synthetic@example.test", "Synthetic"), null, List.of()));
        doThrow(new AssertionError("provider upload client forbidden")).when(sdk).uploader();
        doThrow(new AssertionError("provider Admin client forbidden")).when(sdk).api();
    }
    @AfterEach void clear() {
        SecurityContextHolder.clearContext();
        verify(sdk, never()).uploader(); verify(sdk, never()).api();
    }
    private CertificateDeliveryServiceImpl service(String key, long ttl) {
        return new CertificateDeliveryServiceImpl(records, users, assets, sdk,
                new CertificateDeliveryProperties(true, ttl), new CloudinaryAuthTokenProperties(key));
    }
    private String token(CertificateDeliveryUrlDto result) {
        String query = URI.create(result.url()).getRawQuery();
        assertNotNull(query, "SDK must emit a token query");
        var tokens = Arrays.stream(query.split("&")).filter(x -> x.startsWith("__cld_token__=")).toList();
        assertEquals(1, tokens.size(), "exactly one AuthToken parameter");
        return tokens.getFirst().substring("__cld_token__=".length());
    }
    private void verifySignature(CertificateDeliveryUrlDto result, String key) throws Exception {
        URI uri = URI.create(result.url());
        String token = token(result);
        String decoded = URLDecoder.decode(token, StandardCharsets.UTF_8);
        String fields = "exp=" + result.expiresAt().getEpochSecond() + "~acl=" + uri.getRawPath() + "~hmac=";
        assertTrue(decoded.startsWith(fields), "token expiry and ACL must match response and actual path");
        assertTrue("https".equals(uri.getScheme()) && "res.cloudinary.com".equals(uri.getHost()), "secure SDK delivery host");
        String sdkToken = new AuthToken(key).expiration(result.expiresAt().getEpochSecond()).acl(uri.getRawPath()).generate();
        assertTrue(sdkToken.equals("__cld_token__=" + token), "exact SDK fixed-expiry HMAC agreement");
        // Independent test of SDK's encoded HMAC fields. Production signing uses SDK only.
        int delimiter = token.lastIndexOf("~hmac=");
        assertTrue(delimiter > 0, "HMAC must be present");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(HexFormat.of().parseHex(key), "HmacSHA256"));
        String expected = HexFormat.of().formatHex(mac.doFinal(token.substring(0, delimiter).getBytes(StandardCharsets.UTF_8)));
        assertTrue(expected.equals(token.substring(delimiter + 6)), "independent HMAC agreement");
        assertFalse(result.url().contains(key) || result.url().contains(API_SECRET), "no key/secret disclosure");
    }
    @Test void rawPdfHasRealTokenExactAclAndSingleConsistentExpiry() throws Exception {
        Instant before = Instant.now();
        var result = service(KEY, 60).issueDeliveryUrl(recordId);
        assertTrue(URI.create(result.url()).getRawPath().equals(
                "/local-fixture-cloud/raw/authenticated/v1/uptrack/users/u/certificates/sample.pdf"), "raw SDK path");
        assertTrue(!result.expiresAt().isBefore(before.minusSeconds(1).plusSeconds(60))
                && !result.expiresAt().isAfter(Instant.now().plusSeconds(60)), "configured TTL bounds");
        assertEquals(0, result.expiresAt().getNano(), "token and DTO share epoch-second expiry");
        verifySignature(result, KEY);
    }
    @Test void rawExtensionIsNotDuplicatedIncludingMixedCaseAndEncodedPublicId() throws Exception {
        for (String id : List.of("sample.pdf", "sample.PDF", "folder with space/sample.pdf")) {
            asset.setPublicId("uptrack/users/u/certificates/" + id); asset.setOriginalFilename("CERTIFICATE.PDF");
            var result = service(KEY, 60).issueDeliveryUrl(recordId);
            String path = URI.create(result.url()).getRawPath();
            assertTrue(path.toLowerCase().endsWith(".pdf") && !path.toLowerCase().endsWith(".pdf.pdf"), "exactly one raw extension");
            verifySignature(result, KEY);
        }
    }
    @Test void imagesKeepOriginalDeliveryWithoutForcedFormatOrTransform() throws Exception {
        asset.setResourceType("image");
        for (String filename : List.of("original.jpg", "original.png", "original.webp", "original.gif")) {
            asset.setOriginalFilename(filename);
            var result = service(KEY, 60).issueDeliveryUrl(recordId);
            assertTrue(URI.create(result.url()).getRawPath().equals(
                    "/local-fixture-cloud/image/authenticated/v1/uptrack/users/u/certificates/sample"), "original image, no forced PNG/transform");
            verifySignature(result, KEY);
        }
    }
    @Test void assetKeyAndLifetimeChangeTokens() throws Exception {
        var first = service(KEY, 60).issueDeliveryUrl(recordId);
        asset.setPublicId("uptrack/users/u/certificates/other");
        var other = service(KEY, 60).issueDeliveryUrl(recordId);
        assertFalse(token(first).equals(token(other)), "asset-specific token"); verifySignature(other, KEY);
        String otherKey = "ab".repeat(32); // public synthetic vector
        var rotated = service(otherKey, 60).issueDeliveryUrl(recordId);
        assertFalse(token(other).equals(token(rotated)), "key-specific signature"); verifySignature(rotated, otherKey);
        for (long ttl : new long[]{1, 3600}) {
            var changed = service(KEY, ttl).issueDeliveryUrl(recordId);
            verifySignature(changed, KEY);
            assertFalse(token(changed).equals(token(other)), "lifetime-specific token");
        }
    }
    @Test void invalidMetadataFailsWithoutPublicFallbackOrSensitiveCause(CapturedOutput output) {
        asset.setOriginalFilename("unsafe.unsupported"); asset.setDeliveryUrl("https://public.example.test/should-never-be-returned");
        var error = assertThrows(UploadFailedException.class, () -> service(KEY, 60).issueDeliveryUrl(recordId));
        assertTrue("Certificate delivery failed.".equals(error.getMessage()), "generic delivery failure");
        assertNull(error.getCause(), "do not retain SDK signing inputs in cause chain");
        assertFalse(output.getAll().contains(KEY) || output.getAll().contains(API_SECRET), "no secrets in failure logs");
    }
    @Test void successDoesNotLogKeysOrFullTokens(CapturedOutput output) {
        var result = service(KEY, 60).issueDeliveryUrl(recordId);
        assertFalse(output.getAll().contains(KEY) || output.getAll().contains(API_SECRET)
                || output.getAll().contains(token(result)) || output.getAll().contains(result.url()), "no signed inputs/output in logs");
    }
}
