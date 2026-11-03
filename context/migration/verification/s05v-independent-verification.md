# S05V — Independent verification of S05R security fixes

Reviewer: Claude Code (Sonnet 5.5), independent of the S05R implementer · Date: 2026-11-03
Public repository: no exploit payloads, secrets or operational detail are recorded here.

## 1. Executive summary

S05R (Codex) is **sound and materially improves the security posture**. Every S05 P2 was either fixed or reduced to a documented, owner-decision item. I independently reproduced the fixes with adversarial tests that are *not* copies of Codex's assertions: JWT/credential-marker abuse, upload content attacks, error-handling contracts, rate-limit bypass attempts, and a packaged-JAR run against a disposable PostgreSQL database. **No merge-blocking defect was found.**

I did find **two real defects in the new rate limiter** and a handful of lower-severity items (§5). They matter for *public/proxied deployment*, not for merging into `main` while the hosted backend stays suspended.

**Verdict: APPROVE WITH FOLLOW-UPS** (§12). Merge-ready; **not** production-deployment-ready until V-001 and V-002 (and the owner-decision items in §11) are resolved.

## 2. Baseline and target

| Item | Value |
|---|---|
| `origin/main` | `75d6eecf035920b89b2f57a7a89ca34c580d0b42` (merge of S05 audit PR #15) |
| `origin/fix/s05r-security-remediation` | `52ff22dbc5cdcef0aad9e75d2fd130653297d4cd` |
| Merge base | `75d6eec` (branch is exactly 4 commits ahead of `main`, 0 behind): `a17dc0f`, `89f7740`, `bf17a9e`, `52ff22d` |
| S05R PR | #16, open (not draft). Not merged, not modified. |
| Diff size | 52 files, +1323/−106; backend security code in 14 main files, 11 test files, small React changes |
| Isolation | Clean `git worktree` at the S05R commit; temporary tests were written only there, never committed, and the worktree is discarded. `main` and the S05R branch were not changed. |

## 3. Methodology

1. Fetched refs; confirmed the S05R diff and read it in full (security, validation, exception, JWT, config, service, frontend changes) plus both reports and the new tests.
2. Re-ran the **full backend suite** and frontend checks on the S05R commit.
3. Wrote temporary adversarial tests (unit and real-HTTP via `RANDOM_PORT`, mocked Cloudinary, disposable H2 data) and a packaged-JAR smoke run against a disposable local PostgreSQL 18 database (created and dropped; local-only, no external service contacted).
4. Evidence labels: **CI** code inspection · **ET** existing test · **NR** newly reproduced here · **LV** needs live verification.

## 4. Original-finding verification matrix

| ID | Original | Outcome | Evidence |
|---|---|---|---|
| S05-001 auth rate limiting | P2 | **VERIFIED FIXED** for a single directly-exposed instance (with V-001, V-002 caveats) | NR: 10 successful logins accepted then 429 at request 11, `Retry-After: 60`, structured JSON body; limited requests cost ≈0 ms (no BCrypt); `X-Forwarded-For`/`Forwarded` spoofing does not bypass; encoded/`;`/`//`/`/./`/uppercase/trailing-slash path variants either hit the same limiter (`%6cogin` → 429) or never reach the controller (401/404 even with valid credentials), so no bypass found; concurrency: 500 parallel calls on one key → exactly 10 allowed |
| S05-002 upload validation | P2 | **PARTIALLY REMEDIATED** (content validation fixed; durable quota/provider caps deferred) | NR (§7) |
| S05-003 public documents | P2 | **PARTIALLY REMEDIATED** (new uploads: `use_filename=false`, no `filename_override`; delivery still public) — NR: Cloudinary options verified |
| S05-004 token lifecycle | P2 | **VERIFIED FIXED** | NR (§8) |
| S05-005 secret validation | P3 | **VERIFIED FIXED** | NR: packaged JAR fails at property binding for secret `abc`, blank secret, lifetime `0`, `3601`, and unset lifetime, before any request is served |
| S05-006 enumeration | P3 | **PARTIALLY REMEDIATED** | NR timing: known email 54.5 ms vs unknown 54.3 ms average over 20 samples each (previously ~55 vs ~1 ms). Duplicate registration still returns 400 "Email is already in use." (accepted UX tradeoff, documented) |
| S05-007 client errors | P3 | **VERIFIED FIXED** | NR (§9) |
| S05-008 cert metadata | P3 | **PARTIALLY REMEDIATED** | NR: `javascript:`/`data:` URLs → 400; `..`, encoded traversal and subfolders → 400; foreign-user asset → 400. Still accepted: arbitrary HTTP(S) host with a valid own public ID, and link-only certificates (deliberate; deferred) |
| S05-009 orphaned assets | P3 | **NOT FIXED** (explicitly deferred; needs outbox/retry design) | CI |
| S05-010 headers/CSP/HSTS | P3 | **NOT FIXED** (host-level; deferred) | CI |
| S05-011 prod defaults | P3 | **PARTIALLY REMEDIATED** — `allowCredentials(false)` done (CI); `ddl-auto: update`, root container, unpinned images remain | CI |
| S05-012 CI/branch protection | P3 | **NOT FIXED** (deferred) | CI |
| S05-013 legacy hostname | P3 | **NOT FIXED** (deferred, informational) | CI |
| Spring MVC advisory guardrail | — | **Present, with limits** (§10) | CI + NR (passes on both baselines) |

## 5. New findings

No P0/P1. None blocks merging S05R.

### V-001 — Rate-limiter key-capacity exhaustion lets an attacker lock out *new* clients for up to an hour (P2, demonstrated at unit level)
* **File:** `backend/.../security/RequestRateLimiter.java:24-25, 49, 52, 61-63`.
* **Cause:** the map holds at most 10,000 keys and **fails closed** for any new key at capacity. Expired windows are purged only after `HOUR` (3600 s) regardless of scope, although login windows last 60 s. All scopes share one map.
* **NR evidence:** after 10,000 distinct login identities, a new legitimate key got `retryAfter=60`; **two minutes later it was still blocked**, and was only admitted after an hour. A registration key was also blocked by a *login* flood (shared map).
* **Prerequisites:** an attacker presenting ≥10,000 distinct source addresses (trivial with a single IPv6 /64, or a modest botnet). Existing keys keep their own windows, so already-active users are less affected, but every *new* IP is refused for login and registration.
* **Impact:** denial of service of sign-in/registration for new clients. Not a confidentiality or integrity issue.
* **Remediation:** purge each entry by its own scope duration (not `HOUR`); on reaching capacity, purge expired entries first and only then reject; use separate caps per scope; bucket IPv6 by /64; keep a shared edge limiter in front for real deployments.
* **Regression test:** fill the map with login keys, advance the clock 61 s, assert a new key is admitted and registration is unaffected by login keys.

### V-002 — Behind any reverse proxy every user shares one rate-limit bucket (P2 for deployment; CI, documented by Codex but not flagged as a blocker)
* **File:** `RequestRateLimitFilter.java:30` (`getRemoteAddr()`), `application.yml:3` (`forward-headers-strategy: none`).
* **Impact:** on a proxied host (e.g. a PaaS router) all clients appear as the proxy IP, so the whole user base shares **10 logins per minute and 5 registrations per hour**; one script can keep everyone locked out. Direct exposure is the only configuration where the limiter behaves as designed. Spoofed forwarding headers are correctly *not* trusted (verified).
* **Remediation:** before deploying behind a proxy, configure a vetted trusted-proxy integration (Tomcat `RemoteIpValve` with an explicit internal-proxy list, or the platform's documented client-IP header) *and* block direct backend access; keep edge rate limiting.
* **Test:** an integration test with a trusted proxy configured showing different `X-Forwarded-For` values map to different buckets only when the peer is a trusted proxy.

### V-003 — Some legitimate certificates are rejected, with a misleading message (P3, demonstrated)
* `CertificateFileValidator.java:24` (25 Mpx cap) and `:61` (`%%EOF` within the last 32 bytes).
* A valid 7000×4000 JPEG (28 Mpx, 428 KiB) is rejected, and so is a valid PDF with more than 32 trailing bytes after `%%EOF` (common with some generators). Both return the generic "Certificate content is invalid or does not match its file type." A 24 Mpx PNG and a 5000×5000 PNG are accepted. Active-content PDFs (JS/OpenAction/Launch/EmbeddedFiles/AcroForm) are intentionally rejected, so signed/form PDFs must be flattened (documented).
* **Remediation:** distinct messages for dimension/size vs corruption; consider accepting trailing bytes after the final `%%EOF` (PDFBox already parsed the file), and raise the pixel cap only after measuring heap use.

### V-004 — Image decode memory is bounded by pixels, not by concurrency (P3, CI, not measured)
* Up to 25 Mpx may be decoded per upload (≈100 MB transient for 4 bytes/pixel) while up to 20 uploads/user/hour are allowed from unlimited users. On a small-heap host, a handful of concurrent maximum-size uploads could exhaust memory. **Remediation:** limit concurrent validations (semaphore) and/or decode via `ImageReader` subsampling/size-only checks for large images; document the minimum heap.

### V-005 — Informational / pre-existing
* Spring Boot logs a generated development password at startup ("Using generated security password") because no `UserDetailsService` exists. It is unusable with this filter chain (no form/basic login), but it is log noise that should be suppressed (define a no-op `UserDetailsService` or exclude the auto-configuration). Not introduced by S05R.
* No limit on JSON request-body size: a 20 MB body to the unauthenticated `/login` was fully read and answered 400. Cap at the edge (S05R already documents edge body caps for uploads).
* The new JWT validation performs one extra primary-key user lookup per authenticated request in addition to the lookup the service layer already performs (≈2 lookups/request). Acceptable for the current scale; cache or pass the loaded user through if it ever matters.

## 6. Authentication and rate-limit assessment

| Probe | Result |
|---|---|
| Repeated failed logins | 10 allowed, then 429; correct password also blocked while limited (limit counts all attempts, by design) |
| Successful logins consume capacity | Yes (10 successes then 429) — shared-NAT users share one budget |
| Registration throttling | 5/hour/IP configured; shares the capacity weakness V-001 |
| 429 behaviour | JSON `ErrorResponse`, `Retry-After` = 60 at start, 30 at +30 s (unit), recovers at +60 s |
| Fixed-window boundary | 19 requests in a 1-second span across the boundary (inherent to fixed windows; acceptable for brute-force damping) |
| Concurrency | `synchronized`; exactly 10 of 500 parallel calls allowed |
| Memory | Bounded (10,000 keys) but see V-001 for the fail-closed side effect |
| Proxy identity | Forwarded headers ignored (verified); see V-002 |
| Appropriateness | Adequate for a **single, directly-exposed instance**. For multiple replicas or a load balancer: (1) move enforcement to a shared store/edge/gateway (Redis, API gateway, CDN/WAF); (2) trusted client-IP derivation; (3) keep the in-process limiter only as a coarse backstop; (4) roll out all replicas together so none lacks the credential-marker check. |

Enumeration timing is now equalised (dummy BCrypt on unknown email).

## 7. Certificate-upload assessment

Accepted (NR): plain PDF; PNG/JPEG/GIF (generated); upper-case extension/MIME; benign `URI` link in a PDF.
Rejected with a safe 400 (NR): `.html`/`.svg`/`.exe` with image or PDF labels; PDF-labelled HTML; PDF bytes named `.png`; PNG bytes named `.jpg`; SVG named `.png`; empty file; MIME parameters (`; charset=…`); legacy `application/x-pdf`; OpenAction JavaScript (saved in a compressed object stream), Launch action, embedded file, AcroForm, encrypted PDF, zero-page PDF; PNG header claiming 60000×60000 (rejected in <1 ms, before decoding).
Sizing (NR, real Tomcat): file > 5 MiB → **413**; +7 MiB → 413; ≈12 MiB body → connection reset (beyond the bounded drain, as documented); non-multipart → 415; missing part / malformed multipart → 400; unauthenticated → 401.
Fuzzing (NR): 1,600 randomly mutated/truncated PDF, PNG, JPEG and GIF files → only `accepted` or `BadRequestException`; **no unexpected exception type escaped** (WebP not fuzzed).
Cloudinary options (NR, mocked): `folder` from JWT uid, `use_filename=false`, `unique_filename=true`, `overwrite=false`, `allowed_formats`, no `filename_override`. Cross-user attach of another user's asset → 400.
Not possible to test here: PDFBox decompression bombs inside object streams, real-provider behaviour (LV). Limitation: this is content *validation*, not malware scanning, and image/PDF polyglots with a valid primary format will pass (delivered from Cloudinary's origin, not the app's).
Legitimate-file impact: see V-003.

## 8. JWT revocation design assessment

Design: `cv` = Base64url(HMAC-SHA256(signing key, `"uptrack-credential-v1:" + storedBcryptHash`)), verified in constant time (`MessageDigest.isEqual`) after signature, `exp`, mandatory `iat`, not-future `iat`, and a ≤3600 s lifetime check.

NR results: valid → 200; correct-signature token missing `cv` → 401; wrong `cv` → 401; user A's `cv` with user B's `uid` → 401; future `iat` (+120 s) → 401; missing `iat` / `exp` → 401; lifetime 3601 s → 401, 3600 s → 200; expired → 401; tampered payload → 401; `alg:none` → 401; **password change within the same second** → old token 401 and a fresh login token 200; two successive changes each revoke the prior token; other users unaffected; profile update keeps the session valid; deleted user → 401; concurrent profile update + password change → both succeed and the new password remains the only valid one.

Assessment: **secure, deterministic, and no simpler design is needed.** The salted hash changes on any password write, avoiding timestamp-resolution races; the hash never leaves the server; a read-only database leak cannot forge markers without the signing key. Trade-offs, all acceptable: coupling to the stored hash (a future hash-upgrade/rehash will log everyone out); signing-key rotation revokes everything (desirable); one extra user lookup per request (V-005). A `tokenVersion` column would be marginally clearer but requires a schema change and is not warranted.

Rollout: tokens issued before S05R lack `cv` and get the same generic 401, which the React session store already handles (clears storage, shows "expired"); the focused frontend tests pass (§10). All replicas must be upgraded together, and a rollback to the old build would re-accept old tokens (rotate the signing key if rollback is unavoidable). The explicit post-password-change sign-out of the current device is implemented in `use-settings.ts`.

## 9. Error-handling and configuration assessment

NR (real HTTP): malformed JSON, null body, bad UUID, bad enum, invalid and impossible dates → 400 with one generic message; wrong content-type → 415; name 181 chars → 400 with a field message; hours 10000 and 1.001 → 400; 999.99 accepted; `renewalCycleMonths` 1201 → 400; passwords: 72 ASCII bytes and 24×3-byte characters accepted, 73 bytes and 25×3-byte characters → 400 (register, login, change); profile email collision → 409; email 181 chars → 400. No stack traces or provider/SQL text in bodies. The catch-all still returns generic 500 for genuine bugs (and now logs type and call sites only, not messages). The previously confirmed 500s from S05-007 are gone.
Startup validation: confirmed (§4, S05-005). CORS `allowCredentials=false` (CI).
Caveat: `DataIntegrityViolationException` is uniformly mapped to 409, which could mask a genuine server-side constraint bug as a client conflict; acceptable, but monitor.

## 10. Regression and test results

| Check | Result |
|---|---|
| `./mvnw verify` on S05R commit (full backend, H2) | **132 run, 0 failures, 0 errors, 0 skipped** (16 report files; 47 cross-user cases included) — reproduces Codex's number |
| Temporary adversarial tests (≈110 checks across 5 classes, uncommitted, deleted with the worktree) | all expected outcomes confirmed except V-001/V-003 behaviours above |
| Packaged JAR + disposable PostgreSQL 18 (created and dropped) | register then `me` 200; credential create 201; password change 204; old token 401; old password 401, new password 200; 429 on the 11th login attempt; no `ERROR` log lines; DB and role removed, no process left running |
| Frontend (S05R commit) `typecheck`, `lint` | pass |
| Frontend full `vitest` | **563/563** (40 files) |
| Spring MVC guardrail (`MvcAdvisoryGuardrailTest`) | passes |
| NOT RUN | real Cloudinary; real browsers/Playwright (Codex ran focused Chromium; I did not repeat); load/DoS; hosted services; PDF object-stream decompression bombs; behind-a-proxy behaviour; Windows/macOS-specific upload MIME quirks |

**Guardrail assessment.** `MvcAdvisoryGuardrailTest` scans `src/main` text for `XsltView` or for SSE markers combined with `FragmentsRendering`/`ModelAndView`. It would catch the straightforward introduction of either vulnerable pattern and is a useful review trigger. Limits: pure string matching (comments or strings trigger it; reflection, generated code, a template-engine starter plus SSE added in separate steps, or SSE added with a differently named fragment API would not); it does not inspect dependencies in `pom.xml` for template engines; it proves absence of *those spellings*, not unreachability. Treat it as a tripwire, keep the lifecycle task to track Spring updates, and do not migrate to Spring Boot 4 on this evidence.

## 11. Deferred risks (none merge-blocking)

1. S05-003 public document delivery and historical URLs — owner decision (authenticated/signed delivery requires a migration plan).
2. S05-009 orphan cleanup (needs durable retry/outbox); S05-002 durable per-user storage quota and provider-side caps; malware scanning.
3. S05-010 CSP/HSTS/Referrer-Policy/Permissions-Policy at the host; S05-011 `ddl-auto`, non-root pinned container; S05-012 CI + branch protection; S05-013 legacy hostname.
4. Registration-enumeration UX; trusted-proxy design (V-002); edge body-size caps; shared limiter for multiple replicas.
5. V-001, V-003, V-004, V-005 as above.

## 12. Merge recommendation

**APPROVE WITH FOLLOW-UPS.**

*Merge readiness:* The security fixes are correct and well tested, no regression or contract break was found, the full suite and the frontend suite pass, the PostgreSQL smoke run passes, and the one-time re-login after rollout is expected and handled by the frontend. Merging into `main` is safe while the hosted backend remains suspended.

*Production deployment readiness:* **Not yet.** Before any public or proxied deployment: fix **V-001** (per-scope expiry/capacity), resolve **V-002** (trusted client IP or edge limiter, block direct backend access), add edge body-size caps, ship frontend and backend together with all replicas upgraded at once, and take the owner decisions in §11 (public vs signed document delivery, headers, schema/CI policy). A controlled live Cloudinary verification (S05 §6.3) is still outstanding.

No PR was merged, no repository setting changed, nothing deployed, and the S05R branch and application files were not modified.
