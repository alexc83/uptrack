# Issue #23 — authenticated certificate storage and temporary API downloads

Canonical tracker: [Issue #23](https://github.com/alexc83/uptrack/issues/23).
Related: #24 (registry), #20 (durable lifecycle and Phase 4 historical remediation).

## Approved scope

Owner-authorized on 2026-11-05: finish application implementation using authenticated
Cloudinary storage, Java SDK `privateDownload`, and Spring JWT/ownership checks.
Premium CDN AuthTokens and test-cloud pilots are abandoned. No new architecture,
dependency, provider access, provisioning or paid feature is required by this PR.
Merge, deployment, production activation and Phase 4 remain separately authorized.

## Delivery contract

`GET /api/ce-records/{id}/certificate-url` retains the existing response
`{url, expiresAt}` and configurable default 60-second TTL (1–3600 seconds).

Before signing, enforce the server-controlled rollout flag, JWT principal, record
ownership, owned registry asset, ATTACHED state, matching record association,
`delivery_type=authenticated`, and configured cloud identity. Missing/foreign
records remain 404, unauthenticated requests 401, unavailable/public assets 409.
Failures never issue a stored/public URL. The response is `Cache-Control: no-store,
private`; ordinary record/report DTOs suppress authenticated assets' stored URLs
independently of the flag.

Sign locally with installed Java SDK 2.5.0:

```java
cloudinary.privateDownload(exactRegistryPublicId, format, Map.of(
    "resource_type", resourceType,
    "type", "authenticated",
    "expires_at", expiresAt.getEpochSecond(),
    "attachment", false));
```

The API secret signs the request. There is no separate token-auth key, AuthToken
configuration or permanent signed CDN URL. The exact epoch-second deadline is
shared by the SDK parameters and response. Checked/runtime signing errors are
sanitized without a retained sensitive cause. URLs/signatures/secrets are not logged.

## Raw PDF and image identities

New PDF/raw reservations include `.pdf` in the **public ID before any upload**.
Images retain extensionless server-generated public IDs. Client filenames never
supply provider identity. Uploads use the reserved ID, explicit resource type,
no overwrite, and authenticated delivery after activation. Provider responses
must match the reserved public ID/resource/delivery type before becoming PENDING.
Null/incomplete/mismatched responses schedule reconciliation of the reserved ID;
never adopt or destroy an unrelated returned ID.

Delivery always uses the exact stored public ID. Raw assets are not transformed:
pass a null format, which the SDK omits, retaining the full raw ID including its
extension. This applies to historical extensionless raw rows too: never append,
strip, guess or probe alternative IDs. Images use their validated original
JPG/JPEG/PNG/WebP/GIF filename format; no forced PNG or transformations.

This raw mapping combines the documented extension-bearing raw ID contract with
the SDK's omission of empty format for original-byte retrieval. Offline tests
verify the exact request/signature; actual provider acceptance of omitted raw
format, including old extensionless raw identities, is **not live verified**.
It must not be represented as an experimentally proven provider behavior.

Upload/recovery store the provider's `secure_url` unchanged, with no fabricated
raw URL suffix. Admin probes and adoption verify the exact identity triplet;
delete/retry/reconciliation continue using the stored public ID and explicit
resource/delivery type. No historical registry IDs or database schema change.

## Rollout and compatibility

`CERTIFICATE_DELIVERY_ENABLED` remains **false by default** and is not changed.
Flag OFF preserves existing public upload/ordinary-link compatibility; the new
endpoint issues nothing. Thus this PR does not make current production uploads
private and does not resolve historical public exposure by itself.

After separately authorized activation, new uploads use `type=authenticated` and
ordinary DTOs withhold their permanent URL. React's existing View button obtains
a fresh JWT-authorized URL and opens it on demand for PDF/image viewing. Each click
requests fresh access. Legacy/external links and existing public managed assets
keep their anchors pending Phase 4. Turning the flag off never exposes an
already-authenticated asset URL; it disables temporary access to those assets.

Historical public assets are not renamed, copied, changed or deleted in this PR.
#20 retains Phase 4 migration/retirement; #23 stays open until activation, provider
acceptance and unresolved permanent public access are addressed. No duplicate
follow-up tracker is needed while those canonical issues remain open.

## Evidence and limitations

Required automated checks: full backend H2, disposable PostgreSQL 17 backend,
frontend typecheck/lint/Vitest/build, full mocked Chromium functional suite.
Real-SDK offline tests independently verify API signatures and explicit expiry,
exact raw/image identities, formats, resource endpoints, checked errors and
redaction. They do not assert provider expiry or unsigned-delivery enforcement.
React tests cover API download URLs and existing public/external compatibility.

Live provider rejection of unsigned/tampered/expired URLs, PDF MIME/disposition,
range/preview behavior, CDN/cache behavior, quotas and delivery restrictions remain
unverified. Free accounts may need the PDF/ZIP delivery setting; this PR does not
change it. API downloads bypass CDN caching and documentation warns of twice the
bandwidth. SDK `privateDownload` ignores transformation/custom filename options;
none are used. No live pilot or provider calls are authorized or performed.

Sources:
- [Access controls and temporary downloads](https://cloudinary.com/documentation/control_access_to_media#providing_time_limited_access_to_private_media_assets)
- [Raw IDs and authenticated uploads](https://cloudinary.com/documentation/upload_parameters)
- [Upload/download API reference](https://cloudinary.com/documentation/image_upload_api_reference)
- [Free-plan PDF delivery restrictions](https://cloudinary.com/documentation/image_delivery_options)

Verification: [current implementation report](../verification/issue-23-private-download-report.md).
