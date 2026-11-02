# M09 Credential CRUD — implementation and targeted verification

**Status: AUTOMATED ACCEPTANCE PASSED — checkpoint; live-backend acceptance and integration PENDING. Not merged or complete.**
Agent: OpenAI Codex. Date: 2026-11-02. Branch: `feature/react-credential-crud`.
Initial baseline/HEAD/main/origin/main: `24ab6c0b49d3569d529c2e30017c1fff5e87b369` (no commits made).
Owner accepted the planning report and authorized implementation/spec promotion, the branch override, validation/storage limits, M10/M11 deferrals, background-data retention, targeted tests and minimal existing-test changes. No integration permission.


## Final owner automated acceptance and checkpoint — 2026-11-02

M09 automated acceptance **PASSED** (owner: unit **490/490**, Playwright **504/504** including Edge/Chrome/Firefox/WebKit and Edge visuals, typecheck/lint/production build PASS, `npm audit --omit=dev`: **0 vulnerabilities**). Branch `feature/react-credential-crud`; feature checkpoint `3b2a6c1a35754a4d551a49bd5ddd4e0717dee653`. **Live-backend acceptance and integration remain pending; M09 is not merged or complete.** Two checkpoint commits authorized; push, merge, deployment, database changes and M10 are not authorized.

These final owner-supplied results supersede earlier intermediate failures and pending automated-rerun statements below. Earlier investigation sections are historical snapshots, retained for evidence. The agent reviewed the final implementation/diff and repository state in this checkpoint pass; the agent did not rerun the owner's full suites.

| Owner check | Final result |
|---|---|
| Full unit tests | **490/490 PASS** |
| Playwright, all configured functional browsers plus Edge visuals | **504/504 PASS** |
| Typecheck / lint / production build | **PASS** |
| Production dependency audit (`npm audit --omit=dev`) | **0 vulnerabilities** |

Resolved: exact authenticated credential-list fixture in theme startup tests; Vitest cleanup waiting for pending overlay frames before resetting test state; Playwright close-lifecycle synchronization before the next keyboard action. Existing authentication, keyboard activation, containment, focus return, inert and scroll-restoration assertions were preserved. No snapshot regeneration or shared production-overlay rewrite.

Final review found no material defect requiring a stop. Credential CRUD, shared dashboard Add Credential, independent details/deep links, signal forwarding, mutation invalidation, session-generation guards and local-state resets match the READY spec. Credential delete conservatively evicts CE-detail caches; later readers refetch. M10 CE workflows and M11 report rendering remain deferred. The protected report placeholder remains intact.

Repository before staging: correct feature branch; HEAD, main, origin/main and read-only live remote main all at `24ab6c0b49d3569d529c2e30017c1fff5e87b369`; nothing staged. Approved inventory matched exactly: 33 implementation/test files plus 13 documentation/candidate-evidence files. `git diff --check` passed. No backend, Angular, dependency/lockfile, Playwright configuration, baseline PNG or M05/M06 implementation changes. Both unrelated files were fingerprinted for preservation without logging contents.

Checkpoint messages authorized by owner:
1. `feat(react): implement M09 credential CRUD` — 33 application/test files.
2. `docs(migration): record M09 automated verification` — seven documentation files plus six candidate evidence PNGs. This documentation commit's hash is available in Git history and the final checkpoint handoff; it cannot embed its own final hash.

### Read-only live-acceptance checklist (PREPARED, NOT EXECUTED)

- Confirm the already-running local backend's process/port and effective JDBC DB_URL/DB_USERNAME, plus PostgreSQL connection evidence, before signing in. Existing target is local `uptrack_migration_test`; use loopback only. Do not infer DB identity from /api/health or the HTTP port. Do not restart the backend, run migrations or reseed. Never contact the hosted service. Read only the needed configuration fields; do not dump environments, passwords or bearer tokens.
- Use the three existing synthetic accounts, retrieving credentials privately from local owner-controlled tooling: `demo-main@example.test`, `demo-empty@example.test`, `demo-second@example.test`. Historical expected credential counts are **4 / 0 / 1** if unchanged since M08; compare against fresh same-account GET /api/credentials and GET /api/dashboard. Derive current status from the live server response, not seed-time date assumptions. Record discrepancies without modifying data.
- For each account compare list/card names, organizations, type, expiration, renewal and CE summaries with that account's API response. Confirm ascending expiration order, zero/complete progress behavior, and the empty-account message. Exercise name and organization search (250 ms), combined status/type filters, no-match and Clear; result counts must match filtered responses. Do not log personal records.
- Open credential details; independently compare metadata, required/earned CE hours, progress, linked-record count/hours and completion-date-descending summaries. Verify no CE mutation/detail-navigation controls; report links must reach the protected M11 placeholder. Close by keyboard and verify return focus, including mobile layout. No create/update/delete request is permitted in this read-only pass.
- Follow dashboard credential links (and available overflow links) to `/credentials?credentialId=<id>`: correct drawer, then consume only credentialId with replace; retain unrelated query/hash. Also enter a known account-owned deep link directly, and verify protected login restoration. Demo fixtures may lack overflow rows; retain mocked automated coverage rather than adding records to exercise them.
- Switch main -> empty -> second -> main using SPA logout/login without page reload. With a delayed list/detail GET (local browser throttling), sign out or switch; old data/drawers/forms/errors must disappear and late responses must not paint/cache for the replacement account. Recheck each account's counts/identity. No cross-account content may appear, including during loading.
- On Dashboard, open Add Credential: verify the reusable six-field form, labels, focus, enum/date/number controls, blank defaults and validation by editing/blurring fields only (trimmed nonblank/max 180, past date allowed, integer months >=1, CE 0..999.99 with <=2 decimals; 0.5 input step does not limit business increments). **Do not click Save, submit the form, or press Enter inside it.** Cancel/Escape resets drafts; reopening is blank. No extra credential-list fetch is required just to open the dashboard form.
- Inspect network traffic: only existing auth login and required GET reads; no credential/CE POST/PUT/PATCH/DELETE, uploads or unexpected API calls. Optionally compare read-only before/after row counts and content hashes to establish no data change, without exporting record contents. Record per-account outcomes/screenshots privately; no baseline update is implied.

