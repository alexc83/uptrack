# M05 verification report

Status: **Verified — blocker diagnosed and corrected with explicit human approval; implementation/results approved; exactly two local commits authorized.** Full audit remains FAIL with the 16 deferred development findings; production audit is zero. Initial failures are preserved below, followed by current remediation results.
Date: 2026-11-01. Agent: OpenAI Codex. Branch: `feature/react-api-layer`.
Base: `249603f8a10eeda26e3d4ae55e7d099aea003fe0`. Application commit: `ac720664bf05bfc28f626fbd5f490315a9b9cd55`. The immediately following authorized documentation commit contains this report; neither M05 commit is merged or pushed.
Specification: `../specs/m05-typed-http-and-server-state-foundation.md`, expanded to READY before application edits, following explicit approval of the clarified plan. Acceptance criteria are unchanged.

## Scope and repository evidence

Before branch creation: main, origin/main and live `git ls-remote` all matched the expected base; no staged/tracked changes. M04 was merged and pushed (`9440d21`, `b47bd42`) with merge-status correction `249603f`. Created only the approved `feature/react-api-layer` branch.

Exact approved **48-file** inventory (original 47 plus explicitly approved shell-test correction): [changed-files.txt](m05-evidence/changed-files.txt). It contains 22 new production files, 10 new test/fixture files, 6 modified React files, 9 modified documentation files and 1 new inventory document. The pre-existing M05 report was an outline, not a historical completed report. The only inventory expansion is the human-approved `frontend-react/src/shared/layout/app-shell.test.tsx` correction described below. The inventory excludes the unrelated duplicate and all generated output.

The unrelated untracked `frontend-react/src/test/render-with-providers 2.tsx` remains unchanged/excluded. SHA-256 before/after: `2f36e1df2c7944be1f8a8c7e36770d6645b714cf7cd8a186aefb667aa11d8f3b`. It matched the original tracked helper at entry. The tracked helper now deliberately uses the isolated QueryClient factory; do not overwrite the duplicate with it.

Protected diff checks confirm no changes in Angular, backend, dependency manifests/lockfile, historical M01–M04 reports/evidence/baselines, M04 browser specifications/goldens, shell/theme implementation or router. The sole M04 unit-test change is the explicitly approved focused shell test correction. Generated dist/test-results/node_modules are ignored and excluded. No installs, database access, hosted-backend contact or deployment. Local browser verification server stopped afterward.

## Architecture and contracts implemented

- Native Fetch factory and inert default client; configurable VITE_API_BASE_URL (default /api), existing local proxy untouched. Injectable Fetch for deterministic tests. No transport retry or automatic request on imports/construction/provider/auth registration.
- Relative resource confinement to configured HTTP(S) origin/base path; rejected escapes/inline query/hash/invalid credentials in config. Query encoding preserves Unicode/reserved characters/0/false, omits null/undefined/empty strings. JSON and native FormData remain distinct; browser sets multipart boundary. Authorization is constructed only by transport; redirects blocked, credentials same-origin.
- JSON mode versus explicit void mode; unexpected empty/malformed JSON success is a response-contract failure retaining status. HTTP failure retains actual status despite malformed/non-JSON body; backend flat string message retained, raw/parsed details unknown. Network status 0 does not contain raw request material. DTO generics are compile-time descriptions, not runtime validation.
- Original abort rejection/reason preserved before/in flight/while reading response, including custom reasons and readers that resolve after abortion. No network wrapping, retry or stale unauthorized notification. Query functions consume context.signal; TanStack cancelQueries/final observer removal owns abort/revert/CancelledError. Independently aborted Fetch remains native cancellation.
- Optional synchronous token/callback registration has identity-safe cleanup and per-request token lookup; no storage/JWT/session/redirect effects. Public login/register/health never consult/inject token or notify. Late protected 401 requires same registration and unchanged token. M06 must register replacement sessions and own session generation/cache clearing; no token refresh implemented.
- 19 dormant typed bindings: auth 3, credentials 7, CE records 4, dashboard 1, upload 1, users 3. Arrays, caller ownership, 404 inaccessible-resource behavior, requiredCEHours, raw ratios, string UUID/date/time and nullable certificate fields preserved. Filter whitelist status/type/search; no userId or pagination/sort parameters. No CE flattening adapter or feature hooks. Upload uses multipart file part.
- Existing provider hierarchy and single production QueryClient retained. Only HTTP 500–599 retries twice (3 attempts); all other error categories and mutations have no retry. Global list/dashboard freshness 30 seconds; detail/report/auth/profile prefix defaults zero. Other defaults unchanged. M02 keys preserved; explicit invalidation helpers cover list variants, dashboard, affected credential prefixes/CE detail IDs. No optimistic updates/session clearing.

