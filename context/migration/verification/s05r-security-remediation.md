# S05R — Application security remediation

Status: **Implemented, locally verified and pushed; not deployed or merged. Draft PR creation is blocked by cloud network access to api.github.com.** Date: 2026-11-03.

## Executive summary and baseline

S05 audit PR #15 is merged: latest main at branch creation was **`75d6eecf035920b89b2f57a7a89ca34c580d0b42`**, whose subject is “Merge pull request #15 from alexc83/audit/s05-comprehensive-security”. Implementation is based on that commit on **`fix/s05r-security-remediation`**, not on an unmerged audit branch. The GitHub GraphQL lookup was blocked by the cloud proxy; merge status was independently established from fetched main's history and the report's presence there.

The owner's S05R brief authorizes implementation, complete relevant verification, focused commits, normal push and a draft PR. No production service or real Cloudinary account was contacted. Angular, dependency lockfiles, repository rulesets and main history are unchanged.

S05-001/004/005/007 are addressed. S05-002's validation, request sizing and per-user request rate are addressed; durable storage quotas and provider-account caps remain deployment work. Documents remain public. Full backend verification passed, as did frontend checks and focused Chromium browser tests.

## Finding-to-fix matrix

Severity and scope below follow the original S05 report; no P0/P1 is invented.

| Finding | Original severity | Result | Implementation / remaining decision |
|---|---|---|---|
| S05-001 authentication abuse | P2 | Fixed for a single instance | IP login/registration windows before BCrypt, bounded memory, 429 + Retry-After; shared gateway enforcement required for multiple replicas. |
| S05-002 upload validation/storage abuse | P2 | Core fixed; storage controls partial | 5 MiB file/6 MiB request caps, matching MIME/extension, parsed PDF/image content, active-PDF rejection, per-user 20/hour cap, provider allowed_formats. Durable byte/count quotas, malware scanning and Cloudinary account limits remain follow-ups. |
| S05-003 public documents | P2 | Filename exposure reduced; privacy deferred | New uploads use random public IDs without original filename overrides. Public delivery is preserved. Owner must choose whether to migrate to authenticated delivery. Existing URLs/assets are unchanged. |
| S05-004 token lifecycle | P2 | Fixed | 1–3600 second lifetime, required iat/exp, issuance/lifetime checks, signed credential marker checked against current password hash, password-change revocation. LocalStorage and client-only logout remain explicit tradeoffs. |
| S05-005 startup secret validation | P3 | Fixed | Blank/<32 UTF-8 byte secrets and invalid lifetimes fail during property binding/startup, not first token use. Length validation cannot establish entropy; use a generated secret. |
| S05-006 account enumeration | P3 | Partially fixed | Unknown email performs one dummy BCrypt match, known email one real match. Duplicate-registration UX still reveals existence; changing that needs email-verification/product design. No timing-indistinguishability claim. |
| S05-007 client errors | P3 | Fixed for documented cases | 400 malformed JSON/UUID/enum/date/multipart, 415 unsupported media, 413 oversized upload, 409 stored-data conflict, storage-aligned DTO limits, 72-byte passwords. Unexpected exceptions retain generic 500. |
| S05-008 certificate metadata | P3 | Partially fixed | New writes reject non-HTTP(S)/credential-bearing URLs and noncanonical owned public IDs (including traversal/encoding/subfolders). Historical HTTP(S) link-only certificates are preserved. Cloudinary-host restriction, URL/publicId binding and historical-data migration are deferred together. |
| S05-009 orphans/cleanup coupling | P3 | Deferred | Credential cascade and unattached upload orphans remain; existing synchronous CE delete/replace semantics are preserved. Reliable after-commit cleanup needs durable retries/outbox and reconciliation, not a silent best-effort deletion that can lose privacy work. |
| S05-010 browser headers | P3 | Deferred to host | Production SPA/TLS host is not configured here. Owner must set/test CSP, HSTS, Referrer-Policy and Permissions-Policy at that host; no deployment performed. Existing noreferrer links remain. |
| S05-011 production defaults/container | P3 | Partially fixed | Credentialed CORS disabled for Bearer auth. Schema migration strategy, ddl-auto production profile, non-root pinned container and CI build gate remain deployment/lifecycle work. |
| S05-012 CI/rulesets/supply chain | P3 | Deferred | No ruleset changes or unrelated CI redesign. Owner should authorize required checks, dependency scanning and least-privilege CI. |
| S05-013 legacy hostname | P3 informational | Deferred | Retired Angular is unchanged, as requested. Handle hostname removal with host retirement. |
| Two Spring MVC advisories | Latent / not currently reachable | Guardrail added | Source check triggers review for XsltView/Resolver or SSE plus fragment/view rendering; no Boot 4 migration. |