### Disposable database recommendation for future CRUD (NOT AUTHORIZED / NOT EXECUTED)

After separate owner authorization, provision a **new disposable local PostgreSQL database** such as `uptrack_m09_acceptance_<run>` from an isolated synthetic-data clone or a minimal synthetic fixture; never use the existing demo database or real records for destructive acceptance. Use a dedicated role restricted to that database and a separate local backend instance/port. Database creation/restore, fixture writes and any backend start/schema initialization need that future authorization; this preparation performs none of them.

Before the first write, require all three to agree: (1) the backend process actually serving the chosen loopback HTTP port, (2) that process's effective JDBC URL and restricted role, and (3) its PostgreSQL sessions in pg_stat_activity for the disposable database. A SQL session's `SELECT current_database(), current_user, inet_server_addr(), inet_server_port();` verifies that SQL connection; additionally correlate the backend's own connections by role/client port/process evidence. A query of datname/usename/application_name/client_addr/client_port/backend PID in pg_stat_activity must show the intended backend sessions only against the disposable target. Health alone is insufficient. Stop on mismatch or inability to establish the mapping.

On that future target only, create a uniquely named disposable credential through the UI, verify create/edit/delete and refreshed list/detail/dashboard caches, and verify isolation with a second synthetic account. If linked-CE cascade must be tested, have the owner separately authorize/provision a synthetic linked CE record without remote certificate assets; do not extend M09 into M10 UI work. Avoid cloned certificate public IDs/remote asset side effects. Discard/reset only the disposable target after review and separate deletion authorization. Existing demo accounts/data remain untouched.

Remaining limitations: live acceptance has not run; backend validation/error/concurrency/date/certificate-cleanup quirks and existing JWT limitations remain documented and unchanged. Automated acceptance is not live-backend parity and does not authorize integration, deployment or M10.

## Functionality and approved boundaries

- Credential cards/list, 250 ms trimmed name/organization search, combined status/type chips/Clear, expiry-ascending copy sort, result count, create modal, independent detail fetch, inline edit/cancel, delete confirmation with cascade warning, linked CE summaries, dates/status/renewal/progress, error/Retry/loading and separate empty/no-match states.
- Cards preserve whole-card pointer activation through an accessible heading button with a stretched hit area; the report link remains independent. Semantic headings do not sit inside buttons. Two-column cards above 1200px, one column otherwise; existing shell <=768px and drawer <=640px conventions retained. Light/dark existing tokens, page title, labelled controls, pressed chips, >=44px targets, keyboard/focus return; deletion falls back to main when the opener disappears.
- RHF/Zod validates trimmed nonblank name/org <=180; enum; real date-only value (past allowed); finite integer renewal >=1; finite CE hours 0..999.99, <=2 decimal places. Input step remains 0.5 but no half-hour business restriction (form noValidate + schema). Failure keeps values; cancel/reopen clears stale errors and restores values. Pending operations lock inputs/submission and dismissal.
- Dashboard Add Credential reuses the same form/dialog and does not request the list. Dashboard Add CE, CE mutations/uploads and CE detail navigation remain M10; no misleading disabled workflow controls. Linked CE rows are summaries only. Report links target the existing protected M11 placeholder with returnTo=/credentials.

## API, query invalidation and session safety

Existing credentialsApi, DTOs, native fetch, single QueryClient, keys/invalidation and auth architecture reused. No new dependencies, optimistic data or mutation cache seeding. GET queries consume signal; default retry/freshness policy unchanged.

