package com.ccruce.backend.config;

import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.service.CertificateAssetService;
import com.ccruce.backend.service.impl.CertificateDeliveryServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Map;
import org.springframework.core.env.MapPropertySource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

@ExtendWith(OutputCaptureExtension.class)
class CloudinaryAuthTokenPropertiesTest {
    // Public synthetic vector, never a provisioned credential.
    private static final String KEY = "0123456789abcdef0123456789abcdef";
    @Configuration(proxyBeanMethods = false)
    @Import({CloudinaryConfig.class, CertificateDeliveryServiceImpl.class})
    static class Config {
        @Bean CERecordRepository records() { return mock(CERecordRepository.class); }
        @Bean UserRepository users() { return mock(UserRepository.class); }
        @Bean CertificateAssetService assets() { return mock(CertificateAssetService.class); }
    }
    private ApplicationContextRunner runner(boolean enabled) {
        return new ApplicationContextRunner().withUserConfiguration(Config.class).withPropertyValues(
                "cloudinary.cloud-name=local-fixture-cloud", "cloudinary.api-key=local-fixture-key",
                "cloudinary.api-secret=local-fixture-api-secret", "app.certificates.delivery.ttl-seconds=60",
                "app.certificates.delivery.enabled=" + enabled);
    }
    @Test void disabledDeliveryStartsWithoutTokenKey() {
        runner(false).run(context -> {
            assertNull(context.getStartupFailure(), "flag-off startup must not require token key");
            assertNotNull(context.getBean(CertificateDeliveryServiceImpl.class));
            assertNull(context.getBean(CloudinaryAuthTokenProperties.class).key());
        });
    }
    @Test void missingOrInvalidKeyFailsStartupWithoutDisclosure(CapturedOutput output) {
        runner(true).run(context -> assertNotNull(context.getStartupFailure(), "missing key must fail startup"));
        for (String key : new String[]{"", " ", "not-hex-token-sentinel", "a".repeat(31),
                "a".repeat(33), "a".repeat(130), "00", KEY + "\n"}) {
            runner(true).withInitializer(context -> context.getEnvironment().getPropertySources().addFirst(
                    new MapPropertySource("synthetic-token", Map.of("cloudinary.auth-token.key", key)))).run(context -> {
                Throwable failure = context.getStartupFailure();
                assertNotNull(failure, "invalid key must fail startup");
                StringWriter trace = new StringWriter();
                failure.printStackTrace(new PrintWriter(trace));
                Throwable root = failure;
                while (root.getCause() != null) root = root.getCause();
                assertTrue(root.getMessage().startsWith("Cloudinary token-authentication key must be"), "sanitized validation failure");
                // Tiny strings such as 00 can occur in unrelated stack line numbers. Real key-sized
                // and distinctive synthetic inputs must be absent from the entire diagnostic output.
                if (key.length() >= 16) {
                    assertFalse(trace.toString().contains(key), "startup exception must redact key");
                    assertFalse(output.getAll().contains(key), "startup log must redact key");
                }
                assertFalse(trace.toString().contains("local-fixture-api-secret"), "no API secret fallback/disclosure");
            });
        }
    }
    @Test void validBoundaryAndUppercaseHexKeysStartWithoutGlobalSdkToken(CapturedOutput output) {
        for (String key : new String[]{KEY, "AB".repeat(64)}) {
            runner(true).withPropertyValues("cloudinary.auth-token.key=" + key).run(context -> {
                assertNull(context.getStartupFailure(), "valid synthetic key must start");
                assertTrue(key.equals(context.getBean(CloudinaryAuthTokenProperties.class).key()), "key must bind exactly");
                assertNull(context.getBean(com.cloudinary.Cloudinary.class).config.authToken,
                        "do not install token globally on upload/Admin client");
            });
            assertFalse(output.getAll().contains(key), "startup must not log key");
        }
    }
    @Test void configurationDiagnosticsAndJsonAreRedacted() throws Exception {
        var properties = new CloudinaryAuthTokenProperties(KEY);
        assertFalse(properties.toString().contains(KEY), "diagnostics must redact key");
        String json = new ObjectMapper().writeValueAsString(properties);
        assertFalse(json.contains(KEY), "configuration serialization must not reveal key");
        assertTrue("{}".equals(json), "secret property must not be serialized");
    }
}
