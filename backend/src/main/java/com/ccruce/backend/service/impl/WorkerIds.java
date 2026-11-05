package com.ccruce.backend.service.impl;

import java.net.InetAddress;
import java.util.UUID;

/**
 * Worker identity written to {@code certificate_assets.locked_by} (varchar(64)). The host label is
 * capped at 27 characters so {@code host + ":" + uuid} (27 + 1 + 36) always fits in 64; uniqueness
 * comes from the random UUID, so truncation can never make two live workers collide. The fenced
 * lease token is unaffected — it is a separate UUID column.
 */
final class WorkerIds {

    static final int MAX_LENGTH = 64;
    private static final int UUID_LENGTH = 36;
    private static final int MAX_HOST_LENGTH = MAX_LENGTH - 1 - UUID_LENGTH;

    private WorkerIds() { }

    static String resolve() {
        String host;
        try {
            host = InetAddress.getLocalHost().getHostName();
        } catch (Exception exception) {
            host = "unknown";
        }
        return of(host);
    }

    static String of(String hostName) {
        String host = hostName == null || hostName.isBlank() ? "unknown" : hostName;
        if (host.length() > MAX_HOST_LENGTH) {
            host = host.substring(0, MAX_HOST_LENGTH);
        }
        return host + ":" + UUID.randomUUID();
    }
}