M02/M03/M04 discrepancies and approved resolutions are recorded in the M05 spec and current architecture/parity docs: broad prior retry predicate narrowed to M02, detail freshness corrected, public 401 exception clarified, fixture output redirected away from historical evidence, source URLs excluded from API blocking. No original M02 spec or historical report rewritten.

## Initial command results (before blocker correction)

Commands executed from `frontend-react/`. This table preserves the original verification attempt. It is superseded for current disposition by the post-correction results below; original failures are not erased.

| Command | Result | Exit | Evidence / count |
|---|---|---|---|
| npm run typecheck | PASS | 0 | Strict TypeScript project check; final repeated after code completion |
| npm run lint | PASS | 0 | ESLint including existing JSX accessibility rules |
| npm run test | **FAIL** | 1 | 176 pass / 1 fail, 18 files; unchanged M04 mobile Escape test; `/tmp/uptrack-m05-unit-default-final.log` |
| npm run test -- --run | **FAIL** | 1 | 176 pass / 1 fail, same test; `/tmp/uptrack-m05-unit-final.log` |
| npm run test -- src/shared/layout/app-shell.test.tsx | PASS diagnostic | 0 | 3/3; preserves original tests |
| npm run test -- --run --maxWorkers=1 | PASS diagnostic | 0 | 177/177, 18 files, 7.20 s; `/tmp/uptrack-m05-unit-serial.log` |
| npm run build | PASS | 0 | 1905 modules; main JS 498.88 kB / gzip 159.09 kB, CSS 95.35 kB; ignored dist only |
| npm run e2e | PASS | 0 | 42/42, 36.1 s, zero retries; `/tmp/uptrack-m05-e2e-final.log` |
| npm audit | **FAIL — deferred advisories** | 1 | 16 vulnerabilities: 14 moderate, 2 critical; `/tmp/uptrack-m05-audit.log` |
| npm audit --omit=dev | PASS | 0 | Found 0 vulnerabilities; `/tmp/uptrack-m05-audit-production.log` |
| git diff --check | PASS | 0 | Whitespace checks |
| protected-path git diff --exit-code | PASS | 0 | Angular/backend/manifests/lockfile/historical reports/evidence/goldens unchanged |

Audit recapture initially hit sandbox DNS ENOTFOUND (exit 1, **BLOCKED**, not a vulnerability result); reran with approved network access to npm registry, producing the audit results above. This registry access is not hosted-backend access. No audit fix command executed.

## Unit/integration matrix

Eight new test files add **145** cases to the existing **32** M03/M04 cases (total 177): api-url 22, api-fetch 40, api-auth 19, api-modules 23, query-client 19, query-keys 2, invalidation 3, api-query integration 17.

