package com.ccruce.backend.service;

import com.ccruce.backend.config.CertificateDeliveryProperties;
import com.ccruce.backend.config.CloudinaryProperties;
import com.ccruce.backend.dto.response.CertificateDeliveryUrlDto;
import com.ccruce.backend.entity.*;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.exception.UploadFailedException;
import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.impl.CertificateDeliveryServiceImpl;
import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real installed SDK + independent API signature verification. No provider I/O or live-enforcement claim. */
@ExtendWith(OutputCaptureExtension.class)
class CertificateDeliverySigningTest {
    private static final String SECRET = "public-synthetic-api-secret";
    private static final String CLOUD = "local-fixture-cloud";
    private final CERecordRepository records = mock(CERecordRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final CertificateAssetService assets = mock(CertificateAssetService.class);
    private final Cloudinary sdk = spy(new Cloudinary(Map.of("cloud_name", CLOUD,
            "api_key", "public-synthetic-api-key", "api_secret", SECRET)));
    private final UUID userId=UUID.randomUUID(), recordId=UUID.randomUUID(), assetId=UUID.randomUUID();
    private CertificateAsset asset;

    @BeforeEach void setUp() {
        User user=new User();user.setId(userId);
        CERecord record=new CERecord();record.setId(recordId);record.setUser(user);record.setCertificateAssetId(assetId);
        asset=new CertificateAsset();asset.setId(assetId);asset.setUserId(userId);asset.setStatus(AssetStatus.ATTACHED);
        asset.setCeRecordId(recordId);asset.setCloudName(CLOUD);asset.setResourceType("raw");
        asset.setPublicId("uptrack/users/u/certificates/sample.pdf");asset.setOriginalFilename("original.pdf");
        asset.setDeliveryType("authenticated");
        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(records.findById(recordId)).thenReturn(Optional.of(record));
        when(assets.findOwnedAsset(assetId,userId)).thenReturn(Optional.of(asset));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId,"synthetic@example.test","Synthetic"),null,List.of()));
        doThrow(new AssertionError("provider Upload forbidden")).when(sdk).uploader();
        doThrow(new AssertionError("provider Admin forbidden")).when(sdk).api();
        doThrow(new AssertionError("permanent CDN signing forbidden")).when(sdk).url();
    }
    @AfterEach void clear() {
        SecurityContextHolder.clearContext();
        verify(sdk,never()).uploader();verify(sdk,never()).api();verify(sdk,never()).url();
    }
    private CertificateDeliveryServiceImpl service(long ttl) {
        return new CertificateDeliveryServiceImpl(records,users,assets,sdk,
                new CertificateDeliveryProperties(true,ttl),new CloudinaryProperties(CLOUD,"unused","unused"));
    }
    private Map<String,String> query(CertificateDeliveryUrlDto result) {
        Map<String,String> q=new TreeMap<>();
        for (String pair:URI.create(result.url()).getRawQuery().split("&")) {
            String[] p=pair.split("=",2);
            assertNull(q.put(URLDecoder.decode(p[0],StandardCharsets.UTF_8),URLDecoder.decode(p[1],StandardCharsets.UTF_8)),"unique fields");
        }
        return q;
    }
    private String independentSignature(Map<String,String> query) throws Exception {
        Map<String,String> signed=new TreeMap<>(query);signed.remove("signature");signed.remove("api_key");
        String input=String.join("&",signed.entrySet().stream().map(e->e.getKey()+"="+e.getValue()).toList())+SECRET;
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(input.getBytes(StandardCharsets.UTF_8)));
    }
    private Map<String,String> verifySignature(CertificateDeliveryUrlDto result) throws Exception {
        URI uri=URI.create(result.url());Map<String,String> q=query(result);
        assertTrue("https".equals(uri.getScheme())&&"api.cloudinary.com".equals(uri.getHost()),"API download, not CDN");
        assertTrue(uri.getPath().equals("/v1_1/"+CLOUD+"/"+asset.getResourceType()+"/download"),"exact cloud/resource endpoint");
        assertTrue(q.get("public_id").equals(asset.getPublicId()),"public ID preserved exactly");
        assertTrue(q.get("type").equals("authenticated"),"explicit authenticated storage type");
        assertTrue(q.get("expires_at").equals(Long.toString(result.expiresAt().getEpochSecond())),"DTO and signed deadline agree");
        assertTrue(q.get("attachment").equals("false"),"inline viewing requested");
        assertTrue(q.get("signature").equals(independentSignature(q)),"independent API-secret digest matches SDK");
        assertFalse(q.containsKey("__cld_token__")||result.url().contains(SECRET),"no premium token or secret disclosure");
        assertNull(sdk.config.authToken,"no global premium key");
        return q;
    }
    @Test void rawPdfUsesExactExtensionBearingIdentityAndNoConversionFormat() throws Exception {
        Instant before=Instant.now();var result=service(60).issueDeliveryUrl(recordId);
        Map<String,String> q=verifySignature(result);
        assertFalse(q.containsKey("format"),"raw format is part of public ID; no conversion/appended suffix");
        assertEquals(0,result.expiresAt().getNano());
        assertTrue(!result.expiresAt().isBefore(before.minusSeconds(1).plusSeconds(60))
                &&!result.expiresAt().isAfter(Instant.now().plusSeconds(60)),"60-second bounds");
    }
    @Test void historicalRawIdsAreNeverRewrittenFromFilename() throws Exception {
        for(String id:List.of("sample","sample.pdf","sample.PDF","space folder/sample.pdf")) {
            asset.setPublicId("uptrack/users/u/certificates/"+id);
            assertFalse(verifySignature(service(60).issueDeliveryUrl(recordId)).containsKey("format"));
        }
    }
    @Test void imagesKeepTheirValidatedFormatWithoutForcedPngOrTransform() throws Exception {
        asset.setResourceType("image");asset.setPublicId("uptrack/users/u/certificates/image");
        for(String format:List.of("jpg","jpeg","png","webp","gif")) {
            asset.setOriginalFilename("original."+format.toUpperCase(Locale.ROOT));
            var q=verifySignature(service(60).issueDeliveryUrl(recordId));
            assertTrue(format.equals(q.get("format")),"original format selected");
            assertFalse(q.containsKey("transformation"));
        }
    }
    @Test void expiryAssetFormatTypeAndDispositionAreCryptographicallyBound() throws Exception {
        asset.setResourceType("image");asset.setOriginalFilename("original.png");
        Map<String,String> q=verifySignature(service(60).issueDeliveryUrl(recordId));
        for(String field:List.of("expires_at","public_id","format","type","attachment")) {
            Map<String,String> altered=new TreeMap<>(q);altered.put(field,q.get(field)+"changed");
            assertFalse(q.get("signature").equals(independentSignature(altered)),"tampering changes signed digest");
        }
        // Resource type/cloud are endpoint components, not API signature fields: their selection is
        // checked above. This test does not claim provider cross-resource rejection or live expiry.
    }
    @Test void supportedTtlBoundariesAreSigned() throws Exception {
        for(long ttl:new long[]{1,3600}) {
            Instant start=Instant.now();var result=service(ttl).issueDeliveryUrl(recordId);verifySignature(result);
            assertTrue(!result.expiresAt().isBefore(start.minusSeconds(1).plusSeconds(ttl)));
            assertTrue(!result.expiresAt().isAfter(Instant.now().plusSeconds(ttl)));
        }
    }
    @Test void invalidMetadataAndForeignCloudFailClosed(CapturedOutput output) {
        asset.setResourceType("video");assertSafeFailure();
        asset.setResourceType("image");asset.setOriginalFilename("unsafe.svg");assertSafeFailure();
        asset.setOriginalFilename(null);assertSafeFailure();
        asset.setResourceType("raw");asset.setCloudName("different-cloud");assertSafeFailure();
        asset.setCloudName(CLOUD);asset.setPublicId(" ");assertSafeFailure();
        assertFalse(output.getAll().contains(SECRET));
    }
    private void assertSafeFailure() {
        asset.setDeliveryUrl("https://public.example.test/no-fallback");
        var error=assertThrows(UploadFailedException.class,()->service(60).issueDeliveryUrl(recordId));
        assertEquals("Certificate delivery failed.",error.getMessage());assertNull(error.getCause());
    }
    @Test void checkedSdkFailureAndMissingApiSecretAreSanitized(CapturedOutput output) throws Exception {
        doThrow(new Exception("sensitive "+SECRET)).when(sdk).privateDownload(anyString(),isNull(),anyMap());
        assertSafeFailure();
        reset(sdk);
        sdk.config.apiSecret=null;
        assertSafeFailure();
        assertFalse(output.getAll().contains(SECRET));
    }
    @Test void successDoesNotLogUrlSignatureOrApiSecret(CapturedOutput output) {
        var result=service(60).issueDeliveryUrl(recordId);
        assertFalse(output.getAll().contains(SECRET)||output.getAll().contains(result.url())
                ||output.getAll().contains(query(result).get("signature")),"no bearer URL/signature in logs");
    }
}
