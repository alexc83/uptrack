package com.ccruce.backend.ciprobe;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** TEMPORARY D01-B controlled CI failure probe. Disposable branch only; never merge. */
class CiFailureProbeTest {

    @Test
    void deliberateBackendFailureForCiValidation() {
        assertEquals("expected", "D01-B deliberate backend failure", "D01-B controlled CI failure probe");
    }
}
