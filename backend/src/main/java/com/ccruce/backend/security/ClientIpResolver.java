package com.ccruce.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Resolves the rate-limit identity of a client without ever trusting client-supplied
 * headers by default.
 *
 * <p>The direct peer address ({@code getRemoteAddr()}) is always the identity unless the
 * peer is explicitly listed in the {@code app.trusted-proxies} allowlist (IPs or CIDR
 * ranges, e.g. {@code 10.0.0.8, 192.168.0.0/16, 2001:db8::/32}). Only then are
 * {@code X-Forwarded-For} / {@code Forwarded} chains consulted, walking from the
 * rightmost entry leftwards and skipping trusted proxies: the first untrusted entry is
 * the real client, so a client cannot spoof its identity by prepending forged values.
 * Malformed or overlong chains fall back to the direct peer address. IPv6 identities are
 * bucketed by their /64 prefix so one routed IPv6 block cannot mint unlimited keys.
 *
 * <p>{@code server.forward-headers-strategy: none} stays in force: the container never
 * rewrites the remote address itself; this resolver is the only vetted path. When this
 * allowlist is used, direct backend access must be blocked at the network level so
 * attackers cannot bypass the proxy.
 */
@Component
public class ClientIpResolver {
    private static final int MAX_FORWARDED_CHAIN = 16;
    private static final Pattern IPV4 = Pattern.compile("\\d{1,3}(\\.\\d{1,3}){3}");
    private static final Pattern IPV6_LIKE = Pattern.compile("[0-9a-fA-F:.]+");

    private final List<IpMatcher> trustedProxies;

    @Autowired
    public ClientIpResolver(@Value("${app.trusted-proxies:}") List<String> trustedProxies) {
        this(trustedProxies.stream().filter(s -> !s.isBlank()).toArray(String[]::new));
    }

    ClientIpResolver(String... trustedProxies) {
        this.trustedProxies = java.util.Arrays.stream(trustedProxies).map(IpMatcher::parse).toList();
    }