Current-session successful create/edit calls invalidateCredentialData(client,[id]): all list/filter variants, dashboard, affected credential prefix including detail, nested CE records/report. Delete first cancels affected credential and CE-detail reads, rechecks session, removes deleted credential prefix and conservatively removes the whole CE-detail cache (dependent IDs may be incomplete), then invalidates lists/dashboard/credential prefix. This evicts unrelated CE detail data too; later readers refetch. No known-deleted data retained. Failed writes do not invalidate/retry.

Start-time captureSession guards gate deferred dispatch and cache/UI effects. Offline-paused operations cannot resume under a replacement token. Feature-local session boundary remounts local selection, form, dialog and error state on replacement, including same-account/same-token explicit login. M06 source is unchanged. Server writes already dispatched cannot be undone by sign-out.

22 session/invalidation tests cover each mutation success/failure, filtered/nested/report/dashboard invalidation, failed-write no retry, A->B late success and error, offline pause/replacement, logout during pending writes, same-account reauthentication, aborted list/detail reads with late A responses, and late old-session 401 through the real transport. The actual browser also switches accounts during pending create/edit/delete and observes no old UI/error or B refetch after releasing the old failure.

## Deep links

`/credentials?credentialId=<id>` opens detail independently of filtered list data. Replace navigation consumes only credentialId and preserves unrelated parameters/hash. Unit tests assert REPLACE and repeated navigation/missing-detail retry; Edge covers legacy /app/credentials, retained query/hash, repeated/missing links, dashboard rows, guest login restoration and protected report navigation. Existing auth tests now assert the consumed location after the drawer opens; steady-state protected 401 returns to /credentials after consumption. Query forwarding and report auth assertions remain.

## Commands and actual results

All commands from frontend-react. This is targeted verification, not a full-regression claim. Local environment: macOS, installed Microsoft Edge 156.0.4314.58. Tests use synthetic, default-deny HTTP fixtures; no backend/DB/hosted network acceptance.

| Command | Exit/result |
|---|---|
| `npx vitest run src/features/credentials src/app/router.test.tsx src/core/auth/route-guards.test.tsx src/features/auth/auth-dialog.test.tsx src/features/dashboard/dashboard-page.test.tsx src/features/dashboard/dashboard-session.test.tsx src/features/landing/landing-page.test.tsx` | 0; **143/143**, 10 files; includes **65 M09 tests** |
| `npx vitest run src/features/credentials/credentials-page.test.tsx` (after final cancel-error/focus changes) | 0; **10/10** |
| `npm run typecheck` | 0 |
| `npm run lint` | 0 |
| `npm run build` | 0; existing >500kB chunk advisory and Zod PURE-comment warnings; no dependency/config changes |
| `npx playwright test --project=msedge e2e/credentials.spec.ts e2e/app-shell.spec.ts e2e/auth.spec.ts:26 e2e/auth.spec.ts:124 e2e/landing.spec.ts:102 e2e/dashboard.spec.ts` | 1; **49/50**. All 33 selected existing scenarios passed; one new form-readiness failure, corrected below. The :124 and :102 filters did not select test declarations; rerun correct lines below |
| `npx playwright test --project=msedge e2e/credentials.spec.ts e2e/landing.spec.ts:99` | 0; **18/18** (all **17 M09** plus landing returnTo) |
| `npx playwright test --project=msedge e2e/credentials.spec.ts -g 'create, refresh|invalid forms'` (after final cancel-error/focus changes) | 0; **2/2**, includes deletion focus fallback |
| `npx playwright test --project=msedge e2e/credentials.spec.ts -g 'have no overflow'` | 0; **8/8**, final responsive evidence; 375/768/769/1280 x light/dark, list/create/detail; document/main and overlay widths checked |
| `npx playwright test --project=msedge e2e/auth.spec.ts:123` | 0; **1/1**, legacy-auth redirect |
| `git diff --check` | 0 |

Logs are local `/tmp/m09-{unit-final,unit-followup,edge-targeted,edge-final,edge-followup,edge-evidence,edge-auth-legacy,typecheck,lint,build-final}.log` (not committed). Browser logs include existing NO_COLOR/FORCE_COLOR notices.

### Initial failures and grounded corrections

