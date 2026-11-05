> **Canonical issue:** [GitHub issue #23](https://github.com/alexc83/uptrack/issues/23) · **Spec:** [issue-23-authenticated-delivery.md](issue-23-authenticated-delivery.md) · **Status: PLAN ONLY — execution requires separate owner approval. No credentials are stored here or in GitHub; none are requested in issues/PRs/files.**

# Issue #23 — Non-production Cloudinary pilot plan (authenticated delivery)

**Purpose:** experimentally verify every behavior Phase 3/4 assumes, before any production enablement. Distinguish **SDK-supported** (code-level, [C]) from **experimentally verified** ([LV] until this pilot runs).

## 1. Environment and credential requirements (owner actions to authorize)

1. Create a **dedicated non-production Cloudinary cloud** (separate from the production cloud name) — or a sub-account with its own API key/secret. Never reuse production credentials.
2. Provide the pilot runner (agent or owner machine) with, via the owner's secret manager (e.g. Doppler) — **never committed, never posted to GitHub**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` of the test cloud.
3. Confirm the account setting **"Authenticated delivery" / private CDN** enablement state and record it.
4. Use **synthetic certificates only** (generated one-page PDF, generated PNG/JPEG) — no real user documents.
5. Scope: read/write/destroy + Admin API on the test cloud only; no production Cloudinary access at any point.

## 2. Pilot procedure (each step = one [LV] question from the spec §3)

0. **Signing configuration check [C]:** the backend `CloudinaryConfig` passes `cloud_name`, `api_key`, `api_secret` — the `api_secret` is the AuthToken signing key; confirm it is present in the test-cloud env and never logged.
1. Upload synthetic PDF (`raw`) and PNG (`image`) via the server-side SDK with **`type=upload`** (current production behavior). Record returned `secure_url`, `public_id`, `resource_type`.
2. Logged-out fetch of the public URL → record status (baseline: expect 200 on `upload` type). **This also proves existing public URLs remain accessible independently of the authenticated endpoint.**
3. Generate an AuthToken URL (`type=authenticated`, `duration=60`, acl pinned) for the **`upload`-type** asset → logged-out fetch: **expect denial** — confirms the delivery-type mismatch and why Phase 3 refuses (409) `upload`-type assets until migration.
4. Upload fresh synthetic assets with **`type=authenticated`** directly → verify the full upload → authenticated-view → destroy lifecycle works for the new type (reservation recovery and cleanup-worker deletion are type-agnostic by public_id, but confirm destroy works on `authenticated` assets and returns the same `result` contract).
5. Change one `upload` asset to `type=authenticated` via the `explicit` Admin API → logged-out fetch of the **old public URL** (with and without `invalidate`) → refused immediately or edge-cached? Record TTL of any cached copy.
6. On an `authenticated` asset: plain URL → expect 401/404; signed URL (`sign_url`) → 200?; AuthToken URL → 200 before expiry, denied after — **measure actual TTL and clock-skew tolerance** against the intended 60 s.
7. ACL exact matching: AuthToken for asset A used against asset B's URL → denied? Record the exact acl path format that works — including **whether a raw `.pdf` extension in the URL affects matching** (`/<resource_type>/<delivery_type>/<public_id>` vs with extension). The implementation currently uses the former without extension; correct it if the pilot shows otherwise.
8. Raw PDF via authenticated URL: record `Content-Type`, `Content-Disposition` (inline vs attachment), whether the URL needs the `.pdf` extension, browser preview vs download behavior in Chromium.
9. Image via authenticated URL: does it serve **transformations** (e.g. `w_200`) or only the original?
10. Caching: response cache headers on authenticated URLs; is `auth_token` part of the CDN cache key (fetch twice with different tokens); `destroy(invalidate=true)` purge behavior for **both** delivery types.
11. `destroy` response contract for both types: exact `result` values (`ok`, `not found`) and exception types for error payloads — confirms the Phase 2 response validation.
12. Admin API: `resources(prefix=...)` pagination shape (`next_cursor`), rate limits; `resource(public_id)` probe reliability (used by the Phase 1 reservation sweeper and Phase 2 reconciliation).
13. SDK compatibility: repeat key steps on `cloudinary-http5` **2.5.0 and 2.6.0** (PR #30) — confirm no behavioral difference.
14. In-place type change: does `explicit(type=authenticated)` preserve public_id and bytes? (Phase 4 copy-and-verify assumes **not** unless proven here.)
15. Failure modes: expired/revoked token response codes; whether URL generation is purely local (no API call) during an API outage.

## 2b. Runnable pilot script (no credentials committed)

`scripts/cloudinary-pilot/run-pilot.sh` — env-driven (`CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET` of the **test** cloud + `PILOT_CONFIRM_NONPRODUCTION=yes`), generates synthetic PDF/PNG fixtures itself, runs upload (both delivery types), logged-out access checks, Admin API probes, destroy-contract checks, reconciliation listings, and destroys everything it created. AuthToken URL generation (steps 7–9) is deliberately done via the SDK/backend delivery endpoint, not hand-rolled signatures. Expected results per step are printed inline and restated in §3.

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

**Recommended strategy — A with a default-off activation flag (staged within A):**
1. Add `app.certificates.delivery.enabled` (default **false**). While false, Phase 2 behavior is preserved exactly: upload response carries the public URL, CE responses carry `certificateUrl` for managed assets, frontend anchors work, endpoint inactive.
2. Pilot passes on the test cloud → implement: uploads with `"type": "authenticated"` when enabled; registry `delivery_type='authenticated'`; destroy/probe/reconciliation pass the delivery `type`; endpoint serves authenticated assets; DTO nulling active only when enabled.
3. Enable the flag in non-prod, run the §3 acceptance workflow, then production.

Strategy B (hold the whole PR until coordinated activation) is equivalent but keeps PR #57 unmergeable longer; A-with-flag lets #57 merge safely (flag off) once the flag code lands. **No public-URL fallback in the authenticated path, ever.**

## 4. Out of scope

Production cloud, production assets, historical migration (Phase 4), deployment, enabling authenticated delivery in production.