    /** Returns the normalized client identity (IPv6 addresses collapse to their /64). */
    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        InetAddress peer = parseIp(remoteAddr);
        if (peer == null || !isTrusted(peer)) {
            return peer != null ? normalize(peer) : remoteAddr;
        }
        List<String> chain = parseForwardedFor(request.getHeader("X-Forwarded-For"));
        if (chain == null) chain = parseForwardedHeader(request.getHeader("Forwarded"));
        if (chain == null || chain.isEmpty() || chain.size() > MAX_FORWARDED_CHAIN) {
            return normalize(peer);
        }
        for (int i = chain.size() - 1; i >= 0; i--) {
            InetAddress entry = parseIp(chain.get(i));
            if (entry == null) return normalize(peer); // malformed entry: refuse to guess
            if (!isTrusted(entry)) return normalize(entry);
        }
        // Every forwarded entry is a trusted proxy; the real client is beyond them.
        return normalize(peer);
    }

    boolean isTrustedForTest(String ip) {
        InetAddress address = parseIp(ip);
        return address != null && isTrusted(address);
    }

    private boolean isTrusted(InetAddress address) {
        for (IpMatcher matcher : trustedProxies) {
            if (matcher.matches(address)) return true;
        }
        return false;
    }

    /** Normalizes an address for bucketing; IPv6 is collapsed to its canonical /64 prefix. */
    static String normalize(InetAddress address) {
        byte[] bytes = address.getAddress();
        if (bytes.length == 16) {
            for (int i = 8; i < 16; i++) bytes[i] = 0;
            return compressIpv6(bytes);
        }
        return address.getHostAddress();
    }

    /** RFC 5952-style compression of a 16-byte IPv6 address (longest zero run -> "::"). */
    private static String compressIpv6(byte[] bytes) {
        int[] groups = new int[8];
        for (int i = 0; i < 8; i++) groups[i] = ((bytes[2 * i] & 0xFF) << 8) | (bytes[2 * i + 1] & 0xFF);
        int bestStart = -1, bestLen = 0, start = -1, len = 0;
        for (int i = 0; i < 8; i++) {
            if (groups[i] == 0) {
                if (start < 0) { start = i; len = 1; } else len++;
                if (len > bestLen) { bestLen = len; bestStart = start; }
            } else {
                start = -1; len = 0;
            }
        }
        if (bestLen < 2) bestStart = -1;
        var sb = new StringBuilder();
        int i = 0;
        while (i < 8) {
            if (i == bestStart) {
                sb.append("::");
                i += bestLen;
            } else {
                if (sb.length() > 0 && sb.charAt(sb.length() - 1) != ':') sb.append(':');
                sb.append(Integer.toHexString(groups[i]));
                i++;
            }
        }
        return sb.toString();
    }

    private static String normalize(String fallback) {
        InetAddress parsed = parseIp(fallback);
        return parsed != null ? normalize(parsed) : fallback;
    }

    /** Parses an IP literal without any DNS lookup; returns null for anything else. */
    static InetAddress parseIp(String value) {
        if (value == null) return null;
        String s = value.trim();
        if (s.startsWith("\"") && s.endsWith("\"") && s.length() >= 2) s = s.substring(1, s.length() - 1);
        if (s.startsWith("[") ) {
            int end = s.indexOf(']');
            if (end < 0) return null;
            s = s.substring(1, end);
        } else if (s.indexOf(':') >= 0 && s.indexOf(':') == s.lastIndexOf(':')
                && IPV4.matcher(s.substring(0, s.indexOf(':'))).matches()) {
            s = s.substring(0, s.indexOf(':')); // IPv4 with port
        }
        if (s.isEmpty()) return null;
        boolean v6 = s.contains(":");
        if (v6) {
            if (!IPV6_LIKE.matcher(s).matches()) return null;
        } else if (!isStrictIpv4(s)) {
            return null; // reject before getByName so non-literals never trigger a DNS lookup
        }
        try {
            // Literal-only inputs (dotted quad or colon-containing) never trigger DNS.
            InetAddress address = InetAddress.getByName(s);
            if (v6 != (address.getAddress().length == 16)) return null;
            return address;
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean isStrictIpv4(String s) {
        if (!IPV4.matcher(s).matches()) return false;
        for (String octet : s.split("\\.")) {
            if (octet.length() > 3 || Integer.parseInt(octet) > 255) return false;
        }
        return true;
    }

    /** X-Forwarded-For: comma-separated list, left = original client. Null when absent. */
    private static List<String> parseForwardedFor(String header) {
        if (header == null || header.isBlank()) return null;
        List<String> entries = new ArrayList<>();
        for (String part : header.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) entries.add(trimmed);
        }
        return entries;
    }

    /** RFC 7239 Forwarded: semicolon-separated elements, each with for=/proto=/host= pairs. */
    private static List<String> parseForwardedHeader(String header) {
        if (header == null || header.isBlank()) return null;
        List<String> entries = new ArrayList<>();
        for (String token : header.split("[,;]")) {
            String trimmed = token.trim();
            if (trimmed.regionMatches(true, 0, "for=", 0, 4)) {
                entries.add(trimmed.substring(4));
            }
        }
        return entries;
    }

    /** Exact IP or CIDR matcher over IPv4/IPv6 address bytes. */
    static final class IpMatcher {
        private final byte[] network;
        private final int prefixBits;

        private IpMatcher(byte[] network, int prefixBits) {
            this.network = network;
            this.prefixBits = prefixBits;
        }

        static IpMatcher parse(String spec) {
            String s = spec.trim();
            int slash = s.indexOf('/');
            String addrPart = slash < 0 ? s : s.substring(0, slash);
            InetAddress base = parseIp(addrPart);
            if (base == null) throw new IllegalArgumentException("Invalid trusted proxy entry: " + spec);
            int prefix = slash < 0 ? base.getAddress().length * 8
                    : Integer.parseInt(s.substring(slash + 1));
            if (prefix < 0 || prefix > base.getAddress().length * 8) {
                throw new IllegalArgumentException("Invalid trusted proxy CIDR: " + spec);
            }
            return new IpMatcher(base.getAddress(), prefix);
        }

        boolean matches(InetAddress address) {
            byte[] bytes = address.getAddress();
            if (bytes.length != network.length) return false;
            int fullBytes = prefixBits / 8;
            for (int i = 0; i < fullBytes; i++) {
                if (bytes[i] != network[i]) return false;
            }
            int remaining = prefixBits % 8;
            if (remaining > 0) {
                int mask = 0xFF << (8 - remaining);
                if ((bytes[fullBytes] & mask) != (network[fullBytes] & mask)) return false;
            }
            return true;
        }
    }
}
