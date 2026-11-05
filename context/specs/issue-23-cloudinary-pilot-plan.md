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

1. Upload synthetic PDF (`raw`) and PNG (`image`) via the server-side SDK (`type=upload` first). Record returned `secure_url`, `public_id`, `resource_type`.
2. Logged-out fetch of the public URL → record status (baseline: expect 200 on `upload` type).
3. Generate AuthToken URL (`type=authenticated`, `duration=60`, acl pinned to the asset) **without changing the asset type** → logged-out fetch: is it denied? (Expectation: still public while the asset is `upload` type — key limitation.)
4. Change one asset to `type=authenticated` via the `explicit` Admin API → logged-out fetch of the **old public URL** (with and without `invalidate`) → is it refused immediately or edge-cached? Record TTL of any cached copy.
5. On the `authenticated` asset: plain URL → expect 401/404; signed URL (`sign_url`) → 200?; AuthToken URL → 200 before expiry, denied after — **measure actual TTL and clock-skew tolerance** against the intended 60 s.
6. ACL: AuthToken for asset A fetched against asset B's URL → denied? Record exact acl path format that works (`/<resource_type>/<delivery_type>/<public_id>` vs alternatives) — the implementation currently uses the former and must be corrected if the pilot shows otherwise.
7. Raw PDF via authenticated URL: record `Content-Type`, `Content-Disposition` (inline vs attachment), whether the URL needs the `.pdf` extension, browser preview vs download behavior in Chromium.
8. Image via authenticated URL: does it serve **transformations** (e.g. `w_200`) or only the original?
9. Caching: response cache headers on authenticated URLs; is `auth_token` part of the CDN cache key (fetch twice with different tokens); `destroy(invalidate=true)` purge behavior for both types.
10. `destroy` response contract: record the exact `result` values returned (`ok`, `not found`) and exception types for error payloads — confirms the Phase 2 response validation.
11. Admin API: `resources(prefix=...)` pagination shape (`next_cursor`), rate limits; `resource(public_id)` probe reliability (used by the Phase 1 reservation sweeper).
12. SDK compatibility: repeat steps 1–11 on `cloudinary-http5` **2.5.0 and 2.6.0** (PR #30) — confirm no behavioral difference.
13. In-place type change: does `explicit(type=authenticated)` preserve public_id and bytes? (Phase 4 copy-and-verify assumes **not** unless proven here.)
14. Failure modes: expired/revoked token response codes; whether URL generation is purely local (no API call) during an API outage.

## 3. Acceptance for the pilot

- Every [LV] question answered with recorded evidence (status codes, headers, TTL measurements, screenshots where relevant).
- Confidentiality demonstrated: logged-out access denied on `authenticated` assets; old public URL refused (or cache-bounded) after type change.
- Results recorded in `context/verification/issue-23-report.md`; any design change required by findings is documented and reviewed before implementation.

## 4. Out of scope

Production cloud, production assets, historical migration (Phase 4), deployment, enabling authenticated delivery in production.
