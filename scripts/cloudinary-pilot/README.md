# Issue #23 — non-production Cloudinary pilot tooling

[Plan](../../context/specs/issue-23-cloudinary-pilot-plan.md) ·
[Preparation evidence](../../context/verification/issue-23-pilot-tooling-report.md) ·
[PR #58](https://github.com/alexc83/uptrack/pull/58).
**Preparation only: merging this PR and executing the pilot each require separate owner authorization.**
No Cloudinary API calls have been made. No credentials were provisioned; no feature flag was enabled.

## Files and prerequisites

- `run-pilot.sh`: Bash launcher, disables tracing and applies `umask 077`.
- `pilot.py`: Python standard-library orchestration, bounded HTTP evidence, durable cleanup journal.
- `AuthTokenUrlTool.java`: local URL/AuthToken signing using the backend's existing Cloudinary SDK
  (currently `cloudinary-http5` / `cloudinary-core` 2.5.0), plus offline self-tests.
- `test-tooling.sh`, `test_pilot.py`: offline regression checks. Provider double responses establish
  orchestration behavior only; they cannot demonstrate live provider authorization.

Requires Bash, Python **3.9+**, JDK **21+**, and the backend Maven wrapper's cached dependencies/plugin.
The helper is compiled with `javac --release 21`; `./mvnw -o -q dependency:build-classpath` is offline.
If the cache is missing, stop and prepare it separately through the ordinary backend build process.
No new application dependency or API/DB contract is introduced. Java 25.0.5 was installed locally;
the helper targets Java 21. Tests do not use real credentials.

## Required environment (only after separate setup/execution approval)

| Variable | Requirement |
|---|---|
| `PILOT_CONFIRM_NONPRODUCTION` | exactly `yes` |
| `CLOUDINARY_CLOUD_NAME` | dedicated test cloud identity, letters/digits/underscore/hyphen only |
| `PILOT_EXPECTED_CLOUD_NAME` | separately enter the same test cloud name; exact, case-sensitive match |
| `CLOUDINARY_API_KEY` | test-cloud API key, from owner secret manager |
| `CLOUDINARY_API_SECRET` | test-cloud API secret, from owner secret manager |
| `CLOUDINARY_AUTH_TOKEN_KEY` | **separate Cloudinary token-authentication key**, 16–64 bytes encoded as hex |

The token key is the encryption key supplied/configured for Cloudinary token-based authentication;
**do not substitute the API secret**. Verify the test account's entitlement and key requirements with
Cloudinary. See [provider access-control documentation](https://cloudinary.com/documentation/control_access_to_media).

Name equality alone does **not** establish that the cloud is non-production. The owner must verify
its identity, account/sub-account, enabled features and credential scope in the Cloudinary console.
No production cloud names, real credentials or signing keys are stored in these tools.

| Optional variable | Default / constraints |
|---|---|
| `PILOT_TTL_SECONDS` | `60`, integer 2–3600; very short TTLs may expire before the matrix reaches the fetch |
| `PILOT_EXPIRY_SKEW_SECONDS` | `15`, integer 0–300; additional wait, not a claim about provider skew tolerance |
| `PILOT_PREFIX` | `pilot`; may use `pilot/` subpaths consisting of letters/digits/underscore/hyphen |
| `PILOT_STATE_FILE` | fresh `/tmp/uptrack-pilot-<UUID>.json`; recommend an absolute new path in an owner-only durable directory |
| `PILOT_PREFLIGHT_ONLY` | `no`; exactly `yes` performs only configuration/SDK/fixture checks, no provider I/O |

Empty/malformed values fail before provider calls. Credentials and tokens are never passed as
process arguments. Do not invoke with tracing or log the environment. Do not publish a helper's
stdout: normal helper stdout is the sensitive token URL, captured privately by the runner.

## Owner setup and execution sequence

1. Review/accept this tooling PR; authorize its merge separately. Keep Issue #23 open, Review / P1.
2. Separately authorize non-production account/key setup and pilot execution. Those actions are
   **not yet authorized**. No deployment, production access or application activation is implied.
3. In the console, independently identify the dedicated test cloud; confirm API Upload/Admin
   read/write/destroy permissions and token-based authentication entitlement/key. Record the
   authenticated-delivery/private-CDN settings without copying any secret.
4. Supply all six required variables through the owner's secret manager into a clean local shell.
   Use synthetic assets only; never reuse production credentials. Set `PILOT_STATE_FILE` to an
   **absent** file in a trusted private directory. Keep the journal and its `.lock` sidecar local.
5. Run `PILOT_PREFLIGHT_ONLY=yes ./scripts/cloudinary-pilot/run-pilot.sh`. This is offline, but its
   success establishes configuration/SDK readiness only. Then, **only if execution is authorized**,
   run `./scripts/cloudinary-pilot/run-pilot.sh` with `PILOT_PREFLIGHT_ONLY` unset or `no`.
6. Review every status and the final cleanup result. Exit 0 means the automated assertions and
   cleanup passed; manual acceptance remains pending. Exit 1 means a matrix/cleanup failure;
   exit 2 means configuration/state/local-tooling failure. Any unresolved resource blocks acceptance.

For local development without credentials, run `./scripts/cloudinary-pilot/test-tooling.sh`.
It supplies public dummy vectors itself, denies Python socket connections, and never runs the live mode
with a real transport. SDK self-test uses local signing only; Maven runs offline.

## Automated matrix and safe evidence

The runner allocates an unpredictable UUID child prefix (`pilot/<UUID>/` by default), verifies
that prefix is empty, and uploads four locally generated fixtures: raw PDF and image PNG for
both `upload` and `authenticated`. Raw public IDs include `.pdf`; image IDs exclude `.png`.
Uploads use `overwrite=false`; returned identity/type must match exactly. A reported pre-existing
asset is excluded from cleanup and causes failure plus unresolved inventory reporting.

Assertions cover public 200 + expected content type, delivery-type mismatch denial, unsigned
authenticated denial, token success for **both** resource types, cross-asset ACL denial in both
directions, then denial after each URL's TTL plus configured wait. Expected denial is limited to
401/403/404; redirects, 429 and server errors fail the test. The elapsed time is recorded; this is
a post-expiry sample, not a measurement of the exact first denial second.

All four identities receive Admin existence probes, Upload API `POST /<resource_type>/destroy`
with explicit delivery type and `invalidate=true`, first-result `ok` / repeated-result `not found`
assertions, and subsequent absence probes. Cleanup and inventory run even if matrix assertions fail.

Evidence contains HTTP status, allowlisted MIME type, disposition **kind** (no filenames), bounded
content length, safe cache directives and result vocabulary. Provider bodies, request URLs,
query strings, tokens, API headers, ETags and free-form errors/headers are withheld. HTTP uses fixed
HTTPS Cloudinary origins, a timeout, no redirects and no environment proxy. The current public
[Upload API reference](https://cloudinary.com/documentation/image_upload_api_reference) supports
Basic Auth for Upload/destroy; the Admin API uses Basic Auth as well. Credentials stay in memory.

## Cleanup and interrupted-run recovery

The owner-only JSON journal is created exclusively, never truncated/reused, and is atomically
updated and fsynced **before** each upload attempt. It contains only cloud/run/asset identities and
attempt markers, never credentials or token URLs. A stable advisory sidecar lock excludes concurrent
run/recovery use of that journal. Only the four exact run identities marked attempted can be deleted;
ambiguous/time-out uploads remain candidates because the provider may have created them.
No prefix-wide deletion, `delete_all`, folder deletion or broad Admin delete endpoint exists.

Normal completion, assertions, partial upload failures and handled SIGINT/SIGTERM run cleanup.
Cleanup ignores further ordinary termination signals until it finishes. SIGKILL, machine failure
or a lost connection can leave resources: the journal is deliberately **retained even on success**.
Use a durable private directory if recovery must survive temporary-directory cleanup.

Offline inspection: `./scripts/cloudinary-pilot/run-pilot.sh --validate-state /absolute/journal.json`.
After owner-authorized recovery, set the same required environment and original `PILOT_PREFIX`,
set `PILOT_STATE_FILE` to that journal, and use `./scripts/cloudinary-pilot/run-pilot.sh --cleanup-only`.
This mode performs provider deletions/probes/inventory and therefore also requires execution approval.
It does not compile the helper or need the Maven cache. Legacy pipe-delimited state is rejected.

State validation is a structural safety check, **not cryptographic proof of provenance**. Use only
this runner's own journal from your trusted private directory; never use downloaded/edited state.
Symlink, public-readable, wrong-cloud, wrong-prefix and non-allowlisted state is rejected.

Post-run inventory paginates **all four** resource/delivery combinations for the exact run prefix.
Any remaining asset, malformed/error response, failed request, repeated cursor or pagination limit
means **UNRESOLVED test-cloud resources/inventory** and nonzero exit. Per-asset 404 probes supplement
inventory; asynchronous CDN invalidation is still manual. Assets from other runs are never deleted.
Retain the journal, investigate in the **test** console, and re-run authorized cleanup; never treat
failed/unverified cleanup as success. An unexpected upload identity requires manual investigation.

## Merged application signer blocker

The helper shares UpTrack's SDK and URL/AuthToken building blocks, but intentionally does not
reproduce its defective output. An offline self-test pins the exact merged construction and confirms
it produces no `__cld_token__` parameter. The backend currently has an unkeyed `AuthToken`, omits
`signed(true)`, and builds an ACL without the cloud segment/SDK version/actual format path.
The helper uses the **separate token-auth key**, `signed(true)` and an ACL equal to the SDK-generated
URI path (including cloud, `/v1/`, and extension). Raw extensions occur once.

This corrects the earlier PR #58 documentation's mistaken instruction to use `apiSecret` as the
AuthToken key. A separately authorized application fix and real-signing regression tests are required
before application acceptance/activation. No backend source or activation flag is changed here.
Helper success is not application parity and cannot authorize enabling authenticated delivery.

## Remaining manual pilot work

After separately authorized live execution, record sanitized findings for browser PDF preview vs
download (Chromium), header behavior, authenticated image transformations, CDN token cache separation,
cross-edge expiry/invalidation, exact clock-skew boundary, old public URL behavior after controlled
type change (with/without invalidation), in-place byte/identity preservation, account entitlements,
rate limits/pagination at volume, and SDK 2.5.0 vs 2.6.0 parity. Type changes are **not** automated.
Perform them only on separately tracked synthetic assets within the authorized test scope and verify
their cleanup. Application owner/non-owner access, reports/downloads, feature-flag rollout/rollback
and live-backend acceptance remain separate. Keep authenticated delivery disabled until those gates
are satisfied and activation is expressly authorized.
