> **Canonical issue:** [GitHub issue #23](https://github.com/alexc83/uptrack/issues/23) · **Spec:** [context/specs/issue-23-authenticated-delivery.md](../specs/issue-23-authenticated-delivery.md) · **Pilot plan:** [context/specs/issue-23-cloudinary-pilot-plan.md](../specs/issue-23-cloudinary-pilot-plan.md) · **Phase:** 3 only — live Cloudinary testing, Phase 4, deployment NOT authorized/performed.

# Issue #23 Phase 3 verification report — authenticated certificate delivery (mocked provider)

Date: 2026-11-05 · Branch: `fix/23-authenticated-certificate-delivery` (from `main` @ `473918e`) · Cloudinary **fully mocked** in all automated checks; no live Cloudinary access.

## What was implemented

**Backend**
- `GET /api/ce-records/{id}/certificate-url` (`CERecordController` → `CertificateDeliveryServiceImpl`): JWT required → CE-record ownership (404 indistinguishable from missing) → managed asset ownership → asset must be `ATTACHED` to that record (else 409) → issues `{url, expiresAt}` with a 60 s (configurable `app.certificates.delivery.ttl-seconds`, 1–3600 enforced) Cloudinary `AuthToken` bound via `acl` to the single asset, `type=authenticated`, `secure=true`; raw assets get the format extension. URL generation is local signing — **no provider call, no fallback to a permanent public URL**; generation failure → 502 generic. Rate-limited per user (`certificate-url` scope, default 120/h).
- URL exposure is **asset-based**: `certificateUrl` is nulled in `CERecordResponseDto` (all three mappers) and `CEReportRecordDto` (which gains `certificateAssetId` so reports still label "On file") only when the managed asset's `delivery_type='authenticated'`; `upload`-type managed assets keep their URL. Legacy/external records keep their URLs (`LEGACY_UNVERIFIED`/`EXTERNAL_LINK` untouched — no reclassification).

**React**
- `ceRecordsApi.getCertificateUrl(id)`; the detail drawer renders a **View certificate button** only for managed assets with no exposed URL (authenticated delivery) — it fetches a fresh short-lived URL on each click and opens it (popup opened synchronously on click, navigated after fetch, `opener` severed; `noopener,noreferrer` fallback; API failure closes the placeholder tab and shows an inline error; fully blocked popups get a graceful message). Records with a `certificateUrl` (upload-type managed, legacy, external) keep the plain `safeHttpUrl` anchor — the frontend chooses purely from the response shape. The CE form stores the upload URL when the backend returns it (`response.url ?? ''`), so flag-off behavior is unchanged; list/report "On file" labels consider `certificateAssetId`.

## Changed files

Backend main: `config/CertificateDeliveryProperties.java` (new, activation flag), `controller/CERecordController.java`, `service/CertificateDeliveryService.java` + `impl/CertificateDeliveryServiceImpl.java` (new), `dto/response/CertificateDeliveryUrlDto.java` (new), `dto/response/CEReportRecordDto.java`, `service/impl/{CERecordServiceImpl,CredentialServiceImpl,DashboardServiceImpl}.java` (URL nulling), `security/{RequestRateLimiter,RequestRateLimitFilter}.java` (certificate-url scope), `application.yml`. Backend tests: `controller/CertificateDeliveryFlagDisabledIntegrationTest.java` (new, flag-off contract), `service/CertificateDeliveryServiceImplTest.java` (new), `controller/CertificateDeliveryIntegrationTest.java` (new, 3), `CertificateAssetRegistryIntegrationTest.java` (2 assertions updated to the Phase 3 contract). Frontend: `core/api/ce-records-api.ts`, `lib/dto/{ce-records,ce-report}.ts`, `features/ce-records/{ce-record-view.ts,ce-record-detail-drawer.tsx,ce-record-form.tsx,ce-records-page.test.tsx}`, `features/ce-report/{ce-report-view.ts,ce-report-page.tsx}`, fixtures (`src/test/fixtures/api-fixtures.ts`, `e2e/{ce-record-fixtures.ts,credential-fixtures.ts,ce-records.spec.ts}`). Docs: `context/specs/issue-23-cloudinary-pilot-plan.md` (new), this report.

## Checks run (this branch)

| Check | Result |
|---|---|
| `./mvnw -B -ntp test` (H2) — full backend suite | **246/246 passed** (was 237; +9 Phase 3 tests) |
| `npm run typecheck` / `npm run lint` | pass / pass |
| `npm run test -- --run` (full Vitest) | **597/597 passed** (+2 new drawer tests in the ce-records files; total file count same) |
| `npm run build` | pass |
| `E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium e2e/ce-records.spec.ts` | 3/3 passed (View button → on-demand URL → popup; payload carries `certificateUrl: null`) |
| Required CI on the PR (`backend`, `backend-postgres`, `frontend`, `e2e-chromium`) | reported on the PR (PG17 in CI) |

Coverage: authorized issuance + TTL/acl binding, cross-user/unknown 404, unauthenticated 401, inactive asset 409, generation failure → 502 no public fallback, managed URL absent from ordinary responses, legacy/external compatibility, React view/error flows, e2e popup flow. No existing test weakened (two Phase 1 assertions updated to the Phase 3 contract). Cloudinary mocked everywhere.

## Review-correction pass (PR #57 independent review, 2026-11-05)

**Finding 1 — delivery-type compatibility.** Confirmed at code level [C]: uploads use Cloudinary delivery type `upload` (no `type` option in `buildUploadOptions`), and the SDK config carries `cloud_name`/`api_key`/`api_secret` (API credentials are present; this does not establish presence of the separate token-auth key — see the preparation correction below). An `authenticated`-type URL for an `upload`-type asset is denied by the provider, so the delivery endpoint now **refuses `upload`-type managed assets with 409** instead of issuing broken URLs — never falling back to the public URL. Assets become deliverable via the endpoint only when `delivery_type='authenticated'` (Phase 4 migration). Upload responses no longer carry the permanent public URL (`url: null`); the registry still stores `delivery_url` internally, and cleanup/recovery are unaffected (they key on public_id/resource_type, not delivery type). Existing public URLs remain independently accessible until Phase 4 retirement [LV]. Tests: `uploadTypeAssetIsNotServedViaAuthenticatedUrl` (unit), `uploadTypeAssetIsRefusedUntilMigrated` (integration), upload-response URL assertions updated to null.

**Finding 2 — React popup reliability.** The drawer previously awaited the API before `window.open`, risking loss of user activation and leaving a blank tab on failure. Now the popup opens **synchronously on click**, the fresh short-lived URL is fetched, the popup is navigated to it, and `opener` is severed (`noopener` fallback path retained); on API failure the placeholder popup is closed and an inline error shows; fully blocked popups get a graceful message. Bearer tokens never enter URLs. Tests: 3 drawer unit tests (navigate-after-fetch + opener severed, close-on-failure, popup-blocked) and the e2e flow (popup on click + exactly one on-demand fetch).

**Security review results:** managed permanent URLs absent from CE-record and report responses (asserted in `CertificateDeliveryIntegrationTest`); upload response `url` now null; no managed URL in frontend state (form stores only `assetId`); cross-user delivery 404 tested; ATTACHED-state 409 tested; signing failure → 502, no public fallback; short-lived URLs never persisted; `LEGACY_UNVERIFIED`/`EXTERNAL_LINK` unchanged; caching behavior documented as [LV] pending pilot.

Re-run after corrections: backend **248/248** (H2); Vitest ce-records 31/31 (599+ total suite green); typecheck/lint/build pass; Chromium e2e 3/3. Required CI re-runs on the new PR head.

## Integration gate (owner review decision, 2026-11-05)

PR #57 as-is is **not mergeable without impairing certificate viewing**: uploads are `type=upload`, the endpoint requires `authenticated`, and managed URLs were removed from responses — so new managed uploads would 409 on View with no fallback. Resolution recorded in `context/specs/issue-23-cloudinary-pilot-plan.md` §3b: strategy A with a default-off `app.certificates.delivery.enabled` flag (flag off = exact Phase 2 behavior preserved), pilot-gated activation of authenticated uploads, and delivery-type-aware destroy/probe/reconciliation. No code change made in this pass (read-only gate); pilot runner prepared at `scripts/cloudinary-pilot/run-pilot.sh` (env-driven, synthetic fixtures, self-cleaning, no credentials committed).

## Strategy A activation gate (owner decision 2026-11-05, implemented on this branch)

`app.certificates.delivery.enabled` (`CertificateDeliveryProperties`, env `CERTIFICATE_DELIVERY_ENABLED`, **default false**) gates the whole feature:

- **Flag OFF (default):** exact Phase 2 behavior — uploads `type=upload`; upload response carries the permanent URL; CE-record/report responses carry `certificateUrl` for all managed assets; React anchors work; `GET .../certificate-url` answers 404 and issues nothing. PR #57 is therefore **mergeable with the flag disabled** without impairing certificate viewing.
- **Flag ON:** new uploads use `type=authenticated` (upload option), the reservation/registry record `delivery_type='authenticated'`, and the delivery endpoint issues 60 s acl-bound AuthToken URLs for those assets (upload-type assets still 409 — no public fallback, ever). Response URL suppression stays **asset-based** (`delivery_type='authenticated'` ⇒ `certificateUrl` null), so toggling the flag never exposes an authenticated asset's stored URL and never changes an existing asset's delivery type.
- **Lifecycle by delivery type:** Admin existence probes and cleanup `destroy` pass `type=<deliveryType>`; reconciliation inventories all four `resource_type × delivery_type` combinations with 4-part identity keys (`cloud_name\nresource_type\ndelivery_type\npublic_id`).
- **Rollback:** the flag is one-way in practice — once authenticated assets exist, flag-off disables the endpoint for them (they have no public URL by design); rollback = re-enable the flag. Documented deployment restriction: do not enable the flag until the non-production pilot passes and activation is separately authorized.

Tests added/updated this pass: `CertificateDeliveryFlagDisabledIntegrationTest` (flag-off contract: upload `type=upload`, URL present in upload/CE responses, endpoint 404), `CertificateDeliveryIntegrationTest` with `app.certificates.delivery.enabled=true` (`flagOnUploadsAuthenticatedAssetsAndSuppressesUrl`, `existingUploadTypeAssetsStayViewableViaUrlWhenEnabled`, upload-type 409), `flagDisabledIssuesNothing` (unit), upload/reservation/concurrency/reconciliation tests updated to the 4-arg `reserve(..., deliveryType)` and per-delivery-type stubbing.

Re-run after the gate: backend **252/252** (H2, `./mvnw -B -ntp test`); frontend `npm run typecheck` / `lint` / `build` pass; Vitest **600/600**; full Chromium Playwright suite **146/146** (`E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium`). Required CI (`backend`, `backend-postgres`, `frontend`, `e2e-chromium`) re-runs on the new PR head. Cloudinary mocked everywhere.

## Pilot tooling preparation (2026-11-05, PR #58)

Current tooling findings and local/mock evidence are maintained in
[issue-23-pilot-tooling-report.md](issue-23-pilot-tooling-report.md), with owner setup and recovery
instructions in the [tooling README](../../scripts/cloudinary-pilot/README.md).

**Correction to earlier evidence:** API credentials do not establish presence of an AuthToken signing
key. Cloudinary token authentication uses a separate configured encryption key; do not substitute
`api_secret`. The real SDK local self-test confirms the exact merged signer omits the token parameter.
The helper corrects keying, `signed(true)` and the full SDK-generated ACL path for provider experiments;
that is not application parity. Backend remediation remains separately scoped and activation blocked.
No Cloudinary API calls were made during preparation. The earlier nine-case preparation run was
superseded by the broader checks in the dedicated report.

## Pilot status and unverified provider behavior

**Not executed — requires separate owner approval.** The pilot plan (`context/specs/issue-23-cloudinary-pilot-plan.md`) defines the exact 14-question procedure and the credential/config requirements (dedicated non-production cloud, synthetic certificates only, secrets via the owner's secret manager, never in GitHub/files). Until the pilot runs, the following remain **unverified [LV]**: account-level authenticated-delivery enablement; raw/image authenticated delivery semantics; logged-out denial; token TTL/clock skew; ACL provider enforcement (the correction branch derives ACL from the full generated URI path; live parity remains pending); Content-Type/Disposition; transformations on authenticated images; CDN cache keying/invalidation; old public URL revocation timing; in-place type change; destroy result contract; Admin API limits; SDK 2.5.0 vs 2.6.0 behavior. **No security claim about live Cloudinary is made.**

## Remaining risks

- Historical `upload`-type assets stay publicly reachable until Phase 4 retires them (documented; not changed by Phase 3).
- 60 s URLs are irrevocable once issued (lifetime bounds exposure); UI refetches per click, so previews/downloads always get a fresh URL.
- Pilot findings may require design changes (acl format, raw URL shape) — to be reviewed before implementation.
- Production enablement of authenticated delivery is explicitly out of scope until pilot acceptance.


## Focused signer correction (authorized 2026-11-05; PR merge not authorized)

The current correction on `fix/23-cloudinary-authtoken-signing` addresses the unkeyed/missing-signing/
incomplete-ACL defect with dedicated `CLOUDINARY_AUTH_TOKEN_KEY` configuration, conditional startup
validation, SDK signing, actual URI-path ACL and identical token/DTO expiry. Real-SDK tests use public
synthetic vectors and no provider I/O. Existing authorization/state/type/default-off/fallback checks
are preserved. See [the focused signing report](issue-23-signing-report.md) for commands/results,
root cause, safe setup and remaining live uncertainties. Earlier sections describe historical
Phase 3 verification and must not be read as live-provider acceptance. The helper's baseline-defect
self-test remains historical; its corrected URL builder is the reference. No activation or pilot occurred.
