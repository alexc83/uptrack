> **Canonical issue:** [GitHub issue #23](https://github.com/alexc83/uptrack/issues/23) · **Spec:** [issue-23-authenticated-delivery.md](issue-23-authenticated-delivery.md) · **Status: PLAN ONLY — execution requires separate owner approval. No credentials are stored here or in GitHub; none are requested in issues/PRs/files.**

# Issue #23 — Non-production Cloudinary pilot plan (authenticated delivery)

**Purpose:** experimentally verify every behavior Phase 3/4 assumes, before any production enablement. Distinguish **SDK-supported** (code-level, [C]) from **experimentally verified** ([LV] until this pilot runs).

## 1. Environment and credential requirements (owner actions to authorize)

1. Create a **dedicated non-production Cloudinary cloud** (separate from the production cloud name) — or a sub-account with its own API key/secret. Never reuse production credentials.
2. Provide the pilot runner (agent or owner machine) with, via the owner's secret manager (e.g. Doppler) — **never committed, never posted to GitHub**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` of the test cloud, plus its separate `CLOUDINARY_AUTH_TOKEN_KEY` for token-based authentication. Provisioning is not yet authorized.
3. Confirm the account setting **"Authenticated delivery" / private CDN** enablement state and record it.
4. Use **synthetic certificates only** (generated one-page PDF, generated PNG/JPEG) — no real user documents.
5. Scope: read/write/destroy + Admin API on the test cloud only; no production Cloudinary access at any point.

## 2. Pilot procedure (each step = one [LV] question from the spec §3)

0. **Signing configuration check [C]:** the backend `CloudinaryConfig` passes `cloud_name`, `api_key`, `api_secret` — the API secret authenticates provider API calls, but is **not** the token-authentication key. The pilot requires the separate hex `CLOUDINARY_AUTH_TOKEN_KEY` supplied/configured for Cloudinary token authentication. The signer correction on `fix/23-cloudinary-authtoken-signing` uses that same dedicated key; its merge/acceptance and live parity are still required before activation; see §2b.
1. Upload synthetic PDF (`raw`) and PNG (`image`) with **`type=upload`** (current production behavior). The tooling uses the documented Upload REST API with Basic Auth, and the Java SDK for local delivery signing. Record identities/resource types and safe status/header evidence; do not publish token URLs.
2. Logged-out fetch of the public URL → record status (baseline: expect 200 on `upload` type). **This also proves existing public URLs remain accessible independently of the authenticated endpoint.**
3. Generate an AuthToken URL (`type=authenticated`, `duration=60`, acl pinned) for the **`upload`-type** asset → logged-out fetch: **expect denial** — confirms the delivery-type mismatch and why Phase 3 refuses (409) `upload`-type assets until migration.
4. Upload fresh synthetic assets with **`type=authenticated`** directly → verify the full upload → authenticated-view → destroy lifecycle works for the new type (reservation recovery and cleanup-worker deletion are type-agnostic by public_id, but confirm destroy works on `authenticated` assets and returns the same `result` contract).
5. Change one `upload` asset to `type=authenticated` via the `explicit` Admin API → logged-out fetch of the **old public URL** (with and without `invalidate`) → refused immediately or edge-cached? Record TTL of any cached copy.
6. On an `authenticated` asset: plain URL → expect 401/404; signed URL (`sign_url`) → 200?; AuthToken URL → 200 before expiry, denied after — **measure actual TTL and clock-skew tolerance** against the intended 60 s.
7. ACL exact matching: AuthToken for asset A used against asset B's URL → denied? Record the exact acl path format that works — including **whether a raw `.pdf` extension in the URL affects matching** (`/<resource_type>/<delivery_type>/<public_id>` vs with extension). The merged application currently uses the former without cloud/version/extension. The helper pins ACL to the complete SDK-generated URI path (cloud + resource/delivery type + SDK `/v1/` + public ID/extension); live acceptance and a separately authorized application correction remain required.
8. Raw PDF via authenticated URL: record `Content-Type`, `Content-Disposition` (inline vs attachment), whether the URL needs the `.pdf` extension, browser preview vs download behavior in Chromium.
9. Image via authenticated URL: does it serve **transformations** (e.g. `w_200`) or only the original?
10. Caching: response cache headers on authenticated URLs; is `auth_token` part of the CDN cache key (fetch twice with different tokens); `destroy(invalidate=true)` purge behavior for **both** delivery types.
11. `destroy` response contract for both types: exact `result` values (`ok`, `not found`) and exception types for error payloads — confirms the Phase 2 response validation.
12. Admin API: `resources(prefix=...)` pagination shape (`next_cursor`), rate limits; `resource(public_id)` probe reliability (used by the Phase 1 reservation sweeper and Phase 2 reconciliation).
13. SDK compatibility: repeat key steps on `cloudinary-http5` **2.5.0 and 2.6.0** (PR #30) — confirm no behavioral difference.
14. In-place type change: does `explicit(type=authenticated)` preserve public_id and bytes? (Phase 4 copy-and-verify assumes **not** unless proven here.)
15. Failure modes: expired/revoked token response codes; whether URL generation is purely local (no API call) during an API outage.

## 2b. Runnable pilot tooling (no credentials committed)

The [tooling README](../../scripts/cloudinary-pilot/README.md) defines the exact environment,
recovery procedure, assertions and remaining manual matrix. [Preparation evidence](../verification/issue-23-pilot-tooling-report.md)
records local/mock verification. [PR #58](https://github.com/alexc83/uptrack/pull/58) is preparation only;
merging it and executing the pilot require **separate** owner authorizations.

- `run-pilot.sh` launches the Python standard-library runner. Before any provider call it requires
  `PILOT_CONFIRM_NONPRODUCTION=yes`, exact nonempty `CLOUDINARY_CLOUD_NAME` /
  `PILOT_EXPECTED_CLOUD_NAME` equality, test API key/secret, and separate hex `CLOUDINARY_AUTH_TOKEN_KEY`;
  configuration is validated. Equality alone does not prove non-production: owner console verification
  is mandatory. No credentials or production cloud names are stored in the tools.
- Four synthetic assets (raw PDF/image PNG × public/authenticated) use a unique `pilot/<UUID>/`
  child prefix, explicit identities and `overwrite=false`. Status/content-type assertions cover public
  retrieval, unsigned denial, token success, cross-asset ACL denial both ways, expiry denial, Admin
  existence/absence and Upload destroy `ok` / repeated `not found` semantics for all four assets.
  Only parsed safe status/header evidence is printed; URLs/tokens/provider errors are withheld.
- Durable owner-only JSON state records attempts **before** upload, survives failure and is never
  truncated on recovery. Cleanup targets only exact attempted run identities; reported collisions are
  not deleted. Normal exit, failure and SIGINT/SIGTERM run cleanup; `--cleanup-only` recovers from
  harder interruptions using the same cloud/prefix and original private journal. Post-run inventory
  paginates all four combinations under the run prefix. Unverified/failed cleanup fails the run and
  reports unresolved test-cloud resources; other runs' assets are never deleted.
- `--validate-state FILE` is offline structural validation, not proof of provenance.
  `PILOT_PREFLIGHT_ONLY=yes` checks configuration, fixtures and real SDK local signing without any
  provider I/O. `test-tooling.sh` covers orchestration and failures using mocks, never live credentials.
- **Application compatibility gate:** the baseline merged signer was unkeyed, omitted `signed(true)`
  and used an incomplete ACL; the helper's exact-construction diagnostic pins that historical defect.
  The authorized correction on `fix/23-cloudinary-authtoken-signing` now uses the dedicated key,
  `signed(true)`, actual SDK URI-path ACL and one token/DTO expiry. Its real-SDK evidence is in
  [the signing report](../verification/issue-23-signing-report.md). Earlier API-secret-as-token-key
  instructions remain superseded. The helper's image fixture explicitly selects PNG; the application
  preserves original images, so compare equivalent resource/format options rather than assuming
  identical strings. Raw ID/extension correspondence still needs live parity. Offline success does
  not establish live authorization; correction merge/acceptance and the pilot remain separate gates.

Browser preview, CDN behavior, exact skew boundary, transformations, historical URL/type-change
behavior and SDK upgrade parity remain manual. No provider pilot, provisioning, deployment,
production access or authenticated-delivery activation is authorized by tooling preparation.

## 3. Acceptance for the pilot (live-provider; mocked tests cannot establish these)

End-to-end acceptance workflow (repeat for a synthetic PDF and a synthetic image):

1. Upload the synthetic file as an `authenticated` asset; registry identity recorded with `delivery_type='authenticated'`.
2. Attach to a CE record; ownership verified (foreign user → 404 on the delivery endpoint).
3. Unauthenticated request for the delivery URL → 401.
4. Plain unsigned Cloudinary URL for the authenticated asset → 401/404 (logged out).
5. Authenticated short-lived URL → 200 with correct `Content-Type`/`Content-Disposition`; view/download works in Chromium.
6. Same URL after the TTL → denied (record actual TTL/clock skew).
7. Remove the certificate → durable cleanup destroys the **authenticated** asset (destroy call carries `type=authenticated`); re-destroy returns `not found`.
8. Previously public (`upload`) assets remain separately tracked (`delivery_type='upload'`) for Phase 4; their old public URLs still work until retired.

Plus the per-step expected values: account setting on; raw+image authenticated delivery works; ACL cross-asset denial; caching keying/invalidation; Admin API pagination; SDK 2.5.0 vs 2.6.0 parity; in-place type change feasibility.

- Every [LV] question answered with recorded evidence (status codes, headers, TTL measurements, screenshots where relevant).
- Results recorded in `context/verification/issue-23-report.md`; any design change required by findings is documented and reviewed before implementation.

## 3b. Integration strategy decision (recorded 2026-11-05, PR #57 gate)

**Blocker:** PR #57 as-is makes new managed uploads unviewable (uploads are `type=upload`, the endpoint requires `authenticated`, and responses no longer carry the public URL).

**Owner decision (2026-11-05): Strategy A approved and implemented on `fix/23-authenticated-certificate-delivery`:**
1. `app.certificates.delivery.enabled` (default **false**) implemented as `CertificateDeliveryProperties` + `application.yml` (`CERTIFICATE_DELIVERY_ENABLED`). While false, Phase 2 behavior is preserved exactly: uploads `type=upload`, upload/CE/report responses carry the permanent URL for managed assets, React anchors work, the delivery endpoint issues nothing (404).
1. Add `app.certificates.delivery.enabled` (default **false**). While false, Phase 2 behavior is preserved exactly: upload response carries the public URL, CE responses carry `certificateUrl` for managed assets, frontend anchors work, endpoint inactive.
2. When enabled: uploads use `"type": "authenticated"`; registry records `delivery_type='authenticated'`; destroy/probe/reconciliation pass the delivery `type`; the endpoint serves authenticated assets; response URL suppression is **asset-based** (only `authenticated` assets lose their URL), so the flag can be turned off without ever exposing an authenticated asset's stored URL. Existing `upload`-type assets stay viewable via their public URL under the documented temporary compatibility policy until Phase 4.
3. Pilot passes on the test cloud → enable the flag in non-prod → run the §3 acceptance workflow → production activation separately authorized.

**No public-URL fallback in the authenticated path, ever.** The pilot must additionally verify the items in §3 (authenticated destroy, probe, and delivery for both `raw` and `image`, old public URL behavior, caching) — see the pilot acceptance workflow above.

## 4. Out of scope

Production cloud, production assets, historical migration (Phase 4), deployment, enabling authenticated delivery in production.