- Initial typecheck: JSX child-brace syntax and mutation union-return inference errors; corrected before verification. Later tests used RTL-only unsupported exact flags; removed (string role names remain exact by default).
- Initial feature tests: 38/42; failures were Node/jsdom AbortSignal realm identity, ambiguous Type group/input locator, and modal autofocus readiness. Signal assertions now inspect the actual forwarded signal; fields use role/name; modal explicitly focuses the name field and tests await it. Then 61/61; subsequent validation/logout coverage brought M09 total to 65.
- Initial session tests: 18/19; old captured list signal was correctly aborted on account switch; corrected test to assert old-signal abortion. No production isolation defect found.
- Affected-test run initially 138/139; a direct test-store expiry fired before React Router committed consumed search. Test awaits the navigation frame before expiring the steady-state session. Guest deep-link assertions remain intact.
- First Edge M09: 14/17. **Application defect fixed:** pending create dismissal could use a rendered pending snapshot; overlay close now checks the synchronous mutation lock (edit/delete use it too). Test assumptions corrected: inline edit drawer has label Edit credential; dashboard development StrictMode may add an aborted initial read, so assert one additional read after save. The focused rerun passed 3/3.
- Broader Edge run: 49/50; test started filling before modal autofocus completed, putting numeric text in the name input. Shared test fill helper now awaits initial name focus; no product assertion weakened. Final 18/18 above. No retries/sleeps or snapshot updates used to hide browser failures. Source tests use one explicit debounce wait wrapped in act, matching the 250 ms contract.

## Visual evidence and owner verification

Six representative final Edge/macOS PNGs are saved under `m09-evidence/` (desktop list x themes; mobile create/detail x themes). They are **candidate review evidence, not approved goldens**. All 24 final M09 screenshots remain under ignored frontend-react/test-results/evidence until the next Playwright run. Representative desktop list and mobile dark drawer were visually inspected: theme/layout/readable fields, responsive stacking and existing shared drawer match the intended source conventions. This does not establish pixel parity.

No changes proposed to the existing eight /settings shell/modal goldens; e2e/visual.spec.ts and its PNGs unchanged. Owner visual comparison NOT RUN. Full Vitest, four-browser regression, installed Safari/VoiceOver and live isolated-backend acceptance NOT RUN/PENDING OWNER. No snapshots regenerated.

Owner procedure: run npm run verify:local; inspect existing Edge/macOS visual comparisons without update mode. For live acceptance, use only the already verified isolated uptrack_migration_test target with synthetic accounts; explicitly approve test-data writes before exercising create/edit/delete, validate filters and detail aggregates against same-run API responses, check dashboard totals and account isolation, and test cascade deletion on a disposable credential. Do not use hosted backend or reseed without separate authorization.

## Remaining limitations and deferred work

No backend blocker identified for approved M09. Preserved limitations: 404 for foreign/missing resources, malformed input potentially generic 500, unstructured validation errors, server/browser date mismatch and DST ceil behavior, all-linked-record CE totals, no concurrency control or pagination, no explicit certificate cleanup in credential-delete service. These are not fixed. Shared JWT localStorage/revocation limitations remain unchanged.

M10: CE create/edit/delete/detail/upload workflows and dashboard Add CE. M11: actual report rendering/printing. No M10/M11 implementation started. Full parity remains pending owner acceptance.

## Documentation and Git handoff

Spec promoted READY with all approved decisions; tracker/inventory/master plan/handoff/current-feature updated. Tracker is In progress (implemented/pending owner), not Verified/Merged. Branch remains feature/react-credential-crud; HEAD/main/origin/main unchanged; no staging/commit/push/merge/deployment. Backend, Angular, DB, dependencies, M05/M06 implementation and baseline screenshots untouched.

Preserved unrelated untracked files: conversation-2026-11-02-064616.txt; frontend-react/src/test/render-with-providers 2.tsx (SHA256 2f36e1df2c7944be1f8a8c7e36770d6645b714cf7cd8a186aefb667aa11d8f3b, matches prior handoff). Next action is owner review/verification; all integration actions require separate authorization.

## Exact changed-file inventory by checkpoint

46 files total. The two unrelated untracked files are excluded.

### Feature checkpoint — 33 files

- `frontend-react/e2e/app-shell.spec.ts`
- `frontend-react/e2e/auth.spec.ts`
- `frontend-react/e2e/credential-fixtures.ts`
- `frontend-react/e2e/credentials.spec.ts`
- `frontend-react/e2e/dashboard.spec.ts`
- `frontend-react/e2e/helpers.ts`
- `frontend-react/e2e/landing.spec.ts`
- `frontend-react/e2e/shared-ui.spec.ts`
- `frontend-react/e2e/theme.spec.ts`
- `frontend-react/src/app/preview/shell-placeholder.tsx`
- `frontend-react/src/app/router.test.tsx`
- `frontend-react/src/app/router.tsx`
- `frontend-react/src/core/auth/route-guards.test.tsx`
- `frontend-react/src/features/auth/auth-dialog.test.tsx`
- `frontend-react/src/features/credentials/credential-card.tsx`
- `frontend-react/src/features/credentials/credential-detail-drawer.tsx`
- `frontend-react/src/features/credentials/credential-form-dialog.tsx`
- `frontend-react/src/features/credentials/credential-form-schema.test.ts`
- `frontend-react/src/features/credentials/credential-form-schema.ts`
- `frontend-react/src/features/credentials/credential-form.tsx`
- `frontend-react/src/features/credentials/credential-session-boundary.tsx`
- `frontend-react/src/features/credentials/credential-session.test.tsx`
- `frontend-react/src/features/credentials/credential-view.test.ts`
- `frontend-react/src/features/credentials/credential-view.ts`
- `frontend-react/src/features/credentials/credentials-page.test.tsx`
- `frontend-react/src/features/credentials/credentials-page.tsx`
- `frontend-react/src/features/credentials/delete-credential-dialog.tsx`
- `frontend-react/src/features/credentials/use-credential-mutation.ts`
- `frontend-react/src/features/credentials/use-credentials.ts`
- `frontend-react/src/features/dashboard/dashboard-header.tsx`
- `frontend-react/src/features/dashboard/dashboard-page.test.tsx`
- `frontend-react/src/test/cleanup.test.tsx`
- `frontend-react/src/test/setup.ts`

