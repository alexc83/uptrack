# M05 — Typed HTTP and server-state foundation

**Status: READY — clarified plan approved and implementation authorized by the human.**
**Branch:** `feature/react-api-layer`, from `main` at `249603f8a10eeda26e3d4ae55e7d099aea003fe0`.
**Prerequisite:** M04 merged and pushed (`9440d21`, `b47bd42`), merge-status correction `249603f`.

**Implementation disposition:** implemented and Verified; implementation/results approved; original 47-file inventory expanded to 48 after explicit human approval of the focused M04 shell-test correction. Five consecutive default unit suites and full browser/visual checks pass. See `../verification/m05-report.md`; original failures and causal diagnosis are preserved. Exactly two commits authorized with the approved application/documentation messages; no merge/push/deployment/M06 authorization.

## Authorization and scope

Implement and verify infrastructure only. Implementation stopped for review; the human subsequently approved exactly two local commits. Stop after those commits; no push, merge, deployment, branch deletion or M06 authorization. No dependency changes/installations, Angular/backend edits, hosted-backend contact, auth/session implementation, feature-specific query hooks, optimistic updates or UI integration. Preserve historical reports, M04 evidence and all eight golden images. Preserve/exclude untracked `frontend-react/src/test/render-with-providers 2.tsx` (initial SHA-256 `2f36e1df2c7944be1f8a8c7e36770d6645b714cf7cd8a186aefb667aa11d8f3b`).

## Audited source and discrepancies

Sources: backend controller mappings, request/response DTOs, SecurityConfig, JwtAuthenticationFilter, RestAuthenticationEntryPoint, GlobalExceptionHandler and service implementations; Angular core/api, services/models; M02 architecture/parity contract; M03/M04 specs/reports; React providers/router/theme/shared UI/tests and installed TanStack Query source.

- M02 permits only HTTP 5xx retries, failureCount <2. Existing M03/M04 predicate retries network/unknown errors too. Restore the approved narrow contract explicitly.
- Existing global staleTime=30s also reaches details/reports. Keep global list/dashboard 30s, add prefix defaults of zero for credential/CE detail/report (and auth/profile detail) per M02's default-freshness convention.
- A production QueryClient/provider already exists. Extract its initialization; retain exactly one application instance, optional injected test clients and the same provider hierarchy.
- Exact public exclusions in parity contract are login/register/health. Broader legacy 'all 401' prose/Angular interception does not override this: notify only non-public 401; M06 owns session effects.
- Backend lists are arrays, no pagination/sorting request contract. Credential filters: status/type/search only; no userId. CE list adapter/client pagination remain M10.
- Missing multipart file is explicitly handled as 400; historical wrong-content-type/malformed multipart 500s are distinct. Preserve actual statuses rather than rewriting the backend.
- M03's resolver compatibility narrative is contradicted by installed resolver 3.10.0/Zod 4.6.7: invalid values reject with ZodError (issues, not errors). Keep the mandatory M06 gate; no workaround.
- Lockfile versions, not historical report inventories, are authoritative. Preserve Zod 4/deepmerge-ts override and historical full-audit 16 deferred dev findings; re-audit without auto-fixing.
- M04 browser helper writes into historical evidence. Redirect new captures/metadata to ignored test output; leave M04 files/goldens untouched.

## Transport contract

Native Fetch, factory with injectable Fetch, environment base `VITE_API_BASE_URL` default `/api`; existing Vite `/api` proxy stays unchanged. No requests on imports/construction/provider initialization.

`ApiFetch` has JSON-mode generic Promise<T> and explicit empty-mode Promise<void> overloads. JSON default. Generic typing is compile-time only: no runtime DTO validation/coercion/schema. UUID/date/timestamp strings, numbers/ratios unmodified, certificate metadata nullable, exact requiredCEHours spelling.

Options: GET/POST/PUT/DELETE; scalar query values string/number/boolean/null/undefined; headers; signal; mutually exclusive json or FormData; response json/empty. Reject GET body, absolute/protocol-relative/escaping paths, inline query/hash paths and credential-bearing/invalid base URLs before dispatch. Normalize base/path slashes and encode query values with URLSearchParams, skipping only null/undefined/empty string (retain 0/false). IDs encoded in endpoint bindings. Resolve only under configured API origin AND base path. Block redirects (`redirect: error`); credentials same-origin, no cross-origin include. No transport retry/timeout/session logic.

Transport owns Authorization, strips caller authorization and excludes exact relative public paths `/auth/login`, `/auth/register`, `/health`. JSON gets application/json only when present; FormData sent unchanged with no manual Content-Type; Accept defaults application/json. Do not put request headers/bodies/tokens/URLs with credentials in errors/logs.