## Implementation details

### Request limits and proxy identity

`RequestRateLimiter` uses synchronized fixed windows with at most 10,000 keys; it fails closed on capacity rather than evicting an active limit. Defaults:

- Login: **10 requests / 60 seconds / direct client IP**.
- Registration: **5 requests / hour / direct client IP**.
- Certificate upload: **20 requests / hour / authenticated user ID**, independent of that user's IP.

Successful and failed attempts consume capacity. No account is permanently locked and login/registration buckets are separate. Filters run before controllers/password work; upload rate checks precede multipart parsing. HTTP 429 is a normal structured ErrorResponse with Retry-After. The React dialog displays the safe server message, keeps inputs and does not automatically retry.

`server.forward-headers-strategy: none` deliberately ignores attacker-supplied Forwarded/X-Forwarded-For values. If a proxy is in front, all clients may share that proxy's application bucket: enforce edge limits there, prevent direct backend access, and configure a vetted trusted-proxy integration before using forwarded identities. Do not simply switch to trusting arbitrary headers.

Limits can be tuned with `app.rate-limit.login-per-minute`, `registration-per-hour` and `upload-per-hour`. Values must be positive. In-memory windows reset on restart and are per replica; they are not a distributed limiter or persistent quota. Fixed-window boundaries permit short bursts. NAT users share an IP allowance; capacity exhaustion can deny legitimate requests until expiry. A shared edge limiter is a prerequisite for public multi-instance operation. Shared test fixtures use high limits, while dedicated unit/filter and real HTTP tests exercise small/production limits and recovery.

### Certificate content and sizes

`CertificateFileValidator` reads at most 5 MiB + 1 byte regardless of a part's declared size. Extension and declared MIME must agree. PDFBox **3.0.8** parses PDFs, including compressed objects and escaped names; reject encryption, no pages, missing PDF envelope, JavaScript/open/additional actions, forms/XFA, embedded files and rich-media/executable actions. These are conservative plain-certificate rules: interactive/forms PDFs, including PDFs with signature form fields, must be flattened/exported to a simple PDF before uploading. This is content validation, not an antivirus or sandbox.

ImageIO, with TwelveMonkeys WebP **3.15.3**, verifies format and decodes every frame. Bound images to 100 frames and 25 million total decoded pixels; bound PDF object traversal to depth 100 / 100,000 visited objects. PNG, JPEG (jpg/jpeg), GIF, WebP and ordinary PDF remain supported. SVG/HTML/executables and mismatched/malformed data are rejected. PDFBox and WebP versions were selected from official Maven Central metadata; Spring's logging bridge replaces PDFBox's redundant commons-logging dependency.

Spring multipart caps are **5 MiB/file and 6 MiB/request**; Tomcat drains up to **8 MiB** to deliver a usable 413 for ordinary oversized requests. Bodies beyond this bounded drain may result in a connection close; a public edge must reject huge bodies before forwarding. The first real HTTP test exposed Tomcat's default 2 MiB swallow-induced broken pipe; the bounded setting fixed both tested 5 MiB+1 and 7 MiB cases.

Uploads still use public `upload` delivery. Options set `use_filename=false`, omit filename_override and retain unique_filename/overwrite=false. Original filenames remain owner-visible metadata only. Provider formats are restricted through upload options, not by accessing account settings. Failure logs omit user IDs, asset IDs and provider exception messages. External provider work was mocked in every test.

### JWT revocation and session compatibility

New tokens include `cv`, an HMAC-SHA256 marker over a domain-separated current stored BCrypt hash using the server signing key. The password hash itself is never in a JWT. After signature/expiry verification, required iat/exp and maximum lifetime checks, load the user and compare this marker in constant time. Missing/deleted users, old markers and legacy tokens without cv get the same protected-endpoint 401. Current user name/email come from the stored row.

Changing a password changes its salted BCrypt hash and therefore invalidates all older tokens immediately on subsequent requests. Generation after changing the password/login works even within the same second; no timestamp rounding race. No blacklist, refresh service, token-version column or schema migration is required. Profile updates write only profile columns; password replacement uses a conditional atomic update against the previously checked hash. This prevents a concurrent stale profile save from restoring an older password hash.

