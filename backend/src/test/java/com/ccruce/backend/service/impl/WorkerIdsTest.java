package com.ccruce.backend.service.impl;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkerIdsTest {

    @Test
    void workerIdAlwaysFitsTheLockedByColumn() {
        for (String host : new String[]{"unknown", "web-1", "a-very-long-render-internal-hostname.example.internal"}) {
            String id = WorkerIds.of(host);
            assertTrue(id.length() <= WorkerIds.MAX_LENGTH,
                    "worker id must fit varchar(64), got " + id.length() + " for host " + host);
        }
    }

    @Test
    void longHostNameIsTruncatedButUuidSuffixIsPreserved() {
        String host = "h".repeat(200);
        String id = WorkerIds.of(host);
        assertEquals(WorkerIds.MAX_LENGTH, id.length());
        String suffix = id.substring(id.length() - 36);
        assertEquals(suffix, UUID.fromString(suffix).toString(), "last 36 chars must be the UUID");
        assertTrue(id.startsWith("h".repeat(27) + ":"));
    }

    @Test
    void workerIdsAreUniqueAcrossCalls() {
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            assertTrue(ids.add(WorkerIds.resolve()), "worker ids must be unique");
        }
    }

    @Test
    void blankHostFallsBackToUnknown() {
        assertTrue(WorkerIds.of("  ").startsWith("unknown:"));
        assertNotEquals(WorkerIds.of(null), WorkerIds.of("x"));
    }
}