### Cancellation

Forward supplied signal unchanged. Already-aborted and in-flight aborts, including during body reading, preserve original rejection/reason, never ApiError(status=0), unauthorized callbacks or retries. Check signal after awaits. A native AbortError is not TanStack CancelledError. Query functions consume queryFn context.signal; TanStack cancelQueries/last-observer removal owns retryer cancellation, abort and prior-state restoration. Do not manufacture TanStack cancellation errors. Independent abort remains distinguishable and non-retryable.

### Responses/errors

- Expected empty success (204/205/other success in empty mode): undefined, no JSON parsing.
- JSON success: parse JSON (null is valid JSON, not proof of matching T). Empty/whitespace, 204 or malformed successful JSON in JSON mode: response-contract ApiError with actual HTTP status, never silently undefined query data.
- Non-2xx: HTTP ApiError, actual response.status authoritative. Try parsing body as JSON, retain unknown parsed/raw details; promote only nonempty string message; otherwise `Something went wrong. Please try again.` No invented fieldErrors map. Malformed/non-JSON error body does not erase status.
- Non-cancellation Fetch rejection: network ApiError status 0, `Unable to reach the server right now. Please try again.`
- Response-body read failure: retain known HTTP status; non-success remains http, successful unreadable body is response error. Cancellation takes precedence. No raw request material retained.

## Optional auth interface

ApiAuthAdapter: getToken(): string|null; optional onUnauthorized(ApiError):void. Registration returns cleanup; cleanup cannot remove a replacement registration. No storage/JWT decoding/refresh/redirect/session state or clearing. Default adapter absent. Read token per request, never for public routes. Notify a non-public 401 only if the same registration is current and its token is unchanged. Adapter callbacks are synchronous; errors in callback must not replace the original HTTP failure. M06 supplies actual auth callbacks and owns session-generation/cache-clear policy.

## Typed dormant endpoint bindings (19)

Auth login/register/me (3); credentials list/get/create/update/delete/getCERecords/getCEReport (7); CE get/create/update/delete (4); dashboard get (1); upload certificate (1); users get/update profile/changePassword (3). No automatic health probe or application binding to general GET /ce-records. All accept cancellation options; delete/password select empty mode. POSTs expect 201; other successful reads/updates 200; error statuses preserved. No form validation, client status/progress calculation, credential ownership guesses or feature hooks.

## Query contract

Factory creates one production QueryClient at existing providers module scope. Queries: staleTime 30s; prefix defaults zero for ['credential'], ['ce-record'], ['auth','me'], ['profile']; retry only ApiError(kind=http,status 500–599) while failureCount<2. All 4xx, network, response-contract, cancellation, programming failures: no retry. Mutations retry=false. Leave refetch/gc/networkMode/retryDelay defaults otherwise unchanged.

Keys: ['auth','me'], ['dashboard'], ['credentials', canonicalFilters], ['credential',id], ['credential',id,'ce-records'], ['credential',id,'ce-report'], ['ce-record',id], ['profile']; root prefixes available for invalidation. Filter normalizer whitelists status/type/search and omits absent/empty values without changing search semantics.

Invalidation: credential helper invalidates all credential lists/dashboard and affected credential prefixes (includes CE list/report). CE helper additionally invalidates affected CE detail IDs; old/new credential IDs supplied by future feature mutation. Credential-delete recipe invalidates CE-detail root when individual dependent IDs are unavailable. Helpers run only when invoked after successful future mutations. No automatic invalidation on failed writes, optimistic writes, hooks or session cache clearing. M06 must cancel/clear user-scoped cache when sessions change because keys omit user IDs.

## Exact approved inventory — 48 files (47 original + approved test correction)

New production (22):
- frontend-react/src/core/api/{api-config,api-fetch,api-error,api-auth,api-url,auth-api,credentials-api,ce-records-api,dashboard-api,uploads-api,users-api}.ts
- frontend-react/src/core/query/{query-client,query-keys,invalidation}.ts
- frontend-react/src/lib/dto/{common,auth,credentials,ce-records,dashboard,ce-report,uploads,users}.ts

New automated tests (10):
- frontend-react/src/core/api/{api-fetch,api-url,api-auth,api-modules}.test.ts
- frontend-react/src/core/query/{query-client,query-keys,invalidation}.test.ts
- frontend-react/src/core/query/api-query.integration.test.ts
- frontend-react/src/test/fixtures/api-fixtures.ts
- frontend-react/e2e/api-transport.spec.ts