**Rollout is intentionally session-breaking:** all tokens issued before S05R lack cv and require re-login once. Coordinate application rollout across all replicas and prevent routing to old replicas, which cannot enforce credential markers. Existing frontend protected-401 handling clears old storage and requests login. Password change now proactively clears only the initiating current React session; the dialog warns that all devices must sign in again. Other devices discover revocation on their next request. Already-running requests may complete; rollback to the old backend would remove this protection and can reaccept old tokens—rotate the signing key if rollback is unavoidable. Key rotation and password rehash also invalidate sessions. There is no automatic refresh; access lifetime is at most one hour. Read from an authoritative database, not a lagging read replica.

### Input validation and error handling

Credential name/issuing organization: max 180 characters; renewal cycle: 1–1200 months; credential and CE hour decimals: three integer/two fractional digits, matching existing decimal(5,2) storage and existing nonnegative/positive rules. Registration/login/change-current/change-new passwords: max **72 UTF-8 bytes**, not 72 characters; newly set passwords retain minimum eight characters. React mirrors byte limits with TextEncoder, including multibyte tests. Existing impossible-to-BCrypt oversized passwords are rejected safely rather than prehashed or silently truncated.

Exception mappings target known framework/client/data exceptions. The catch-all still returns generic 500 for genuine bugs and logs exception type/call sites without exception messages, cause values or request bodies. No assertions were weakened: the old upload success/provider-failure fixtures now use real generated PDF/PNG content instead of fake byte strings, and password-change UI assertions reflect the explicitly authorized revocation behavior.

### Spring MVC guardrail

Independently inspected production controllers/configuration: REST DTO responses, no XsltView/Resolver, SSE, fragments or view-returning controller paths. `MvcAdvisoryGuardrailTest` scans production Java/resources for XsltView references or the combination of SSE and view/fragment types. It does not ban unrelated MVC features or claim every SSE endpoint is vulnerable. It is a lightweight review trigger, not a reachability proof: reflection, generated code or new alternate configuration require independent review. Both GHSA-j9f9-w8pj-32f8 and GHSA-pc63-qcmh-9cmg still require lifecycle tracking; Boot major versions were not changed.

## Cloudinary privacy design requiring an owner decision

Current risk: anyone with an existing certificate URL can retrieve it without application authorization; existing URLs may include personal filenames. Randomizing new filenames does not protect document confidentiality.

Proposed design: store asset identity and delivery type; a backend certificate-download endpoint checks CE/credential ownership and returns a very short-lived Cloudinary authenticated/signed delivery URL (or streams through an authorized endpoint). Return 404 for non-owners. Do not put permanent public links into print/export payloads.

Migration would require: inventory all referenced and unattached assets in a controlled test account first; back up metadata; decide whether historical sharing links must stop working; map/copy existing image/raw assets to authenticated delivery; update stored metadata and React downloads/reports; verify expiry and owner isolation; disable/delete/invalidate old public assets/URLs only after owner-approved migration and rollback testing. Previously downloaded/shared copies cannot be revoked. A non-production account and explicit owner authorization are required before any live asset work. No existing asset or document URL was changed here.

S05-009 should be designed alongside this migration: a durable after-commit cleanup job/outbox, retry visibility and a folder/reference reconciliation policy for never-attached uploads. Preserve current user-visible CE cleanup error behavior until the replacement can reliably retry. Blindly swallowing provider failures would hide retained documents; deleting remotely before a database transaction commits also has rollback/partial-failure hazards.

## Verification

All tests use synthetic accounts and mocked Cloudinary. No production credentials or hosted backend were used.

