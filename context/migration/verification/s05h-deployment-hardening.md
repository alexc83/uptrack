# S05H — Deployment security hardening

Status: **implemented, fully verified locally, pushed; not merged, not deployed.** Date: 2026-11-03.
Branch: `fix/s05h-deployment-hardening`. Baseline: `origin/main` = **`e7378a7`** (merge of S05V PR #17; S05R PR #16 merged as `7d64d9a`). Implementation commit: **`ec37e35`**; documentation commit: this file's commit on the same branch.

S05H remediates the S05V independent-review findings V-001 (rate-limiter capacity exhaustion), V-002 (reverse-proxy client identity), the request-size/resource-exhaustion gaps, V-005 (generated development password) and the lower-severity V-003/V-004 certificate items. No production service, hosted environment or real Cloudinary account was contacted; all tests use synthetic data and mocked Cloudinary. The retired Angular `frontend/` is untouched; `frontend-react/` was not modified, so frontend checks were not re-run.

## 1. Summary of changes

| Area | Change | Files |
|---|---|---|
| V-001 rate limiter | Per-scope maps, per-window expiry, prompt reclaim, bounded rejection at capacity | `security/RequestRateLimiter.java` |
| V-002 client identity | New `ClientIpResolver` with explicit trusted-proxy allowlist, rightmost-untrusted chain walking, IPv6 /64 bucketing, no DNS on header values | `security/ClientIpResolver.java`, `security/RequestRateLimitFilter.java` |
| Request-size limits | New `RequestSizeLimitFilter`: 1 MiB cap on non-multipart bodies (413 on declared length; bounded stream for chunked), mapped by the global handler | `security/RequestSizeLimitFilter.java`, `exception/RequestBodyTooLargeException.java`, `exception/GlobalExceptionHandler.java`, `config/SecurityConfig.java` |
| Upload resource bounds | `tryAcquire` semaphore (default 4) around validate+upload; excess → 503 + `Retry-After`, never queues | `service/impl/CertificateUploadServiceImpl.java`, `exception/UploadBusyException.java` |
| V-003 compatibility | `%%EOF` accepted within final 4 KiB; pixel cap 25→40 Mpx with header-first rejection; distinct dimension/frame messages | `validation/CertificateFileValidator.java` |
| V-005 generated password | `UserDetailsServiceAutoConfiguration` excluded; `server.error.include-message/stacktrace: never` | `application.yml` |
| Config surface | `app.trusted-proxies`, `app.security.max-request-body-bytes`, `app.upload.max-concurrent` (env-overridable) | `application.yml` |

## 2. V-001 — rate-limiter capacity exhaustion: REMEDIATED

**Old design defects (confirmed from `s05v-independent-verification.md` §5 V-001):** one shared 10,000-key map across all scopes; expired entries purged only after a hard-coded 3600 s regardless of scope; fail-closed rejection of any new key at capacity. A ≥10,000-distinct-source login flood therefore kept every *new* client rejected for up to an hour, and registration keys were blocked by a login flood.

**New design (`RequestRateLimiter`):**

- Each scope (`login` 60 s, `register` 3600 s, `upload` 3600 s) owns an independent map with its own limit and its own `MAX_KEYS_PER_SCOPE = 10_000` capacity. Total memory is bounded by the sum of the per-scope caps (30,000 small records worst case); the limit was **not** raised.
- Entries expire by their **own** scope window. Expired entries are reclaimed promptly: swept at most once per second per scope on access, and **always** before any capacity decision. A 60 s login entry can no longer sit in the map for an hour.
- At capacity with no expired entries, a new identity is rejected with `Retry-After` = seconds until the **soonest active window expires** (≤ 60 s for login, ≤ 3600 s for register/upload) — bounded, never indefinite, and never by evicting an active victim limit. Rate limiting is never disabled under attack.
- `synchronized` on the single entry point keeps concurrent requests correct (verified: exactly 10 of 500 parallel calls on one key are admitted).
- Eviction strategy tradeoff (documented, deliberate): fail-closed-with-bounded-retry was chosen over LRU/soonest-expiry eviction. Evicting active windows under a sustained >capacity flood would let an attacker shorten other clients' windows; bounded rejection instead guarantees no lockout longer than one window while keeping every active limit fully enforced. The residual cost is that under a sustained flood a new client may wait up to one window (60 s for login) — acceptable, and the edge limiter (deployment requirement, §9) remains the real defense at that scale.

**Test evidence** (`RequestRateLimiterTest`, 11 tests, all passing): capacity exhaustion per scope; new client admitted after expired entries are reclaimed (+61 s login); registration/upload unaffected by a full login map; bounded rejection at capacity (`Retry-After = 60`) and recovery after the attack; fixed-window boundary (limited at +59 s with `Retry-After: 1`, fresh window at +60 s, exactly 10 more); independent window durations (60 s vs 3600 s); independent login/register/upload buckets; 500-thread concurrency on one key (exactly 10 allowed) and 200 distinct keys under capacity; filter-level spoofed-header and trusted-proxy behavior.

## 3. V-002 — reverse-proxy client identity: REMEDIATED (application side) + deployment requirement

**Design (`ClientIpResolver`, wired into `RequestRateLimitFilter`):**

- Default: identity = direct `getRemoteAddr()`. `server.forward-headers-strategy: none` stays, so the container never rewrites the peer; **all** client-supplied `X-Forwarded-For`/`Forwarded`/`X-Real-IP` values are ignored for untrusted peers (regression-tested).
- Trusted proxies are an explicit allowlist, `app.trusted-proxies` / `TRUSTED_PROXIES` (comma-separated exact IPs or CIDRs, IPv4 and IPv6, e.g. `10.9.9.9,192.168.0.0/16,2001:db8::/32`). Empty (default) = direct access only.
- Only when the immediate peer matches the allowlist are forwarding headers parsed. The chain is walked **right-to-left**, skipping trusted proxies; the first untrusted entry is the client, so a client cannot spoof by prepending forged values (tested: attacker-supplied `X-Forwarded-For` through a trusted proxy resolves to the attacker's real address, not the forged one).
- Parsing is strict and DNS-free: IPv4 dotted-quad (octets ≤ 255, validated before any `InetAddress` call), IPv6 literals (bracketed `[..]:port` forms supported), RFC 7239 `for=` values (quoted, port, `unknown`/`_obf` fall back safely). Malformed entries or chains longer than 16 entries fall back to the direct peer. `X-Forwarded-For` takes precedence over `Forwarded`.
- IPv6 identities (direct or forwarded) are bucketed by their /64 prefix, so one routed IPv6 block cannot mint unlimited rate-limit keys.
- Upload scope remains keyed by authenticated user ID, independent of IP.

**Test evidence:** `ClientIpResolverTest` (12 tests): default ignore-all-headers; untrusted peer cannot spoof; rightmost-untrusted through multi-proxy chains; forged-prefix defeat; all-trusted fallback; malformed/empty/overlong chains; RFC 7239 parsing; XFF precedence; IPv6 /64 bucketing; v4/v6 ports and brackets; CIDR allowlist matching incl. invalid entries; 200-thread concurrent resolution. `TrustedProxyRateLimitIntegrationTest` (4 tests, real MockMvc security chain with `app.trusted-proxies=10.9.9.9,192.168.0.0/16` and production-like limits): untrusted peer shares one bucket despite forged headers (429 on 3rd login); trusted proxy gets per-forwarded-client buckets across two allowlisted peers; malformed/all-trusted chains fall back to the peer bucket while well-formed clients get fresh buckets; oversized JSON body → 413 without consuming the login bucket.

**What an application change cannot prove:** behind a proxy that is *not* allowlisted, all clients still share the proxy's bucket — by design (fail safe). A future production proxy deployment is only valid with §9 configuration.

## 4. Request-size and resource-exhaustion hardening

- **JSON/non-multipart bodies:** new `RequestSizeLimitFilter` (first in the security chain) caps non-multipart bodies at `app.security.max-request-body-bytes` (default 1 MiB, `MAX_REQUEST_BODY_BYTES`). A declared `Content-Length` above the cap gets a structured 413 **without reading the body**; chunked/unknown-length bodies are cut off mid-stream by a bounded `ServletInputStream` that throws `RequestBodyTooLargeException`, mapped to a generic 413 by `GlobalExceptionHandler`. This closes the V-005 observation that a 20 MB login body was fully read. Oversized requests are rejected before the rate limiter, so they cannot consume login budget (asserted in the integration test). Per-request bound, not a global lock; other clients are unaffected.
- **Multipart/uploads:** unchanged S05R caps remain authoritative — 5 MiB file / 6 MiB request (`spring.servlet.multipart`), Tomcat `max-swallow-size: 8MB` for a usable 413, and the validator's 5 MiB + 1 byte read bound. The size filter explicitly skips multipart.
- **Concurrent upload processing / decode memory (V-004):** `CertificateUploadServiceImpl` now wraps validate+upload in a `Semaphore` (`app.upload.max-concurrent`, default 4) using `tryAcquire` — excess requests get 503 + `Retry-After: 5` immediately and are **never queued**, so one malicious client cannot block legitimate users. Combined with the pixel cap (§6), worst-case transient decode memory is ≈ 40 Mpx × 4 bytes × 4 concurrent ≈ 640 MB; production should run with ≥ 1 GB heap or lower `MAX_CONCURRENT_UPLOADS`. **A robust limit at replica scale requires deployment-level support** (edge/WAF concurrency and body caps); this is documented, not claimed as solved in app code.
- **Tests:** `RequestSizeLimitFilterTest` (6 tests: declared-length 413 without body read, at-limit pass, chunked streaming cutoff, multipart skip, invalid config, 50-thread mixed concurrency) and `CertificateUploadConcurrencyTest` (single slot busy → immediate `UploadBusyException`, no queuing; recovery after release).

## 5. Generated-password remediation (V-005)

`spring.autoconfigure.exclude` now excludes `UserDetailsServiceAutoConfiguration`, so Spring Security no longer creates an in-memory default user or logs "Using generated security password" at startup. The real JWT filter chain is untouched. `server.error.include-message/stacktrace: never` added as defense-in-depth. Regression guard: `SecurityConfigurationTest` asserts the context contains **no** `UserDetailsService`/`InMemoryUserDetailsManager` bean; the full suite (which exercises login/register/JWT) passes, proving the real authentication mechanism is intact.

## 6. Certificate compatibility decisions (V-003)

- **PDF trailing data:** accepted. `%%EOF` is now searched within the final 4 KiB instead of the final 32 bytes, so valid PDFs with trailing generator data pass. PDFBox parsing and the active-content scan (OpenAction/JS/Launch/EmbeddedFiles/AcroForm/XFA/…) remain the security gate and are unchanged; trailing data past the last `%%EOF` is inert to PDFBox. Tested: +500 trailing bytes accepted; trailing data pushing `%%EOF` beyond the 4 KiB window still rejected; all active-content rejections still pass.
- **Image dimensions:** cap raised 25 → 40 Mpx, covering legitimate 28 Mpx scans (7000×4000) while still rejecting decompression bombs **from the header before any raster allocation** (tested: 42 Mpx PNG header rejected with a distinct "dimensions exceed" message; 25.5 Mpx real PNG accepted). Frame cap (100) unchanged, with a distinct message.
- **Not changed:** Cloudinary public/private delivery model, allowed formats, 5 MiB file cap, all active-PDF/malware-relevant validation. Polyglot acceptance and real malware scanning remain documented limitations.

## 7. Security tradeoffs and remaining limitations

- The in-process limiter is per-replica and in-memory; for multiple replicas or a public host, a shared edge/gateway limiter is required (§9). Fixed windows still allow up to 2× the limit across a boundary (accepted for brute-force damping).
- Bounded capacity rejection means that under a sustained >10,000-active-IP flood, new login clients may wait up to 60 s; never longer, and never for active victims' windows to be weakened.
- Trusted-proxy mode is only as safe as the network: direct backend access must be blocked when `TRUSTED_PROXIES` is set, otherwise attackers bypass the proxy and spoof headers directly.
- 503-on-busy uploads can reject a legitimate upload during a malicious flood; the per-user 20/hour limit and edge caps bound the impact. This is a deliberate trade against unbounded memory.
- Not in scope / unchanged: public Cloudinary delivery (owner decision), orphan cleanup, host headers/CSP (S05-010), `ddl-auto`, CI/rulesets, registration-enumeration UX.

## 8. Verification results

All run on `fix/s05h-deployment-hardening` (`ec37e35`), macOS, JDK 27 compiling `--release 21`, offline Maven repo.

| Check | Result |
|---|---|
| Full backend `./mvnw verify` (compile + **165 tests** + executable JAR repackage) | **165 run, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS**, `backend-0.0.1-SNAPSHOT.jar` repackaged |
| — of which `CrossUserAuthorizationIntegrationTest` (cross-user authz) | **47/47 pass** |
| — JWT auth/revocation (`SecurityRemediationIntegrationTest`, `JwtAuthenticationFilterTest`, `LoginWorkFactorTest`) | 24 + 4 + 1, all pass |
| — new S05H tests: `RequestRateLimiterTest` 11, `ClientIpResolverTest` 12, `RequestSizeLimitFilterTest` 6, `TrustedProxyRateLimitIntegrationTest` 4, `CertificateUploadConcurrencyTest` 1, `SecurityConfigurationTest` 1, `CertificateFileValidatorTest` 11 | **46/46 pass** |
| — real-HTTP multipart/limits (`MultipartHttpIntegrationTest`, incl. 413 + 429 paths) | pass |
| `git diff --check` | pass |
| Frontend (typecheck/lint/test/build) | **NOT RUN — no `frontend-react/` files were modified** |
| Real Cloudinary, hosted/proxied deployment, load tests, PDF object-stream bomb fuzzing, four-browser Playwright | **NOT RUN** (out of scope; no production contact) |

Test count grew 132 → 165 (+33 net new S05H cases; `CertificateFileValidatorTest` +2, `RequestRateLimiterTest` +3 net, others new).

## 9. Required deployment configuration

For a public or proxied deployment (none performed here):

1. `TRUSTED_PROXIES` = the exact IPs/CIDRs of your reverse proxy tier (e.g. the PaaS router range). Leave empty for direct exposure. **Block direct backend access at the network level when set** (security group/firewall: 8080 reachable only from the proxy tier).
2. Edge/WAF in front: per-IP rate limits (the in-process limiter is only a per-replica backstop), body-size caps larger than 8 MiB rejected before forwarding, connection limits.
3. `MAX_REQUEST_BODY_BYTES` (default 1 MiB) and multipart caps tuned to the edge caps; `MAX_CONCURRENT_UPLOADS` (default 4) with JVM heap ≥ 1 GB (or lower the concurrency).
4. Generated ≥ 32-byte `AUTH_JWT_SECRET`, `AUTH_JWT_EXPIRATION_SECONDS` 1–3600 (unchanged from S05R), `ALLOWED_ORIGIN_PATTERNS` restricted to the SPA origin.
5. Host/TLS tier: CSP, HSTS, Referrer-Policy, Permissions-Policy (S05-010, still host-owned).
6. Roll out all replicas together (S05R credential-marker requirement unchanged).

## 10. Remaining production-readiness blockers

- No deployment-specific verification has been performed: edge rate limiting, trusted-proxy network isolation, host security headers, and minimum heap/concurrency sizing are **deployment-provider work**, documented above but not testable in this repository. The backend must not be described as production-ready until those are verified on the actual host.
- Owner decisions still open from S05/S05V: public vs authenticated/signed Cloudinary delivery and historical URL migration; durable orphan cleanup/outbox; durable storage quotas and provider account caps; malware scanning; `ddl-auto` policy; CI/rulesets/branch protection; controlled non-production Cloudinary verification.
- Known accepted tradeoffs: registration-existence 400 message; fixed-window boundary bursts; NAT users share an IP budget; 503 under upload floods; one extra user lookup per authenticated request (V-005 informational).
