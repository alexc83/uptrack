# Issue #23 — zero-cost privateDownload implementation

Canonical tracker: [Issue #23](https://github.com/alexc83/uptrack/issues/23).
Design: [approved delivery specification](../specs/issue-23-authenticated-delivery.md).
Branch: `fix/23-private-download-delivery`, base `af89dff`.
Owner-authorized implementation/automated verification/PR on 2026-11-05.

## Implemented

- Java SDK 2.5.0 `Cloudinary.privateDownload` replaces premium AuthToken/CDN
  generation. Explicit authenticated delivery type, resource endpoint, inline
  disposition and epoch-second expiry; same default 60-second TTL/DTO.
- Premium token configuration/validation/key requirement removed from the active
  application and test configuration. Existing API credentials are sufficient
  for local signing; no dependencies added and no credentials inspected.
- JWT, ownership, record/asset association, ATTACHED-state and delivery-type gates
  retained. A configured-cloud identity check prevents issuing from another
  cloud. Signing failures retain no SDK exception cause or public fallback.
- Download-URL response explicitly marked `no-store, private`.
- New raw PDF public IDs include `.pdf` at reservation time. That exact public ID
  is used for upload, privateDownload, Admin lookup, reservation probing and deletion.
  Provider upload/probe/adoption responses must match the durable identity triplet.
  Unknown/mismatched outcomes remain reserved for reconciliation; unrelated
  provider IDs are never silently adopted or deleted.
- Raw privateDownload omits a conversion format and sends the exact stored ID.
  Historical IDs remain unchanged, including extensionless raw records. Images
  use their validated original JPG/JPEG/PNG/WebP/GIF format; no transformations
  or forced PNG. Provider URLs are stored unchanged without suffix fabrication.
- Reserve-first recovery, leases, retries and durable cleanup remain in place;
  the scheduled full-inventory dry-run reconciliation was removed as unnecessary.
  No schema or historical asset migration.
- React's View flow and DTO stay unchanged. Parameterized UI tests cover raw/image
  API download URLs. Legacy/external and public managed links remain compatible.

## Automated verification

All provider calls in application regression tests are mocked. Real-SDK signing
uses public synthetic vectors with explicit credentials and no Upload/Admin/CDN
client call. Independently recomputed SHA-1 API signatures verify exact public ID,
format, delivery type, expiry and attachment fields; cloud/resource endpoint
selection is checked separately (these endpoint components are not signature
query fields). Tests cover metadata/foreign-cloud rejection, TTL boundaries,
SDK checked errors, missing API secret, sanitized failures and no log disclosure.

| Check | Result |
| --- | --- |
| Java 21 full H2 regression/package/coverage, `./mvnw -o -B -ntp clean verify` | PASS, 265 tests, 0 failures/errors/skips; JAR and coverage generated; exit 0 |
| Frontend `npm run typecheck` | PASS, exit 0 |
| Frontend `npm run lint` | PASS, exit 0 |
| Frontend `npm run test` | PASS, 601 tests / 43 files, exit 0 |
| Frontend `npm run build` | PASS, exit 0 (existing bundle-size/Zod annotation warnings) |
| `E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium` | PASS, 146 functional tests, exit 0 |
| Required CI `backend`, `backend-postgres`, `frontend`, `e2e-chromium` | Exact final-head results/links recorded on the implementation PR and Issue #23 |

PostgreSQL 17 full-suite execution is provided by the existing disposable
`backend-postgres` CI job, not a shared/local production database. No Firefox,
WebKit, branded Chrome/Edge or screenshot-baseline changes were requested/run.

Local verification corrected an old fixture that returned a client-named provider
ID instead of echoing the reservation, aligned response fixtures with the documented
`type` field, and updated old raw-URL suffix expectations. The first build also
encountered duplicate stale class artifacts and later interrupted-run JaCoCo data;
a clean final verification replaces generated artifacts. Loopback tests required
sandbox escalation; no test bypass or disabled assertion was used.

## Deployment and confidentiality are not accepted by this PR

`CERTIFICATE_DELIVERY_ENABLED` remains **default false**. No deployment, merge,
flag change, provider asset access or live validation occurred. Therefore current
production/new uploads retain the pre-existing public behavior until separately
authorized activation. Historical public managed URLs remain explicitly supported
pending manual handling under #20. Existing public access is not solved by merging default-off
code. **Issue #23 must remain open.**

The owner abandoned all further pilot/provisioning work; the pilot tooling and
plan documents were removed from the tree. No pilot framework, paid feature or
test cloud was used.

The implementation follows the documented raw extension-bearing identity and
original-byte request model. The SDK's omitted raw format, provider resolution of
old extensionless IDs, actual unsigned/tampered/expired denial, PDF/image MIME,
disposition/range/browser rendering and account delivery settings are **not live
verified**. Ordinary CDN signed URLs are not expiring access. API download URLs
are bearer links until expiry; downloaded copies cannot be revoked by URL expiry.
Cloudinary documents uncached API delivery with twice the bandwidth, plus Free
PDF delivery restrictions. No automatic public/CDN fallback is allowed if the
provider refuses access. These practical limits remain visible in #23 rather
than being described as proven confidentiality.

## Acceptance still outstanding (canonical #23; historical assets are handled manually under #20)

- Review/accept the implementation and authorize merge separately.
- Separately authorize deployment/activation and assess the live provider
  behaviors/settings above; do not infer them from SDK or mocked tests.
- Any historical public managed asset is handled manually by the owner under #20
  (the automated migration framework was abandoned); preserve external-link policy.
- Resolve permanent public exposure before closing #23 as a verified security fix.

## Provider references

- [Temporary API downloads](https://cloudinary.com/documentation/control_access_to_media#providing_time_limited_access_to_private_media_assets)
- [Raw public IDs and authenticated uploads](https://cloudinary.com/documentation/upload_parameters)
- [Upload/download API reference](https://cloudinary.com/documentation/image_upload_api_reference)
- [Free PDF delivery policy](https://cloudinary.com/documentation/image_delivery_options)
