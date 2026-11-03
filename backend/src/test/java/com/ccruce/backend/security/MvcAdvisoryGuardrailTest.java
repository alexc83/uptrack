package com.ccruce.backend.security;

import org.junit.jupiter.api.Test;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Review trigger for the two audited Spring 6.2 MVC advisories, not a claim that
 * all SSE/views are unsafe. This deliberately does not ban unrelated MVC features.
 */
class MvcAdvisoryGuardrailTest {
    @Test
    void auditedXsltAndSseFragmentFeaturesRemainAbsentUntilReassessed() throws Exception {
        StringBuilder sources = new StringBuilder();
        try (var paths = Files.walk(Path.of("src/main"))) {
            for (var path : paths.filter(Files::isRegularFile).toList()) {
                if (path.toString().endsWith(".java") || path.toString().endsWith(".xml")
                        || path.toString().endsWith(".yml") || path.toString().endsWith(".properties")) {
                    sources.append(Files.readString(path)).append('\n');
                }
            }
        }
        String source = sources.toString();
        assertFalse(source.contains("XsltView"),
                "XsltView/Resolver introduced: reassess GHSA-pc63-qcmh-9cmg before enabling this feature.");
        boolean sse = source.contains("SseEmitter") || source.contains("ServerSentEvent") || source.contains("text/event-stream");
        boolean fragments = source.contains("FragmentsRendering") || source.contains("ModelAndView");
        assertFalse(sse && fragments,
                "SSE plus view rendering introduced: reassess GHSA-j9f9-w8pj-32f8; this combination requires review.");
    }
}
