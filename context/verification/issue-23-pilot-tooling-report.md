# Issue #23 — final pilot-tooling preparation evidence

Date: 2026-11-05. Canonical issue: [#23](https://github.com/alexc83/uptrack/issues/23).
Dedicated tooling PR: [#58](https://github.com/alexc83/uptrack/pull/58).
Branch: `chore/23-pilot-tooling`. [Plan](../specs/issue-23-cloudinary-pilot-plan.md) ·
[Owner setup/recovery instructions](../../scripts/cloudinary-pilot/README.md).

## Authorization and baseline

The owner authorized final tooling hardening, synthetic fixtures, local Java SDK helper,
local automated checks, documentation and focused PR publication. This includes committing/pushing
this preparation to the dedicated PR. Merge and pilot execution require separate authorization.
Credential provisioning, production access, deployment and application activation remain unauthorized.

Fetched origin and verified local `main` and `origin/main` both equal Phase 3 merge
`4de3a2d02b3d1c866f42afe7a235a2ed10f2777a`; the merge is an ancestor of the tooling branch.
The starting tree was clean at existing preparation commit
`68bf33b5f3c4de498cbf7e001e2b6caa9e516126`. Existing PR #58 was reused after issue/PR deduplication.
Issue #23 stays **open, Review / P1 — High**. Issues #19, #20 and #24 are untouched.

## Preparation review findings resolved

- State was truncated before mode selection, including cleanup-only. The default journal was inside
  a disposable work directory. New JSON state is exclusively created, retained, atomically updated,
  fsynced and protected by a stable lock. Recovery validates cloud and exact run identities.
- Earlier cleanup-only returned before doing deletions. Cleanup now shares the same verified
  deletion/probe/inventory path across normal, failure, interrupted and recovery runs.
- Upload tracking happened only after a success response. It now journals before each request,
  covering ambiguous writes/timeouts. Explicit `overwrite=false`, unique UUID prefix and exact
  response validation prevent routine collisions; a reported existing asset is never deleted.
- The earlier deletion call mixed the Admin resources endpoint and uploader `result` schema.
  The runner now uses Upload `POST /<resource_type>/destroy`, explicit `type`/`invalidate`, validates
  `ok` / repeated `not found`, and probes absence for both delivery types and both resource types.
- Statuses were printed but not asserted; image-token success/public image baseline were missing.
  Both resource types now have assertions for public success, unsigned denial, pre-expiry success,
  post-expiry denial, delivery mismatch and bidirectional cross-asset ACL rejection.
- Error payloads/missing inventory fields could be misread as empty, pagination was not exhausted,
  and cleanup errors were suppressed. Any failed/malformed/incomplete cleanup or inventory now
  reports **UNRESOLVED test-cloud resources/inventory** and makes the run nonzero.
- Earlier fixtures were checked only by magic bytes. A complete one-page PDF with valid xref and a
  CRC-valid PNG are generated locally and structurally verified by the regression suite.
- Raw URL construction could duplicate the extension; the runner fixes raw identity at upload time
  and the SDK helper appends no second raw extension. Image identity and format remain separate.
- Provider error bodies and free-form headers could expose data. Only status and parsed allowlisted
  header/result values are logged. URLs, tokens, API credentials and signing keys remain private.

## SDK and provider-contract findings

The local helper compiles against the backend's existing Cloudinary SDK 2.5.0 with Java 21 bytecode.
No application dependency is added. The installed JDK is 25.0.5.

**Correction to earlier preparation evidence:** the API secret is not the token-authentication key.
Cloudinary documents a separate encryption key for token authentication. The new required variable
is `CLOUDINARY_AUTH_TOKEN_KEY` (hex). The helper uses the same SDK URL/AuthToken primitives as
UpTrack, with keyed AuthToken, `signed(true)`, and ACL pinned to the actual generated delivery URI
path (cloud + resource/delivery + SDK `/v1/` + public ID/format). Self-tests cover raw/image URL shape,
HMAC agreement, TTL/duration sensitivity, cross-asset token difference, and absence of key disclosure.

An exact local reproduction of the merged application's signer confirms it emits **no AuthToken
query parameter**. Its keying/signing and ACL construction require a separately authorized application
fix and real-signing regression tests. This preparation does not modify backend source or its flag.
**Corrected helper output is not proof of application parity or live provider authorization.**

Contract sources read during preparation:

- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference): Basic Auth
  and resource-specific upload/destroy contracts; raw public IDs include their extension.
- [Cloudinary access control](https://cloudinary.com/documentation/control_access_to_media): separate
  token-authentication key and delivery-path ACL.
- [Cloudinary Admin API](https://cloudinary.com/documentation/admin_api): resource probes and paginated
  prefix inventory. Inventory errors are not absence evidence.
- Public Orbit discovery/integration brief for upload/destroy, checked against the primary docs. Its
  brief focused on signature authentication; primary docs explicitly also support Basic Auth.

No provider account endpoint was contacted. Documentation/discovery requests are not pilot execution.
Postman API engineering/discovery/simulation guidance was consulted. Local CLI `postman --version`
reported 1.76.0, but `postman status` returned exit 1, `unknown command 'status'`, both before and after
work. No Postman workspace was initialized/published and no Postman simulation result is claimed.
The narrow Python in-memory provider double plus serialization checks were sufficient for local
orchestration assertions; real HTTP/CDN/provider semantics remain unverified.

## Local verification

| Check | Result |
|---|---|
| `./scripts/cloudinary-pilot/test-tooling.sh` | PASS, 20 tests, exit 0; public dummy vectors only |
| Real SDK compile/self-test and offline preflight | PASS within the regression suite; `javac --release 21`, Maven `-o`; no provider transport constructed |
| Bash syntax: `bash -n scripts/cloudinary-pilot/run-pilot.sh scripts/cloudinary-pilot/test-tooling.sh` | PASS, exit 0 |
| `git diff --check` | PASS, exit 0 |
| Required GitHub checks (`backend`, `backend-postgres`, `frontend`, `e2e-chromium`) | Reported against the final PR head in PR/issue handoff; not inferred from local tests |
| Application/frontend full regression, four-browser/visual tests, live-backend acceptance | NOT RUN for this scripts/docs-only change; owner-run policy applies |
| Live Cloudinary upload/delivery/cleanup | NOT RUN; unauthorized |

The 20 tests cover all required preflight fields, mismatch/invalid config, no transport/signing on
failed preflight, valid PDF xref/PNG CRC, the complete mocked matrix and redaction, partial/interrupted
uploads, cleanup-only exit codes, state retention/non-truncation, lock contention, symlink/permissions,
wrong-cloud/exact-target validation, collision handling, failed cleanup, malformed JSON/result schemas,
pagination/repeated cursors, unexpected status, forbidden redirects/origins and actual HTTP request
serialization without opening a socket. Python socket connections are denied throughout the suite;
Maven runs offline and Java SDK operations perform local signing only.

During implementation, tests first exposed a provider-double response-order error and two SDK
self-test expectation errors (`/v1/` insertion and URL-decoded vs encoded ACL comparison). These were
corrected without weakening matrix assertions. The final suite passed after those corrections.
No screenshot baselines were generated and no existing application tests were changed.

## Remaining owner decisions and manual work

Review/accept and separately authorize merging PR #58. Separately authorize test-cloud setup and
pilot execution; verify console identity, API scope and token-auth key entitlement, and supply the
six required variables through the owner's secret manager. See the README for exact variables,
optional ranges, offline preflight and private durable recovery state setup.

After authorized execution, browser PDF preview/download, authenticated image transformations,
CDN token cache separation/invalidation, exact TTL/skew boundary, historical URL/type-change behavior,
byte/identity preservation, rate limits/volume pagination and SDK 2.6.0 parity remain manual.
Application owner/non-owner/report/download acceptance and rollout/rollback require separate work;
the merged signer defect blocks authenticated-delivery activation. Failed cleanup remains unresolved
test-cloud work and must never be recorded as success.

**No Cloudinary API calls were made. No credentials were provisioned, no production access occurred,
nothing was deployed, and authenticated delivery remains disabled. Stop before merge or execution.**
