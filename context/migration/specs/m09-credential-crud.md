# M09 — Credential CRUD

**Status: ACCEPTED — owner automated and read-only live acceptance passed; live PostgreSQL CRUD writes explicitly deferred to M09-W01.**
**Branch:** `feature/react-credential-crud` (owner-approved replacement for outline branch).
**Baseline:** main = origin/main = 24ab6c0b49d3569d529c2e30017c1fff5e87b369; M08 and T01 integrated.
Owner authorized final documentation, fast-forward integration into main, normal push and safe merged-M09 branch cleanup. Deployment, backend/Angular/database changes and M10 remain unauthorized. See [M09-W01](../follow-ups/m09-w01-postgresql-crud-acceptance.md) for the explicitly deferred live-write follow-up; acceptance does not claim those writes were tested.

## Approved scope and source audit
Angular references: features/credentials (page, form/dialog, utilities/styles), credential-detail-drawer and container, drawer.mappers, dashboard helpers, credential.service. Backend references: CredentialController, CredentialRequestDto, CredentialResponseDto, CredentialServiceImpl, Credential entity and GlobalExceptionHandler. Existing React M05/M06 APIs, query/session infrastructure and M08 dashboard are reused unchanged.

Preserve list/cards, 250 ms trimmed name/organization search, status/type chips and Clear, expiry ascending, create modal, independently fetched detail drawer, inline edit/cancel, delete confirmation warning of linked CE deletion, dates/status/renewal/progress/linked CE summaries, loading/error/Retry/empty states, both themes and responsive layout. Cards: two columns >1200px, one otherwise; shell mobile <=768px; drawer full width <=640px. Accessible labels, pressed chips, 44px targets, keyboard focus/restore, page title. Reuse one credential form/dialog from dashboard Add Credential. No new sorting, pagination or libraries.

Owner-approved boundaries: linked CE summaries only; no CE creation/edit/detail controls until M10. Dashboard Add CE remains deferred. Report links retain protected `/credentials/:id/ce-report?returnTo=%2Fcredentials` and existing M11 placeholder. Background refresh errors keep loaded data plus nonblocking Retry. Initial failures show error/Retry. Delete errors stay inside confirmation. All save/delete operations block duplicate submission and dismissal while pending.

## Forms
React Hook Form + existing Zod resolver. Trimmed nonblank name/organization, max 180 each; required LICENSE/CERTIFICATION; real date-only value (past allowed); finite integer renewal >=1; finite requiredCEHours 0..999.99, <=2 decimal places. Preserve number input step 0.5 but no half-hour business restriction. Failed submissions retain values and show errors. Cancel restores detail or resets create. No backend validation/schema change.

## API contract
Existing credentialsApi only; bearer auth owned by transport, never send userId. GET /credentials accepts status/type/search and returns a bare credential array; GET /credentials/{id} returns independent detail with nested ceRecords. POST six-field CredentialRequest ->201 CredentialResponse; PUT /{id} same payload ->200; DELETE /{id}->204 empty. Request: name,type,issuingOrganization,expirationDate,renewalCycleMonths,requiredCEHours. Response adds id,status,ceHoursEarned,ceProgress,ceRecords. Nested CE records lack credentialId. Do not fetch relationship/report APIs for summaries.

Validation 400 uses {status,error,message,timestamp}, unstructured semicolon-joined messages; unauthenticated 401, foreign/missing 404, forbidden 403, unexpected 500. Malformed IDs/enums/JSON may reach generic 500. No pagination/concurrency version. Backend status: expired before server today, expiring through +90 inclusive. Client labels use local-midnight ceil day calculations; server/browser date mismatch and DST behavior preserved. Progress is server ratio capped at 100%; no CE required displays Complete. CE rows sorted completion descending on copies. Credential delete cascades CE rows; no explicit asset cleanup in this service path. No backend quirks fixed.

