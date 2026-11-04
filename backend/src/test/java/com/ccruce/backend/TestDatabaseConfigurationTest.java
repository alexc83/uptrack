package com.ccruce.backend;

import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;

/** Fails when the shared test context is not connected to the expected database (H2 or PostgreSQL). */
@SpringBootTest
@ActiveProfiles("test")
class TestDatabaseConfigurationTest {
    @Autowired DataSource dataSource;
    @Autowired Environment environment;

    @Test
    void sharedTestContextUsesTheExpectedDatabase() throws Exception {
        TestDatabaseAssertions.assertExpectedDatabase(dataSource, environment);
    }
}