### Documentation/evidence checkpoint — 13 files

- `context/current-feature.md`
- `context/migration/agent-handoff.md`
- `context/migration/feature-inventory.md`
- `context/migration/master-plan.md`
- `context/migration/migration-status.md`
- `context/migration/specs/m09-credential-crud.md`
- `context/migration/verification/m09-evidence/m09-dark-1280-list.png`
- `context/migration/verification/m09-evidence/m09-dark-375-create.png`
- `context/migration/verification/m09-evidence/m09-dark-375-detail.png`
- `context/migration/verification/m09-evidence/m09-light-1280-list.png`
- `context/migration/verification/m09-evidence/m09-light-375-create.png`
- `context/migration/verification/m09-evidence/m09-light-375-detail.png`
- `context/migration/verification/m09-report.md`


## Owner full regression and theme fixture correction — 2026-11-02

This section supersedes the earlier pending-owner statements only for results supplied below. M09 remains in **implementation review**, uncommitted on `feature/react-credential-crud`; it is not accepted or merged.

### Owner-reported results before this correction

| Check | Owner result |
|---|---|
| Typecheck | PASS |
| Lint | PASS |
| Full unit suite | **488/488 PASS** |
| Build | PASS |
| Production dependency audit | **0 vulnerabilities** |
| Edge visual tests | **4/4 PASS** |
| Four-browser Playwright | **480/504 PASS; 24 FAIL** |

All 24 failures were the six OS-theme/storage startup scenarios at `e2e/theme.spec.ts:45`, repeated across Edge, Chrome, Firefox and WebKit, reporting unexpected GET /api/credentials. These counts are supplied by the owner; the agent did not rerun the full suite or audit.

### Root cause and smallest correction

**Classification: test-fixture assumption, identical across all four browsers.** Each affected scenario calls signIn(page), which seeds a synthetic session and explicitly mocks authenticated /api/auth/me, then navigates to /credentials. Before M09 that route was a placeholder with no credential request; M09 mounts CredentialsPage -> useCredentials -> credentialsApi.list after RequireAuth verifies the session. A GET /api/credentials is therefore legitimate authenticated application behavior. The theme fixture had not declared/mocked that newly legitimate request, so the unchanged default-deny network assertion failed at teardown.

Added only an exact `http://localhost:5173/api/credentials` route inside the six startup scenarios. Only GET is declared with allowApi and answered with explicit status 200 / synthetic empty JSON array; other methods fall through to the default-deny handler. The handler additionally asserts the exact synthetic bearer header, confirming that these observed list requests are authenticated. It does not permit credential details, writes, query variants or unrelated endpoints. No shared helper/global allowlist or unexpected-network assertion changed. Existing theme initialization, storage fallback, toggle, focus/accessibility/navigation, pre-paint and reduced-motion assertions remain intact.

Production routing still prevents guests/pending sessions from mounting protected credential content. The feature-local session boundary also requires authenticated status. Focused route-guard/session tests passed, including guest deep-link protection, abort/cache reset, mounted account replacement, same-account reauthentication, offline-paused operations, and late create/edit/delete success/error/401 handling. No unauthenticated credential requests or session-isolation defect was found in this investigation. Production code was not modified for this correction.

### Agent targeted verification after correction

| Exact command (frontend-react/) | Result |
|---|---|
| `npx playwright test e2e/theme.spec.ts --project=msedge --project=chrome --project=firefox --project=webkit` | **exit 0, 48/48 PASS**; msedge 12/12, chrome 12/12, firefox 12/12, webkit 12/12. Includes all 24 formerly failing startup cases and their authenticated-header checks |
| `npx vitest run src/features/credentials/credential-session.test.tsx src/core/auth/route-guards.test.tsx` | **exit 0, 43/43 PASS** (22 credential/session + 21 auth/guard tests) |
| `npm run typecheck` | **exit 0** |
| `npm run lint` | **exit 0** |
| `git diff --check` | **exit 0** |

