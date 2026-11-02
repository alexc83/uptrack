# M06 verification report

**Status: IMPLEMENTED and verified locally (all mandatory commands PASS after the approved baseline update); awaiting human review and merge (not yet merged).** No commit, push, merge or deployment has occurred.

Agent / model / session: Claude Code (Sonnet 5.5), 2026-11-01/02.
Branch / base: `feature/react-auth` from `main` `22ddf5e5f996703b5c770118f9c4defd6828f0d4` (verified equal to local and live `origin/main`).
Spec: `specs/m06-authentication-and-route-guards.md` (READY, approved decisions recorded).

## Resolver gate (Gate A) — PASS
- Before (3.10.0, installed with zod 4.6.7, RHF 7.91.0): `ZodError.errors` is absent in Zod 4 (`issues` only); `zodResolver` re-throws instead of returning field errors. New `src/core/forms/zod-resolver.test.tsx`: **5 of 8 failed** (invalid input rejected with ZodError; real RHF `handleSubmit` showed no errors).
- Change: only `@hookform/resolvers` `^3.10.0` → `^5.9.2` (installed 5.9.2; new transitive `@standard-schema/utils` 0.3.0; npm also re-nested identical `ajv`/`json-schema-traverse` versions). Zod 4.6.7 and RHF 7.91.0 unchanged.
- After: **8/8 pass** — valid input, field errors, nested paths, `criteriaMode: all`, async refinement, non-Zod errors rethrown, input/output types, real `useForm` + `handleSubmit` with no unhandled rejection.
- `npm audit`: 16 vulnerabilities (14 moderate, 2 critical) — identical to the recorded deferred dev-tree baseline, no new findings. `npm audit --omit=dev`: 0.

## Commands
| Command | Result |
|---|---|
| `npm run typecheck` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm run test` ×5 consecutive + `-- --run` | PASS, 354/354 across 25 files each time (baseline was 177/18) |
| `npm run build` | PASS (exit 0; existing >500 kB chunk advisory only) |
| `npm run e2e` (first run, before baseline update) | FAIL — 54 passed, 4 failed (all `visual.spec.ts`); original failure preserved below |
| `npm run e2e` (after approved baseline update, no update mode) | **PASS — 58/58** |
| `npm audit` | exit 1, 16 findings = baseline, none new |
| `npm audit --omit=dev` | PASS, 0 |

## Session design and invariants (`src/core/auth/session-store.ts`)
States: `initializing | authenticated | unauthenticated | unavailable`; transient `notice: expired | signed-out`. Token only in the store closure and `localStorage['uptrack_token']`; never in the snapshot/context (tested).
- **I1** every transition is one synchronous `#commit` (token swap, storage, cancel queries, remove queries, clear mutation cache, publish) — no `await` inside, so a stale cleanup cannot run after a newer transition began.
- **I2/I3** async work only yields a candidate; continuations re-check a captured `epoch` (bootstrap) or `attempt` (login/register) before committing.
- **I4** only the latest login/register attempt may install a session; logout, cancel and cross-tab changes supersede pending attempts; superseded attempts resolve promptly even if the transport ignores the abort signal.
- **I5** query keys carry no user id, so every explicit login/register/logout/expiry/cross-tab change resets the cache, even if the new token string is identical.
- **I6** mutations cannot be cancelled; `removeQueries()` is proven insufficient by a test (an unguarded late `onSuccess` repopulates the cache). Later milestones MUST guard cache writes in mutation callbacks with `useSession().captureSession()` → `guard.isCurrent()` (or use invalidation only) and add a test per mutation hook. M06 guarantees nothing for callbacks it did not write.
- Adapter: `SessionProvider` registers the transport adapter then starts one bootstrap in the same effect; StrictMode cleanup unregisters, re-run re-registers and joins the memoized bootstrap (1 `/auth/me`). The bootstrap handles its own 401; M05 suppresses notifications from superseded registrations/tokens.
- `/auth/me` uses `queryClient.fetchQuery(queryKeys.authMe())` (M05 retry policy, cancellation, de-duplication) with `gcTime: 0`; identity lives in the store and the cache entry is removed.

