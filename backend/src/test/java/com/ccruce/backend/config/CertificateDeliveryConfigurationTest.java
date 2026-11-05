package com.ccruce.backend.config;

import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.service.CertificateAssetService;
import com.ccruce.backend.service.impl.CertificateDeliveryServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class CertificateDeliveryConfigurationTest {
    @Configuration(proxyBeanMethods = false)
    @Import({CloudinaryConfig.class, CertificateDeliveryServiceImpl.class})
    static class Config {
        @Bean CERecordRepository records() { return mock(CERecordRepository.class); }
        @Bean UserRepository users() { return mock(UserRepository.class); }
        @Bean CertificateAssetService assets() { return mock(CertificateAssetService.class); }
    }
    @Test void deliveryStartsWithoutPremiumKeyInEitherFlagState() {
        for (boolean enabled : new boolean[]{false, true}) {
            new ApplicationContextRunner().withUserConfiguration(Config.class).withPropertyValues(
                    "cloudinary.cloud-name=local-fixture-cloud", "cloudinary.api-key=local-fixture-key",
                    "cloudinary.api-secret=local-fixture-secret", "app.certificates.delivery.ttl-seconds=60",
                    "app.certificates.delivery.enabled=" + enabled).run(context -> {
                assertNull(context.getStartupFailure());
                assertNotNull(context.getBean(CertificateDeliveryServiceImpl.class));
                assertNull(context.getBean(com.cloudinary.Cloudinary.class).config.authToken);
            });
        }
    }
    @Test void invalidLifetimesRemainRejected() {
        assertThrows(IllegalStateException.class, () -> new CertificateDeliveryProperties(true, 0));
        assertThrows(IllegalStateException.class, () -> new CertificateDeliveryProperties(true, 3601));
    }
}
