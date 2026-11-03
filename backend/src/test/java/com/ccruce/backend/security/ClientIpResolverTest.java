package com.ccruce.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

class ClientIpResolverTest {

    private static MockHttpServletRequest request(String remoteAddr) {
        var request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(remoteAddr);
        return request;
    }

    @Test
    void defaultsToDirectRemoteAddressAndIgnoresAllForwardingHeaders() {
        var resolver = new ClientIpResolver();
        var request = request("203.0.113.7");
        request.addHeader("X-Forwarded-For", "1.2.3.4, 5.6.7.8");
        request.addHeader("Forwarded", "for=9.9.9.9;proto=https");
        request.addHeader("X-Real-IP", "8.8.8.8");
        assertEquals("203.0.113.7", resolver.resolve(request));
    }

    @Test
    void untrustedPeerCannotSpoofIdentityWithForwardedHeaders() {
        var resolver = new ClientIpResolver("10.0.0.0/8");
        var request = request("203.0.113.7"); // not a trusted proxy
        request.addHeader("X-Forwarded-For", "1.2.3.4");
        assertEquals("203.0.113.7", resolver.resolve(request));
        var forwarded = request("203.0.113.7");
        forwarded.addHeader("Forwarded", "for=1.2.3.4");
        assertEquals("203.0.113.7", resolver.resolve(forwarded));
    }

    @Test
    void trustedProxyYieldsRightmostUntrustedForwardedEntry() {
        var resolver = new ClientIpResolver("10.0.0.0/8", "192.168.10.1");
        // client -> proxyA (192.168.10.1) -> proxyB (10.1.1.1, the peer): rightmost is the
        // peer's own addition; walk left skipping trusted proxies to reach the client.
        var request = request("10.1.1.1");
        request.addHeader("X-Forwarded-For", "198.51.100.23, 192.168.10.1");
        assertEquals("198.51.100.23", resolver.resolve(request));
    }

    @Test
    void clientCannotPrependForgedEntriesThroughATrustedProxy() {
        var resolver = new ClientIpResolver("10.0.0.0/8");
        // Attacker sends XFF "1.1.1.1"; the trusted proxy appends the attacker's real IP.
        var request = request("10.2.3.4");
        request.addHeader("X-Forwarded-For", "1.1.1.1, 203.0.113.66");
        assertEquals("203.0.113.66", resolver.resolve(request));
    }

    @Test
    void allTrustedChainFallsBackToDirectPeer() {
        var resolver = new ClientIpResolver("10.0.0.0/8");
        var request = request("10.9.9.9");
        request.addHeader("X-Forwarded-For", "10.1.1.1, 10.2.2.2");
        assertEquals("10.9.9.9", resolver.resolve(request));
    }

    @Test
    void malformedChainsAndEntriesFallBackToDirectPeer() {
        var resolver = new ClientIpResolver("10.0.0.0/8");
        for (String bad : new String[]{"not-an-ip", "1.2.3.4.5", "999.1.1.1", "", "example.com",
                "1.2.3.4, garbage", "::gggg::1"}) {
            var request = request("10.1.1.1");
            request.addHeader("X-Forwarded-For", bad);
            assertEquals("10.1.1.1", resolver.resolve(request), "header: " + bad);
        }
        var longChain = request("10.1.1.1");
        longChain.addHeader("X-Forwarded-For", String.join(",", java.util.Collections.nCopies(20, "10.5.5.5")));
        assertEquals("10.1.1.1", resolver.resolve(longChain), "overlong chain must be refused");
        var empty = request("10.1.1.1");
        empty.addHeader("X-Forwarded-For", "");
        assertEquals("10.1.1.1", resolver.resolve(empty));
    }