- URL/body/headers: all four methods and 19 endpoint bindings, default/absolute configured base confinement, encoded IDs, Unicode/query specials, 0/false/absence, no invented userId/page/size/sort, invalid paths/bases/body/serialization rejected before Fetch.
- Response: void 204/205/200 without parsing; empty/whitespace/malformed successful JSON/unexpected 204; valid JSON including null and unexpected DTO shape; status authoritative over error-body status; flat validation text and JSON/non-JSON/malformed/empty error bodies. 400/401/403/404/409/429/500/502 covered. Known-status body reader failures preserve HTTP/response classification; network errors sanitized.
- Cancellation: original signal forwarded; abort before dispatch (zero calls), during Fetch, native AbortError without supplied signal, custom reasons, abort while reading, ignored abort followed by reader resolution, no 401 notification on aborted body. TanStack cancelQueries with/without cached state and final-observer removal abort and revert without query error; independent abort remains distinguishable/non-retryable.
- Auth: inert registration, no adapter/missing token, per-request changes, owned Authorization, public and encoded-public exclusion, idempotent/identity-safe cleanup, replacement/new-registration/token-change/cleanup late-401 suppression; current protected 401 notifies once, other statuses never notify, notification exceptions preserve original HTTP error. Invalid target rejected before credential lookup.
- Query: HTTP 500/502 exactly three attempts including HTML error body; 4xx/network/empty/malformed/unexpected-204/abort once; mutation once; unknown/programming failures non-retryable predicate. Freshness prefixes and one shared provider preserved. Normalized equal filters/different keys, all required invalidations and unaffected auth/profile caches tested. Credential report is reached via credential prefix. No runtime pagination envelope introduced; M10 client pagination remains future work.
- Dormancy: fresh module imports/QueryClient construction/adapter registration produce no Fetch calls; auth binding does not persist returned tokens. Synthetic fixtures only, no real records/secrets.

## Browser and visual evidence

Edge **156.0.4314.58**, macOS/darwin. Native browser suite covers JSON/headers/query encoding; FormData actual boundary/file part/filename; 204/empty/malformed responses; 400/401/403/404/409/429/500/502 flat errors; pre-abort identity and in-flight abort; confined target and refused external redirect; delayed protected 401 after adapter replacement; inert imports/registration and no token storage. API fixtures explicitly intercept localhost; unmatched API and external requests are blocked. Java/DB/Cloudinary services were not started or needed.

All **34 existing M04 browser tests** and **8 visual golden comparisons** pass unchanged. Existing coverage includes desktop 272/88 px sidebar, mobile ≤768 px, 769 px transition, independent main scrolling, keyboard/focus return, nested overlays, Escape/backdrop dismissal, theme/pre-paint/storage fallback, reduced motion and shared component states. Original M04 fixtures assert zero root /api requests and no uncaught page errors. Business preview pages/providers remain inert.

New captures: ignored `frontend-react/test-results/evidence/`, including shell light/dark desktop expanded/collapsed, 375/768 navigation, modal/drawer/form/state screenshots and nested-overlays.png; browser.json records engine/platform. Original eight goldens under `frontend-react/e2e/visual.spec.ts-snapshots/` and M04's approved M01 comparison notes/evidence remain byte-for-byte unchanged. No baseline update flag used. The M05 check is a regression comparison to these approved M04 goldens, not a new claim of cross-feature Angular parity. Current logs/captures are local, disposable evidence; this report and inventory provide the durable record without committing generated outputs.

Other browsers/OS, manual screen-reader verification, live backend/isolated DB API runtime and successful Cloudinary upload: **NOT RUN**, outside M05 fixture scope. No M13 parity or deployment claim.

## Initial failures, interventions and unresolved gate (resolved in follow-up below)

1. Initial full browser run failed before fixture tests because the M04 helper matched /src/core/api source imports as API traffic: 8 failures / 1 interrupted / 33 not run, stopped with exit 130. Corrected only the approved helper: root /api matching and source requests excluded. New captures redirected to ignored output, preserving historical M04 evidence. Focused 8/8 and final 42/42 pass.
2. During final full parallel unit verification the unchanged M04 test **“uses mobile through 768 and restores saved desktop collapse above it”** fails at app-shell.test.tsx:29: drawer remains after keyboard Escape. Focused shell 3/3 and full single-worker 177/177 pass; default parallel runs still fail (including after browser testing completed). This is consistent with scheduling-sensitive behavior but the root cause is **not established**. No test assertion, timeout, shell/overlay logic or acceptance criterion changed to force a pass. No further speculative retries/fixes attempted. Default test gate remains **FAIL**, M05 not Verified. Changes outside the approved 47-file inventory need approval before investigating/fixing preserved M04 tests or overlay code.
3. Audit registry recapture needed sandbox-network escalation; completed successfully with results above. Full audit remains FAIL due to deferred advisories, not “passed”.