Initial sandbox browser attempt exited 1 before any browser tests: local Vite bind EPERM on ::1:5173. Repeated the same command with the approved escalation; all 48 passed in 27.2s. Existing NO_COLOR/FORCE_COLOR notices only. Logs: `/tmp/m09-theme-four-browser.log`, `/tmp/m09-theme-isolation.log`, `/tmp/m09-theme-typecheck.log`, `/tmp/m09-theme-lint.log`. The fixture change is local to theme startup scenarios, so no shared credential/auth/browser fixture was changed; the focused session/guard tests above provide additional isolation evidence.

**Pending:** owner final full 504-test rerun after correction; live-backend acceptance remains pending (not supplied in this review). No full browser/unit regression or visual suite rerun by the agent. No visual snapshots regenerated or baseline changes proposed.

### Incremental changed files and Git status

Only `frontend-react/e2e/theme.spec.ts` and this `context/migration/verification/m09-report.md` changed during this correction. The complete M09 inventory above now includes the theme file (43 files total); prior M09 work remains uncommitted. Branch unchanged: `feature/react-credential-crud`. Two unrelated untracked files preserved: `conversation-2026-11-02-064616.txt`, `frontend-react/src/test/render-with-providers 2.tsx`. No backend, Angular, database, dependency, production-code or baseline changes. No commit, push, merge, deployment or acceptance.


## Owner follow-up: intermittent overlay cleanup failure — 2026-11-02

### Latest owner result (supersedes the earlier complete unit run for current acceptance)

Owner `npm run verify:local`: typecheck PASS, lint PASS, **Vitest 487/488 PASS**. The sole failure was `src/shared/ui/overlays.test.tsx`, “restores pre-existing scroll styles and inert state after modal cleanup”: expected body inline overflow `scroll`, received empty string at line 89. Build/browser stages were **NOT RUN** because the verification chain stopped. The previous owner 488/488 unit result remains historical evidence of intermittency; it does not override this latest failure. M09 remains implementation review, uncommitted, not accepted or merged.

### Investigation and root cause

**Classification: test-isolation/teardown race involving a pending animation frame.** No production overlay behavior changed.

Inspected the failing test, global RTL cleanup, OverlayProvider/useOverlayLayer, AppModal/DrawerShell, installed Flowbite/FloatingOverlay scroll locks, body CSS and inert handling, and M09 create/delete/drawer usage. AppProviders supplies one persistent production OverlayProvider; M09 reuses it rather than adding another overlay manager. No global stylesheet sets inline overflow; the relevant writers are the overlay manager/FloatingOverlay and test teardown.

FloatingOverlay clears overflow and padding synchronously during its cleanup. OverlayProvider intentionally reconciles original scroll styles on requestAnimationFrame after that cleanup. useOverlayLayer also queues focus restoration on a frame. When an entire RTL root is unmounted (notably the preceding confirmation-focus test leaves its modal open), these callbacks outlive synchronous cleanup(). The old global afterEach immediately removed body styles/inert attributes and advanced to the next test, without settling the queued frame. A disposed provider's callback can then restore its old empty body styles over the next test's newly installed `scroll`/`7px` baseline. Depending on ordering, the next provider captures the already-erased baseline and correctly restores empty values on its own close. Waiting longer inside the final assertion cannot recover a baseline overwritten before registration.

The original assertion passed in the isolated test (1/1), the complete overlay file (6/6), and three bounded pre-fix repetitions (6/6 each). Thus the intermittent original assertion was not observed failing in these normal bounded runs. Causality was established separately: a temporary controlled-frame diagnostic mounted/unmounted a real AppModal root, set the next baseline, then released the disposed root's queued callbacks; overflow and padding became empty. That diagnostic passed, demonstrating the leak, and was removed after inspection. A permanent lifecycle regression was also run against a temporary config containing the exact old teardown: 1/2 tests passed, the next-test boundary assertion failed because the prior unmount frame had not finished. The same regression passes with the corrected setup. Temporary diagnostic/config/setup copies were removed; no production source was instrumented or edited.

Normal same-provider modal cleanup already has frame-based reconciliation and the original restoration test passes in isolation. No same-provider live application defect was confirmed; no shared production fix is proposed from this investigation. This correction addresses the demonstrated boundary between independently mounted test roots, without asserting universal production timing guarantees.

### Test-only correction

`src/test/setup.ts`: after cleanup(), await the next animation-frame callback before resetting localStorage, theme, body styles/inert attributes and spies/globals, or starting the next test. This drains the already-queued overlay cleanup work according to its actual before-next-paint contract; it is not a fixed-duration sleep. No timeouts, retries or assertions were loosened.

`src/test/cleanup.test.tsx`: two deliberately ordered lifecycle tests mount/unmount a real modal root, mark completion after its cleanup frames, then verify the next test starts only after that work, with reset styles/inert state, and that a fresh scroll/padding/inert baseline survives the next frame. The existing `overlays.test.tsx` and every scroll-style/inert-restoration assertion are **unchanged**. Production OverlayProvider, useOverlayLayer, modal/drawer code and M09 usage are unchanged. Two tests added; the full unit suite has not been rerun by the agent.