| Check | Result |
|---|---|
| Full backend `./mvnw ... verify` from backend/ | **132 passed, 0 failures/errors/skipped**, compilation and executable JAR packaging passed. Includes all **47** cross-user cases and all existing tests. |
| New real HTTP multipart/rate assertions | Passed with actual embedded Tomcat: 413 at file/request limits, malformed multipart 400, login and registration 429 + Retry-After. Automatic Apache test-client retries were disabled to observe the original 429. |
| JWT/config/work-factor tests | Valid/expired/tampered/excessive/missing/future claims, legacy rejection, pre-/post-password-change tokens, valid/invalid startup settings, real/dummy password verification all passed. |
| Upload/metadata tests | Plain PDF and all supported raster formats; malformed/empty/oversized/mismatched/active PDF content; noncanonical IDs and unsafe URL schemes; provider options/failure behavior passed. No real Cloudinary calls. |
| Frontend `npm run typecheck`, `npm run lint` | Passed. |
| Frontend full `npm run test` | **556/556 passed** after implementation. After adding seven extra byte-limit/429 cases, affected four files reran: **63/63 passed** (current total 563; not a second full-suite run). |
| Frontend `npm run build` | Passed; existing bundle-size/Zod annotation warnings remain. Existing React test act warnings remain. |
| Focused Playwright settings on system Chromium 154/Linux | **3/3 passed**, including profile update and password-change validation/error/sign-out; no visual goldens changed. |
| New browser 429 login scenario on system Chromium | **1/1 passed**. Inputs preserved, no token stored, one attempt, error visible. |
| Packaged JAR + new isolated PostgreSQL database | Passed registration, valid token, password change, old-token 401, new-password login, owner-scoped credentials and old-password rejection. No schema migration needed. |
| `git diff --check` | Passed. |

Environment-specific Maven flags: `JAVA_HOME=/workspace/.local/jdk/usr/lib/jvm/java-21-openjdk-amd64`, `MAVEN_USER_HOME=/workspace/.cache/maven`, `-s /workspace/.cache/maven/settings.xml -Dmaven.repo.local=/workspace/.cache/m2`. The settings file retains the managed proxy with TLS verification enabled.

Browser commands used an ignored `frontend-react/test-results/s05r.playwright.config.ts` override of the existing config with `executablePath=/usr/bin/chromium`; settings.spec.ts and auth.spec.ts filtered to “rate-limited login”. Bundled Chromium's download was denied at cdn.playwright.dev; installed system Chromium was used successfully instead. Firefox, WebKit, branded Chrome/Edge, full browser regression and macOS screenshot parity are **NOT RUN**. Real Cloudinary, hosted environments, load tests, AV checks and private-delivery verification are **NOT RUN**.

Earlier failed checks were investigated, not hidden: the first full backend run had 120 passing and one HTTP test error due to Tomcat's drain limit; the targeted rerun initially still used the old config, then the corrected HTTP/parser run passed 10/10 and final full verify passed 132/132. Initial test-client 429 auto-retry waiting was interrupted and replaced by non-retrying HTTP assertions. There are no unresolved test failures.

## Residual risks and independent follow-up

Review the credential-marker/rollout choice, fixed-window thresholds and conservative PDF restrictions independently before release. No schema changes are required, but deployment config must use a generated ≥32-byte secret, JWT expiration 1–3600 and a coordinated all-replica rollout. Frontend/backend changes should ship together; keep the hosted backend suspended until separately approved.

Outstanding owner decisions: public vs authenticated delivery and historical migration; durable orphan cleanup/quota/retry policy; registration-enumeration UX; trusted edge proxy/rate limits/body caps; production schema-migration policy; SPA headers; CI/rulesets and supported Spring lifecycle. A separate controlled non-production Cloudinary verification should exercise genuine PDF/raster upload, provider options, public access and deletion semantics. None of these external decisions was silently implemented.

## Git publication and remaining external blocker

Focused commits: `a17dc0f` (backend security and regressions), `89f7740` (React handling and regressions), `bf17a9e` (verification/rollout documentation), followed by this publication handoff update. All use `alexc83 <alexc83@users.noreply.github.com>` with no AI attribution. The feature branch was pushed normally; remote HEAD was verified equal to local HEAD. Main was not changed or merged.

`gh pr create --repo alexc83/uptrack --base main --head fix/s05r-security-remediation --draft ...` returned `Post "https://api.github.com/graphql": Forbidden`. A public API probe also failed at the proxy's CONNECT boundary with HTTP 403. Git HTTPS read/push succeeded, so this is not evidence that a Git token is missing. The current restricted domain policy does not include api.github.com.

An additive allowlist draft save for **api.github.com** was attempted while preserving all existing custom rules/presets, but the configuration tool returned **draft_not_editable** (published/publishing draft), so **no network update was confirmed or applied**. The owner can enable that domain in cloud environment settings, then resume PR creation; API permission must be rechecked afterward. No secret value is requested. Alternatively, open the prepared branch's GitHub compare view and manually create a **draft**, using [the prepared PR description](s05r-pull-request.md). No PR URL/number is claimed.

Compare/create view: https://github.com/alexc83/uptrack/compare/main...fix/s05r-security-remediation