## Query/session contract
Raw DTOs only under existing keys; query functions forward signal. Keep 30s list/dashboard, zero detail freshness, HTTP 5xx-only twice retry, mutations never retry. No optimistic updates or mutation cache seeding. Successful current-session creates/edits invalidate all filtered lists/dashboard/affected credential prefix incl. nested records/report. Deletes cancel/remove deleted credential cache and known CE detail cache, invalidate lists/dashboard and CE detail root when enumeration cannot be complete. Failed writes do not invalidate.

Capture session at operation start; guard before deferred dispatch and every deferred UI/cache effect with captureSession().isCurrent(). Reset locally held forms/dialogs/selection/errors on session replacement, including mounted A->B and same-account reauthentication. Query cache reset alone is insufficient. Late old-session success/error/401 cannot affect replacement session; server writes already sent cannot be undone.

Deep link `/credentials?credentialId=<id>` opens regardless of filters, then consumes only credentialId with replace preserving other query params/hash. Repeat links, missing resources, legacy redirects, login restoration and session changes must be tested.

## Acceptance criteria (Given/When/Then)
1. Given authenticated data, page/card fields and expiry ordering match source; search debounces 250ms, filters combine and Clear cancels pending search.
2. Given initial loading/failure/empty/no-match, show distinct accessible state; Retry recovers. Given background failure, keep loaded data with Retry.
3. Given valid create/edit, send exact normalized payload once, close/reset modal or exit edit on success, invalidate all dependencies; invalid values send no request and show field errors. Failed save retains values; cancel restores values; pending blocks dismissal/duplicates.
4. Given delete, confirmation warns of linked records, failed delete stays visible; success closes drawer, removes deleted cache references and refreshes list/dashboard.
5. Given detail ID independent of filters, fetch correct detail and show metadata/progress/ordered CE summaries; failures have Retry and close.
6. Given deep link or legacy/login redirect, consume only credentialId with replace; preserve other query/hash and support repeated navigation and missing IDs.
7. Given logout/account replacement or delayed mutation response, no old data/form/selection/error appears or enters cache; request reads abort; each create/edit/delete guard has a regression test.
8. Given dashboard, Add Credential uses same modal and refreshes dashboard after successful save. M10 controls absent; M11 report route remains protected.
9. Given 375/768/769/1280 widths and either theme, no horizontal overflow; keyboard opens/closes overlays with focus restoration; delete has safe initial focus and pending trap.

## Verification and file plan
Feature-local page, card, filter, view mapper, query/mutation hooks, form schema/form/dialog, detail drawer/delete dialog and session-boundary modules plus tests; credential fixtures and e2e/credentials.spec.ts. Update router/preview and dashboard integration. Minimal existing fixture/navigation/auth/deep-link assertions updated, never weakened. No new dependencies or snapshot regeneration.
Agents: targeted Vitest feature/affected files, npm run typecheck, npm run lint, npm run build, focused Playwright --project=msedge. Owner: full unit/four-browser regression, Edge/macOS visuals, live isolated-backend acceptance. No live backend requests in agent verification. Record exact exits/failures/limitations in verification/m09-report.md; update tracker/inventory/handoff/current-feature. Owner automated acceptance passed (490/490 unit, 504/504 browser/visual, typecheck/lint/build, production audit 0); live acceptance/integration remain pending.

## Implementation handoff — 2026-11-02

Implemented on the authorized branch; feature checkpoint `3b2a6c1a35754a4d551a49bd5ddd4e0717dee653`; documentation checkpoint recorded separately in branch history. Query reads share `use-credentials.ts`; one operation-discriminated `use-credential-mutation.ts` covers create/edit/delete, each with separate race tests. A feature-local session boundary remounts local UI on invalidated session guards without changing M06. The delete confirmation composes AppModal; no shared overlay implementation changed. Exact file inventory, failures/fixes and checks: `../verification/m09-report.md`. Final owner automated acceptance passed; theme fixture, unit cleanup and Playwright close-focus corrections resolved. Live acceptance/integration pending; no merge or completion claim.