### Exact targeted commands and results

All from frontend-react; no full verification suite was run.

| Command | Result |
|---|---|
| `npx vitest run src/shared/ui/overlays.test.tsx -t 'restores pre-existing scroll styles and inert state after modal cleanup'` (before correction) | exit 0; 1 selected PASS; 5 unselected by filter |
| `npx vitest run src/shared/ui/overlays.test.tsx` (before correction) | exit 0; 6/6 PASS |
| `for attempt in 1 2 3; do npx vitest run src/shared/ui/overlays.test.tsx > /tmp/m09-overlay-before-$attempt.log 2>&1; result=$?; echo "focused file repetition $attempt: exit $result"; done` | Three bounded invocations, each exit 0 and 6/6 PASS |
| `npx vitest run src/shared/ui/overlay-cleanup.investigation.test.tsx` (temporary controlled-frame diagnostic) | exit 0; 1/1 reproduced disposed-root style overwrite, as designed; file removed |
| `npx vitest run src/test/cleanup.test.tsx --config vitest.cleanup-investigation.config.ts` (temporary old-teardown counterfactual) | exit 1; 1/2 PASS, lifecycle boundary assertion failed as expected; temporary config/setup removed |
| `npx vitest run src/test/cleanup.test.tsx src/shared/ui/overlays.test.tsx` (after correction) | exit 0; 8/8 PASS |
| `npx vitest run src/test/cleanup.test.tsx src/shared/ui/overlays.test.tsx src/features/credentials src/features/auth/auth-dialog.test.tsx src/features/dashboard/dashboard-page.test.tsx` | exit 0; **105/105 PASS**, 8 files |
| `for attempt in 1 2 3; do npx vitest run src/test/cleanup.test.tsx src/shared/ui/overlays.test.tsx > /tmp/m09-overlay-after-$attempt.log 2>&1; result=$?; echo "focused cleanup repetition $attempt: exit $result"; done` | Three bounded invocations, each exit 0 and **8/8 PASS** |
| `npx vitest run src/test/cleanup.test.tsx` (final explicit sequential grouping) | exit 0; 2/2 PASS |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `git diff --check` | exit 0 |

Logs: `/tmp/m09-overlay-{isolated,file,diagnostic,counterfactual,after,targeted,regression-final,typecheck,lint}.log` and bounded before/after repetition logs. These are local investigation evidence, not committed artifacts. No arbitrary sleeps or retry-based masking. Build/browser/visual suites were not rerun for this test-harness-only correction. The owner final full local rerun, including build/browser stages, and live acceptance remain pending.

### Incremental files and Git status

Only `frontend-react/src/test/setup.ts`, new `frontend-react/src/test/cleanup.test.tsx`, and this `context/migration/verification/m09-report.md` changed in this investigation/correction. Complete M09 inventory above now has 45 files. Branch remains `feature/react-credential-crud`; no stage/commit/push/merge/deployment or M10 work. Both unrelated untracked files and all screenshot baselines preserved. Backend, Angular, database, dependency versions and production application code untouched.


## Owner final browser regression: three focus failures — 2026-11-02

### Owner evidence and artifact availability

Latest owner verify:local reached browsers and reported **501/504 PASS**. Remaining failures: Chrome dark 769px credential responsive scenario; Firefox light 375px shared-UI scenario; WebKit dark 1280px credential responsive scenario. Each failed the trigger toBeFocused assertion inside activateWithKeyboard after locator.focus. Owner also reports TS2688 errors disappeared after npm ci and TypeScript passes; the agent did not run npm ci or change dependency versions. Do not infer other unsupplied stage counts from this report.

The original owner error contexts/traces were not retained in the current test-results tree (only previous evidence/browser metadata remained). Fresh focused traces were therefore collected in separate /tmp output directories, preserving earlier evidence/baselines. Temporary page instrumentation logged focus calls/events, call stacks, active elements, inert state and stable element identities. Those hooks/files were removed from the final changes.

### Diagnosis

**Classification: test synchronization race with the existing deferred overlay close lifecycle.** activateWithKeyboard itself is unchanged; production focus management is unchanged.

The close lifecycle has two steps: FloatingFocusManager returns focus in a microtask, then the shared useOverlayLayer cleanup reconciles return focus on requestAnimationFrame (the source explicitly documents this before-next-paint behavior). A toBeFocused assertion can observe the first return and pass while the cleanup frame remains pending. The test then focuses a different trigger. The pending close callback restores the old opener after that focus call, either causing the helper's assertion to fail or, if it ran just after the assertion, directing Enter to the old opener and reopening the previous modal.