Existing React modifications (6): src/app/providers.tsx; src/test/render-with-providers.tsx; src/vite-env.d.ts; e2e/helpers.ts; README.md; src/shared/layout/app-shell.test.tsx (all under frontend-react). The last file was explicitly approved during blocker investigation: await initial drawer focus and tooltip, assert first Escape hides tooltip, second Escape closes navigation, and focus returns. Existing breakpoint/collapse assertions remain. No application code or timeout changes for this correction.

Documentation modifications (9): context/current-feature.md; context/migration/{master-plan,architecture,parity-contract,feature-inventory,migration-status,agent-handoff}.md; context/migration/specs/m05-typed-http-and-server-state-foundation.md; context/migration/verification/m05-report.md.
New documentation (1): context/migration/verification/m05-evidence/changed-files.txt.
Any additional file/architecture change requires human approval before expanding scope. Runtime logs/images go only to ignored test output or temporary storage.

## Implementation stages and gates

1. Verify Git/duplicate, create branch, record READY spec before application edits (approved).
2. DTOs, URL builder, errors, Fetch transport and optional adapter; focused transport tests.
3. Dormant typed bindings; endpoint/method/payload/signal tests.
4. Query defaults/keys/invalidation; retry/freshness/cancellation/cache tests, one provider preserved.
5. Native browser Fetch fixtures + M04 regressions; zero preview API traffic, untouched visual baselines/evidence.
6. Run all required checks, record evidence/limitations/inventory, update tracker/handoff; stop before commit.

## Test matrix and measurable acceptance

| ID | Required result |
|---|---|
| AC1 | GET/POST/PUT/DELETE methods/URLs/body/headers correct for all 19 bindings; arrays/nullable metadata/raw ratios retained; no userId/page/size/sort inventions. |
| AC2 | Query scalars encoded including Unicode/reserved chars/0/false; absent/empty omitted; invalid URLs/body/config rejected before Fetch. |
| AC3 | Expected 204/empty success -> void; JSON empty/whitespace/204/malformed -> response error; valid/null JSON parsed; no undefined query data. |
| AC4 | 400/401/403/404/409/429/500/502 preserve actual status and unknown details; JSON/non-JSON/empty/malformed error bodies safe; flat validation message unchanged; network failure is status 0. |
| AC5 | Pre-abort/in-flight/custom reason/body-read abort propagate original cancellation; no network wrapping/401 callback/retry; query-owned cancellation aborts Fetch and restores state. |
| AC6 | Adapter registration/cleanup/replacement/missing tokens/public exclusions/origin confinement/redirect blocking/late 401 guards pass; no storage/auth/session logic/logged secrets. |
| AC7 | HTTP 5xx max 3 attempts; 4xx/network/response/cancel/programming failures one attempt (or zero if pre-aborted); mutations one attempt. |
| AC8 | Lists/dashboard fresh 30s; details/reports default zero; equivalent filters share keys, distinct filters separate caches; invalidation affects all required variants/contexts, not unrelated auth/profile. |
| AC9 | Native browser Fetch/FormData/cancellation fixtures pass without Java/DB/Cloudinary/hosted backend; M04 32 unit + 34 browser tests and all 8 visual comparisons remain passing with zero preview API traffic. |
| AC10 | No import/provider/adapter-registration requests; no historical report/evidence/baseline/dependency/Angular/backend/duplicate changes. Exact approved 48-file inventory matches actual diff (including the explicitly approved test-only expansion). |
| AC11 | typecheck/lint/test/build/e2e pass; audits recorded honestly; no silent production-security regression; no forced fixes. |
| AC12 | Report/tracker/handoff document exact commands/exits/counts/evidence, failures/fixes, remaining M06 resolver gate, Edge/macOS limitation; stop for review with no commit/push/merge/deploy/M06. |

Tests use injected Fetch/Response fixtures, fresh QueryClients and native browser Fetch with Playwright route interception. No extra dependencies or backend/DB service required. Separate API-browser fixture allows only explicitly mocked API traffic; M04 fixture retains zero-API assertions. Postman skill consulted: no workspace/bootstrap/artifact expansion needed for the approved fixture-based local checks.

Commands from frontend-react: npm run typecheck; npm run lint; npm run test; npm run test -- --run; npm run build; npm run e2e; npm audit; npm audit --omit=dev. PASS/FAIL/BLOCKED/NOT RUN with command/exit/count/evidence; full audit remains FAIL if deferred tooling advisories remain. No claim of live backend parity from mocks; no screen-reader/other-engine coverage claim.
