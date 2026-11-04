package com.ccruce.backend;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Locale;
import javax.sql.DataSource;
import org.springframework.core.env.Environment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves which database a Spring test context is really connected to, using JDBC metadata from the
 * context's own {@link DataSource}. Without it a misconfigured PostgreSQL job could silently run on H2.
 *
 * <p>Expectations (default: H2, any version):
 * <ul>
 *   <li>{@code uptrack.test.expected-database-product} — JDBC product name, e.g. {@code H2} or
 *       {@code PostgreSQL}. The {@code ci-postgres} profile sets {@code PostgreSQL}; CI additionally sets
 *       {@code UPTRACK_TEST_EXPECTED_DATABASE_PRODUCT} so the check fails if that profile is not active.</li>
 *   <li>{@code uptrack.test.expected-database-major-version} — optional server major version
 *       (CI: {@code 17}).</li>
 * </ul>
 */
public final class TestDatabaseAssertions {
    public static final String EXPECTED_PRODUCT = "uptrack.test.expected-database-product";
    public static final String EXPECTED_MAJOR_VERSION = "uptrack.test.expected-database-major-version";

    private TestDatabaseAssertions() {}

    public static void assertExpectedDatabase(DataSource dataSource, Environment environment) throws SQLException {
        String expectedProduct = environment.getProperty(EXPECTED_PRODUCT, "H2");
        String expectedMajor = environment.getProperty(EXPECTED_MAJOR_VERSION, "");
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            // Credentials are never part of these values; the URL carries host and database only.
            System.out.printf("Test datasource: product=%s version=%s major=%d url=%s profiles=%s%n",
                    metadata.getDatabaseProductName(), metadata.getDatabaseProductVersion(),
                    metadata.getDatabaseMajorVersion(), metadata.getURL(),
                    Arrays.toString(environment.getActiveProfiles()));
            assertEquals(expectedProduct, metadata.getDatabaseProductName(), "database product");
            String expectedUrlPrefix = "jdbc:" + expectedProduct.toLowerCase(Locale.ROOT) + ":";
            assertTrue(metadata.getURL().startsWith(expectedUrlPrefix),
                    () -> "datasource URL must start with " + expectedUrlPrefix);
            if (!expectedMajor.isBlank()) {
                assertEquals(Integer.parseInt(expectedMajor.trim()), metadata.getDatabaseMajorVersion(),
                        "database server major version");
            }
        }
    }
}
