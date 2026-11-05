> **Canonical issue:** [GitHub issue #23](https://github.com/alexc83/uptrack/issues/23) · **Spec:** [context/specs/issue-23-authenticated-delivery.md](../specs/issue-23-authenticated-delivery.md) · **Pilot plan:** [context/specs/issue-23-cloudinary-pilot-plan.md](../specs/issue-23-cloudinary-pilot-plan.md) · **Phase:** 3 only — live Cloudinary testing, Phase 4, deployment NOT authorized/performed.

# Issue #23 Phase 3 verification report — authenticated certificate delivery (mocked provider)

Date: 2026-11-05 · Branch: `fix/23-authenticated-certificate-delivery` (from `main` @ `473918e`) · Cloudinary **fully mocked** in all automated checks; no live Cloudinary access.

## What was implemented

**Backend**
- `GET /api/ce-records/{id}/certificate-url` (`CERecordController` → `CertificateDeliveryServiceImpl`): JWT required → CE-record ownership (404 indistinguishable from missing) → managed asset ownership → asset must be `ATTACHED` to that record (else 409) → issues `{url, expiresAt}` with a 60 s (configurable `app.certificates.delivery.ttl-seconds`, 1–3600 enforced) Cloudinary `AuthToken` bound via `acl` to the single asset, `type=authenticated`, `secure=true`; raw assets get the format extension. URL generation is local signing — **no provider call, no fallback to a permanent public URL**; generation failure → 502 generic. Rate-limited per user (`certificate-url` scope, default 120/h).
- Managed records no longer expose the permanent Cloudinary URL in ordinary responses: `certificateUrl` is nulled for `certificateAssetId != null` records in `CERecordResponseDto` (all three mappers) and `CEReportRecordDto` (which gains `certificateAssetId` so reports still label "On file"). Legacy/external records keep their URLs (`LEGACY_UNVERIFIED`/`EXTERNAL_LINK` untouched — no reclassification).

**React**
- `ceRecordsApi.getCertificateUrl(id)`; detail drawer renders a **View certificate button** for managed assets that fetches a fresh short-lived URL on each click and opens it (`noopener,noreferrer`), with inline error handling (404/409/5xx); legacy/external links keep the `safeHttpUrl` anchor. CE form no longer stores the upload's public URL — it keeps the `assetId` (payload `certificateUrl: null`), shows filename-only "Uploaded" state, and "Certificate attached" for existing managed records. List/report "On file" labels now consider `certificateAssetId`.

## Changed files

Backend main: `controller/CERecordController.java`, `service/CertificateDeliveryService.java` + `impl/CertificateDeliveryServiceImpl.java` (new), `dto/response/CertificateDeliveryUrlDto.java` (new), `dto/response/CEReportRecordDto.java`, `service/impl/{CERecordServiceImpl,CredentialServiceImpl,DashboardServiceImpl}.java` (URL nulling), `security/{RequestRateLimiter,RequestRateLimitFilter}.java` (certificate-url scope), `application.yml`. Backend tests: `service/CertificateDeliveryServiceImplTest.java` (new, 6), `controller/CertificateDeliveryIntegrationTest.java` (new, 3), `CertificateAssetRegistryIntegrationTest.java` (2 assertions updated to the Phase 3 contract). Frontend: `core/api/ce-records-api.ts`, `lib/dto/{ce-records,ce-report}.ts`, `features/ce-records/{ce-record-view.ts,ce-record-detail-drawer.tsx,ce-record-form.tsx,ce-records-page.test.tsx}`, `features/ce-report/{ce-report-view.ts,ce-report-page.tsx}`, fixtures (`src/test/fixtures/api-fixtures.ts`, `e2e/{ce-record-fixtures.ts,credential-fixtures.ts,ce-records.spec.ts}`). Docs: `context/specs/issue-23-cloudinary-pilot-plan.md` (new), this report.

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

## Pilot status and unverified provider behavior

**Not executed — requires separate owner approval.** The pilot plan (`context/specs/issue-23-cloudinary-pilot-plan.md`) defines the exact 14-question procedure and the credential/config requirements (dedicated non-production cloud, synthetic certificates only, secrets via the owner's secret manager, never in GitHub/files). Until the pilot runs, the following remain **unverified [LV]**: account-level authenticated-delivery enablement; raw/image authenticated delivery semantics; logged-out denial; token TTL/clock skew; acl path format (implementation uses `/<resource_type>/authenticated/<public_id>` — pilot item 6 may correct it); Content-Type/Disposition; transformations on authenticated images; CDN cache keying/invalidation; old public URL revocation timing; in-place type change; destroy result contract; Admin API limits; SDK 2.5.0 vs 2.6.0 behavior. **No security claim about live Cloudinary is made.**

## Remaining risks

- Historical `upload`-type assets stay publicly reachable until Phase 4 retires them (documented; not changed by Phase 3).
- 60 s URLs are irrevocable once issued (lifetime bounds exposure); UI refetches per click, so previews/downloads always get a fresh URL.
- Pilot findings may require design changes (acl format, raw URL shape) — to be reviewed before implementation.
- Production enablement of authenticated delivery is explicitly out of scope until pilot acceptance.
