> **Canonical tracker:** [GitHub issue #23](https://github.com/alexc83/uptrack/issues/23) — S05-003 permanent public delivery URLs; do not create duplicates.
> **Related:** #24 (registry, Phase 1, [spec](issue-24-certificate-asset-registry.md)), #20 (lifecycle/migration, Phases 2+4, [spec](issue-20-certificate-lifecycle.md)), #19 (Phase 0, [spec](issue-19-pdf-diagnosis.md)).

# READY Specification — Issue #23: Authenticated certificate delivery (Phase 3)

**Status: READY.** Owner approved the v3 architecture as the basis of this READY specification on 2026-11-05. **READY is not implementation authorization; implementation remains unauthorized.**

Evidence tags: **[C]** confirmed in current `main` code/tests · **[H]** hypothesis · **[LV]** requires controlled non-production Cloudinary pilot.

## 1. Current-code findings

- **[C]** Upload response and `ce_records.certificate_url` carry permanent public `upload`-type Cloudinary `secure_url`s; anyone holding a URL can fetch the document; no expiry/revocation. Actual account-level public retrieval is **[LV]** (S05-003).
- **[C]** Frontend renders certificate links through `safeHttpUrl` (absolute http/https only) in the CE form and detail drawer; CE report/print shows a label only ("On file"/"Not attached"). Auth is Bearer JWT, stateless, `allowCredentials=false` — a plain `<a href>` to a backend endpoint cannot carry the token, so delivery must be **URL issuance**, not endpoint links.
- **[C]** cloudinary-core 2.5.0 exposes `Url.type/signed/authToken`, `AuthToken(duration/expiration/acl/generate)`, `Uploader.destroy`, Admin API `resources*`/`resource` — **capability, not proven private-delivery semantics** [LV]. PR #30 (cloudinary-http5 2.6.0) is compatible and orthogonal.

## 2. Approved architecture

Authenticated Cloudinary delivery: UpTrack verifies CE-record ownership **before** issuing a temporary access URL. Initial proposed default URL lifetime **60 seconds** (`app.certificates.delivery.ttl-seconds`), subject to the pilot. Once Phase 3 is operational, permanent managed-certificate delivery URLs are removed from ordinary API responses (Phase 1 safeguard: keep them until then).

## 3. Mandatory pilot verification questions [LV]

Before Phase 3 code is finalized, a controlled pilot on a **dedicated non-production cloud** with **synthetic certificates only** and separately owner-approved credentials must answer:

1. Is `authenticated` delivery enabled on the account, and does `type=authenticated` work for **both `raw` and `image`**?
2. Raw PDF: logged-out fetch of the plain public URL on an `upload`-type asset (baseline 200); on an `authenticated` asset: plain URL denied (401/404)? signed URL (`sign_url`) 200? AuthToken URL with `duration=60` → 200 before expiry, denied after — **measure actual TTL and clock-skew tolerance**.
3. Does AuthToken `acl` path restriction work for `raw`? What `Content-Type`/`Content-Disposition` (inline vs attachment) is served — compatible with browser preview **and** download?
4. Do authenticated `image` assets still serve **transformations** (e.g. thumbnails), or originals only?
5. **Caching:** cache headers on authenticated URLs; is the `auth_token` query param part of the CDN cache key; does `destroy(..., invalidate=true)` purge cached copies for both delivery types; how long can an edge retain a retired public URL?
6. After an asset becomes `authenticated`, is the **historical public URL** refused immediately or served from cache — with and without `invalidate`?
7. Does an **in-place** delivery-type change (`explicit` API, `type=authenticated`) preserve public ID and bytes? (Phase 4 copy-and-verify assumes **not** unless proven.)
8. Admin API pagination/rate limits for `resources(prefix=…)` reconciliation listing; reliability of the `resource(public_id)` existence probe used by the upload sweeper.
9. Failure modes: expired/revoked token responses; whether URL generation is purely local signing or an API call (outage behavior).

## 4. Delivery design

- New endpoint `GET /api/ce-records/{id}/certificate-url` (Bearer JWT): authentication → CE record ownership → registry row `ATTACHED` with `ce_record_id = id` → 404 for non-owners (indistinguishable from missing) → `{url, expiresAt}` built via `cloudinary.url().secure(true).type("authenticated").resourceType(rt)` + `AuthToken(duration=ttl, acl pinned to the asset path)`. Rate-limited; issuance audit-logged.
- Raw PDFs and images both covered per pilot answers; browser preview and download supported; CDN caching is per-token (short-lived); `invalidate=true` on destroy busts cached copies.
- **Limitations (explicit):** a signed/AuthToken URL is private only while the asset's delivery type is `authenticated` — legacy `upload`-type assets remain publicly reachable at their old URLs until Phase 4 retires them; the 60 s lifetime forbids stored links (UI refetches on every open, including print/report); issued URLs cannot be revoked (lifetime bounds exposure); provider outage → 5xx, never a fallback to the public URL; `EXTERNAL_LINK` records keep their public-by-nature external URLs via `safeHttpUrl`.
- DTO changes at Phase 3: managed assets no longer expose the permanent Cloudinary URL in `CERecordResponseDto`/`CEReportRecordDto` (Phase 1 safeguard 1: only at Phase 3).

## 5. React compatibility (Phase 3)

"View certificate" becomes an on-demand action: `certificatesApi.getDeliveryUrl(ceRecordId)` (Bearer) → open returned URL (`window.open` / `img` / `iframe` src for preview); 404 → "No certificate"; expiry → refetch on click. CE form, detail drawer, credential drawer and report/print flows updated in the same PR; `safeHttpUrl` remains for `EXTERNAL_LINK` values. Browser checks in CI (chromium) plus owner-run Edge/Chrome/Firefox/WebKit.

## 6. Acceptance criteria (Phase 3)

- Pilot evidence recorded (`context/verification/issue-23-report.md`) answering §3; non-production credentials only; no production Cloudinary access.
- Owner/non-owner access: non-owner → 404; unauthenticated → 401; expired token denied (mocked signing + pilot).
- Permanent managed URLs absent from API responses at Phase 3; viewing/preview/download/print work in the browser; `frontend` + `e2e-chromium` green.
- No existing test weakened; mocked Cloudinary in CI.

## 7. Verification matrix (Phase 3)

Unit: AuthToken URL construction (mocked `Cloudinary`), TTL/expiresAt, ownership checks. Integration (H2 + PG17, mocked): delivery endpoint authz matrix, no-managed-asset → 404, `EXTERNAL_LINK` passthrough. Security regression: cross-user attempts, no URL leakage in responses, rate limits. Frontend: Vitest delivery-flow specs (success/404/401/refetch-on-expiry), typecheck/lint/build, focused Playwright. Live [LV]: pilot only. Required CI: `backend`, `backend-postgres`, `frontend`, `e2e-chromium`.

## 8. Remaining owner decisions

TTL default 60 s (confirm/adjust); pilot credentials provisioning; rollback/retirement sequencing with issue #20; explicit implementation authorization (currently **not granted**).
