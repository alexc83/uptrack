> **Canonical tracker:** [GitHub issue #23](https://github.com/alexc83/uptrack/issues/23) — S05-003 permanent public delivery URLs; do not create duplicates.
> **Related:** #24 (registry, Phase 1, [spec](issue-24-certificate-asset-registry.md)), #20 (lifecycle/migration, Phases 2+4, [spec](issue-20-certificate-lifecycle.md)), #19 (Phase 0, [spec](issue-19-pdf-diagnosis.md)).

# READY Specification — Issue #23: Authenticated certificate delivery (Phase 3)

**Status: READY.** Owner approved the v3 architecture as the basis of this READY specification on 2026-11-05. **READY is not implementation authorization.** Phase 3 was separately authorized and merged default-off; the focused signer correction is separately authorized on `fix/23-cloudinary-authtoken-signing`. Merge, live pilot, provisioning, deployment and activation remain unauthorized for that correction.

Evidence tags: **[C]** confirmed in current `main` code/tests · **[H]** hypothesis · **[LV]** requires controlled non-production Cloudinary pilot.

## 1. Current-code findings

- **[C]** Upload response and `ce_records.certificate_url` carry permanent public `upload`-type Cloudinary `secure_url`s; anyone holding a URL can fetch the document; no expiry/revocation. Actual account-level public retrieval is **[LV]** (S05-003).
- **[C]** Frontend renders certificate links through `safeHttpUrl` (absolute http/https only) in the CE form and detail drawer; CE report/print shows a label only ("On file"/"Not attached"). Auth is Bearer JWT, stateless, `allowCredentials=false` — a plain `<a href>` to a backend endpoint cannot carry the token, so delivery must be **URL issuance**, not endpoint links.
- **[C]** cloudinary-core 2.5.0 exposes `Url.type/signed/authToken`, `AuthToken(duration/expiration/acl/generate)`, `Uploader.destroy`, Admin API `resources*`/`resource` — **capability, not proven private-delivery semantics** [LV]. PR #30 (cloudinary-http5 2.6.0) is compatible and orthogonal.

## 2. Approved architecture

Authenticated Cloudinary delivery: UpTrack verifies CE-record ownership **before** issuing a temporary access URL. Initial proposed default URL lifetime **60 seconds** (`app.certificates.delivery.ttl-seconds`), subject to the pilot. Once Phase 3 is operational, permanent managed-certificate delivery URLs are removed from ordinary API responses (Phase 1 safeguard: keep them until then).

## 2a. Activation gate — Strategy A with default-off flag (owner decision 2026-11-05)

`app.certificates.delivery.enabled` (env `CERTIFICATE_DELIVERY_ENABLED`, **default false**, server-controlled; TTL via `app.certificates.delivery.ttl-seconds`, default 60).

- **Flag OFF (default, current state):** exact Phase 2 behavior — uploads use delivery type `upload`, the upload response and ordinary CE-record/report responses carry the permanent `certificateUrl` for managed assets, React anchors work unchanged, and the delivery endpoint answers **404** (issues nothing). PR #57 therefore merges safely with the flag off.
- **Flag ON (pilot-gated, separately authorized):** new uploads use `type=authenticated`, the registry records `delivery_type='authenticated'`, and the delivery endpoint issues short-lived AuthToken URLs for those assets only (upload-type assets still 409).
- **URL suppression is asset-based, not flag-based:** `certificateUrl` is nulled in responses only when the managed asset's `delivery_type='authenticated'`. Turning the flag off later can never expose an authenticated asset's stored URL. React picks the mechanism from the response shape (URL present → anchor; absent but `certificateAssetId` present → View button → delivery endpoint) — no client-controlled security decision, no flag in the frontend.
- **Mixed populations:** `upload`-type managed assets remain viewable via their public URL under an explicitly documented temporary compatibility policy until Phase 4 retirement; `LEGACY_UNVERIFIED` and `EXTERNAL_LINK` records are untouched. Publicly reachable assets are never represented as private.
- **Lifecycle propagation by delivery type:** reserve-first registration, upload options, ambiguous-upload Admin probes, durable cleanup `destroy`, and reconciliation all pass the asset's delivery `type`; reconciliation inventories all four `resource_type × delivery_type` combinations with unambiguous 4-part identity keys.
- **Rollback:** the flag is one-way in practice — authenticated assets never regain a public URL, so "flag off after authenticated uploads exist" disables the endpoint for them; rollback = re-enable the flag (documented in the verification report). Already-created assets never change delivery type because of a flag change. No public-URL fallback exists in the authenticated path under any configuration.

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

- New endpoint `GET /api/ce-records/{id}/certificate-url` (Bearer JWT): authentication → CE record ownership → registry row `ATTACHED` with `ce_record_id = id` → 404 for non-owners (indistinguishable from missing) → `{url, expiresAt}` built via `cloudinary.url().secure(true).type("authenticated").resourceType(rt)` + a keyed `AuthToken(expiration=expiresAt, acl=actual SDK-generated URI raw path)` and `signed(true)`. Rate-limited; issuance audit-logged.
- Raw PDFs and images both covered per pilot answers; browser preview and download supported; CDN caching is per-token (short-lived); `invalidate=true` on destroy busts cached copies.
- **Limitations (explicit):** a signed/AuthToken URL is private only while the asset's delivery type is `authenticated` — legacy `upload`-type assets remain publicly reachable at their old URLs until Phase 4 retires them; the 60 s lifetime forbids stored links (UI refetches on every open, including print/report); issued URLs cannot be revoked (lifetime bounds exposure); provider outage → 5xx, never a fallback to the public URL; `EXTERNAL_LINK` records keep their public-by-nature external URLs via `safeHttpUrl`.
- DTO changes at Phase 3: managed assets with `delivery_type='authenticated'` no longer expose the permanent Cloudinary URL in `CERecordResponseDto`/`CEReportRecordDto` (Phase 1 safeguard 1: only at Phase 3; asset-based, per §2a).

## 4a. Dedicated token key and offline signer correction

`cloudinary.auth-token.key` binds `${CLOUDINARY_AUTH_TOKEN_KEY:}` into a dedicated redacted
configuration type. This is the provider's **separate** token-authentication key, never an API-secret
fallback. With delivery OFF, an absent key preserves startup and ordinary certificate workflows.
With delivery ON, a missing/blank/nonhex/odd-length key or a key outside **16–64 bytes encoded as hex**
prevents startup with a sanitized message. Validation follows binding so rejection diagnostics cannot
quote the supplied value; `toString` is redacted and JSON serialization omits the key. No global SDK
auth token is installed on the upload/Admin client. Do not enable configuration/environment dumps or
expose diagnostic endpoints containing property values; this repository does not install Actuator.

The signer derives ACL from `URI.getRawPath()` of the intended SDK delivery URL, then generates the
same URL with `new AuthToken(tokenKey).expiration(expiresAt.getEpochSecond()).acl(path)` and
`signed(true)`. It checks that the final path is unchanged. `expiresAt` is captured once in epoch
seconds and shared with the response. Raw format is added only when not already present on the
public ID (case-insensitive); images retain original delivery with no forced PNG/transform. SDK
exceptions are discarded in favor of the existing generic failure, never a permanent-URL fallback.
No stored public IDs, upload identities or cleanup contracts are modified.

Real-SDK offline tests cover the emitted parameter, HMAC (also independently recomputed in tests),
full ACL/encoding/version path, raw extension cases, original images, expiry, key/identity changes
and redaction. These establish local signing correctness **only**. Pilot parity must still resolve
raw extensionless registry identities against actual provider assets, compare equivalent app/helper
resource/format inputs, and verify token delivery/denial/expiry/ACL/caching at the provider before any
activation. See [signing verification](../verification/issue-23-signing-report.md).

## 5. React compatibility (Phase 3)

With the flag ON, "View certificate" becomes an on-demand action: `certificatesApi.getDeliveryUrl(ceRecordId)` (Bearer) → open returned URL (`window.open` / `img` / `iframe` src for preview); 404 → "No certificate"; expiry → refetch on click. CE form, detail drawer, credential drawer and report/print flows updated in the same PR; `safeHttpUrl` remains for `EXTERNAL_LINK` values. Browser checks in CI (chromium) plus owner-run Edge/Chrome/Firefox/WebKit.

## 6. Acceptance criteria (Phase 3)

- Pilot evidence recorded (`context/verification/issue-23-report.md`) answering §3; non-production credentials only; no production Cloudinary access.
- Owner/non-owner access: non-owner → 404; unauthenticated → 401; expired token denied (mocked signing + pilot).
- Permanent managed URLs absent from API responses at Phase 3; viewing/preview/download/print work in the browser; `frontend` + `e2e-chromium` green.
- No existing test weakened; mocked Cloudinary in CI.

## 7. Verification matrix (Phase 3)

Unit: real-SDK AuthToken URL/HMAC/ACL/expiry tests with synthetic keys and no provider calls, plus existing mocked authorization/failure tests and startup/redaction tests. Integration (H2 + PG17, mocked): delivery endpoint authz matrix, no-managed-asset → 404, `EXTERNAL_LINK` passthrough. Security regression: cross-user attempts, no URL leakage in responses, rate limits. Frontend: Vitest delivery-flow specs (success/404/401/refetch-on-expiry), typecheck/lint/build, focused Playwright. Live [LV]: pilot only. Required CI: `backend`, `backend-postgres`, `frontend`, `e2e-chromium`.

## 8. Remaining owner decisions

TTL default 60 s (confirm/adjust); pilot credentials provisioning; rollback/retirement sequencing with issue #20; focused signer correction implementation is authorized; merge, pilot/provisioning, deployment, activation and Phase 4 each remain outside this authorization.