## Dependency and security carry-forward

Manifests/lockfile unchanged; Zod 4 and Flowbite deepmerge-ts **8.0.2** override retained. Full audit has 16 dev-tooling findings (14 moderate/2 critical), production zero. Advisory roots: @vitest/mocker (GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8), minimatch (GHSA-g3hv-75wg-m249), tinypool (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr). Do not run breaking/forced fixes under M05 authorization.

**Mandatory M06 prerequisite:** @hookform/resolvers 3.10.0 with installed Zod 4.6.7 cannot correctly turn invalid inputs into RHF field errors. Reproducible probe: `zodResolver(z.object({name:z.string().min(1)}))`; valid name resolves; empty name rejects with ZodError exposing issues while resolver expects errors. Original M04 report preserves the reproduction; M05 planning independently confirmed it with an in-memory probe. No auth form, custom resolver or dependency workaround implemented. A separately approved dependency change and valid/invalid async compatibility verification are required before M06 forms.

Raw error details may contain server data: callers must not log/display them blindly or render HTML. Transport performs no logging and stores no tokens. TypeScript does not validate untrusted responses. Configured API origin is trusted configuration; redirects/per-call target escapes are disallowed. Real backend behavior is source-audited, not newly proven by fixture success.

## Current acceptance criteria disposition (after approved correction)

| ID | Result | Evidence |
|---|---|---|
| AC1 | PASS | 19 binding cases plus wire/filter invariants |
| AC2 | PASS | URL/query/body tests; native JSON browser fixture |
| AC3 | PASS | void/empty/204/malformed JSON unit and browser tests |
| AC4 | PASS | status/error/body matrix and network sanitization |
| AC5 | PASS | abort/body-read/query cancellation cases and native abort fixture |
| AC6 | PASS | registration/public/late-401/origin/redirect tests; source review |
| AC7 | PASS | actual 5xx 3-attempt integration; other categories/mutations no retry |
| AC8 | PASS | freshness/key/cache tests, invalidation prefixes/affected IDs |
| AC9 | PASS | all 177 unit tests pass in five default runs; native/browser 42/42 and all eight visual comparisons pass |
| AC10 | PASS | inert imports/previews, protected diffs, duplicate hash and exact approved 48-file inventory; test-only expansion approved |
| AC11 | PASS | type/lint/test/build/E2E pass; full audit FAIL with deferred findings and production audit PASS recorded accurately; no fixes/dependency changes |
| AC12 | PASS | documentation, exact outcomes/limitations and review stop recorded |

## Review and next action

Initial decision was BLOCKED; the approved investigation and test correction below resolve that gate. M05 is Verified; the human approved implementation/results and exactly two local commits with the following messages. Merge/push/deployment/branch deletion/M06 remain unauthorized:

- `feat(react): add typed HTTP and query foundation`
- `docs(migration): record M05 verification and handoff`

## Verification-blocker investigation — follow-up

Scope: investigate/remediate the existing M04 Escape blocker on the same branch; no commit/push/merge/deployment/M06 authorization. Approved M05 transport/DTO/query/auth code remains unchanged.

### Root cause established

The original assertion is `await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())` at `src/shared/layout/app-shell.test.tsx:29`, after one `user.keyboard('{Escape}')`. The test assumes Escape always reaches the drawer, but the drawer schedules its initial focus in requestAnimationFrame (`use-overlay-layer.ts`). The first focusable element is the sidebar theme button, wrapped by a Flowbite Tooltip (`sidebar-header.tsx`). Flowbite Floating uses useFocus to open the tooltip; Floating UI useDismiss consumes Escape via stopPropagation when that tooltip is open. The drawer's own Flowbite Escape listener is a document-bubble listener and therefore does not see that key event. First Escape closes the tooltip; a subsequent Escape can close the drawer. The old assertion does not model the nested tooltip state.

