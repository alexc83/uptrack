package com.ccruce.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import static org.assertj.core.api.Assertions.assertThat;

class AuthPropertiesTest {
    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(AuthProperties.class)
    static class Config {}

    @Test
    void invalidSecretsAndLifetimesPreventStartupWithoutPrintingValues() {
        for (String secret : new String[]{"", "short", " ".repeat(40)}) {
            runner(secret, 3600).run(context -> assertThat(context).hasFailed());
        }
        for (long lifetime : new long[]{0, -1, 3601, Long.MAX_VALUE}) {
            runner("test-secret-with-at-least-thirty-two-bytes", lifetime)
                    .run(context -> assertThat(context).hasFailed());
        }
    }

    @Test
    void validConfigurationStarts() {
        runner("test-secret-with-at-least-thirty-two-bytes", 3600)
                .run(context -> assertThat(context).hasNotFailed());
    }

    private ApplicationContextRunner runner(String secret, long lifetime) {
        return new ApplicationContextRunner().withUserConfiguration(Config.class).withPropertyValues(
                "auth.jwt.secret=" + secret, "auth.jwt.expiration-seconds=" + lifetime);
    }
}