    @Test
    void parsesRfc7239ForwardedHeaderWhenXffAbsent() {
        var resolver = new ClientIpResolver("10.0.0.0/8");
        var request = request("10.1.1.1");
        request.addHeader("Forwarded", "for=192.0.2.60;proto=http;by=10.1.1.1, for=\"[2001:db8::1]:443\"");
        // rightmost entry is the IPv6 client (untrusted) -> its /64
        assertEquals("2001:db8::", resolver.resolve(request));
        var v4 = request("10.1.1.1");
        v4.addHeader("Forwarded", "for=203.0.113.9;host=example.test");
        assertEquals("203.0.113.9", resolver.resolve(v4));
    }

    @Test
    void xForwardedForTakesPrecedenceOverForwarded() {
        var resolver = new ClientIpResolver("10.0.0.0/8");
        var request = request("10.1.1.1");
        request.addHeader("X-Forwarded-For", "198.51.100.1");
        request.addHeader("Forwarded", "for=203.0.113.1");
        assertEquals("198.51.100.1", resolver.resolve(request));
    }

    @Test
    void ipv6IdentitiesAreBucketedBySlash64() {
        var resolver = new ClientIpResolver();
        var a = request("2001:db8:abcd:1234:1111:2222:3333:4444");
        var b = request("2001:db8:abcd:1234:9999:8888:7777:6666");
        assertEquals(resolver.resolve(a), resolver.resolve(b));
        assertEquals("2001:db8:abcd:1234::", resolver.resolve(a));
        var c = request("2001:db8:abcd:1235::1");
        assertNotEquals(resolver.resolve(a), resolver.resolve(c));
    }

    @Test
    void ipv6ForwardedEntriesWithPortsAndBracketsAreParsed() {
        var resolver = new ClientIpResolver("10.0.0.0/8", "2001:db8:ffff::/48");
        var request = request("2001:db8:ffff::1"); // trusted proxy (v6)
        request.addHeader("X-Forwarded-For", "[2001:db8:aaaa::1]:4433, 10.1.1.1");
        assertEquals("2001:db8:aaaa::", resolver.resolve(request));
        var v4port = request("10.1.1.1");
        v4port.addHeader("X-Forwarded-For", "198.51.100.77:51234");
        assertEquals("198.51.100.77", resolver.resolve(v4port));
    }

    @Test
    void cidrAllowlistMatchesAcrossFamilies() {
        var resolver = new ClientIpResolver("192.168.0.0/16", "2001:db8::/32");
        assertTrue(resolver.isTrustedForTest("192.168.55.66"));
        assertFalse(resolver.isTrustedForTest("192.169.0.1"));
        assertTrue(resolver.isTrustedForTest("2001:db8:dead::1"));
        assertFalse(resolver.isTrustedForTest("2001:db9::1"));
        assertFalse(resolver.isTrustedForTest("10.0.0.1"));
        assertThrows(IllegalArgumentException.class, () -> new ClientIpResolver("not-an-ip"));
        assertThrows(IllegalArgumentException.class, () -> new ClientIpResolver("10.0.0.0/33"));
    }

    @Test
    void concurrentResolutionIsConsistentAndThreadSafe() throws Exception {
        var resolver = new ClientIpResolver("10.0.0.0/8");
        int threads = 200;
        var pool = Executors.newFixedThreadPool(32);
        var start = new CountDownLatch(1);
        var results = new ArrayList<AtomicReference<String>>(threads);
        for (int i = 0; i < threads; i++) results.add(new AtomicReference<>());
        for (int i = 0; i < threads; i++) {
            int index = i;
            pool.submit(() -> {
                try {
                    start.await();
                    var request = request(index % 2 == 0 ? "10.1.1.1" : "203.0.113.5");
                    request.addHeader("X-Forwarded-For", "198.51.100." + (index % 50));
                    results.get(index).set(resolver.resolve(request));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS));
        for (int i = 0; i < threads; i++) {
            String expected = i % 2 == 0 ? "198.51.100." + (i % 50) : "203.0.113.5";
            assertEquals(expected, results.get(i).get(), "index " + i);
        }
    }
}