Fresh pre-fix repetitions: **39/45 PASS, 6 FAIL** (Chrome 15/15; Firefox 12/15; WebKit 12/15). Two failures were the same toBeFocused assertion; four were the second manifestation, where the old Add credential modal reopened instead of Credential details. Trace context and focus-call stacks directly identify use-overlay-layer.ts cleanup as the late writer. Example Firefox sequence: Add Credential returned at t=324ms; Fixture credential focused at t=332ms; the cleanup rAF refocused Add Credential at t=334ms (same connected element identities, neither inert). Enter subsequently reopened Add credential. A WebKit shared-UI failure recorded Open confirmation focused, followed by empty-drawer cleanup returning focus to main. This matches the original three failures' mechanism even though the exact browser/repetition distribution varies with scheduling.

No trigger replacement/rerender was observed: identity tracing showed the target remained connected and unchanged. The late writer was a closing overlay's return-focus callback, not the navigation heading effect, an active-overlay trap, session transition or cross-test DOM state. This is distinct from the preceding Vitest global teardown fix: these Playwright steps race within one live page. Browser timing exposes the window; in addition, Safari/WebKit mouse clicks do not guarantee opener focus, so the empty-drawer path now establishes its opener by keyboard.

The traces establish premature test progression before documented cleanup completed, not a persistent failure to focus after cleanup. No production behavior change is made or proposed here. The correction asserts the original focus contract after the complete close lifecycle, rather than repeatedly forcing focus until an assertion passes.

### Smallest targeted test correction

- e2e/helpers.ts adds expectOverlayClosed(page,overlay,returnTarget): assert the specific overlay is absent, await its already-scheduled cleanup frame, then assert the expected return target is focused. No fixed-duration sleep, repeated focus action, timeout/retry increase or mouse substitution. activateWithKeyboard still focuses once, asserts toBeFocused, then presses Enter.
- e2e/credentials.spec.ts uses this close assertion between create-modal dismissal and credential keyboard activation, and at final detail dismissal. Existing input focus, overlay-open/content, keyboard and responsive/overflow assertions remain.
- e2e/shared-ui.spec.ts uses it after modal/drawer/confirmation dismissal. Empty drawer now opens by keyboard and verifies closure/return to its own opener before moving to confirmation. Existing focus containment, Tab, Escape/X/backdrop, aria associations, state/style, nested isolation, scroll-lock and navigation assertions remain. This strengthens the previously unasserted empty-drawer close boundary.

No production code, API fixtures, global network assertions or test setup were changed for this correction. No scenario skipped, no accessibility assertion removed, no snapshot updated.

### Targeted verification

Commands from frontend-react:

| Exact command | Result |
|---|---|
| `npx playwright test e2e/credentials.spec.ts e2e/shared-ui.spec.ts --project=chrome --project=firefox --project=webkit -g 'dark (769\|1280)px credentials\|shared UI light 375:' --repeat-each=5 --trace=on --output=/tmp/m09-focus-before` | exit 1; **39/45 PASS, 6 FAIL**; fresh diagnostic traces/timelines reproduce the race |
| Same selection/repetitions with `--output=/tmp/m09-focus-after` after synchronization, diagnostics still enabled | exit 0; **45/45 PASS**, 15 per browser |
| Same selection/repetitions with `--output=/tmp/m09-focus-final` after removing all diagnostic instrumentation | exit 0; **45/45 PASS**, 15 per browser |
| `npx playwright test e2e/shared-ui.spec.ts --project=chrome --project=firefox --project=webkit --output=/tmp/m09-focus-shared-ui` | exit 0; **21/21 PASS**, 7 per browser (all shared-UI themes/widths and nested-overlay scenario) |
| `npx vitest run src/features/credentials src/shared/ui/overlays.test.tsx src/test/cleanup.test.tsx` | exit 0; **73/73 PASS**, 6 files |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `git diff --check` | exit 0 |
| `git diff --exit-code -- e2e/visual.spec.ts e2e/visual.spec.ts-snapshots` | exit 0; visual test/baselines unchanged |

The first sandbox browser launch failed before testing because binding ::1:5173 was prohibited; the same focused command ran with authorized escalation. No full browser suite, visual comparisons or baseline regeneration. Logs `/tmp/m09-focus-{before,after,final,shared-ui,units,typecheck,lint}.log`; trace.zip files in corresponding separate /tmp output directories. Before/after diagnostic focus timelines are attached inside their traces. Final traces have no instrumentation. Existing screenshot captures are candidate evidence only.

### Incremental files, Git and pending owner action

Only e2e/helpers.ts, e2e/credentials.spec.ts, e2e/shared-ui.spec.ts and this verification report changed in this correction. Complete M09 inventory above now contains 46 files. Branch feature/react-credential-crud, HEAD unchanged, no staged changes/commit/push/merge/deployment or M10 work. Two unrelated untracked files preserved, including unchanged render-with-providers 2.tsx hash. Backend, Angular, database, dependency versions and screenshot baselines untouched.

M09 remains implementation review. **Pending owner:** final full verify:local / complete browser rerun after these test-only corrections, plus live acceptance not yet reported. Targeted passes do not mark M09 accepted or merged.