Temporary instrumentation inside the already-approved render-with-providers helper traced window/document keydown propagation and Event.stopPropagation. A failing full-suite trace showed Escape targeting the connected, non-inert “Switch to dark mode” button; window capture received it, document bubble did not, and the drawer remained. Waiting for the next animation frame reproduced the same failure in the isolated 3-test shell file (2 passed/1 failed, exit 1), with the tooltip open and the stack proving:

```
KeyboardEvent.Event.stopPropagation
SyntheticBaseEvent.stopPropagation
@floating-ui/react/dist/floating-ui.react.mjs:2620
```

That installed source line is useDismiss's closeOnEscapeKeyDown; Flowbite Floating's focus interaction opens the tooltip, and Flowbite Drawer's document keydown listener closes the drawer only if Escape bubbles to it. This demonstrates the causal event chain rather than merely attributing it to load. Temporary frame waiting emitted an act warning during diagnosis; it is not a proposed fix. All instrumentation and frame waits were removed and the helper restored byte-for-byte to its pre-investigation M05 contents.

No evidence supports leaked DOM/listeners, shared QueryClient state or an M05 transport/provider regression as the cause: the event reaches the correct connected drawer child; it is consumed by its open tooltip. Full-suite scheduling changes whether the focus frame has already run, but the same failure can be forced in isolation by allowing that frame. The application follows nested Escape dismissal. A drawer-listener override or timeout increase would mask the actual interaction.

### Approved minimal correction and scope gate

The human explicitly approved modifying `frontend-react/src/shared/layout/app-shell.test.tsx`: await the initial focus/tooltip state; assert first Escape hides the tooltip while the navigation dialog remains open; assert second Escape closes the dialog and restores opener focus; retain all 768/769 px and saved-collapse assertions. This adds regression coverage instead of weakening the existing drawer-close expectation. No application behavior changes are proposed.

This file was outside the original 47-file inventory, so approval was explicitly requested and received before editing it. The approved inventory is now 48 files, recorded in the M05 spec/inventory. The correction is nine added lines in that test; no assertions were removed. It uses existing waitFor handling to observe actual focus and tooltip state, not arbitrary delays or increased timeouts. No application, dependency or worker-configuration edits. The tracked render helper was restored exactly after instrumentation. All post-correction checks below have completed.

Local diagnostic evidence: `/tmp/uptrack-m05-investigation-before.log` (normal suite 177/177, exit 0), `/tmp/uptrack-m05-escape-trace.log` (instrumented full suite 176/177, exit 1), `/tmp/uptrack-m05-escape-forced-frame.log` (isolated causal reproduction 2/3, exit 1). Normal repeated-suite outcomes are recorded below. These logs are temporary and not staged/committed.

### Unmodified-suite reproduction and post-correction stability

Before correction, three consecutive uninstrumented normal `npm run test` runs yielded PASS 177/177 (exit 0), PASS 177/177 (exit 0), then FAIL 176/177 (exit 1) at the same assertion. Evidence: `/tmp/uptrack-m05-investigation-repeat-{1,2,3}.log`. This establishes intermittent behavior independently of diagnostic instrumentation. Forced initial-focus-frame reproduction identifies the causal state transition in the isolated file; contention only influences when the state is reached.

After correction, the focused shell file passes 3/3, exit 0 (`/tmp/uptrack-m05-escape-correction.log`). No act warnings are present in the final normal-suite logs. Five consecutive default suites then pass with the normal Vitest worker settings, while build/browser checks also ran:

| Run / exact command | Result | Exit | Files / tests | Duration | Local evidence |
|---|---|---|---|---|---|
| 1 — npm run test | PASS | 0 | 18 / 177 | 2.05 s | /tmp/uptrack-m05-stability-1.log |
| 2 — npm run test | PASS | 0 | 18 / 177 | 2.06 s | /tmp/uptrack-m05-stability-2.log |
| 3 — npm run test | PASS | 0 | 18 / 177 | 2.11 s | /tmp/uptrack-m05-stability-3.log |
| 4 — npm run test | PASS | 0 | 18 / 177 | 2.18 s | /tmp/uptrack-m05-stability-4.log |
| 5 — npm run test | PASS | 0 | 18 / 177 | 2.64 s | /tmp/uptrack-m05-stability-5.log |
| npm run test -- --run | PASS | 0 | 18 / 177 | 2.55 s | /tmp/uptrack-m05-remediation-unit-run.log |

### Current full verification

| Exact command | Result | Exit | Evidence |
|---|---|---|---|
| npm run typecheck | PASS | 0 | tsc strict project check |
| npm run lint | PASS | 0 | ESLint including JSX accessibility rules |
| npm run test | PASS | 0 | Five consecutive normal runs above; no worker overrides |
| npm run build | PASS | 0 | 1905 modules, same main JS/CSS artifact hashes and sizes as initial M05 build; no production code change |
| npm run e2e | PASS | 0 | 42/42 in 37.9 s; `/tmp/uptrack-m05-remediation-e2e.log` |
| npm audit | **FAIL — deferred advisories** | 1 | 16 findings, 14 moderate/2 critical; `/tmp/uptrack-m05-remediation-audit.log` |
| npm audit --omit=dev | PASS | 0 | Zero vulnerabilities; `/tmp/uptrack-m05-remediation-audit-production.log` |
| git diff --check / inventory and protected-file checks | PASS | 0 | 48 approved files; duplicate unchanged; no staged changes |

All M05 transport/query/security/cancellation cases remain in the passing 177-test suite. Token-origin confinement, public-route exclusion and stale-401 safeguards pass. Browser native Fetch/FormData/cancellation fixtures and all 34 retained M04 browser tests pass; all eight unchanged goldens compare successfully. M04 preview fixture continues to assert zero API calls and no uncaught page errors. No backend connection was made. Browser evidence is in ignored `frontend-react/test-results/evidence/`; Edge/macOS limitations remain unchanged. Local server stopped automatically after the run.

### Pre-commit scope and Git disposition (verification snapshot)

Branch `feature/react-api-layer`, HEAD `249603f8a10eeda26e3d4ae55e7d099aea003fe0`. Forty-eight approved changed files: 33 new, 15 modified, all unstaged/uncommitted. The unrelated duplicate is a separate untracked item with the original SHA-256, untouched and excluded. Angular/backend/dependencies/lockfile/historical reports/M04 visual baselines unchanged. No temporary instrumentation remains, no test skips/timeouts/worker overrides, no production correction, no commit/push/merge/deployment/M06. No remaining verification blocker is known; five runs provide observed stability, not a guarantee against all future scheduling changes. Deferred dev advisories, resolver/Zod prerequisite and Edge/macOS/mock-only coverage remain.

## Authorized commit delivery

The human approved exactly two commits after accepting implementation and verification, including the focused M04 test correction:

1. `feat(react): add typed HTTP and query foundation` — ac720664bf05bfc28f626fbd5f490315a9b9cd55, 38 explicitly staged React files, including the nine-line test correction. Pre-commit staged-scope and whitespace checks passed; manifests/lockfile/Angular/backend/visual baselines unchanged; no generated output, duplicate or detected secret signatures included.
2. `docs(migration): record M05 verification and handoff` — the documentation commit containing this record, following the application commit. Only the 10 approved context documentation/inventory files belong here. A self-referential commit hash is intentionally not embedded in its own contents; resolve it with `git log`.

The 48-file inventory is unchanged by commit preparation. Earlier unstaged/uncommitted statements describe the preserved verification snapshot, not the current delivery state. Final post-commit checks must confirm exactly two commits relative to main, the committed diff equals all 48 inventory paths, no tracked modifications/staged files, and only the unrelated untouched duplicate remains untracked. No additional commit, merge, push, deployment, branch deletion or M06 authorization.
