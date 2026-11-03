package com.ccruce.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

/**
 * The app authenticates with its own JWT filter chain; Spring Boot's default
 * UserDetailsService auto-configuration (which logs a generated development password at
 * startup) is excluded in application.yml and must stay absent.
 */
@SpringBootTest
@ActiveProfiles("test")
class SecurityConfigurationTest {
    @Autowired ApplicationContext context;

    @Test
    void noGeneratedDefaultUserDetailsServiceBeanExists() {
        assertEquals(0, context.getBeanNamesForType(UserDetailsService.class).length,
                "no UserDetailsService bean: nothing can mint or log a generated default password");
        assertEquals(0, context.getBeanNamesForType(
                org.springframework.security.provisioning.InMemoryUserDetailsManager.class).length);
    }
}
