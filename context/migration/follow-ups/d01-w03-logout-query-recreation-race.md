# D01-W03 — Post-logout query recreation (session-scoped queries are not session-aware)

Status: **PROPOSED — technical debt / future engineering initiative. Not part of D01; not authorized.** Drafted 2026-11-04 during D01-B, after an intermittent failure of `src/features/credentials/credential-session.test.tsx` ("aborts list/detail reads and never paints late A data after logout", assertion at the empty-query-cache check) in GitHub Actions run [41777298837](https://github.com/alexc83/uptrack/actions/runs/41777298837). The D01-B test change only removes a test-setup race; **it does not fix the behaviour described here.**

## 1. Observed behaviour

When the user logs out (or the session is replaced) while a session-scoped screen is mounted and the last commit's React passive effects have not yet flushed, the screen **re-creates and refetches its queries after `SessionStore.logout()` has cleared the cache**, before `CredentialSessionBoundary` unmounts it.

Sequence (reconstructed from cache events and instrumentation, `@tanstack/react-query` / `query-core` 5.105.1, React 19.3.1):

1. `logout()` → `SessionStore.#commit()` → `#resetServerState()`: `cancelQueries()`, `removeQueries()`, `getMutationCache().clear()`; the token is cleared first.
2. React starts processing the resulting update and first flushes the previous commit's pending passive effects.
3. TanStack's `useBaseQuery` effect calls `observer.setOptions(...)`. The query no longer exists, so `setOptions` calls `QueryCache.build()` (new, empty query), re-subscribes the observer and starts a fetch (`credentialsApi.get` / `list` are invoked again).
4. React then renders the new session tree; the boundary returns `null`, the page unmounts, observers unsubscribe, the in-flight fetches are abandoned.
5. Two entries remain in the query cache (status `pending`, no data, no observers) until garbage collection (default 5 min).

## 2. Evidence

- Intermittent: 1 failure in 15 file runs; 18 of 900 (2.0%) in-process repetitions of the same scenario on an unchanged tree (local Linux container, jsdom). GitHub-hosted failure: run 41777298837, `frontend` job, `credential-session.test.tsx:158`.
- **Perfect correlation with the effect flush** (900 runs): every run that left a dirty cache had exactly 2 `QueryObserver.setOptions` calls (detail and list observers, child before parent) inside the logout window; all 882 clean runs had 0. After forcing a flush with `await act(async () => {})` before logout: 0 dirty, 0 in-window calls in 900 runs.
- No component render occurs during the window (render-count probes on `useCredentials`/`useCredential`: 0 in all 600 runs, dirty or clean). The recreation is driven by the effect, not by a render.
- **Hypotheses tested and refuted** (so they are not re-investigated): the page's 250 ms search debounce (never fired during the ~30 ms test in 600 runs, including all failing ones); React Router's `navigate(..., { replace: true })` for the `credentialId` deep link (no router events in the window); pending TanStack notification batches (`setTimeout(0)` flushes pending at logout: 0 in all runs). Waiting 400 ms of real time before logout also removed the failures (0/200) because it lets the pending passive effects flush.
- Removing the explicit `cancelQueries()` from `#resetServerState()` eliminated one separate trigger (non-silent cancel notifying mounted observers: with it, a synchronous `logout()` outside `act` emitted 4 observer/state update events — 2 `observerResultsUpdated` and 2 `updated:setState` — before the 2 `removed` events, and left 2 entries in that diagnostic every time; after removing it only the 2 `removed` events were emitted and the cache ended empty) but **did not remove this race** (3 failures in 200 runs, with the change applied). That experiment was reverted; no production code was changed.

## 3. Impact assessment

- **Unnecessary requests:** up to two extra GET requests (credential detail and list) after logout. They are sent **without credentials**: `#commit()` clears the token before `#resetServerState()`, and `apiFetch` reads the token at request time and sets `Authorization` only when one exists (`api-fetch.ts` lines 44–46). A 401 reply (expected from the backend, not observed here because the tests mock the API) reaches `onUnauthorized` only if the token is unchanged, and `handleUnauthorized()` returns immediately unless the status is `authenticated`, so it cannot trigger another logout.
- **Leftover cache entries:** two empty, observer-less entries per occurrence, until GC.
- **No cross-account exposure observed.** Account A's data was never rendered or cached in any failing run; the in-test leak detector (MutationObserver on the document) stayed empty, abort signals were aborted, the detail dialog closed, and late responses did not repopulate the cache.
- Severity: **low** (hygiene / defence in depth), but it violates the intended invariant that no server state or request exists after the session ends, and it is the kind of window that matters if a future change makes the post-logout fetch authenticated or session-bound (e.g. a cached token, a different auth transport).

## 4. Remaining uncertainty

- Not every possible trigger has been enumerated. The effect-flush ordering is confirmed for this screen and scenario; other screens that use `useQuery` under `RequireAuth` (dashboard, CE records, report, settings) likely share it but were not measured.
- Behaviour in a real browser (scheduler timing differs from jsdom) and under `StrictMode` double effects was not measured.
- Whether switching accounts (`login` as B, which also calls `#resetServerState()`) can recreate A's queries in the same way, then having B's token attached to A's keys, was covered by the existing `switch` case (no leak observed) but not stress-tested at the 900-run scale.
- Exactly how much of the window is owned by TanStack vs React is unresolved; a fix should be validated against the installed versions and re-checked on upgrade.

## 5. Direction (not a decision)

A session-aware query lifecycle, or equivalent, so queries cannot be (re)created for a session that is no longer current. Candidate approaches to evaluate (design review required; touches session-isolation code, so needs its own spec and owner approval):
1. Include a session/epoch discriminator in session-scoped query keys or make `enabled` depend on a current-session check, so a stale observer cannot build or fetch.
2. Unmount session-scoped screens before the cache is cleared (reorder the reset relative to the boundary, e.g. publish the session snapshot, let the boundary unmount, then clear), or clear the cache again after the boundary has torn down.
3. A guard in the shared API/query layer that refuses to start an authenticated-endpoint fetch unless the capturing `SessionGuard.isCurrent()` is true (the pattern already used for mutations).

## 6. Recommended regression tests and acceptance criteria

1. **Deterministic reproduction test** (no reliance on timing): mount a session-scoped page, then trigger logout *without* flushing pending passive effects (e.g. call `store.logout()` immediately after the first commit, or hold effects with a controlled scheduler) and assert the post-conditions below. This test should **fail on the current code** and pass after the fix. (The existing `credential-session.test.tsx` case flushes effects first to stay deterministic; it does not cover this window.)
2. After logout/expiry/session switch: the query cache is empty; **no** query function is invoked (`credentialsApi.list/get` call counts unchanged after the transition); no network request is issued by the transport after the token is cleared.
3. Same checks for each session-scoped screen (dashboard, credentials list and detail, CE records, CE report, settings) and for `handleUnauthorized()` and cross-tab storage logout, not only explicit logout.
4. Account switch (A → B): no query keyed or fetched for A after B's session is installed; no A data rendered; B's token is never attached to a request created for A.
5. Existing guarantees remain: in-flight reads abort, late responses cannot repopulate the cache or call UI callbacks, mutation caches are cleared, remount on same-account re-login.
6. Run the new tests 100+ consecutive times (or equivalent in-process repetition) with 0 failures before accepting.

## 7. Proposed priority and scope

- Priority: **medium-low** (no confirmed data exposure; real but small blast radius); schedule **after D01** (CI foundation) and before any change that alters how the API transport attaches credentials or caches tokens.
- Scope: spec first (READY spec per `AGENTS.md`), then implementation limited to the session/query layer plus tests. No backend change.

Related: [S05R security remediation](../verification/s05r-security-remediation.md), M06 session-store invariants (`frontend-react/src/core/auth/session-store.ts`, I1–I6), [D01-B report](../verification/d01-b-report.md).