## Race and isolation evidence (Vitest, `session-store.test.ts` 59 tests + guard/dialog tests)
Logout while a query is active (aborted + removed); login immediately after logout; account A→B (cache empty, also with a byte-identical token); two competing logins (both resolution orders); logout beats pending login; old `/auth/me` result and old `/auth/me` 401 after a newer session; earlier cleanup vs later session data; mounted observers do not resurrect data; mutation cache cleared; guarded vs unguarded mutation callback; old 401 after new token via the real transport; 403/404/500 never end a session; public login/register carry no `Authorization`; adapter registration, replacement, stale cleanup and unmount; cross-tab logout/account switch/unrelated key/pending login; malformed and throwing storage; persistence failure.

## Routing and forms evidence
Guest deep link → `/?auth=login&returnTo=…` (query + hash kept); `returnTo` validator: 36 cases incl. `//`, `/\`, `javascript:`, encoded slashes/CRLF, unknown routes, oversize, nested CE-report `returnTo`; legacy `/app*` redirects keep query/hash; CE report protected, outside shell; guest-only `/`; unknown routes; no protected content or shell while `initializing`; Retry/Sign out; expired notice; logout confirm (Cancel focused, Esc). Forms: backend limits only (name ≤120, email ≤180, password 8–255; login password has no minimum), lenient `@` check to match Jakarta, client field errors vs flat server banner, pending state, autocomplete, focus return, abandon-on-close.

## Browser (Edge/macOS only; all auth traffic mocked; default fixture still denies undeclared `/api` traffic)
- New `e2e/auth.spec.ts`: 16 tests PASS (deep-link login and restore, stale token never sent to login, invalid credentials, registration/duplicate, unsafe returnTo, reload with one `/auth/me`, no flash, outage Retry, expired token, logout + Back, protected-401 expiry via real transport, 375/768/1280 dialogs without overflow, keyboard/focus). Screenshots in ignored `test-results/evidence`.
- Existing M04/M05 specs adapted to sign in through the explicit mock (`signIn`): app-shell account-menu assertion updated (placeholder → signed-in identity); theme "denied storage" case now denies only the theme key so the mocked session can start. M05 transport specs unchanged and pass.
- **Original failure (preserved):** 4 `visual.spec.ts` tests failed against the M04 goldens (first mismatch per test: `shell-{light,dark}-desktop` 867 px and `shell-{light,dark}-mobile-navigation` 872 px). Cause: the shell footer was the M04 placeholder ("Migration preview / Account unavailable", initials UT); with M06 it shows the signed-in identity.

## Visual baseline update (human-approved 2026-11-02)
Why: M04 captured a placeholder account; M06 intentionally replaces it with the authenticated identity, so those pixels must change. Review before accepting (pixel comparison of every original vs regenerated golden, plus visual inspection):
| Image | Pixels changed | Region |
|---|---|---|
| shell-light-desktop / shell-dark-desktop | 2018 / 2017 | x 31–208, y 744–774 (footer avatar + name + email only) |
| shell-light-mobile-navigation / shell-dark-mobile-navigation | 2018 / 2017 | same footer region (drawer) |
| shell-light-collapsed / shell-dark-collapsed | 205 / 205 | x 31–52, y 752–764 (collapsed avatar initials only) |
| modal-light-mobile / modal-dark-mobile | 0 / 0 | unchanged — not updated (SHA identical to the original) |
Nothing outside the footer region differs: no layout, theme, typography, spacing or responsive change. Note: the human approved "four" files; review found six images change (the two collapsed-sidebar images share the same avatar change), and the human then approved all six explicitly. Regenerated images show deterministic synthetic data only: "Test User" / `test.user@example.test` (initials TU). The e2e identity was changed from a real-sounding name to this synthetic one before regeneration. Originals and regenerated images were kept in the session scratchpad; the first attempt wrote them with update mode, which was then reverted via `git checkout` until the scope was approved.
After update: the eight visual comparisons pass without update mode, and the complete suite passes 58/58. Unit 354/354 ×5, resolver gate and session-isolation suites (140 tests in `src/core/auth` + `src/core/forms`) pass; typecheck, lint, build exit 0.

## Approved Angular parity deviations
Non-401 bootstrap failure keeps the token (`unavailable`); expired-session notice (Angular silent); `auth`/`returnTo` optional params on `/`; submit enabled before validation; cross-tab listener; legacy redirects preserve query (matches Angular). Unauthenticated deep links are restored after login (Angular dropped them).

## Remaining security risks (unchanged by M06)
Token readable by XSS (S5); no refresh/revocation/server logout; tokens valid until expiry even after password change; backend cannot distinguish expired from invalid; no login rate limiting; duplicate-email race returns 500 (backend). Long-term fix needs backend work (HttpOnly cookie or short-lived access + rotating refresh, `jti`/token version) and separate authorization.

## Changed-file inventory
Modified (tracked): `context/current-feature.md`, `context/migration/{agent-handoff,migration-status,parity-contract}.md`, `context/migration/specs/m06-authentication-and-route-guards.md`, `context/migration/verification/m06-report.md`; `frontend-react/{package.json,package-lock.json}`; `src/app/{providers.tsx,router.tsx,router.test.tsx}`; `src/shared/layout/{app-shell.tsx,app-sidebar.tsx}`; `src/test/render-with-providers.tsx`; `e2e/{helpers.ts,app-shell.spec.ts,shared-ui.spec.ts,theme.spec.ts,visual.spec.ts}`; **six golden images** `e2e/visual.spec.ts-snapshots/shell-{light,dark}-{desktop,collapsed,mobile-navigation}-msedge-darwin.png`.
New: `src/core/auth/*` (session-store, session-context, route-guards, token-storage, return-to + tests), `src/core/forms/zod-resolver.test.tsx`, `src/features/auth/*` (dialog, host, forms, schemas + tests), `src/app/redirect-preserving-search.tsx`, `src/test/auth-test-utils.ts`, `e2e/auth.spec.ts`.
Unchanged: `modal-{light,dark}-mobile` goldens, backend, Angular, historical reports, the untracked duplicate helper.

## Deferred placeholder cleanup (human-approved deferral)
- The `/dashboard` M04 placeholder sentence "Authentication will be added in M06. No account or business data is loaded." (`src/app/preview/shell-placeholder.tsx`) is intentionally unchanged: it is rendered inside the approved visual baselines, and correcting it was measured to change 7 of 8 goldens (desktop/collapsed 3,914–3,916 px each, light mobile navigation 354 px, light modal 675 px; dark mobile navigation and dark modal unchanged). It is replaced when M08 builds the real dashboard; later placeholders (M09–M12) are replaced by their own milestones.
- `AccountMenu`'s no-identity fallback ("Preview account — not signed in", "Log out — available in M06", asserted by `account-menu.test.tsx`) is unreachable in the app because the shell is only rendered for authenticated sessions. It is unchanged; remove it with the first milestone that revisits the account menu (M12 settings).

## Outstanding risks for later milestones
JWT in `localStorage` (XSS-readable), no revocation or server logout, tokens valid after password change; late mutation callbacks must guard cache writes with `captureSession().isCurrent()` (I6) and carry a test per mutation hook.

## Not run / limitations
Edge/macOS only; other engines/OS and manual screen-reader checks NOT RUN; no live-backend runtime (M13); hosted backend never contacted; backend, Angular and database untouched.

## Review and approvals
Approval to commit: not granted. Unrelated untracked `src/test/render-with-providers 2.tsx` preserved unmodified (differs from tracked helper only by `new QueryClient({defaultOptions:{queries:{retry:false}}})` instead of `createQueryClient()` + retry override).
