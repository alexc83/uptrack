# Issue #23 — backend AuthToken signing correction

Date: 2026-11-05. Canonical [Issue #23](https://github.com/alexc83/uptrack/issues/23).
Branch: `fix/23-cloudinary-authtoken-signing`, from main
`63d736d9a861d976381078bf8b1b0ef273ff6d22` (pilot tooling PR #58).
[Accepted correction plan](https://github.com/alexc83/uptrack/issues/23#issuecomment-6662056757) ·
[Spec](../specs/issue-23-authenticated-delivery.md) ·
[Pilot setup/manual matrix](../../scripts/cloudinary-pilot/README.md).

## Authorization and scope

Owner authorization covers backend configuration/signing, offline tests, documentation, tracking,
commits/push and a dedicated PR. It does **not** authorize merge, deployment, credential provisioning,
Cloudinary account access/live pilot, authenticated-delivery activation or Phase 4. No frontend,
API/DB schema, upload/cleanup identity or SDK dependency change is included. Issue #23 remains open
Review / P1; no duplicate signing tracker/PR existed before this work.

## Root cause and correction

The prior application signer created an **unkeyed** AuthToken and omitted `signed(true)`. Its ACL
was hand-assembled without the cloud/SDK version/format path. The pilot helper's offline baseline
reproduction confirms that construction emits no token query parameter. Existing application tests
mocked `Url.generate`, so they could not detect invalid/missing signing.

`CloudinaryAuthTokenProperties` now binds `cloudinary.auth-token.key` from
`${CLOUDINARY_AUTH_TOKEN_KEY:}`. This is a **separate token-authentication key**, never the API secret.
When delivery is ON, startup validates 16–64 bytes of hex (32–128 hex characters, even length).
Missing, blank, nonhex, odd or out-of-range values fail with a fixed sanitized message. Validation is
performed **after binding**, avoiding rejected-value echo in binding/Bean Validation diagnostics.
Flag OFF preserves startup without a key. The property type redacts `toString`; Jackson ignores the
key. It is not installed as a global SDK token on the Upload/Admin client. No Actuator dependency or
configuration endpoint is added; do not enable environment/configuration-value dumps.

After the existing gate/ownership/asset-state/delivery-type checks, issuance captures one epoch-second
expiry for **both** AuthToken and response `expiresAt`. The actual Cloudinary SDK generates the
intended delivery URL; `URI.getRawPath()` supplies the complete exact ACL, including cloud, SDK `/v1/`
when inserted, resource/type, public ID encoding and format. A keyed AuthToken with that expiry/ACL
and `signed(true)` generates the final URL; its path must remain equal. Runtime signing exceptions
are discarded in favor of the existing generic error with no sensitive cause, log or public fallback.

Raw format is added only when the matching extension is not already present case-insensitively.
Images keep original delivery with no forced PNG conversion or transformation. Stored public IDs,
registry fields and provider cleanup/probe behavior are unchanged. Unsupported raw format metadata
fails generically. The default `CERTIFICATE_DELIVERY_ENABLED=false` remains unchanged.

SDK evidence: merged `AuthTokenUrlTool.java`, the installed cloudinary-core **2.5.0** bytecode, and
upstream [AuthToken source](https://github.com/cloudinary/cloudinary_java/blob/master/cloudinary-core/src/main/java/com/cloudinary/AuthToken.java)
and [SDK tests](https://github.com/cloudinary/cloudinary_java/blob/master/cloudinary-core/src/test/java/com/cloudinary/AuthTokenTest.java).
The relevant source behavior (hex key decoding, HMAC-SHA256, escaped ACL and explicit expiration)
was cross-checked with the installed JAR; no master-branch version assumption replaces local tests.
Production code delegates cryptography to the existing SDK; independent HMAC recomputation exists
only in the regression test. No dependency was added/upgraded.

## Real-SDK and security evidence

`CertificateDeliverySigningTest` uses an actual Cloudinary/Url builder with public synthetic key
material. It forbids uploader/Admin client access, issues through the actual service and checks:

- Exactly one AuthToken parameter; SDK fixed-expiry agreement and an independently recomputed
  HMAC-SHA256 over the encoded fields using test-only `javax.crypto.Mac`.
- Decoded token ACL equals the actual URI raw path; token expiry exactly equals API `expiresAt`.
- Raw PDF path, extension-bearing/mixed-case IDs, encoded folder names and no duplicate extension.
- Original JPG/PNG/WebP/GIF image paths without forced format/transform.
- Configurable lifetime (including backend 1/3600-second boundaries), distinct identities and keys.
- No key/API-secret in generated URLs; no key/full URL/token in captured success/failure logs;
  generic signing failure with no sensitive cause/public fallback.

`CloudinaryAuthTokenPropertiesTest` starts actual configuration/service beans with mocked repositories:
flag OFF without key starts; ON without/with invalid key fails; minimum/maximum and uppercase valid
keys bind; the global SDK auth token remains unset; exception stacks/logs are redacted; configuration
JSON does not serialize the key. Invalid-input tests preserve exact whitespace via a property source.
Only documented synthetic vectors are in tests; no real key or provider token is committed/logged.

All eight existing service security tests remain, with constructor wiring and corrected ACL/options
assertions updated. Existing endpoint ownership, unauthenticated/state/type, default-off, managed-URL
suppression, public/legacy compatibility and no-fallback integration tests are preserved.

## Commands and results

| Command / environment | Result |
|---|---|
| `./mvnw -o -B -ntp -Dtest=CloudinaryAuthTokenPropertiesTest,CertificateDeliverySigningTest,CertificateDeliveryServiceImplTest test` | PASS: 18 tests, exit 0 |
| `./mvnw -o -B -ntp clean verify` (backend; installed JDK 25.0.5, Java 21 target; H2) | PASS: 262 tests, 0 failures/errors/skips; package + JaCoCo report, exit 0 |
| PostgreSQL integration | Required `backend-postgres` CI job runs the full suite on disposable PostgreSQL 17; final-head result recorded on PR/Issue #23. No local Docker installation; no shared/production DB used |
| `npm run typecheck` (frontend-react) | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm run test -- --run` | PASS: 600 tests / 43 files, exit 0 |
| `npm run build` | PASS, exit 0; existing bundle-size advisory |
| `E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium` | PASS: 146/146 on final full rerun, exit 0; all requests mocked; no screenshot baselines regenerated |
| `./scripts/cloudinary-pilot/test-tooling.sh` | PASS: 20 offline tests, exit 0; no live transport |
| `git diff --check` and documentation relative links | PASS |
| Required final-head CI | `backend`, `backend-postgres`, `frontend`, `e2e-chromium`: exact results/links recorded in PR and Issue #23; never inferred from local results |

Earlier attempts retained as evidence: non-clean full Maven discovery failed (exit 1, zero tests)
because generated target classes contained `TestDatabaseConfigurationTest 2`; clean verify resolved
it. An initial diagnostic test incorrectly treated short input `00` occurring in stack line numbers
as disclosure; it was corrected to check the sanitized root cause and absence of distinctive/key-sized
vectors from all diagnostics. Actual real-SDK signing tests passed on the first targeted run.

The sandbox initially prevented Vite from binding its local port (exit 1, no E2E tests). The authorized
run outside that sandbox then passed 145/146 tests with one unchanged nested-drawer focus assertion
failure at `e2e/shared-ui.spec.ts:84`. Its exact diagnostic rerun passed 1/1. A single full Chromium
rerun followed to establish the final result; no frontend source, assertion or baseline was changed.
Postman CLI 1.76.0 still rejects `postman status` as unknown; no Postman workspace/simulation claim
is made. All Cloudinary operations are mocks or local SDK signing; source research used public GitHub.

## Pilot compatibility and remaining uncertainties

These tests establish **offline signing correctness**, not live Cloudinary authorization. A valid
hex key may still belong to the wrong account or entitlement; startup cannot establish provider fit.
Correction merge and owner acceptance remain required, followed by separately authorized test-cloud
setup and execution. Keep delivery OFF.

The pilot/helper and application must use the same dedicated test-cloud token key and equivalent
resource/format settings. The helper explicitly selects PNG for its fixture; the application delivers
original images. Compare semantics under equivalent options rather than assuming identical strings.
The helper's historical baseline-defect self-test is intentional and stays unchanged.

Raw provider identity remains an explicit live gate: pilot raw public IDs already include `.pdf`,
while the current application registry can store extensionless IDs and preserve its filename-format
URL policy. Verify actual synthetic provider identity/path correspondence without silently rewriting
stored IDs or changing upload/cleanup contracts. Any resulting upload/registry work needs separate scope.

The future authorized pilot must verify valid-token retrieval, unsigned/expired/cross-asset denial,
actual TTL/skew, PDF headers/preview/download, original images/transformations, CDN token cache keying
and invalidation, historical URL/type-change behavior, provider deletion/probe semantics/rate limits,
SDK 2.6.0 parity, and application owner/non-owner/report/download flows. Mocks cannot answer these.

Only after separate setup approval: independently verify the dedicated non-production account and
entitlement/key in the console; inject test API credentials and **separate** `CLOUDINARY_AUTH_TOKEN_KEY`
via the owner secret manager. The pilot additionally requires `PILOT_CONFIRM_NONPRODUCTION=yes`,
matching `CLOUDINARY_CLOUD_NAME` / `PILOT_EXPECTED_CLOUD_NAME`, and a fresh private durable recovery
journal. No credentials in GitHub, tests, logs or source; no production values. Provisioning, pilot,
deployment, activation and Phase 4 have not occurred and remain unauthorized.
